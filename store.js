/**
 * Google Firebase (Cloud Firestore) backed document store.
 *
 * - Stores all collections in Cloud Firestore: users, chats, messages, workspace, meetings, files, statuses.
 * - Reads are served instantly from an in-memory mirror loaded from Firestore at startup.
 * - Writes are updated immediately in memory, persisted locally to ./data/firebase_cache.json,
 *   and synchronized asynchronously to Google Cloud Firestore via per-document queues.
 * - Auto-detects Firebase credentials:
 *   1. Service account JSON file: serviceAccountKey.json, firebase-credentials.json, or FIREBASE_SERVICE_ACCOUNT_KEY
 *   2. Direct env variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   3. FIREBASE_SERVICE_ACCOUNT_JSON
 * - Encrypted file chunks are saved to disk under ./uploads (or Firebase Storage bucket if configured).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const COLLECTIONS = ['users', 'chats', 'messages', 'workspace', 'meetings', 'files', 'statuses', 'calls'];
const mem = Object.fromEntries(COLLECTIONS.map(c => [c, new Map()]));
const queues = new Map();

function resolvePersistentDir(sub) {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, sub);
  }
  try {
    if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
      return path.join('/data', sub);
    }
  } catch (_) {}
  return path.join(__dirname, sub);
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || resolvePersistentDir('uploads');
const DATA_DIR = process.env.DATA_DIR || resolvePersistentDir('data');
const CACHE_FILE = path.join(DATA_DIR, 'firebase_cache.json');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

let app = null;
let db = null;
let storageBucket = null;
let bucketDisabled = false;
let bucketDisabledReason = '';
let firebaseInitialized = false;
let projectId = null;
let fileBackend = 'disk';
let lastFirestoreError = null;

function withTimeout(promise, ms, label = 'Cloud op') {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`${label} timed out after ${ms}ms`);
        err.code = 'ETIMEDOUT';
        reject(err);
      }, ms);
      if (typeof timer.unref === 'function') timer.unref();
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isPermanentBucketError(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  return (
    code === 404 || code === 403 || code === 400 ||
    /does not exist|not found|billing|permission|forbidden|specified bucket/i.test(msg)
  );
}

function getBucket() {
  if (bucketDisabled) return null;
  if (storageBucket) return storageBucket;
  if (!app) return null;
  try {
    const { getStorage } = require('firebase-admin/storage');
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : null);
    storageBucket = bucketName ? getStorage(app).bucket(bucketName) : getStorage(app).bucket();
    return storageBucket;
  } catch (err) {
    console.warn('[store] Firebase Storage bucket unavailable:', err.message);
    return null;
  }
}
const initBucket = getBucket;

const newId = (prefix = 'x') => prefix + crypto.randomBytes(9).toString('hex');

function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = sanitizeForFirestore(v);
    }
  }
  return out;
}

const RETRY_DELAYS_MS = [350, 1000, 2500, 5000];
const failedOps = new Map();

function saveLocalCache() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const dump = {};
    for (const c of COLLECTIONS) dump[c] = Array.from(mem[c].values());
    const tmpFile = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(dump, null, 2), 'utf8');
    fs.renameSync(tmpFile, CACHE_FILE);
  } catch (err) {
    console.error('[store] failed to save local cache:', err.message);
  }
}

function loadLocalCache() {
  if (!fs.existsSync(CACHE_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    for (const c of COLLECTIONS) {
      if (Array.isArray(raw[c])) {
        for (const item of raw[c]) {
          if (item && item.id) mem[c].set(item.id, item);
        }
      }
    }
    console.log('[store] Loaded local cache:', COLLECTIONS.map(c => `${c}=${mem[c].size}`).join(' '));
  } catch (err) {
    console.warn('[store] Could not read local cache:', err.message);
  }
}

function findServiceAccountFile() {
  const custom = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (custom && fs.existsSync(path.resolve(custom))) return path.resolve(custom);

  const candidates = [
    'serviceAccountKey.json',
    'firebase-service-account.json',
    'firebase-credentials.json',
    'firebase.json',
    'google-services.json'
  ];
  for (const f of candidates) {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) {
      try {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (j.project_id && (j.private_key || j.client_email)) return p;
      } catch { /* skip */ }
    }
  }
  return null;
}

function initFirebase() {
  if (firebaseInitialized) return true;

  try {
    app = getApps().length ? getApps()[0] : null;

    // 1. Service account JSON file
    const file = findServiceAccountFile();
    if (file) {
      const cred = require(file);
      projectId = cred.project_id || process.env.FIREBASE_PROJECT_ID;
      if (!app) {
        app = initializeApp({
          credential: cert(cred),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      }
      const databaseId = process.env.FIREBASE_DATABASE_ID || 'fireupp-db';
      try {
        db = getFirestore(app, databaseId);
      } catch (_) {
        db = getFirestore(app);
      }
      db.settings({ ignoreUndefinedProperties: true, preferRest: true });
      firebaseInitialized = true;
      try { getBucket(); } catch (_) {}
      console.log(`[store] Google Firebase initialized using credential file: ${path.basename(file)} (Project: ${projectId}, Database: ${databaseId})`);
      return true;
    }

    // 2. Direct env variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      projectId = String(process.env.FIREBASE_PROJECT_ID).trim();
      const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL).trim().replace(/^["']|["']$/g, '');
      let privateKey = String(process.env.FIREBASE_PRIVATE_KEY).trim();
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
      if (!app) {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      }
      const databaseId = process.env.FIREBASE_DATABASE_ID || 'fireupp-db';
      try {
        db = getFirestore(app, databaseId);
      } catch (_) {
        db = getFirestore(app);
      }
      db.settings({ ignoreUndefinedProperties: true, preferRest: true });
      firebaseInitialized = true;
      try { getBucket(); } catch (_) {}
      console.log(`[store] Google Firebase initialized using environment credentials (Project: ${projectId}, Database: ${databaseId}, Email: ${clientEmail})`);
      return true;
    }

    // 3. Raw JSON in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      projectId = cred.project_id;
      if (!app) {
        app = initializeApp({
          credential: cert(cred),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
      }
      const databaseId = process.env.FIREBASE_DATABASE_ID || 'fireupp-db';
      try {
        db = getFirestore(app, databaseId);
      } catch (_) {
        db = getFirestore(app);
      }
      db.settings({ ignoreUndefinedProperties: true, preferRest: true });
      firebaseInitialized = true;
      try { getBucket(); } catch (_) {}
      console.log(`[store] Google Firebase initialized using FIREBASE_SERVICE_ACCOUNT_JSON (Project: ${projectId}, Database: ${databaseId})`);
      return true;
    }
  } catch (err) {
    console.error('[store] Error initializing Google Firebase Admin SDK:', err);
  }

  return false;
}

async function loadFromFirestore() {
  if (!db) return;
  for (const c of COLLECTIONS) {
    try {
      const snap = await withTimeout(db.collection(c).get(), 12000, `Firestore load ${c}`);
      snap.forEach(doc => {
        const data = doc.data();
        mem[c].set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
      lastFirestoreError = err.message;
      console.error(`[store] Failed to load collection "${c}" from Firestore:`, err.message);
    }
  }
}

async function init() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  loadLocalCache();

  const connected = initFirebase();
  if (connected && db) {
    await loadFromFirestore();
    saveLocalCache();
    console.log('[store] Google Firebase Cloud Firestore connected:', COLLECTIONS.map(c => `${c}=${mem[c].size}`).join(' '));
  } else {
    console.log('[store] Google Firebase credentials not found in .env or workspace.');
    console.log('[store] Fireupp is running with local persistence. Add FIREBASE_PROJECT_ID or serviceAccountKey.json to sync to Google Cloud Firestore.');
  }
}

async function runWithRetry(key, fn) {
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await withTimeout(fn(), 10000, `Firestore ${key}`);
      failedOps.delete(key);
      lastFirestoreError = null;
      return;
    } catch (e) {
      lastErr = e;
      lastFirestoreError = e?.message || String(e);
      const msg = String(lastFirestoreError);
      // Do not endlessly retry deterministic invalid-argument / oversize doc errors
      if (/longer than 1048|invalid argument|exceeds the maximum allowed size/i.test(msg)) {
        break;
      }
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise(rs => setTimeout(rs, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  failedOps.set(key, fn);
  console.error(`[store] Firestore sync failed (${key}):`, lastErr?.message || lastErr);
}

function enqueue(key, fn) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(() => runWithRetry(key, fn));
  queues.set(key, next);
  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
  return next;
}

const retryTimer = setInterval(() => {
  if (!db || !failedOps.size) return;
  const pending = Array.from(failedOps.entries());
  for (const [key, fn] of pending) {
    if (!queues.has(key)) enqueue(key, fn);
  }
}, 30000);
if (typeof retryTimer.unref === 'function') retryTimer.unref();

async function flush(timeoutMs = 7000) {
  saveLocalCache();
  if (!db) return;
  if (failedOps.size) {
    for (const [key, fn] of Array.from(failedOps.entries())) {
      if (!queues.has(key)) enqueue(key, fn);
    }
  }
  const active = Array.from(queues.values());
  if (!active.length) return;
  await Promise.race([
    Promise.allSettled(active),
    new Promise(rs => setTimeout(rs, timeoutMs))
  ]);
  saveLocalCache();
}

// ---------- Public CRUD API ----------
const all = col => Array.from(mem[col].values());
const get = (col, id) => mem[col].get(id) || null;
const find = (col, pred) => all(col).filter(pred);
const findOne = (col, pred) => all(col).find(pred) || null;

function insert(col, doc, prefix) {
  const id = doc.id || newId(prefix || col[0]);
  const full = { ...doc, id };
  mem[col].set(id, full);
  saveLocalCache();

  if (db) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).set(sanitizeForFirestore(full)));
  }
  return full;
}

function update(col, id, patch) {
  const cur = mem[col].get(id);
  if (!cur) return null;
  const next = typeof patch === 'function' ? patch(cur) || cur : Object.assign(cur, patch);
  mem[col].set(id, next);
  saveLocalCache();

  if (db) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).set(sanitizeForFirestore(next), { merge: true }));
  }
  return next;
}

function remove(col, id) {
  if (!mem[col].delete(id)) return false;
  saveLocalCache();

  if (db) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).delete());
  }
  return true;
}

// ---------- Encrypted File Chunks with Cloud Backup & Auto-Recovery ----------
function safeChunkPath(fileId, n) {
  const safeId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) throw new Error('Invalid file identifier');
  const targetDir = path.resolve(UPLOAD_DIR, safeId);
  const baseUploads = path.resolve(UPLOAD_DIR);
  if (!targetDir.startsWith(baseUploads + path.sep) && targetDir !== baseUploads) {
    throw new Error('Path traversal attempt detected');
  }
  if (n !== undefined) {
    const safeN = parseInt(n, 10);
    if (isNaN(safeN) || safeN < 0) throw new Error('Invalid chunk index');
    return { dir: targetDir, filePath: path.join(targetDir, `${safeN}.bin`) };
  }
  return { dir: targetDir };
}

async function persistChunkToCloud(fileId, n, buf) {
  let savedToBucket = false;
  const bucket = getBucket();
  if (bucket) {
    try {
      const cloudFile = bucket.file(`chunks/${fileId}/${n}.bin`);
      await withTimeout(
        cloudFile.save(buf, {
          resumable: false,
          validation: false,
          metadata: {
            contentType: 'application/octet-stream',
            metadata: { fileId, chunkIndex: String(n) }
          }
        }),
        4000,
        `Bucket save ${fileId}/${n}`
      );
      savedToBucket = true;
      fileBackend = 'firebase-storage+disk';
    } catch (bucketErr) {
      if (isPermanentBucketError(bucketErr)) {
        bucketDisabled = true;
        bucketDisabledReason = bucketErr.message;
        console.warn(`[store] Disabling Firebase Storage bucket after error: ${bucketErr.message}`);
      } else {
        console.warn(`[store] Bucket upload notice for ${fileId}/${n}: ${bucketErr.message}, falling back to Firestore`);
      }
    }
  }

  // Backup to Firestore chunks collection so chunks survive even without Storage bucket
  if (db && (!savedToBucket || buf.length <= 700 * 1024)) {
    try {
      const PART_SIZE = 700 * 1024;
      const nInt = parseInt(n, 10);
      if (buf.length <= PART_SIZE) {
        await withTimeout(
          db.collection('chunks').doc(`${fileId}_${nInt}`).set({
            fileId,
            n: nInt,
            partsCount: 1,
            data: buf,
            size: buf.length,
            updatedAt: Date.now()
          }),
          6000,
          `Firestore chunk ${fileId}_${nInt}`
        );
      } else {
        const parts = [];
        for (let offset = 0; offset < buf.length; offset += PART_SIZE) {
          parts.push(buf.slice(offset, offset + PART_SIZE));
        }
        const batch = db.batch();
        batch.set(db.collection('chunks').doc(`${fileId}_${nInt}`), {
          fileId,
          n: nInt,
          partsCount: parts.length,
          size: buf.length,
          updatedAt: Date.now()
        });
        for (let i = 0; i < parts.length; i++) {
          batch.set(db.collection('chunks').doc(`${fileId}_${nInt}_p${i}`), {
            fileId,
            n: nInt,
            partIdx: i,
            data: parts[i],
            size: parts[i].length,
            updatedAt: Date.now()
          });
        }
        await withTimeout(batch.commit(), 7000, `Firestore chunk batch ${fileId}_${nInt}`);
      }
      lastFirestoreError = null;
      if (!savedToBucket) fileBackend = 'firestore+disk';
    } catch (fsErr) {
      lastFirestoreError = fsErr?.message || String(fsErr);
      if (!savedToBucket) throw fsErr;
    }
  }
}

async function putChunk(fileId, n, buf) {
  const { dir, filePath } = safeChunkPath(fileId, n);
  fs.mkdirSync(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buf);

  // Persist chunk to Cloud without letting slow/hung cloud storage stall the upload HTTP request at 0%
  if (!db && !getBucket()) return;
  const cloudPromise = persistChunkToCloud(fileId, n, buf).catch(err => {
    console.warn(`[store] Cloud chunk backup warning for ${fileId}/${n}:`, err.message);
    enqueue(`chunk/${fileId}/${n}`, async () => {
      const freshBuf = fs.existsSync(filePath) ? await fs.promises.readFile(filePath) : buf;
      await persistChunkToCloud(fileId, n, freshBuf);
    });
  });

  // Wait briefly for fast cloud sync; if slower than 2500ms, let it complete in background
  await Promise.race([
    cloudPromise,
    new Promise(rs => {
      const t = setTimeout(rs, 2500);
      if (typeof t.unref === 'function') t.unref();
    })
  ]);
}

async function getChunk(fileId, n) {
  const { dir, filePath } = safeChunkPath(fileId, n);

  // 1. Check local disk cache (instant read)
  if (fs.existsSync(filePath)) {
    try {
      const cached = await fs.promises.readFile(filePath);
      if (cached && cached.length > 0) return cached;
    } catch (_) {}
  }

  // 2. Cache miss (e.g. after container redeploy/update): Auto-recover from Cloud
  let buf = null;

  // Try Firebase Storage bucket first
  const bucket = getBucket();
  if (bucket) {
    try {
      const cloudFile = bucket.file(`chunks/${fileId}/${n}.bin`);
      const [exists] = await withTimeout(cloudFile.exists(), 3500, `Bucket exists ${fileId}/${n}`);
      if (exists) {
        const [contents] = await withTimeout(cloudFile.download(), 6000, `Bucket download ${fileId}/${n}`);
        if (contents && contents.length) {
          buf = contents;
        }
      }
    } catch (bErr) {
      if (isPermanentBucketError(bErr)) {
        bucketDisabled = true;
        bucketDisabledReason = bErr.message;
      }
      console.warn(`[store] Bucket download attempt failed for ${fileId}/${n}:`, bErr.message);
    }
  }

  // Fallback to Firestore chunks collection
  if (!buf && db) {
    try {
      const nInt = parseInt(n, 10);
      const doc = await withTimeout(db.collection('chunks').doc(`${fileId}_${nInt}`).get(), 6000, `Firestore get chunk ${fileId}_${nInt}`);
      if (doc.exists) {
        const d = doc.data();
        if (d.partsCount > 1) {
          const promises = [];
          for (let i = 0; i < d.partsCount; i++) {
            promises.push(withTimeout(db.collection('chunks').doc(`${fileId}_${nInt}_p${i}`).get(), 6000, `Firestore get part ${i}`));
          }
          const partDocs = await Promise.all(promises);
          const parts = [];
          for (let i = 0; i < partDocs.length; i++) {
            const pDoc = partDocs[i];
            if (pDoc.exists && pDoc.data() && pDoc.data().data) {
              const rawData = pDoc.data().data;
              parts.push(Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData));
            }
          }
          if (parts.length === d.partsCount) {
            buf = Buffer.concat(parts);
          }
        } else if (d.data) {
          const rawData = d.data;
          buf = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
        }
      }
    } catch (fsErr) {
      console.warn(`[store] Firestore chunk recovery failed for ${fileId}/${n}:`, fsErr.message);
    }
  }

  // Cache back to local disk for fast subsequent reads
  if (buf && buf.length > 0) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      await fs.promises.writeFile(filePath, buf);
    } catch (_) {}
    return buf;
  }

  const err = new Error(`Chunk ${n} for file ${fileId} not found`);
  err.code = 'ENOENT';
  throw err;
}

async function deleteChunks(fileId, count) {
  const { dir } = safeChunkPath(fileId);
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch (_) {}

  // Delete from Cloud Storage
  const bucket = getBucket();
  if (bucket) {
    bucket.deleteFiles({ prefix: `chunks/${fileId}/` }).catch(() => {});
  }

  // Delete from Firestore chunks collection
  if (db) {
    db.collection('chunks').where('fileId', '==', fileId).get().then(snap => {
      if (snap.empty) return;
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      return batch.commit();
    }).catch(() => {});
  }
}

module.exports = {
  init, flush, all, get, find, findOne, insert, update, remove, newId,
  putChunk, getChunk, deleteChunks,
  getDb: () => db,
  status: () => ({
    database: 'Google Firebase (Cloud Firestore)',
    connected: firebaseInitialized,
    lastFirestoreError,
    bucketDisabled,
    bucketDisabledReason: bucketDisabledReason || undefined,
    pendingWrites: queues.size,
    failedWrites: failedOps.size,
    projectId: projectId || (firebaseInitialized ? 'Connected' : 'Local Persistence (Set FIREBASE_PROJECT_ID in .env)'),
    databaseId: process.env.FIREBASE_DATABASE_ID || 'fireupp-db',
    files: fileBackend
  })
};

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

function getBucketName(pid = projectId) {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET;
  return pid ? `${pid}.firebasestorage.app` : null;
}

function getBucket(overrideName = null) {
  if (bucketDisabled && !overrideName) return null;
  if (!overrideName && storageBucket) return storageBucket;
  if (!app) return null;
  try {
    const { getStorage } = require('firebase-admin/storage');
    const bucketName = overrideName || getBucketName();
    const b = bucketName ? getStorage(app).bucket(bucketName) : getStorage(app).bucket();
    if (!overrideName) storageBucket = b;
    return b;
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
let saveCacheTimer = null;

function saveLocalCache() {
  if (saveCacheTimer) {
    clearTimeout(saveCacheTimer);
    saveCacheTimer = null;
  }
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

function scheduleSaveLocalCache() {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    saveLocalCache();
  }, 250);
  if (typeof saveCacheTimer.unref === 'function') saveCacheTimer.unref();
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

function connectFirestoreInstance(cred, pid, label) {
  projectId = pid || process.env.FIREBASE_PROJECT_ID || null;
  if (!app) {
    app = initializeApp({
      credential: cert(cred),
      storageBucket: getBucketName(projectId) || undefined
    });
  }
  const databaseId = process.env.FIREBASE_DATABASE_ID || 'fireupp-db';
  try {
    db = getFirestore(app, databaseId);
  } catch (_) {
    db = getFirestore(app);
  }
  const firestoreSettings = { ignoreUndefinedProperties: true };
  if (process.env.FIRESTORE_PREFER_REST === 'true') {
    firestoreSettings.preferRest = true;
  }
  db.settings(firestoreSettings);
  firebaseInitialized = true;
  try { getBucket(); } catch (_) {}
  console.log(`[store] Google Firebase initialized using ${label} (Project: ${projectId}, Database: ${databaseId})`);
  return true;
}

function initFirebase() {
  if (firebaseInitialized) return true;

  try {
    app = getApps().length ? getApps()[0] : null;

    // 1. Service account JSON file
    const file = findServiceAccountFile();
    if (file) {
      const cred = require(file);
      return connectFirestoreInstance(cred, cred.project_id, `credential file: ${path.basename(file)}`);
    }

    // 2. Direct env variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const pid = String(process.env.FIREBASE_PROJECT_ID).trim();
      const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL).trim().replace(/^["']|["']$/g, '');
      let privateKey = String(process.env.FIREBASE_PRIVATE_KEY).trim();
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');
      return connectFirestoreInstance({ projectId: pid, clientEmail, privateKey }, pid, `environment credentials (${clientEmail})`);
    }

    // 3. Raw JSON in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return connectFirestoreInstance(cred, cred.project_id, 'FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  } catch (err) {
    console.error('[store] Error initializing Google Firebase Admin SDK:', err);
  }

  return false;
}

async function loadFromFirestore() {
  if (!db) return;
  await Promise.all(COLLECTIONS.map(async c => {
    try {
      const snap = await withTimeout(db.collection(c).get(), 30000, `Firestore load ${c}`);
      snap.forEach(doc => {
        const data = doc.data();
        mem[c].set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
      lastFirestoreError = err.message;
      console.error(`[store] Failed to load collection "${c}" from Firestore:`, err.message);
    }
  }));
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

function insert(col, doc, prefix, opts = {}) {
  const id = doc.id || newId(prefix || col[0]);
  const full = { ...doc, id };
  mem[col].set(id, full);
  scheduleSaveLocalCache();

  if (db && !opts.skipCloud) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).set(sanitizeForFirestore(full)));
  }
  return full;
}

function update(col, id, patch, opts = {}) {
  const cur = mem[col].get(id);
  if (!cur) return null;
  const next = typeof patch === 'function' ? patch(cur) || cur : Object.assign(cur, patch);
  mem[col].set(id, next);
  scheduleSaveLocalCache();

  if (db && !opts.skipCloud) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).set(sanitizeForFirestore(next), { merge: true }));
  }
  return next;
}

function remove(col, id) {
  if (!mem[col].delete(id)) return false;
  scheduleSaveLocalCache();

  if (db) {
    enqueue(`${col}/${id}`, () => db.collection(col).doc(id).delete());
  }
  return true;
}

/**
 * Flush a single document to Firestore immediately (awaiting up to timeoutMs)
 * so critical records (completed file descriptors, sent messages) survive instant restarts.
 */
async function syncDoc(col, id, timeoutMs = 10000) {
  if (!db) return true;
  const doc = mem[col]?.get(id);
  if (!doc) return false;
  const key = `${col}/${id}`;
  const writePromise = enqueue(key, () => db.collection(col).doc(id).set(sanitizeForFirestore(doc), { merge: true }));
  try {
    await withTimeout(writePromise, timeoutMs, `Sync ${key}`);
    return !failedOps.has(key);
  } catch (err) {
    console.warn(`[store] syncDoc notice (${key}):`, err?.message || err);
    return false;
  }
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

async function trySaveToBucket(bucket, fileId, n, buf) {
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
    25000,
    `Bucket save ${fileId}/${n}`
  );
}

async function persistChunkToCloud(fileId, n, buf) {
  let savedToBucket = false;
  let bucket = getBucket();
  if (bucket) {
    try {
      await trySaveToBucket(bucket, fileId, n, buf);
      savedToBucket = true;
      fileBackend = 'firebase-storage+disk';
    } catch (bucketErr) {
      // Auto-try legacy .appspot.com bucket once if default .firebasestorage.app returned 404/not-found
      if (isPermanentBucketError(bucketErr) && projectId && bucket.name !== `${projectId}.appspot.com`) {
        try {
          const fallbackBucket = getBucket(`${projectId}.appspot.com`);
          if (fallbackBucket) {
            await trySaveToBucket(fallbackBucket, fileId, n, buf);
            storageBucket = fallbackBucket;
            savedToBucket = true;
            fileBackend = 'firebase-storage+disk';
          }
        } catch (fbErr) {
          bucketErr = fbErr;
        }
      }
      if (!savedToBucket) {
        if (isPermanentBucketError(bucketErr)) {
          bucketDisabled = true;
          bucketDisabledReason = bucketErr.message;
          console.warn(`[store] Disabling Firebase Storage bucket after error: ${bucketErr.message}`);
        } else {
          console.warn(`[store] Bucket upload notice for ${fileId}/${n}: ${bucketErr.message}, falling back to Firestore`);
        }
      }
    }
  }

  // Backup to Firestore chunks collection whenever bucket didn't save it (or for small <= 450KB chunks)
  if (db && (!savedToBucket || buf.length <= 450 * 1024)) {
    try {
      const PART_SIZE = 450 * 1024;
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
          15000,
          `Firestore chunk ${fileId}_${nInt}`
        );
      } else {
        const parts = [];
        for (let offset = 0; offset < buf.length; offset += PART_SIZE) {
          parts.push(buf.slice(offset, offset + PART_SIZE));
        }
        // Write parts in small batches (max 2 parts = ~900KB per RPC) so payloads stay well under Firestore limits
        for (let i = 0; i < parts.length; i += 2) {
          const batch = db.batch();
          for (let j = i; j < Math.min(i + 2, parts.length); j++) {
            batch.set(db.collection('chunks').doc(`${fileId}_${nInt}_p${j}`), {
              fileId,
              n: nInt,
              partIdx: j,
              data: parts[j],
              size: parts[j].length,
              updatedAt: Date.now()
            });
          }
          await withTimeout(batch.commit(), 20000, `Firestore chunk parts ${fileId}_${nInt} [${i}..${Math.min(i + 2, parts.length) - 1}]`);
        }
        // Commit header doc last once every part is durably written
        await withTimeout(
          db.collection('chunks').doc(`${fileId}_${nInt}`).set({
            fileId,
            n: nInt,
            partsCount: parts.length,
            size: buf.length,
            updatedAt: Date.now()
          }),
          15000,
          `Firestore chunk header ${fileId}_${nInt}`
        );
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

  // When Cloud backend is active, durably persist the chunk BEFORE returning 200 OK
  // so no uploaded image/video/PDF/GIF is ever left solely on ephemeral container disk.
  if (!db && !getBucket()) return;
  let lastErr = null;
  const delays = [400];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await persistChunkToCloud(fileId, n, buf);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`[store] Cloud chunk save attempt ${attempt + 1} failed for ${fileId}/${n}:`, err.message);
      if (attempt < delays.length) {
        await new Promise(rs => setTimeout(rs, delays[attempt]));
      }
    }
  }
  throw lastErr || new Error(`Failed to persist chunk ${fileId}/${n} to cloud storage`);
}

function getCandidateBuckets() {
  const list = [];
  const primary = getBucket();
  if (primary) list.push(primary);
  if (!bucketDisabled && projectId) {
    const legacyName = `${projectId}.appspot.com`;
    if (!primary || primary.name !== legacyName) {
      const legacy = getBucket(legacyName);
      if (legacy) list.push(legacy);
    }
  }
  return list;
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

  // Try Firebase Storage bucket(s) first (default .firebasestorage.app and legacy .appspot.com)
  const candidates = getCandidateBuckets();
  let permanentFailures = 0;
  let lastBucketErr = null;
  for (const bucket of candidates) {
    try {
      const cloudFile = bucket.file(`chunks/${fileId}/${n}.bin`);
      const [exists] = await withTimeout(cloudFile.exists(), 8000, `Bucket exists ${fileId}/${n}`);
      if (exists) {
        const [contents] = await withTimeout(cloudFile.download(), 25000, `Bucket download ${fileId}/${n}`);
        if (contents && contents.length) {
          buf = contents;
          storageBucket = bucket;
          break;
        }
      }
    } catch (bErr) {
      lastBucketErr = bErr;
      if (isPermanentBucketError(bErr)) permanentFailures++;
      console.warn(`[store] Bucket download attempt (${bucket.name}) failed for ${fileId}/${n}:`, bErr.message);
    }
  }
  if (!buf && candidates.length > 0 && permanentFailures === candidates.length && lastBucketErr) {
    bucketDisabled = true;
    bucketDisabledReason = lastBucketErr.message;
  }

  // Fallback to Firestore chunks collection
  if (!buf && db) {
    try {
      const nInt = parseInt(n, 10);
      const doc = await withTimeout(db.collection('chunks').doc(`${fileId}_${nInt}`).get(), 15000, `Firestore get chunk ${fileId}_${nInt}`);
      if (doc.exists) {
        const d = doc.data();
        if (d.partsCount > 1) {
          const promises = [];
          for (let i = 0; i < d.partsCount; i++) {
            promises.push(withTimeout(db.collection('chunks').doc(`${fileId}_${nInt}_p${i}`).get(), 15000, `Firestore get part ${i}`));
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

  // Delete from Cloud Storage candidate buckets
  for (const bucket of getCandidateBuckets()) {
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

async function probeCloudHealth(appVersion = '') {
  const result = {
    firestoreTest: null,
    directCommitProbe: null,
    bucketCandidates: [],
    chunksCount: null
  };

  if (db) {
    const fTest = { ok: false, readOk: false, writeOk: false };
    try {
      const ref = db.collection('_health').doc('ping');
      const snap = await withTimeout(ref.get(), 5000, 'Firestore read ping');
      fTest.readOk = true;
      await withTimeout(ref.set({ timestamp: Date.now(), version: appVersion || undefined }), 5000, 'Firestore write ping');
      fTest.writeOk = true;
      fTest.ok = true;
      fTest.data = snap.exists ? snap.data() : null;
    } catch (err) {
      fTest.ok = false;
      fTest.error = err.message;
      fTest.code = err.code;
    }
    result.firestoreTest = fTest;

    // 0-retry direct REST :commit probe so Google's exact status/reason isn't hidden behind SDK backoff
    try {
      const cred = app?.options?.credential;
      if (cred && typeof cred.getAccessToken === 'function' && projectId) {
        const databaseId = process.env.FIREBASE_DATABASE_ID || 'fireupp-db';
        const tok = await withTimeout(cred.getAccessToken(), 4000, 'Firebase access token');
        const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents:commit`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            writes: [{
              update: {
                name: `projects/${projectId}/databases/${databaseId}/documents/_health/ping`,
                fields: {
                  timestamp: { integerValue: String(Date.now()) },
                  version: { stringValue: String(appVersion || '') }
                }
              }
            }]
          }),
          signal: ctrl.signal
        });
        clearTimeout(t);
        const text = await resp.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch {}
        result.directCommitProbe = {
          httpStatus: resp.status,
          ok: resp.ok,
          error: parsed?.error?.message || (resp.ok ? null : text.slice(0, 300)),
          status: parsed?.error?.status || null
        };
      }
    } catch (pErr) {
      result.directCommitProbe = { ok: false, error: pErr.message };
    }

    try {
      if (typeof db.collection('chunks').count === 'function') {
        const agg = await withTimeout(db.collection('chunks').count().get(), 5000, 'Chunks count');
        result.chunksCount = agg.data().count;
      }
    } catch (_) {}
  }

  const candidateNames = Array.from(new Set([
    process.env.FIREBASE_STORAGE_BUCKET || '',
    projectId ? `${projectId}.firebasestorage.app` : '',
    projectId ? `${projectId}.appspot.com` : ''
  ].filter(Boolean)));

  for (const name of candidateNames) {
    try {
      const b = getBucket(name);
      if (!b) continue;
      const [exists] = await withTimeout(b.exists(), 4000, `Bucket exists ${name}`);
      result.bucketCandidates.push({ name, ok: !!exists });
    } catch (err) {
      result.bucketCandidates.push({ name, ok: false, error: err.message, code: err.code });
    }
  }

  return result;
}

module.exports = {
  init, flush, syncDoc, probeCloudHealth, all, get, find, findOne, insert, update, remove, newId,
  putChunk, getChunk, deleteChunks,
  getDb: () => db,
  getBucket,
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

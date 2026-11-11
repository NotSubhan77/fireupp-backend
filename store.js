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
const admin = require('firebase-admin');
require('dotenv').config();

const COLLECTIONS = ['users', 'chats', 'messages', 'workspace', 'meetings', 'files', 'statuses', 'calls'];
const mem = Object.fromEntries(COLLECTIONS.map(c => [c, new Map()]));
const queues = new Map();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'firebase_cache.json');

let db = null;
let firebaseInitialized = false;
let projectId = null;
let fileBackend = 'disk';

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

function saveLocalCache() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const dump = {};
    for (const c of COLLECTIONS) dump[c] = Array.from(mem[c].values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(dump, null, 2), 'utf8');
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
    // 1. Service account JSON file
    const file = findServiceAccountFile();
    if (file) {
      const cred = require(file);
      projectId = cred.project_id || process.env.FIREBASE_PROJECT_ID;
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      firebaseInitialized = true;
      console.log(`[store] Google Firebase initialized using credential file: ${path.basename(file)} (Project: ${projectId})`);
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
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      firebaseInitialized = true;
      console.log(`[store] Google Firebase initialized using environment credentials (Project: ${projectId}, Email: ${clientEmail})`);
      return true;
    }

    // 3. Raw JSON in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      projectId = cred.project_id;
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      firebaseInitialized = true;
      console.log(`[store] Google Firebase initialized using FIREBASE_SERVICE_ACCOUNT_JSON (Project: ${projectId})`);
      return true;
    }
  } catch (err) {
    console.error('[store] Error initializing Google Firebase Admin SDK:', err.message);
  }

  return false;
}

async function loadFromFirestore() {
  if (!db) return;
  for (const c of COLLECTIONS) {
    try {
      const snap = await db.collection(c).get();
      snap.forEach(doc => {
        const data = doc.data();
        mem[c].set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
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

function enqueue(key, fn) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(fn).catch(e => console.error(`[store] Firestore sync failed (${key}):`, e.message));
  queues.set(key, next);
  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
  return next;
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

// ---------- Encrypted File Chunks ----------
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

async function putChunk(fileId, n, buf) {
  const { dir, filePath } = safeChunkPath(fileId, n);
  fs.mkdirSync(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buf);
}

async function getChunk(fileId, n) {
  const { filePath } = safeChunkPath(fileId, n);
  return fs.promises.readFile(filePath);
}

async function deleteChunks(fileId, count) {
  const { dir } = safeChunkPath(fileId);
  await fs.promises.rm(dir, { recursive: true, force: true });
}

module.exports = {
  init, all, get, find, findOne, insert, update, remove, newId,
  putChunk, getChunk, deleteChunks,
  status: () => ({
    database: 'Google Firebase (Cloud Firestore)',
    connected: firebaseInitialized,
    projectId: projectId || (firebaseInitialized ? 'Connected' : 'Local Persistence (Set FIREBASE_PROJECT_ID in .env)'),
    files: fileBackend
  })
};

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
const zlib = require('zlib');
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
let lastS3Error = null;
let b2NativePreferred = false;
let b2AuthCache = null; // { keySig, accountId, authorizationToken, apiUrl, downloadUrl, bucketId, expiresAt }
const b2UploadPool = [];
let firebaseInitialized = false;
let projectId = null;
let fileBackend = 'disk';
let lastFirestoreError = null;
let quotaCooldownUntil = 0;

function getS3Config() {
  const endpointRaw = String(process.env.S3_ENDPOINT || process.env.B2_ENDPOINT || '').trim().replace(/\/+$/, '');
  const bucket = String(process.env.S3_BUCKET || process.env.B2_BUCKET || '').trim();
  const accessKey = String(process.env.S3_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY_ID || process.env.B2_KEY_ID || '').trim();
  const secretKey = String(process.env.S3_SECRET_ACCESS_KEY || process.env.B2_SECRET_ACCESS_KEY || process.env.B2_APP_KEY || '').trim();
  if (!endpointRaw || !bucket || !accessKey || !secretKey) return null;

  const endpoint = /^https?:\/\//i.test(endpointRaw) ? endpointRaw : `https://${endpointRaw}`;
  let region = String(process.env.S3_REGION || process.env.B2_REGION || '').trim();
  if (!region) {
    const b2Match = /s3\.([a-z0-9-]+)\.backblazeb2\.com/i.exec(endpoint);
    const awsMatch = /s3\.([a-z0-9-]+)\.amazonaws\.com/i.exec(endpoint);
    region = b2Match?.[1] || awsMatch?.[1] || (/r2\.cloudflarestorage\.com/i.test(endpoint) ? 'auto' : 'us-west-004');
  }
  const provider = /backblazeb2/i.test(endpoint)
    ? 'Backblaze B2 (S3)'
    : (/r2\.cloudflarestorage/i.test(endpoint) ? 'Cloudflare R2 (S3)' : 'S3 Storage');
  return { endpoint, bucket, accessKey, secretKey, region, provider };
}

function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data || Buffer.alloc(0)).digest('hex');
}

function extractS3XmlError(txt = '') {
  const code = (txt.match(/<Code>([^<]+)<\/Code>/i)?.[1] || '').trim();
  const msg = (txt.match(/<Message>([^<]+)<\/Message>/i)?.[1] || '').trim();
  if (code || msg) return `${code ? `[${code}] ` : ''}${msg}`.trim();
  return txt.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function s3SignedFetch(cfg, method, keyPath, body = null, contentType = null, timeoutMs = 25000) {
  const rawStr = String(keyPath || '');
  const qIdx = rawStr.indexOf('?');
  const rawPath = (qIdx >= 0 ? rawStr.slice(0, qIdx) : rawStr).replace(/^\/+/, '');
  const rawQuery = qIdx >= 0 ? rawStr.slice(qIdx) : '';
  const encodedKey = rawPath ? rawPath.split('/').map(s => encodeURIComponent(s)).join('/') : '';
  const targetUrl = `${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}${encodedKey ? `/${encodedKey}` : ''}${rawQuery}`;
  const u = new URL(targetUrl);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : Buffer.alloc(0);
  const payloadHash = sha256Hex(payloadBuf);

  const canonicalHeaders = `host:${u.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const rfc3986 = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const canonicalQuery = Array.from(u.searchParams.entries())
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : (a[0] < b[0] ? -1 : 1)))
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .join('&');
  const canonicalRequest = `${method}\n${u.pathname}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const kDate = hmacSha256(`AWS4${cfg.secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, cfg.region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const headers = {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
  if (contentType) headers['Content-Type'] = contentType;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (typeof timer.unref === 'function') timer.unref();

  return fetch(targetUrl, {
    method,
    headers,
    body: (method === 'PUT' || method === 'POST') ? payloadBuf : undefined,
    signal: ctrl.signal
  }).finally(() => clearTimeout(timer));
}

async function authorizeB2Native(cfg, forceRefresh = false) {
  if (!cfg || !/backblazeb2/i.test(cfg.endpoint)) return null;
  const keySig = `${cfg.accessKey}:${cfg.bucket}`;
  if (!forceRefresh && b2AuthCache && b2AuthCache.keySig === keySig && b2AuthCache.expiresAt > Date.now()) {
    return b2AuthCache;
  }
  const basic = Buffer.from(`${cfg.accessKey}:${cfg.secretKey}`, 'utf8').toString('base64');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  if (typeof timer.unref === 'function') timer.unref();
  let auth;
  try {
    const resp = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { Authorization: `Basic ${basic}` },
      signal: ctrl.signal
    });
    const txt = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(txt); } catch {}
    if (!resp.ok || !parsed?.authorizationToken) {
      throw new Error(`B2 authorize failed (${resp.status}): ${parsed?.message || parsed?.code || txt.slice(0, 140)}`);
    }
    auth = parsed;
  } finally {
    clearTimeout(timer);
  }

  let bucketId = auth.allowed?.bucketId || '';
  if (!bucketId) {
    const bResp = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: auth.accountId, bucketName: cfg.bucket })
    });
    const bTxt = await bResp.text();
    let bData = null;
    try { bData = JSON.parse(bTxt); } catch {}
    if (!bResp.ok) {
      throw new Error(`B2 list_buckets failed (${bResp.status}): ${bData?.message || bData?.code || bTxt.slice(0, 140)}`);
    }
    const found = (bData?.buckets || []).find(b => b.bucketName === cfg.bucket) || (bData?.buckets || [])[0];
    bucketId = found?.bucketId || '';
  }
  if (!bucketId) {
    throw new Error(`Backblaze B2 bucket "${cfg.bucket}" not found or inaccessible`);
  }

  b2UploadPool.length = 0;
  b2AuthCache = {
    keySig,
    accountId: auth.accountId,
    authorizationToken: auth.authorizationToken,
    apiUrl: auth.apiUrl,
    downloadUrl: auth.downloadUrl,
    bucketId,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000
  };
  return b2AuthCache;
}

async function getB2UploadTarget(cfg, forceFresh = false) {
  const auth = await authorizeB2Native(cfg, forceFresh);
  if (!auth) throw new Error('Backblaze B2 Native API unavailable');
  if (!forceFresh && b2UploadPool.length > 0) {
    return { auth, target: b2UploadPool.pop() };
  }
  const resp = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: auth.bucketId })
  });
  const txt = await resp.text();
  let parsed = null;
  try { parsed = JSON.parse(txt); } catch {}
  if (resp.status === 401 && !forceFresh) {
    b2AuthCache = null;
    return getB2UploadTarget(cfg, true);
  }
  if (!resp.ok || !parsed?.uploadUrl || !parsed?.authorizationToken) {
    throw new Error(`B2 get_upload_url failed (${resp.status}): ${parsed?.message || parsed?.code || txt.slice(0, 140)}`);
  }
  return { auth, target: { uploadUrl: parsed.uploadUrl, authorizationToken: parsed.authorizationToken } };
}

async function b2UploadObject(cfg, objKey, buf, contentType = 'application/octet-stream') {
  const sha1 = crypto.createHash('sha1').update(buf).digest('hex');

  for (let attempt = 0; attempt < 2; attempt++) {
    const { target } = await getB2UploadTarget(cfg, attempt > 0);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    if (typeof timer.unref === 'function') timer.unref();
    try {
      const resp = await fetch(target.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: target.authorizationToken,
          'X-Bz-File-Name': objKey,
          'Content-Type': contentType,
          'Content-Length': String(buf.length),
          'X-Bz-Content-Sha1': sha1
        },
        body: buf,
        signal: ctrl.signal
      });
      if (resp.ok) {
        if (b2UploadPool.length < 6) b2UploadPool.push(target);
        lastS3Error = null;
        b2NativePreferred = true;
        fileBackend = 'b2-native+disk';
        return true;
      }
      const errTxt = await resp.text().catch(() => '');
      if ((resp.status === 401 || resp.status === 500 || resp.status === 503) && attempt === 0) {
        continue;
      }
      throw new Error(`B2 upload failed (${resp.status}): ${errTxt.slice(0, 160)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

async function b2DownloadObject(cfg, objKey) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const auth = await authorizeB2Native(cfg, attempt > 0);
      if (!auth) return null;
      const url = `${auth.downloadUrl}/file/${encodeURIComponent(cfg.bucket)}/${objKey}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Authorization: auth.authorizationToken }
      });
      if (resp.status === 401 && attempt === 0) {
        b2AuthCache = null;
        continue;
      }
      if (resp.status === 404) return null;
      if (!resp.ok) return null;
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length) {
        lastS3Error = null;
        b2NativePreferred = true;
        return buf;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

async function trySaveToB2Native(cfg, fileId, n, buf) {
  const cleanId = String(fileId).replace(/[^a-zA-Z0-9._-]/g, '');
  return b2UploadObject(cfg, `chunks/${cleanId}/${parseInt(n, 10)}.bin`, buf, 'application/octet-stream');
}

async function tryLoadFromB2Native(cfg, fileId, n) {
  const cleanId = String(fileId).replace(/[^a-zA-Z0-9._-]/g, '');
  return b2DownloadObject(cfg, `chunks/${cleanId}/${parseInt(n, 10)}.bin`);
}

async function tryDeleteFromB2Native(cfg, fileId) {
  const cleanId = String(fileId).replace(/[^a-zA-Z0-9._-]/g, '');
  try {
    const auth = await authorizeB2Native(cfg);
    if (!auth) return;
    const listResp = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: auth.bucketId,
        prefix: `chunks/${cleanId}/`,
        maxFileCount: 1000
      })
    });
    if (!listResp.ok) return;
    const listData = await listResp.json().catch(() => null);
    for (const f of (listData?.files || [])) {
      await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
          Authorization: auth.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: f.fileName, fileId: f.fileId })
      }).catch(() => {});
    }
  } catch {}
}

async function trySaveToS3(fileId, n, buf) {
  const cfg = getS3Config();
  if (!cfg) return false;
  const isB2 = /backblazeb2/i.test(cfg.endpoint);
  if (isB2 && b2NativePreferred) {
    try {
      return await trySaveToB2Native(cfg, fileId, n, buf);
    } catch (b2Err) {
      lastS3Error = b2Err?.message || String(b2Err);
      throw b2Err;
    }
  }
  const objKey = `chunks/${String(fileId).replace(/[^a-zA-Z0-9._-]/g, '')}/${parseInt(n, 10)}.bin`;
  const resp = await s3SignedFetch(cfg, 'PUT', objKey, buf, 'application/octet-stream', 30000);
  if (!resp.ok) {
    const errText = extractS3XmlError(await resp.text().catch(() => ''));
    if (isB2 && (resp.status === 403 || /InvalidAccessKeyId|SignatureDoesNotMatch/i.test(errText))) {
      try {
        return await trySaveToB2Native(cfg, fileId, n, buf);
      } catch (b2Err) {
        lastS3Error = `S3 ${resp.status} ${errText} | ${b2Err?.message || b2Err}`.trim();
        throw new Error(lastS3Error);
      }
    }
    lastS3Error = `${cfg.provider} PUT failed (${resp.status})${errText ? `: ${errText}` : ''}`;
    throw new Error(lastS3Error);
  }
  lastS3Error = null;
  fileBackend = isB2 ? 'b2-s3+disk' : 's3+disk';
  return true;
}

async function tryLoadFromS3(fileId, n) {
  return loadCloudObject(`chunks/${String(fileId).replace(/[^a-zA-Z0-9._-]/g, '')}/${parseInt(n, 10)}.bin`);
}

async function saveCloudObject(objKey, buf, contentType = 'application/octet-stream') {
  const cfg = getS3Config();
  if (!cfg) return false;
  const isB2 = /backblazeb2/i.test(cfg.endpoint);
  if (isB2 && b2NativePreferred) {
    return await b2UploadObject(cfg, objKey, buf, contentType);
  }
  const resp = await s3SignedFetch(cfg, 'PUT', objKey, buf, contentType, 30000);
  if (!resp.ok) {
    const errText = extractS3XmlError(await resp.text().catch(() => ''));
    if (isB2 && (resp.status === 403 || /InvalidAccessKeyId|SignatureDoesNotMatch/i.test(errText))) {
      return await b2UploadObject(cfg, objKey, buf, contentType);
    }
    throw new Error(`${cfg.provider} PUT failed (${resp.status})${errText ? `: ${errText}` : ''}`);
  }
  lastS3Error = null;
  return true;
}

async function loadCloudObject(objKey) {
  const cfg = getS3Config();
  if (!cfg) return null;
  const isB2 = /backblazeb2/i.test(cfg.endpoint);
  if (isB2 && b2NativePreferred) {
    const nativeBuf = await b2DownloadObject(cfg, objKey);
    if (nativeBuf) return nativeBuf;
  }
  try {
    const resp = await s3SignedFetch(cfg, 'GET', objKey, null, null, 25000);
    if (resp.status === 404) {
      return isB2 ? await b2DownloadObject(cfg, objKey) : null;
    }
    if (!resp.ok) {
      if (isB2 && (resp.status === 403 || resp.status === 401)) {
        const nativeBuf = await b2DownloadObject(cfg, objKey);
        if (nativeBuf) return nativeBuf;
      }
      const errTxt = extractS3XmlError(await resp.text().catch(() => ''));
      lastS3Error = `${cfg.provider} GET failed (${resp.status})${errTxt ? `: ${errTxt}` : ''}`;
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return buf.length ? buf : null;
  } catch (err) {
    if (isB2) {
      const nativeBuf = await b2DownloadObject(cfg, objKey);
      if (nativeBuf) return nativeBuf;
    }
    console.warn(`[store] S3/B2 download notice for ${objKey}:`, err.message);
    return null;
  }
}

async function tryDeleteFromS3(fileId, count) {
  const cfg = getS3Config();
  if (!cfg) return;
  const isB2 = /backblazeb2/i.test(cfg.endpoint);
  if (isB2 && b2NativePreferred) {
    await tryDeleteFromB2Native(cfg, fileId);
    return;
  }
  const cleanId = String(fileId).replace(/[^a-zA-Z0-9._-]/g, '');
  const total = Number.isFinite(+count) && +count > 0 ? +count : 1;
  for (let n = 0; n < total; n++) {
    await s3SignedFetch(cfg, 'DELETE', `chunks/${cleanId}/${n}.bin`, null, null, 10000).catch(() => {});
  }
}

function hasPersistentVolume() {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return true;
  try {
    return fs.existsSync('/data') && fs.statSync('/data').isDirectory();
  } catch {
    return false;
  }
}

function isQuotaErrorText(msg) {
  return /quota|resource_exhausted|429|daily write units|billing/i.test(String(msg || ''));
}

async function probeDirectCommitOnly(appVersion = '') {
  try {
    const cred = app?.options?.credential;
    if (!cred || typeof cred.getAccessToken !== 'function' || !projectId) return null;
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
    const out = {
      httpStatus: resp.status,
      ok: resp.ok,
      error: parsed?.error?.message || (resp.ok ? null : text.slice(0, 300)),
      status: parsed?.error?.status || null
    };
    if (resp.status === 429 || out.status === 'RESOURCE_EXHAUSTED') {
      quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
      lastFirestoreError = `Firestore daily write quota exhausted (429 RESOURCE_EXHAUSTED): ${out.error || 'Quota limit exceeded'}`;
    } else if (resp.ok) {
      quotaCooldownUntil = 0;
    }
    return out;
  } catch (pErr) {
    return { ok: false, error: pErr.message };
  }
}

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
    const dump = { epoch: SNAPSHOT_EPOCH, savedAt: Date.now(), collections: {} };
    for (const c of COLLECTIONS) dump.collections[c] = Array.from(mem[c].values());
    const tmpFile = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(dump, null, 2), 'utf8');
    fs.renameSync(tmpFile, CACHE_FILE);
  } catch (err) {
    console.error('[store] failed to save local cache:', err.message);
  }
}

const SNAPSHOT_EPOCH = 2;
const SNAPSHOT_OBJECT_KEY = 'snapshots/zovio_primary.json.gz';
const isB2PrimaryMode = () => Boolean(getS3Config());
const collectionSource = new Map();
let cloudSnapshotDirty = false;
let cloudSnapshotTimer = null;
let cloudSnapshotInFlight = null;
let lastCloudSnapshotAt = 0;

function markDirtyCaches() {
  scheduleSaveLocalCache();
  cloudSnapshotDirty = true;
  scheduleCloudSnapshot();
}

function scheduleSaveLocalCache() {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    saveLocalCache();
  }, 250);
  if (typeof saveCacheTimer.unref === 'function') saveCacheTimer.unref();
}

function scheduleCloudSnapshot() {
  if (!getS3Config() || cloudSnapshotTimer) return;
  cloudSnapshotTimer = setTimeout(() => {
    cloudSnapshotTimer = null;
    saveCloudSnapshot(false).catch(() => {});
  }, 3000);
  if (typeof cloudSnapshotTimer.unref === 'function') cloudSnapshotTimer.unref();
}

function canSafeSnapshotUsers() {
  if (isB2PrimaryMode()) return !isCollectionDegraded('users');
  if (collectionSource.get('users') === 'firestore') return true;
  if (collectionSource.get('users') === 'b2-snapshot') return true;
  if (collectionSource.get('users') === 'local-cache' && mem.users.size > 0) return true;
  return !db && mem.users.size > 0;
}

async function saveCloudSnapshot(force = false) {
  if (!getS3Config()) return false;
  if (!force && !cloudSnapshotDirty) return false;
  // Never overwrite a good cloud backup from a degraded empty container
  if (!canSafeSnapshotUsers()) return false;
  if (cloudSnapshotInFlight) return cloudSnapshotInFlight;

  cloudSnapshotInFlight = (async () => {
    try {
      const dump = { epoch: SNAPSHOT_EPOCH, version: 2, savedAt: Date.now(), collections: {} };
      for (const c of COLLECTIONS) {
        dump.collections[c] = Array.from(mem[c].values());
      }
      const gz = zlib.gzipSync(Buffer.from(JSON.stringify(dump), 'utf8'), { level: 6 });
      const ok = await saveCloudObject(SNAPSHOT_OBJECT_KEY, gz, 'application/gzip');
      if (ok) {
        cloudSnapshotDirty = false;
        lastCloudSnapshotAt = Date.now();
        console.log(`[store] Saved B2 primary snapshot (${Math.round(gz.length / 1024)} KB gz, users=${mem.users.size}, chats=${mem.chats.size}, msgs=${mem.messages.size})`);
      }
      return ok;
    } catch (err) {
      console.warn('[store] Cloud snapshot upload notice:', err?.message || err);
      return false;
    } finally {
      cloudSnapshotInFlight = null;
    }
  })();
  return cloudSnapshotInFlight;
}

async function loadCloudSnapshot() {
  if (!getS3Config()) return false;
  try {
    const gz = await loadCloudObject(SNAPSHOT_OBJECT_KEY);
    if (!gz || !gz.length) {
      // Fresh B2 primary database (no prior v2 snapshot yet)
      for (const c of COLLECTIONS) collectionSource.set(c, 'b2-primary');
      return true;
    }
    const rawJson = zlib.gunzipSync(gz).toString('utf8');
    const parsed = JSON.parse(rawJson);
    const cols = parsed?.collections || parsed;
    if (!cols || typeof cols !== 'object') return false;

    for (const c of COLLECTIONS) {
      if (Array.isArray(cols[c])) {
        for (const item of cols[c]) {
          if (item && item.id && !mem[c].has(item.id)) {
            mem[c].set(item.id, item);
          }
        }
      }
      collectionSource.set(c, 'b2-primary');
    }
    console.log('[store] Loaded B2 primary snapshot:', COLLECTIONS.map(c => `${c}=${mem[c].size}`).join(' '));
    saveLocalCache();
    return true;
  } catch (err) {
    console.warn('[store] Could not load cloud snapshot:', err?.message || err);
    return false;
  }
}

function loadLocalCache() {
  if (!fs.existsSync(CACHE_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (isB2PrimaryMode() && raw?.epoch !== SNAPSHOT_EPOCH) {
      console.log('[store] Ignoring pre-reset local cache from older epoch');
      return;
    }
    const cols = raw?.collections || raw;
    for (const c of COLLECTIONS) {
      if (Array.isArray(cols[c]) && cols[c].length > 0) {
        for (const item of cols[c]) {
          if (item && item.id) mem[c].set(item.id, item);
        }
        if (!collectionSource.has(c) && mem[c].size > 0) {
          collectionSource.set(c, 'local-cache');
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

const failedStartupCollections = new Set();
const STARTUP_PRIORITY_ORDER = ['users', 'chats', 'messages', 'workspace', 'meetings', 'calls', 'statuses', 'files'];
let nextStartupRetryAt = 0;

function isCollectionDegraded(col) {
  return failedStartupCollections.has(col) && !collectionSource.has(col);
}

async function lookupUserInFirestore({ email, username, firebaseUid, phone } = {}) {
  if (!db || quotaCooldownUntil > Date.now()) return null;
  const tries = [];
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUser = String(username || '').trim().toLowerCase().replace(/^@+/, '');
  const cleanUid = String(firebaseUid || '').trim();
  const rawPhone = String(phone || '').trim();

  if (cleanEmail && cleanEmail.includes('@')) tries.push(['email', cleanEmail]);
  if (cleanUid) tries.push(['firebaseUid', cleanUid]);
  if (cleanUser) tries.push(['username', cleanUser]);
  if (rawPhone) tries.push(['phone', rawPhone]);

  for (const [field, val] of tries) {
    try {
      const snap = await withTimeout(
        db.collection('users').where(field, '==', val).limit(3).get(),
        6000,
        `Firestore user lookup ${field}`
      );
      if (!snap.empty) {
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        docs.sort((a, b) => (a.createdAt || Number.MAX_SAFE_INTEGER) - (b.createdAt || Number.MAX_SAFE_INTEGER));
        for (const u of docs) mem.users.set(u.id, u);
        saveLocalCache();
        return docs[0];
      }
    } catch (err) {
      const msg = err?.message || String(err);
      lastFirestoreError = msg;
      if (isQuotaErrorText(msg) || err?.code === 8) {
        quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        return null;
      }
    }
  }
  return null;
}

async function loadSingleCollectionFromFirestore(c, retries = 1) {
  if (quotaCooldownUntil > Date.now()) {
    failedStartupCollections.add(c);
    return false;
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const snap = await withTimeout(db.collection(c).get(), 45000, `Firestore load ${c}`);
      snap.forEach(doc => {
        const data = doc.data();
        mem[c].set(doc.id, { ...data, id: doc.id });
      });
      collectionSource.set(c, 'firestore');
      failedStartupCollections.delete(c);
      return true;
    } catch (err) {
      const msg = err?.message || String(err);
      lastFirestoreError = msg;
      console.error(`[store] Failed to load collection "${c}" from Firestore (attempt ${attempt + 1}/${retries + 1}):`, msg);
      if (isQuotaErrorText(msg) || err?.code === 8) {
        quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        break;
      }
      if (attempt < retries) {
        await new Promise(rs => setTimeout(rs, 1000 * (attempt + 1)));
      }
    }
  }
  failedStartupCollections.add(c);
  return false;
}

async function loadFromFirestore() {
  if (!db) return;
  for (const c of STARTUP_PRIORITY_ORDER) {
    if (quotaCooldownUntil > Date.now()) {
      failedStartupCollections.add(c);
      continue;
    }
    await loadSingleCollectionFromFirestore(c, 1);
  }
}

function buildDocWriteFn(col, id, op) {
  if (op === 'delete') return () => db.collection(col).doc(id).delete();
  return () => {
    const latest = mem[col]?.get(id);
    if (!latest) return Promise.resolve();
    return db.collection(col).doc(id).set(sanitizeForFirestore(latest), { merge: true });
  };
}

async function init() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  loadLocalCache();
  await loadCloudSnapshot().catch(() => {});

  const connected = initFirebase();
  if (isB2PrimaryMode()) {
    saveLocalCache();
    console.log('[store] Backblaze B2 Primary Store active (fresh quota-free persistence):', COLLECTIONS.map(c => `${c}=${mem[c].size}`).join(' '));
  } else if (connected && db) {
    await loadFromFirestore();
    saveLocalCache();
    if (!failedStartupCollections.has('users') && mem.users.size > 0) {
      saveCloudSnapshot(true).catch(() => {});
    }
    console.log('[store] Google Firebase Cloud Firestore connected:', COLLECTIONS.map(c => `${c}=${mem[c].size}`).join(' '));
  } else {
    saveLocalCache();
    console.log('[store] Google Firebase credentials not found in .env or workspace.');
    console.log('[store] Zovio is running with local persistence. Add FIREBASE_PROJECT_ID or serviceAccountKey.json to sync to Google Cloud Firestore.');
  }
}

async function runWithRetry(col, id, op, fn) {
  const key = `${col}/${id}`;
  if (quotaCooldownUntil > Date.now()) {
    failedOps.set(key, { col, id, op, fn });
    return;
  }
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await withTimeout(fn(), 10000, `Firestore ${key}`);
      failedOps.delete(key);
      lastFirestoreError = null;
      quotaCooldownUntil = 0;
      return;
    } catch (e) {
      lastErr = e;
      lastFirestoreError = e?.message || String(e);
      const msg = String(lastFirestoreError);
      // Do not endlessly retry deterministic invalid-argument, oversize doc, or quota errors
      if (/longer than 1048|invalid argument|exceeds the maximum allowed size/i.test(msg)) {
        break;
      }
      if (isQuotaErrorText(msg)) {
        quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        break;
      }
      if (e?.code === 'ETIMEDOUT' && attempt === 0) {
        const probe = await probeDirectCommitOnly();
        if (probe && (probe.httpStatus === 429 || probe.status === 'RESOURCE_EXHAUSTED')) {
          break;
        }
      }
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise(rs => setTimeout(rs, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  failedOps.set(key, { col, id, op, fn });
  console.error(`[store] Firestore sync failed (${key}):`, lastErr?.message || lastErr);
}

function enqueueDoc(col, id, op, fn) {
  const key = `${col}/${id}`;
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(() => runWithRetry(col, id, op, fn));
  queues.set(key, next);
  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
  return next;
}

const retryTimer = setInterval(() => {
  if (!db || isB2PrimaryMode()) return;
  const nowMs = Date.now();
  if (quotaCooldownUntil > nowMs) return;

  if (failedStartupCollections.size && nowMs >= nextStartupRetryAt) {
    nextStartupRetryAt = nowMs + 5 * 60 * 1000;
    (async () => {
      let recoveredAny = false;
      for (const c of STARTUP_PRIORITY_ORDER) {
        if (!failedStartupCollections.has(c)) continue;
        if (quotaCooldownUntil > Date.now()) break;
        const ok = await loadSingleCollectionFromFirestore(c, 0).catch(() => false);
        if (ok) recoveredAny = true;
      }
      if (recoveredAny) {
        saveLocalCache();
        saveCloudSnapshot(true).catch(() => {});
      }
    })();
  }
  if (!failedOps.size || quotaCooldownUntil > Date.now()) return;
  const pending = Array.from(failedOps.entries());
  for (const [key, item] of pending) {
    if (!queues.has(key)) enqueueDoc(item.col, item.id, item.op, item.fn);
  }
}, 15000);
if (typeof retryTimer.unref === 'function') retryTimer.unref();

async function flush(timeoutMs = 7000) {
  saveLocalCache();
  await Promise.race([
    saveCloudSnapshot(cloudSnapshotDirty || lastCloudSnapshotAt === 0).catch(() => {}),
    new Promise(rs => setTimeout(rs, Math.min(4000, timeoutMs)))
  ]);
  if (db && failedOps.size && quotaCooldownUntil <= Date.now()) {
    for (const [key, item] of Array.from(failedOps.entries())) {
      if (!queues.has(key)) enqueueDoc(item.col, item.id, item.op, item.fn);
    }
  }
  const active = Array.from(queues.values());
  if (active.length) {
    await Promise.race([
      Promise.allSettled(active),
      new Promise(rs => setTimeout(rs, timeoutMs))
    ]);
  }
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
  markDirtyCaches();

  if (db && !opts.skipCloud && !isB2PrimaryMode()) {
    enqueueDoc(col, id, 'upsert', () => db.collection(col).doc(id).set(sanitizeForFirestore(full)));
  }
  return full;
}

function update(col, id, patch, opts = {}) {
  const cur = mem[col].get(id);
  if (!cur) return null;
  const next = typeof patch === 'function' ? patch(cur) || cur : Object.assign(cur, patch);
  mem[col].set(id, next);
  markDirtyCaches();

  if (db && !opts.skipCloud && !isB2PrimaryMode()) {
    enqueueDoc(col, id, 'upsert', () => db.collection(col).doc(id).set(sanitizeForFirestore(next), { merge: true }));
  }
  return next;
}

function remove(col, id) {
  if (!mem[col].delete(id)) return false;
  markDirtyCaches();

  if (db && !isB2PrimaryMode()) {
    enqueueDoc(col, id, 'delete', () => db.collection(col).doc(id).delete());
  }
  return true;
}

/**
 * Flush a single document to persistent cloud storage immediately (awaiting up to timeoutMs).
 */
async function syncDoc(col, id, timeoutMs = 10000) {
  const doc = mem[col]?.get(id);
  if (!doc) return false;
  if (isB2PrimaryMode()) {
    saveLocalCache();
    return Promise.race([
      saveCloudSnapshot(true).catch(() => false),
      new Promise(rs => setTimeout(() => rs(false), Math.min(timeoutMs, 5000)))
    ]);
  }
  const key = `${col}/${id}`;
  let ok = false;
  if (db) {
    if (quotaCooldownUntil > Date.now()) {
      enqueueDoc(col, id, 'upsert', () => db.collection(col).doc(id).set(sanitizeForFirestore(doc), { merge: true }));
      saveLocalCache();
      return false;
    }
    const writePromise = enqueueDoc(col, id, 'upsert', () => db.collection(col).doc(id).set(sanitizeForFirestore(doc), { merge: true }));
    try {
      await withTimeout(writePromise, timeoutMs, `Sync ${key}`);
      ok = !failedOps.has(key);
    } catch (err) {
      console.warn(`[store] syncDoc notice (${key}):`, err?.message || err);
      ok = false;
    }
  }
  if (!ok) {
    saveLocalCache();
  }
  return ok;
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
  if (getS3Config()) {
    try {
      await trySaveToS3(fileId, n, buf);
      return;
    } catch (s3Err) {
      lastS3Error = s3Err?.message || String(s3Err);
      console.warn(`[store] S3/B2 upload failed for ${fileId}/${n} (${lastS3Error}), falling back to Cloud Storage / Firestore...`);
    }
  }

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

  if (!savedToBucket && hasPersistentVolume()) {
    fileBackend = 'volume+disk';
    return;
  }

  // Backup to Firestore chunks collection whenever bucket didn't save it (or for small <= 450KB chunks)
  if (db && quotaCooldownUntil <= Date.now() && (!savedToBucket || buf.length <= 450 * 1024)) {
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
      if (isQuotaErrorText(lastFirestoreError)) {
        quotaCooldownUntil = Date.now() + 5 * 60 * 1000;
      } else if (fsErr?.code === 'ETIMEDOUT') {
        await probeDirectCommitOnly();
      }
      if (!savedToBucket) {
        console.warn(`[store] Firestore chunk backup skipped for ${fileId}/${n} (kept on local disk):`, lastFirestoreError);
      }
    }
  } else if (!savedToBucket) {
    console.warn(`[store] Cloud chunk backup skipped for ${fileId}/${n} (kept on local disk)`);
  }
}

async function putChunk(fileId, n, buf) {
  const { dir, filePath } = safeChunkPath(fileId, n);
  fs.mkdirSync(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buf);

  const hasCloudObject = Boolean(getS3Config());
  if (!hasCloudObject && !db && !getBucket()) return;
  if (!hasCloudObject && !hasPersistentVolume() && bucketDisabled && quotaCooldownUntil > Date.now()) {
    console.warn(`[store] Cloud quota exhausted; chunk ${fileId}/${n} kept on server disk`);
    return;
  }
  const delays = [400];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await persistChunkToCloud(fileId, n, buf);
      return;
    } catch (err) {
      console.warn(`[store] Cloud chunk save attempt ${attempt + 1} notice for ${fileId}/${n}:`, err.message);
      if (err?.status === 503 || isQuotaErrorText(err?.message)) break;
      if (attempt < delays.length) {
        await new Promise(rs => setTimeout(rs, delays[attempt]));
      }
    }
  }
  // Chunk is already durably written to server disk (`filePath`), so never fail the upload
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

  // Try Backblaze B2 / S3 first when configured
  if (getS3Config()) {
    buf = await tryLoadFromS3(fileId, n);
  }

  // Try Firebase Storage bucket(s) (default .firebasestorage.app and legacy .appspot.com)
  if (!buf) {
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
  }

  // Fallback to Firestore chunks collection (backwards compatibility for existing files)
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

  // Delete from Backblaze B2 / S3 when configured
  if (getS3Config()) {
    await tryDeleteFromS3(fileId, count).catch(() => {});
  }

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
    s3: { configured: false },
    bucketCandidates: [],
    chunksCount: null
  };

  const s3Cfg = getS3Config();
  if (s3Cfg) {
    try {
      const resp = await s3SignedFetch(s3Cfg, 'HEAD', '', null, null, 5000);
      if (resp.ok || resp.status === 200 || resp.status === 404) {
        result.s3 = { configured: true, ok: true, provider: s3Cfg.provider, bucket: s3Cfg.bucket, region: s3Cfg.region, endpoint: s3Cfg.endpoint };
        lastS3Error = null;
      } else {
        // Fallback to signed ListObjectsV2 GET so S3/B2 returns exact XML diagnostic (<Code>/<Message>)
        const listResp = await s3SignedFetch(s3Cfg, 'GET', '?list-type=2&max-keys=1', null, null, 5000);
        if (listResp.ok) {
          result.s3 = { configured: true, ok: true, provider: s3Cfg.provider, bucket: s3Cfg.bucket, region: s3Cfg.region, endpoint: s3Cfg.endpoint };
          lastS3Error = null;
        } else {
          // If key lacks listFiles capability, probe a non-existent object GET (404 = object reads allowed; 403 = key/bucket rejected)
          const objResp = await s3SignedFetch(s3Cfg, 'GET', 'chunks/_health_probe.bin', null, null, 5000).catch(() => null);
          if (objResp && objResp.status === 404) {
            result.s3 = { configured: true, ok: true, objectAccessOnly: true, provider: s3Cfg.provider, bucket: s3Cfg.bucket, region: s3Cfg.region, endpoint: s3Cfg.endpoint };
            lastS3Error = null;
          } else {
            const detail = extractS3XmlError(await listResp.text().catch(() => ''));
            const s3ErrMsg = `${s3Cfg.provider} returned ${listResp.status}${detail ? `: ${detail}` : ''}`;
            if (/backblazeb2/i.test(s3Cfg.endpoint)) {
              try {
                const auth = await authorizeB2Native(s3Cfg, true);
                if (auth) {
                  b2NativePreferred = true;
                  lastS3Error = null;
                  fileBackend = 'b2-native+disk';
                  result.s3 = {
                    configured: true,
                    ok: true,
                    mode: 'b2-native',
                    provider: 'Backblaze B2 (Native API)',
                    bucket: s3Cfg.bucket,
                    bucketId: auth.bucketId,
                    endpoint: auth.apiUrl
                  };
                }
              } catch (b2Err) {
                const combinedErr = `${s3ErrMsg} | ${b2Err?.message || b2Err}`;
                lastS3Error = combinedErr;
                result.s3 = { configured: true, ok: false, provider: s3Cfg.provider, bucket: s3Cfg.bucket, endpoint: s3Cfg.endpoint, error: combinedErr };
              }
            } else {
              lastS3Error = s3ErrMsg;
              result.s3 = { configured: true, ok: false, provider: s3Cfg.provider, bucket: s3Cfg.bucket, endpoint: s3Cfg.endpoint, error: s3ErrMsg };
            }
          }
        }
      }
    } catch (s3Err) {
      lastS3Error = s3Err?.message || String(s3Err);
      result.s3 = { configured: true, ok: false, provider: s3Cfg.provider, bucket: s3Cfg.bucket, endpoint: s3Cfg.endpoint, error: lastS3Error };
    }
  }

  if (db) {
    if (isB2PrimaryMode()) {
      result.firestoreTest = { ok: true, skipped: true, mode: 'b2-primary' };
    } else if (quotaCooldownUntil > Date.now()) {
      result.firestoreTest = { ok: false, skipped: true, error: lastFirestoreError || 'Firestore quota cooldown active' };
    } else {
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
        if (isQuotaErrorText(err?.message)) quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
      }
      result.firestoreTest = fTest;

      // 0-retry direct REST :commit probe so Google's exact status/reason isn't hidden behind SDK backoff
      result.directCommitProbe = await probeDirectCommitOnly(appVersion);

      if (quotaCooldownUntil <= Date.now()) {
        try {
          if (typeof db.collection('chunks').count === 'function') {
            const agg = await withTimeout(db.collection('chunks').count().get(), 5000, 'Chunks count');
            result.chunksCount = agg.data().count;
          }
        } catch (_) {}
      }
    }
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
  isCollectionDegraded,
  lookupUserInFirestore,
  saveCloudSnapshot,
  getDb: () => db,
  getBucket,
  getDataDir: () => DATA_DIR,
  getUploadDir: () => UPLOAD_DIR,
  isS3Configured: () => Boolean(getS3Config()),
  status: () => ({
    database: isB2PrimaryMode() ? 'Backblaze B2 Primary Store (zovio-bucket)' : 'Google Firebase (Cloud Firestore)',
    connected: isB2PrimaryMode() ? true : firebaseInitialized,
    b2Primary: isB2PrimaryMode(),
    lastFirestoreError,
    quotaExhausted: isB2PrimaryMode() ? false : (quotaCooldownUntil > Date.now()),
    collectionSources: Object.fromEntries(collectionSource.entries()),
    lastCloudSnapshotAt: lastCloudSnapshotAt || null,
    bucketDisabled,
    bucketDisabledReason: bucketDisabledReason || undefined,
    s3: {
      configured: Boolean(getS3Config()),
      mode: b2NativePreferred ? 'b2-native' : 's3',
      provider: b2NativePreferred ? 'Backblaze B2 (Native API)' : (getS3Config()?.provider || undefined),
      lastError: lastS3Error || undefined
    },
    persistentVolume: hasPersistentVolume(),
    pendingWrites: queues.size,
    failedWrites: failedOps.size,
    failedStartupCollections: Array.from(failedStartupCollections),
    projectId: projectId || (firebaseInitialized ? 'Connected' : 'Local Persistence (Set FIREBASE_PROJECT_ID in .env)'),
    databaseId: process.env.FIREBASE_DATABASE_ID || 'fireupp-db',
    files: (getS3Config() && !lastS3Error) ? (b2NativePreferred ? 'b2-native+disk' : 's3+disk') : (getS3Config() ? `${fileBackend} (s3-fallback)` : fileBackend)
  })
};

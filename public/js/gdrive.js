/**
 * ZovioDriveBackup — End-to-end encrypted incremental backup to the user's personal Google Drive
 * (`spaces=appDataFolder`, direct client-to-Google upload) plus encrypted `.zovio` offline export/import.
 *
 * Binary record framing (`ZV01`):
 *   [4B magic 'ZV01'][4B uint32 BE metaLen][UTF-8 meta JSON][12B IV][AES-256-GCM(vaultKey, bytes)]
 *
 * Offline multi-record archive framing (`ZVBK`):
 *   [4B magic 'ZVBK'][4B uint32 BE recordCount] followed by `recordCount` x ([4B uint32 BE blobLen][ZV01 blob])
 */
(function (global) {
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
  const MAGIC_REC = [0x5A, 0x56, 0x30, 0x31]; // 'ZV01'
  const MAGIC_ARC = [0x5A, 0x56, 0x42, 0x4B]; // 'ZVBK'
  const MULTIPART_LIMIT = 4 * 1024 * 1024;
  const HOUR_MS = 3600 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  const te = new TextEncoder();
  const td = new TextDecoder();

  let gisLoadPromise = null;
  let activeJobPromise = null;
  let schedulerTimer = null;
  let manifestCache = null;

  function storageKey(uid) {
    return `zovio.gdrive.auth.${uid || 'anon'}`;
  }

  function readTokenCache(uid) {
    if (!uid) return null;
    try {
      const raw = localStorage.getItem(storageKey(uid));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeTokenCache(uid, rec) {
    if (!uid) return;
    try {
      if (!rec) localStorage.removeItem(storageKey(uid));
      else localStorage.setItem(storageKey(uid), JSON.stringify(rec));
    } catch {}
  }

  function getState() {
    return global.S || (typeof S !== 'undefined' ? S : null);
  }

  function getUID() {
    return getState()?.user?.id || '';
  }

  function getVaultKey() {
    return getState()?.vaultKey || null;
  }

  function getScheduleDays() {
    const raw = getState()?.user?.preferences?.backupScheduleDays;
    if (raw === 0 || raw === '0') return 0;
    const n = Number(raw);
    return (n === 1 || n === 7) ? n : 7;
  }

  function manifestFileName(uid) {
    return `zovio_backup_manifest_${uid}.json`;
  }

  function snapshotFileName(uid) {
    return `zovio_chats_snapshot_${uid}.enc`;
  }

  function mediaFileName(uid, fileId) {
    return `zovio_media_${uid}_${fileId}.enc`;
  }

  async function saveBackupPrefs(patch) {
    const st = getState();
    if (!st?.user) return;
    const nextPrefs = { ...(st.user.preferences || {}), ...patch };
    st.user.preferences = nextPrefs;
    st.user.prefs = nextPrefs;
    if (typeof global.api === 'function') {
      await global.api('/api/me', { method: 'PATCH', body: { preferences: nextPrefs } }).catch(() => {});
    }
  }

  // ---------- Binary E2EE Framing ----------

  async function sealBinaryRecord(vaultKey, meta, rawBytes) {
    const metaBytes = te.encode(JSON.stringify(meta || {}));
    const payload = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes || 0);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vaultKey, payload));

    const out = new Uint8Array(8 + metaBytes.length + 12 + ct.length);
    const view = new DataView(out.buffer);
    out.set(MAGIC_REC, 0);
    view.setUint32(4, metaBytes.length, false);
    out.set(metaBytes, 8);
    out.set(iv, 8 + metaBytes.length);
    out.set(ct, 8 + metaBytes.length + 12);
    return out;
  }

  async function openBinaryRecord(vaultKey, rawBytes) {
    const buf = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
    if (buf.length < 20 || MAGIC_REC.some((b, i) => buf[i] !== b)) {
      throw new Error('Unrecognized encrypted backup record format');
    }
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const metaLen = view.getUint32(4, false);
    const metaEnd = 8 + metaLen;
    if (metaEnd + 12 > buf.length) throw new Error('Corrupted backup record header');
    const meta = JSON.parse(td.decode(buf.subarray(8, metaEnd)));
    const iv = buf.subarray(metaEnd, metaEnd + 12);
    const ct = buf.subarray(metaEnd + 12);
    const pt = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, vaultKey, ct));
    return { meta, data: pt };
  }

  // ---------- Google OAuth Token Acquisition ----------

  function loadGisScript() {
    if (global.google?.accounts?.oauth2) return Promise.resolve(true);
    if (gisLoadPromise) return gisLoadPromise;
    gisLoadPromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(Boolean(global.google?.accounts?.oauth2));
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
    return gisLoadPromise;
  }

  async function requestTokenViaGis(promptMode) {
    const st = getState();
    const clientId = st?.config?.googleClientId || '';
    if (!clientId) return null;
    const ok = await loadGisScript();
    if (!ok || !global.google?.accounts?.oauth2) return null;

    const uid = getUID();
    const cached = readTokenCache(uid);
    const hintEmail = cached?.email || st?.user?.preferences?.gdriveEmail || st?.user?.email || '';

    return new Promise((resolve, reject) => {
      try {
        const client = global.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          hint: hintEmail || undefined,
          prompt: promptMode,
          callback: resp => {
            if (resp && resp.access_token) {
              const expiresIn = Number(resp.expires_in || 3500);
              resolve({
                accessToken: resp.access_token,
                email: hintEmail || '',
                expiresAt: Date.now() + Math.max(300, expiresIn - 120) * 1000
              });
            } else {
              reject(new Error(resp?.error_description || resp?.error || 'Google Drive access declined'));
            }
          },
          error_callback: err => reject(new Error(err?.message || 'Google Drive auth error'))
        });
        client.requestAccessToken({ prompt: promptMode });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function requestTokenViaFirebasePopup(interactive) {
    if (!interactive) return null;
    if (typeof global.initFirebaseClient !== 'function') {
      throw new Error('Firebase Auth SDK not initialized');
    }
    await global.initFirebaseClient();
    if (!global.firebase?.auth) {
      throw new Error('Google sign-in SDK is unavailable');
    }
    const uid = getUID();
    const cached = readTokenCache(uid);
    const st = getState();
    const hintEmail = cached?.email || st?.user?.preferences?.gdriveEmail || st?.user?.email || '';

    const provider = new global.firebase.auth.GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    const params = { prompt: 'consent select_account' };
    if (hintEmail) params.login_hint = hintEmail;
    provider.setCustomParameters(params);

    const res = await global.firebase.auth().signInWithPopup(provider);
    const accessToken = res?.credential?.accessToken || '';
    if (!accessToken) {
      throw new Error('Google Drive permission was not granted');
    }
    return {
      accessToken,
      email: res?.user?.email || hintEmail || '',
      expiresAt: Date.now() + 3400 * 1000
    };
  }

  async function requestTokenViaElectron(interactive) {
    if (!interactive) return null;
    const uid = getUID();
    const cached = readTokenCache(uid);
    const st = getState();
    const hintEmail = cached?.email || st?.user?.preferences?.gdriveEmail || st?.user?.email || '';
    const sessionId = 'gd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);

    return new Promise((resolve, reject) => {
      let done = false;
      let pollId = null;
      let timeoutId = null;
      const prevHandler = global._desktopAuthSessionHandler;

      const finish = (err, data) => {
        if (done) return;
        done = true;
        if (pollId) clearInterval(pollId);
        if (timeoutId) clearTimeout(timeoutId);
        if (global._desktopAuthSessionHandler === onDesktopAuth) {
          global._desktopAuthSessionHandler = prevHandler || null;
        }
        try { global.fireuppNative?.focusWindow?.(); } catch {}
        if (err) reject(err);
        else resolve(data);
      };

      const onDesktopAuth = data => {
        if (!data || data.action !== 'drive') return;
        if (!data.driveAccessToken) {
          finish(new Error('Google Drive token missing in browser callback'));
          return;
        }
        finish(null, {
          accessToken: data.driveAccessToken,
          email: data.email || hintEmail,
          expiresAt: Number(data.expiresAt || (Date.now() + 3400 * 1000))
        });
      };

      global._desktopAuthSessionHandler = onDesktopAuth;

      pollId = setInterval(async () => {
        if (done) return;
        try {
          const res = await global.api(`/api/auth/desktop-session?session=${encodeURIComponent(sessionId)}`);
          if (res?.ready && res.authData?.action === 'drive') {
            onDesktopAuth(res.authData);
          }
        } catch {}
      }, 900);

      timeoutId = setTimeout(() => {
        finish(new Error('Google Drive authorization timed out after 3 minutes'));
      }, 180000);

      const url = `https://zovio.up.railway.app/desktop-auth.html?action=drive&session=${encodeURIComponent(sessionId)}${hintEmail ? `&email=${encodeURIComponent(hintEmail)}` : ''}`;
      if (global.openZovioExternal) {
        global.openZovioExternal(url);
      } else {
        global.fireuppNative.openExternal(url);
      }
    });
  }

  async function verifyGoogleEmail(accessToken, fallbackEmail) {
    if (fallbackEmail) return fallbackEmail;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const info = await res.json();
        return info.email || '';
      }
    } catch {}
    return '';
  }

  async function getValidToken({ interactive = true } = {}) {
    const uid = getUID();
    if (!uid) throw new Error('Sign in to Zovio first');

    const cached = readTokenCache(uid);
    if (cached?.accessToken && Number(cached.expiresAt || 0) > Date.now() + 60000) {
      return cached.accessToken;
    }

    const isExternalHost = Boolean(
      (global.isNativeExternalAuthHost && global.isNativeExternalAuthHost()) ||
      (global.fireuppNative?.isElectron && global.fireuppNative?.openExternal)
    );

    // Never trigger GIS OAuth popups in the background when interactive === false:
    // GIS initTokenClient opens a visible popup window if unregistered/unconsented and triggers origin_mismatch
    // when GOOGLE_CLIENT_ID does not authorize the active Railway origin.
    if (!interactive) return null;

    let tokenRec = null;
    if (isExternalHost) {
      tokenRec = await requestTokenViaElectron(true);
    } else {
      try {
        tokenRec = await requestTokenViaFirebasePopup(true);
      } catch (fbErr) {
        // Only fall back to GIS if Firebase Auth SDK itself is unavailable
        if (!global.firebase?.auth) {
          tokenRec = await requestTokenViaGis('consent').catch(() => { throw fbErr; });
        } else {
          throw fbErr;
        }
      }
    }

    if (!tokenRec?.accessToken) throw new Error('Failed to obtain Google Drive access token');
    tokenRec.email = await verifyGoogleEmail(tokenRec.accessToken, tokenRec.email);
    writeTokenCache(uid, tokenRec);
    await saveBackupPrefs({ gdriveEmail: tokenRec.email || getState()?.user?.email || null });
    return tokenRec.accessToken;
  }

  async function connect() {
    const token = await getValidToken({ interactive: true });
    const uid = getUID();
    const cached = readTokenCache(uid);
    return { ok: Boolean(token), email: cached?.email || getState()?.user?.preferences?.gdriveEmail || '' };
  }

  async function disconnect() {
    const uid = getUID();
    writeTokenCache(uid, null);
    manifestCache = null;
    await saveBackupPrefs({ gdriveEmail: null });
  }

  // ---------- Google Drive REST v3 Direct Operations ----------

  async function driveFetch(url, token, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      writeTokenCache(getUID(), null);
      const err = new Error('Google Drive session expired — please reconnect');
      err.status = 401;
      throw err;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let parsedMsg = '';
      let reason = '';
      try {
        const j = JSON.parse(txt);
        parsedMsg = j?.error?.message || '';
        reason = j?.error?.errors?.[0]?.reason || j?.error?.details?.[0]?.reason || '';
      } catch {}

      const rawDetail = parsedMsg || txt;
      const urlMatch = rawDetail.match(/https:\/\/console\.[^\s"'<>]+/);
      const isDisabledApi =
        res.status === 403 &&
        (reason === 'accessNotConfigured' || /API has not been used|is disabled/i.test(rawDetail));

      const cleanMsg = isDisabledApi
        ? 'Google Drive API is disabled in Google Cloud Console. Click "Enable Google Drive API" below and retry in 1–2 minutes.'
        : `Google Drive error (${res.status}): ${(parsedMsg || txt).slice(0, 180)}`;

      const err = new Error(cleanMsg);
      err.status = res.status;
      if (isDisabledApi || urlMatch) {
        err.needsDriveApiEnable = isDisabledApi;
        err.activationUrl = urlMatch?.[0] || 'https://console.cloud.google.com/apis/library/drive.googleapis.com';
      }
      throw err;
    }
    return res;
  }

  async function findDriveFile(token, fileName) {
    const q = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
    const url = `${DRIVE_API}?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,size,modifiedTime)&pageSize=1`;
    const res = await driveFetch(url, token);
    const data = await res.json();
    return Array.isArray(data?.files) && data.files.length ? data.files[0] : null;
  }

  async function downloadDriveBytes(token, driveFileId) {
    const url = `${DRIVE_API}/${encodeURIComponent(driveFileId)}?alt=media`;
    const res = await driveFetch(url, token);
    return new Uint8Array(await res.arrayBuffer());
  }

  async function uploadDriveBytes(token, { name, existingId = null, mimeType = 'application/octet-stream', bytes }) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const meta = existingId ? { name, mimeType } : { name, mimeType, parents: ['appDataFolder'] };

    if (data.length <= MULTIPART_LIMIT) {
      const boundary = 'zovio_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const head = te.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
      );
      const tail = te.encode(`\r\n--${boundary}--`);
      const body = new Uint8Array(head.length + data.length + tail.length);
      body.set(head, 0);
      body.set(data, head.length);
      body.set(tail, head.length + data.length);

      const endpoint = existingId
        ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(existingId)}?uploadType=multipart&fields=id,size,modifiedTime`
        : `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,size,modifiedTime`;

      const res = await driveFetch(endpoint, token, {
        method: existingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      });
      return res.json();
    }

    // Resumable upload for > 4 MB media files
    const initEndpoint = existingId
      ? `${DRIVE_UPLOAD_API}/${encodeURIComponent(existingId)}?uploadType=resumable&fields=id,size,modifiedTime`
      : `${DRIVE_UPLOAD_API}?uploadType=resumable&fields=id,size,modifiedTime`;

    const initRes = await driveFetch(initEndpoint, token, {
      method: existingId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(data.length)
      },
      body: JSON.stringify(meta)
    });
    const sessionUrl = initRes.headers.get('Location');
    if (!sessionUrl) throw new Error('Google Drive resumable session URL missing');

    const putRes = await fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: data
    });
    if (!putRes.ok) {
      throw new Error(`Google Drive resumable upload failed (${putRes.status})`);
    }
    return putRes.json();
  }

  // ---------- Backup & Restore Payloads ----------

  async function collectChatSnapshots(uid) {
    const byChat = new Map();
    if (global.ZovioLocalDB?.getAllChats) {
      const localChats = await global.ZovioLocalDB.getAllChats(uid).catch(() => []);
      for (const row of localChats) {
        byChat.set(row.chatId, row.messages.slice());
      }
    }
    const st = getState();
    if (st?.msgs instanceof Map) {
      for (const [chatId, msgs] of st.msgs.entries()) {
        if (!Array.isArray(msgs) || !msgs.length) continue;
        const merged = new Map();
        for (const m of (byChat.get(chatId) || [])) {
          if (m?.id) merged.set(m.id, m);
        }
        for (const m of msgs) {
          if (m?.id) merged.set(m.id, m);
        }
        byChat.set(chatId, Array.from(merged.values()).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0)));
      }
    }
    const chatsObj = {};
    let totalMsgs = 0;
    for (const [chatId, list] of byChat.entries()) {
      const slim = list.slice(-1000).map(m => ({
        id: m.id,
        chatId: m.chatId || chatId,
        senderId: m.senderId,
        ts: m.ts,
        kind: m.kind,
        keyVersion: m.keyVersion,
        _plain: m._plain || undefined,
        body: m._plain ? undefined : (typeof m.body === 'object' ? m.body : undefined),
        decryptedText: m.decryptedText || undefined,
        viewOnce: !!m.viewOnce,
        viewedBy: Array.isArray(m.viewedBy) ? m.viewedBy : [],
        fileIds: Array.isArray(m.fileIds) ? m.fileIds : [],
        pollMulti: !!m.pollMulti,
        votes: m.votes || {},
        checks: m.checks || {},
        reactions: m.reactions || {},
        readBy: Array.isArray(m.readBy) ? m.readBy : [],
        replyTo: m.replyTo || null,
        deleted: !!m.deleted,
        deletedForEveryone: !!m.deletedForEveryone,
        editedAt: m.editedAt || undefined,
        forwardedFrom: m.forwardedFrom || undefined,
        isPinned: !!m.isPinned
      }));
      chatsObj[chatId] = slim;
      totalMsgs += slim.length;
    }
    return { chatsObj, chatCount: byChat.size, totalMsgs };
  }

  async function collectWorkspaceSnapshot(uid) {
    const byId = new Map();
    if (global.ZovioLocalDB?.getWorkspaceItems) {
      const localWs = await global.ZovioLocalDB.getWorkspaceItems(uid).catch(() => []);
      for (const w of localWs) if (w?.id) byId.set(w.id, w);
    }
    const st = getState();
    if (Array.isArray(st?.workspace)) {
      for (const w of st.workspace) if (w?.id) byId.set(w.id, w);
    }
    return Array.from(byId.values());
  }

  async function applyRestoredWorkspace(uid, items) {
    if (!Array.isArray(items) || !items.length) return 0;
    const st = getState();
    const byId = new Map();
    if (global.ZovioLocalDB?.getWorkspaceItems) {
      const curLocal = await global.ZovioLocalDB.getWorkspaceItems(uid).catch(() => []);
      for (const w of curLocal) if (w?.id) byId.set(w.id, w);
    }
    if (Array.isArray(st?.workspace)) {
      for (const w of st.workspace) if (w?.id) byId.set(w.id, w);
    }
    for (const w of items) {
      if (w?.id && !byId.has(w.id)) byId.set(w.id, w);
    }
    const merged = Array.from(byId.values());
    if (global.ZovioLocalDB?.saveWorkspaceItems) {
      await global.ZovioLocalDB.saveWorkspaceItems(uid, merged).catch(() => {});
    }
    if (st) st.workspace = merged;
    if (typeof global.renderWorkspaceView === 'function' && st?.view === 'workspace') {
      global.renderWorkspaceView();
    }
    return merged.length;
  }

  async function applyRestoredChats(uid, chatsObj) {
    const entries = Object.entries(chatsObj || {});
    let restoredChats = 0;
    let restoredMsgs = 0;
    const st = getState();

    for (const [chatId, list] of entries) {
      if (!Array.isArray(list) || !list.length) continue;
      let merged = list;
      if (global.ZovioLocalDB?.mergeChatMessages) {
        merged = await global.ZovioLocalDB.mergeChatMessages(uid, chatId, list).catch(() => list);
      }
      if (st?.msgs instanceof Map) {
        const existing = st.msgs.get(chatId) || [];
        const byId = new Map();
        for (const m of merged) if (m?.id) byId.set(m.id, m);
        for (const m of existing) if (m?.id) byId.set(m.id, m);
        st.msgs.set(
          chatId,
          Array.from(byId.values()).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0))
        );
      }
      restoredChats++;
      restoredMsgs += list.length;
    }
    return { restoredChats, restoredMsgs };
  }

  async function runBackup({ interactive = true, silent = false, onProgress = null } = {}) {
    if (activeJobPromise) return activeJobPromise;

    activeJobPromise = (async () => {
      const uid = getUID();
      const vaultKey = getVaultKey();
      if (!uid || !vaultKey) throw new Error('Sign in to unlock your E2EE vault first');

      const emit = (pct, text) => {
        if (typeof onProgress === 'function') onProgress({ pct, text });
      };

      emit(5, 'Connecting to Google Drive...');
      const token = await getValidToken({ interactive });
      if (!token) {
        const err = new Error('Google Drive authorization required');
        err.needsReconnect = true;
        throw err;
      }

      const cachedAuth = readTokenCache(uid);
      const mName = manifestFileName(uid);
      const mDrive = await findDriveFile(token, mName);
      let manifestDriveId = mDrive?.id || null;
      let manifest = {
        version: 1,
        uid,
        email: cachedAuth?.email || '',
        updatedAt: 0,
        chatsSnapshotDriveId: null,
        backedUpFiles: {}
      };
      if (manifestDriveId) {
        try {
          const mBytes = await downloadDriveBytes(token, manifestDriveId);
          const parsed = JSON.parse(td.decode(mBytes));
          if (parsed && parsed.uid === uid) {
            manifest = { ...manifest, ...parsed, backedUpFiles: parsed.backedUpFiles || {} };
          }
        } catch {}
      }

      emit(15, 'Scanning local device cache...');
      const allMedia = global.ZovioLocalDB?.getAllMedia
        ? await global.ZovioLocalDB.getAllMedia(uid)
        : [];

      const pendingMedia = allMedia.filter(rec => !manifest.backedUpFiles[rec.fileId]?.driveFileId);
      const alreadySynced = allMedia.length - pendingMedia.length;
      let newFilesUploaded = 0;

      for (let i = 0; i < pendingMedia.length; i++) {
        const rec = pendingMedia[i];
        const pct = 20 + Math.round(((i + 1) / Math.max(1, pendingMedia.length)) * 55);
        emit(pct, `Encrypting & uploading ${i + 1}/${pendingMedia.length} (${rec.name || rec.fileId})...`);

        const rawBuf = new Uint8Array(await rec.blob.arrayBuffer());
        const sealed = await sealBinaryRecord(vaultKey, {
          v: 1,
          kind: 'media',
          uid,
          fileId: rec.fileId,
          chatId: rec.chatId || '',
          mime: rec.mime || 'application/octet-stream',
          name: rec.name || ''
        }, rawBuf);

        const uploaded = await uploadDriveBytes(token, {
          name: mediaFileName(uid, rec.fileId),
          mimeType: 'application/octet-stream',
          bytes: sealed
        });

        manifest.backedUpFiles[rec.fileId] = {
          driveFileId: uploaded.id,
          size: rec.size || rawBuf.length,
          mime: rec.mime || 'application/octet-stream',
          name: rec.name || '',
          chatId: rec.chatId || '',
          uploadedAt: Date.now()
        };
        newFilesUploaded++;

        if (newFilesUploaded % 10 === 0) {
          manifest.updatedAt = Date.now();
          const cp = await uploadDriveBytes(token, {
            name: mName,
            existingId: manifestDriveId,
            mimeType: 'application/json',
            bytes: te.encode(JSON.stringify(manifest))
          }).catch(() => null);
          if (cp?.id) manifestDriveId = cp.id;
        }
      }

      emit(82, 'Encrypting chat history & workspace...');
      const { chatsObj, chatCount, totalMsgs } = await collectChatSnapshots(uid);
      const workspaceItems = await collectWorkspaceSnapshot(uid);
      const snapBytes = te.encode(JSON.stringify({ version: 1, uid, exportedAt: Date.now(), chats: chatsObj, workspace: workspaceItems }));
      const sealedSnap = await sealBinaryRecord(vaultKey, { v: 1, kind: 'chats', uid }, snapBytes);

      const existingSnapId = manifest.chatsSnapshotDriveId || (await findDriveFile(token, snapshotFileName(uid)))?.id || null;
      const snapRes = await uploadDriveBytes(token, {
        name: snapshotFileName(uid),
        existingId: existingSnapId,
        mimeType: 'application/octet-stream',
        bytes: sealedSnap
      });

      manifest.chatsSnapshotDriveId = snapRes.id;
      manifest.updatedAt = Date.now();
      manifest.email = cachedAuth?.email || manifest.email || '';
      manifest.chatCount = chatCount;
      manifest.totalMsgs = totalMsgs;
      manifest.workspaceCount = workspaceItems.length;

      emit(94, 'Updating Google Drive manifest...');
      await uploadDriveBytes(token, {
        name: mName,
        existingId: manifestDriveId,
        mimeType: 'application/json',
        bytes: te.encode(JSON.stringify(manifest))
      });

      manifestCache = manifest;
      global._zovioBackupDue = false;
      await saveBackupPrefs({
        gdriveEmail: manifest.email || getState()?.user?.preferences?.gdriveEmail || null,
        lastGdriveBackupAt: manifest.updatedAt,
        lastGdriveFileCount: Object.keys(manifest.backedUpFiles).length,
        lastGdriveChatCount: chatCount
      });

      emit(100, 'Backup complete');
      const result = {
        ok: true,
        newFilesUploaded,
        alreadySynced,
        totalFiles: Object.keys(manifest.backedUpFiles).length,
        chatCount,
        totalMsgs,
        updatedAt: manifest.updatedAt,
        email: manifest.email
      };

      if (silent && newFilesUploaded > 0 && typeof global.toast === 'function') {
        global.toast(`Google Drive auto-backup saved (${newFilesUploaded} new file${newFilesUploaded === 1 ? '' : 's'})`, 'ok');
      }
      return result;
    })();

    try {
      return await activeJobPromise;
    } finally {
      activeJobPromise = null;
    }
  }

  async function runRestore({ interactive = true, onProgress = null } = {}) {
    if (activeJobPromise) return activeJobPromise;

    activeJobPromise = (async () => {
      const uid = getUID();
      const vaultKey = getVaultKey();
      if (!uid || !vaultKey) throw new Error('Sign in to unlock your E2EE vault first');

      const emit = (pct, text) => {
        if (typeof onProgress === 'function') onProgress({ pct, text });
      };

      emit(5, 'Connecting to Google Drive...');
      const token = await getValidToken({ interactive });
      if (!token) throw new Error('Google Drive authorization required');

      const mDrive = await findDriveFile(token, manifestFileName(uid));
      if (!mDrive?.id) {
        throw new Error('No Zovio Google Drive backup found for this account');
      }

      emit(15, 'Downloading backup manifest...');
      const manifest = JSON.parse(td.decode(await downloadDriveBytes(token, mDrive.id)));
      manifestCache = manifest;

      let restoredChats = 0;
      let restoredMsgs = 0;
      const snapId = manifest.chatsSnapshotDriveId || (await findDriveFile(token, snapshotFileName(uid)))?.id;
      if (snapId) {
        emit(28, 'Decrypting chat history & workspace...');
        const encSnap = await downloadDriveBytes(token, snapId);
        const { data } = await openBinaryRecord(vaultKey, encSnap);
        const snap = JSON.parse(td.decode(data));
        const resChats = await applyRestoredChats(uid, snap.chats || {});
        restoredChats = resChats.restoredChats;
        restoredMsgs = resChats.restoredMsgs;
        if (Array.isArray(snap.workspace) && snap.workspace.length) {
          await applyRestoredWorkspace(uid, snap.workspace);
        }
      }

      const entries = Object.entries(manifest.backedUpFiles || {});
      let restoredFiles = 0;
      let skippedFiles = 0;

      for (let i = 0; i < entries.length; i++) {
        const [fileId, info] = entries[i];
        const pct = 35 + Math.round(((i + 1) / Math.max(1, entries.length)) * 60);
        const already = global.ZovioLocalDB?.getMedia ? await global.ZovioLocalDB.getMedia(fileId).catch(() => null) : null;
        if (already?.blob) {
          skippedFiles++;
          continue;
        }
        emit(pct, `Restoring media ${i + 1}/${entries.length} (${info.name || fileId})...`);
        if (!info?.driveFileId) continue;
        try {
          const encBytes = await downloadDriveBytes(token, info.driveFileId);
          const { meta, data } = await openBinaryRecord(vaultKey, encBytes);
          const mime = meta.mime || info.mime || 'application/octet-stream';
          const blob = new Blob([data], { type: mime });
          if (global.ZovioLocalDB?.putMedia) {
            await global.ZovioLocalDB.putMedia(fileId, {
              uid,
              chatId: meta.chatId || info.chatId || '',
              mime,
              name: meta.name || info.name || '',
              size: data.length,
              blob
            });
          }
          restoredFiles++;
        } catch (err) {
          console.warn('[gdrive] Failed to restore file', fileId, err);
        }
      }

      if (typeof global.renderChatList === 'function') global.renderChatList();
      if (typeof global.renderMsgs === 'function' && getState()?.activeChatId) global.renderMsgs();

      emit(100, 'Restore complete');
      return {
        ok: true,
        restoredChats,
        restoredMsgs,
        restoredFiles,
        skippedFiles,
        totalBackedUpFiles: entries.length
      };
    })();

    try {
      return await activeJobPromise;
    } finally {
      activeJobPromise = null;
    }
  }

  async function restoreSingleFile(fileId) {
    const uid = getUID();
    const vaultKey = getVaultKey();
    if (!uid || !vaultKey || !fileId) return null;

    // Only attempt silently if we already have/can silently refresh a token
    const token = await getValidToken({ interactive: false }).catch(() => null);
    if (!token) return null;

    if (!manifestCache || manifestCache.uid !== uid) {
      const mDrive = await findDriveFile(token, manifestFileName(uid)).catch(() => null);
      if (!mDrive?.id) return null;
      manifestCache = JSON.parse(td.decode(await downloadDriveBytes(token, mDrive.id)));
    }
    const info = manifestCache?.backedUpFiles?.[fileId];
    if (!info?.driveFileId) return null;

    const encBytes = await downloadDriveBytes(token, info.driveFileId);
    const { meta, data } = await openBinaryRecord(vaultKey, encBytes);
    const mime = meta.mime || info.mime || 'application/octet-stream';
    const blob = new Blob([data], { type: mime });

    if (global.ZovioLocalDB?.putMedia) {
      await global.ZovioLocalDB.putMedia(fileId, {
        uid,
        chatId: meta.chatId || info.chatId || '',
        mime,
        name: meta.name || info.name || '',
        size: data.length,
        blob
      }).catch(() => {});
    }
    return blob;
  }

  // ---------- Offline `.zovio` Encrypted Export / Import ----------

  async function exportOfflineBackup(onProgress = null) {
    const uid = getUID();
    const vaultKey = getVaultKey();
    if (!uid || !vaultKey) throw new Error('Sign in to unlock your E2EE vault first');

    const emit = (pct, text) => { if (typeof onProgress === 'function') onProgress({ pct, text }); };
    emit(10, 'Collecting encrypted chats...');

    const { chatsObj, chatCount, totalMsgs } = await collectChatSnapshots(uid);
    const workspaceItems = await collectWorkspaceSnapshot(uid);
    const snapBytes = te.encode(JSON.stringify({ version: 1, uid, exportedAt: Date.now(), chats: chatsObj, workspace: workspaceItems }));
    const sealedSnap = await sealBinaryRecord(vaultKey, { v: 1, kind: 'chats', uid }, snapBytes);

    const allMedia = global.ZovioLocalDB?.getAllMedia ? await global.ZovioLocalDB.getAllMedia(uid) : [];
    const chunks = [];
    const header = new Uint8Array(8);
    header.set(MAGIC_ARC, 0);
    new DataView(header.buffer).setUint32(4, 1 + allMedia.length, false);
    chunks.push(header);

    const pushRecord = recBytes => {
      const lenBuf = new Uint8Array(4);
      new DataView(lenBuf.buffer).setUint32(0, recBytes.length, false);
      chunks.push(lenBuf, recBytes);
    };
    pushRecord(sealedSnap);

    for (let i = 0; i < allMedia.length; i++) {
      const rec = allMedia[i];
      emit(20 + Math.round(((i + 1) / Math.max(1, allMedia.length)) * 75), `Encrypting ${i + 1}/${allMedia.length} media files...`);
      const rawBuf = new Uint8Array(await rec.blob.arrayBuffer());
      const sealed = await sealBinaryRecord(vaultKey, {
        v: 1, kind: 'media', uid, fileId: rec.fileId, chatId: rec.chatId || '',
        mime: rec.mime || 'application/octet-stream', name: rec.name || ''
      }, rawBuf);
      pushRecord(sealed);
    }

    const outBlob = new Blob(chunks, { type: 'application/octet-stream' });
    const uname = (getState()?.user?.username || 'zovio').replace(/[^a-z0-9_-]/gi, '');
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(outBlob);
    a.download = `zovio-backup-${uname}-${stamp}.zovio`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);

    emit(100, 'Offline backup exported');
    return { ok: true, chatCount, totalMsgs, mediaCount: allMedia.length, bytes: outBlob.size };
  }

  async function importOfflineBackup(file, onProgress = null) {
    const uid = getUID();
    const vaultKey = getVaultKey();
    if (!uid || !vaultKey) throw new Error('Sign in to unlock your E2EE vault first');
    if (!file) throw new Error('Select a .zovio backup file');

    const emit = (pct, text) => { if (typeof onProgress === 'function') onProgress({ pct, text }); };
    emit(10, 'Reading backup file...');

    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.length < 8 || MAGIC_ARC.some((b, i) => buf[i] !== b)) {
      throw new Error('Invalid .zovio backup file');
    }
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const count = view.getUint32(4, false);
    let offset = 8;
    let restoredChats = 0;
    let restoredMsgs = 0;
    let restoredFiles = 0;

    for (let i = 0; i < count && offset + 4 <= buf.length; i++) {
      const len = view.getUint32(offset, false);
      offset += 4;
      if (offset + len > buf.length) throw new Error('Backup file is truncated');
      const recBytes = buf.subarray(offset, offset + len);
      offset += len;

      const { meta, data } = await openBinaryRecord(vaultKey, recBytes);
      if (meta.kind === 'chats') {
        const snap = JSON.parse(td.decode(data));
        const resChats = await applyRestoredChats(uid, snap.chats || {});
        restoredChats = resChats.restoredChats;
        restoredMsgs = resChats.restoredMsgs;
        if (Array.isArray(snap.workspace) && snap.workspace.length) {
          await applyRestoredWorkspace(uid, snap.workspace);
        }
      } else if (meta.kind === 'media' && meta.fileId && global.ZovioLocalDB?.putMedia) {
        const mime = meta.mime || 'application/octet-stream';
        await global.ZovioLocalDB.putMedia(meta.fileId, {
          uid,
          chatId: meta.chatId || '',
          mime,
          name: meta.name || '',
          size: data.length,
          blob: new Blob([data], { type: mime })
        });
        restoredFiles++;
      }
      emit(15 + Math.round(((i + 1) / Math.max(1, count)) * 85), `Restoring item ${i + 1}/${count}...`);
    }

    if (typeof global.renderChatList === 'function') global.renderChatList();
    if (typeof global.renderMsgs === 'function' && getState()?.activeChatId) global.renderMsgs();
    emit(100, 'Import complete');
    return { ok: true, restoredChats, restoredMsgs, restoredFiles };
  }

  // ---------- Auto-Backup Scheduler (Default: Every 7 Days) ----------

  function isBackupDue() {
    const days = getScheduleDays();
    if (days <= 0) return false;
    const prefs = getState()?.user?.preferences || {};
    const last = Number(prefs.lastGdriveBackupAt || 0);
    const cached = readTokenCache(getUID());
    const email = cached?.email || prefs.gdriveEmail;
    if (!email && !cached?.accessToken) return false;
    return (Date.now() - last) >= days * DAY_MS;
  }

  async function maybeRunScheduledBackup() {
    if (!getUID() || !getVaultKey()) return;
    if (!isBackupDue()) {
      global._zovioBackupDue = false;
      return;
    }
    try {
      await runBackup({ interactive: false, silent: true });
    } catch {
      // Token likely requires user click in desktop or expired browser session; flag cleanly in Settings UI
      global._zovioBackupDue = true;
    }
  }

  function startScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    setTimeout(() => maybeRunScheduledBackup().catch(() => {}), 12000);
    schedulerTimer = setInterval(() => maybeRunScheduledBackup().catch(() => {}), HOUR_MS);
  }

  function getStatus() {
    const uid = getUID();
    const cached = readTokenCache(uid);
    const prefs = getState()?.user?.preferences || {};
    const tokenValid = Boolean(cached?.accessToken && Number(cached.expiresAt || 0) > Date.now() + 60000);
    const email = cached?.email || prefs.gdriveEmail || '';
    const lastBackupAt = Number(prefs.lastGdriveBackupAt || 0) || null;
    const scheduleDays = getScheduleDays();
    const nextBackupAt = (lastBackupAt && scheduleDays > 0) ? (lastBackupAt + scheduleDays * DAY_MS) : null;
    return {
      connected: Boolean(email || tokenValid),
      tokenValid,
      email,
      lastBackupAt,
      scheduleDays,
      nextBackupAt,
      fileCount: Number(prefs.lastGdriveFileCount || 0),
      chatCount: Number(prefs.lastGdriveChatCount || 0),
      due: isBackupDue() || Boolean(global._zovioBackupDue)
    };
  }

  global.ZovioDriveBackup = {
    connect,
    disconnect,
    runBackup,
    runRestore,
    restoreSingleFile,
    exportOfflineBackup,
    importOfflineBackup,
    saveScheduleDays: days => saveBackupPrefs({ backupScheduleDays: Number(days) }),
    maybeRunScheduledBackup,
    startScheduler,
    getStatus
  };
})(window);

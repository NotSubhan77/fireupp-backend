/**
 * ZovioLocalDB — WhatsApp-style device persistence using browser/desktop IndexedDB.
 * Stores decrypted media Blobs and decrypted chat message snapshots locally on the user's device
 * so photos, PDFs, videos, custom GIFs, and messages stay available across refreshes and updates.
 */
(function (global) {
  const DB_NAME = 'zovio-local-v1';
  const DB_VERSION = 1;
  const MEDIA_STORE = 'media';
  const CHAT_STORE = 'chats';
  const MAX_CACHED_MSGS_PER_CHAT = 300;

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    dbPromise = new Promise(resolve => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(MEDIA_STORE)) {
            const media = db.createObjectStore(MEDIA_STORE, { keyPath: 'fileId' });
            media.createIndex('chatId', 'chatId', { unique: false });
            media.createIndex('cachedAt', 'cachedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(CHAT_STORE)) {
            db.createObjectStore(CHAT_STORE, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }

  function runTx(storeName, mode, fn) {
    return open().then(db => {
      if (!db) return null;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          const req = fn(store);
          let result = null;
          if (req && typeof req === 'object' && 'onsuccess' in req) {
            req.onsuccess = () => { result = req.result; };
            req.onerror = () => resolve(null);
          }
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
  }

  async function putMedia(fileId, meta = {}) {
    if (!fileId || !meta.blob) return false;
    const blob = meta.blob instanceof Blob ? meta.blob : new Blob([meta.blob], { type: meta.mime || 'application/octet-stream' });
    const record = {
      fileId: String(fileId),
      uid: meta.uid || '',
      chatId: meta.chatId || '',
      mime: meta.mime || blob.type || 'application/octet-stream',
      name: meta.name || '',
      size: Number(meta.size || blob.size || 0),
      blob,
      cachedAt: Date.now()
    };
    const res = await runTx(MEDIA_STORE, 'readwrite', store => store.put(record));
    return res !== null || true;
  }

  async function getMedia(fileId) {
    if (!fileId) return null;
    const rec = await runTx(MEDIA_STORE, 'readonly', store => store.get(String(fileId)));
    return (rec && rec.blob) ? rec : null;
  }

  async function deleteMedia(fileId) {
    if (!fileId) return;
    await runTx(MEDIA_STORE, 'readwrite', store => store.delete(String(fileId)));
  }

  function sanitizeMsgForCache(m) {
    if (!m || !m.id) return null;
    return {
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      ts: m.ts,
      kind: m.kind,
      keyVersion: m.keyVersion,
      _plain: m._plain || undefined,
      body: m.body || undefined,
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
      live: m.live || undefined,
      viewers: m.viewers || undefined,
      deleted: !!m.deleted,
      deletedForEveryone: !!m.deletedForEveryone,
      editedAt: m.editedAt || undefined,
      forwardedFrom: m.forwardedFrom || undefined,
      isPinned: !!m.isPinned
    };
  }

  async function saveChatMessages(uid, chatId, messages) {
    if (!uid || !chatId || !Array.isArray(messages)) return;
    const key = `${uid}:${chatId}`;
    const trimmed = messages.slice(-MAX_CACHED_MSGS_PER_CHAT).map(sanitizeMsgForCache).filter(Boolean);
    await runTx(CHAT_STORE, 'readwrite', store => store.put({
      key,
      uid,
      chatId,
      messages: trimmed,
      updatedAt: Date.now()
    }));
  }

  async function getChatMessages(uid, chatId) {
    if (!uid || !chatId) return [];
    const rec = await runTx(CHAT_STORE, 'readonly', store => store.get(`${uid}:${chatId}`));
    return Array.isArray(rec?.messages) ? rec.messages : [];
  }

  async function getStats() {
    const db = await open();
    if (!db) return { supported: false, mediaCount: 0, totalBytes: 0, chatCount: 0 };
    return new Promise(resolve => {
      try {
        const tx = db.transaction([MEDIA_STORE, CHAT_STORE], 'readonly');
        const mediaReq = tx.objectStore(MEDIA_STORE).getAll();
        const chatReq = tx.objectStore(CHAT_STORE).count();
        let mediaCount = 0;
        let totalBytes = 0;
        let chatCount = 0;
        mediaReq.onsuccess = () => {
          const rows = Array.isArray(mediaReq.result) ? mediaReq.result : [];
          mediaCount = rows.length;
          for (const r of rows) totalBytes += Number(r?.size || r?.blob?.size || 0);
        };
        chatReq.onsuccess = () => { chatCount = Number(chatReq.result || 0); };
        tx.oncomplete = () => resolve({ supported: true, mediaCount, totalBytes, chatCount });
        tx.onerror = () => resolve({ supported: true, mediaCount: 0, totalBytes: 0, chatCount: 0 });
      } catch {
        resolve({ supported: false, mediaCount: 0, totalBytes: 0, chatCount: 0 });
      }
    });
  }

  async function clearAllMedia() {
    await runTx(MEDIA_STORE, 'readwrite', store => store.clear());
  }

  global.ZovioLocalDB = {
    open,
    putMedia,
    getMedia,
    deleteMedia,
    saveChatMessages,
    getChatMessages,
    getStats,
    clearAllMedia
  };
})(window);

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

let rustMedia = null;
let rustMediaLoadAttempted = false;
function findRustMediaPath() {
  const candidates = [
    path.join(__dirname, 'native', 'zovio_media.node'),
    path.join(__dirname, '..', '..', 'app.asar.unpacked', 'electron', 'native', 'zovio_media.node'),
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'native', 'zovio_media.node') : ''
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return '';
}

function getRustMedia() {
  if (rustMedia) return rustMedia;
  if (rustMediaLoadAttempted) return null;
  rustMediaLoadAttempted = true;
  const p = findRustMediaPath();
  if (!p) return null;
  try {
    const mod = require(p);
    if (mod && typeof mod.isNativeSupported === 'function' && mod.isNativeSupported()) {
      rustMedia = mod;
    }
  } catch (err) {
    console.warn('[Preload] Native media addon disabled on this PC:', err?.message || err);
  }
  return rustMedia;
}

const hasRustMediaFile = Boolean(findRustMediaPath());

let cachedMainPid = null;
function getMainPid() {
  if (cachedMainPid === null) {
    try {
      cachedMainPid = ipcRenderer.sendSync('get-main-pid');
    } catch {
      cachedMainPid = process.pid;
    }
  }
  return cachedMainPid;
}

contextBridge.exposeInMainWorld('fireuppNative', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  focusWindow: () => ipcRenderer.invoke('window-focus'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  retryMainLoad: () => ipcRenderer.invoke('retry-main-load'),
  relaunchSafeGraphics: (enableSafe = true) => ipcRenderer.invoke('relaunch-safe-graphics', Boolean(enableSafe)),

  // Windows Startup (Open at Login)
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
  setOpenAtLogin: (enable) => ipcRenderer.invoke('set-open-at-login', enable),

  // 1-Click In-App Updater
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  installNativeExeUpdate: (url) => ipcRenderer.invoke('install-native-exe-update', url),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (_, data) => callback(data));
  },

  // External browser opener (Chrome for OAuth)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Auth callback from deep link (fireupp://auth?data=...)
  onAuthCallback: (callback) => {
    ipcRenderer.on('desktop-auth-callback', (_, data) => callback(data));
  },

  // Discord-style native screen source picker & screen share power keeper
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  setScreenShareActive: (active) => ipcRenderer.invoke('set-screen-share-active', !!active),
  hasRustMediaEngine: hasRustMediaFile,
  startRustScreenShare: (opts = {}) => {
    const rm = getRustMedia();
    if (!rm || typeof rm.startCapture !== 'function') {
      return { ok: false, audioOk: false, width: 0, height: 0, error: 'Rust media addon unavailable on this system' };
    }
    try {
      return rm.startCapture({
        sourceId: String(opts.sourceId || 'screen:0:0'),
        maxWidth: Number(opts.maxWidth || 1280),
        maxHeight: Number(opts.maxHeight || 720),
        fps: Number(opts.fps || 30),
        shareAudio: opts.shareAudio !== false,
        excludePid: Number(getMainPid()),
        showCursor: opts.showCursor !== false
      });
    } catch (err) {
      return { ok: false, audioOk: false, width: 0, height: 0, error: err?.message || String(err) };
    }
  },
  stopRustScreenShare: () => {
    try {
      return Boolean(getRustMedia()?.stopCapture?.());
    } catch {
      return false;
    }
  },
  pollRustVideoFrame: (lastSeq) => {
    try {
      return getRustMedia()?.pollVideoFrame?.(lastSeq ?? undefined) || null;
    } catch {
      return null;
    }
  },
  pollRustAudioPcm: () => {
    try {
      return getRustMedia()?.pollAudioPcm?.() || null;
    } catch {
      return null;
    }
  },
  getRustCaptureStats: () => {
    try {
      return getRustMedia()?.getCaptureStats?.() || null;
    } catch {
      return null;
    }
  },
  onWindowVisibility: (callback) => {
    ipcRenderer.on('window-visibility-changed', (_, data) => callback(data));
  },

  // Native desktop notifications, Quick Reply & Call Banner
  notify: (opts) => ipcRenderer.invoke('send-notification', opts),
  showQuickReplyNotif: (opts) => ipcRenderer.invoke('show-quick-reply-notif', opts),
  showCallNotif: (opts) => ipcRenderer.invoke('show-call-notif', opts),
  closeCallNotif: () => ipcRenderer.invoke('close-call-notif'),
  respondCallNotif: (data) => ipcRenderer.invoke('respond-call-notif', data),
  submitQuickReply: (data) => ipcRenderer.invoke('submit-quick-reply', data),
  openNotifChat: (chatId) => ipcRenderer.invoke('open-notif-chat', chatId),
  closeQuickReplyNotif: () => ipcRenderer.invoke('close-quick-reply-notif'),
  notifyToastHover: (data) => ipcRenderer.invoke('toast-hover', data),
  onToastInit: (callback) => {
    ipcRenderer.on('toast-init', (_, data) => callback(data));
  },
  onNotificationReply: (callback) => {
    ipcRenderer.on('notification-reply', (_, data) => callback(data));
  },
  onNotificationOpenChat: (callback) => {
    ipcRenderer.on('notification-open-chat', (_, chatId) => callback(chatId));
  },
  onNotificationCallAction: (callback) => {
    ipcRenderer.on('notification-call-action', (_, data) => callback(data));
  },

  // Windows Explorer Share / SendTo & Deep Link Share Receiver
  onIncomingShare: (callback) => {
    ipcRenderer.on('desktop-incoming-share', (_, data) => callback(data));
  },
  consumePendingDesktopShare: () => ipcRenderer.invoke('consume-pending-desktop-share'),
  readShareFile: (filePath) => ipcRenderer.invoke('read-share-file', filePath),
  getWindowsShareStatus: () => ipcRenderer.invoke('get-windows-share-status'),
  registerWindowsShare: (enable = true, opts = {}) => ipcRenderer.invoke('register-windows-share', enable, opts),

  platform: process.platform,
  isElectron: true
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fireuppNative', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  focusWindow: () => ipcRenderer.invoke('window-focus'),
  quitApp: () => ipcRenderer.invoke('app-quit'),

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

  // Discord-style native screen source picker
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // Native desktop notifications & WhatsApp-style Quick Reply popup
  notify: (opts) => ipcRenderer.invoke('send-notification', opts),
  showQuickReplyNotif: (opts) => ipcRenderer.invoke('show-quick-reply-notif', opts),
  submitQuickReply: (data) => ipcRenderer.invoke('submit-quick-reply', data),
  openNotifChat: (chatId) => ipcRenderer.invoke('open-notif-chat', chatId),
  closeQuickReplyNotif: () => ipcRenderer.invoke('close-quick-reply-notif'),
  onNotificationReply: (callback) => {
    ipcRenderer.on('notification-reply', (_, data) => callback(data));
  },
  onNotificationOpenChat: (callback) => {
    ipcRenderer.on('notification-open-chat', (_, chatId) => callback(chatId));
  },

  platform: process.platform,
  isElectron: true
});

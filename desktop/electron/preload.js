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

  // External browser opener (Chrome for OAuth)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Auth callback from deep link (fireupp://auth?data=...)
  onAuthCallback: (callback) => {
    ipcRenderer.on('desktop-auth-callback', (_, data) => callback(data));
  },

  // Discord-style native screen source picker
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // Native desktop notifications
  notify: (opts) => ipcRenderer.invoke('send-notification', opts),

  platform: process.platform,
  isElectron: true
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fireuppNative', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Discord-style native screen source picker
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // Native desktop notifications
  notify: (opts) => ipcRenderer.invoke('send-notification', opts),

  platform: process.platform,
  isElectron: true
});

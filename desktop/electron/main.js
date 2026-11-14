const { app, BrowserWindow, ipcMain, desktopCapturer, Notification, shell, Tray, Menu, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

// Set Application Name & User Model ID for Windows Toast Notifications & Taskbar Grouping
app.setName('Zovio');
app.setAppUserModelId('com.zovio.desktop');

// Allow autoplay so WebRTC incoming audio/video calls play smoothly without waiting for user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Prevent Chromium from throttling audio processing, timers, and WebRTC threads when minimized or in background
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes');

let mainWindow = null;
let tray = null;
let pendingAuthData = null;
let pendingShareData = null;
const allowedSharePaths = new Set();
let isQuitting = false;
let screenShareBlockerId = null;

function guessShareMime(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
    '.zip': 'application/zip', '.7z': 'application/x-7z-compressed', '.rar': 'application/vnd.rar',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return map[ext] || 'application/octet-stream';
}

function extractIncomingShareFromArgs(argv = []) {
  if (!Array.isArray(argv) || !argv.length) return null;
  let sharedText = '';
  const files = [];
  const seen = new Set();

  for (let i = 0; i < argv.length; i++) {
    const raw = String(argv[i] || '').trim();
    if (!raw) continue;
    if (raw.startsWith('zovio://share') || raw.startsWith('fireupp://share')) {
      try {
        const u = new URL(raw);
        const t = u.searchParams.get('text') || '';
        const link = u.searchParams.get('url') || '';
        sharedText = [t, link].filter(Boolean).join('\n').trim();
        const fp = u.searchParams.get('file');
        if (fp) argv.push(fp);
      } catch {}
      continue;
    }
    if (raw === '--share-file' && argv[i + 1]) {
      const candidate = String(argv[++i] || '').trim();
      if (candidate) argv.push(candidate);
      continue;
    }
    if (i === 0 || raw.startsWith('-') || raw.startsWith('zovio://') || raw.startsWith('fireupp://')) continue;
    // Skip electron main.js script arg when running unpacked
    if (path.resolve(raw).toLowerCase() === path.resolve(__filename).toLowerCase()) continue;
    try {
      const resolved = path.resolve(raw);
      if (seen.has(resolved)) continue;
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const st = fs.statSync(resolved);
        seen.add(resolved);
        allowedSharePaths.add(resolved);
        files.push({
          name: path.basename(resolved),
          mime: guessShareMime(resolved),
          size: st.size,
          nativePath: resolved
        });
      }
    } catch {}
  }

  if (!sharedText && !files.length) return null;
  return { text: sharedText, files: files.slice(0, 10) };
}

function deliverIncomingShare(sharePayload) {
  if (!sharePayload) return;
  pendingShareData = sharePayload;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isLoadingMainFrame()) {
    mainWindow.webContents.send('desktop-incoming-share', sharePayload);
  }
}

// Ensure single instance lock for deep-linking & Windows Share arguments
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const coldShare = extractIncomingShareFromArgs(process.argv);
  if (coldShare) pendingShareData = coldShare;

  // Register custom protocols: zovio:// and fireupp://
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('zovio', process.execPath, [path.resolve(process.argv[1])]);
      app.setAsDefaultProtocolClient('fireupp', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('zovio');
    app.setAsDefaultProtocolClient('fireupp');
  }

  // Handle second instance (deep-links or Windows Explorer Share / SendTo)
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();

      const shareArgUrl = commandLine.find(arg => arg.startsWith('zovio://share') || arg.startsWith('fireupp://share'));
      const incomingShare = extractIncomingShareFromArgs(commandLine);
      if (incomingShare) {
        deliverIncomingShare(incomingShare);
      }
      if (!shareArgUrl) {
        const deepLinkUrl = commandLine.find(arg => arg.startsWith('zovio://') || arg.startsWith('fireupp://'));
        if (deepLinkUrl) {
          handleAuthProtocolUrl(deepLinkUrl);
        }
      }
    }
  });
}

function handleAuthProtocolUrl(rawUrl) {
  if (!rawUrl || (!rawUrl.startsWith('zovio://') && !rawUrl.startsWith('fireupp://'))) return;
  try {
    const url = new URL(rawUrl);
    let payload = null;
    const dataParam = url.searchParams.get('data');
    if (dataParam) {
      payload = JSON.parse(decodeURIComponent(dataParam));
    } else {
      payload = {
        token: url.searchParams.get('token'),
        email: url.searchParams.get('email'),
        name: url.searchParams.get('name'),
        uid: url.searchParams.get('uid'),
        avatar: url.searchParams.get('avatar')
      };
    }

    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('desktop-auth-callback', payload);
    } else {
      pendingAuthData = payload;
    }
  } catch (err) {
    console.error('[Electron] Deep link parse error:', err, rawUrl);
  }
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '../public/icon.ico');
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    console.warn('[Electron] Tray icon fallback:', err);
    try {
      tray = new Tray(path.join(__dirname, '../public/icon.png'));
    } catch (e) {
      console.error('[Electron] Could not create tray icon:', e);
      return;
    }
  }

  const updateContextMenu = () => {
    const isOpenAtLogin = app.getLoginItemSettings().openAtLogin;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Zovio',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Launch on Windows Startup',
        type: 'checkbox',
        checked: isOpenAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
          updateContextMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Zovio',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  };

  tray.setToolTip('Zovio — Encrypted Messenger');
  updateContextMenu();

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Zovio',
    width: 1300,
    height: 840,
    minWidth: 980,
    minHeight: 660,
    frame: false, // Frameless native window
    backgroundColor: '#0c0d14',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false
    },
    show: false
  });

  // Enable open at login by default for convenient desktop messaging experience
  try {
    const loginSettings = app.getLoginItemSettings();
    if (loginSettings && !loginSettings.wasOpenedAtLogin && loginSettings.openAtLogin === false) {
      // Keep existing user preference if explicitly disabled
    } else {
      app.setLoginItemSettings({ openAtLogin: true });
    }
  } catch {}

  // Set native desktop identification User-Agent
  const defaultUa = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(`${defaultUa} ZovioDesktop/1.0.83 FireuppDesktop/1.0.83`);

  // Clear stale HTTP cache on startup so the latest deployed app bundle is always loaded
  mainWindow.webContents.session.clearCache().finally(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('https://zovio.up.railway.app');
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    createTray();

    // Deliver pending deep-link auth payload if launched from cold start
    if (pendingAuthData && mainWindow.webContents) {
      mainWindow.webContents.send('desktop-auth-callback', pendingAuthData);
      pendingAuthData = null;
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingShareData && mainWindow && !mainWindow.isDestroyed()) {
      const payload = pendingShareData;
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('desktop-incoming-share', payload);
        }
      }, 600);
    }
  });

  // Minimize to tray on close button
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      try { mainWindow.webContents.send('window-visibility-changed', { visible: false }); } catch {}
      return false;
    }
  });

  mainWindow.on('hide', () => {
    try { mainWindow?.webContents.send('window-visibility-changed', { visible: false }); } catch {}
  });
  mainWindow.on('minimize', () => {
    try { mainWindow?.webContents.send('window-visibility-changed', { visible: false }); } catch {}
  });
  mainWindow.on('show', () => {
    try { mainWindow?.webContents.send('window-visibility-changed', { visible: true }); } catch {}
  });
  mainWindow.on('restore', () => {
    try { mainWindow?.webContents.send('window-visibility-changed', { visible: true }); } catch {}
  });
  mainWindow.on('focus', () => {
    try { mainWindow?.webContents.send('window-visibility-changed', { visible: true }); } catch {}
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links vs in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Inject window dragging CSS for frameless desktop titlebar
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      #desktopTitlebar, [data-tauri-drag-region] {
        -webkit-app-region: drag !important;
      }
      .titlebar-controls, .titlebar-btn, button, input, select, textarea, a, .clickable {
        -webkit-app-region: no-drag !important;
      }
    `).catch(() => {});
  });
}

// Check cold-start argv for protocol URL
const coldStartArg = process.argv.find(arg => arg.startsWith('zovio://') || arg.startsWith('fireupp://'));
if (coldStartArg) {
  handleAuthProtocolUrl(coldStartArg);
}

// ---------------- Native Window Controls IPC ----------------
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  // Window close in titlebar minimizes to tray for background notifications
  if (mainWindow) {
    mainWindow.hide();
    try { mainWindow.webContents.send('window-visibility-changed', { visible: false }); } catch {}
  }
});

ipcMain.on('get-main-pid', (event) => {
  event.returnValue = process.pid;
});

ipcMain.handle('set-screen-share-active', (_, active) => {
  try {
    if (active) {
      if (screenShareBlockerId === null || !powerSaveBlocker.isStarted(screenShareBlockerId)) {
        screenShareBlockerId = powerSaveBlocker.start('prevent-display-sleep');
      }
    } else if (screenShareBlockerId !== null) {
      if (powerSaveBlocker.isStarted(screenShareBlockerId)) {
        powerSaveBlocker.stop(screenShareBlockerId);
      }
      screenShareBlockerId = null;
    }
  } catch {}
});

ipcMain.handle('window-focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('app-quit', () => {
  isQuitting = true;
  app.quit();
});

// ---------------- Auto-Launch on Windows Startup IPC ----------------
ipcMain.handle('get-open-at-login', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-open-at-login', (_, enable) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enable) });
  return app.getLoginItemSettings().openAtLogin;
});

// ---------------- In-App 1-Click Update Installer IPC ----------------
ipcMain.handle('install-app-update', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  try {
    await mainWindow.webContents.session.clearCache();
    await mainWindow.webContents.session.clearStorageData({
      storages: ['appcache', 'cachestorage', 'serviceworkers']
    });
    mainWindow.webContents.reloadIgnoringCache();
    return { ok: true };
  } catch (err) {
    console.error('[Electron] install-app-update error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reloadIgnoringCache();
    }
    return { ok: true };
  }
});

ipcMain.handle('install-native-exe-update', async (_, downloadUrl) => {
  const targetUrl = downloadUrl || 'https://zovio.up.railway.app/download/Zovio_Setup.exe?v=' + Date.now();
  const destPath = path.join(os.tmpdir(), `Zovio_Setup_Update_${Date.now()}.exe`);

  return new Promise((resolve) => {
    const downloadFile = (url, redirects = 0) => {
      if (redirects > 5) {
        return resolve({ ok: false, error: 'Too many redirects' });
      }
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return downloadFile(nextUrl, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0 && mainWindow && !mainWindow.isDestroyed()) {
            const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            mainWindow.webContents.send('update-download-progress', {
              percent: pct,
              receivedBytes,
              totalBytes
            });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-download-progress', {
                percent: 100,
                receivedBytes: totalBytes,
                totalBytes
              });
            }
            try {
              const child = spawn(destPath, ['/S'], {
                detached: true,
                stdio: 'ignore'
              });
              child.unref();
              resolve({ ok: true });
              setTimeout(() => {
                isQuitting = true;
                app.quit();
              }, 800);
            } catch (spawnErr) {
              shell.openPath(destPath);
              resolve({ ok: true });
            }
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          resolve({ ok: false, error: err.message });
        });
      }).on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    };

    downloadFile(targetUrl);
  });
});

// ---------------- Browser Opening for OAuth ----------------
ipcMain.handle('open-external', (_, url) => {
  if (url) shell.openExternal(url);
});

// ---------------- Discord-Style Screen Capture API ----------------
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 480, height: 270 },
      fetchWindowIcons: true
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      display_id: source.display_id,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (err) {
    console.error('[Electron] desktopCapturer error:', err);
    return [];
  }
});

// ---------------- Native Desktop Notifications, Quick Reply & Call Banner ----------------
let quickReplyWin = null;
let quickReplyTimer = null;
let quickReplyHovered = false;
let callNotifWin = null;
let callNotifTimer = null;
let activeCallNotifKey = '';

function getToastWorkArea() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return screen.getDisplayMatching(mainWindow.getBounds()).workArea;
    }
  } catch {}
  return screen.getPrimaryDisplay().workArea;
}

function positionToastWin(win, width, height, stackBottomOffset = 0) {
  if (!win || win.isDestroyed()) return;
  const wa = getToastWorkArea();
  const x = Math.round(wa.x + wa.width - width - 16);
  const y = Math.round(wa.y + wa.height - height - 16 - stackBottomOffset);
  win.setBounds({ x, y, width, height });
}

function createToastWin(width, height, initPayload, stackBottomOffset = 0) {
  const wa = getToastWorkArea();
  const x = Math.round(wa.x + wa.width - width - 16);
  const y = Math.round(wa.y + wa.height - height - 16 - stackBottomOffset);
  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });
  try {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {}
  win.loadFile(path.join(__dirname, 'toast.html'));
  win.webContents.once('did-finish-load', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('toast-init', initPayload);
    }
  });
  win.once('ready-to-show', () => {
    if (win && !win.isDestroyed()) win.showInactive();
  });
  return win;
}

function closeQuickReplyPopup() {
  quickReplyHovered = false;
  if (quickReplyTimer) {
    clearTimeout(quickReplyTimer);
    quickReplyTimer = null;
  }
  if (quickReplyWin && !quickReplyWin.isDestroyed()) {
    try { quickReplyWin.close(); } catch {}
  }
  quickReplyWin = null;
}

function scheduleQuickReplyClose(ms = 8500) {
  if (quickReplyTimer) {
    clearTimeout(quickReplyTimer);
    quickReplyTimer = null;
  }
  if (quickReplyHovered) return;
  quickReplyTimer = setTimeout(() => {
    if (!quickReplyHovered) closeQuickReplyPopup();
  }, ms);
}

function closeCallNotifPopup() {
  activeCallNotifKey = '';
  if (callNotifTimer) {
    clearTimeout(callNotifTimer);
    callNotifTimer = null;
  }
  if (callNotifWin && !callNotifWin.isDestroyed()) {
    try { callNotifWin.close(); } catch {}
  }
  callNotifWin = null;
}

function focusMainWin() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  }
}

ipcMain.handle('close-quick-reply-notif', () => {
  closeQuickReplyPopup();
});

ipcMain.handle('close-call-notif', () => {
  closeCallNotifPopup();
});

ipcMain.handle('toast-hover', (_, { kind, hovered }) => {
  if (kind !== 'call') {
    quickReplyHovered = Boolean(hovered);
    if (quickReplyHovered) {
      if (quickReplyTimer) { clearTimeout(quickReplyTimer); quickReplyTimer = null; }
    } else if (quickReplyWin && !quickReplyWin.isDestroyed() && !quickReplyWin.isFocused()) {
      scheduleQuickReplyClose(4500);
    }
  }
});

ipcMain.handle('submit-quick-reply', (_, data) => {
  if (mainWindow && !mainWindow.isDestroyed() && data?.chatId && data?.text) {
    mainWindow.webContents.send('notification-reply', {
      chatId: String(data.chatId),
      text: String(data.text)
    });
  }
  setTimeout(() => closeQuickReplyPopup(), 260);
});

ipcMain.handle('open-notif-chat', (_, chatId) => {
  closeQuickReplyPopup();
  focusMainWin();
  if (mainWindow && !mainWindow.isDestroyed() && chatId) {
    mainWindow.webContents.send('notification-open-chat', String(chatId));
  }
});

ipcMain.handle('respond-call-notif', (_, { action, callData }) => {
  closeCallNotifPopup();
  if (action === 'accept') focusMainWin();
  if (mainWindow && !mainWindow.isDestroyed() && callData) {
    mainWindow.webContents.send('notification-call-action', {
      action: action === 'accept' ? 'accept' : 'decline',
      callData
    });
  }
});

ipcMain.handle('show-call-notif', (_, { title, body, callData }) => {
  try {
    const key = String(callData?.callId || callData?.code || '');
    if (key && activeCallNotifKey === key && callNotifWin && !callNotifWin.isDestroyed()) {
      return;
    }
    closeCallNotifPopup();
    activeCallNotifKey = key;
    const payload = {
      kind: 'call',
      title: String(title || 'Incoming Call'),
      body: String(body || 'Incoming Call — Answer or Decline'),
      callData: callData || {}
    };
    callNotifWin = createToastWin(384, 158, payload, 0);
    if (quickReplyWin && !quickReplyWin.isDestroyed()) {
      positionToastWin(quickReplyWin, 384, 166, 168);
    }
    callNotifWin.on('closed', () => {
      activeCallNotifKey = '';
      callNotifWin = null;
      if (quickReplyWin && !quickReplyWin.isDestroyed()) {
        positionToastWin(quickReplyWin, 384, 166, 0);
      }
    });
    callNotifTimer = setTimeout(() => closeCallNotifPopup(), 45000);
  } catch (err) {
    console.warn('Call notif error:', err);
  }
});

ipcMain.handle('show-quick-reply-notif', (_, { chatId, title, body }) => {
  try {
    const payload = {
      kind: 'quick-reply',
      chatId: String(chatId || ''),
      title: String(title || 'Zovio'),
      body: String(body || 'New message'),
      allowReply: Boolean(chatId)
    };
    const stackOffset = callNotifWin && !callNotifWin.isDestroyed() ? 168 : 0;

    if (quickReplyWin && !quickReplyWin.isDestroyed()) {
      quickReplyWin.webContents.send('toast-init', payload);
      positionToastWin(quickReplyWin, 384, 166, stackOffset);
      if (!quickReplyWin.isFocused()) scheduleQuickReplyClose(8500);
      return;
    }

    quickReplyWin = createToastWin(384, 166, payload, stackOffset);
    quickReplyWin.on('focus', () => {
      if (quickReplyTimer) { clearTimeout(quickReplyTimer); quickReplyTimer = null; }
    });
    quickReplyWin.on('blur', () => {
      if (!quickReplyHovered) scheduleQuickReplyClose(4000);
    });
    quickReplyWin.on('closed', () => {
      quickReplyWin = null;
      quickReplyHovered = false;
      if (quickReplyTimer) { clearTimeout(quickReplyTimer); quickReplyTimer = null; }
    });
    scheduleQuickReplyClose(8500);
  } catch (err) {
    console.warn('Quick reply notif error:', err);
  }
});

ipcMain.handle('send-notification', (_, { title, body, icon }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || 'Zovio',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/icon.png')
    });
    notif.on('click', () => {
      focusMainWin();
    });
    notif.show();
  }
});

// ---------------- Windows Share Integration (SendTo + Context Menu + Share Intake) ----------------
function getWindowsSharePaths() {
  const sendToDir = app.getPath('appData')
    ? path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'SendTo')
    : '';
  return {
    sendToLink: sendToDir ? path.join(sendToDir, 'Zovio.lnk') : '',
    regKey: 'HKCU\\Software\\Classes\\*\\shell\\ZovioShare'
  };
}

function runRegCommand(args) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ ok: false, stdout: '' });
    try {
      const child = spawn('reg.exe', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      let out = '';
      child.stdout.on('data', d => { out += d.toString('utf8'); });
      child.on('exit', (code) => resolve({ ok: code === 0, stdout: out }));
      child.on('error', () => resolve({ ok: false, stdout: '' }));
    } catch {
      resolve({ ok: false, stdout: '' });
    }
  });
}

async function configureWindowsShareIntegration(enable = true) {
  if (process.platform !== 'win32') return { supported: false, enabled: false };
  const { sendToLink, regKey } = getWindowsSharePaths();
  // Avoid writing broken packaged args in electron dev binary if unpackaged
  const targetExe = process.execPath;
  const baseArgs = process.defaultApp && process.argv[1]
    ? `"${path.resolve(process.argv[1])}" --share-file`
    : '--share-file';

  if (enable) {
    try {
      if (sendToLink) {
        shell.writeShortcutLink(sendToLink, 'create', {
          target: targetExe,
          args: baseArgs,
          description: 'Share files directly with Zovio',
          icon: targetExe,
          iconIndex: 0,
          appUserModelId: 'com.zovio.desktop'
        });
      }
    } catch {}
    const cmdVal = process.defaultApp && process.argv[1]
      ? `"${targetExe}" "${path.resolve(process.argv[1])}" --share-file "%1"`
      : `"${targetExe}" --share-file "%1"`;
    await runRegCommand(['add', regKey, '/ve', '/d', 'Share with Zovio', '/f']);
    await runRegCommand(['add', regKey, '/v', 'Icon', '/d', `${targetExe},0`, '/f']);
    await runRegCommand(['add', `${regKey}\\command`, '/ve', '/d', cmdVal, '/f']);
    return { supported: true, enabled: true, sendTo: fs.existsSync(sendToLink) };
  } else {
    try {
      if (sendToLink && fs.existsSync(sendToLink)) fs.unlinkSync(sendToLink);
    } catch {}
    await runRegCommand(['delete', regKey, '/f']);
    return { supported: true, enabled: false, sendTo: false };
  }
}

ipcMain.handle('get-windows-share-status', async () => {
  if (process.platform !== 'win32') return { supported: false, enabled: false };
  const { sendToLink, regKey } = getWindowsSharePaths();
  const hasSendTo = Boolean(sendToLink && fs.existsSync(sendToLink));
  const regRes = await runRegCommand(['query', `${regKey}\\command`]);
  return {
    supported: true,
    enabled: hasSendTo || regRes.ok,
    sendTo: hasSendTo,
    contextMenu: regRes.ok
  };
});

ipcMain.handle('register-windows-share', async (_, enable = true) => {
  return await configureWindowsShareIntegration(Boolean(enable));
});

ipcMain.handle('consume-pending-desktop-share', () => {
  const data = pendingShareData;
  pendingShareData = null;
  return data;
});

ipcMain.handle('read-share-file', async (_, filePath) => {
  try {
    const resolved = path.resolve(String(filePath || ''));
    if (!allowedSharePaths.has(resolved) || !fs.existsSync(resolved)) {
      return { ok: false, error: 'Shared file unavailable or unauthorized' };
    }
    const stat = fs.statSync(resolved);
    if (stat.size > 50 * 1024 * 1024) {
      return { ok: false, error: 'Shared file exceeds 50 MB limit' };
    }
    const buf = await fs.promises.readFile(resolved);
    return {
      ok: true,
      name: path.basename(resolved),
      mime: guessShareMime(resolved),
      size: stat.size,
      base64: buf.toString('base64')
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to read shared file' };
  }
});

app.whenReady().then(() => {
  try {
    powerSaveBlocker.start('prevent-app-suspension');
  } catch {}
  if (process.platform === 'win32' && !process.defaultApp) {
    configureWindowsShareIntegration(true).catch(() => {});
  }
  createWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // If not quitting explicitly, keep alive in system tray
    if (isQuitting) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else {
    mainWindow.show();
    mainWindow.focus();
  }
});

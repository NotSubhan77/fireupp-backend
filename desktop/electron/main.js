const { app, BrowserWindow, ipcMain, desktopCapturer, Notification, shell, Tray, Menu, powerSaveBlocker } = require('electron');
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
let isQuitting = false;

// Ensure single instance lock for deep-linking (zovio://auth?data=... or fireupp://auth?data=...)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
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

  // Handle second instance (when Chrome or another app triggers zovio:// or fireupp://)
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();

      const deepLinkUrl = commandLine.find(arg => arg.startsWith('zovio://') || arg.startsWith('fireupp://'));
      if (deepLinkUrl) {
        handleAuthProtocolUrl(deepLinkUrl);
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
  mainWindow.webContents.setUserAgent(`${defaultUa} ZovioDesktop/1.0.7 FireuppDesktop/1.0.7`);

  // Clear stale HTTP cache on startup so the latest deployed app bundle is always loaded
  mainWindow.webContents.session.clearCache().finally(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('https://fireupp.up.railway.app');
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

  // Minimize to tray on close button
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
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
  if (mainWindow) mainWindow.hide();
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
  const targetUrl = downloadUrl || 'https://fireupp.up.railway.app/download/Zovio_Setup.exe?v=' + Date.now();
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

// ---------------- Native Desktop Notifications ----------------
ipcMain.handle('send-notification', (_, { title, body, icon }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || 'Zovio',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/icon.png')
    });
    notif.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    });
    notif.show();
  }
});

app.whenReady().then(() => {
  try {
    powerSaveBlocker.start('prevent-app-suspension');
  } catch {}
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

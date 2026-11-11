const { app, BrowserWindow, ipcMain, desktopCapturer, Notification, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let pendingAuthData = null;

// Ensure single instance lock for deep-linking (fireupp://auth?data=...)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Register custom protocol: fireupp://
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('fireupp', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('fireupp');
  }

  // Handle second instance (when Chrome or another app triggers fireupp://)
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const deepLinkUrl = commandLine.find(arg => arg.startsWith('fireupp://'));
      if (deepLinkUrl) {
        handleAuthProtocolUrl(deepLinkUrl);
      }
    }
  });
}

function handleAuthProtocolUrl(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith('fireupp://')) return;
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

function createWindow() {
  mainWindow = new BrowserWindow({
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
      webSecurity: true
    },
    show: false
  });

  // Load the web application
  mainWindow.loadURL('https://fireupp.up.railway.app');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Deliver pending deep-link auth payload if launched from cold start
    if (pendingAuthData && mainWindow.webContents) {
      mainWindow.webContents.send('desktop-auth-callback', pendingAuthData);
      pendingAuthData = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links vs in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open in external default browser (Chrome)
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
const coldStartArg = process.argv.find(arg => arg.startsWith('fireupp://'));
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
  if (mainWindow) mainWindow.close();
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
    new Notification({
      title: title || 'Fireupp',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/icon.png')
    }).show();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

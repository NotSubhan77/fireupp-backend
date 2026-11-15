const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DESKTOP_DIR = path.join(ROOT, 'desktop');
const mode = process.argv[2] || 'all';
const port = String(process.env.STAGING_PORT || process.env.PORT || 3001);
const serverUrl = process.env.ZOVIO_SERVER_URL || `http://localhost:${port}`;

function stagingServerEnv() {
  return {
    ...process.env,
    PORT: port,
    ZOVIO_LOCAL_ONLY: '1',
    DATA_DIR: path.join(ROOT, 'data-staging'),
    UPLOAD_DIR: path.join(ROOT, 'uploads-staging')
  };
}

function startServer() {
  console.log(`[staging] Starting isolated Zovio test server on ${serverUrl} (ZOVIO_LOCAL_ONLY=1)`);
  return spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    cwd: ROOT,
    env: stagingServerEnv(),
    stdio: 'inherit'
  });
}

function getElectronBinary() {
  const binName = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  const localBin = path.join(DESKTOP_DIR, 'node_modules', '.bin', binName);
  return localBin;
}

function startDesktop() {
  console.log(`[staging] Launching Zovio [Staging] desktop window -> ${serverUrl}`);
  const bin = getElectronBinary();
  return spawn(bin, ['.', '--staging', `--server-url=${serverUrl}`], {
    cwd: DESKTOP_DIR,
    env: {
      ...process.env,
      ZOVIO_STAGING: '1',
      ZOVIO_SERVER_URL: serverUrl
    },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}

function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const ping = () => {
      http.get(`${url}/api/app/version`, (res) => {
        res.resume();
        resolve(true);
      }).on('error', () => {
        if (Date.now() > deadline) return resolve(false);
        setTimeout(ping, 250);
      });
    };
    ping();
  });
}

(async () => {
  if (mode === 'server') {
    const srv = startServer();
    srv.on('exit', code => process.exit(code ?? 0));
    return;
  }

  if (mode === 'desktop') {
    const desk = startDesktop();
    desk.on('exit', code => process.exit(code ?? 0));
    return;
  }

  const srv = startServer();
  let desk = null;
  const shutdown = () => {
    try { desk?.kill(); } catch {}
    try { srv?.kill(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await waitForServer(serverUrl);
  desk = startDesktop();
  desk.on('exit', () => shutdown());
  srv.on('exit', (code) => {
    if (code) console.warn(`[staging] Server exited with code ${code}`);
  });
})();

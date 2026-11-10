# Fireupp Desktop (Native Windows App in Rust)

A native Windows desktop communication suite powered by **Rust** and **Tauri 2.0**.

## Project Architecture

* **`src-tauri/`**: Native Rust application core (`Cargo.toml`, `tauri.conf.json`).
  * `src/main.rs`: Windows executable entry point.
  * `src/lib.rs`: Rust lifecycle manager, background server runner, and native Windows System Tray integration.
* **`public/`**: Frontend assets (HTML, CSS, JS, audio, avatars, canvas whiteboard).
* **`data/`**: Firebase persistent cache (`firebase_cache.json`).
* **`server.js`**: Background WebSocket & WebRTC signaling server.

## Running the App

### Option A: Run via NPM
```powershell
npm run tauri:dev
```

### Option B: Build Standalone Windows Installer (`.exe` / `.msi`)
```powershell
npm run tauri:build
```

The compiled binary will be placed at:
`src-tauri/target/release/Fireupp.exe`

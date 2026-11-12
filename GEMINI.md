# Zovio Workspace Rules

## Always Bump the App Version on Every New Update
Whenever you publish, commit, or push a user-facing change or fix to the app:

1. Increment the patch version (`1.0.X` -> `1.0.(X+1)`) across all version locations:
   - `server.js` (`CURRENT_APP_VERSION` and fallback `'zovio-v...'` in `computeAppBuildHash()`)
   - `public/js/core.js` (fallback version strings passed to `showInAppUpdatePrompt`, `installInAppUpdate`, and update toast messages)
   - `public/download.html` (all `/download/Zovio_Setup.exe?v=...` query params and the `Version ... Setup Installer` text)
   - `desktop/package.json` (`"version"`)
2. If changes also modify desktop native code (`desktop/native/**`), Electron main/preload (`desktop/electron/**`), or `desktop/src/**`, rebuild the Windows installer (`public/downloads/Zovio_Setup.exe`) using the new version and update the file size note in `public/download.html` if it changed. If changes are purely web assets (`public/`, `server.js`), no `.exe` rebuild is needed because Zovio loads web assets live and triggers the in-app update banner from `/api/app/version` (`version` + `buildHash`).

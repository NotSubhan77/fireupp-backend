# ⚡ Zovio — Encrypted Cross-Platform Messaging, Calls & Collaborative Suite

<div align="center">

[![Android](https://img.shields.io/badge/Platform-Android%208.0%2B-10b981?style=for-the-badge&logo=android&logoColor=white)](https://fireupp.up.railway.app/download/Zovio.apk)
[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://fireupp.up.railway.app/download/Zovio_Setup.exe)
[![Version](https://img.shields.io/badge/Release-v1.0.54-ff5722?style=for-the-badge)](https://github.com/NotSubhan77/fireupp-backend/releases)
[![GitHub Stars](https://img.shields.io/github/stars/NotSubhan77/fireupp-backend?style=for-the-badge&logo=github&color=ffb703)](https://github.com/NotSubhan77/fireupp-backend)

**End-to-End Encrypted Chats &bull; HD WebRTC Calls &amp; Android PiP &bull; QR Phone-to-PC WiFi Sync &bull; Instagram-Style 24h Status &bull; Interactive Whiteboard &amp; Workspaces**

[🌐 Download Landing Page](https://fireupp.up.railway.app) &bull; [📱 Download Android APK](https://fireupp.up.railway.app/download/Zovio.apk) &bull; [🖥️ Download Windows .exe](https://fireupp.up.railway.app/download/Zovio_Setup.exe) &bull; [⭐ Star on GitHub](https://github.com/NotSubhan77/fireupp-backend)

</div>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Core Architecture: Phone-First & WiFi Sync](#-core-architecture-phone-first--wifi-sync)
- [Core Features & Modules](#-core-features--modules)
  - [ZovioChats](#-zoviochats-end-to-end-encrypted-messaging)
  - [ZovioCalls & Unified Meet](#-zoviocalls--android-pip-calling)
  - [Native Screen Sharing](#-native-screen-sharing)
  - [ZovioStatus (24h Stories)](#-zoviostatus-instagram-style-24h-stories)
  - [ZovioCasts (Broadcast Channels)](#-zoviocasts-broadcast-channels)
  - [ZovioSpace (Whiteboard, Kanban, Calendar & Notes)](#-zoviospace-workspace--interactive-whiteboard)
- [How to Download & Pair Devices](#-how-to-download--pair-devices)
- [Developer Guide: Backend, Desktop & Android Builds](#-developer-guide-backend-desktop--android-builds)
- [Feedback & Contributing](#-feedback--contributing)

---

## 🌟 Overview

**Zovio** is a privacy-first encrypted communication and workspace suite engineered natively for **Android (Capacitor + Kotlin native services)** and **Windows Desktop (Electron + Rust native media addon)**. Every message, voice note, call stream, file upload, and private vault is protected end-to-end by client-side cryptography (`ECDH P-256` + `AES-256-GCM`).

---

## 📱 Core Architecture: Phone-First & WiFi Sync

- **Android Phone = Primary Device**: Sign in on Android with Google OAuth; your identity keys and chat vault live primarily on your phone.
- **Instant QR Pairing for Windows**: Open Zovio on Windows to display an ephemeral QR code (`ECDH P-256`), scan it with your Android camera inside **Settings → Linked Devices**, and your E2EE session & keys transfer securely.
- **Local WiFi P2P History Sync**: When your phone and Windows desktop are on the same local WiFi network, history and media sync over LAN WebSocket with minimal cloud overhead.
- **Remote Unlink**: Unlink any connected Windows session directly from your phone — the linked desktop immediately locks back to the QR login screen.

---

## 🚀 Core Features & Modules

### 💬 ZovioChats (End-to-End Encrypted Messaging)
- **Zero-Knowledge Cryptography**: `AES-256-GCM` message encryption with `ECDH P-256` session keys.
- **Rich Text & Mobile Keyboard Support**: Inline Bold, Italic, Strikethrough, Code, and auto-bullet lists alongside full Gboard emoji, sticker, GIF, and voice-typing support.
- **Clean Voice Notes & Circular Upload Progress**: Waveform audio messages with speed controls (`1x / 1.5x / 2x`), plus WhatsApp-style circular progress indicators and retry buttons on file/media uploads up to 2GB.
- **In-Chat Search & Message Actions**: Reply, edit within 15 minutes, pin messages, star important items, translate messages on the fly, and search full chat history (from header on desktop or `(i)` Info drawer on mobile).

### 📞 ZovioCalls & Android PiP Calling
- **1-on-1 & Room Meetings**: Direct voice/video calling plus instant meet codes (`call-xxxx-yyyy`) and scheduled meetings.
- **Opus FEC + Hybrid WebRTC Relay**: High-clarity voice with Opus Forward Error Correction (`useinbandfec=1`), online/ringing awareness, single unified audio output selector, and automatic binary WebSocket relay fallback behind strict NATs.
- **Native Android Foreground & PiP Support**: Back-gesture / Home navigation automatically collapses active calls into an interactive **Android Picture-in-Picture** / floating mini overlay rather than dropping the call, backed by `ZovioCallService` + Android wake locks and native push notifications (`FCM` / WebSocket alarm channel).

### 🖥️ Native Screen Sharing
- **Windows App/Window Selector**: Share your full display or specific application windows at up to **60 FPS** with system audio.
- **Android MediaProjection**: Stream live mobile screen content cleanly inside active calls.

### ⭕ ZovioStatus (Instagram-Style 24h Stories)
- **Full-Screen Story Creator**: Capture live camera snaps, record video stories, or style multi-slide gradient text cards.
- **Pinch Gestures & Direct Editing**: Two-finger pinch-to-resize on text, stickers, mentions, locations, and photo cutouts; tap directly to edit text styling without cluttered toolbars.
- **Granular Privacy Controls**: Share with *My Friends*, *Friends Except*, or *Only Share With*.

### 📢 ZovioCasts (Broadcast Channels)
- Create public or private broadcast channels with unique handles (`@handle`), custom avatars, admin posting controls, and unlimited followers.

### 📁 ZovioSpace (Workspace & Interactive Whiteboard)
- **Mobile-First Interactive Whiteboard**: Full-viewport touch canvas with slide-out Saved Boards drawer, SVG tool dock (`Select`, `Pen`, `Marker`, Shapes, `Chart`, `Sticky Note`, `Text`, `Eraser`), live WYSIWYG text editor (fonts, colors, highlights, bold/italic/underline), and PNG export.
- **Tasks, Calendar, Notes & Vault**: Kanban/list task manager, Day/Week/Month/Year Calendar views, Markdown Notes, and chunked E2EE cloud Vault storage.

---

## 📥 How to Download & Pair Devices

### 1. Android (Primary Device)
1. Download **`Zovio.apk`** from the landing page:
   👉 **[Download Zovio.apk](https://fireupp.up.railway.app/download/Zovio.apk)**
2. Install the APK on Android 8.0+ (allow installing unknown apps if prompted).
3. Launch **Zovio** and sign in with your Google Account.

### 2. Windows 10 & 11 (Companion Desktop)
1. Download **`Zovio_Setup.exe`**:
   👉 **[Download Zovio_Setup.exe](https://fireupp.up.railway.app/download/Zovio_Setup.exe)**
2. Run the installer and open **Zovio**.
3. On your Android phone, open **Settings → Linked Devices → Link a Device (Scan QR)** and scan the QR code shown on Windows.

---

## 🛠️ Developer Guide: Backend, Desktop & Android Builds

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ / v20+
- [Git](https://git-scm.com/)
- For Android APK builds: Android SDK + JDK 17 (`mobile/android`)
- For Desktop native media builds: Rust / Cargo (`desktop/native/zovio-media`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/NotSubhan77/fireupp-backend.git
cd fireupp-backend

# Root backend dependencies
npm install

# Desktop client dependencies
cd desktop && npm install && cd ..

# Mobile Capacitor dependencies
cd mobile && npm install && cd ..
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
SESSION_SECRET=your_super_secret_session_key
FIREBASE_PROJECT_ID=fireupp-d5c92
FIREBASE_DATABASE_ID=fireupp-db
FIREBASE_CLIENT_EMAIL=your-service-account@fireupp-d5c92.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Run Locally & Build Clients
```bash
# Start backend server (http://localhost:3000)
node server.js

# Run Windows desktop client in dev mode
cd desktop && npm run electron:dev

# Build Windows installer (.exe)
cd desktop && npm run electron:build

# Sync & build Android APK
cd mobile && npx cap sync android && cd android && ./gradlew assembleDebug
```

---

## 🔄 Over-the-Air Cloud Updates
Both Zovio Windows and Zovio Android load live web assets from `https://fireupp.up.railway.app` paired with `/api/app/version` build-hash checks (`v1.0.54`). Every deployment immediately notifies active clients and applies UI/feature updates seamlessly.

---

## 💬 Feedback & Contributing
- 📧 **Developer Email**: [notsubhan777@gmail.com](mailto:notsubhan777@gmail.com)
- 🐛 **Bug Reports**: [Open an Issue on GitHub](https://github.com/NotSubhan77/fireupp-backend/issues)
- 👨‍💻 **Author**: Subhan Mahapatra ([@NotSubhan77](https://github.com/NotSubhan77))

⭐ **If you find Zovio useful, please consider starring this repository on GitHub!**

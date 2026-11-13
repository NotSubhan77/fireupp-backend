# 🔥 Fireupp — Ultra-Fast Encrypted Collaboration Suite

<div align="center">

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://fireupp.up.railway.app)
[![Version](https://img.shields.io/badge/Release-v1.0.0-ff5722?style=for-the-badge)](https://github.com/NotSubhan77/fireupp-backend/releases)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/NotSubhan77/fireupp-backend?style=for-the-badge&logo=github&color=ffb703)](https://github.com/NotSubhan77/fireupp-backend)

**Private Messaging &bull; Ultra-Low Latency Calls &bull; Premium Screen Sharing &bull; Real-time Workspaces &bull; 24h Status Stories**

[🌐 Official Website & Download](https://fireupp.up.railway.app) &bull; [⭐ Star on GitHub](https://github.com/NotSubhan77/fireupp-backend) &bull; [🐛 Report an Issue](mailto:notsubhan777@gmail.com?subject=Fireupp%20Issue%20Report) &bull; [💡 Feature Request](mailto:notsubhan777@gmail.com?subject=Fireupp%20Feature%20Request)

</div>

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Core Features & Modules](#-core-features--modules)
  - [FireChats](#-firechats-end-to-end-encrypted-messaging)
  - [FireCalls & Unified Meet](#-firecalls--unified-meetings)
  - [Modern-Style Screen Sharing](#-discord-style-screen-sharing)
  - [FireStatus (24h Stories)](#-firestatus-24h-ephemeral-stories)
  - [FireCasts (Broadcast Channels)](#-firecasts-broadcast-channels)
  - [FireSpace (Workspace & Cloud Vault)](#-firespace-collaborative-workspace--cloud-vault)
  - [Zero-Knowledge Security](#-zero-knowledge-security)
- [How to Download & Use](#-how-to-download--use)
- [Developer Guide: Running Locally & Building](#-developer-guide-running-locally--building)
- [How to Publish GitHub Releases](#-how-to-publish-github-releases)
- [How App Updates Work & Notifying Users](#-how-app-updates-work--notifying-users)
- [Feedback, Bug Reports & Feature Requests](#-feedback-bug-reports--feature-requests)
- [Author & Acknowledgments](#-author--acknowledgments)

---

## 🌟 Overview

**Fireupp** is an ultra-fast, native Windows desktop application crafted for high-performance communication and encrypted collaboration. It eliminates slow browser tabs and multi-app fatigue by unifying direct messaging, group calls, room-based meetings, high-framerate screensharing, collaborative task boards, and 24-hour stories into one hardware-accelerated desktop client.

All communication is protected by client-side zero-knowledge cryptography, ensuring your messages, private keys, media, and workspaces remain completely private to you.

---

## 🚀 Core Features & Modules

### 💬 FireChats (End-to-End Encrypted Messaging)
- **Zero-Knowledge Encryption**: All chats and direct messages are encrypted client-side with AES-256-GCM and ECDH key exchange.
- **15-Minute Message Editing**: Edit any sent message within the first 15 minutes of transmission.
- **Live In-Chat Translation**: Translate incoming and outgoing messages into 10+ languages (Spanish, French, German, Japanese, Hindi, etc.) with a single click.
- **Pin Important Messages**: Pin up to 5 critical conversations or messages at the top of your list for quick access.
- **Voice Notes & View-Once Media**: Send encrypted audio voice recordings and self-destructing view-once photos and videos.
- **Strict Privacy Contacts Search**: The search bar strictly searches known friends, mutual group members, and direct contacts — never exposing strangers.

### 📞 FireCalls & Unified Meetings
- **Unified 1-on-1 & Group Calls**: One consolidated hub for direct audio/video calls, group calls, and room meetings.
- **Room Code & Link Invitations**: Generate instant meeting codes (e.g. `call-cfe2-cfqq`) or shareable invitation links to join from anywhere.
- **Scheduled Calls**: Plan future meetings with calendar time scheduling and participant lists.
- **WebRTC P2P Ultra-Low Latency**: Sub-40ms latency direct peer-to-peer streaming with automated AI noise cancellation, echo suppression, and audio DSP enhancement.
- **Call History with 30-Day Auto-Purge**: Review recent incoming, outgoing, and missed calls with individual delete buttons and an automated 30-day background expiration cleanup.

### 🖥️ Discord-Style Screen Sharing
- **60 FPS Fluid Streaming**: Share your desktop or individual application windows with crisp 60 frames per second video.
- **System Audio Passthrough**: Stream system audio and music directly alongside your screen for presentations, pair programming, and media watch parties.
- **Multi-User Adaptive Grid**: Automatically rebalances participant video feeds as users join, toggle cameras, or share screens.

### ⭕ FireStatus (24h Ephemeral Stories)
- **24-Hour Disappearing Stories**: Share photos, videos, and status updates that automatically disappear after 24 hours.
- **Granular WhatsApp-Style Privacy**:
  - **My Friends**: Only users you have explicitly marked as friends can view your status.
  - **Friends Except**: Blacklist specific contacts from viewing certain status updates.
  - **Only Share With**: Whitelist only select trusted people for private stories.
- **Friend Request Gating**: Unsolicited viewers cannot see your statuses until you explicitly accept or mark them as a friend.

### 📢 FireCasts (Broadcast Channels)
- **Public & Private Channels**: Broadcast announcements to unlimited followers.
- **Custom Handles (@username)**: Claim unique channel handles for easy sharing.
- **Custom Branding**: Owners and admins can upload custom logos and change channel titles at any time.

### 📁 FireSpace (Collaborative Workspace & Cloud Vault)
- **Real-Time Kanban & Boards**: Manage team tasks, agile boards, and project cards in real-time.
- **Encrypted 2GB Cloud Storage**: Upload documents, archives, and multimedia files up to 2GB per file with chunked encryption.
- **Multi-File Drag & Drop**: Easily drag and drop multiple files directly into the workspace.

### 🔒 Zero-Knowledge Security
- **Argon2 / Scrypt Master Key Derivation**: Passwords and master keys never leave your machine in plaintext.
- **Google Account Verification for Account Deletion**: Account deletion requires authenticated Google OAuth matching your registered email before permanently wiping all server data.
- **Cloud Firestore Persistence**: Uses Google Cloud Firestore (`fireupp-db`) with service-account authentication so no user data is lost on server redeployments.

---

## 📥 How to Download & Use

### Windows 10 & 11 (64-bit)
1. Download the verified installer directly from the website:  
   👉 **[Download Fireupp_Setup.exe](https://fireupp.up.railway.app/download/Fireupp_Setup.exe)**
2. Run `Fireupp_Setup.exe` and follow the quick setup wizard.
3. Launch **Fireupp** from your Start Menu or Desktop shortcut.
4. Sign in with your **Google Account** in your default browser (Chrome/Edge/Firefox) — Fireupp will automatically sync and log you into the native desktop app.

---

## 🛠️ Developer Guide: Running Locally & Building

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v20+
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/NotSubhan77/fireupp-backend.git
cd fireupp-backend
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install desktop client dependencies
cd desktop
npm install
cd ..
```

### 3. Configure Environment (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
SESSION_SECRET=your_super_secret_session_key
FIREBASE_PROJECT_ID=fireupp-d5c92
FIREBASE_DATABASE_ID=fireupp-db
FIREBASE_CLIENT_EMAIL=your-service-account@fireupp-d5c92.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Run Locally
```bash
# Start backend server
node server.js

# In another terminal, run the desktop client in development mode
cd desktop
npm run electron:dev
```

### 5. Build the Windows Installer (`.exe`)
```bash
cd desktop
npm run build
npx electron-builder --win nsis
```
The compiled installer will be saved to:  
`desktop/dist-electron/Fireupp_Setup_1.0.0.exe`

---

## 📦 How to Publish GitHub Releases

To publish a formal release on GitHub with the installer attached:

1. Open your repository on GitHub:  
   **[https://github.com/NotSubhan77/fireupp-backend/releases](https://github.com/NotSubhan77/fireupp-backend/releases)**
2. Click **"Draft a new release"** (or **"Create a new release"**).
3. Click **"Choose a tag"**, type **`v1.0.0`**, and select **"Create new tag: v1.0.0 on publish"**.
4. Set the **Release title** (e.g. `Fireupp v1.0.0 — Native Desktop Release`).
5. In the description, summarize the highlights (e.g., E2E chats, WebRTC calls, Discord screen sharing).
6. Under **"Attach binaries by dropping them here"**, drag and drop your compiled **`Fireupp_Setup.exe`** from your Desktop.
7. Click **"Publish release"**.

Users can now download directly from GitHub Releases or your live landing page!

---

## 🔄 How App Updates Work & Notifying Users

Fireupp features a **dual update mechanism**:

### 1. Instant Cloud Updates (No Re-download Required)
Because Fireupp Desktop connects to your live Railway cloud instance (`https://fireupp.up.railway.app`), any UI updates, bug fixes, or new features you push to GitHub (`git push origin main`) are **instantly received by all desktop users** the moment they open the app.

### 2. Native Installer Updates (`.exe` Version Notifications)
When you release a major binary update (e.g. `v1.1.0`):
1. In `server.js`, bump `CURRENT_APP_VERSION = '1.1.0'` (or set Railway environment variable `APP_VERSION=1.1.0`).
2. Push or deploy to Railway.
3. Every active desktop user will immediately see an in-app banner:
   ```text
   🚀 Update Available: v1.1.0
   A new version of Fireupp has been released with improvements.
   [Download .exe]  [Later]
   ```
4. Clicking **"Download .exe"** downloads the latest installer directly.

---

## 💬 Feedback, Bug Reports & Feature Requests

Have a suggestion, feature idea, or encountered a bug? Reach out directly!

- 📧 **Developer Email**: [notsubhan777@gmail.com](mailto:notsubhan777@gmail.com)
- 🐛 **Report a Bug**: [Open Bug Report Template](mailto:notsubhan777@gmail.com?subject=Fireupp%20Bug%20Report&body=Issue%20description%3A%0A%0AOperating%20System%3A%20Windows%2010%2F11)
- 💡 **Request a Feature**: [Open Feature Request Template](mailto:notsubhan777@gmail.com?subject=Fireupp%20Feature%20Request&body=Idea%20Proposal%3A%0A%0AWhy%20it%20would%20be%20useful%3A)
- 🌐 **Project Issues**: [GitHub Issues Page](https://github.com/NotSubhan77/fireupp-backend/issues)

---

## 👨‍💻 Author & Acknowledgments

- **Lead Developer**: Subhan Mahapatra ([@NotSubhan77](https://github.com/NotSubhan77))
- **Repository**: [https://github.com/NotSubhan77/fireupp-backend](https://github.com/NotSubhan77/fireupp-backend)

⭐ **If you find Fireupp useful, please consider giving the repository a Star on GitHub!** It helps the project grow and motivates continuous development.

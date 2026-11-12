/**
 * Fireupp — real-time messenger server.
 * Express REST API + WebSocket fan-out, persisted in Google Firebase via ./store.js.
 */
require('dotenv').config();

process.on('uncaughtException', err => {
  console.error('[server: uncaughtException]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', reason => {
  console.error('[server: unhandledRejection]', reason && reason.stack ? reason.stack : reason);
});

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { WebSocketServer, WebSocket } = require('ws');
const store = require('./store');
const E2E = require('./public/js/crypto.js');

const PORT = process.env.PORT || 3000;
const MAX_FILE = 2 * 1024 * 1024 * 1024; // 2 GB
const CHUNK = 5 * 1024 * 1024;           // client plaintext chunk size

// ---------------- session tokens (stateless HMAC) ----------------
const SECRET = process.env.SESSION_SECRET || 'fireupp-master-production-session-secret-f8b1a3c7e2d94a6b8c1d5e3f7a9b2c4d';
const hmac = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function signToken(uid) {
  const p = `${uid}.${Date.now() + 30 * 864e5}`;
  return `${p}.${hmac(p)}`;
}
function verifyToken(tok) {
  const [uid, exp, sig] = String(tok || '').split('.');
  if (!uid || !exp || !sig) return null;
  const good = hmac(`${uid}.${exp}`);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (+exp < Date.now()) return null;
  return store.get('users', uid) ? uid : null;
}
const hashAuth = (authKey, salt) => crypto.scryptSync(String(authKey), salt, 32).toString('hex');

// ---------------- Auth Verification ----------------

// ---------------- Persistent 10-Minute OTP Verification Engine ----------------
const OTP_FILE = path.join(__dirname, 'data', 'otp_cache.json');
const OTP_LIFETIME = 10 * 60 * 1000; // 10 full minutes
const otpStore = new Map(); // key `${email}:${purpose}` -> { code, expiresAt, attempts }

function loadOtpStore() {
  try {
    if (fs.existsSync(OTP_FILE)) {
      const data = JSON.parse(fs.readFileSync(OTP_FILE, 'utf8'));
      const nowMs = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (v && v.expiresAt > nowMs) {
          otpStore.set(k, v);
        }
      }
      console.log(`[otp] Loaded ${otpStore.size} active unexpired OTP(s) from persistent cache`);
    }
  } catch (err) {
    console.warn('[otp] Could not load otp cache:', err.message);
  }
}

function persistOtpStore() {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    const dump = {};
    const nowMs = Date.now();
    for (const [k, v] of otpStore.entries()) {
      if (v.expiresAt > nowMs) dump[k] = v;
    }
    fs.writeFileSync(OTP_FILE, JSON.stringify(dump, null, 2), 'utf8');
  } catch (err) {
    console.error('[otp] Could not persist otp cache:', err.message);
  }
}

loadOtpStore();

function issueOtp(email, purpose) {
  const cleanEmail = String(email || '').toLowerCase().trim();
  const key = `${cleanEmail}:${purpose}`;
  const existing = otpStore.get(key);
  const nowMs = Date.now();

  let code;
  // If an active unexpired code exists with more than 1 min left, reuse it and extend for another 10 full mins.
  // This ensures reloading the page or re-clicking 'Send Code' never invalidates the OTP sent to Gmail!
  if (existing && existing.expiresAt > nowMs + 60 * 1000) {
    code = existing.code;
    existing.expiresAt = nowMs + OTP_LIFETIME;
    existing.attempts = 0;
    otpStore.set(key, existing);
  } else {
    code = String(crypto.randomInt(100000, 999999));
    otpStore.set(key, { code, expiresAt: nowMs + OTP_LIFETIME, attempts: 0 });
  }

  persistOtpStore();
  return code;
}

function consumeOtp(email, purpose, code) {
  const cleanEmail = String(email || '').toLowerCase().trim();
  const cleanCode = String(code || '').trim();
  if (!cleanCode || cleanCode.length !== 6) return false;

  const key = `${cleanEmail}:${purpose}`;
  let rec = otpStore.get(key);
  const nowMs = Date.now();

  if (!rec || rec.expiresAt <= nowMs) return false;

  rec.attempts = (rec.attempts || 0) + 1;
  if (rec.attempts > 8) {
    otpStore.delete(key);
    persistOtpStore();
    return false;
  }

  const bufCode = Buffer.from(cleanCode);
  const bufRec = Buffer.from(rec.code);
  if (bufCode.length !== bufRec.length || !crypto.timingSafeEqual(bufCode, bufRec)) {
    persistOtpStore();
    return false;
  }

  // Successfully verified!
  otpStore.delete(key);
  persistOtpStore();
  return true;
}

// ---------------- Persistent 15-Minute Security Verification Link Engine ----------------
const VERIFY_LINKS_FILE = path.join(__dirname, 'data', 'verification_links.json');
const VERIFY_LIFETIME = 15 * 60 * 1000; // 15 full minutes
const verifyStore = new Map(); // token -> { token, email, purpose, code, createdAt, expiresAt, verified, verifiedAt }

function loadVerifyStore() {
  try {
    if (fs.existsSync(VERIFY_LINKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(VERIFY_LINKS_FILE, 'utf8'));
      const nowMs = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (v && v.expiresAt > nowMs) {
          verifyStore.set(k, v);
        }
      }
      console.log(`[security-verify] Loaded ${verifyStore.size} active verification link(s)`);
    }
  } catch (err) {
    console.warn('[security-verify] Could not load verification cache:', err.message);
  }
}

function persistVerifyStore() {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    const dump = {};
    const nowMs = Date.now();
    for (const [k, v] of verifyStore.entries()) {
      if (v.expiresAt > nowMs) dump[k] = v;
    }
    fs.writeFileSync(VERIFY_LINKS_FILE, JSON.stringify(dump, null, 2), 'utf8');
  } catch (err) {
    console.error('[security-verify] Could not persist verification cache:', err.message);
  }
}

loadVerifyStore();

async function createVerificationLink(email, purpose, req) {
  const cleanEmail = String(email || '').toLowerCase().trim();
  const token = crypto.randomBytes(32).toString('hex');
  const code = issueOtp(cleanEmail, purpose);

  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const verifyUrl = `${proto}://${host}/api/auth/verify-link?token=${token}`;

  const nowMs = Date.now();
  verifyStore.set(token, {
    token,
    email: cleanEmail,
    purpose,
    code,
    createdAt: nowMs,
    expiresAt: nowMs + VERIFY_LIFETIME,
    verified: false,
    verifiedAt: null
  });
  persistVerifyStore();

  const purposeTitles = {
    'signup': 'Activate Your Fireupp Account',
    'login': 'Confirm Sign-In to Fireupp',
    'delete-account': 'Confirm Permanent Account Deletion'
  };
  const title = purposeTitles[purpose] || 'Security Verification';

  try {
    const db = store.getDb?.();
    if (db) {
      await db.collection('mail').add({
        to: cleanEmail,
        message: {
          subject: `Fireupp Security: ${title}`,
          text: `Click the link below to verify your Gmail address for ${title}:\n${verifyUrl}\n\nOr enter 6-digit confirmation code: ${code}\nValid for 15 minutes.`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;background:#0b0d17;color:#ffffff;border-radius:18px;max-width:480px;margin:0 auto;border:1px solid rgba(255,255,255,0.12)">
            <div style="font-size:32px;margin-bottom:12px">🔥 <b>Fireupp</b></div>
            <h2 style="margin:0 0 12px;color:#a8c7fa;font-size:20px">${title}</h2>
            <p style="color:#d0d0d0;font-size:14px;line-height:1.55">We received a request to verify your Gmail address (<b>${cleanEmail}</b>). Click the button below to confirm:</p>
            <div style="margin:24px 0;text-align:center">
              <a href="${verifyUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7c5cff 0%,#ff5c8a 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;box-shadow:0 8px 24px rgba(124,92,255,0.4)">
                ✅ Verify Gmail &amp; Continue
              </a>
            </div>
            <p style="color:#8e918f;font-size:12px;line-height:1.4">Direct Link: <a href="${verifyUrl}" style="color:#a8c7fa">${verifyUrl}</a></p>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);font-size:13px;color:#9ca3af">
              Or use confirmation code: <b style="color:#ffffff;font-size:16px;letter-spacing:2px">${code}</b>
            </div>
            <p style="color:#6b7280;font-size:11px;margin-top:16px">This verification link is valid for 15 minutes. If you did not initiate this, please secure your account immediately.</p>
          </div>`
        }
      });
    }
  } catch (err) {
    console.warn('[firestore-mail] Notice:', err.message);
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
      await transporter.sendMail({
        from: `Fireupp Security <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: `Fireupp Security: ${title}`,
        text: `Click the link below to verify your Gmail address for ${title}:\n${verifyUrl}\n\nOr enter confirmation code: ${code}\nValid for 15 minutes.`,
        html: `<div style="font-family:sans-serif;padding:32px 24px;background:#0b0d17;color:#ffffff;border-radius:18px;max-width:480px">
          <h2 style="margin:0 0 12px;color:#a8c7fa">${title}</h2>
          <p style="color:#d0d0d0;font-size:14px">Click the button below to confirm your Gmail address:</p>
          <div style="margin:24px 0;text-align:center">
            <a href="${verifyUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7c5cff 0%,#ff5c8a 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px">
              ✅ Verify Gmail &amp; Continue
            </a>
          </div>
          <p style="color:#8e918f;font-size:12px">Direct Link: ${verifyUrl}</p>
        </div>`
      });
    } catch (err) {
      console.warn('[nodemailer-gmail] Notice:', err.message);
    }
  }

  console.log(`[Security Verification Link] Generated for ${cleanEmail} (${purpose}):\n  Link: ${verifyUrl}\n  Code: ${code}`);

  return { token, verifyUrl, email: cleanEmail, code, expiresAt: nowMs + VERIFY_LIFETIME };
}

function verifyTokenClick(token) {
  if (!token) return null;
  const rec = verifyStore.get(String(token).trim());
  if (!rec) return null;
  if (rec.expiresAt < Date.now()) {
    verifyStore.delete(token);
    persistVerifyStore();
    return null;
  }
  rec.verified = true;
  rec.verifiedAt = Date.now();
  persistVerifyStore();
  return rec;
}

function consumeVerificationToken(token, expectedEmail, expectedPurpose) {
  if (!token) return false;
  const rec = verifyStore.get(String(token).trim());
  if (!rec) return false;
  if (rec.expiresAt < Date.now()) {
    verifyStore.delete(token);
    persistVerifyStore();
    return false;
  }
  if (!rec.verified) return false;
  if (expectedEmail && rec.email.toLowerCase() !== expectedEmail.toLowerCase()) return false;
  if (expectedPurpose && rec.purpose !== expectedPurpose) return false;

  verifyStore.delete(token);
  persistVerifyStore();
  return true;
}

// ---------------- helpers ----------------
const COLORS = ['#7c5cff', '#ff5c8a', '#ff9f43', '#2ed3b7', '#4c8dff', '#c86bfa', '#00b8d9', '#f5576c'];
const colorFor = s => COLORS[[...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
const now = () => Date.now();
const online = new Map(); // uid -> Set<ws>
const isOnline = uid => (online.get(uid)?.size || 0) > 0;

function canViewBio(targetUser, viewerId) {
  if (!targetUser || !viewerId) return false;
  if (targetUser.id === viewerId) return true;
  if ((targetUser.blockedUsers || []).includes(viewerId)) return false;
  const viewer = store.get('users', viewerId);
  if (viewer && (viewer.blockedUsers || []).includes(targetUser.id)) return false;

  const priv = targetUser.bioPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  const mode = priv.mode || 'friends';
  const ownerFriends = Array.isArray(targetUser.friends) ? targetUser.friends : [];

  if (mode === 'everyone') return true;
  if (mode === 'only_share_with') {
    return Array.isArray(priv.onlyIds) && priv.onlyIds.includes(viewerId);
  }
  if (mode === 'friends_except') {
    return ownerFriends.includes(viewerId) && !(Array.isArray(priv.exceptIds) && priv.exceptIds.includes(viewerId));
  }
  return ownerFriends.includes(viewerId);
}

function canViewPhone(targetUser, viewerId) {
  if (!targetUser || !viewerId) return false;
  if (targetUser.id === viewerId) return true;
  if ((targetUser.blockedUsers || []).includes(viewerId)) return false;
  const viewer = store.get('users', viewerId);
  if (viewer && (viewer.blockedUsers || []).includes(targetUser.id)) return false;

  const priv = targetUser.phonePrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  const mode = priv.mode || 'friends';
  const ownerFriends = Array.isArray(targetUser.friends) ? targetUser.friends : [];

  if (mode === 'everyone') return true;
  if (mode === 'nobody') return false;
  if (mode === 'only_share_with') {
    return Array.isArray(priv.onlyIds) && priv.onlyIds.includes(viewerId);
  }
  if (mode === 'friends_except') {
    return ownerFriends.includes(viewerId) && !(Array.isArray(priv.exceptIds) && priv.exceptIds.includes(viewerId));
  }
  return ownerFriends.includes(viewerId);
}

function canMentionUser(targetUser, viewerId) {
  if (!targetUser || !viewerId) return false;
  if (targetUser.id === viewerId) return true;
  if ((targetUser.blockedUsers || []).includes(viewerId)) return false;
  const viewer = store.get('users', viewerId);
  if (viewer && (viewer.blockedUsers || []).includes(targetUser.id)) return false;

  const priv = targetUser.mentionPrivacy || { mode: 'everyone', exceptIds: [], onlyIds: [] };
  const mode = priv.mode || 'everyone';
  const ownerFriends = Array.isArray(targetUser.friends) ? targetUser.friends : [];

  if (mode === 'everyone') return true;
  if (mode === 'nobody') return false;
  if (mode === 'only_share_with') {
    return Array.isArray(priv.onlyIds) && priv.onlyIds.includes(viewerId);
  }
  if (mode === 'friends_except') {
    return ownerFriends.includes(viewerId) && !(Array.isArray(priv.exceptIds) && priv.exceptIds.includes(viewerId));
  }
  return ownerFriends.includes(viewerId);
}

function publicUser(u, viewerId = null) {
  if (!u) return null;
  const showBio = !viewerId || canViewBio(u, viewerId);
  const showPhone = !viewerId || canViewPhone(u, viewerId);
  const allowMention = !viewerId || canMentionUser(u, viewerId);
  const hasCustomPhoto = u.avatar && typeof u.avatar === 'string' && u.avatar.startsWith('data:image/');
  return {
    id: u.id, username: u.username, name: u.name, email: u.email || `${u.username}@gmail.com`,
    bio: showBio ? (u.bio || '') : '', avatar: hasCustomPhoto ? u.avatar : null, avatarColor: u.avatarColor || colorFor(u.username || 'user'),
    phone: showPhone ? (u.phone || '') : '', pronouns: u.pronouns || '', location: u.location || '', statusText: u.statusText || '',
    publicKey: u.publicKey, lastSeen: u.lastSeen, online: isOnline(u.id),
    canMention: allowMention
  };
}
function selfUser(u) {
  const defaultPrefs = {
    readReceipts: true,
    showOnline: true,
    sounds: true,
    animations: true,
    enterToSend: true,
    compactMode: false,
    notifyPreview: true
  };
  const userPrefs = { ...defaultPrefs, ...(u.preferences || u.prefs || {}) };
  const defaultStatusPrivacy = { mode: 'friends', exceptIds: [], onlyIds: [] };
  const statusPrivacy = {
    mode: u.statusPrivacy?.mode || defaultStatusPrivacy.mode,
    exceptIds: Array.isArray(u.statusPrivacy?.exceptIds) ? u.statusPrivacy.exceptIds : [],
    onlyIds: Array.isArray(u.statusPrivacy?.onlyIds) ? u.statusPrivacy.onlyIds : []
  };
  const defaultBioPrivacy = { mode: 'friends', exceptIds: [], onlyIds: [] };
  const bioPrivacy = {
    mode: u.bioPrivacy?.mode || defaultBioPrivacy.mode,
    exceptIds: Array.isArray(u.bioPrivacy?.exceptIds) ? u.bioPrivacy.exceptIds : [],
    onlyIds: Array.isArray(u.bioPrivacy?.onlyIds) ? u.bioPrivacy.onlyIds : []
  };
  const defaultPhonePrivacy = { mode: 'friends', exceptIds: [], onlyIds: [] };
  const phonePrivacy = {
    mode: u.phonePrivacy?.mode || defaultPhonePrivacy.mode,
    exceptIds: Array.isArray(u.phonePrivacy?.exceptIds) ? u.phonePrivacy.exceptIds : [],
    onlyIds: Array.isArray(u.phonePrivacy?.onlyIds) ? u.phonePrivacy.onlyIds : []
  };
  const defaultMentionPrivacy = { mode: 'everyone', exceptIds: [], onlyIds: [] };
  const mentionPrivacy = {
    mode: u.mentionPrivacy?.mode || defaultMentionPrivacy.mode,
    exceptIds: Array.isArray(u.mentionPrivacy?.exceptIds) ? u.mentionPrivacy.exceptIds : [],
    onlyIds: Array.isArray(u.mentionPrivacy?.onlyIds) ? u.mentionPrivacy.onlyIds : []
  };
  return {
    ...publicUser(u),
    bio: u.bio || '',
    phone: u.phone || '',
    phonePrivacy,
    mentionPrivacy,
    prefs: userPrefs,
    preferences: userPrefs,
    friends: Array.isArray(u.friends) ? u.friends : [],
    blockedUsers: Array.isArray(u.blockedUsers) ? u.blockedUsers : [],
    mutedChats: Array.isArray(u.mutedChats) ? u.mutedChats : [],
    statusPrivacy,
    bioPrivacy,
    customUsernameSet: u.customUsernameSet !== undefined ? Boolean(u.customUsernameSet) : (u.lastUsernameChange ? true : false),
    lastUsernameChange: u.lastUsernameChange || null,
    kdfSalt: u.kdfSalt, wrappedPrivateKey: u.wrappedPrivateKey, wrappedVaultKey: u.wrappedVaultKey
  };
}

const isAdmin = (chat, uid) => Boolean(chat && (chat.admins?.includes(uid) || chat.ownerId === uid));
function canRead(chat, uid) {
  if (!chat) return false;
  if (chat.type === 'channel') return true;
  return (chat.members || []).includes(uid);
}
function audience(chat) {
  const s = new Set(chat.members || []);
  (chat.followers || []).forEach(f => s.add(f));
  (chat.admins || []).forEach(a => s.add(a));
  if (chat.ownerId) s.add(chat.ownerId);
  return [...s];
}
const messagesOf = chatId => store.find('messages', m => m.chatId === chatId).sort((a, b) => a.ts - b.ts);

function msgView(m) {
  const { viewers, ...rest } = m;
  return { ...rest, views: viewers ? viewers.length : undefined };
}

function chatView(chat, uid) {
  const msgs = messagesOf(chat.id).filter(m => !(m.deletedFor || []).includes(uid));
  const last = msgs[msgs.length - 1] || null;
  const userObj = store.get('users', uid);
  const isMuted = Boolean(userObj && Array.isArray(userObj.mutedChats) && userObj.mutedChats.includes(chat.id));
  const acceptedBy = Array.isArray(chat.acceptedBy) ? chat.acceptedBy : [chat.ownerId];
  const isDeleted = Boolean((chat.deletedBy || []).includes(uid));
  const base = {
    id: chat.id, type: chat.type, name: chat.name, description: chat.description, emoji: chat.emoji,
    avatar: chat.avatar || null,
    avatarColor: chat.avatarColor, ownerId: chat.ownerId, admins: chat.admins || [], createdAt: chat.createdAt,
    settings: chat.settings || {}, keyVersion: chat.keyVersion, lastMessage: last ? msgView(last) : null,
    pinnedMessageId: chat.pinnedMessageId || null,
    isPinnedChat: Boolean(userObj?.pinnedChats && userObj.pinnedChats.includes(chat.id)),
    acceptedBy,
    isAccepted: chat.type === 'dm'
      ? (acceptedBy.includes(uid) || Boolean(userObj?.friends?.includes((chat.members || []).find(m => m !== uid))))
      : (chat.type === 'group'
          ? (chat.ownerId === uid || acceptedBy.includes(uid) || Boolean(userObj?.friends?.includes(chat.ownerId)))
          : true),
    isMuted,
    isDeleted,
    deletedBy: chat.deletedBy || [],
    updatedAt: last ? last.ts : chat.createdAt,
    unread: msgs.filter(m => m.senderId !== uid && !(m.readBy || []).includes(uid) && m.kind !== 'system').length
  };
  if (chat.type === 'channel') {
    const following = (chat.followers || []).includes(uid) || isAdmin(chat, uid);
    return {
      ...base, handle: chat.handle, followerCount: (chat.followers || []).length,
      isFollowing: following, isAdmin: isAdmin(chat, uid), unread: following ? base.unread : 0
    };
  }
  const myKeys = {};
  for (const [v, entries] of Object.entries(chat.keys || {})) if (entries[uid]) myKeys[v] = entries[uid];
  return { ...base, members: (chat.members || []).map(id => publicUser(store.get('users', id), uid)).filter(Boolean), keys: myKeys };
}

function send(uid, ev) {
  const set = online.get(uid);
  if (!set) return;
  const data = JSON.stringify(ev);
  set.forEach(ws => ws.readyState === WebSocket.OPEN && ws.send(data));
}
function broadcastAll(ev) {
  const data = JSON.stringify(ev);
  wss.clients.forEach(c => c.uid && c.readyState === WebSocket.OPEN && c.send(data));
}
function pushChat(chat, extra = []) {
  new Set([...audience(chat), ...extra]).forEach(uid => {
    if ((chat.deletedBy || []).includes(uid)) return;
    send(uid, { type: 'chat:upsert', chat: chatView(chat, uid) });
  });
}
function pushMsg(chat, m, type = 'msg:update') {
  audience(chat).forEach(uid => {
    if ((m.deletedFor || []).includes(uid)) {
      send(uid, { type: 'msg:delete-for-me', messageId: m.id, chatId: chat.id });
    } else {
      send(uid, { type, message: msgView(m) });
    }
  });
}
function systemMsg(chat, text) {
  const m = store.insert('messages', { chatId: chat.id, senderId: 'system', ts: now(), kind: 'system', body: text, readBy: [], reactions: {} }, 'm');
  pushMsg(chat, m, 'msg:new');
  return m;
}
function validBox(b) { return b && typeof b.iv === 'string' && typeof b.ct === 'string' && typeof b.wrapperId === 'string'; }

// ---------------- Security Rate Limiter ----------------
function createRateLimiter(windowMs, maxRequests, message = 'Too many requests, please slow down.') {
  const hits = new Map();
  setInterval(() => {
    const nowMs = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (data.resetAt <= nowMs) hits.delete(ip);
    }
  }, 60000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const nowMs = Date.now();
    let client = hits.get(ip);
    if (!client || client.resetAt <= nowMs) {
      client = { count: 1, resetAt: nowMs + windowMs };
      hits.set(ip, client);
      return next();
    }
    client.count++;
    if (client.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((client.resetAt - nowMs) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const authLimiter = createRateLimiter(60 * 1000, 20, 'Too many authentication attempts. Please wait a minute and try again.');
const otpLimiter = createRateLimiter(3 * 60 * 1000, 10, 'Too many verification code requests. Please wait 3 minutes before trying again.');
const apiLimiter = createRateLimiter(60 * 1000, 400, 'Rate limit exceeded. Please slow down your requests.');

// ---------------- app ----------------
const app = express();
const server = http.createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[server] Port ${PORT} is already in use; backend server is already active.`);
    process.exit(0);
  } else {
    console.error('[server error]', err);
    process.exit(1);
  }
});

// Security Headers (OWASP)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(apiLimiter);
app.use(express.json({ limit: '6mb' }));
app.get('/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('FireuppDesktop')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

app.get([
  '/download/Zovio_Setup.exe', '/download/zovio', '/downloads/Zovio_Setup.exe',
  '/download/Fireupp_Setup.exe', '/download/setup', '/downloads/Fireupp_Setup.exe'
], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const possiblePaths = [
    path.join(__dirname, 'public', 'downloads', 'Zovio_Setup.exe'),
    path.join(__dirname, 'desktop', 'dist-electron', 'Zovio_Setup_1.0.4.exe'),
    path.join(__dirname, 'desktop', 'dist-electron', 'Zovio_Setup_1.0.3.exe'),
    path.join(__dirname, 'public', 'downloads', 'Fireupp_Setup.exe'),
    path.join(__dirname, 'desktop', 'dist-electron', 'Zovio_Setup_1.0.0.exe'),
    path.join('C:', 'Users', 'Subhan', 'Desktop', 'Zovio_Setup.exe'),
    path.join('C:', 'Users', 'Subhan', 'Desktop', 'Fireupp_Setup.exe')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const fileName = req.path.toLowerCase().includes('fireupp') ? 'Fireupp_Setup.exe' : 'Zovio_Setup.exe';
      return res.download(p, fileName);
    }
  }
  res.redirect('https://github.com/NotSubhan77/fireupp-backend');
});

app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get(['/desktop-auth', '/desktop-auth.html', '/desktop-login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'desktop-auth.html'));
});

// Desktop App Auth Synchronization Session Store
const desktopAuthSessions = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of desktopAuthSessions.entries()) {
    if (s.expiresAt < now) desktopAuthSessions.delete(id);
  }
}, 60000);

app.post('/api/auth/desktop-session', (req, res) => {
  const { session, authData } = req.body || {};
  if (!session || !authData) {
    return res.status(400).json({ error: 'Session ID and authData required' });
  }
  desktopAuthSessions.set(session, {
    authData,
    expiresAt: Date.now() + 180000
  });
  res.json({ ok: true });
});

app.get('/api/auth/desktop-session', (req, res) => {
  const session = req.query.session;
  if (!session) return res.status(400).json({ error: 'Missing session parameter' });
  const entry = desktopAuthSessions.get(session);
  if (entry) {
    desktopAuthSessions.delete(session);
    return res.json({ ready: true, authData: entry.authData });
  }
  res.json({ ready: false });
});

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => {
  console.error(e);
  res.status(500).json({ error: e.message });
});
function auth(req, res, next) {
  const uid = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (!uid) return res.status(401).json({ error: 'Session expired — please sign in again' });
  req.uid = uid;
  req.user = store.get('users', uid);
  next();
}
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

const CURRENT_APP_VERSION = process.env.APP_VERSION || '1.0.7';

function computeAppBuildHash() {
  try {
    const h = crypto.createHash('sha256');
    const files = [
      'server.js',
      'public/index.html',
      'public/css/style.css',
      'public/js/core.js',
      'public/js/chat.js',
      'public/js/meetings.js',
      'public/js/workspace.js'
    ];
    for (const rel of files) {
      const p = path.join(__dirname, rel);
      if (fs.existsSync(p)) h.update(fs.readFileSync(p));
    }
    return h.digest('hex').slice(0, 12);
  } catch {
    return 'zovio-v1.0.7';
  }
}

const APP_BUILD_HASH = computeAppBuildHash();

app.get('/api/app/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({
    version: CURRENT_APP_VERSION,
    buildHash: APP_BUILD_HASH,
    downloadUrl: 'https://fireupp.up.railway.app/download/Zovio_Setup.exe?v=' + APP_BUILD_HASH,
    releaseUrl: 'https://github.com/NotSubhan77/fireupp-backend/releases/latest',
    mandatory: false,
    releaseDate: new Date().toISOString().slice(0, 10)
  });
});

app.get('/api/status', async (req, res) => {
  let firestoreTest = null;
  const db = store.getDb?.();
  if (db) {
    try {
      await db.collection('_health').doc('ping').set({ timestamp: Date.now() });
      const snap = await db.collection('_health').doc('ping').get();
      firestoreTest = { ok: true, data: snap.data() };
    } catch (err) {
      firestoreTest = { ok: false, error: err.message, code: err.code };
    }
  }
  res.json({
    ...store.status(),
    googleAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
    firestoreTest,
    counts: {
      users: store.all('users').length,
      chats: store.all('chats').length,
      messages: store.all('messages').length
    }
  });
});
app.get('/api/config', (req, res) => res.json({
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  giphyApiKey: process.env.GIPHY_API_KEY || 'OjvD9pt88p4XexOtyZVdrjbeJOx3777g',
  chunkSize: CHUNK,
  maxFile: MAX_FILE,
  files: store.status().files,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'fireupp-d5c92',
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAL82esHaHZ4J0uhuWOQJgBXqgsjfhap9c',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'fireupp-d5c92.firebaseapp.com',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'fireupp-d5c92.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '438704653281',
    appId: process.env.FIREBASE_APP_ID || '1:438704653281:web:20ed0dc1db7920ff52c8a0',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-F3G30CLD5C'
  }
}));

// ---------- Real Google OAuth 2.0 (Google Identity) ----------
app.get('/api/auth/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(400).send('GOOGLE_CLIENT_ID is not configured in .env');
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account'
    }).toString();
  res.redirect(url);
});

app.get('/api/auth/google/callback', wrap(async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`/?google_error=${encodeURIComponent(error || 'Authorization denied')}`);
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    console.error('[Google OAuth Token Error]', txt);
    return res.redirect(`/?google_error=${encodeURIComponent('Failed to exchange Google OAuth code')}`);
  }

  const tokens = await tokenRes.json();
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });

  if (!profileRes.ok) {
    return res.redirect(`/?google_error=${encodeURIComponent('Failed to fetch Google profile')}`);
  }

  const profile = await profileRes.json();
  const q = new URLSearchParams({
    g_email: profile.email || '',
    g_name: profile.name || '',
    g_avatar: profile.picture || '',
    g_id: profile.sub || ''
  }).toString();
  res.redirect(`/?${q}`);
}));

app.post('/api/auth/google/save-client-id', (req, res) => {
  const { clientId, clientSecret } = req.body || {};
  const cleanId = String(clientId || '').trim();
  const cleanSec = String(clientSecret || '').trim();
  if (!cleanId) return bad(res, 'Google Client ID is required');

  process.env.GOOGLE_CLIENT_ID = cleanId;
  if (cleanSec) process.env.GOOGLE_CLIENT_SECRET = cleanSec;

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('GOOGLE_CLIENT_ID=')) {
      envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*(\r?\n|$)/, `GOOGLE_CLIENT_ID=${cleanId}\n`);
    } else {
      envContent += `\nGOOGLE_CLIENT_ID=${cleanId}\n`;
    }
    if (cleanSec) {
      if (envContent.includes('GOOGLE_CLIENT_SECRET=')) {
        envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*(\r?\n|$)/, `GOOGLE_CLIENT_SECRET=${cleanSec}\n`);
      } else {
        envContent += `GOOGLE_CLIENT_SECRET=${cleanSec}\n`;
      }
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.error('Failed to update .env:', e.message);
  }

  res.json({ ok: true, googleClientId: cleanId });
});

// ---------- Firebase Phone Auth & Web Configuration ----------
app.post('/api/config/firebase', (req, res) => {
  const { apiKey, authDomain, projectId, storageBucket, appId } = req.body || {};
  if (apiKey) process.env.FIREBASE_API_KEY = String(apiKey).trim();
  if (authDomain) process.env.FIREBASE_AUTH_DOMAIN = String(authDomain).trim();
  if (projectId) process.env.FIREBASE_PROJECT_ID = String(projectId).trim();
  if (storageBucket) process.env.FIREBASE_STORAGE_BUCKET = String(storageBucket).trim();
  if (appId) process.env.FIREBASE_APP_ID = String(appId).trim();

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const updateEnvVar = (key, val) => {
      if (!val) return;
      const re = new RegExp(`^${key}=.*$`, 'm');
      if (re.test(envContent)) {
        envContent = envContent.replace(re, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}\n`;
      }
    };
    if (apiKey) updateEnvVar('FIREBASE_API_KEY', apiKey.trim());
    if (authDomain) updateEnvVar('FIREBASE_AUTH_DOMAIN', authDomain.trim());
    if (projectId) updateEnvVar('FIREBASE_PROJECT_ID', projectId.trim());
    if (storageBucket) updateEnvVar('FIREBASE_STORAGE_BUCKET', storageBucket.trim());
    if (appId) updateEnvVar('FIREBASE_APP_ID', appId.trim());
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.error('Failed to update .env for Firebase:', e.message);
  }

  res.json({
    ok: true,
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || ''
    }
  });
});

// ---------- Authentication & Identity (Google & Email Auth) ----------
function canonicalPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/[^0-9]/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function findUserByPhone(phone) {
  const c = canonicalPhone(phone);
  if (!c || c.length < 7) return null;
  return store.findOne('users', u => canonicalPhone(u.phone) === c);
}

function findUserByEmailOrUsername(identifier) {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;
  return store.findOne('users', u =>
    (u.email || `${u.username}@gmail.com`).toLowerCase() === clean || u.username === clean.replace(/@gmail\.com$/, '')
  );
}

app.get('/api/auth/salt', (req, res) => {
  const q = String(req.query.email || req.query.username || req.query.query || '').trim().toLowerCase();
  const phoneParam = req.query.phone ? canonicalPhone(req.query.phone) : '';
  let u = findUserByEmailOrUsername(q);
  if (!u && phoneParam) {
    u = findUserByPhone(phoneParam);
  }
  res.json({
    exists: !!u,
    email: u ? (u.email || `${u.username}@gmail.com`) : q,
    username: u?.username || null,
    name: u?.name || null,
    avatar: u?.avatar || null,
    phone: u?.phone || '',
    kdfSalt: u ? u.kdfSalt : Buffer.from(hmac('salt:' + (q || phoneParam))).subarray(0, 16).toString('base64')
  });
});

// ---------- Pure Email & Password Authentication with Gmail OTP Verification ----------
app.post('/api/auth/send-otp', otpLimiter, wrap(async (req, res) => {
  const { email, purpose } = req.body || {};
  const cleanInput = String(email || '').trim().toLowerCase();
  if (!cleanInput) {
    return bad(res, 'Please enter your email address (e.g. name@gmail.com)', 400);
  }

  const purp = purpose || 'register';
  let targetEmail = cleanInput;

  if (purp === 'login') {
    const existing = findUserByEmailOrUsername(cleanInput);
    if (!existing) {
      return bad(res, 'No account found with this email or username. Please click "Create Account".', 404);
    }
    targetEmail = (existing.email || cleanInput).toLowerCase();
  }

  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    return bad(res, 'Please enter a valid email address (e.g. name@gmail.com)', 400);
  }

  const code = issueOtp(targetEmail, purp);
  console.log(`[Firebase Gmail OTP] 6-digit code for ${targetEmail} (${purp}): ${code}`);

  // Send via Cloud Firestore mail collection (Firebase Trigger Email Extension)
  try {
    const db = store.getDb?.();
    if (db) {
      await db.collection('mail').add({
        to: targetEmail,
        message: {
          subject: `Fireupp Verification Code: ${code}`,
          text: `Your 6-digit Fireupp verification code is: ${code}. Valid for 10 minutes.`,
          html: `<div style="font-family:sans-serif;padding:24px;background:#0d0e12;color:#ffffff;border-radius:12px;max-width:440px">
            <h2 style="margin:0 0 12px;color:#a8c7fa">Fireupp Verification Code</h2>
            <p style="color:#d0d0d0;font-size:14px">Use the 6-digit code below to verify your Gmail address:</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:800;color:#ff5722;padding:16px;background:#181920;border-radius:8px;text-align:center;margin:16px 0">${code}</div>
            <p style="color:#8e918f;font-size:12px">This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>`
        }
      });
    }
  } catch (err) {
    console.warn('[firestore-mail] Trigger notice:', err.message);
  }

  // Send via Nodemailer if SMTP configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
      await transporter.sendMail({
        from: `Fireupp <${process.env.GMAIL_USER}>`,
        to: targetEmail,
        subject: `Your Fireupp Verification Code: ${code}`,
        text: `Your 6-digit Fireupp verification code is: ${code}. Valid for 10 minutes.`
      });
    } catch (err) {
      console.warn('[nodemailer-gmail] notice:', err.message);
    }
  }

  res.json({
    ok: true,
    email: targetEmail,
    message: `Verification code sent to ${targetEmail}. Please check your Gmail inbox.`
  });
}));

// ---------------- Security Verification Link Routes ----------------
app.post('/api/auth/send-verification-link', otpLimiter, wrap(async (req, res) => {
  const { email, purpose } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const purp = String(purpose || 'signup').trim();

  if (!['signup', 'login', 'delete-account'].includes(purp)) {
    return bad(res, 'Invalid verification purpose', 400);
  }

  let targetEmail = cleanEmail;
  if (purp === 'delete-account') {
    const authHeader = req.headers.authorization;
    const tok = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const uid = tok ? verifyToken(tok) : null;
    const u = uid ? store.get('users', uid) : null;
    if (!u) return bad(res, 'Unauthorized to delete account', 401);
    targetEmail = (u.email || cleanEmail).toLowerCase();
  } else if (purp === 'login') {
    const existing = findUserByEmailOrUsername(cleanEmail);
    if (!existing) {
      return bad(res, 'No account found with this email or username. Please click "Create Account".', 404);
    }
    targetEmail = (existing.email || cleanEmail).toLowerCase();
  }

  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    return bad(res, 'Please provide a valid email address (e.g. name@gmail.com)', 400);
  }

  const result = await createVerificationLink(targetEmail, purp, req);
  const isDev = process.env.NODE_ENV !== 'production' && !process.env.GMAIL_USER;
  res.json({
    ok: true,
    token: result.token,
    email: result.email,
    ...(isDev ? { verifyUrl: result.verifyUrl, code: result.code } : {}),
    expiresAt: result.expiresAt,
    message: `Security verification link dispatched to ${result.email}. Open your Gmail and click the link to proceed.`
  });
}));

app.get('/api/auth/verify-link', (req, res) => {
  const token = String(req.query.token || '').trim();
  const rec = verifyTokenClick(token);

  if (!rec) {
    return res.status(400).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fireupp — Link Expired or Invalid</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0d17; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:#ffffff; }
    .card { background:rgba(20,24,38,0.96); border:1px solid rgba(255,255,255,0.12); border-radius:24px; padding:44px 32px; max-width:440px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,0.6); }
    .ico { font-size:46px; margin-bottom:16px; }
    h1 { font-size:22px; margin:0 0 10px; color:#ef4444; }
    p { color:rgba(255,255,255,0.7); font-size:14px; line-height:1.6; margin:0 0 24px; }
    .btn { display:inline-block; background:rgba(255,255,255,0.1); color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; padding:12px 24px; border-radius:12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="ico">⚠️</div>
    <h1>Verification Link Expired or Invalid</h1>
    <p>This verification link has already been used or has expired. Please return to Fireupp and request a fresh verification link.</p>
    <a href="/" class="btn">Return to Fireupp</a>
  </div>
</body>
</html>`);
  }

  const purposeLabels = {
    'signup': 'Account Registration',
    'login': 'Sign-In Confirmation',
    'delete-account': 'Permanent Account Deletion'
  };
  const label = purposeLabels[rec.purpose] || 'Verification';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fireupp — Gmail Verified Successfully</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at 50% 20%, #171a2e 0%, #080a12 100%); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:#ffffff; }
    .card { background:rgba(18,22,36,0.95); border:1px solid rgba(255,255,255,0.12); border-radius:24px; padding:48px 36px; max-width:440px; text-align:center; box-shadow:0 24px 70px rgba(0,0,0,0.7); animation:popIn .35s cubic-bezier(0.16,1,0.3,1); }
    @keyframes popIn { from { opacity:0; transform:scale(0.92) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .ring { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,rgba(34,197,94,0.25) 0%,rgba(16,185,129,0.12) 100%); border:2px solid #22c55e; display:inline-flex; align-items:center; justify-content:center; font-size:38px; color:#4ade80; margin-bottom:20px; box-shadow:0 0 30px rgba(34,197,94,0.3); }
    h1 { font-size:24px; font-weight:800; margin:0 0 10px; }
    .badge { display:inline-block; background:rgba(34,197,94,0.16); color:#4ade80; border:1px solid rgba(34,197,94,0.32); border-radius:99px; padding:5px 16px; font-size:12px; font-weight:700; margin-bottom:20px; letter-spacing:0.3px; }
    p { color:rgba(255,255,255,0.75); font-size:14.5px; line-height:1.6; margin:0 0 20px; }
    .sub { font-size:13px; color:rgba(255,255,255,0.52); margin-bottom:28px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#7c5cff 0%,#ff5c8a 100%); color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; padding:13px 32px; border-radius:12px; box-shadow:0 8px 24px rgba(124,92,255,0.4); transition:transform .15s ease; }
    .btn:hover { transform:scale(1.04); }
  </style>
</head>
<body>
  <div class="card">
    <div class="ring">✓</div>
    <h1>Gmail Verified!</h1>
    <div class="badge">${label} Verified</div>
    <p>Your Gmail address <b>${rec.email}</b> has been securely verified.</p>
    <div class="sub">You can close this tab and return to Fireupp — your verification was detected automatically in real time.</div>
    <a href="/" class="btn">Open Fireupp App</a>
  </div>
</body>
</html>`);
});

app.get('/api/auth/verify-status', (req, res) => {
  const token = String(req.query.token || '').trim();
  const rec = verifyStore.get(token);
  if (!rec || rec.expiresAt < Date.now()) {
    return res.json({ ok: false, verified: false, expired: true });
  }
  res.json({ ok: true, verified: !!rec.verified, email: rec.email, purpose: rec.purpose });
});

app.post('/api/auth/check-verified', (req, res) => {
  const token = String(req.body?.token || '').trim();
  const rec = verifyStore.get(token);
  if (!rec || rec.expiresAt < Date.now()) {
    return bad(res, 'Verification link has expired. Please request a new verification link.', 400);
  }
  if (!rec.verified) {
    return bad(res, 'The verification link has not been clicked yet. Please open your Gmail inbox, click the link, and try again.', 403);
  }
  res.json({ ok: true, verified: true, email: rec.email, purpose: rec.purpose });
});

app.post('/api/auth/verify-code-direct', (req, res) => {
  const { token, code } = req.body || {};
  const rec = verifyStore.get(String(token || '').trim());
  if (!rec || rec.expiresAt < Date.now()) {
    return bad(res, 'Verification session expired. Please request a new link.', 400);
  }
  const cleanCode = String(code || '').trim();
  if (!cleanCode || cleanCode.length !== 6) {
    return bad(res, 'Please enter a valid 6-digit confirmation code', 400);
  }
  if (consumeOtp(rec.email, rec.purpose, cleanCode)) {
    rec.verified = true;
    rec.verifiedAt = Date.now();
    persistVerifyStore();
    return res.json({ ok: true, verified: true, message: 'Code confirmed successfully!' });
  }
  return bad(res, 'Invalid or expired 6-digit confirmation code. Please check your Gmail or click the verification link.', 401);
});

app.post('/api/auth/precheck-login', wrap(async (req, res) => {
  const { emailOrUser, authKey } = req.body || {};
  const cleanIdent = String(emailOrUser || '').trim().toLowerCase();
  if (!cleanIdent || !authKey) return bad(res, 'Email and password required', 400);
  const u = findUserByEmailOrUsername(cleanIdent);
  if (!u) return bad(res, 'No account found with this email or username. Please click "Create Account".', 404);
  if (hashAuth(authKey, u.authSalt) !== u.authHash) {
    return bad(res, 'Incorrect password. Please verify and try again.', 401);
  }
  return res.json({ ok: true, email: u.email || cleanIdent, emailVerified: !!u.emailVerified });
}));

app.post('/api/auth/verify-firebase', wrap(async (req, res) => {
  const { token, email } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (token) {
    const rec = verifyStore.get(String(token).trim());
    if (rec && (!rec.email || rec.email.toLowerCase() === cleanEmail)) {
      rec.verified = true;
      rec.verifiedAt = Date.now();
      persistVerifyStore();
    }
  }
  const u = findUserByEmailOrUsername(cleanEmail);
  if (u) {
    store.update('users', u.id, { emailVerified: true });
  }
  res.json({ ok: true, verified: true });
}));

app.post('/api/auth/login-email', wrap(async (req, res) => {
  const { emailOrUser, authKey } = req.body || {};
  const cleanIdent = String(emailOrUser || '').trim().toLowerCase();

  if (!cleanIdent) return bad(res, 'Email address or username is required', 400);
  if (!authKey) return bad(res, 'Password is required', 400);

  const u = findUserByEmailOrUsername(cleanIdent);
  if (!u) return bad(res, 'No account found with this email or username. Please click "Create Account".', 404);

  if (hashAuth(authKey, u.authSalt) !== u.authHash) {
    return bad(res, 'Incorrect password. Please verify and try again.', 401);
  }

  store.update('users', u.id, { lastSeen: now(), emailVerified: true });
  return res.json({ token: signToken(u.id), user: selfUser(store.get('users', u.id)) });
}));

app.post('/api/auth/google/firebase', wrap(async (req, res) => {
  const { email, name, avatar, firebaseUid, idToken, publicKey, wrappedPrivateKey, wrappedVaultKey, kdfSalt } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return bad(res, 'A valid Google email address is required', 400);
  }

  let u = store.findOne('users', x => (x.email || '').toLowerCase() === cleanEmail) ||
          (firebaseUid ? store.findOne('users', x => x.firebaseUid === firebaseUid) : null);

  if (u) {
    const patch = {
      lastSeen: now(),
      emailVerified: true
    };
    if (firebaseUid && !u.firebaseUid) patch.firebaseUid = firebaseUid;
    if (avatar && (!u.avatar || u.avatar.startsWith('http'))) patch.avatar = avatar;
    if (name && (!u.name || u.name === u.username)) patch.name = name;
    if (publicKey && !u.publicKey) patch.publicKey = publicKey;
    if (wrappedPrivateKey && !u.wrappedPrivateKey) patch.wrappedPrivateKey = wrappedPrivateKey;
    if (wrappedVaultKey && !u.wrappedVaultKey) patch.wrappedVaultKey = wrappedVaultKey;
    if (kdfSalt && !u.kdfSalt) patch.kdfSalt = kdfSalt;
    store.update('users', u.id, patch);
    return res.json({ token: signToken(u.id), user: selfUser(store.get('users', u.id)), exists: true });
  }

  // New Google user registration
  const baseU = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
  let finalUsername = baseU.length >= 3 ? baseU : `user_${baseU}_${Date.now().toString(36).slice(-4)}`;
  if (store.findOne('users', x => String(x.username || '').toLowerCase() === String(finalUsername).toLowerCase())) {
    finalUsername = `${finalUsername}_${Date.now().toString(36).slice(-3)}`;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const dummyAuthKey = crypto.randomBytes(32).toString('hex');
  const fallbackKdf = kdfSalt || crypto.randomBytes(16).toString('base64');
  const newUser = store.insert('users', {
    email: cleanEmail,
    emailVerified: true,
    firebaseUid: firebaseUid || null,
    username: finalUsername,
    name: String(name || cleanEmail.split('@')[0]).trim().slice(0, 64),
    phone: '',
    bio: 'Hey there! I am on Fireupp.',
    avatar: avatar || null,
    avatarColor: colorFor(finalUsername),
    kdfSalt: fallbackKdf,
    authSalt: salt,
    authHash: hashAuth(dummyAuthKey, salt),
    publicKey: publicKey || null,
    wrappedPrivateKey: wrappedPrivateKey || null,
    wrappedVaultKey: wrappedVaultKey || null,
    createdAt: now(),
    lastSeen: now(),
    friends: [],
    known: [],
    unknown: [],
    blocked: [],
    mutedChats: [],
    blockedUsers: [],
    statusPrivacy: 'friends',
    bioPrivacy: { mode: 'everyone', exceptIds: [], onlyIds: [] },
    preferences: {
      readReceipts: true,
      showOnline: true,
      sounds: true,
      animations: true,
      enterToSend: true,
      compactMode: false,
      notifyPreview: true,
      protectMedia: true
    }
  });

  return res.json({ token: signToken(newUser.id), user: selfUser(newUser), exists: false });
}));

app.post('/api/auth/google/update-keys', wrap(async (req, res) => {
  const { email, firebaseUid, kdfSalt, publicKey, wrappedPrivateKey, wrappedVaultKey } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const u = store.findOne('users', x => (x.email || '').toLowerCase() === cleanEmail) ||
            (firebaseUid ? store.findOne('users', x => x.firebaseUid === firebaseUid) : null);
  if (!u) return bad(res, 'User not found', 404);
  const patch = {};
  if (kdfSalt) patch.kdfSalt = kdfSalt;
  if (publicKey) patch.publicKey = publicKey;
  if (wrappedPrivateKey) patch.wrappedPrivateKey = wrappedPrivateKey;
  if (wrappedVaultKey) patch.wrappedVaultKey = wrappedVaultKey;
  store.update('users', u.id, patch);
  res.json({ ok: true });
}));

app.post('/api/auth/signup-email', wrap(async (req, res) => {
  const { name, email, authKey, publicKey, wrappedPrivateKey, wrappedVaultKey, kdfSalt, firebaseUid, emailVerified, verificationToken } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();

  if (!cleanName) return bad(res, 'Full name is required', 400);
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return bad(res, 'Please provide a valid email address (e.g. name@example.com)', 400);
  }
  if (!authKey || !kdfSalt || !publicKey || !wrappedPrivateKey || !wrappedVaultKey) {
    return bad(res, 'Cryptographic key parameters required for encryption', 400);
  }

  if (verificationToken) {
    consumeVerificationToken(verificationToken, cleanEmail, 'signup');
  }

  if (store.findOne('users', u => (u.email || '').toLowerCase() === cleanEmail)) {
    return bad(res, 'An account with this email address already exists. Please sign in.', 409);
  }

  const baseU = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
  let finalUsername = baseU.length >= 3 ? baseU : `user_${baseU}_${Date.now().toString(36).slice(-4)}`;
  if (store.findOne('users', x => String(x.username || '').toLowerCase() === String(finalUsername).toLowerCase())) {
    finalUsername = `${finalUsername}_${Date.now().toString(36).slice(-3)}`;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const u = store.insert('users', {
    email: cleanEmail,
    emailVerified: true,
    firebaseUid: firebaseUid || null,
    username: finalUsername,
    name: cleanName.slice(0, 64),
    phone: '',
    bio: 'Hey there! I am on Fireupp.',
    avatar: null,
    avatarColor: colorFor(finalUsername),
    kdfSalt,
    authSalt: salt,
    authHash: hashAuth(authKey, salt),
    publicKey,
    wrappedPrivateKey,
    wrappedVaultKey,
    createdAt: now(),
    lastSeen: now()
  }, 'u');

  return res.json({ token: signToken(u.id), user: selfUser(u), isNew: true });
}));

// Forgot Password Flow
app.post('/api/auth/forgot-password/send-code', otpLimiter, wrap(async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return bad(res, 'Please enter a valid email address', 400);
  }

  const u = store.findOne('users', x => (x.email || '').toLowerCase() === cleanEmail);
  if (!u) {
    return bad(res, 'No account found with this email address.', 404);
  }

  const code = issueOtp(cleanEmail, 'reset-password');
  console.log(`[password-reset] Verification code for ${cleanEmail}: ${code}`);

  const isDev = process.env.NODE_ENV !== 'production' && !process.env.GMAIL_USER;
  res.json({ ok: true, email: cleanEmail, ...(isDev ? { code } : {}) });
}));

app.post('/api/auth/forgot-password/reset', authLimiter, wrap(async (req, res) => {
  const { email, code, newKdfSalt, newAuthKey, newPublicKey, newWrappedPrivateKey, newWrappedVaultKey } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!cleanEmail || !cleanCode) {
    return bad(res, 'Email and 6-digit verification code are required', 400);
  }

  const u = store.findOne('users', x => (x.email || '').toLowerCase() === cleanEmail);
  if (!u) return bad(res, 'Account not found', 404);

  if (!consumeOtp(cleanEmail, 'reset-password', cleanCode)) {
    return bad(res, 'Invalid or expired 6-digit verification code. Please request a new one.', 401);
  }

  if (!newAuthKey || !newKdfSalt || !newPublicKey || !newWrappedPrivateKey || !newWrappedVaultKey) {
    return bad(res, 'Cryptographic key parameters required for new password', 400);
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  store.update('users', u.id, {
    kdfSalt: newKdfSalt,
    authSalt: newSalt,
    authHash: hashAuth(newAuthKey, newSalt),
    publicKey: newPublicKey,
    wrappedPrivateKey: newWrappedPrivateKey,
    wrappedVaultKey: newWrappedVaultKey,
    lastSeen: now()
  });

  return res.json({ ok: true, message: 'Password reset successfully! You can now sign in.' });
}));

// SECTION 1: Login / Register with Email, Phone & Password
app.post('/api/auth/email', wrap(async (req, res) => {
  const { emailOrUser, phone, authKey, publicKey, wrappedPrivateKey, wrappedVaultKey, kdfSalt, name } = req.body || {};
  const cleanIdent = String(emailOrUser || '').trim().toLowerCase();
  const rawPhone = String(phone || '').trim();
  const cleanPhone = canonicalPhone(rawPhone);

  if (!cleanIdent) return bad(res, 'Email ID or username is required', 400);
  if (!cleanPhone || cleanPhone.length < 10) {
    return bad(res, 'Please enter a valid 10-digit mobile number', 400);
  }
  if (!authKey) return bad(res, 'Password is required', 400);

  let userByIdent = findUserByEmailOrUsername(cleanIdent);
  const userByPhone = findUserByPhone(cleanPhone);

  // Existing user login
  if (userByIdent) {
    // 1 ID per 1 phone number & Gmail enforcement:
    if (userByIdent.phone && canonicalPhone(userByIdent.phone) !== cleanPhone) {
      return bad(res, 'The mobile number entered does not match this account.', 401);
    }
    if (userByPhone && userByPhone.id !== userByIdent.id) {
      return bad(res, 'This mobile number is already registered to another account. Only 1 account per mobile number and email is allowed.', 409);
    }
    if (hashAuth(authKey, userByIdent.authSalt) !== userByIdent.authHash) {
      return bad(res, 'Incorrect password for this account', 401);
    }
    if (!userByIdent.phone) {
      store.update('users', userByIdent.id, { phone: rawPhone, lastSeen: now() });
    } else {
      store.update('users', userByIdent.id, { lastSeen: now() });
    }
    return res.json({ token: signToken(userByIdent.id), user: selfUser(store.get('users', userByIdent.id)), isNew: false });
  }

  // If user exists by phone but email did not match:
  if (userByPhone) {
    return bad(res, 'This mobile number is already registered to another account. Only 1 account per mobile number is permitted.', 409);
  }

  // New registration with email & phone
  const cleanEmail = cleanIdent.includes('@') ? cleanIdent : `${cleanIdent}@gmail.com`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return bad(res, 'Please provide a valid email address (e.g. name@gmail.com)', 400);
  }
  if (store.findOne('users', u => (u.email || '').toLowerCase() === cleanEmail)) {
    return bad(res, 'This email address is already registered to another account.', 409);
  }
  if (!kdfSalt || !publicKey || !wrappedPrivateKey || !wrappedVaultKey) {
    return bad(res, 'Cryptographic key initialization required for new account', 400);
  }

  const baseU = cleanIdent.includes('@') ? cleanIdent.split('@')[0] : cleanIdent;
  const cleanU = baseU.replace(/[^a-z0-9_]/g, '');
  let finalUsername = cleanU.length >= 3 ? cleanU : `u_${cleanU}_${Date.now().toString(36).slice(-4)}`;
  if (store.findOne('users', x => String(x.username || '').toLowerCase() === String(finalUsername).toLowerCase())) {
    finalUsername = `${finalUsername}_${Date.now().toString(36).slice(-3)}`;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const u = store.insert('users', {
    email: cleanEmail,
    emailVerified: true,
    username: finalUsername,
    name: String(name || finalUsername).trim().slice(0, 64),
    phone: rawPhone,
    bio: 'Hey there! I am on Fireupp.',
    avatar: null,
    avatarColor: colorFor(finalUsername),
    kdfSalt,
    authSalt: salt,
    authHash: hashAuth(authKey, salt),
    publicKey,
    wrappedPrivateKey,
    wrappedVaultKey,
    createdAt: now(),
    lastSeen: now()
  }, 'u');

  res.json({ token: signToken(u.id), user: selfUser(u), isNew: true });
}));

// SECTION: Firebase Phone Authentication
app.post('/api/auth/firebase-phone', wrap(async (req, res) => {
  const { phone, authKey, publicKey, wrappedPrivateKey, wrappedVaultKey, kdfSalt, name, username } = req.body || {};
  const rawPhone = String(phone || '').trim();
  const cleanPhone = canonicalPhone(rawPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return bad(res, 'Please provide a valid 10-digit mobile number with country code');
  }

  // Find existing user by phone
  let u = findUserByPhone(cleanPhone);
  if (u) {
    if (authKey && u.authHash) {
      if (hashAuth(authKey, u.authSalt) !== u.authHash) {
        return bad(res, 'Incorrect password for this mobile account', 401);
      }
    }
    store.update('users', u.id, { lastSeen: now() });
    return res.json({ token: signToken(u.id), user: selfUser(store.get('users', u.id)), isNew: false });
  }

  // New registration with phone
  if (!kdfSalt || !publicKey || !wrappedPrivateKey || !wrappedVaultKey) {
    return bad(res, 'Cryptographic keys required for new account initialization', 400);
  }

  const baseU = String(username || `user_${cleanPhone.slice(-4)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
  let finalUsername = baseU.length >= 3 ? baseU : `u_${cleanPhone.slice(-6)}`;
  if (store.findOne('users', x => String(x.username || '').toLowerCase() === String(finalUsername).toLowerCase())) {
    finalUsername = `${finalUsername}_${Date.now().toString(36).slice(-3)}`;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  u = store.insert('users', {
    email: `${finalUsername}@gmail.com`,
    emailVerified: false,
    phoneVerified: true,
    username: finalUsername,
    name: String(name || `User ${cleanPhone.slice(-4)}`).trim().slice(0, 64),
    phone: rawPhone,
    bio: 'Hey there! I am on Fireupp.',
    avatar: null,
    avatarColor: colorFor(finalUsername),
    kdfSalt,
    authSalt: salt,
    authHash: authKey ? hashAuth(authKey, salt) : '',
    publicKey,
    wrappedPrivateKey,
    wrappedVaultKey,
    createdAt: now(),
    lastSeen: now()
  }, 'u');

  res.json({ token: signToken(u.id), user: selfUser(u), isNew: true });
}));

// SECTION 2: Google Authentication
app.post('/api/auth/google', wrap(async (req, res) => {
  const { email, name, avatar, phone, authKey, publicKey, wrappedPrivateKey, wrappedVaultKey, kdfSalt, username } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
    return bad(res, 'A valid @gmail.com Google account is required');
  }
  const rawPhone = String(phone || '').trim();
  const cleanPhone = canonicalPhone(rawPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return bad(res, 'Please enter a valid 10-digit mobile number (e.g. +91 98765 43210)');
  }
  if (!authKey) {
    return bad(res, 'Password is required');
  }

  let u = findUserByEmailOrUsername(cleanEmail);
  const userByPhone = findUserByPhone(cleanPhone);

  if (u) {
    // Existing user: check phone and verify password
    if (u.phone && canonicalPhone(u.phone) !== cleanPhone) {
      return bad(res, 'The entered mobile number does not match this Google account.', 401);
    }
    if (userByPhone && userByPhone.id !== u.id) {
      return bad(res, 'This mobile number is already registered to another account. Only 1 account per mobile number and Gmail is permitted.', 409);
    }
    if (hashAuth(authKey, u.authSalt) !== u.authHash) {
      return bad(res, 'Incorrect password for this Google account', 401);
    }
    const patch = { lastSeen: now() };
    if (!u.phone) patch.phone = rawPhone;
    if (name && !u.name) patch.name = String(name).slice(0, 64);
    // Note: Do not overwrite avatar with Google profile photo; preserve custom user photo or colorful initials avatar
    store.update('users', u.id, patch);
    return res.json({ token: signToken(u.id), user: selfUser(store.get('users', u.id)), isNew: false });
  }

  // New Google account registration
  // 1 ID per 1 phone number & Gmail enforcement:
  if (userByPhone) {
    return bad(res, 'This mobile number is already registered to another account. Only 1 account per mobile number and Gmail is permitted.', 409);
  }

  if (!kdfSalt || !publicKey || !wrappedPrivateKey || !wrappedVaultKey) {
    return bad(res, 'Cryptographic key initialization required for new Google account', 400);
  }
  const cleanU = String(username || cleanEmail.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  let finalUsername = cleanU.length >= 3 ? cleanU : `u_${cleanU}_${Date.now().toString(36).slice(-4)}`;
  if (store.findOne('users', x => String(x.username || '').toLowerCase() === String(finalUsername).toLowerCase())) {
    return bad(res, `Username "${finalUsername}" is already taken. Please choose another username.`, 409);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  u = store.insert('users', {
    email: cleanEmail,
    emailVerified: true,
    username: finalUsername,
    customUsernameSet: false, // Flag to prompt first-time user to customize their @username
    name: String(name || cleanEmail.split('@')[0]).trim().slice(0, 64),
    phone: rawPhone,
    bio: 'Hey there! I am on Fireupp.',
    avatar: null, // Do not use Google external photo; use classic colorful initials avatar for non-profile users
    avatarColor: colorFor(finalUsername),
    kdfSalt,
    authSalt: salt,
    authHash: hashAuth(authKey, salt),
    publicKey,
    wrappedPrivateKey,
    wrappedVaultKey,
    createdAt: now(),
    lastSeen: now()
  }, 'u');

  res.json({ token: signToken(u.id), user: selfUser(u), isNew: true });
}));





app.post('/api/auth/register', authLimiter, wrap(async (req, res) => {
  const { email, otp, username, name, bio, avatar, kdfSalt, authKey, publicKey, wrappedPrivateKey, wrappedVaultKey } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) return bad(res, 'A valid @gmail.com address is required');
  if (!consumeOtp(cleanEmail, 'register', otp)) return bad(res, 'Invalid or expired Gmail verification code', 401);

  const clean = String(username || cleanEmail.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!/^[a-z0-9_]{3,32}$/.test(clean)) return bad(res, 'Username: 3–32 letters, numbers or underscores');
  if (!name || !authKey || !kdfSalt || !publicKey || !wrappedPrivateKey || !wrappedVaultKey) return bad(res, 'Missing fields');
  if (store.findOne('users', u => String(u.username || '').toLowerCase() === clean || (u.email || '').toLowerCase() === cleanEmail)) {
    return bad(res, 'Username or Gmail is already registered', 409);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const u = store.insert('users', {
    email: cleanEmail, emailVerified: true, username: clean, name: String(name).trim().slice(0, 64),
    bio: String(bio || 'Hey there! I am on Fireupp.').slice(0, 300), avatar: avatar || null,
    avatarColor: colorFor(clean), kdfSalt, authSalt: salt, authHash: hashAuth(authKey, salt),
    publicKey, wrappedPrivateKey, wrappedVaultKey, createdAt: now(), lastSeen: now()
  }, 'u');
  res.json({ token: signToken(u.id), user: selfUser(u) });
}));

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, username, otp, authKey } = req.body || {};
  const u = findUserByEmailOrUsername(email || username);
  if (!u || !u.authHash || !u.authSalt) return bad(res, 'Invalid Google account credentials', 401);

  const calcHash = hashAuth(authKey, u.authSalt);
  const goodHashBuf = Buffer.from(u.authHash, 'hex');
  const calcHashBuf = Buffer.from(calcHash, 'hex');
  if (goodHashBuf.length !== calcHashBuf.length || !crypto.timingSafeEqual(goodHashBuf, calcHashBuf)) {
    return bad(res, 'Invalid Google account credentials', 401);
  }

  const userEmail = (u.email || `${u.username}@gmail.com`).toLowerCase();
  if (!consumeOtp(userEmail, 'login', otp)) return bad(res, 'Invalid or expired Gmail verification code', 401);

  store.update('users', u.id, { lastSeen: now() });
  res.json({ token: signToken(u.id), user: selfUser(u) });
});

app.post('/api/auth/delete-account', auth, (req, res) => {
  const { verificationToken, googleConfirmed, email } = req.body || {};
  const userEmail = (req.user.email || `${req.user.username}@gmail.com`).toLowerCase();

  if (!googleConfirmed && !verificationToken) {
    return bad(res, 'Google authentication is required to delete your account.', 400);
  }
  if (verificationToken) {
    const verified = consumeVerificationToken(verificationToken, userEmail, 'delete-account');
    if (!verified) {
      return bad(res, 'Verification link was invalid or expired.', 403);
    }
  } else if (googleConfirmed) {
    if (!email) {
      return bad(res, 'Google account email is required to verify deletion.', 400);
    }
    if (userEmail && email.toLowerCase() !== userEmail) {
      return bad(res, `Google account (${email}) does not match registered account email (${userEmail}).`, 403);
    }
  }

  const uid = req.uid;
  store.find('workspace', w => w.ownerId === uid).forEach(w => store.remove('workspace', w.id));
  store.find('statuses', s => s.userId === uid).forEach(s => store.remove('statuses', s.id));
  store.find('calls', c => c.callerId === uid || (c.recipientIds || []).includes(uid)).forEach(c => store.remove('calls', c.id));
  store.find('chats', c => c.ownerId === uid && c.type === 'self').forEach(c => store.remove('chats', c.id));
  store.find('chats', c => c.members?.includes(uid) || c.followers?.includes(uid)).forEach(c => {
    store.update('chats', c.id, x => {
      x.members = (x.members || []).filter(m => m !== uid);
      x.followers = (x.followers || []).filter(f => f !== uid);
      x.admins = (x.admins || []).filter(a => a !== uid);
    });
  });
  // Remove from friends lists of all peers
  store.all('users').forEach(u => {
    if ((u.friends || []).includes(uid)) {
      store.update('users', u.id, x => {
        x.friends = (x.friends || []).filter(f => f !== uid);
      });
    }
  });
  store.remove('users', uid);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json(selfUser(req.user)));
app.patch('/api/me', auth, (req, res) => {
  const { name, username, bio, avatar, avatarColor, phone, pronouns, location, statusText, prefs, preferences, friends, blockedUsers, mutedChats, statusPrivacy, bioPrivacy, phonePrivacy, mentionPrivacy, customUsernameSet } = req.body || {};
  const patch = {};
  if (customUsernameSet !== undefined) patch.customUsernameSet = Boolean(customUsernameSet);
  if (name) patch.name = String(name).trim().slice(0, 64);
  if (username) {
    const clean = String(username).trim().toLowerCase();
    if (clean !== req.user.username) {
      if (req.user.lastUsernameChange && req.user.customUsernameSet !== false) {
        const elapsed = Date.now() - req.user.lastUsernameChange;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (elapsed < thirtyDaysMs) {
          const daysLeft = Math.ceil((thirtyDaysMs - elapsed) / (24 * 60 * 60 * 1000));
          return bad(res, `Username can only be changed once every 30 days. You can change it again in ${daysLeft} day(s).`, 400);
        }
      }
      if (!/^[a-z0-9_]{3,32}$/.test(clean)) return bad(res, 'Username must be 3–32 letters, numbers or underscores');
      const clash = store.findOne('users', u => String(u.username || '').toLowerCase() === clean && u.id !== req.uid);
      if (clash) return bad(res, 'Username is already taken', 409);
      patch.username = clean;
      patch.lastUsernameChange = Date.now();
      patch.customUsernameSet = true;
      if (!req.user.avatarColor || req.user.avatarColor === colorFor(req.user.username)) {
        patch.avatarColor = colorFor(clean);
      }
    } else {
      patch.customUsernameSet = true;
    }
  }
  if (bio !== undefined) patch.bio = String(bio).slice(0, 300);
  if (avatar !== undefined) patch.avatar = (avatar && String(avatar).startsWith('data:image/')) ? String(avatar).slice(0, 400000) : null;
  if (avatarColor && /^#[0-9a-f]{6}$/i.test(avatarColor)) patch.avatarColor = avatarColor;
  if (phone !== undefined) patch.phone = String(phone).slice(0, 40);
  if (pronouns !== undefined) patch.pronouns = String(pronouns).slice(0, 40);
  if (location !== undefined) patch.location = String(location).slice(0, 80);
  if (statusText !== undefined) patch.statusText = String(statusText).slice(0, 120);

  if (Array.isArray(friends)) patch.friends = [...new Set(friends.map(String))];
  if (Array.isArray(blockedUsers)) patch.blockedUsers = [...new Set(blockedUsers.map(String))];
  if (Array.isArray(mutedChats)) patch.mutedChats = [...new Set(mutedChats.map(String))];
  if (statusPrivacy && typeof statusPrivacy === 'object') {
    const validModes = ['friends', 'friends_except', 'only_share_with', 'everyone'];
    patch.statusPrivacy = {
      mode: validModes.includes(statusPrivacy.mode) ? statusPrivacy.mode : 'friends',
      exceptIds: Array.isArray(statusPrivacy.exceptIds) ? [...new Set(statusPrivacy.exceptIds.map(String))] : [],
      onlyIds: Array.isArray(statusPrivacy.onlyIds) ? [...new Set(statusPrivacy.onlyIds.map(String))] : []
    };
  }
  if (bioPrivacy && typeof bioPrivacy === 'object') {
    const validModes = ['friends', 'friends_except', 'only_share_with', 'everyone'];
    patch.bioPrivacy = {
      mode: validModes.includes(bioPrivacy.mode) ? bioPrivacy.mode : 'friends',
      exceptIds: Array.isArray(bioPrivacy.exceptIds) ? [...new Set(bioPrivacy.exceptIds.map(String))] : [],
      onlyIds: Array.isArray(bioPrivacy.onlyIds) ? [...new Set(bioPrivacy.onlyIds.map(String))] : []
    };
  }
  if (phonePrivacy && typeof phonePrivacy === 'object') {
    const validModes = ['friends', 'friends_except', 'only_share_with', 'everyone', 'nobody'];
    patch.phonePrivacy = {
      mode: validModes.includes(phonePrivacy.mode) ? phonePrivacy.mode : 'friends',
      exceptIds: Array.isArray(phonePrivacy.exceptIds) ? [...new Set(phonePrivacy.exceptIds.map(String))] : [],
      onlyIds: Array.isArray(phonePrivacy.onlyIds) ? [...new Set(phonePrivacy.onlyIds.map(String))] : []
    };
  }
  if (mentionPrivacy && typeof mentionPrivacy === 'object') {
    const validModes = ['friends', 'friends_except', 'only_share_with', 'everyone', 'nobody'];
    patch.mentionPrivacy = {
      mode: validModes.includes(mentionPrivacy.mode) ? mentionPrivacy.mode : 'everyone',
      exceptIds: Array.isArray(mentionPrivacy.exceptIds) ? [...new Set(mentionPrivacy.exceptIds.map(String))] : [],
      onlyIds: Array.isArray(mentionPrivacy.onlyIds) ? [...new Set(mentionPrivacy.onlyIds.map(String))] : []
    };
  }

  const mergedPrefs = preferences || prefs;
  if (mergedPrefs && typeof mergedPrefs === 'object') {
    const current = req.user.preferences || req.user.prefs || {};
    patch.preferences = { ...current, ...mergedPrefs };
    patch.prefs = patch.preferences;
  }

  const u = store.update('users', req.uid, patch);
  if (patch.statusPrivacy) {
    // Also update active statuses of this user to match their new default privacy
    store.find('statuses', s => s.userId === req.uid).forEach(s => {
      store.update('statuses', s.id, { privacy: patch.statusPrivacy });
    });
    broadcastAll({ type: 'statuses:refresh' });
  }
  if (patch.name || patch.username || patch.avatar || patch.avatarColor) {
    store.find('chats', c => c.members?.includes(req.uid) && !(c.deletedBy || []).includes(req.uid)).forEach(c => pushChat(c));
  }
  res.json(selfUser(u));
});

// Toggle Mark as Friend
app.post('/api/friends/toggle', auth, (req, res) => {
  const targetId = String(req.body?.userId || '').trim();
  const target = store.get('users', targetId);
  if (!target || targetId === req.uid) return bad(res, 'User not found', 404);
  const curFriends = Array.isArray(req.user.friends) ? req.user.friends : [];
  const isFriend = !curFriends.includes(targetId);
  const nextFriends = isFriend ? [...new Set([...curFriends, targetId])] : curFriends.filter(id => id !== targetId);
  const u = store.update('users', req.uid, { friends: nextFriends });

  // If marking as friend, also ensure any DM chat with them is marked accepted
  const dm = store.findOne('chats', c => c.type === 'dm' && c.members?.includes(req.uid) && c.members?.includes(targetId));
  if (dm) {
    if (isFriend && !(dm.acceptedBy || []).includes(req.uid)) {
      store.update('chats', dm.id, c => {
        c.acceptedBy = [...new Set([...(c.acceptedBy || [c.ownerId]), req.uid])];
      });
    }
    pushChat(store.get('chats', dm.id));
  }

  send(req.uid, { type: 'user:self', user: selfUser(u) });
  send(targetId, { type: 'statuses:refresh' });
  res.json({ ok: true, isFriend, friends: nextFriends, user: selfUser(u) });
});

// Block or Unblock User
app.post('/api/users/block', auth, (req, res) => {
  const targetId = String(req.body?.userId || '').trim();
  const target = store.get('users', targetId);
  if (!target || targetId === req.uid) return bad(res, 'User not found', 404);
  const curBlocked = Array.isArray(req.user.blockedUsers) ? req.user.blockedUsers : [];
  const forceBlock = req.body?.block;
  const isBlocked = forceBlock !== undefined ? Boolean(forceBlock) : !curBlocked.includes(targetId);
  const nextBlocked = isBlocked ? [...new Set([...curBlocked, targetId])] : curBlocked.filter(id => id !== targetId);
  const curFriends = Array.isArray(req.user.friends) ? req.user.friends : [];
  const nextFriends = isBlocked ? curFriends.filter(id => id !== targetId) : curFriends;

  const u = store.update('users', req.uid, { blockedUsers: nextBlocked, friends: nextFriends });
  const dm = store.findOne('chats', c => c.type === 'dm' && c.members?.includes(req.uid) && c.members?.includes(targetId));
  if (dm) pushChat(dm);

  send(req.uid, { type: 'user:self', user: selfUser(u) });
  send(req.uid, { type: 'statuses:refresh' });
  send(targetId, { type: 'statuses:refresh' });
  res.json({ ok: true, isBlocked, blockedUsers: nextBlocked, friends: nextFriends, user: selfUser(u) });
});

// Real-time username availability checker
app.get('/api/users/check-username', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const uid = token ? verifyToken(token) : null;
  const user = uid ? store.get('users', uid) : null;
  const raw = String(req.query.username || '').trim().toLowerCase();
  if (!raw) return res.json({ ok: false, available: false, error: 'Username cannot be blank' });
  if (!/^[a-z0-9_]{3,32}$/.test(raw)) {
    return res.json({ ok: false, available: false, error: '3–32 characters (letters, numbers and _)' });
  }
  if (user && raw === String(user.username || '').toLowerCase()) {
    return res.json({ ok: true, available: true, isCurrent: true, message: 'Current username' });
  }
  const clash = store.findOne('users', u => String(u.username || '').toLowerCase() === raw && (!user || u.id !== user.id));
  if (clash) {
    return res.json({ ok: true, available: false, error: 'Username is already taken' });
  }
  return res.json({ ok: true, available: true, message: 'Username is available' });
});

// ---------- users ----------
app.get('/api/users', auth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  res.json(store.find('users', u => u.id !== req.uid && (!q || (u.username || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)))
    .slice(0, 50).map(u => publicUser(u, req.uid)));
});
app.post('/api/users/lookup', auth, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  res.json(ids.map(id => publicUser(store.get('users', id), req.uid)).filter(Boolean));
});

// ---------- chats ----------
app.get('/api/chats', auth, (req, res) => {
  const mine = store.find('chats', c => {
    if ((c.deletedBy || []).includes(req.uid)) return false;
    const isMember = (c.members?.includes(req.uid) || c.followers?.includes(req.uid) || c.admins?.includes(req.uid) || c.ownerId === req.uid);
    if (!isMember) return false;
    // For DMs: If current user did not initiate this DM (ownerId !== req.uid) and hasn't accepted it yet,
    // do not show empty draft DMs (with 0 messages) to them!
    if (c.type === 'dm' && c.ownerId !== req.uid && !(c.acceptedBy || []).includes(req.uid)) {
      const msgs = messagesOf(c.id);
      if (!msgs.length) return false;
    }
    return true;
  });
  res.json(mine.map(c => chatView(c, req.uid)).sort((a, b) => b.updatedAt - a.updatedAt));
});

function createKeyedChat(req, res, { type, name, description, emoji, members, keys }) {
  for (const m of members) if (!validBox(keys?.[m])) { bad(res, 'Missing encrypted chat key for a member'); return null; }
  return store.insert('chats', {
    type, name, description: description || '', emoji: emoji || '', avatarColor: colorFor(name || members.join()),
    ownerId: req.uid, admins: type === 'group' ? [req.uid] : [], members, keyVersion: 1,
    acceptedBy: [req.uid], deletedBy: [],
    keys: { 1: Object.fromEntries(members.map(m => [m, keys[m]])) }, settings: { onlyAdmins: false }, createdAt: now()
  }, 'c');
}

app.post('/api/chats/self', auth, (req, res) => {
  let existing = store.findOne('chats', c => c.type === 'self' && c.ownerId === req.uid);
  if (existing) {
    if ((existing.deletedBy || []).includes(req.uid)) {
      if (req.body?.create || req.query?.create) {
        store.update('chats', existing.id, c => {
          c.deletedBy = (c.deletedBy || []).filter(u => u !== req.uid);
        });
        existing = store.get('chats', existing.id);
      }
    }
    if (req.body?.keys && validBox(req.body.keys[req.uid])) {
      store.update('chats', existing.id, c => {
        c.keys = c.keys || {};
        c.keys[c.keyVersion || 1] = { [req.uid]: req.body.keys[req.uid] };
      });
      existing = store.get('chats', existing.id);
    }
    return res.json(chatView(existing, req.uid));
  }
  const chat = createKeyedChat(req, res, { type: 'self', name: 'Saved Messages', members: [req.uid], keys: req.body.keys });
  if (chat) res.json(chatView(chat, req.uid));
});

app.post('/api/chats/dm', auth, (req, res) => {
  const other = store.get('users', req.body.userId);
  if (!other || other.id === req.uid) return bad(res, 'User not found', 404);
  const existing = store.findOne('chats', c => c.type === 'dm' && c.members.includes(req.uid) && c.members.includes(other.id));
  if (existing) {
    if ((existing.deletedBy || []).includes(req.uid)) {
      store.update('chats', existing.id, c => {
        c.deletedBy = (c.deletedBy || []).filter(u => u !== req.uid);
        c.acceptedBy = [...new Set([...(c.acceptedBy || [c.ownerId]), req.uid])];
      });
    }
    return res.json(chatView(store.get('chats', existing.id), req.uid));
  }
  const chat = createKeyedChat(req, res, { type: 'dm', name: '', members: [req.uid, other.id], keys: req.body.keys });
  if (!chat) return;
  // Only push to the initiator/creator so they have the draft chat open.
  // The recipient will only receive the chat when the first message is sent!
  send(req.uid, { type: 'chat:upsert', chat: chatView(chat, req.uid) });
  res.json(chatView(chat, req.uid));
});

app.post('/api/chats/group', auth, (req, res) => {
  const { name, description, emoji, memberIds = [], keys } = req.body || {};
  if (!String(name || '').trim()) return bad(res, 'Group name is required');
  const members = [...new Set([req.uid, ...memberIds.filter(id => store.get('users', id))])];
  const chat = createKeyedChat(req, res, { type: 'group', name: String(name).trim().slice(0, 64), description, emoji, members, keys });
  if (!chat) return;
  systemMsg(chat, `${req.user.name} created the group`);
  pushChat(chat);
  res.json(chatView(chat, req.uid));
});

function loadChat(req, res, { admin = false, types } = {}) {
  const chat = store.get('chats', req.params.id);
  if (!chat || !canRead(chat, req.uid)) { bad(res, 'Chat not found', 404); return null; }
  if (types && !types.includes(chat.type)) { bad(res, 'Not supported for this chat'); return null; }
  if (admin && !isAdmin(chat, req.uid)) { bad(res, 'Only admins can do that', 403); return null; }
  return chat;
}

app.patch('/api/chats/:id', auth, (req, res) => {
  const chat = loadChat(req, res, { admin: true, types: ['group', 'channel'] });
  if (!chat) return;
  const { name, description, emoji, settings, avatar, avatarColor } = req.body || {};
  const patch = {};
  if (name) patch.name = String(name).trim().slice(0, 64);
  if (description !== undefined) patch.description = String(description).slice(0, 500);
  if (emoji !== undefined) patch.emoji = String(emoji).slice(0, 8);
  if (avatar !== undefined) patch.avatar = avatar ? String(avatar) : null;
  if (avatarColor) patch.avatarColor = String(avatarColor).slice(0, 16);
  if (settings) patch.settings = { ...chat.settings, onlyAdmins: !!settings.onlyAdmins };
  store.update('chats', chat.id, patch);
  if (name && name !== chat.name && chat.type === 'group') systemMsg(chat, `${req.user.name} renamed the group to “${patch.name}”`);
  if (avatar !== undefined && chat.type === 'group') systemMsg(chat, `${req.user.name} updated the group logo`);
  const updated = store.get('chats', chat.id);
  pushChat(updated);
  res.json(chatView(updated, req.uid));
});

// Toggle pin chat in list (Max 5 pinned chats per user)
app.post('/api/chats/:id/pin-chat', auth, (req, res) => {
  const chat = store.get('chats', req.params.id);
  if (!chat || !canRead(chat, req.uid)) return bad(res, 'Chat not found', 404);
  const user = store.get('users', req.uid);
  if (!user) return bad(res, 'User not found', 404);
  const pinned = user.pinnedChats || [];
  const isPinned = pinned.includes(chat.id);
  let nextPinned;
  if (isPinned) {
    nextPinned = pinned.filter(id => id !== chat.id);
  } else {
    if (pinned.length >= 5) {
      return bad(res, 'You can only pin up to 5 chats. Unpin one to pin another.', 400);
    }
    nextPinned = [...pinned, chat.id];
  }
  store.update('users', req.uid, u => {
    u.pinnedChats = nextPinned;
  });
  res.json({ ok: true, isPinnedChat: !isPinned, pinnedChats: nextPinned });
});

// Accept DM or Group Request ("Continue to Chat")
app.post('/api/chats/:id/accept', auth, (req, res) => {
  const chat = loadChat(req, res, { types: ['dm', 'group'] });
  if (!chat) return;
  store.update('chats', chat.id, c => {
    c.acceptedBy = [...new Set([...(c.acceptedBy || [c.ownerId]), req.uid])];
    c.deletedBy = (c.deletedBy || []).filter(u => u !== req.uid);
  });
  const updated = store.get('chats', chat.id);
  pushChat(updated);
  res.json(chatView(updated, req.uid));
});

// Block Group Chat
app.post('/api/chats/:id/block-group', auth, (req, res) => {
  const chat = loadChat(req, res, { types: ['group'] });
  if (!chat) return;
  store.update('users', req.uid, u => {
    u.blockedGroups = [...new Set([...(u.blockedGroups || []), chat.id])];
  });
  store.update('chats', chat.id, c => {
    c.members = (c.members || []).filter(m => m !== req.uid);
    c.admins = (c.admins || []).filter(a => a !== req.uid);
    c.acceptedBy = (c.acceptedBy || []).filter(a => a !== req.uid);
  });
  const updatedChat = store.get('chats', chat.id);
  systemMsg(updatedChat, `${req.user.name} left`);
  pushChat(updatedChat);
  send(req.uid, { type: 'chat:removed', chatId: chat.id });
  res.json({ ok: true, blockedGroups: store.get('users', req.uid)?.blockedGroups || [] });
});

// Unblock Group
app.post('/api/users/unblock-group', auth, (req, res) => {
  const groupId = req.body?.groupId;
  if (!groupId) return bad(res, 'groupId required');
  store.update('users', req.uid, u => {
    u.blockedGroups = (u.blockedGroups || []).filter(id => id !== groupId);
  });
  res.json({ ok: true, blockedGroups: store.get('users', req.uid)?.blockedGroups || [] });
});

// Mute / Unmute Chat
app.post('/api/chats/:id/mute', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  const curMuted = Array.isArray(req.user.mutedChats) ? req.user.mutedChats : [];
  const muted = req.body?.muted !== undefined ? Boolean(req.body.muted) : !curMuted.includes(chat.id);
  const nextMuted = muted ? [...new Set([...curMuted, chat.id])] : curMuted.filter(id => id !== chat.id);
  const u = store.update('users', req.uid, { mutedChats: nextMuted });
  send(req.uid, { type: 'user:self', user: selfUser(u) });
  send(req.uid, { type: 'chat:upsert', chat: chatView(chat, req.uid) });
  res.json({ ok: true, muted, mutedChats: nextMuted, chat: chatView(chat, req.uid) });
});

// Clear Chat History for current user
app.post('/api/chats/:id/clear', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  messagesOf(chat.id).forEach(m => {
    if (!(m.deletedFor || []).includes(req.uid)) {
      store.update('messages', m.id, x => {
        x.deletedFor = [...(x.deletedFor || []), req.uid];
      });
    }
  });
  send(req.uid, { type: 'chat:upsert', chat: chatView(chat, req.uid) });
  res.json({ ok: true, chat: chatView(chat, req.uid) });
});

app.delete('/api/chats/:id', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  if (chat.type === 'dm' || chat.type === 'self') {
    messagesOf(chat.id).forEach(m => {
      if (!(m.deletedFor || []).includes(req.uid)) {
        store.update('messages', m.id, x => {
          x.deletedFor = [...(x.deletedFor || []), req.uid];
        });
      }
    });
    store.update('chats', chat.id, c => {
      c.deletedBy = [...new Set([...(c.deletedBy || []), req.uid])];
    });
    send(req.uid, { type: 'chat:removed', chatId: chat.id });
    return res.json({ ok: true });
  }
  if (chat.type === 'group') {
    if (chat.ownerId === req.uid) {
      const aud = audience(chat);
      messagesOf(chat.id).forEach(m => store.remove('messages', m.id));
      store.remove('chats', chat.id);
      aud.forEach(uid => send(uid, { type: 'chat:removed', chatId: chat.id }));
      return res.json({ ok: true });
    } else {
      store.update('chats', chat.id, c => {
        c.members = (c.members || []).filter(m => m !== req.uid);
        c.admins = (c.admins || []).filter(a => a !== req.uid);
      });
      systemMsg(chat, `${req.user.name} left the group`);
      send(req.uid, { type: 'chat:removed', chatId: chat.id });
      pushChat(store.get('chats', chat.id));
      return res.json({ ok: true });
    }
  }
  if (chat.type === 'channel') {
    if (isAdmin(chat, req.uid) && chat.ownerId === req.uid) {
      const aud = audience(chat);
      messagesOf(chat.id).forEach(m => store.remove('messages', m.id));
      store.remove('chats', chat.id);
      aud.forEach(uid => send(uid, { type: 'chat:removed', chatId: chat.id }));
      return res.json({ ok: true });
    } else {
      store.update('chats', chat.id, c => {
        c.followers = (c.followers || []).filter(f => f !== req.uid);
        c.admins = (c.admins || []).filter(a => a !== req.uid);
      });
      send(req.uid, { type: 'chat:removed', chatId: chat.id });
      pushChat(store.get('chats', chat.id));
      return res.json({ ok: true });
    }
  }
  res.json({ ok: true });
});

app.post('/api/chats/:id/members', auth, (req, res) => {
  const chat = loadChat(req, res, { admin: true, types: ['group'] });
  if (!chat) return;
  const rawIds = (req.body.userIds || []).filter(id => store.get('users', id) && !chat.members.includes(id));
  const ids = rawIds.filter(id => {
    const u = store.get('users', id);
    return !(u.blockedGroups || []).includes(chat.id);
  });
  if (rawIds.length > 0 && ids.length === 0) return bad(res, 'Target user has blocked this group');
  const keys = req.body.keys || {};
  for (const id of ids) if (!validBox(keys[id])) return bad(res, 'Missing encrypted chat key for a new member');
  store.update('chats', chat.id, c => {
    c.members.push(...ids);
    ids.forEach(id => { c.keys[c.keyVersion][id] = keys[id]; });
  });
  if (ids.length) systemMsg(chat, `${req.user.name} added ${ids.map(id => store.get('users', id).name).join(', ')}`);
  const updated = store.get('chats', chat.id);
  pushChat(updated);
  res.json(chatView(updated, req.uid));
});

app.post('/api/chats/:id/remove', auth, (req, res) => {
  const chat = loadChat(req, res, { types: ['group'] });
  if (!chat) return;
  const target = req.body.userId;
  const self = target === req.uid;
  if (!chat.members.includes(target)) return bad(res, 'Not a member');
  if (!self && !isAdmin(chat, req.uid)) return bad(res, 'Only admins can remove members', 403);
  if (!self && target === chat.ownerId) return bad(res, 'The owner cannot be removed', 403);
  const remaining = chat.members.filter(m => m !== target);
  const rotate = req.body.rotate;
  if (remaining.length) {
    if (!rotate || rotate.version !== chat.keyVersion + 1) return bad(res, 'A rotated group key is required');
    for (const m of remaining) if (!validBox(rotate.keys?.[m])) return bad(res, 'Rotated key missing for a member');
  }
  store.update('chats', chat.id, c => {
    c.members = remaining;
    c.admins = (c.admins || []).filter(a => a !== target);
    if (c.ownerId === target) c.ownerId = c.admins[0] || remaining[0];
    if (c.ownerId && !c.admins.includes(c.ownerId)) c.admins.push(c.ownerId);
    if (remaining.length) { c.keyVersion = rotate.version; c.keys[rotate.version] = rotate.keys; }
  });
  const name = store.get('users', target)?.name || 'Someone';
  systemMsg(chat, self ? `${name} left` : `${req.user.name} removed ${name}`);
  send(target, { type: 'chat:removed', chatId: chat.id });
  pushChat(chat);
  res.json({ ok: true });
});

app.post('/api/chats/:id/admins', auth, (req, res) => {
  const chat = loadChat(req, res, { admin: true, types: ['group', 'channel'] });
  if (!chat) return;
  const { userId, admin } = req.body || {};
  const pool = chat.type === 'channel' ? chat.followers : chat.members;
  if (!pool.includes(userId) && userId !== chat.ownerId) return bad(res, 'Not a member/follower');
  if (userId === chat.ownerId && !admin) return bad(res, 'The owner is always an admin');
  store.update('chats', chat.id, c => {
    c.admins = admin ? [...new Set([...(c.admins || []), userId])] : (c.admins || []).filter(a => a !== userId);
    if (chat.type === 'channel' && admin && !c.followers.includes(userId)) c.followers.push(userId);
  });
  if (chat.type === 'group') {
    systemMsg(chat, `${store.get('users', userId)?.name} is ${admin ? 'now an admin' : 'no longer an admin'}`);
  }
  const updated = store.get('chats', chat.id);
  pushChat(updated, [userId]);
  audience(updated).forEach(uid => send(uid, { type: 'chat:upsert', chat: chatView(updated, uid) }));
  res.json(chatView(updated, req.uid));
});

// ---------- messages ----------
app.get('/api/chats/:id/messages', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  const before = +req.query.before || Infinity;
  const msgs = messagesOf(chat.id).filter(m => m.ts < before && !(m.deletedFor || []).includes(req.uid));
  res.json(msgs.slice(-200).map(msgView));
});

app.post('/api/chats/:id/messages', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  const b = req.body || {};
  if (chat.type === 'dm') {
    const peerId = (chat.members || []).find(id => id !== req.uid);
    const peer = peerId ? store.get('users', peerId) : null;
    if ((req.user.blockedUsers || []).includes(peerId)) {
      return bad(res, 'You have blocked this user. Unblock them to send messages.', 403);
    }
    if (peer && (peer.blockedUsers || []).includes(req.uid)) {
      return bad(res, 'Cannot send message — this user has blocked messages from you.', 403);
    }
    // Ensure sender has accepted and un-hide chat if either party had deleted it
    store.update('chats', chat.id, c => {
      c.acceptedBy = [...new Set([...(c.acceptedBy || [c.ownerId]), req.uid])];
      c.deletedBy = [];
    });
  }
  if (chat.type === 'channel') {
    if (!isAdmin(chat, req.uid)) return bad(res, 'Only channel admins can post', 403);
    if (typeof b.body !== 'object') return bad(res, 'Missing body');
  } else {
    if (chat.type === 'group' && chat.settings?.onlyAdmins && !isAdmin(chat, req.uid)) return bad(res, 'Only admins can send messages in this group', 403);
    if (!b.iv || !b.ct) return bad(res, 'Messages must be end-to-end encrypted');
    const expVer = chat.keyVersion || 1;
    if (chat.type !== 'self' && (b.keyVersion || 1) !== expVer) return bad(res, 'Stale group key — reload the chat', 409);
  }
  const kinds = ['text', 'file', 'image', 'audio', 'video', 'location', 'live', 'poll', 'todo', 'music', 'contact', 'sticker', 'gif'];
  if (!kinds.includes(b.kind)) return bad(res, 'Unknown message kind');
  const m = store.insert('messages', {
    chatId: chat.id, senderId: req.uid, ts: now(), kind: b.kind,
    iv: b.iv, ct: b.ct, keyVersion: b.keyVersion, body: chat.type === 'channel' ? b.body : undefined,
    forwardedFrom: b.forwardedFrom ? String(b.forwardedFrom).slice(0, 64) : undefined,
    viewOnce: !!b.viewOnce, viewedBy: [], fileIds: Array.isArray(b.fileIds) ? b.fileIds.slice(0, 10) : [],
    pollMulti: !!b.pollMulti, votes: {}, checks: {}, reactions: {}, readBy: [req.uid], replyTo: b.replyTo || null,
    live: b.kind === 'live' ? { iv: b.iv, ct: b.ct, until: now() + Math.min(+b.liveMinutes || 15, 480) * 60000, ended: false } : undefined,
    viewers: chat.type === 'channel' ? [] : undefined
  }, 'm');
  pushChat(store.get('chats', chat.id));
  pushMsg(chat, m, 'msg:new');
  res.json(msgView(m));
});

function loadMsg(req, res) {
  const m = store.get('messages', req.params.id);
  const chat = m && store.get('chats', m.chatId);
  if (!m || !canRead(chat, req.uid)) { bad(res, 'Message not found', 404); return []; }
  return [m, chat];
}

app.post('/api/messages/:id/react', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  const emoji = String(req.body.emoji || '').slice(0, 16);
  if (!emoji) return bad(res, 'emoji required');
  store.update('messages', m.id, x => {
    const alreadyHadThis = (x.reactions[emoji] || []).includes(req.uid);
    // Remove user from all existing reactions on this message (enforce max 1 reaction per user)
    for (const k of Object.keys(x.reactions)) {
      x.reactions[k] = x.reactions[k].filter(u => u !== req.uid);
      if (!x.reactions[k].length) delete x.reactions[k];
    }
    // If they clicked a new emoji, add it
    if (!alreadyHadThis) {
      x.reactions[emoji] = [...(x.reactions[emoji] || []), req.uid];
    }
  });
  pushMsg(chat, store.get('messages', m.id) || m);
  res.json({ ok: true });
});

app.post('/api/messages/:id/vote', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.kind !== 'poll') return bad(res, 'Not a poll');
  const opt = String(+req.body.option);
  const updated = store.update('messages', m.id, x => {
    if (!x.votes || typeof x.votes !== 'object') x.votes = {};
    const had = (x.votes[opt] || []).includes(req.uid);
    if (!x.pollMulti) for (const k of Object.keys(x.votes)) x.votes[k] = x.votes[k].filter(u => u !== req.uid);
    x.votes[opt] = had ? (x.votes[opt] || []).filter(u => u !== req.uid) : [...(x.votes[opt] || []), req.uid];
  });
  pushMsg(chat, updated || store.get('messages', m.id) || m);
  res.json({ ok: true });
});

app.post('/api/messages/:id/check', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.kind !== 'todo') return bad(res, 'Not a to-do list');
  const item = String(req.body.itemId || '').slice(0, 32);
  const updated = store.update('messages', m.id, x => {
    if (!x.checks || typeof x.checks !== 'object') x.checks = {};
    if (x.checks[item]) delete x.checks[item];
    else x.checks[item] = { by: req.uid, at: now() };
  });
  pushMsg(chat, updated || store.get('messages', m.id) || m);
  res.json({ ok: true });
});

app.post('/api/messages/:id/live', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.kind !== 'live' || m.senderId !== req.uid) return bad(res, 'Not your live location', 403);
  store.update('messages', m.id, x => {
    if (req.body.iv && req.body.ct) Object.assign(x.live, { iv: req.body.iv, ct: req.body.ct, at: now() });
    if (req.body.ended) x.live.ended = true;
  });
  pushMsg(chat, m);
  res.json({ ok: true });
});

app.delete('/api/messages/:id', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.senderId !== req.uid && (chat.type === 'dm' || !isAdmin(chat, req.uid))) return bad(res, 'You can only delete your own messages', 403);
  (m.fileIds || []).forEach(fid => {
    const f = store.get('files', fid);
    if (f && !f.deleted) { store.deleteChunks(fid, f.chunks); store.update('files', fid, { deleted: true }); }
  });
  store.update('messages', m.id, { deleted: true, deletedForEveryone: true, iv: null, ct: null, body: null, live: undefined, fileIds: [] });
  pushMsg(chat, m);
  res.json({ ok: true });
});

// Delete message for me
app.post('/api/messages/:id/delete-for-me', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  const currentDeletedFor = m.deletedFor || [];
  if (!currentDeletedFor.includes(req.uid)) {
    store.update('messages', m.id, x => {
      x.deletedFor = [...(x.deletedFor || []), req.uid];
    });
  }
  send(req.uid, { type: 'msg:delete-for-me', messageId: m.id, chatId: chat.id });
  res.json({ ok: true });
});

// Delete message for everyone
app.post('/api/messages/:id/delete-for-everyone', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.senderId !== req.uid && (chat.type === 'dm' || !isAdmin(chat, req.uid))) {
    return bad(res, 'Only the sender can delete this message for everyone in direct chats', 403);
  }
  (m.fileIds || []).forEach(fid => {
    const f = store.get('files', fid);
    if (f && !f.deleted) {
      store.deleteChunks(fid, f.chunks);
      store.update('files', fid, { deleted: true });
    }
  });
  store.update('messages', m.id, {
    deleted: true,
    deletedForEveryone: true,
    iv: null,
    ct: null,
    body: null,
    live: undefined,
    fileIds: []
  });
  pushMsg(chat, store.get('messages', m.id));
  res.json({ ok: true });
});

// Star message
app.post('/api/messages/:id/star', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  let starred = false;
  store.update('messages', m.id, x => {
    const list = x.starredBy || [];
    if (list.includes(req.uid)) {
      x.starredBy = list.filter(u => u !== req.uid);
      starred = false;
    } else {
      x.starredBy = [...list, req.uid];
      starred = true;
    }
  });
  pushMsg(chat, store.get('messages', m.id));
  res.json({ ok: true, starred });
});

// Pin message
app.post('/api/messages/:id/pin', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (chat.type !== 'dm' && chat.type !== 'self' && !isAdmin(chat, req.uid)) {
    return bad(res, 'Only admins can pin messages in this conversation', 403);
  }
  let isPinned = false;
  if (chat.pinnedMessageId === m.id) {
    store.update('chats', chat.id, { pinnedMessageId: null });
    store.update('messages', m.id, { isPinned: false });
    isPinned = false;
  } else {
    if (chat.pinnedMessageId) {
      store.update('messages', chat.pinnedMessageId, { isPinned: false });
    }
    store.update('chats', chat.id, { pinnedMessageId: m.id });
    store.update('messages', m.id, { isPinned: true });
    isPinned = true;
  }
  pushChat(store.get('chats', chat.id));
  pushMsg(chat, store.get('messages', m.id));
  res.json({ ok: true, isPinned, pinnedMessageId: store.get('chats', chat.id).pinnedMessageId });
});

// Edit message (Within 15 minutes of sending)
app.post('/api/messages/:id/edit', auth, (req, res) => {
  const [m, chat] = loadMsg(req, res);
  if (!m) return;
  if (m.senderId !== req.uid) return bad(res, 'You can only edit your own messages', 403);
  if (m.deleted) return bad(res, 'Cannot edit a deleted message', 400);

  const fifteenMinutes = 15 * 60 * 1000;
  if (now() - m.ts > fifteenMinutes) {
    return bad(res, 'Messages can only be edited within 15 minutes of sending', 403);
  }

  const { iv, ct, keyVersion, body } = req.body || {};
  const patch = {
    edited: true,
    editedAt: now()
  };

  if (chat.type === 'channel') {
    if (typeof body !== 'object') return bad(res, 'Missing body payload');
    patch.body = body;
  } else {
    if (!iv || !ct) return bad(res, 'Edited messages must be encrypted');
    patch.iv = iv;
    patch.ct = ct;
    if (keyVersion) patch.keyVersion = keyVersion;
  }

  store.update('messages', m.id, patch);
  const updated = store.get('messages', m.id);
  pushMsg(chat, updated, 'msg:update');
  res.json(msgView(updated));
});

// Translate message
app.post('/api/messages/:id/translate', auth, wrap(async (req, res) => {
  const [m] = loadMsg(req, res);
  if (!m) return;
  const targetLang = String(req.body.targetLang || 'en').trim().slice(0, 8);
  const text = String(req.body.text || '').trim();
  if (!text) return bad(res, 'No text provided for translation');

  if (m.translations && m.translations[targetLang]) {
    return res.json({ ok: true, translatedText: m.translations[targetLang], targetLang });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) throw new Error(`Translation status ${r.status}`);
    const data = await r.json();
    let translated = '';
    if (Array.isArray(data?.[0])) {
      translated = data[0].map(item => item[0]).join('');
    }
    if (!translated) translated = text;
    store.update('messages', m.id, x => {
      x.translations = { ...(x.translations || {}), [targetLang]: translated };
    });
    return res.json({ ok: true, translatedText: translated, targetLang });
  } catch (err) {
    return bad(res, `Translation failed: ${err.message}`);
  }
}));

app.post('/api/chats/:id/read', auth, (req, res) => {
  const chat = loadChat(req, res);
  if (!chat) return;
  const changed = [];
  messagesOf(chat.id).forEach(m => {
    if (!(m.readBy || []).includes(req.uid)) {
      store.update('messages', m.id, x => { x.readBy = [...(x.readBy || []), req.uid]; });
      if (m.senderId !== req.uid) changed.push(m);
    }
  });
  if (chat.type !== 'channel') changed.slice(-20).forEach(m => pushMsg(chat, m));
  res.json({ ok: true, count: changed.length });
});

// ---------- channels ("Firecasts") ----------
app.get('/api/channels', auth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  res.json(store.find('chats', c => c.type === 'channel' && (!q || c.name.toLowerCase().includes(q) || c.handle.includes(q) || (c.description || '').toLowerCase().includes(q)))
    .sort((a, b) => (b.followers || []).length - (a.followers || []).length).slice(0, 60).map(c => chatView(c, req.uid)));
});

app.post('/api/channels', auth, (req, res) => {
  const { name, handle, description, emoji } = req.body || {};
  const h = String(handle || '').trim().toLowerCase();
  if (!String(name || '').trim()) return bad(res, 'Name is required');
  if (!/^[a-z0-9_]{3,32}$/.test(h)) return bad(res, 'Handle: 3–32 letters, numbers or underscores');
  if (store.findOne('chats', c => c.type === 'channel' && c.handle === h)) return bad(res, 'Handle already taken', 409);
  const chat = store.insert('chats', {
    type: 'channel', name: String(name).trim().slice(0, 64), handle: h, description: String(description || '').slice(0, 500),
    emoji: emoji || '🔥', avatarColor: colorFor(h), ownerId: req.uid, admins: [req.uid], members: [], followers: [req.uid],
    settings: {}, createdAt: now()
  }, 'c');
  pushChat(chat);
  res.json(chatView(chat, req.uid));
});

app.post('/api/channels/:id/follow', auth, (req, res) => {
  const chat = loadChat(req, res, { types: ['channel'] });
  if (!chat) return;
  const follow = req.body.follow !== false;
  if (!follow && chat.ownerId === req.uid) return bad(res, 'Owners cannot unfollow their own Firecast');
  store.update('chats', chat.id, c => {
    c.followers = follow ? [...new Set([...(c.followers || []), req.uid])] : (c.followers || []).filter(f => f !== req.uid);
    if (!follow) c.admins = (c.admins || []).filter(a => a !== req.uid);
  });
  pushChat(chat, [req.uid]);
  res.json(chatView(chat, req.uid));
});

app.post('/api/channels/:id/views', auth, (req, res) => {
  const chat = loadChat(req, res, { types: ['channel'] });
  if (!chat) return;
  (req.body.messageIds || []).slice(0, 200).forEach(id => {
    const m = store.get('messages', id);
    if (m && m.chatId === chat.id && !(m.viewers || []).includes(req.uid)) {
      store.update('messages', id, x => { x.viewers = [...(x.viewers || []), req.uid]; });
    }
  });
  res.json({ ok: true });
});

app.get('/api/channels/:id/followers', auth, (req, res) => {
  const chat = loadChat(req, res, { admin: true, types: ['channel'] });
  if (!chat) return;
  const ids = [...new Set([...(chat.followers || []), ...(chat.admins || []), chat.ownerId])];
  res.json(ids.map(id => publicUser(store.get('users', id))).filter(Boolean));
});

// ---------- FireStatus (24h Story Updates) ----------
const STATUS_TTL = 24 * 3600 * 1000;
function activeStatuses() {
  const cutoff = now() - STATUS_TTL;
  return store.find('statuses', s => s.createdAt > cutoff).sort((a, b) => a.createdAt - b.createdAt);
}

function canViewStatus(st, viewerId) {
  if (!st || !viewerId) return false;
  if (st.userId === viewerId) return true;
  const owner = store.get('users', st.userId);
  const viewer = store.get('users', viewerId);
  if (!owner || !viewer) return false;
  if ((owner.blockedUsers || []).includes(viewerId)) return false;
  if ((viewer.blockedUsers || []).includes(owner.id)) return false;
  if (Array.isArray(st.mentionedUserIds) && st.mentionedUserIds.includes(viewerId)) return true;

  const priv = st.privacy || owner.statusPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] };
  const mode = priv.mode || 'friends';
  const ownerFriends = Array.isArray(owner.friends) ? owner.friends : [];

  if (mode === 'everyone') return true;
  if (mode === 'only_share_with') {
    return Array.isArray(priv.onlyIds) && priv.onlyIds.includes(viewerId);
  }
  if (mode === 'friends_except') {
    const excluded = Array.isArray(priv.exceptIds) && priv.exceptIds.includes(viewerId);
    return ownerFriends.includes(viewerId) && !excluded;
  }
  // Default: 'friends' — strictly only visible to users marked as Friend!
  return ownerFriends.includes(viewerId);
}

function pushStatusToAllowed(st) {
  const full = { ...st, user: publicUser(store.get('users', st.userId)) };
  wss.clients.forEach(c => {
    if (c.uid && c.readyState === WebSocket.OPEN && canViewStatus(st, c.uid)) {
      c.send(JSON.stringify({ type: 'status:upsert', status: full }));
    }
  });
}

app.get('/api/statuses', auth, (req, res) => {
  const list = activeStatuses()
    .filter(s => canViewStatus(s, req.uid))
    .map(s => ({
      ...s,
      views: s.views || s.viewers || [],
      mediaData: s.mediaData || s.media || '',
      user: publicUser(store.get('users', s.userId))
    }))
    .filter(s => s.user);
  res.json(list);
});

app.post('/api/statuses', auth, (req, res) => {
  const { kind = 'text', text = '', bg = '', media = null, mediaData = null, caption = '', privacy = null, mentionedUserIds = [] } = req.body || {};
  const finalMedia = mediaData || media;
  if (!text && !finalMedia) return bad(res, 'Status content is required');
  const effectivePrivacy = (privacy && typeof privacy === 'object')
    ? {
        mode: ['friends', 'friends_except', 'only_share_with', 'everyone'].includes(privacy.mode) ? privacy.mode : 'friends',
        exceptIds: Array.isArray(privacy.exceptIds) ? privacy.exceptIds : [],
        onlyIds: Array.isArray(privacy.onlyIds) ? privacy.onlyIds : []
      }
    : (req.user.statusPrivacy || { mode: 'friends', exceptIds: [], onlyIds: [] });

  const allowedMentionedUserIds = (Array.isArray(mentionedUserIds) ? mentionedUserIds : []).filter(targetUid => {
    if (!targetUid || targetUid === req.uid) return false;
    const targetUser = store.get('users', targetUid);
    return targetUser && canMentionUser(targetUser, req.uid);
  });

  const st = store.insert('statuses', {
    userId: req.uid, kind, text: String(text).slice(0, 500), bg: String(bg).slice(0, 120),
    mediaData: finalMedia ? String(finalMedia).slice(0, 5000000) : '', caption: String(caption).slice(0, 240),
    mentionedUserIds: allowedMentionedUserIds,
    privacy: effectivePrivacy, views: [req.uid], reactions: {}, createdAt: now()
  }, 's');
  const full = { ...st, user: publicUser(req.user) };
  pushStatusToAllowed(st);

  // Dispatch Instagram-style Story Mention DM into the recipient's FireChat
  if (allowedMentionedUserIds.length > 0) {
    allowedMentionedUserIds.forEach(targetUid => {
      const targetUser = store.get('users', targetUid);
      if (!targetUser) return;

      // Find or create DM chat between author and mentioned user
      let chat = Array.from(store.all('chats').values()).find(c =>
        c.type === 'dm' && !c.isDeleted &&
        (c.members || []).some(m => (typeof m === 'object' ? m.id : m) === req.uid) &&
        (c.members || []).some(m => (typeof m === 'object' ? m.id : m) === targetUid)
      );

      if (!chat) {
        chat = store.insert('chats', {
          type: 'dm',
          ownerId: req.uid,
          members: [req.uid, targetUid],
          admins: [req.uid],
          createdAt: now(),
          updatedAt: now(),
          isAccepted: true
        }, 'c');
      }

      const m = store.insert('messages', {
        chatId: chat.id,
        senderId: req.uid,
        ts: now(),
        kind: 'story-mention',
        body: {
          storyId: st.id,
          authorName: req.user.name,
          authorId: req.uid,
          previewImg: finalMedia ? String(finalMedia).slice(0, 120000) : '',
          text: `🔥 Mentioned you in a FireStatus story!`
        },
        readBy: [req.uid],
        reactions: {}
      }, 'm');

      chat.lastMessage = msgView(m);
      chat.updatedAt = m.ts;
      store.update('chats', chat.id, () => chat);

      pushChat(chat);
      pushMsg(chat, m, 'msg:new');
    });
  }

  res.json(full);
});

app.post('/api/statuses/:id/view', auth, (req, res) => {
  const st = store.get('statuses', req.params.id);
  if (!st || !canViewStatus(st, req.uid)) return bad(res, 'Status not found', 404);
  const views = st.views || st.viewers || [];
  if (!views.includes(req.uid)) {
    store.update('statuses', st.id, x => { x.views = [...(x.views || x.viewers || []), req.uid]; });
    pushStatusToAllowed(store.get('statuses', st.id));
  }
  res.json({ ok: true });
});

app.post('/api/statuses/:id/react', auth, (req, res) => {
  const st = store.get('statuses', req.params.id);
  if (!st || !canViewStatus(st, req.uid)) return bad(res, 'Status not found', 404);
  const emoji = String(req.body.emoji || '🔥').slice(0, 8);
  store.update('statuses', st.id, x => {
    const r = x.reactions || {};
    for (const k of Object.keys(r)) {
      if (Array.isArray(r[k])) {
        r[k] = r[k].filter(u => u !== req.uid);
        if (!r[k].length) delete r[k];
      } else {
        delete r[k];
      }
    }
    r[emoji] = [...(r[emoji] || []), req.uid];
    x.reactions = r;
  });
  pushStatusToAllowed(store.get('statuses', st.id));
  res.json({ ok: true });
});

app.delete('/api/statuses/:id', auth, (req, res) => {
  const st = store.get('statuses', req.params.id);
  if (!st || (st.userId !== req.uid && st.user?.id !== req.uid)) return bad(res, 'Not found', 404);
  store.remove('statuses', st.id);
  broadcastAll({ type: 'status:removed', id: st.id });

  // Invalidate any story-mention messages linking to this deleted story
  try {
    const allMsgs = store.list('messages') || [];
    for (const m of allMsgs) {
      if (m.kind === 'story-mention') {
        const bodyObj = typeof m.body === 'object' && m.body ? m.body : {};
        if (bodyObj.storyId === st.id || m.storyId === st.id) {
          store.update('messages', m.id, x => {
            x.storyUnavailable = true;
            if (typeof x.body === 'object' && x.body) x.body.unavailable = true;
          });
          broadcastChat(m.chatId, { type: 'msg:edit', msg: store.get('messages', m.id) });
        }
      }
    }
  } catch (err) {
    console.warn('Error invalidating story mentions on delete:', err);
  }

  res.json({ ok: true });
});

// ---------- encrypted file transfer (chunked) ----------
app.post('/api/files', auth, (req, res) => {
  const { chatId, size, chunks, viewOnce } = req.body || {};
  const chat = store.get('chats', chatId);
  if (!chat || !(chat.members?.includes(req.uid) || (chat.type === 'channel' && isAdmin(chat, req.uid)))) return bad(res, 'Chat not found', 404);
  if (!(size > 0) || size > MAX_FILE) return bad(res, `Files must be between 1 byte and ${MAX_FILE / 1024 ** 3} GB`);
  if (chunks !== Math.ceil(size / CHUNK)) return bad(res, 'Bad chunk count');
  const f = store.insert('files', { ownerId: req.uid, chatId, size, chunks, uploaded: [], complete: false, viewOnce: !!viewOnce, viewedBy: [], createdAt: now() }, 'f');
  res.json({ id: f.id, chunkSize: CHUNK });
});

app.put('/api/files/:id/:n', auth, express.raw({ type: '*/*', limit: CHUNK + 4096 }), wrap(async (req, res) => {
  const f = store.get('files', req.params.id);
  const n = +req.params.n;
  if (!f || f.ownerId !== req.uid || f.complete) return bad(res, 'Upload not found', 404);
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
  if (!(n >= 0 && n < f.chunks) || !buf.length) return bad(res, 'Bad chunk');
  await store.putChunk(f.id, n, buf);
  store.update('files', f.id, x => { if (!x.uploaded.includes(n)) x.uploaded.push(n); });
  res.json({ ok: true });
}));

app.post('/api/files/:id/complete', auth, (req, res) => {
  const f = store.get('files', req.params.id);
  if (!f || f.ownerId !== req.uid) return bad(res, 'Upload not found', 404);
  if (f.uploaded.length !== f.chunks) return bad(res, `Only ${f.uploaded.length}/${f.chunks} chunks received`);
  store.update('files', f.id, { complete: true, uploaded: [] });
  res.json({ ok: true });
});

function loadFile(req, res) {
  const f = store.get('files', req.params.id);
  if (!f || !f.complete) { bad(res, 'File not found', 404); return null; }
  const chat = store.get('chats', f.chatId);
  let authorized = chat && canRead(chat, req.uid);
  if (!authorized) {
    // Also authorize if this file was forwarded into any chat req.uid can read
    const refMsg = store.findOne('messages', m => (m.fileIds || []).includes(f.id) && !m.deleted && !m.deletedForEveryone && canRead(store.get('chats', m.chatId), req.uid));
    if (refMsg) authorized = true;
  }
  if (!authorized) { bad(res, 'File not found', 404); return null; }
  if (f.deleted) { bad(res, 'This file is no longer available', 410); return null; }
  if (f.viewOnce && f.ownerId !== req.uid && (f.viewedBy || []).includes(req.uid)) { bad(res, 'View-once media was already opened', 410); return null; }
  return f;
}

app.get('/api/files/:id/:n', auth, wrap(async (req, res) => {
  const f = loadFile(req, res);
  if (!f) return;
  const n = +req.params.n;
  if (!(n >= 0 && n < f.chunks)) return bad(res, 'Bad chunk');
  res.set('Content-Type', 'application/octet-stream').send(await store.getChunk(f.id, n));
}));

app.post('/api/files/:id/viewed', auth, (req, res) => {
  const f = store.get('files', req.params.id);
  if (!f || !f.viewOnce || f.ownerId === req.uid) return res.json({ ok: true });
  const chat = store.get('chats', f.chatId);
  if (!canRead(chat, req.uid)) return bad(res, 'File not found', 404);
  store.update('files', f.id, x => { if (!x.viewedBy.includes(req.uid)) x.viewedBy.push(req.uid); });
  const m = store.findOne('messages', x => (x.fileIds || []).includes(f.id));
  if (m) {
    store.update('messages', m.id, x => { if (!x.viewedBy.includes(req.uid)) x.viewedBy.push(req.uid); });
    pushMsg(chat, m);
  }
  const others = (chat.members || []).filter(u => u !== f.ownerId);
  if (others.length && others.every(u => f.viewedBy.includes(u))) {
    store.deleteChunks(f.id, f.chunks);
    store.update('files', f.id, { deleted: true });
  }
  res.json({ ok: true });
});

// ---------- workspace (vault-encrypted, per user) ----------
const WS_TYPES = ['task', 'note', 'event', 'board'];
app.get('/api/workspace', auth, (req, res) => res.json(store.find('workspace', w => w.ownerId === req.uid)));
app.post('/api/workspace', auth, (req, res) => {
  const { type, iv, ct } = req.body || {};
  if (!WS_TYPES.includes(type) || !iv || !ct) return bad(res, 'Encrypted item required');
  res.json(store.insert('workspace', { ownerId: req.uid, type, iv, ct, createdAt: now(), updatedAt: now() }, 'w'));
});
app.put('/api/workspace/:id', auth, (req, res) => {
  const w = store.get('workspace', req.params.id);
  if (!w || w.ownerId !== req.uid) return bad(res, 'Not found', 404);
  if (!req.body.iv || !req.body.ct) return bad(res, 'Encrypted item required');
  res.json(store.update('workspace', w.id, { iv: req.body.iv, ct: req.body.ct, updatedAt: now() }));
});
app.delete('/api/workspace/:id', auth, (req, res) => {
  const w = store.get('workspace', req.params.id);
  if (!w || w.ownerId !== req.uid) return bad(res, 'Not found', 404);
  store.remove('workspace', w.id);
  res.json({ ok: true });
});

// ---------- meetings ----------
const meetingCode = () => {
  const a = 'abcdefghijkmnpqrstuvwxyz';
  const pick = n => Array.from(crypto.randomBytes(n), b => a[b % a.length]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
};
function meetingView(m) {
  return { ...m, host: publicUser(store.get('users', m.hostId)), live: (rooms.get(m.code)?.size || 0) };
}
app.get('/api/meetings', auth, (req, res) => {
  const currentMeetings = store.find('meetings', m => {
    const isUserInvolved = m.hostId === req.uid || (m.invitees || []).includes(req.uid) || (m.joined || []).includes(req.uid);
    if (!isUserInvolved) return false;
    // Scheduled meetings: show if in future or recent (within 24 hours)
    if (m.scheduledAt) {
      return m.scheduledAt > (now() - 24 * 3600 * 1000);
    }
    // Instant rooms: only show if currently active with peers OR created very recently (< 5 minutes)
    const isLive = (rooms.get(m.code)?.size || 0) > 0;
    const isRecent = m.createdAt > (now() - 5 * 60 * 1000);
    return isLive || isRecent;
  });
  res.json(currentMeetings
    .sort((a, b) => (a.scheduledAt || a.createdAt) - (b.scheduledAt || b.createdAt))
    .map(meetingView));
});
app.post('/api/meetings', auth, (req, res) => {
  const { title, scheduledAt, duration, invitees = [], code, chatId, mode } = req.body || {};
  const m = store.insert('meetings', {
    code: code ? String(code).toLowerCase() : meetingCode(),
    title: String(title || `${req.user.name}'s FireMeet`).slice(0, 100),
    hostId: req.uid,
    scheduledAt: scheduledAt ? +scheduledAt : null,
    duration: Math.min(+duration || 30, 480),
    invitees: invitees.filter(id => store.get('users', id) && id !== req.uid),
    joined: [],
    createdAt: now(),
    chatId: chatId || null,
    callMode: mode || 'audio'
  }, 'm');
  [req.uid, ...m.invitees].forEach(uid => send(uid, { type: 'meeting:upsert', meeting: meetingView(m) }));
  res.json(meetingView(m));
});
app.get('/api/meetings/code/:code', auth, (req, res) => {
  let raw = String(req.params.code || '').trim().toLowerCase();
  // Strip URL if user pasted a link (e.g. http://localhost:3000/meet/abc-defg-hij or meet/abc)
  raw = raw.replace(/^https?:\/\/[^/]+\/(meet\/)?/i, '').replace(/^meet\//i, '').replace(/[^a-z0-9-]/gi, '');
  if (!raw) return bad(res, 'Please enter a valid meeting code', 400);

  // Normalize 10-character code without hyphens to abc-defg-hij
  let formatted = raw;
  if (!raw.includes('-') && raw.length === 10) {
    formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  }

  let m = store.findOne('meetings', x =>
    x.code.toLowerCase() === raw ||
    x.code.toLowerCase() === formatted ||
    x.code.replace(/-/g, '').toLowerCase() === raw.replace(/-/g, '')
  );

  if (!m) {
    // Auto-create room for this code so anyone can share and join instant codes smoothly
    m = store.insert('meetings', {
      code: formatted,
      title: `${req.user.name}'s FireMeet`,
      hostId: req.uid,
      scheduledAt: null,
      duration: 60,
      invitees: [],
      joined: [req.uid],
      createdAt: now()
    }, 'g');
  } else {
    if (!m.joined) m.joined = [];
    if (!m.joined.includes(req.uid)) {
      store.update('meetings', m.id, x => {
        if (!x.joined) x.joined = [];
        x.joined.push(req.uid);
      });
    }
  }
  res.json(meetingView(m));
});
app.delete('/api/meetings/:id', auth, (req, res) => {
  const m = store.get('meetings', req.params.id);
  if (!m || m.hostId !== req.uid) return bad(res, 'Only the host can cancel a meeting', 403);
  store.remove('meetings', m.id);
  [m.hostId, ...m.invitees].forEach(uid => send(uid, { type: 'meeting:removed', id: m.id }));
  res.json({ ok: true });
});

// ---------- Giphy Integration Endpoints ----------
const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'OjvD9pt88p4XexOtyZVdrjbeJOx3777g';

app.get('/api/giphy/trending', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const rating = req.query.rating || 'g';
  const url = `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(GIPHY_API_KEY)}&limit=${limit}&offset=${offset}&rating=${rating}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return bad(res, `Giphy API error (${upstream.status})`, upstream.status);
    }
    const data = await upstream.json();
    const gifs = (data.data || []).map(g => ({
      id: g.id,
      title: g.title || 'Animated GIF',
      url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
      preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || g.images?.downsized_still?.url,
      width: parseInt(g.images?.fixed_height?.width, 10) || 200,
      height: parseInt(g.images?.fixed_height?.height, 10) || 200
    })).filter(g => Boolean(g.url));

    res.json({ ok: true, data: gifs, pagination: data.pagination || {} });
  } catch (err) {
    bad(res, `Failed to load GIFs: ${err.message}`, 502);
  }
}));

app.get('/api/giphy/search', wrap(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.json({ ok: true, data: [], pagination: {} });
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const rating = req.query.rating || 'g';
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_API_KEY)}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=${rating}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return bad(res, `Giphy API error (${upstream.status})`, upstream.status);
    }
    const data = await upstream.json();
    const gifs = (data.data || []).map(g => ({
      id: g.id,
      title: g.title || 'Animated GIF',
      url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
      preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || g.images?.downsized_still?.url,
      width: parseInt(g.images?.fixed_height?.width, 10) || 200,
      height: parseInt(g.images?.fixed_height?.height, 10) || 200
    })).filter(g => Boolean(g.url));

    res.json({ ok: true, data: gifs, pagination: data.pagination || {} });
  } catch (err) {
    bad(res, `Failed to load GIFs: ${err.message}`, 502);
  }
}));

// ---------------- FireCalls History Endpoints ----------------
app.get('/api/calls/history', auth, (req, res) => {
  cleanupExpiredCalls();
  const myCalls = store.find('calls', c =>
    c.callerId === req.uid || (c.recipientIds || []).includes(req.uid)
  );
  myCalls.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json(myCalls.map(c => callView(c, req.uid)));
});

app.delete('/api/calls/history', auth, (req, res) => {
  const myCalls = store.find('calls', c =>
    c.callerId === req.uid || (c.recipientIds || []).includes(req.uid)
  );
  myCalls.forEach(call => {
    store.remove('calls', call.id);
  });
  res.json({ ok: true, deleted: myCalls.length });
});

app.delete('/api/calls/history/:id', auth, (req, res) => {
  const call = store.get('calls', req.params.id);
  if (!call) return bad(res, 'Call record not found', 404);
  if (call.callerId !== req.uid && !(call.recipientIds || []).includes(req.uid)) {
    return bad(res, 'Forbidden', 403);
  }
  store.remove('calls', call.id);
  const participants = Array.from(new Set([call.callerId, ...(call.recipientIds || [])]));
  participants.forEach(uid => {
    send(uid, {
      type: 'call:history:deleted',
      callId: call.id
    });
  });
  res.json({ ok: true, id: call.id });
});

// ---------------- WebSocket ----------------
const wss = new WebSocketServer({ server, maxPayload: 15 * 1024 * 1024 });
const rooms = new Map();
const activeCalls = new Map(); // code -> { id, code, chatId, callerId, recipientIds, mode, status, createdAt, startedAt }

// 30-day auto-purge for FireCalls history records
function cleanupExpiredCalls() {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = now() - thirtyDaysMs;
  const expired = store.find('calls', c => (c.createdAt || c.ts || 0) < cutoff);
  expired.forEach(c => {
    store.remove('calls', c.id);
  });
  if (expired.length > 0) {
    console.log(`[FireCalls] Purged ${expired.length} call history record(s) older than 30 days.`);
  }
}

// Hourly purge job
cleanupExpiredCalls();
setInterval(cleanupExpiredCalls, 3600000).unref();

function callView(call, uid) {
  const isCaller = call.callerId === uid;
  const peerId = isCaller ? (call.recipientIds?.[0] || null) : call.callerId;
  const peerUser = peerId ? publicUser(store.get('users', peerId), uid) : null;
  const callerUser = publicUser(store.get('users', call.callerId), uid);
  return {
    id: call.id,
    code: call.code,
    chatId: call.chatId || null,
    mode: call.mode || 'audio',
    status: call.status || 'completed',
    duration: call.duration || 0,
    isCaller,
    direction: isCaller ? 'outgoing' : 'incoming',
    peer: peerUser,
    caller: callerUser,
    createdAt: call.createdAt || now(),
    startedAt: call.startedAt || null,
    endedAt: call.endedAt || null,
    expiresAt: (call.createdAt || now()) + (30 * 24 * 60 * 60 * 1000)
  };
}

function finalizeCall(code, updates = {}) {
  const call = activeCalls.get(code);
  if (!call) return null;
  activeCalls.delete(code);

  const endedAt = now();
  const startedAt = call.startedAt || null;
  let status = updates.status || (startedAt ? 'completed' : (updates.reason === 'decline' ? 'declined' : 'missed'));
  if (status === 'cancelled' && !call.callerId) status = 'missed';
  const duration = (startedAt && status === 'completed')
    ? Math.max(1, Math.round((endedAt - startedAt) / 1000))
    : (updates.duration || 0);

  const record = store.insert('calls', {
    code: call.code,
    chatId: call.chatId || null,
    callerId: call.callerId,
    recipientIds: call.recipientIds || [],
    mode: call.mode || 'audio',
    status,
    duration,
    createdAt: call.createdAt || now(),
    startedAt,
    endedAt
  }, 'call');

  // If tied to a chat, insert an in-chat call event message
  if (call.chatId) {
    const chat = store.get('chats', call.chatId);
    if (chat) {
      const callMsg = store.insert('messages', {
        chatId: chat.id,
        senderId: call.callerId,
        kind: 'call',
        body: JSON.stringify({
          mode: call.mode || 'audio',
          status,
          duration,
          code: call.code,
          callId: record.id
        }),
        callInfo: {
          callId: record.id,
          code: call.code,
          mode: call.mode || 'audio',
          status,
          duration,
          callerId: call.callerId
        },
        readBy: [call.callerId],
        reactions: {},
        ts: now()
      }, 'm');
      pushMsg(chat, callMsg, 'msg:new');
    }
  }

  // Broadcast history update to all call participants
  const participants = Array.from(new Set([call.callerId, ...(call.recipientIds || [])]));
  participants.forEach(uid => {
    send(uid, {
      type: 'call:history:new',
      call: callView(record, uid)
    });
  });

  return record;
}

function broadcastPresence(uid) {
  const u = store.get('users', uid);
  const ev = JSON.stringify({ type: 'presence', userId: uid, online: isOnline(uid), lastSeen: u?.lastSeen });
  wss.clients.forEach(c => c.uid && c.readyState === WebSocket.OPEN && c.send(ev));
}
function roomSend(code, ev, except) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(ev);
  room.forEach((p, id) => id !== except && p.ws.readyState === WebSocket.OPEN && p.ws.send(data));
}
function leaveRoom(ws) {
  if (!ws.room) return;
  const room = rooms.get(ws.room);
  if (room) {
    const meeting = store.findOne('meetings', m => m.code === ws.room);
    const isDirectCall = Boolean(meeting && meeting.chatId && store.get('chats', meeting.chatId)?.type === 'dm');
    const wasTwoPersonCall = isDirectCall && (room.size === 2);
    room.delete(ws.connId);
    roomSend(ws.room, { type: 'meet:left', connId: ws.connId, wasTwoPersonCall, isDirectCall });
    if (wasTwoPersonCall) {
      // 2-person direct call ends immediately when either user hangs up / disconnects
      finalizeCall(ws.room, { status: 'completed' });
      room.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(JSON.stringify({ type: 'call:ended', code: ws.room, endedBy: ws.uid }));
        }
      });
    }
    if (!room.size) {
      finalizeCall(ws.room, { status: 'completed' });
      rooms.delete(ws.room);
      // Clean up empty instant meetings so they don't linger in Scheduled & Active
      if (meeting && !meeting.scheduledAt) {
        store.remove('meetings', meeting.id);
        [meeting.hostId, ...(meeting.invitees || [])].forEach(uid => send(uid, { type: 'meeting:removed', id: meeting.id }));
      }
    }
  }
  ws.room = null;
}

wss.on('connection', ws => {
  ws.connId = crypto.randomBytes(6).toString('hex');
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', err => {
    console.warn(`[ws:${ws.connId}] Socket error:`, err?.message || err);
  });
  ws.on('message', raw => {
    ws.isAlive = true;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'ping') {
      try { ws.send(JSON.stringify({ type: 'pong' })); } catch {}
      return;
    }
    if (msg.type === 'auth') {
      const uid = verifyToken(msg.token);
      if (!uid) return ws.send(JSON.stringify({ type: 'auth:failed' }));
      ws.uid = uid;
      if (!online.has(uid)) online.set(uid, new Set());
      online.get(uid).add(ws);
      store.update('users', uid, { lastSeen: now() });
      ws.send(JSON.stringify({ type: 'auth:ok', connId: ws.connId, version: CURRENT_APP_VERSION, buildHash: APP_BUILD_HASH }));
      broadcastPresence(uid);
      return;
    }
    if (!ws.uid) return;
    const user = store.get('users', ws.uid);
    switch (msg.type) {
      case 'typing': {
        const chat = store.get('chats', msg.chatId);
        if (chat?.members?.includes(ws.uid)) chat.members.forEach(u => u !== ws.uid && send(u, { type: 'typing', chatId: chat.id, userId: ws.uid, name: user.name, on: !!msg.on }));
        break;
      }
      case 'call:start': {
        const chat = store.get('chats', msg.chatId);
        if (!chat || !chat.members?.includes(ws.uid)) return;

        // Privacy preference enforcement for 1-on-1 DM calls
        if (chat.type === 'dm') {
          const peerId = chat.members.find(id => id !== ws.uid);
          const peer = store.get('users', peerId);
          if (peer) {
            const isFriend = (peer.friends || []).includes(ws.uid);
            if (peer.privacy?.callsFromFriendsOnly && !isFriend) {
              return ws.send(JSON.stringify({ type: 'call:error', error: `${peer.name} only accepts calls from friends.` }));
            }
            if ((peer.blocked || []).includes(ws.uid)) {
              return ws.send(JSON.stringify({ type: 'call:error', error: 'User is not available for calls.' }));
            }
          }
        }

        // Ensure meeting room is recorded
        let meeting = store.findOne('meetings', m => m.code === msg.code);
        if (!meeting) {
          meeting = store.insert('meetings', {
            code: msg.code || meetingCode(),
            title: msg.title || (chat.type === 'group' ? `${chat.name || 'Group'} Call` : `${user.name} Call`),
            hostId: ws.uid,
            scheduledAt: null,
            duration: 60,
            invitees: chat.members.filter(id => id !== ws.uid),
            joined: [ws.uid],
            createdAt: now(),
            chatId: chat.id,
            callMode: msg.mode || 'audio'
          }, 'm');
        }

        const callPayload = {
          type: 'call:incoming',
          callId: meeting.id,
          code: meeting.code,
          chatId: chat.id,
          chatType: chat.type,
          chatTitle: chat.type === 'group' ? (chat.name || 'Group') : user.name,
          callerId: ws.uid,
          callerName: user.name,
          callerUsername: user.username,
          callerAvatar: user.avatar,
          callerAvatarColor: user.avatarColor || colorFor(user.username || 'user'),
          mode: msg.mode || 'audio',
          createdAt: now()
        };

        // Track active call for duration and FireCalls history
        activeCalls.set(meeting.code, {
          id: meeting.id,
          code: meeting.code,
          chatId: chat.id,
          callerId: ws.uid,
          recipientIds: chat.members.filter(id => id !== ws.uid),
          mode: msg.mode || 'audio',
          status: 'missed',
          createdAt: now(),
          startedAt: null
        });

        chat.members.forEach(memberId => {
          if (memberId !== ws.uid) {
            send(memberId, callPayload);
          }
        });

        ws.send(JSON.stringify({
          type: 'call:started',
          code: meeting.code,
          callId: meeting.id,
          mode: msg.mode || 'audio'
        }));
        break;
      }
      case 'call:response': {
        const chat = store.get('chats', msg.chatId);
        if (!chat) return;
        const meeting = store.findOne('meetings', m => m.code === msg.code) || store.get('meetings', msg.callId);
        const hostId = meeting ? meeting.hostId : null;

        if (msg.response === 'accept') {
          const act = activeCalls.get(msg.code);
          if (act) {
            act.startedAt = now();
            act.status = 'completed';
          }
          if (hostId) send(hostId, { type: 'call:accepted', peerId: ws.uid, peerName: user.name, code: msg.code });
        } else {
          finalizeCall(msg.code, { status: 'declined', reason: msg.response });
          if (hostId) send(hostId, { type: 'call:declined', peerId: ws.uid, peerName: user.name, reason: msg.response, code: msg.code });
        }
        break;
      }
      case 'call:end': {
        finalizeCall(msg.code, { status: 'cancelled' });
        const chat = store.get('chats', msg.chatId);
        if (chat) {
          chat.members.forEach(memberId => {
            if (memberId !== ws.uid) {
              send(memberId, { type: 'call:ended', callId: msg.callId, code: msg.code, endedBy: ws.uid });
            }
          });
        }
        break;
      }
      case 'meet:join': {
        leaveRoom(ws);
        const code = String(msg.code || '').toLowerCase();
        let meeting = store.findOne('meetings', m => m.code === code);
        if (!meeting) {
          meeting = {
            id: uid(),
            code,
            title: msg.title || 'Fireupp Call',
            creatorId: ws.uid,
            createdAt: now(),
            status: 'active'
          };
          store.insert('meetings', meeting);
        }
        const act = activeCalls.get(code);
        if (act && !act.startedAt) {
          act.startedAt = now();
          act.status = 'completed';
        }
        if (!rooms.has(code)) rooms.set(code, new Map());
        const room = rooms.get(code);
        // Evict any stale connection for this same user so they never duplicate or echo in the room
        for (const [existingConnId, existingPeer] of room.entries()) {
          if (existingPeer.uid === ws.uid && existingConnId !== ws.connId) {
            room.delete(existingConnId);
            if (existingPeer.ws) existingPeer.ws.room = null;
            roomSend(code, { type: 'meet:left', connId: existingConnId, replaced: true }, ws.connId);
          }
        }
        const peers = [...room.entries()]
          .filter(([connId, p]) => connId !== ws.connId && p.uid !== ws.uid)
          .map(([connId, p]) => {
            const u = store.get('users', p.uid);
            return {
              connId,
              userId: p.uid,
              name: u?.name || 'Participant',
              avatar: u?.avatar || null,
              avatarColor: u?.avatarColor || colorFor(u?.username || 'user'),
              state: p.state
            };
          });
        room.set(ws.connId, { ws, uid: ws.uid, state: msg.state || {} });
        ws.room = code;
        ws.send(JSON.stringify({ type: 'meet:joined', connId: ws.connId, peers }));
        roomSend(code, {
          type: 'meet:peer',
          connId: ws.connId,
          userId: ws.uid,
          name: user.name,
          avatar: user.avatar || null,
          avatarColor: user.avatarColor || colorFor(user.username || 'user'),
          state: msg.state || {}
        }, ws.connId);
        break;
      }
      case 'meet:signal': {
        const target = rooms.get(ws.room)?.get(msg.to);
        if (target) target.ws.send(JSON.stringify({ type: 'meet:signal', from: ws.connId, userId: ws.uid, data: msg.data }));
        break;
      }
      case 'meet:state': {
        const p = rooms.get(ws.room)?.get(ws.connId);
        if (p) { p.state = msg.state || {}; roomSend(ws.room, { type: 'meet:state', connId: ws.connId, state: p.state }, ws.connId); }
        break;
      }
      case 'meet:media': {
        if (ws.room) {
          const room = rooms.get(ws.room);
          if (room) {
            const payload = JSON.stringify({
              type: 'meet:media',
              connId: ws.connId,
              userId: ws.uid,
              kind: msg.kind,
              frame: msg.frame,
              pcm: msg.pcm,
              rate: msg.rate,
              screen: Boolean(msg.screen)
            });
            const sentUids = new Set();
            room.forEach((p, id) => {
              if (id === ws.connId || p.uid === ws.uid) return;
              if (p.uid && sentUids.has(p.uid)) return;
              if (p.ws.readyState === WebSocket.OPEN) {
                if (p.uid) sentUids.add(p.uid);
                p.ws.send(payload);
              }
            });
          }
        }
        break;
      }
      case 'meet:reaction': {
        if (ws.room) {
          roomSend(ws.room, {
            type: 'meet:reaction',
            connId: ws.connId,
            userId: ws.uid,
            name: user.name,
            emoji: String(msg.emoji || '👍').slice(0, 16)
          });
        }
        break;
      }
      case 'meet:leave':
        leaveRoom(ws);
        break;
    }
  });
  ws.on('close', () => {
    leaveRoom(ws);
    if (!ws.uid) return;
    const set = online.get(ws.uid);
    set?.delete(ws);
    if (set && !set.size) {
      online.delete(ws.uid);
      store.update('users', ws.uid, { lastSeen: now() });
      broadcastPresence(ws.uid);
    }
  });
});

// Keep WebSocket connections alive across cloud proxies (Railway/Cloudflare) and prune dead sockets
const wsHeartbeatTimer = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      try { return ws.terminate(); } catch {}
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 25000);
wss.on('close', () => clearInterval(wsHeartbeatTimer));

// ---------------- demo seed ----------------
const DEMO = [
  { username: 'durov', email: 'durov@gmail.com', name: 'Pavel Durov', password: 'telegram123', bio: 'Freedom, privacy and speed.' },
  { username: 'alice', email: 'alice@gmail.com', name: 'Alice Cooper', password: 'alice123', bio: 'Designer · coffee · trains ☕' },
  { username: 'bob_builder', email: 'bob_builder@gmail.com', name: 'Bob Ross', password: 'bob123', bio: 'Happy little accidents 🎨' }
];

async function seed() {
  // Clean startup: no mock accounts auto-generated.
  return;
}

store.init()
  .then(seed)
  .then(() => server.listen(PORT, () => {
    const st = store.status();
    console.log('===============================================');
    console.log(` Fireupp running at http://localhost:${PORT}`);
    console.log(` Database: ${st.database} (${st.projectId})`);
    console.log(` Files: ${st.files}`);
    console.log(` Authentication: Google Identity & OAuth 2.0`);
    console.log('===============================================');
  }))
  .catch(e => {
    console.error('[startup] Could not initialise store:', e.message);
    process.exit(1);
  });

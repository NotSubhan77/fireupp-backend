'use strict';

const dns = require('dns').promises;
const net = require('net');
const zlib = require('zlib');

const crypto = require('crypto');

const GEMINI_DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const GEMINI_VISION_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const GEMINI_DISCOVERY_CACHE = new Map(); // keySig -> { expiresAt, models }

const FREE_AI_CATALOG = [
  {
    id: 'gemini',
    name: 'Google Gemini (AI Studio)',
    envVar: 'GEMINI_API_KEY',
    freeTier: 'Free API key on Google AI Studio · Native PDF + Image Vision + Chat · 1M+ token context',
    bestFor: 'Powers Zovio AI across Chats, Summaries, Smart Calendar & Notes',
    signupUrl: 'https://aistudio.google.com/apikey'
  }
];

function getEnvKeys() {
  return {
    gemini: String(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim()
  };
}

function isNonGeminiKeyPrefix(k) {
  const s = String(k || '').trim();
  return /^(gsk_|sk-or-|sk-proj-|sk-ant-|sk-[A-Za-z0-9]{16,})/i.test(s);
}

function resolveProviderConfig(reqHeaders = {}) {
  const env = getEnvKeys();
  const userKey = String(reqHeaders['x-zovio-ai-key'] || '').trim();
  const invalidUserKey = userKey && isNonGeminiKeyPrefix(userKey)
    ? 'Only Google Gemini API keys (starting with AIza...) are supported in Zovio AI.'
    : '';

  const effectiveGeminiKey = userKey && !invalidUserKey ? userKey : env.gemini;

  return {
    keys: { gemini: effectiveGeminiKey },
    preferred: 'gemini',
    usingUserKey: Boolean(userKey && !invalidUserKey),
    hasServerKey: Boolean(env.gemini),
    invalidUserKey
  };
}

function getAiStatusPayload(reqHeaders = {}) {
  const cfg = resolveProviderConfig(reqHeaders);
  return {
    configured: Boolean(cfg.keys.gemini),
    hasServerKey: cfg.hasServerKey,
    usingUserKey: cfg.usingUserKey,
    invalidUserKey: cfg.invalidUserKey || '',
    availableProviders: cfg.keys.gemini ? ['gemini'] : [],
    serverProviders: {
      gemini: cfg.hasServerKey
    },
    catalog: FREE_AI_CATALOG
  };
}

// ---------------- SSRF-Safe IP & URL Helpers ----------------
function isPrivateOrReservedIp(ip) {
  const clean = String(ip || '').toLowerCase().trim();
  if (!clean) return true;
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(clean.slice(7));
  }
  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(clean)) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('fe80:') || clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('ff')) return true;
    return false;
  }
  return true;
}

async function assertPublicHttpUrl(rawUrl) {
  let u;
  try {
    u = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('Invalid article URL');
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Only http:// and https:// URLs are supported');
  }
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Local or private URLs cannot be fetched');
  }
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error('Private network addresses are blocked');
    return u;
  }
  let records = [];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host "${host}"`);
  }
  if (!records.length || records.some(r => isPrivateOrReservedIp(r.address))) {
    throw new Error('Resolved address points to a restricted network');
  }
  return u;
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
    });
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleFromHtml(html, finalUrl) {
  const raw = String(html || '');
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitleMatch = raw.match(/<meta[^>]+(?:property=["']og:title["']|name=["']twitter:title["'])[^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    || raw.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+(?:property=["']og:title["']|name=["']twitter:title["'])[^>]*>/i);
  const descMatch = raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
    || raw.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

  const cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const headings = [];
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hm;
  while ((hm = headingRe.exec(cleaned)) !== null && headings.length < 16) {
    const txt = stripTags(hm[2]);
    if (txt && txt.length >= 3 && txt.length <= 160) headings.push(txt);
  }

  const mainCandidate = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || cleaned;

  const blocks = [];
  const blockRe = /<(h1|h2|h3|p|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let bm;
  while ((bm = blockRe.exec(mainCandidate)) !== null) {
    const tag = bm[1].toLowerCase();
    const txt = stripTags(bm[2]);
    if (!txt) continue;
    if (tag === 'li' && txt.length < 18) continue;
    if (tag === 'p' && txt.length < 25) continue;
    if (tag.startsWith('h')) blocks.push(`\n## ${txt}\n`);
    else if (tag === 'li') blocks.push(`- ${txt}`);
    else blocks.push(txt);
    if (blocks.join('\n').length > 26000) break;
  }

  let bodyText = blocks.join('\n').trim();
  if (bodyText.length < 200) {
    bodyText = stripTags(
      cleaned
        .replace(/<(header|footer|nav|aside)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<\/(p|div|li|br|h1|h2|h3|h4|section|tr)>/gi, '\n')
    ).slice(0, 26000);
  }

  const title = stripTags(ogTitleMatch?.[1] || titleMatch?.[1] || '') || new URL(finalUrl).hostname;
  const description = stripTags(descMatch?.[1] || '');
  return { title, description, headings, text: bodyText.slice(0, 28000), url: finalUrl };
}

async function fetchArticleSafe(rawUrl) {
  let current = await assertPublicHttpUrl(rawUrl);
  let res = null;
  for (let hop = 0; hop < 4; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 11000);
    try {
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZovioAI/1.0; +https://zovio.up.railway.app)',
          'Accept': 'text/html,application/xhtml+xml,text/plain,application/pdf;q=0.8,*/*;q=0.5'
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const nextUrl = new URL(res.headers.get('location'), current).toString();
      current = await assertPublicHttpUrl(nextUrl);
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`Could not fetch URL (HTTP ${res?.status || 'error'})`);
  }

  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  const ab = await res.arrayBuffer();
  if (ab.byteLength > 4 * 1024 * 1024) {
    throw new Error('Remote document is too large (> 4 MB)');
  }
  const buf = Buffer.from(ab);

  if (contentType.includes('application/pdf') || current.pathname.toLowerCase().endsWith('.pdf')) {
    return {
      isPdf: true,
      url: current.toString(),
      title: decodeURIComponent(current.pathname.split('/').pop() || 'Document.pdf'),
      pdfBase64: buf.toString('base64'),
      text: extractPdfTextHeuristic(buf)
    };
  }

  const rawText = buf.toString('utf8');
  if (contentType.includes('text/plain') || contentType.includes('text/markdown') || contentType.includes('application/json')) {
    return {
      isPdf: false,
      url: current.toString(),
      title: current.hostname + current.pathname,
      description: '',
      headings: [],
      text: rawText.slice(0, 28000)
    };
  }

  return {
    isPdf: false,
    ...extractArticleFromHtml(rawText, current.toString())
  };
}

// ---------------- Lightweight Pure-Node PDF Text Extractor ----------------
function decodePdfLiteralString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') { out += '\n'; i++; }
      else if (next === 'r') { out += ' '; i++; }
      else if (next === 't') { out += '\t'; i++; }
      else if (next === '\\' || next === '(' || next === ')') { out += next; i++; }
      else if (/[0-7]/.test(next)) {
        const oct = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] || '';
        out += String.fromCharCode(parseInt(oct, 8));
        i += oct.length;
      } else {
        out += next;
        i++;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function extractTextOperatorsFromStream(content) {
  const chunks = [];
  const tjRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")/g;
  let m;
  while ((m = tjRe.exec(content)) !== null) {
    const decoded = decodePdfLiteralString(m[1]).trim();
    if (decoded) chunks.push(decoded);
  }
  const tjArrRe = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = tjArrRe.exec(content)) !== null) {
    const inner = m[1];
    let line = '';
    const partRe = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let pm;
    while ((pm = partRe.exec(inner)) !== null) {
      line += decodePdfLiteralString(pm[1]);
    }
    if (line.trim()) chunks.push(line.trim());
  }
  return chunks.join(' ');
}

function extractPdfTextHeuristic(buffer) {
  try {
    const latin = Buffer.from(buffer).toString('latin1');
    const out = [];
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = streamRe.exec(latin)) !== null) {
      const rawStream = Buffer.from(m[1], 'latin1');
      let decodedStr = '';
      try {
        const inflated = zlib.inflateSync(rawStream);
        decodedStr = inflated.toString('latin1');
      } catch {
        decodedStr = m[1];
      }
      if (decodedStr.includes('Tj') || decodedStr.includes('TJ')) {
        const txt = extractTextOperatorsFromStream(decodedStr);
        if (txt) out.push(txt);
      }
      if (out.join('\n').length > 24000) break;
    }
    return out.join('\n').replace(/[^\x09\x0a\x20-\x7e\u00a0-\uffff]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 24000);
  } catch {
    return '';
  }
}

// ---------------- Provider Request Adapters ----------------
function safeParseJson(text) {
  if (!text) return null;
  let cleaned = String(text).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    return null;
  }
}

async function discoverGeminiModels(apiKey) {
  const sig = crypto.createHash('sha256').update(String(apiKey || '')).digest('hex').slice(0, 12);
  const cached = GEMINI_DISCOVERY_CACHE.get(sig);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=80`, {
      signal: ctrl.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data?.models)) return [];

    const scoreModel = id => {
      const s = id.toLowerCase();
      let score = 0;
      if (s.includes('flash-lite')) score += 400;
      else if (s.includes('flash')) score += 350;
      else if (s.includes('pro')) score += 200;
      const verMatch = s.match(/gemini-(\d+(?:\.\d+)?)/);
      if (verMatch) score += parseFloat(verMatch[1]) * 40;
      if (s.includes('exp') || s.includes('preview')) score -= 15;
      if (s.includes('latest')) score += 10;
      return score;
    };

    const models = data.models
      .filter(m => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, '').trim())
      .filter(id => id && !/(embedding|imagen|veo|aqa|tts|audio|robotics|computer-use|bison)/i.test(id))
      .sort((a, b) => scoreModel(b) - scoreModel(a));

    if (GEMINI_DISCOVERY_CACHE.size > 24) {
      const oldest = GEMINI_DISCOVERY_CACHE.keys().next().value;
      if (oldest) GEMINI_DISCOVERY_CACHE.delete(oldest);
    }
    GEMINI_DISCOVERY_CACHE.set(sig, { expiresAt: Date.now() + 15 * 60 * 1000, models });
    return models;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini({ apiKey, system, userText, parts = [], expectJson = false, temperature = 0.25 }) {
  const inlineParts = [];
  if (userText) inlineParts.push({ text: userText });
  for (const p of parts) {
    if (p?.base64 && p?.mime) {
      inlineParts.push({ inline_data: { mime_type: p.mime, data: p.base64 } });
    } else if (p?.text) {
      inlineParts.push({ text: p.text });
    }
  }

  const hasMedia = parts.some(p => Boolean(p?.base64));
  const queue = [...(hasMedia ? GEMINI_VISION_MODELS : GEMINI_DEFAULT_MODELS)];
  const tried = new Set();
  const errors = [];
  let discoveredOnce = false;
  let lastErr = null;

  for (let i = 0; i < queue.length; i++) {
    const model = queue[i];
    if (!model || tried.has(model)) continue;
    tried.add(model);

    const isLite = /lite/i.test(model);
    let includeTemp = !isLite;

    for (let tempRetry = 0; tempRetry < 2; tempRetry++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const generationConfig = {
        maxOutputTokens: 2048,
        ...(includeTemp && Number.isFinite(temperature) ? { temperature } : {}),
        ...(expectJson ? { responseMimeType: 'application/json' } : {})
      };
      const body = {
        contents: [{ role: 'user', parts: inlineParts }],
        generationConfig
      };
      if (system) {
        body.systemInstruction = { parts: [{ text: system }] };
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 32000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.error?.message || `Gemini HTTP ${res.status}`;
          lastErr = new Error(msg);
          if (/API_KEY_INVALID|API key not valid|API key expired/i.test(msg)) {
            throw lastErr;
          }
          if (res.status === 400 && includeTemp && /temperature|generation_?config|unsupported parameter/i.test(msg)) {
            includeTemp = false;
            continue;
          }
          errors.push(`${model}: ${msg}`);
          if (res.status === 429 || res.status === 404 || res.status === 400 || res.status === 403 || res.status >= 500) {
            break;
          }
          throw lastErr;
        }
        const txt = data?.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('\n').trim();
        if (!txt) {
          lastErr = new Error('Gemini returned empty output');
          errors.push(`${model}: Empty output`);
          break;
        }
        return { provider: 'gemini', model, text: txt };
      } catch (e) {
        if (/API_KEY_INVALID|API key not valid|API key expired/i.test(e?.message || '')) {
          throw e;
        }
        lastErr = e;
        errors.push(`${model}: ${e?.message || 'Request error'}`);
        break;
      } finally {
        clearTimeout(timer);
      }
    }

    // Dynamically inspect models enabled on this API key if built-in defaults fail
    if (!discoveredOnce && i === queue.length - 1) {
      discoveredOnce = true;
      const discovered = await discoverGeminiModels(apiKey);
      for (const d of discovered) {
        if (!tried.has(d) && !queue.includes(d)) {
          queue.push(d);
        }
      }
    }
  }
  throw new Error(errors[0] || lastErr?.message || 'Gemini request failed');
}

async function runPromptWithBestProvider({ reqHeaders, system, userText, pdfBase64, images = [], expectJson = false, temperature = 0.25 }) {
  const cfg = resolveProviderConfig(reqHeaders);
  if (cfg.invalidUserKey) {
    return { error: cfg.invalidUserKey };
  }
  const geminiKey = cfg.keys.gemini;
  if (!geminiKey) {
    return { noKey: true };
  }

  const parts = [];
  if (pdfBase64) parts.push({ mime: 'application/pdf', base64: pdfBase64 });
  for (const img of images) parts.push({ mime: img.mime || 'image/png', base64: img.base64 });

  try {
    const res = await callGemini({ apiKey: geminiKey, system, userText, parts, expectJson, temperature });
    return { ...res, usingUserKey: cfg.usingUserKey };
  } catch (err) {
    return { error: err?.message || 'Google Gemini request failed' };
  }
}

// ---------------- Offline / Heuristic Local Fallbacks ----------------
function toIsoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTimeToken(text) {
  const m12 = text.match(/\b(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    const ap = m12[3].toLowerCase().replace(/\./g, '');
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  const m24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    return `${String(parseInt(m24[1], 10)).padStart(2, '0')}:${m24[2]}`;
  }
  const mAt = text.match(/(?:^|\s)(?:at|@|around|by|from)\s*(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\b/i);
  if (mAt) {
    let h = parseInt(mAt[1], 10);
    const min = mAt[2] ? parseInt(mAt[2], 10) : 0;
    if (/\bmorning\b/i.test(text) && h === 12) h = 0;
    else if (!/\bmorning\b/i.test(text) && h >= 1 && h <= 8) h += 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  if (/\bnoon\b|\blunchtime\b/i.test(text)) return '12:00';
  if (/\bmidnight\b/i.test(text)) return '00:00';
  if (/\bmorning\b|\bbreakfast\b/i.test(text)) return '09:00';
  if (/\bafternoon\b/i.test(text)) return '15:00';
  if (/\bevening\b|\beve\b/i.test(text)) return '19:00';
  if (/\bnight\b|\bdinner\b|\bdinnertime\b/i.test(text)) return '20:30';
  return '10:00';
}

function parseDateToken(text, todayISO) {
  const base = todayISO && /^\d{4}-\d{2}-\d{2}$/.test(todayISO)
    ? new Date(todayISO + 'T12:00:00')
    : new Date();

  const lower = text.toLowerCase();
  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  if (/\bday\s+after\s+tomorrow\b|\bovermorrow\b|\bparson?\b/.test(lower)) {
    const d = new Date(base); d.setDate(d.getDate() + 2); return toIsoLocal(d);
  }
  if (/\btomorrow\b|\btmrw\b|\btmr\b|\btomo\b|\b2mrw\b|\bkal\b/.test(lower)) {
    const d = new Date(base); d.setDate(d.getDate() + 1); return toIsoLocal(d);
  }
  if (/\btoday\b|\btonight\b|\btonite\b|\b2nite\b|\baaj\b/.test(lower)) {
    return toIsoLocal(base);
  }
  const inDays = lower.match(/\b(?:in|after)\s+(\d{1,2})\s+days?\b/);
  if (inDays) {
    const d = new Date(base); d.setDate(d.getDate() + parseInt(inDays[1], 10)); return toIsoLocal(d);
  }

  const months = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
  const mDayFirst = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:[,\s]+(20\d{2}))?\b/);
  const mMonthFirst = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(20\d{2}))?\b/);
  const mm = mDayFirst || mMonthFirst;
  if (mm) {
    const day = parseInt(mDayFirst ? mm[1] : mm[2], 10);
    const mon = months[mDayFirst ? mm[2] : mm[1]];
    let year = mm[3] ? parseInt(mm[3], 10) : base.getFullYear();
    const candidate = new Date(year, mon, day, 12, 0, 0);
    if (!mm[3] && candidate < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
      candidate.setFullYear(year + 1);
    }
    return toIsoLocal(candidate);
  }

  const mOrdinalOnly = lower.match(/\b(?:on\s+(?:the\s+)?|this\s+|by\s+(?:the\s+)?)?(\d{1,2})(?:st|nd|rd|th)\b/);
  if (mOrdinalOnly) {
    const day = parseInt(mOrdinalOnly[1], 10);
    if (day >= 1 && day <= 31) {
      const candidate = new Date(base.getFullYear(), base.getMonth(), day, 12, 0, 0);
      if (candidate < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
        candidate.setMonth(candidate.getMonth() + 1);
      }
      return toIsoLocal(candidate);
    }
  }

  const slashDate = lower.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](20\d{2}|\d{2}))?\b/);
  if (slashDate) {
    const p1 = parseInt(slashDate[1], 10);
    const p2 = parseInt(slashDate[2], 10);
    let yr = slashDate[3] ? parseInt(slashDate[3], 10) : base.getFullYear();
    if (yr < 100) yr += 2000;
    const day = p1 > 12 ? p1 : p2 > 12 ? p2 : p1;
    const mon = (p1 > 12 ? p2 : p2 > 12 ? p1 : p2) - 1;
    if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
      return toIsoLocal(new Date(yr, mon, day, 12, 0, 0));
    }
  }

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  for (let i = 0; i < 7; i++) {
    const re = new RegExp(`\\b(?:next\\s+|this\\s+)?(${weekdays[i]}|${shortDays[i]})\\b`, 'i');
    if (re.test(lower)) {
      const curDay = base.getDay();
      let diff = (i - curDay + 7) % 7;
      if (diff === 0 || /\bnext\b/i.test(lower)) diff = diff === 0 ? 7 : diff;
      const d = new Date(base);
      d.setDate(d.getDate() + diff);
      return toIsoLocal(d);
    }
  }

  return toIsoLocal(base);
}

function extractEventsHeuristic(text, todayISO) {
  const raw = String(text || '').trim();
  const date = parseDateToken(raw, todayISO);
  const time = parseTimeToken(raw);

  const locMatch = raw.match(/\b(?:at|@|venue:|location:)\s+([A-Z][A-Za-z0-9\s,&.'-]{2,48})/);
  const location = locMatch ? locMatch[1].trim() : '';

  let title = raw
    .replace(/^\/zovio\s*/i, '')
    .replace(/^(?:hey|hi|hello|yo|bro|bhai|yaar|sun|suno)\b[,\s!]*/i, '')
    .replace(/^(?:please\s+|plz\s+|pls\s+|kindly\s+)?(?:save|add|create|schedule|book|put|set)\s+(?:an|a|the|this)?\s*(?:calendar\s*)?(?:event|reminder|meeting|appointment)?\s*(?:of|for|about|called|named|titled)?\s*/i, '')
    .replace(/^(?:do you\s+|would you\s+|could you\s+|are you\s+)?(?:wanna|want to|like to|let'?s|shall we|can we|we should|we have|i have|got|free\s+(?:for|to)?)\s+(?:a|an|the)?\s*(?:go\s+(?:on\s+|for\s+|to\s+)?(?:a|an|the)?\s*|meet\s+(?:up\s+)?(?:for\s+)?(?:a|an)?\s*)?/i, '')
    .replace(/\b(?:on\s+|for\s+|by\s+|this\s+|next\s+)?(?:20\d{2}-\d{1,2}-\d{1,2}|day\s+after\s+tomorrow|overmorrow|tomorrow|tmrw|tmr|tomo|2mrw|today|tonight|tonite|2nite|kal|aaj|parson?|(?:this\s+|next\s+)?(?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(?:day)?|(?:this\s+|next\s+)?weekend)\b/gi, '')
    .replace(/\b(?:on\s+|for\s+|by\s+)?(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?)(?:[,\s]+20\d{2})?\b/gi, '')
    .replace(/\b(?:on\s+(?:the\s+)?|by\s+(?:the\s+)?)\d{1,2}(?:st|nd|rd|th)\b/gi, '')
    .replace(/\b(?:in|after)\s+\d{1,2}\s+(?:days?|hours?|hrs?|weeks?)\b/gi, '')
    .replace(/\b(?:at\s+|@\s*|around\s+|by\s+|from\s+)?(?:1[0-2]|0?[1-9])(?:[:.][0-5]\d)?\s*(?:am|pm|a\.m\.|p\.m\.|baje|o'?\s*clock)\b/gi, '')
    .replace(/\b(?:at\s+|@\s*|around\s+|by\s+|from\s+)(?:1[0-2]|0?[1-9])(?:[:.][0-5]\d)?\b/gi, '')
    .replace(/\b(?:at\s+)?(?:[01]?\d|2[0-3]):[0-5]\d\b/gi, '')
    .replace(/\b(?:in|at|on|this|tomorrow|kal|aaj)?\s*(?:the\s+)?(?:morning|afternoon|evening|eve|night|noon|midnight|subah|shaam|raat|dopahar)\b/gi, '')
    .replace(/\s+(?:at|@)\s+[A-Z][A-Za-z0-9\s,&.'-]{1,40}$/g, '')
    .replace(/\b(?:on|at|for|by|around|in)\s*$/gi, '')
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
    .trim();

  if (!title) title = 'Scheduled Event';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return [{
    title: title.slice(0, 120),
    date,
    time,
    location,
    notes: location ? `Venue: ${location}\nSource: "${raw.slice(0, 140)}"` : `Scheduled via Zovio AI: "${raw.slice(0, 140)}"`,
    autoSaveRecommended: true
  }];
}

function buildLocalArticleSummary(article) {
  const title = article.title || 'Article Summary';
  const rawParagraphs = String(article.text || '')
    .split(/\n+/)
    .map(s => s.replace(/^##\s*/, '').trim())
    .filter(s => s.length > 35 && !s.startsWith('- '));
  const bullets = String(article.text || '')
    .split(/\n+/)
    .filter(s => s.trim().startsWith('- '))
    .map(s => s.replace(/^-\s*/, '').trim())
    .slice(0, 5);

  const sections = [];
  if (article.headings?.length) {
    sections.push({
      heading: 'Document Sections Detected',
      points: article.headings.slice(0, 6)
    });
  }
  if (rawParagraphs.length) {
    sections.push({
      heading: 'Key Highlights',
      points: rawParagraphs.slice(0, 5).map(p => p.slice(0, 260) + (p.length > 260 ? '…' : ''))
    });
  }
  const keyTakeaways = bullets.length
    ? bullets
    : rawParagraphs.slice(0, 4).map(p => p.split(/(?<=[.!?])\s+/)[0].slice(0, 220));

  return {
    title,
    tldr: article.description || (rawParagraphs[0] ? rawParagraphs[0].slice(0, 320) : 'Content extracted successfully. Add a free Google Gemini API key in Settings → Zovio AI for deep AI synthesis.'),
    sections: sections.length ? sections : [{ heading: 'Extracted Overview', points: ['Content retrieved cleanly.', 'Connect a free Google Gemini API key in Settings → Zovio AI for richer abstraction.'] }],
    keyTakeaways,
    actionTasks: [],
    tags: ['summary', article.isPdf ? 'pdf' : 'article'],
    sourceUrl: article.url || '',
    localFallback: true
  };
}

// ---------------- High-Level Feature Handlers ----------------
async function summarizeSource({ url, pdfBase64, pdfName, text, title, customPrompt, reqHeaders }) {
  let sourceTitle = String(title || pdfName || '').trim();
  let sourceUrl = String(url || '').trim();
  let extractedText = String(text || '').trim();
  let pdfData = pdfBase64 ? String(pdfBase64).replace(/^data:[^;]+;base64,/, '').trim() : '';
  let articleMeta = null;

  if (sourceUrl && !extractedText && !pdfData) {
    articleMeta = await fetchArticleSafe(sourceUrl);
    if (articleMeta.isPdf) {
      pdfData = articleMeta.pdfBase64 || '';
      extractedText = articleMeta.text || '';
      sourceTitle = sourceTitle || articleMeta.title;
      sourceUrl = articleMeta.url;
    } else {
      extractedText = articleMeta.text || '';
      sourceTitle = sourceTitle || articleMeta.title;
      sourceUrl = articleMeta.url;
    }
  }

  if (!extractedText && !pdfData) {
    throw new Error('Provide an article link, PDF file, or text to summarize');
  }

  const system = `You are Zovio AI, an executive research & note-taking assistant inside Zovio.
Summarize the provided article, PDF document, or text into a crisp, well-structured Note ready for ZovioSpace Notes.
Return STRICT valid JSON matching this exact schema:
{
  "title": "Concise descriptive note title",
  "tldr": "2-3 sentence executive overview",
  "sections": [
    { "heading": "Clear Section Heading", "points": ["concise bullet point 1", "bullet point 2"] }
  ],
  "keyTakeaways": ["Top takeaway 1", "Top takeaway 2", "Top takeaway 3"],
  "actionTasks": [{ "title": "Concrete next step if relevant", "priority": "high|medium|low" }],
  "tags": ["topic1", "topic2"]
}
Organize into 2-5 logical headings. Keep points scannable and accurate to the source. If formulas or equations appear, write them cleanly using Unicode math symbols (π, ε₀, λ, Δ, θ, α, β, γ, ħ, ×, ·, ≈, ≤, ≥, →, √, ², ³, ₀, ₁, ₂, Å) and readable fraction formatting instead of raw $...$ or \\frac LaTeX syntax.`;

  const promptParts = [];
  if (customPrompt) promptParts.push(`User instruction: ${customPrompt}`);
  if (sourceTitle) promptParts.push(`Title / File: ${sourceTitle}`);
  if (sourceUrl) promptParts.push(`URL: ${sourceUrl}`);
  if (extractedText) promptParts.push(`Content:\n${extractedText.slice(0, 26000)}`);
  else if (pdfData) promptParts.push('Read the attached PDF document thoroughly and produce the structured JSON summary.');

  const aiRes = await runPromptWithBestProvider({
    reqHeaders,
    system,
    userText: promptParts.join('\n\n'),
    pdfBase64: pdfData,
    expectJson: true,
    temperature: 0.2
  });

  if (aiRes.noKey || aiRes.error) {
    if (articleMeta && !articleMeta.isPdf) {
      return {
        ok: true,
        provider: 'local-extractor',
        model: 'built-in-html-parser',
        localFallback: true,
        notice: aiRes.error || 'Add a free Google Gemini API key in Settings → Zovio AI for full AI synthesis.',
        ...buildLocalArticleSummary(articleMeta)
      };
    }
    const fallbackTxt = extractedText || (pdfData ? extractPdfTextHeuristic(Buffer.from(pdfData, 'base64')) : '');
    if (fallbackTxt && fallbackTxt.length > 40) {
      return {
        ok: true,
        provider: 'local-extractor',
        model: 'built-in-pdf-text-parser',
        notice: aiRes.error || 'Using built-in PDF text extraction. Add a free Gemini API key for OCR/scanned PDFs & deeper AI headings.',
        ...buildLocalArticleSummary({
          title: sourceTitle || 'Document Summary',
          description: fallbackTxt.slice(0, 260),
          headings: [],
          text: fallbackTxt,
          url: sourceUrl,
          isPdf: Boolean(pdfData)
        })
      };
    }
    throw new Error(aiRes.error || 'No AI API key configured yet. Open Settings → Zovio AI to add a free Google Gemini API key (supports native PDF & vision).');
  }

  const parsed = safeParseJson(aiRes.text);
  if (!parsed || !parsed.sections) {
    return {
      ok: true,
      provider: aiRes.provider,
      model: aiRes.model,
      title: sourceTitle || 'AI Summary',
      tldr: aiRes.text.slice(0, 500),
      sections: [{ heading: 'Summary', points: aiRes.text.split(/\n+/).filter(Boolean).slice(0, 8) }],
      keyTakeaways: [],
      actionTasks: [],
      tags: ['summary'],
      sourceUrl,
      localFallback: false
    };
  }

  return {
    ok: true,
    provider: aiRes.provider,
    model: aiRes.model,
    localFallback: false,
    title: parsed.title || sourceTitle || 'AI Summary',
    tldr: parsed.tldr || '',
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    actionTasks: Array.isArray(parsed.actionTasks) ? parsed.actionTasks : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['summary'],
    sourceUrl
  };
}

function reconcilePrintedDate(aiIsoDate, rawText, refToday) {
  const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  const DAYS = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  const src = String(rawText || '').trim();
  const baseValid = /^\d{4}-\d{2}-\d{2}$/.test(String(aiIsoDate || '')) ? aiIsoDate : refToday;
  if (!src) return baseValid;

  const lower = src.toLowerCase();
  let parsedMonth = null;
  let parsedDay = null;
  let parsedYear = null;

  const mFirst = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s,.-]*(\d{1,2})(?:st|nd|rd|th)?(?:[\s,./'-]*(\d{2,4}))?\b/);
  const dFirst = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s,./'-]*\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:[\s,./'-]*(\d{2,4}))?\b/);

  if (dFirst) {
    parsedDay = Number(dFirst[1]);
    parsedMonth = MONTHS[dFirst[2]];
    if (dFirst[3]) parsedYear = dFirst[3].length === 2 ? 2000 + Number(dFirst[3]) : Number(dFirst[3]);
  } else if (mFirst) {
    parsedMonth = MONTHS[mFirst[1]];
    parsedDay = Number(mFirst[2]);
    if (mFirst[3]) parsedYear = mFirst[3].length === 2 ? 2000 + Number(mFirst[3]) : Number(mFirst[3]);
  }

  if (!parsedMonth || !parsedDay || parsedDay < 1 || parsedDay > 31) {
    return baseValid;
  }

  const refYr = Number(String(refToday || new Date().toISOString().slice(0, 10)).slice(0, 4)) || new Date().getFullYear();
  let year = parsedYear || Number(baseValid.slice(0, 4)) || refYr;
  const wdMatch = lower.match(/\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/);
  if (!parsedYear && wdMatch) {
    const targetWd = DAYS[wdMatch[1]];
    const curCandidate = new Date(Date.UTC(year, parsedMonth - 1, parsedDay));
    if (curCandidate.getUTCDay() !== targetWd) {
      for (const tryYr of [refYr, refYr + 1, refYr - 1]) {
        const probe = new Date(Date.UTC(tryYr, parsedMonth - 1, parsedDay));
        if (probe.getUTCMonth() === parsedMonth - 1 && probe.getUTCDay() === targetWd) {
          year = tryYr;
          break;
        }
      }
    }
  }
  const mm = String(parsedMonth).padStart(2, '0');
  const dd = String(parsedDay).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

async function extractCalendarEvents({ text, imageBase64, imageMime, imageName, todayISO, reqHeaders }) {
  const refToday = todayISO && /^\d{4}-\d{2}-\d{2}$/.test(todayISO)
    ? todayISO
    : new Date().toISOString().slice(0, 10);

  const cleanImg = imageBase64 ? String(imageBase64).replace(/^data:[^;]+;base64,/, '').trim() : '';
  const detectedMime = imageMime || (imageBase64?.match(/^data:([^;]+);base64,/)?.[1]) || 'image/jpeg';

  if (!text && !cleanImg) {
    throw new Error('Provide event text or an image (ticket, booking, invite, flyer)');
  }

  const system = `You are Zovio AI Calendar Extractor. Today's reference date is ${refToday}.
Analyze the user's message and/or image (BookMyShow ticket, movie ticket, flight boarding pass, event booking, concert ticket, reservation, meeting invite, flyer).
CRITICAL DATE ACCURACY RULES:
1. For images/tickets with a printed date (e.g. "Tue, 1 Nov", "01 Nov", "Nov 01", "15 Dec"), read the printed month & day LITERALLY (Nov = 11, Dec = 12, Jan = 01, etc.). NEVER shift a printed month into next month just because today is later in the month!
2. Copy the exact printed date phrase into "rawDateText" (e.g. "Tue, 1 Nov"). If no year is printed, infer the year matching the printed weekday (or ${refToday.slice(0, 4)}).
3. Resolve relative text phrases ("today", "tomorrow", "tmrw", "next Friday") relative to ${refToday}.
4. Do NOT duplicate one single booking into multiple events. Return ONE event per distinct showtime/booking.
5. Keep "location" strictly as the venue/theater name cleanly, and put only seat/screen/booking ID in "notes" (do NOT repeat Location inside notes).
Return STRICT valid JSON matching this schema:
{
  "reply": "Short friendly confirmation describing what was found",
  "events": [
    {
      "title": "Clear concise event title (e.g. 'Dilwale Dulhania Le Jayenge' or 'Team Sync')",
      "rawDateText": "Exact printed date string if visible (e.g. 'Tue, 01 Nov') or ''",
      "date": "YYYY-MM-DD",
      "time": "HH:mm (24h, e.g. '19:30'; default '10:00' if unknown)",
      "location": "Venue or cinema hall cleanly without duplicating address",
      "category": "movie|flight|meeting|concert|appointment|reminder|other",
      "notes": "Seats, screen, booking ID, or concise note"
    }
  ],
  "tasks": [
    { "title": "Optional prep task if clearly implied", "priority": "medium", "due": "YYYY-MM-DD" }
  ]
}`;

  const aiRes = await runPromptWithBestProvider({
    reqHeaders,
    system,
    userText: text
      ? `Extract calendar events from this request${cleanImg ? ' and the attached image' : ''}:\n"${text}"`
      : `Read the image (${imageName || 'ticket/invite'}) very carefully. Transcribe exact title, exact printed date (rawDateText + YYYY-MM-DD), showtime, venue, screen & seat details accurately.`,
    images: cleanImg ? [{ mime: detectedMime, base64: cleanImg }] : [],
    expectJson: true,
    temperature: 0.05
  });

  if (aiRes.noKey || aiRes.error) {
    if (cleanImg && !text) {
      return {
        ok: true,
        provider: 'local-fallback',
        model: 'vision-key-needed',
        localFallback: true,
        needsApiKeyForVision: true,
        reply: aiRes.error || 'To automatically read movie tickets & booking screenshots, add a free Google Gemini API key in Settings → Zovio AI.',
        events: [],
        tasks: []
      };
    }
    const events = extractEventsHeuristic(text, refToday);
    return {
      ok: true,
      provider: 'local-parser',
      model: 'smart-date-parser',
      localFallback: true,
      reply: `Scheduled "${events[0].title}" for ${events[0].date} at ${events[0].time}.`,
      events,
      tasks: []
    };
  }

  const parsed = safeParseJson(aiRes.text);
  const rawList = Array.isArray(parsed?.events) ? parsed.events : [];
  const seenKeys = new Set();
  const validEvents = [];

  for (const e of rawList) {
    if (!e || !e.title) continue;
    const title = String(e.title).trim().slice(0, 140);
    const reconciledDate = reconcilePrintedDate(
      e.date,
      [e.rawDateText, e.notes, parsed?.reply].filter(Boolean).join(' '),
      refToday
    );
    const time = /^\d{2}:\d{2}$/.test(String(e.time || '')) ? e.time : '10:00';
    const dedupeKey = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '')}|${reconciledDate}|${time}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    const loc = String(e.location || '').trim();
    let cleanNotes = String(e.notes || '').trim();
    if (loc && cleanNotes.toLowerCase().startsWith(`location: ${loc.toLowerCase()}`)) {
      cleanNotes = cleanNotes.slice(loc.length + 10).trim();
    }
    validEvents.push({
      title,
      rawDateText: String(e.rawDateText || '').trim(),
      date: reconciledDate,
      time,
      location: loc,
      category: String(e.category || 'other').trim(),
      notes: cleanNotes
    });
  }

  if (!validEvents.length && text) {
    const fallback = extractEventsHeuristic(text, refToday);
    return {
      ok: true,
      provider: aiRes.provider,
      model: aiRes.model,
      localFallback: false,
      reply: parsed?.reply || `Prepared event "${fallback[0].title}" for ${fallback[0].date}.`,
      events: fallback,
      tasks: []
    };
  }

  return {
    ok: true,
    provider: aiRes.provider,
    model: aiRes.model,
    localFallback: false,
    reply: parsed?.reply || (validEvents.length ? `Extracted ${validEvents.length} event(s).` : 'No clear event date detected.'),
    events: validEvents,
    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : []
  };
}

async function handleAiChatAction({ action = 'ask', prompt = '', tone = 'polish', messages = [], noteTitle = '', noteText = '', targetLang = 'English', todayISO, reqHeaders }) {
  const refToday = todayISO && /^\d{4}-\d{2}-\d{2}$/.test(todayISO)
    ? todayISO
    : new Date().toISOString().slice(0, 10);

  const convoContext = Array.isArray(messages) && messages.length
    ? messages.slice(-30).map(m => `${m.sender || 'User'}: ${String(m.text || '').slice(0, 500)}`).join('\n')
    : '';

  if (action === 'smart_replies') {
    const system = `You generate 3 natural, short, ready-to-send chat reply suggestions inside a messaging app.
Return STRICT JSON: { "replies": ["reply 1", "reply 2", "reply 3"] }.
Each reply must be under 90 characters and match the conversation tone.`;
    const aiRes = await runPromptWithBestProvider({
      reqHeaders,
      system,
      userText: `Recent chat:\n${convoContext || prompt || 'Hello!'}`,
      expectJson: true,
      temperature: 0.5
    });
    if (aiRes.noKey || aiRes.error) {
      return {
        ok: true,
        provider: 'local-fallback',
        localFallback: true,
        replies: ['Sounds great! 👍', 'Got it, let me check and get back to you.', 'Can we discuss this a bit later?']
      };
    }
    const parsed = safeParseJson(aiRes.text);
    const replies = Array.isArray(parsed?.replies) && parsed.replies.length
      ? parsed.replies.slice(0, 4).map(String)
      : aiRes.text.split('\n').map(s => s.replace(/^[\d\-•.)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
    return { ok: true, provider: aiRes.provider, model: aiRes.model, replies };
  }

  if (action === 'rewrite') {
    const system = `You rewrite message drafts inside Zovio chat.
Style requested: "${tone}". Styles:
- polish: Fix grammar, clarity, and punctuation keeping original meaning
- professional: Clear, polite, business-ready
- casual: Friendly, relaxed conversational tone
- concise: Short and punchy
- expand: Helpful, well-explained message
- translate: Translate clearly into ${targetLang}
Return ONLY the rewritten message text with no quotes or preamble.`;
    const aiRes = await runPromptWithBestProvider({
      reqHeaders,
      system,
      userText: `Original draft:\n${prompt}`,
      expectJson: false,
      temperature: 0.3
    });
    if (aiRes.noKey || aiRes.error) {
      throw new Error(aiRes.error || 'Add a free Google Gemini API key in Settings → Zovio AI to rewrite messages.');
    }
    return { ok: true, provider: aiRes.provider, model: aiRes.model, text: aiRes.text.trim() };
  }

  if (action === 'summarize_chat') {
    const system = `You summarize a chat conversation clearly and return STRICT JSON:
{
  "title": "Descriptive title for this conversation summary",
  "tldr": "2-sentence overview of what was discussed",
  "sections": [
    { "heading": "Main Topics Discussed", "points": ["..."] },
    { "heading": "Decisions & Important Details", "points": ["..."] }
  ],
  "keyTakeaways": ["..."],
  "actionTasks": [{ "title": "Follow-up task", "priority": "high|medium|low" }],
  "events": [{ "title": "Mentioned meeting/date if any", "date": "YYYY-MM-DD", "time": "HH:mm", "notes": "" }]
}
Today's reference date is ${refToday}.`;
    const aiRes = await runPromptWithBestProvider({
      reqHeaders,
      system,
      userText: `Conversation messages:\n${convoContext || prompt}`,
      expectJson: true,
      temperature: 0.2
    });
    if (aiRes.noKey || aiRes.error) {
      throw new Error(aiRes.error || 'Add a free Google Gemini API key in Settings → Zovio AI to summarize conversations.');
    }
    const parsed = safeParseJson(aiRes.text) || {};
    return {
      ok: true,
      provider: aiRes.provider,
      model: aiRes.model,
      title: parsed.title || 'Chat Summary',
      tldr: parsed.tldr || aiRes.text.slice(0, 350),
      sections: Array.isArray(parsed.sections) ? parsed.sections : [{ heading: 'Summary', points: [aiRes.text] }],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      actionTasks: Array.isArray(parsed.actionTasks) ? parsed.actionTasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  }

  if (action === 'note_assist') {
    const modeInstructions = {
      summarize: 'Write a crisp overview explanation + key bullet takeaways, separating each section with a blank line.',
      structure: 'Reorganize and clean up this note with clear Markdown headings (##), bullet points, short paragraphs, and blank lines between every section and block while preserving every fact.',
      flashcards: 'Turn this note into 5-8 study Q&A flashcards formatted clearly with "Q: ..." on one line, "A: ..." on the next line, and a blank line separating every Q&A pair.',
      extract_tasks: 'Extract concrete action items and return STRICT JSON: { "title": "Extracted Tasks", "tldr": "Checklist from note", "sections": [{ "heading": "Action Items", "points": ["..."] }], "actionTasks": [{ "title": "...", "priority": "high|medium|low" }] }.',
      expand: 'Expand these rough ideas into a well-structured detailed note with clear Markdown headings (##), practical examples, and a blank line between every section and paragraph.'
    };
    const isTaskJson = tone === 'extract_tasks';
    const system = `You are Zovio AI inside ZovioSpace Notes. ${modeInstructions[tone] || modeInstructions.structure} Always keep formatting airy and well-spaced: put a blank line before and after headings, between paragraphs, and between distinct items. Write any math/physics formulas clearly using readable Unicode symbols (π, ε₀, λ, Δ, θ, α, β, γ, ħ, ×, ·, ≈, ≤, ≥, →, √, ², ³, ₀, ₁, ₂, Å) instead of raw $...$ or \\frac LaTeX markup.`;
    const aiRes = await runPromptWithBestProvider({
      reqHeaders,
      system,
      userText: `Note Title: ${noteTitle || 'Untitled'}\n\nNote Content:\n${noteText || prompt}`,
      expectJson: isTaskJson,
      temperature: 0.3
    });
    if (aiRes.noKey || aiRes.error) {
      throw new Error(aiRes.error || 'Add a free Google Gemini API key in Settings → Zovio AI to use AI Note Assistant.');
    }
    if (isTaskJson) {
      const parsed = safeParseJson(aiRes.text) || {};
      return {
        ok: true,
        provider: aiRes.provider,
        model: aiRes.model,
        title: parsed.title || `${noteTitle || 'Note'} — Action Items`,
        tldr: parsed.tldr || '',
        sections: parsed.sections || [],
        actionTasks: Array.isArray(parsed.actionTasks) ? parsed.actionTasks : []
      };
    }
    return {
      ok: true,
      provider: aiRes.provider,
      model: aiRes.model,
      text: aiRes.text.trim()
    };
  }

  // Default: 'ask' or 'explain' (/zovio <prompt>)
  const system = `You are Zovio AI, a brilliant, concise built-in AI assistant in Zovio (today is ${refToday}).
Help the user directly. Also extract any clear note-worthy structure, tasks, or calendar event if the user asked to save/schedule/summarize something.
For mathematical, physics, or chemistry formulas, ALWAYS format them cleanly using Unicode math symbols (π, ε₀, λ, Δ, θ, α, β, γ, ħ, ×, ·, ≈, ≤, ≥, →, √, ², ³, ₀, ₁, ₂, Å) and clean readable grouping (e.g. r₀ = (2Ze²) / (4πε₀K), Eₙ = -13.6 × Z² / n² eV) instead of raw $...$ or \\frac LaTeX strings.
Return STRICT JSON:
{
  "title": "Short card title",
  "answer": "Clear, helpful formatted answer (can use concise markdown bullets and headings)",
  "saveNoteSuggested": true or false,
  "sections": [{ "heading": "...", "points": ["..."] }],
  "events": [{ "title": "...", "date": "YYYY-MM-DD", "time": "HH:mm", "notes": "" }],
  "actionTasks": [{ "title": "...", "priority": "medium" }]
}`;
  const aiRes = await runPromptWithBestProvider({
    reqHeaders,
    system,
    userText: `${convoContext ? `Chat context (last messages):\n${convoContext}\n\n` : ''}User command (/zovio): ${prompt}`,
    expectJson: true,
    temperature: 0.35
  });

  if (aiRes.noKey || aiRes.error) {
    throw new Error(aiRes.error || 'Add a free Google Gemini API key in Settings → Zovio AI to unlock /zovio.');
  }

  const parsed = safeParseJson(aiRes.text);
  if (!parsed || !parsed.answer) {
    return {
      ok: true,
      provider: aiRes.provider,
      model: aiRes.model,
      title: 'Zovio AI',
      answer: aiRes.text.trim(),
      saveNoteSuggested: aiRes.text.length > 180,
      sections: [],
      events: [],
      actionTasks: []
    };
  }
  return {
    ok: true,
    provider: aiRes.provider,
    model: aiRes.model,
    title: parsed.title || 'Zovio AI',
    answer: parsed.answer,
    saveNoteSuggested: Boolean(parsed.saveNoteSuggested || (parsed.sections && parsed.sections.length)),
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
    actionTasks: Array.isArray(parsed.actionTasks) ? parsed.actionTasks : []
  };
}

async function testConnection(reqHeaders = {}) {
  const cfg = resolveProviderConfig(reqHeaders);
  if (cfg.invalidUserKey) {
    throw new Error(cfg.invalidUserKey);
  }
  const geminiKey = cfg.keys.gemini;
  if (!geminiKey) {
    throw new Error('No Gemini API key configured. Paste your Gemini API key or use server Zovio AI allowance.');
  }
  const res = await callGemini({
    apiKey: geminiKey,
    system: 'Respond briefly to confirm API connectivity.',
    userText: 'Reply with: Zovio AI online!',
    expectJson: false,
    temperature: 0.1
  });
  return {
    ok: true,
    provider: res.provider,
    model: res.model,
    answer: res.text || 'Zovio AI online!',
    usingUserKey: cfg.usingUserKey
  };
}

module.exports = {
  FREE_AI_CATALOG,
  getAiStatusPayload,
  resolveProviderConfig,
  testConnection,
  summarizeSource,
  extractCalendarEvents,
  handleAiChatAction
};

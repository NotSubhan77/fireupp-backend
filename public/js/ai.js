/* ==========================================================================
   Zovio AI — Built-in Assistant Across Chats, Notes, Calendar & Tasks
   ========================================================================== */
(function initZovioAI() {
  const LS_KEY = 'zovio_ai_byok_key';
  const LS_PROVIDER = 'zovio_ai_provider';

  function todayIsoLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isNonGeminiKey(k) {
    const s = String(k || '').trim();
    return /^(gsk_|sk-or-|sk-proj-|sk-ant-|sk-[A-Za-z0-9]{16,})/i.test(s);
  }

  function getConfig() {
    const rawKey = (localStorage.getItem(LS_KEY) || '').trim();
    return {
      key: isNonGeminiKey(rawKey) ? '' : rawKey,
      provider: 'gemini'
    };
  }

  function setConfig({ key }) {
    if (typeof key === 'string') {
      const clean = key.trim();
      if (clean && !isNonGeminiKey(clean)) localStorage.setItem(LS_KEY, clean);
      else localStorage.removeItem(LS_KEY);
    }
    localStorage.setItem(LS_PROVIDER, 'gemini');
  }

  function getAiHeaders() {
    const cfg = getConfig();
    const h = { 'x-zovio-ai-provider': 'gemini' };
    if (cfg.key) h['x-zovio-ai-key'] = cfg.key;
    return h;
  }

  async function aiRequest(endpoint, body = null, method = 'POST') {
    const opts = { method, headers: getAiHeaders() };
    if (body && method !== 'GET') opts.body = body;
    try {
      const res = await api(endpoint, opts);
      if (res?.quota && typeof S === 'object' && S?.user) {
        S.user.aiQuota = res.quota;
      }
      return res;
    } catch (err) {
      if (err?.code === 'AI_QUOTA_EXCEEDED' || err?.status === 429) {
        if (err?.data?.quota && typeof S === 'object' && S?.user) {
          S.user.aiQuota = err.data.quota;
        }
        openAiLimitModal(err.message, err?.data?.quota || null);
      }
      throw err;
    }
  }

  function aiIconHtml(label = '', cls = '') {
    const icoHtml = typeof icon === 'function' ? icon('sparkle') : '';
    return `<span class="zai-icon-loader ${cls}" aria-hidden="true">${icoHtml}</span>${label ? `<span>${esc(label)}</span>` : ''}`;
  }

  function aiLoaderHtml(label = 'Generating with Zovio AI…') {
    return `<div class="zai-loading">${aiIconHtml(label)}</div>`;
  }

  function setAiTriggerLoading(targets, active) {
    const list = [];
    const items = Array.isArray(targets) ? targets : [targets];
    for (const item of items) {
      if (!item) continue;
      if (typeof item === 'string') {
        document.querySelectorAll(item).forEach(n => list.push(n));
      } else if (item instanceof Element) {
        list.push(item);
      }
    }
    list.forEach(el => {
      const prev = Math.max(0, Number(el.dataset.zaiBusyCount || 0));
      const next = active ? prev + 1 : Math.max(0, prev - 1);
      el.dataset.zaiBusyCount = String(next);
      el.classList.toggle('is-ai-loading', next > 0);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const res = String(fr.result || '');
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : res);
      };
      fr.onerror = () => reject(new Error('Could not read file'));
      fr.readAsDataURL(blob);
    });
  }

  const LATEX_SYM_MAP = [
    [/\\varepsilon/g, 'ε'], [/\\epsilon/g, 'ε'], [/\\lambda/g, 'λ'], [/\\Lambda/g, 'Λ'],
    [/\\Delta/g, 'Δ'], [/\\delta/g, 'δ'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'], [/\\Gamma/g, 'Γ'], [/\\theta/g, 'θ'], [/\\Theta/g, 'Θ'],
    [/\\omega/g, 'ω'], [/\\Omega/g, 'Ω'], [/\\sigma/g, 'σ'], [/\\Sigma/g, 'Σ'],
    [/\\phi/g, 'φ'], [/\\Phi/g, 'Φ'], [/\\psi/g, 'ψ'], [/\\Psi/g, 'Ψ'],
    [/\\mu/g, 'μ'], [/\\nu/g, 'ν'], [/\\rho/g, 'ρ'], [/\\tau/g, 'τ'],
    [/\\pi/g, 'π'], [/\\Pi/g, 'Π'], [/\\hbar/g, 'ℏ'], [/\\infty/g, '∞'],
    [/\\times/g, '×'], [/\\cdot/g, '·'], [/\\div/g, '÷'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
    [/\\approx/g, '≈'], [/\\neq/g, '≠'], [/\\ne(?![a-zA-Z])/g, '≠'],
    [/\\leq/g, '≤'], [/\\le(?![a-zA-Z])/g, '≤'], [/\\geq/g, '≥'], [/\\ge(?![a-zA-Z])/g, '≥'],
    [/\\equiv/g, '≡'], [/\\propto/g, '∝'], [/\\rightarrow/g, '→'], [/\\to(?![a-zA-Z])/g, '→'],
    [/\\leftarrow/g, '←'], [/\\leftrightarrow/g, '↔'], [/\\deg/g, '°'], [/\\circ/g, '°'],
    [/\\AA\b/g, 'Å'], [/\\left\s*([(\[{|])/g, '$1'], [/\\right\s*([)\]}|])/g, '$1'],
    [/\\left\./g, ''], [/\\right\./g, ''], [/\\[,;:!\s]/g, ' ']
  ];

  function extractBracedGroup(str, startIdx) {
    if (startIdx >= str.length || str[startIdx] !== '{') return null;
    let depth = 0;
    for (let i = startIdx; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) return { inner: str.slice(startIdx + 1, i), next: i + 1 };
      }
    }
    return null;
  }

  function replaceLatexCommands(expr, asHtml = true) {
    let s = String(expr || '').trim();
    if (!s) return '';

    // Replace \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, \unit{...}
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname|unit)\s*\{([^}]*)\}/g, '$1');

    // Replace symbols
    for (const [re, rep] of LATEX_SYM_MAP) {
      s = s.replace(re, rep);
    }

    // Balanced \sqrt{...}
    let guard = 0;
    while (s.includes('\\sqrt') && guard++ < 15) {
      const idx = s.indexOf('\\sqrt');
      let pos = idx + 5;
      while (pos < s.length && s[pos] === ' ') pos++;
      const grp = extractBracedGroup(s, pos);
      if (!grp) break;
      const inner = replaceLatexCommands(grp.inner, asHtml);
      s = s.slice(0, idx) + `√(${inner})` + s.slice(grp.next);
    }

    // Balanced \frac{num}{den}
    guard = 0;
    while ((s.includes('\\frac') || s.includes('\\dfrac') || s.includes('\\tfrac')) && guard++ < 25) {
      const m = /\\(?:d|t)?frac/.exec(s);
      if (!m) break;
      const idx = m.index;
      let pos = idx + m[0].length;
      while (pos < s.length && s[pos] === ' ') pos++;
      const numG = extractBracedGroup(s, pos);
      if (!numG) break;
      let pos2 = numG.next;
      while (pos2 < s.length && s[pos2] === ' ') pos2++;
      const denG = extractBracedGroup(s, pos2);
      if (!denG) break;
      const numR = replaceLatexCommands(numG.inner, asHtml);
      const denR = replaceLatexCommands(denG.inner, asHtml);
      const rep = asHtml
        ? `<span class="zai-frac"><span class="zai-frac-num">${numR}</span><span class="zai-frac-den">${denR}</span></span>`
        : `(${numR})/(${denR})`;
      s = s.slice(0, idx) + rep + s.slice(denG.next);
    }

    // Superscripts & Subscripts
    if (asHtml) {
      s = s.replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>');
      s = s.replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>');
      s = s.replace(/\^([a-zA-Z0-9+\-−])/g, '<sup>$1</sup>');
      s = s.replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>');
    } else {
      const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', 'n': 'ⁿ' };
      const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', 'n': 'ₙ' };
      const mapChars = (txt, tbl, fb) => [...txt].map(c => tbl[c] || c).join('') || fb;
      s = s.replace(/\^\{([^{}]+)\}/g, (_, g) => [...g].every(c => SUP[c]) ? mapChars(g, SUP) : `^(${g})`);
      s = s.replace(/_\{([^{}]+)\}/g, (_, g) => [...g].every(c => SUB[c]) ? mapChars(g, SUB) : `_${g}`);
      s = s.replace(/\^([a-zA-Z0-9+\-])/g, (_, c) => SUP[c] || `^${c}`);
      s = s.replace(/_([a-zA-Z0-9])/g, (_, c) => SUB[c] || `_${c}`);
    }

    // Strip redundant outer curly braces and unknown leading backslashes
    s = s.replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, '').replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  function isLikelyMathExpr(expr) {
    const t = String(expr || '').trim();
    if (!t || t.length > 280) return false;
    return /[=^_\\{}×·÷±≈≠≤≥→]|\\(?:frac|pi|varepsilon|epsilon|lambda|Delta|delta|alpha|beta|gamma|theta|omega|mu|nu|sigma|phi|psi|hbar|times|approx|text|sqrt)/.test(t) || /^[a-zA-Z][a-zA-Z0-9_^{}()\s+\-*/.,]*$/.test(t);
  }

  function formatInlineMd(str) {
    const raw = String(str || '');
    // Extract math segments ($...$ / $$...$$) BEFORE escaping so HTML stays crisp & safe
    const tokens = [];
    const tokenized = raw.replace(/\$\$([\s\S]{1,400}?)\$\$|\$([^$]{1,280}?)\$/g, (full, blockMath, inlineMath) => {
      const expr = (blockMath !== undefined ? blockMath : inlineMath) || '';
      if (blockMath === undefined && !isLikelyMathExpr(expr)) return full;
      const escapedExpr = esc(expr.replace(/\s*\n\s*/g, ' '));
      const rendered = replaceLatexCommands(escapedExpr, true);
      const idx = tokens.length;
      tokens.push(`<span class="${blockMath !== undefined ? 'zai-math zai-math-block' : 'zai-math'}">${rendered}</span>`);
      return `\u0000ZMATH${idx}\u0000`;
    });

    let safe = esc(tokenized);
    // Also clean any un-delimited LaTeX (\frac, \varepsilon, ^{...}, _{...}) in escaped text
    if (/\\(?:frac|pi|varepsilon|epsilon|lambda|Delta|times|approx|text|sqrt)\b|\^\{|_\{/.test(safe)) {
      safe = replaceLatexCommands(safe, true);
    }
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\u0000ZMATH(\d+)\u0000/g, (_, idx) => tokens[Number(idx)] || '');
    return safe;
  }

  function cleanPlainMath(str) {
    return String(str || '').replace(/\$\$([\s\S]{1,400}?)\$\$|\$([^$]{1,280}?)\$/g, (full, b, i) => {
      const expr = b !== undefined ? b : i;
      if (b === undefined && !isLikelyMathExpr(expr)) return full;
      return replaceLatexCommands(expr.replace(/\s*\n\s*/g, ' '), false);
    });
  }

  function formatNoteMathHtml(html) {
    const raw = String(html || '');
    if (!raw || !(/\$[^$]+\$|\\(?:frac|pi|varepsilon|epsilon|lambda|times|approx|text|sqrt)|\^\{|_\{/.test(raw))) {
      return raw;
    }
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue && (/\$[^$]+\$|\\(?:frac|pi|varepsilon|epsilon|lambda|times|approx|text|sqrt)|\^\{|_\{/.test(n.nodeValue))) {
          textNodes.push(n);
        }
      }
      for (const tn of textNodes) {
        if (tn.parentElement?.closest?.('.zai-math')) continue;
        const formatted = formatInlineMd(tn.nodeValue);
        if (formatted !== esc(tn.nodeValue)) {
          const wrap = doc.createElement('span');
          wrap.innerHTML = formatted;
          tn.replaceWith(...Array.from(wrap.childNodes));
        }
      }
      return doc.body.innerHTML;
    } catch {
      return raw;
    }
  }

  const AI_SVGS = {
    doc: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    calendar: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    edit: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    brain: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5V7a3 3 0 0 0-2 5.2A3.5 3.5 0 0 0 6 18.5V19a3 3 0 0 0 6 0V5.5A3.5 3.5 0 0 0 9.5 2Z"/><path d="M14.5 2A3.5 3.5 0 0 1 18 5.5V7a3 3 0 0 1 2 5.2A3.5 3.5 0 0 1 18 18.5V19a3 3 0 0 1-6 0V5.5A3.5 3.5 0 0 1 14.5 2Z"/></svg>',
    sparkle: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/></svg>',
    briefcase: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    smile: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
    scissors: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    chat: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    check: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    gradCap: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    clock: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    pin: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    lightbulb: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
    link: '<svg class="zai-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };
  const aiIco = name => AI_SVGS[name] || AI_SVGS.sparkle;

  function markdownToNoteHtml({ tldr, sections = [], keyTakeaways = [], tags = [], sourceUrl = '', answer = '' }) {
    const parts = [];
    const pushSpacer = () => {
      if (parts.length && parts[parts.length - 1] !== '<p><br></p>') {
        parts.push('<p><br></p>');
      }
    };
    if (sourceUrl) {
      parts.push(`<p><strong>Source:</strong> <a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(sourceUrl)}</a></p>`);
      pushSpacer();
    }
    if (tldr) {
      parts.push(`<h2>Overview</h2>`);
      parts.push(`<p>${formatInlineMd(tldr)}</p>`);
      pushSpacer();
    }
    if (Array.isArray(sections) && sections.length) {
      for (const sec of sections) {
        pushSpacer();
        if (sec?.heading) parts.push(`<h2>${esc(sec.heading)}</h2>`);
        if (Array.isArray(sec?.points) && sec.points.length) {
          parts.push(`<ul>${sec.points.map(pt => `<li>${formatInlineMd(pt)}</li>`).join('')}</ul>`);
        }
        pushSpacer();
      }
    }
    if (Array.isArray(keyTakeaways) && keyTakeaways.length) {
      pushSpacer();
      parts.push(`<h2>Key Takeaways</h2>`);
      parts.push(`<ul>${keyTakeaways.map(k => `<li>${formatInlineMd(k)}</li>`).join('')}</ul>`);
      pushSpacer();
    }
    if (answer && !sections.length && !tldr) {
      const lines = String(answer).split(/\n/);
      let listTag = '';
      const closeList = () => {
        if (listTag) {
          parts.push(`</${listTag}>`);
          listTag = '';
        }
      };
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          closeList();
          pushSpacer();
          continue;
        }
        if (/^#{1,4}\s+/.test(line)) {
          closeList();
          pushSpacer();
          const txt = line.replace(/^#{1,4}\s+/, '');
          parts.push(`<h2>${formatInlineMd(txt)}</h2>`);
        } else if (/^[-*•]\s+/.test(line)) {
          if (listTag === 'ol') closeList();
          if (!listTag) { parts.push('<ul>'); listTag = 'ul'; }
          parts.push(`<li>${formatInlineMd(line.replace(/^[-*•]\s+/, ''))}</li>`);
        } else if (/^\d+[.)]\s+/.test(line)) {
          if (listTag === 'ul') closeList();
          if (!listTag) { parts.push('<ol>'); listTag = 'ol'; }
          parts.push(`<li>${formatInlineMd(line.replace(/^\d+[.)]\s+/, ''))}</li>`);
        } else {
          closeList();
          if (/^Q[:：]\s*/i.test(line)) pushSpacer();
          parts.push(`<p>${formatInlineMd(line)}</p>`);
        }
      }
      closeList();
    }
    if (Array.isArray(tags) && tags.length) {
      pushSpacer();
      parts.push(`<p><em>Tags: ${tags.map(t => `#${esc(String(t).replace(/^#/, ''))}`).join(' ')}</em></p>`);
    }
    while (parts.length && parts[parts.length - 1] === '<p><br></p>') parts.pop();
    return parts.join('') || '<p></p>';
  }

  function summaryToPlainText(data) {
    if (data?.isDraft && data.answer && (!data.sections || !data.sections.length)) {
      return cleanPlainMath(data.answer).trim();
    }
    const out = [];
    if (data.title) out.push(`# ${cleanPlainMath(data.title)}`);
    if (data.sourceUrl) out.push(`Source: ${data.sourceUrl}`);
    if (data.tldr) out.push(`\nOverview:\n${cleanPlainMath(data.tldr)}`);
    if (Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        if (sec.heading) out.push(`\n## ${cleanPlainMath(sec.heading)}`);
        if (Array.isArray(sec.points)) {
          sec.points.forEach(p => out.push(`• ${cleanPlainMath(p)}`));
        }
      }
    }
    if (Array.isArray(data.keyTakeaways) && data.keyTakeaways.length) {
      out.push(`\n## Key Takeaways`);
      data.keyTakeaways.forEach(k => out.push(`• ${cleanPlainMath(k)}`));
    }
    if (data.answer && (!data.sections || !data.sections.length)) {
      out.push(`\n${cleanPlainMath(data.answer)}`);
    }
    return out.join('\n').trim();
  }

  async function saveStructuredNoteToSpace(data, group = 'Default') {
    if (typeof saveWsItem !== 'function') {
      throw new Error('ZovioSpace is still initializing');
    }
    const accentBrand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#7c5cff';
    const rawTitle = data?.isDraft ? (cleanPlainMath(data.answer).split(/\n/)[0]?.slice(0, 60) || 'AI Writer Note') : (data?.title || 'AI Note');
    const title = cleanPlainMath(String(rawTitle).trim()).slice(0, 140);
    const html = markdownToNoteHtml(data || {});
    const body = summaryToPlainText(data || {});
    const saved = await saveWsItem('note', {
      title,
      body,
      html,
      color: accentBrand,
      skin: 'default',
      group: group || 'Default',
      pinned: false,
      locked: false,
      deleted: false
    });
    return saved;
  }

  const _savingEventKeys = new Set();
  function normalizeEventKey(ev) {
    const t = String(ev?.title || 'event').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(ev?.date || '')) ? ev.date : todayIsoLocal();
    const tm = /^\d{2}:\d{2}$/.test(String(ev?.time || '')) ? ev.time : '10:00';
    return `${t}|${d}|${tm}`;
  }

  function findExistingWorkspaceEvent(ev) {
    const list = Array.isArray(window.S?.workspace) ? window.S.workspace : [];
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(ev?.date || '')) ? ev.date : todayIsoLocal();
    const targetTime = /^\d{2}:\d{2}$/.test(String(ev?.time || '')) ? ev.time : '10:00';
    const targetTitle = String(ev?.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    return list.find(item => {
      if (!item || item.type !== 'event' || item.deleted) return false;
      if (item.date !== targetDate || (item.time || '10:00') !== targetTime) return false;
      const existingTitle = String(item.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return existingTitle === targetTitle || (existingTitle.length > 4 && targetTitle.length > 4 && (existingTitle.includes(targetTitle) || targetTitle.includes(existingTitle)));
    }) || null;
  }

  async function saveExtractedEventToSpace(ev) {
    if (typeof saveWsItem !== 'function') {
      throw new Error('ZovioSpace is still initializing');
    }
    const existing = findExistingWorkspaceEvent(ev);
    if (existing?.id) return existing.id;

    const key = normalizeEventKey(ev);
    if (_savingEventKeys.has(key)) return null;
    _savingEventKeys.add(key);

    try {
      const loc = String(ev?.location || '').trim();
      const rawNotes = String(ev?.notes || '').trim();
      const notes = loc && !rawNotes.toLowerCase().includes(loc.toLowerCase())
        ? [rawNotes, `Venue: ${loc}`].filter(Boolean).join('\n')
        : (rawNotes || (loc ? `Venue: ${loc}` : ''));
      const payload = {
        title: String(ev?.title || 'Event').trim().slice(0, 140),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(ev?.date || '')) ? ev.date : todayIsoLocal(),
        time: /^\d{2}:\d{2}$/.test(String(ev?.time || '')) ? ev.time : '10:00',
        notes: notes.trim()
      };
      return await saveWsItem('event', payload);
    } finally {
      _savingEventKeys.delete(key);
    }
  }

  async function saveExtractedTasksToSpace(tasks = []) {
    if (typeof saveWsItem !== 'function') {
      throw new Error('ZovioSpace is still initializing');
    }
    const saved = [];
    for (const t of (tasks || [])) {
      const title = String(t?.title || t || '').trim();
      if (!title) continue;
      const prio = ['high', 'medium', 'low'].includes(t?.priority) ? t.priority : 'medium';
      const item = await saveWsItem('task', {
        title: title.slice(0, 160),
        priority: prio,
        status: 'todo',
        due: t?.due || ''
      });
      saved.push(item);
    }
    return saved;
  }

  function jumpToWorkspace(tab = 'notes') {
    try { closeModal?.(); } catch {}
    if (typeof wsTab !== 'undefined') {
      try { window.wsTab = tab; } catch {}
    }
    if (typeof window.setWorkspaceTab === 'function') {
      window.setWorkspaceTab(tab);
    } else {
      document.querySelector('.rail-btn[data-view="workspace"]')?.click();
      setTimeout(() => {
        document.querySelector(`.ws-tabs button[data-wstab="${tab}"]`)?.click();
      }, 60);
    }
  }

  function renderSummaryCardHtml(res) {
    return `
      <div class="zai-result-card">
        <div class="zai-result-head">
          <div style="min-width:0;flex:1">
            <h4 class="zai-result-title">${esc(res.title || 'Zovio AI Result')}</h4>
            ${res.sourceUrl ? `<div class="zai-source-link">${esc(res.sourceUrl)}</div>` : ''}
          </div>
        </div>
        ${res.notice ? `<div class="zai-notice">${esc(res.notice)}</div>` : ''}
        ${res.tldr ? `<div class="zai-tldr"><strong>Overview</strong><p>${formatInlineMd(res.tldr)}</p></div>` : ''}
        ${res.answer && (!res.sections || !res.sections.length) ? `<div class="zai-answer-body">${formatInlineMd(res.answer).replace(/\n/g, '<br>')}</div>` : ''}
        ${(res.sections || []).map(sec => `
          <div class="zai-section">
            <h5>${esc(sec.heading || 'Details')}</h5>
            <ul>${(sec.points || []).map(pt => `<li>${formatInlineMd(pt)}</li>`).join('')}</ul>
          </div>
        `).join('')}
        ${(res.keyTakeaways && res.keyTakeaways.length) ? `
          <div class="zai-section">
            <h5>Key Takeaways</h5>
            <ul>${res.keyTakeaways.map(k => `<li>${formatInlineMd(k)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${(res.actionTasks && res.actionTasks.length) ? `
          <div class="zai-section">
            <h5>Suggested Action Tasks (${res.actionTasks.length})</h5>
            <ul>${res.actionTasks.map(t => `<li><strong>[${esc(t.priority || 'med')}]</strong> ${esc(t.title)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        <div class="zai-action-row">
          <button type="button" class="btn primary sm" data-zai-save-note="1">${icon('note')} <span>Save to Notes</span></button>
          ${(res.actionTasks && res.actionTasks.length) ? `<button type="button" class="btn ghost sm" data-zai-save-tasks="1">${icon('check')} <span>Save Tasks (${res.actionTasks.length})</span></button>` : ''}
          ${S?.activeChatId ? `<button type="button" class="btn ghost sm" data-zai-send-chat="1">${icon('send')} <span>Send to Chat</span></button>` : ''}
          <button type="button" class="btn ghost sm" data-zai-copy="1">${icon('copy')} <span>Copy</span></button>
        </div>
      </div>`;
  }

  function applyTextToComposer(text, toastMsg = 'Ready in chat composer') {
    const inp = document.getElementById('msgInput');
    if (!inp) return false;
    const clean = String(text || '').slice(0, 3500);
    inp.value = clean;
    const composerRow = document.querySelector('#composerWrap .composer');
    composerRow?.classList.toggle('has-draft', Boolean(clean));
    if (clean) {
      document.getElementById('attachMenu')?.classList.add('hidden');
      document.getElementById('stickerGifDrawer')?.classList.add('hidden');
    }
    inp._resizeInput?.(true);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.focus();
    try { closeModal?.(); } catch {}
    if (toastMsg) toast(toastMsg, 'ok');
    return true;
  }

  function wireSummaryCardActions(container, res) {
    const saveNoteBtn = container.querySelector('[data-zai-save-note]');
    if (saveNoteBtn) {
      saveNoteBtn.onclick = async () => {
        saveNoteBtn.disabled = true;
        try {
          await saveStructuredNoteToSpace(res);
          saveNoteBtn.innerHTML = `${icon('check')} <span>Saved to Notes · Open →</span>`;
          saveNoteBtn.classList.remove('primary');
          saveNoteBtn.classList.add('ghost');
          saveNoteBtn.disabled = false;
          saveNoteBtn.onclick = () => jumpToWorkspace('notes');
          toast('Summary saved to ZovioSpace Notes with headings!', 'ok');
          hydrateIcons(saveNoteBtn);
        } catch (err) {
          saveNoteBtn.disabled = false;
          toast(err.message || 'Could not save note', 'err');
        }
      };
    }

    const saveTasksBtn = container.querySelector('[data-zai-save-tasks]');
    if (saveTasksBtn) {
      saveTasksBtn.onclick = async () => {
        saveTasksBtn.disabled = true;
        try {
          const added = await saveExtractedTasksToSpace(res.actionTasks || []);
          saveTasksBtn.innerHTML = `${icon('check')} <span>Saved ${added.length} Tasks</span>`;
          toast(`Added ${added.length} task(s) to ZovioSpace!`, 'ok');
          hydrateIcons(saveTasksBtn);
        } catch (err) {
          saveTasksBtn.disabled = false;
          toast(err.message || 'Could not save tasks', 'err');
        }
      };
    }

    const sendChatBtn = container.querySelector('[data-zai-send-chat]');
    if (sendChatBtn) {
      sendChatBtn.onclick = () => {
        applyTextToComposer(summaryToPlainText(res), 'Placed into chat composer');
      };
    }

    const copyBtn = container.querySelector('[data-zai-copy]');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        await navigator.clipboard?.writeText(summaryToPlainText(res)).catch(() => {});
        toast('Summary copied!', 'ok');
      };
    }
    hydrateIcons(container);
  }

  async function processEventsAndRender(result, targetEl, { autoSave = true } = {}) {
    const rawEvents = result?.events || [];
    const seenKeys = new Set();
    const events = [];
    for (const ev of rawEvents) {
      if (!ev || !ev.title) continue;
      const k = normalizeEventKey(ev);
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      events.push(ev);
    }

    const savedMap = new Map();
    if (autoSave && events.length) {
      for (let i = 0; i < events.length; i++) {
        try {
          const saved = await saveExtractedEventToSpace(events[i]);
          const savedId = typeof saved === 'string' ? saved : saved?.id;
          if (savedId) savedMap.set(i, savedId);
        } catch {}
      }
      if (savedMap.size) {
        toast(`Saved ${savedMap.size} event${savedMap.size > 1 ? 's' : ''} to ZovioSpace Calendar!`, 'ok');
      }
    } else if (events.length) {
      for (let i = 0; i < events.length; i++) {
        const existing = findExistingWorkspaceEvent(events[i]);
        if (existing?.id) savedMap.set(i, existing.id);
      }
    }

    targetEl.innerHTML = `
      <div class="zai-result-card">
        <div class="zai-result-head">
          <h4 class="zai-result-title">${aiIco('calendar')} <span>${savedMap.size ? 'Added to Calendar' : 'Extracted Events'}</span></h4>
        </div>
        ${result.reply ? `<p class="zai-event-reply">${esc(result.reply)}</p>` : ''}
        ${result.needsApiKeyForVision ? `
          <div class="zai-notice">
            To read screenshots &amp; movie tickets automatically, paste a free <strong>Google Gemini API Key</strong> in Settings → Zovio AI.
            <div style="margin-top:8px">
              <button type="button" class="btn primary sm" data-zai-open-settings="1">Open Zovio AI Settings</button>
            </div>
          </div>
        ` : ''}
        <div class="col gap-s">
          ${events.map((ev, idx) => {
            const isSaved = savedMap.has(idx);
            const evDateObj = new Date((ev.date || todayIsoLocal()) + 'T00:00:00');
            const monthLbl = evDateObj.toLocaleDateString([], { month: 'short' });
            const dayLbl = (ev.date || '').split('-')[2] || '--';
            const cleanNotes = String(ev.notes || '').replace(/^Location:\s*.+$/gim, '').trim();
            return `
              <div class="zai-event-card" data-ev-idx="${idx}">
                <div class="zai-event-top">
                  <div class="zai-event-date-pill">
                    <span class="zai-ev-month">${esc(monthLbl)}</span>
                    <span class="zai-ev-day">${esc(dayLbl)}</span>
                  </div>
                  <div class="zai-event-info">
                    <strong class="zai-ev-title">${esc(ev.title)}</strong>
                    <div class="zai-ev-meta">
                      <span class="zai-ev-chip">${aiIco('calendar')} ${esc(ev.date)}</span>
                      <span class="zai-ev-chip">${aiIco('clock')} ${esc(ev.time || '10:00')}</span>
                    </div>
                    ${ev.location ? `<div class="zai-ev-loc">${aiIco('pin')} <span>${esc(ev.location)}</span></div>` : ''}
                    ${cleanNotes ? `<div class="zai-ev-notes">${esc(cleanNotes)}</div>` : ''}
                  </div>
                </div>
                <div class="zai-event-actions">
                  ${isSaved
                    ? `<button type="button" class="btn ghost sm" data-zai-view-cal="1">Saved ✓ View</button>
                       <button type="button" class="btn ghost xs" data-zai-undo-ev="${esc(savedMap.get(idx))}">Undo</button>`
                    : `<button type="button" class="btn primary sm" data-zai-add-ev="${idx}">+ Add to Calendar</button>`}
                </div>
              </div>`;
          }).join('')}
        </div>
        ${(result.tasks && result.tasks.length) ? `
          <div class="zai-action-row" style="margin-top:8px">
            <button type="button" class="btn ghost sm" data-zai-save-ev-tasks="1">${icon('check')} <span>Save ${result.tasks.length} Prep Task(s)</span></button>
          </div>
        ` : ''}
      </div>`;

    hydrateIcons(targetEl);

    targetEl.querySelector('[data-zai-open-settings]')?.addEventListener('click', () => {
      try { closeModal?.(); } catch {}
      document.getElementById('meBtn')?.click();
      setTimeout(() => { if (typeof renderProfileView === 'function') renderProfileView('ai'); }, 80);
    });

    targetEl.querySelectorAll('[data-zai-view-cal]').forEach(b => {
      b.onclick = () => jumpToWorkspace('calendar');
    });

    targetEl.querySelectorAll('[data-zai-undo-ev]').forEach(b => {
      b.onclick = async () => {
        const id = b.dataset.zaiUndoEv;
        if (typeof deleteWsItem === 'function') await deleteWsItem(id);
        b.closest('.zai-event-card')?.remove();
        toast('Removed event from Calendar', 'ok');
      };
    });

    targetEl.querySelectorAll('[data-zai-add-ev]').forEach(b => {
      b.onclick = async () => {
        if (b.dataset.saved === '1') {
          jumpToWorkspace('calendar');
          return;
        }
        const idx = Number(b.dataset.zaiAddEv);
        const ev = events[idx];
        if (!ev) return;
        b.disabled = true;
        try {
          const saved = await saveExtractedEventToSpace(ev);
          const savedId = typeof saved === 'string' ? saved : saved?.id;
          b.dataset.saved = '1';
          b.textContent = 'Saved ✓ View';
          b.className = 'btn ghost sm';
          b.disabled = false;
          if (savedId && b.parentElement) {
            const undoBtn = document.createElement('button');
            undoBtn.type = 'button';
            undoBtn.className = 'btn ghost xs';
            undoBtn.textContent = 'Undo';
            undoBtn.onclick = async () => {
              if (typeof deleteWsItem === 'function') await deleteWsItem(savedId);
              b.closest('.zai-event-card')?.remove();
              toast('Removed event from Calendar', 'ok');
            };
            b.parentElement.appendChild(undoBtn);
          }
          toast(`Saved "${ev.title}" to Calendar!`, 'ok');
        } catch (err) {
          b.disabled = false;
          toast(err.message || 'Could not save event', 'err');
        }
      };
    });

    targetEl.querySelector('[data-zai-save-ev-tasks]')?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const saved = await saveExtractedTasksToSpace(result.tasks || []);
      btn.textContent = `Saved ${saved.length} Task(s) ✓`;
      toast('Saved prep tasks to ZovioSpace!', 'ok');
    });
  }

  function showResultModal(title, renderFn) {
    showModal(title, `<div id="zaiModalResultRoot" class="zai-modal-body">${aiLoaderHtml('Zovio AI is thinking…')}</div>`, async mbox => {
      const root = mbox.querySelector('#zaiModalResultRoot');
      hydrateIcons(root);
      try {
        await renderFn(root);
      } catch (err) {
        root.innerHTML = `<div class="zai-error">${esc(err.message || 'Zovio AI request failed')}</div>`;
      }
    });
  }

  async function summarizeArticleUrl(url, customPrompt = '') {
    showResultModal('Zovio AI — Article Explanation', async root => {
      const res = await aiRequest('/api/ai/summarize', { url, customPrompt });
      root.innerHTML = renderSummaryCardHtml(res);
      wireSummaryCardActions(root, res);
    });
  }

  async function summarizePdfFile(file, customPrompt = '') {
    if (!file) return;
    if (file.size > 14 * 1024 * 1024) {
      return toast('PDF must be under 14 MB for AI analysis', 'err');
    }
    showResultModal(`Zovio AI — ${file.name}`, async root => {
      const pdfBase64 = await blobToBase64(file);
      const res = await aiRequest('/api/ai/summarize', {
        pdfBase64,
        pdfName: file.name,
        title: file.name.replace(/\.pdf$/i, ''),
        customPrompt
      });
      root.innerHTML = renderSummaryCardHtml(res);
      wireSummaryCardActions(root, res);
    });
  }

  function pickLocalFileAndRun(accept, handler) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (f) handler(f);
    };
    inp.click();
  }

  async function extractAndSaveEvent({ text = '', file = null, autoSave = true }) {
    showResultModal('Zovio AI — Smart Calendar', async root => {
      const body = { text, todayISO: todayIsoLocal() };
      if (file) {
        body.imageBase64 = await blobToBase64(file);
        body.imageMime = file.type || 'image/jpeg';
        body.imageName = file.name || 'ticket.jpg';
      }
      const res = await aiRequest('/api/ai/extract-event', body);
      await processEventsAndRender(res, root, { autoSave });
    });
  }

  function getActiveChatPlainMessages(limit = 30) {
    const cid = window.S?.activeChatId;
    if (!cid) return [];
    const list = window.S.msgs.get(cid) || [];
    return list
      .filter(m => !m.deleted && !m.deletedForEveryone)
      .slice(-limit)
      .map(m => {
        const sender = m.senderId === S.user?.id
          ? (S.user?.name || 'Me')
          : (S.users.get(m.senderId)?.name || 'Participant');
        const p = m._plain || m.body || {};
        const txt = typeof p === 'string' ? p : (p.text || p.caption || (p.name ? `[File: ${p.name}]` : ''));
        return txt ? { sender, text: txt, ts: m.ts } : null;
      })
      .filter(Boolean);
  }

  async function summarizeCurrentChat() {
    const allMsgs = getActiveChatPlainMessages(80);
    if (!allMsgs.length) return toast('No text messages in this chat to summarize yet', 'warn');
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const msgs = allMsgs.filter(m => {
      const rawTs = Number(m.ts || 0);
      const ms = rawTs > 1e12 ? rawTs : rawTs * 1000;
      return ms >= fiveMinAgo;
    });
    if (!msgs.length) {
      return toast('No messages in the last 5 minutes to summarize', 'warn');
    }
    showResultModal(`Zovio AI — Last 5 Mins Summary (${msgs.length} msg${msgs.length > 1 ? 's' : ''})`, async root => {
      setAiTriggerLoading('#aiComposeBtn', true);
      try {
        const res = await aiRequest('/api/ai/chat', {
          action: 'summarize_chat',
          messages: msgs,
          todayISO: todayIsoLocal()
        });
        root.innerHTML = renderSummaryCardHtml(res);
        wireSummaryCardActions(root, res);
        if (Array.isArray(res.events) && res.events.length) {
          const evWrap = document.createElement('div');
          evWrap.style.marginTop = '12px';
          root.appendChild(evWrap);
          await processEventsAndRender({ provider: res.provider, events: res.events, reply: 'Dates found in recent chat:' }, evWrap, { autoSave: false });
        }
      } finally {
        setAiTriggerLoading('#aiComposeBtn', false);
      }
    });
  }

  async function askInCurrentChat(prompt) {
    const msgs = getActiveChatPlainMessages(20);
    showResultModal('Zovio AI', async root => {
      setAiTriggerLoading('#aiComposeBtn', true);
      try {
        const res = await aiRequest('/api/ai/chat', {
          action: 'ask',
          prompt,
          messages: msgs,
          todayISO: todayIsoLocal()
        });
        root.innerHTML = renderSummaryCardHtml(res);
        wireSummaryCardActions(root, res);
        if (Array.isArray(res.events) && res.events.length) {
          const evWrap = document.createElement('div');
          evWrap.style.marginTop = '12px';
          root.appendChild(evWrap);
          await processEventsAndRender({ provider: res.provider, events: res.events, reply: 'Calendar Event Detected:' }, evWrap, { autoSave: true });
        }
      } finally {
        setAiTriggerLoading('#aiComposeBtn', false);
      }
    });
  }

  async function analyzeChatPdfMessage(mid) {
    const list = window.S?.msgs?.get(S.activeChatId) || [];
    const m = list.find(x => x.id === mid);
    if (!m) return;
    const p = m._plain || m.body || {};
    showResultModal(`Zovio AI — ${p.name || 'PDF Explanation'}`, async root => {
      root.innerHTML = aiLoaderHtml('Decrypting & reading PDF…');
      hydrateIcons(root);
      const url = await fetchDecryptedBlob(m);
      const blob = await fetch(url).then(r => r.blob());
      if (blob.size > 14 * 1024 * 1024) throw new Error('PDF exceeds 14 MB limit for AI analysis');
      const pdfBase64 = await blobToBase64(blob);
      const res = await aiRequest('/api/ai/summarize', {
        pdfBase64,
        pdfName: p.name || 'document.pdf',
        title: (p.name || 'Document').replace(/\.pdf$/i, '')
      });
      root.innerHTML = renderSummaryCardHtml(res);
      wireSummaryCardActions(root, res);
    });
  }

  async function analyzeChatImageForEvent(mid) {
    const list = window.S?.msgs?.get(S.activeChatId) || [];
    const m = list.find(x => x.id === mid);
    if (!m) return;
    const p = m._plain || m.body || {};
    showResultModal('Zovio AI — Ticket & Event Scanner', async root => {
      root.innerHTML = aiLoaderHtml('Decrypting image & scanning for dates…');
      hydrateIcons(root);
      const url = await fetchDecryptedBlob(m);
      const blob = await fetch(url).then(r => r.blob());
      const imageBase64 = await blobToBase64(blob);
      const res = await aiRequest('/api/ai/extract-event', {
        imageBase64,
        imageMime: blob.type || p.mime || 'image/jpeg',
        imageName: p.name || 'photo.jpg',
        text: p.caption || '',
        todayISO: todayIsoLocal()
      });
      await processEventsAndRender(res, root, { autoSave: true });
    });
  }

  async function openMessageAiMenu(m) {
    if (!m) return;
    const p = m._plain || m.body || {};
    const txt = String(p.text || p.caption || '').trim();
    const isPdf = (m.kind === 'file') && (/pdf/i.test(p.mime || '') || /\.pdf$/i.test(p.name || ''));
    const isImg = m.kind === 'image';
    const urlMatch = txt.match(/https?:\/\/[^\s<>"']+/i);

    if (isPdf) return analyzeChatPdfMessage(m.id);
    if (isImg && !txt) return analyzeChatImageForEvent(m.id);

    showModal('Ask Zovio AI About Message', `
      <div class="col gap-s">
        <div class="zai-tldr" style="margin:0">
          <strong>Message Preview</strong>
          <p style="margin-top:4px">${esc(txt.slice(0, 260) || `[${m.kind}]`)}${txt.length > 260 ? '…' : ''}</p>
        </div>
        <div class="col gap-xs" id="zaiMsgOptList">
          <button type="button" class="info-action-row" data-ma="explain">${icon('sparkle')} <span>Explain / Simplify This Message</span></button>
          ${urlMatch ? `<button type="button" class="info-action-row" data-ma="url">${icon('link')} <span>Explain Link (${esc(urlMatch[0].slice(0, 40))}…)</span></button>` : ''}
          <button type="button" class="info-action-row" data-ma="event">${icon('calendar')} <span>Extract &amp; Save Date to Calendar</span></button>
          <button type="button" class="info-action-row" data-ma="note">${icon('note')} <span>Save Structured Note to ZovioSpace</span></button>
          <button type="button" class="info-action-row" data-ma="replies">${icon('reply')} <span>Suggest Smart Replies</span></button>
          ${isImg ? `<button type="button" class="info-action-row" data-ma="scanimg">${icon('image')} <span>Scan Image Ticket / Flyer → Calendar</span></button>` : ''}
        </div>
      </div>
    `, mbox => {
      hydrateIcons(mbox);
      mbox.querySelectorAll('[data-ma]').forEach(btn => {
        btn.onclick = async () => {
          const act = btn.dataset.ma;
          closeModal();
          if (act === 'url' && urlMatch) return summarizeArticleUrl(urlMatch[0]);
          if (act === 'scanimg') return analyzeChatImageForEvent(m.id);
          if (act === 'event') return extractAndSaveEvent({ text: txt, autoSave: true });
          if (act === 'note') {
            showResultModal('Save as ZovioSpace Note', async root => {
              const res = await aiRequest('/api/ai/summarize', { text: txt, title: 'Chat Note' });
              root.innerHTML = renderSummaryCardHtml(res);
              wireSummaryCardActions(root, res);
            });
            return;
          }
          if (act === 'replies') {
            return showSmartRepliesForChat([{ sender: S.users.get(m.senderId)?.name || 'User', text: txt }]);
          }
          askInCurrentChat(`Explain and summarize this message clearly:\n"${txt}"`);
        };
      });
    });
  }

  async function showSmartRepliesForChat(customMessages = null) {
    const bar = document.getElementById('zaiSmartRepliesBar');
    const msgs = customMessages || getActiveChatPlainMessages(8);
    if (!msgs.length) return toast('No recent messages to reply to yet', 'warn');
    if (bar) {
      bar.classList.remove('hidden');
      bar.innerHTML = `<div class="zai-sr-head"><span class="zai-sr-title">${aiIconHtml('Thinking of reply ideas…')}</span></div>`;
      hydrateIcons(bar);
    }
    setAiTriggerLoading('#aiComposeBtn', true);
    try {
      const res = await aiRequest('/api/ai/chat', { action: 'smart_replies', messages: msgs });
      const replies = res.replies || [];
      if (!bar) return;
      if (!replies.length) {
        bar.classList.add('hidden');
        return;
      }
      bar.innerHTML = `
        <div class="zai-sr-head">
          <span class="zai-sr-title">${icon('sparkle')} <span>Smart Reply Ideas</span></span>
          <button type="button" class="zai-sr-close" title="Hide suggestions">${icon('close')}</button>
        </div>
        <div class="zai-sr-list">
          ${replies.map(r => `<button type="button" class="zai-chip" data-zai-sr="${esc(r)}"><span class="zai-chip-txt">${esc(r)}</span><span class="zai-chip-go">↗</span></button>`).join('')}
        </div>
      `;
      hydrateIcons(bar);
      bar.querySelectorAll('[data-zai-sr]').forEach(b => {
        b.onclick = () => {
          applyTextToComposer(b.dataset.zaiSr, '');
          bar.classList.add('hidden');
        };
      });
      bar.querySelector('.zai-sr-close').onclick = () => bar.classList.add('hidden');
    } catch (err) {
      if (bar) bar.classList.add('hidden');
      toast(err.message || 'Could not generate replies', 'err');
    } finally {
      setAiTriggerLoading('#aiComposeBtn', false);
    }
  }

  async function rewriteComposerDraft(tone) {
    const inp = document.getElementById('msgInput');
    const draft = inp?.value?.trim();
    if (!draft) return toast('Type a message draft first to rewrite it', 'warn');
    setAiTriggerLoading('#aiComposeBtn', true);
    try {
      const res = await aiRequest('/api/ai/chat', {
        action: 'rewrite',
        prompt: draft,
        tone
      });
      if (res.text && inp) {
        applyTextToComposer(res.text, '');
      }
    } catch (err) {
      toast(err.message || 'Rewrite failed', 'err');
    } finally {
      setAiTriggerLoading('#aiComposeBtn', false);
    }
  }

  // ---------------- Inline Chat Message Event Detection Pill ----------------
  function detectChatEventHint(msg) {
    if (!msg || msg.deleted || msg.deletedForEveryone) return null;
    const bodyObj = (msg._plain && typeof msg._plain === 'object')
      ? msg._plain
      : ((msg.body && typeof msg.body === 'object') ? msg.body : null);
    const raw = String(
      (bodyObj ? (bodyObj.text || bodyObj.caption) : (typeof msg.body === 'string' ? msg.body : ''))
      || msg.text || msg.caption || ''
    ).trim();
    if (!raw || raw.length < 5 || raw.length > 480) return null;
    if (/^https?:\/\/\S+$/i.test(raw)) return null;
    const lower = raw.toLowerCase();

    const monthPat = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
    const hasDateWord =
      /\b(today|tonight|tonite|2nite|tmrw|tmr|tomo|tomorrow|2mrw|day\s+after\s+tomorrow|overmorrow|kal|aaj|parso|parson|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|next\s+week|this\s+week|next\s+month|this\s+weekend|next\s+weekend|weekend)\b/.test(lower)
      || new RegExp(`\\b${monthPat}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`).test(lower)
      || new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthPat}\\b`).test(lower)
      || /\b(?:on\s+(?:the\s+)?|this\s+|by\s+(?:the\s+)?)?\d{1,2}(?:st|nd|rd|th)\b/.test(lower)
      || /\b(?:in|after)\s+\d{1,2}\s+(?:day|days|hr|hrs|hour|hours|week|weeks)\b/.test(lower)
      || /\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/.test(lower)
      || /\b20\d{2}-\d{1,2}-\d{1,2}\b/.test(lower);

    const hasTimeSignal =
      /\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/i.test(lower)
      || /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(lower)
      || /(?:^|\s)(?:at|@|around|by|from|between|till|until)\s*\d{1,2}(?:[:.]\d{2})?\b/i.test(lower)
      || /\b\d{1,2}\s*(?:baje|o'?\s*clock)\b/i.test(lower)
      || /\b(?:morning|afternoon|evening|eve|night|noon|midnight|lunchtime|dinnertime|subah|shaam|raat|dopahar)\b/.test(lower);

    const hasEventKeyword =
      /\b(?:plan|plans|planning|date|meet(?:ing|up)?|sync|standup|huddle|scrum|call|zoom|gmeet|teams|webinar|workshop|seminar|conference|bootcamp|hackathon|symposium|hang\s*out|hangout|catch\s*up|catchup|chill|chilling|outing|picnic|trek|trekking|camping|camp|hike|hiking|road\s*trip|get\s*together|reunion|farewell|freshers|dinner|lunch|brunch|breakfast|coffee|cafe|tea|chai|sutta|drinks|bar|pub|club|buffet|treat|feast|movie|movies|film|cinema|theatre|theater|imax|pvr|inox|screening|show|showtime|concert|gig|live\s+music|standup\s+comedy|fest|festival|carnival|exhibition|fair|flight|train|bus|cab|taxi|boarding|departure|arrival|appointment|doctor|dentist|dermat|physio|therapy|hospital|clinic|checkup|vaccination|lab\s+test|interview|viva|demo|pitch|presentation|review|orientation|induction|session|class|lecture|tuition|coaching|doubt\s+session|extra\s+class|exam|midsem|endsem|finals|prelims|mains|test|quiz|mock|practical|lab|submission|assignment|party|house\s*party|afterparty|bday|birthday|anniversary|celebration|ceremony|function|puja|pooja|iftaar|sangeet|mehendi|haldi|wedding|shaadi|baraat|reception|engagement|deadline|due|reminder|remind|schedule|scheduled|reschedule|postponed|event|reservation|booking|booked|ticket|tickets|table|slot|trip|travel|tour|vacation|staycation|holiday|match|game|play|playing|turf|cricket|football|futsal|badminton|tennis|pickleball|basketball|volleyball|bowling|arcade|pool|snooker|swimming|run|marathon|cycling|gym|workout|yoga|zumba|pilates|shopping|mall|market|thrifting|salon|spa|parlour|haircut|grooming|visit|visiting|darshan|mandir|temple|church|mosque|gurudwara|milte|milo|milna|chalte|chalo|chalna|free\s+(?:on|at|tomorrow|tmrw|today|tonight|this|next))\b/.test(lower)
      || /\b(?:let'?s\s+(?:go|meet|catch|do|have|watch|play|grab|plan)|shall\s+we\s+(?:go|meet|catch|do|watch|play|grab)|are\s+you\s+free|u\s+free|free\s+hai|kya\s+plan)\b/.test(lower);

    if ((hasDateWord && (hasTimeSignal || hasEventKeyword)) || (hasEventKeyword && hasTimeSignal)) {
      return raw;
    }
    return null;
  }

  function extractRawMsgText(msg) {
    if (!msg || msg.deleted || msg.deletedForEveryone) return '';
    const bodyObj = (msg._plain && typeof msg._plain === 'object')
      ? msg._plain
      : ((msg.body && typeof msg.body === 'object') ? msg.body : null);
    return String(
      (bodyObj ? (bodyObj.text || bodyObj.caption) : (typeof msg.body === 'string' ? msg.body : ''))
      || msg.text || msg.caption || ''
    ).trim();
  }

  function detectChatTaskHint(msg) {
    const raw = extractRawMsgText(msg);
    if (!raw || raw.length < 4 || raw.length > 800) return null;
    if (/^https?:\/\/\S+$/i.test(raw)) return null;
    const lower = raw.toLowerCase();

    const hasReminderPhrase =
      /\b(?:remind(?:\s+me|\s+us|\s+him|\s+her|\s+them)?|reminder|don'?t\s+forget|do\s+not\s+forget|never\s+forget|remember\s+to|make\s+sure\s+(?:to|you|we|i|he|she|they)|be\s+sure\s+to|set\s+(?:a\s+)?reminder|add\s+(?:to\s+)?(?:tasks?|todo|to-do)|put\s+(?:on|in)\s+(?:my\s+|the\s+)?(?:tasks?|todo|to-do|list)|keep\s+in\s+mind|mental\s+note|note\s+to\s+self|yaad\s+(?:dilana|dila\s+dena|rakhna|rakh\s+lena|karana|kara\s+dena|se)|bhoolna\s+mat|bhulna\s+mat|mat\s+bhoolna|mat\s+bhulna)\b/.test(lower);

    const actionVerbPat = '(?:complete|finish|submit|hand\\s+in|turn\\s+in|send|forward|share|mail|email|message|text|dm|upload|post|publish|download|fetch|prepare|make|create|draft|write|rewrite|edit|proofread|review|check|recheck|verify|validate|confirm|approve|audit|inspect|fix|resolve|solve|debug|patch|refactor|update|upgrade|install|uninstall|configure|setup|set\\s+up|compile|build|deploy|release|push|merge|commit|test|run|execute|backup|back\\s+up|restore|clean|wash|sweep|mop|vacuum|iron|fold|declutter|organize|arrange|sort|file|archive|print|scan|xerox|photocopy|sign|fill|fill\\s+out|fill\\s+in|register|enroll|apply|book|reserve|schedule|reschedule|cancel|renew|extend|order|reorder|buy|purchase|get|grab|bring|carry|pack|unpack|pick\\s+up|drop|drop\\s+off|deliver|return|exchange|replace|repair|mend|pay|repay|transfer|send\\s+money|gpay|phonepe|paytm|clear|settle|recharge|top\\s+up|call|ring|phone|dial|call\\s+back|contact|reach\\s+out|follow\\s+up|ping|poke|remind|read|study|revise|learn|memorize|practice|solve|research|summarize|collect|gather|find|look\\s+up|search|track|monitor|measure|calculate|count|log|record|update)';

    const hasWorkDirective =
      /\b(?:do\s+(?:this|the|my|our|your|some|that|all|pending|remaining)?\s*(?:work|task|tasks|job|assignment|assignments|homework|hw|project|practical|lab|record|file|filing|chore|chores|errand|errands|thing|things|part|section|module)|work\s+on\s+\S+|take\s+care\s+of\s+\S+|get\s+(?:this|it|that|the\s+\S+)\s+done|finish\s+up\s+\S+|wrap\s+up\s+\S+)\b/.test(lower)
      || new RegExp(`^(?:please\\s+|plz\\s+|pls\\s+|kindly\\s+|bro\\s+|bhai\\s+|yaar\\s+|hey\\s+|just\\s+|also\\s+)?${actionVerbPat}\\s+(?:the\\s+|this\\s+|that\\s+|my\\s+|our\\s+|your\\s+|his\\s+|her\\s+|their\\s+|some\\s+|all\\s+|these\\s+|those\\s+|a\\s+|an\\s+)?[a-z0-9]`, 'i').test(raw.trim())
      || new RegExp(`\\b(?:please|plz|pls|kindly|can\\s+you|could\\s+you|would\\s+you|will\\s+you|try\\s+to|have\\s+to|need\\s+to|got\\s+to|gotta|must|should|ought\\s+to|supposed\\s+to|going\\s+to|gonna|time\\s+to|left\\s+to|pending\\s+to)\\s+${actionVerbPat}\\b`, 'i').test(lower)
      || /\b(?:kar\s+lena|kr\s+lena|kar\s+dena|kr\s+dena|karna\s+hai|krna\s+hai|karna\s+padega|bhej\s+dena|bhejna\s+hai|jama\s+karna|submit\s+karna|complete\s+karna|finish\s+karna|dekh\s+lena|check\s+kar\s+lena|call\s+kar\s+lena|baat\s+kar\s+lena|le\s+aana|leke\s+aana|laa\s+dena|de\s+dena|puch\s+lena|likh\s+lena|padh\s+lena|banake\s+dena|bana\s+lena|kaam\s+kar|ye\s+kaam)\b/.test(lower);

    const hasTaskPrefixOrNoun =
      /^(?:todo|to-do|to\s+do|task|tasks|work|my\s+work|pending|reminder|reminders|action\s*item|action\s*items|next\s*steps?|urgent|important|priority|asap|homework|hw|assignment|checklist|errands?|chores?|shopping|to\s+buy|to\s+bring|to\s+call|to\s+pay|to\s+read|to\s+study|to\s+submit|to\s+complete|to\s+fix|goals?|targets?)\s*[:\-]/i.test(raw.trim())
      || /\b(?:homework|assignment|assignments|lab\s+manual|lab\s+record|practical\s+file|project\s+report|pending\s+work|remaining\s+work|office\s+work|college\s+work|school\s+work|house\s+work|project\s+work|action\s+item|to-?do\s+list|task\s+list|work\s+list|task\s+for\s+(?:you|me|us|today|tomorrow|tmrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|due\s+(?:today|tomorrow|tmrw|tonight|on|by|this)|deadline\s+(?:is|today|tomorrow|tmrw|on|by)|submission\s+(?:is|today|tomorrow|tmrw|on|by)|by\s+eod|before\s+eod)\b/.test(lower)
      || /\b(?:i|you|we|he|she|they)\s+(?:need|needs|have|has|got|must|should|ought)\s+to\s+\S+/.test(lower)
      || /\b(?:i'?ve\s+got\s+to|you'?ve\s+got\s+to|we'?ve\s+got\s+to|i\s+gotta|you\s+gotta|we\s+gotta|don'?t\s+let\s+me\s+forget)\b/.test(lower)
      || /\b(?:buy|bring|pick\s+up|drop\s+off|pay\s+(?:the|my|our|for|bill|electricity|wifi|internet|water|gas|rent|emi|fees|tuition|credit\s+card)|recharge|call\s+back|follow\s+up\s+(?:with|on)|renew\s+(?:the|my|subscription|membership|insurance|license|passport))\b/.test(lower);

    if (hasReminderPhrase || hasWorkDirective || hasTaskPrefixOrNoun) {
      return raw;
    }
    return null;
  }

  function detectChatNoteHint(msg) {
    const raw = extractRawMsgText(msg);
    if (!raw || raw.length < 8 || raw.length > 12000) return null;
    if (/^https?:\/\/\S+$/i.test(raw)) return null;
    const lower = raw.toLowerCase();

    const hasExplicitNoteCue =
      /^(?:note|notes|study\s+notes|lecture\s+notes|class\s+notes|meeting\s+notes|revision\s+notes|short\s+notes|quick\s+notes|handwritten\s+notes|exam\s+notes|unit\s+\d+|chapter\s+\d+|module\s+\d+|topic|summary|tldr|tl;dr|abstract|synopsis|overview|recap|key\s+points|main\s+points|important\s+points|bullet\s+points|takeaways|key\s+takeaways|highlights|definition|definitions|meaning|concept|explanation|theory|formula|formulas|equation|equations|derivation|theorem|law|laws|principle|postulate|axiom|rule|rules|syntax|grammar|vocab|vocabulary|idioms|cheat\s*sheet|reference|quick\s+reference|guide|tutorial|how\s+to|walkthrough|roadmap|syllabus|curriculum|portion|topics|chapters|steps|procedure|process|protocol|methodology|algorithm|pseudocode|instructions|directions|manual|guidelines|best\s+practices|tips|tricks|hacks|shortcuts|commands|recipe|ingredients|method|preparation|workout|workout\s+plan|exercise|routine|diet|diet\s+plan|meal\s+plan|nutrition|macros|itinerary|travel\s+plan|packing\s+list|shopping\s+list|grocery\s+list|reading\s+list|book\s+list|watchlist|movie\s+list|playlist|bucket\s+list|wish\s+list|guest\s+list|inventory|minutes\s+of\s+meeting|mom|agenda|discussion\s+points|q&a|faq|faqs|questions?|answers?|solution|solutions|solved|pros\s+and\s+cons|advantages|disadvantages|comparison|difference\s+between|ideas?|brainstorm|brainstorming|thought|thoughts|reflection|journal|diary|draft|template|format|sample|example|caption|bio|prompt|script|speech|essay|paragraph|article|blog|letter|email\s+draft|lyrics|poem|poetry|shayari|quote|quotes|saying|address|location|venue\s+details|contact\s+info|details|info|information|credentials|login|wifi|wi-fi|password|passcode|pin|otp|bank\s+details|account\s+details|acc\s+no|account\s+number|ifsc|upi|gst|pan|aadhaar|server|config|configuration|env|api\s+key|token|secret|endpoint|port|ip|ssh|sql|query|snippet|code)\s*[:\-]/i.test(raw.trim())
      || /\b(?:here\s+(?:are|is)\s+(?:the\s+|some\s+|your\s+|my\s+|today'?s\s+|class\s+|lecture\s+|meeting\s+)?(?:notes?|summary|key\s+points|syllabus|formulas?|steps|recipe|details|info|list|questions|answers|solution|code|draft)|save\s+(?:this|these|it)(?:\s+in|\s+to|\s+as)?\s*(?:a\s+)?(?:notes?|for\s+later|for\s+reference)?|note\s+(?:this|these|it)\s+down|write\s+(?:this|these|it)\s+down|jot\s+(?:this|these|it)\s+down|put\s+(?:this|it)\s+in\s+(?:your\s+|my\s+)?notes?|add\s+(?:this|it)\s+to\s+(?:your\s+|my\s+)?notes?|keep\s+(?:this|these|it)\s+(?:in\s+(?:your\s+|my\s+)?notes?|saved|handy|for\s+reference|for\s+later|on\s+record)|keep\s+a\s+(?:note|record|copy)\s+of|take\s+(?:a\s+)?note|make\s+a\s+note|for\s+(?:your|my|our|future)\s+(?:notes|reference|record|study|revision)|bookmark\s+(?:this|it)|pin\s+(?:this|it)|don'?t\s+lose\s+this|important\s+(?:notes?|info|information|points|details|formulas?|questions?|topics)|study\s+material|reference\s+material|lecture\s+notes|class\s+notes|revision\s+notes|meeting\s+notes|short\s+notes|key\s+takeaways|points\s+to\s+remember|things\s+to\s+remember|likh\s+ke\s+rakh|note\s+kar\s+lo|note\s+kar\s+lena|save\s+kar\s+lo|save\s+kar\s+lena|kaam\s+aayega)\b/.test(lower);

    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const bulletLines = lines.filter(l => /^(?:[-*•→⇒▸▹✔✓☑▪▫◦]|\d+[.)]|\(\d+\)|[a-zA-Z][.)]|step\s+\d+\b|point\s+\d+\b|q\d*[:.)]|a\d*[:.)])/i.test(l));
    const keyValueLines = lines.filter(l => /^[A-Za-z0-9_][A-Za-z0-9\s/()&.#_-]{1,36}\s*[:=-]\s*\S+/.test(l));
    const headingLines = lines.filter(l => /^#{1,4}\s+\S+/.test(l) || /^\*\*[^*]{2,60}\*\*\s*[:\-]?/.test(l) || /^[A-Z][A-Za-z0-9\s/()&-]{2,36}:\s*\S+/.test(l));
    const hasCodeOrMath = /```[\s\S]+```|`[^`\n]{6,}`|\\(?:frac|sqrt|sum|int|alpha|beta|gamma|Delta|pi|omega|lambda|theta)|[=≈≠≤≥±×÷∑∫πΔλ]|(?:\b(?:function|const|let|var|def|class|SELECT|INSERT|UPDATE|FROM|WHERE|import|export|return)\b[\s\S]{12,})/.test(raw) && raw.length >= 25;
    const isMultiLineStructured = (bulletLines.length >= 2) || (headingLines.length >= 2) || (keyValueLines.length >= 2) || (lines.length >= 3 && raw.length >= 60);
    const isSubstantiveReference = raw.length >= 110 && (lines.length >= 2 || /[:;•\-—]/.test(raw) || /\b(?:because|therefore|however|example|for\s+instance|defined\s+as|refers\s+to|consists\s+of|means\s+that|steps\s+to|how\s+to)\b/.test(lower));

    if (hasExplicitNoteCue || hasCodeOrMath || isMultiLineStructured || isSubstantiveReference) {
      return raw;
    }
    return null;
  }

  function buildInlineMessageBarHtml(msg) {
    if (!msg || msg.deleted || msg.deletedForEveryone || msg.kind === 'note') return '';
    const calHint = detectChatEventHint(msg);
    const taskHint = detectChatTaskHint(msg);
    const noteHint = detectChatNoteHint(msg);
    if (!calHint && !taskHint && !noteHint) return '';

    const btns = [];
    if (calHint) {
      btns.push(`<button type="button" class="zai-inline-cal" data-ai-cal-event="${encodeURIComponent(calHint)}" title="Save detected event to ZovioSpace Calendar">${aiIco('calendar')} <span>Add to Calendar</span></button>`);
    }
    if (taskHint) {
      btns.push(`<button type="button" class="zai-inline-cal zai-inline-task" data-ai-add-task="${encodeURIComponent(taskHint)}" title="Add reminder or work item to ZovioSpace Tasks">${aiIco('check')} <span>Add to Tasks</span></button>`);
    }
    if (noteHint) {
      btns.push(`<button type="button" class="zai-inline-cal zai-inline-note" data-ai-save-note="${encodeURIComponent(noteHint)}" title="Save this content to ZovioSpace Notes">${aiIco('doc')} <span>Save to Notes</span></button>`);
    }
    return `<div class="zai-inline-actions">${btns.join('')}</div>`;
  }

  function parseLocalTaskFromMessage(text) {
    const raw = String(text || '').trim();
    const lower = raw.toLowerCase();
    const priority = /\b(?:urgent|asap|immediately|right\s+now|critical|high\s+priority|top\s+priority|important|must|deadline|by\s+eod|before\s+eod|jaldi|turant|zaruri)\b/.test(lower)
      ? 'high'
      : (/\b(?:low\s+priority|whenever|later|optional|no\s+rush|someday|jab\s+time\s+mile)\b/.test(lower) ? 'low' : 'medium');

    // Check multiple bullet lines
    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const bulletItems = lines
      .filter(l => /^(?:[-*•→⇒▸▹✔✓☑]|\d+[.)]|\(\d+\))\s+/.test(l))
      .map(l => l.replace(/^(?:[-*•→⇒▸▹✔✓☑]|\d+[.)]|\(\d+\))\s+/, '').trim())
      .filter(Boolean);

    let due = '';
    const base = new Date();
    const toIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const months = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11
    };
    const monthPat = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
    const isoMatch = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    const mDayMatch = lower.match(new RegExp(`\\b(${monthPat})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?\\b`, 'i'));
    const dayMMatch = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthPat})\\.?(?:,?\\s*(20\\d{2}))?\\b`, 'i'));
    const inDaysMatch = lower.match(/\b(?:in|after)\s+(\d{1,2})\s+days?\b/);
    const wdMap = { sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, weds: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6 };
    const wdMatch = lower.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\b/);

    if (isoMatch) {
      due = `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
    } else if (mDayMatch) {
      const mIdx = months[mDayMatch[1].replace(/\.$/, '').toLowerCase()];
      const day = Number(mDayMatch[2]);
      let yr = mDayMatch[3] ? Number(mDayMatch[3]) : base.getFullYear();
      let cand = new Date(yr, mIdx, day);
      if (!mDayMatch[3] && cand < new Date(base.getFullYear(), base.getMonth(), base.getDate())) cand = new Date(yr + 1, mIdx, day);
      due = toIso(cand);
    } else if (dayMMatch) {
      const day = Number(dayMMatch[1]);
      const mIdx = months[dayMMatch[2].replace(/\.$/, '').toLowerCase()];
      let yr = dayMMatch[3] ? Number(dayMMatch[3]) : base.getFullYear();
      let cand = new Date(yr, mIdx, day);
      if (!dayMMatch[3] && cand < new Date(base.getFullYear(), base.getMonth(), base.getDate())) cand = new Date(yr + 1, mIdx, day);
      due = toIso(cand);
    } else if (/\b(?:day\s+after\s+tomorrow|overmorrow|parson?)\b/.test(lower)) {
      const d = new Date(base); d.setDate(d.getDate() + 2); due = toIso(d);
    } else if (/\b(?:tomorrow|tmrw|tmr|tomo|2mrw|kal)\b/.test(lower)) {
      const d = new Date(base); d.setDate(d.getDate() + 1); due = toIso(d);
    } else if (/\b(?:today|tonight|tonite|2nite|aaj|by\s+eod|before\s+eod)\b/.test(lower)) {
      due = toIso(base);
    } else if (inDaysMatch) {
      const d = new Date(base); d.setDate(d.getDate() + Number(inDaysMatch[1])); due = toIso(d);
    } else if (wdMatch) {
      const target = wdMap[wdMatch[2]];
      const cur = base.getDay();
      let diff = (target - cur + 7) % 7;
      if (diff === 0 || wdMatch[1]) diff += 7;
      const d = new Date(base); d.setDate(d.getDate() + diff); due = toIso(d);
    }

    if (bulletItems.length >= 2) {
      return bulletItems.slice(0, 8).map(item => ({
        title: item.charAt(0).toUpperCase() + item.slice(1, 150),
        priority,
        due
      }));
    }

    let cleaned = raw
      .replace(/^(?:hey|hi|hello|yo|bro|bhai|yaar|listen|sun|suno)\b[,\s!]*/i, '')
      .replace(/^(?:todo|to-do|to\s+do|task|tasks|work|my\s+work|pending|reminder|reminders|action\s*item|urgent|important|priority|asap|homework|hw|assignment|checklist|errands?|chores?|goals?)\s*[:\-]\s*/i, '')
      .replace(/^(?:please\s+|plz\s+|pls\s+|kindly\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|will\s+you\s+|try\s+to\s+)?(?:remind\s+(?:me|us|him|her|them)\s+(?:to\s+|about\s+|that\s+|for\s+)?|don'?t\s+forget\s+(?:to\s+|about\s+)?|do\s+not\s+forget\s+(?:to\s+|about\s+)?|never\s+forget\s+to\s+|remember\s+to\s+|make\s+sure\s+(?:to\s+|you\s+|we\s+|i\s+|that\s+)?|be\s+sure\s+to\s+|set\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+|about\s+)?|add\s+(?:to\s+)?(?:tasks?|todo|to-do)\s*[:\-]?\s*|keep\s+in\s+mind\s+to\s+|note\s+to\s+self\s*[:\-]?\s*)/i, '')
      .replace(/^(?:please\s+|plz\s+|pls\s+|kindly\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|will\s+you\s+)/i, '')
      .replace(/^(?:i'?ve\s+got\s+to|you'?ve\s+got\s+to|we'?ve\s+got\s+to|i\s+gotta|you\s+gotta|we\s+gotta)\s+/i, '')
      .replace(/^(?:i|you|we|he|she|they)\s+(?:also\s+|really\s+|still\s+)?(?:need|needs|have|has|got|must|should|ought|supposed)\s+(?:to\s+)?/i, '')
      .replace(/^do\s+(?:this|the|my|our|your)\s+(?:work|task|job)\s*[:\-]?\s*/i, '')
      .replace(/\s+(?:yaad\s+dilana|yaad\s+rakhna|bhoolna\s+mat|bhulna\s+mat|mat\s+bhoolna)$/i, '')
      .replace(/[?!.]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) cleaned = raw.slice(0, 120);
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return [{ title: cleaned.slice(0, 150), priority, due }];
  }

  async function quickAddMessageToTasks(encodedText, btnEl) {
    const text = decodeURIComponent(String(encodedText || '')).trim();
    if (!text) return;
    if (btnEl?.dataset?.added === '1') {
      jumpToWorkspace('tasks');
      return;
    }
    const prevHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = aiIconHtml('Adding task…');
      hydrateIcons(btnEl);
    }
    try {
      let tasks = parseLocalTaskFromMessage(text);
      try {
        const out = await aiRequest('/api/ai/extract-event', {
          text: `Extract actionable task(s) from: "${text}"`,
          todayISO: todayIsoLocal()
        });
        if (Array.isArray(out?.tasks) && out.tasks.length) {
          tasks = out.tasks;
        } else if (Array.isArray(out?.events) && out.events.length && (!tasks.length || tasks[0].title === text)) {
          tasks = out.events.map(ev => ({
            title: ev.title || text.slice(0, 100),
            priority: 'medium',
            due: ev.date || ''
          }));
        }
      } catch {}

      const saved = await saveExtractedTasksToSpace(tasks);
      if (!saved.length) {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = prevHtml;
        }
        return toast('Could not add task', 'warn');
      }
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.dataset.added = '1';
        btnEl.classList.add('is-added');
        const firstTitle = String(tasks[0]?.title || 'Task').slice(0, 24);
        btnEl.innerHTML = `✓ <span>${saved.length > 1 ? `Added ${saved.length} Tasks` : `Added "${esc(firstTitle)}"`} · View</span>`;
      }
      toast(saved.length > 1 ? `Saved ${saved.length} tasks to ZovioSpace Tasks` : `Added "${tasks[0].title}" to Tasks`, 'ok');
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = prevHtml;
      }
      toast(err.message || 'Could not add task', 'err');
    }
  }

  function buildStructuredNoteFromMessageLocal(text) {
    const raw = String(text || '').trim();
    const cleaned = raw
      .replace(/^(?:here\s+(?:are|is)\s+(?:the\s+|some\s+|your\s+|my\s+|today'?s\s+|class\s+|lecture\s+|meeting\s+)?(?:notes?|summary|key\s+points|syllabus|formulas?|steps|recipe|details|info|list)\s*(?:on|for|about)?\s*[:\-]?\s*)/i, '')
      .replace(/^(?:(?:save|keep|put|add|bookmark)\s+(?:this|these|it)(?:\s+in|\s+to|\s+as|\s+for)?\s*(?:your\s+|my\s+)?(?:notes?|reference|later)?\s*[:\-]?\s*)/i, '')
      .replace(/^(?:(?:note|write|jot)\s+(?:this|these|it)\s+down\s*[:\-]?\s*)/i, '')
      .replace(/^(?:(?:study|lecture|class|meeting|revision|short|quick|important)\s+notes|notes?)\s*[:\-]\s*/i, '')
      .trim() || raw;

    const lines = cleaned.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    let title = 'Saved Chat Note';
    let bodyLines = lines;

    if (lines.length === 1) {
      const kvMatch = lines[0].match(/^([A-Za-z0-9][A-Za-z0-9\s/()&.#_-]{2,42})\s*[:\-]\s+(.+)$/);
      if (kvMatch) {
        title = kvMatch[1].trim();
        bodyLines = [kvMatch[2].trim()];
      } else {
        title = lines[0].split(/[.!?]/)[0].trim().slice(0, 56) || 'Saved Chat Note';
      }
    } else if (lines.length > 1) {
      const first = lines[0]
        .replace(/^#{1,4}\s+/, '')
        .replace(/^\*\*([^*]+)\*\*$/, '$1')
        .replace(/[:\-]+$/, '')
        .trim();
      if (first.length >= 3 && first.length <= 72) {
        title = first;
        bodyLines = lines.slice(1);
      } else {
        title = first.split(/[.!?]/)[0].trim().slice(0, 56) || 'Saved Chat Note';
      }
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return {
      title,
      isDraft: true,
      answer: bodyLines.join('\n') || cleaned
    };
  }

  async function quickSaveMessageToNotes(encodedText, btnEl) {
    const text = decodeURIComponent(String(encodedText || '')).trim();
    if (!text) return;
    if (btnEl?.dataset?.added === '1') {
      jumpToWorkspace('notes');
      return;
    }
    const prevHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = aiIconHtml('Saving note…');
      hydrateIcons(btnEl);
    }
    try {
      const noteData = buildStructuredNoteFromMessageLocal(text);
      await saveStructuredNoteToSpace(noteData);
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.dataset.added = '1';
        btnEl.classList.add('is-added');
        btnEl.innerHTML = `✓ <span>Saved "${esc(String(noteData.title || 'Note').slice(0, 22))}" · View</span>`;
      }
      toast(`Saved "${noteData.title}" to ZovioSpace Notes!`, 'ok');
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = prevHtml;
      }
      toast(err.message || 'Could not save note', 'err');
    }
  }

  async function quickAddMessageEventToCalendar(encodedText, btnEl) {
    const text = decodeURIComponent(String(encodedText || '')).trim();
    if (!text) return;
    if (btnEl?.dataset?.added === '1') {
      jumpToWorkspace('calendar');
      return;
    }
    const prevHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = aiIconHtml('Adding…');
      hydrateIcons(btnEl);
    }
    try {
      const out = await aiRequest('/api/ai/extract-event', {
        text,
        todayISO: todayIsoLocal()
      });
      const events = Array.isArray(out?.events) ? out.events : [];
      if (!events.length) {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = prevHtml;
        }
        return toast('Could not parse an exact date/time from that message', 'warn');
      }
      let savedCount = 0;
      for (const ev of events) {
        const saved = await saveExtractedEventToSpace(ev);
        if (saved) savedCount++;
      }
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.dataset.added = '1';
        btnEl.classList.add('is-added');
        const first = events[0];
        btnEl.innerHTML = `✓ <span>Added "${esc(String(first.title || 'Event').slice(0, 22))}" (${esc(first.date || '')}) · View</span>`;
      }
      toast(savedCount > 1 ? `Saved ${savedCount} events to Calendar` : `Added "${events[0].title}" to Calendar`, 'ok');
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = prevHtml;
      }
      toast(err.message || 'Could not add event', 'err');
    }
  }

  // ---------------- Dedicated Chat Assistant (Separate from Ask & Study) ----------------
  function openChatAssistant() {
    const msgs = getActiveChatPlainMessages(20);
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

    showModal('Zovio AI — Chat Assistant', `
      <div class="zai-hub">
        <div class="zai-hub-card col gap-s">
          <p class="zai-card-lead">Chat-aware assistant — ask anything about <strong>this conversation</strong>, draft replies, or spot plans.</p>
          ${lastMsg ? `<div class="zai-chat-ctx-pill">${aiIco('chat')} <span>Latest (${esc(lastMsg.sender)}): "${esc(String(lastMsg.text || '').slice(0, 90))}${String(lastMsg.text || '').length > 90 ? '…' : ''}"</span></div>` : ''}
          <div class="zai-chip-row">
            <button type="button" class="zai-chip-btn" data-ca-q="Draft a friendly, natural reply to the latest message">${aiIco('chat')} <span>Draft reply</span></button>
            <button type="button" class="zai-chip-btn" data-ca-q="Are there any dates, times, or meetup plans mentioned in this chat?">${aiIco('calendar')} <span>Check plans</span></button>
            <button type="button" class="zai-chip-btn" data-ca-q="Explain the key points and decisions from the recent chat messages">${aiIco('doc')} <span>Key points</span></button>
            <button type="button" class="zai-chip-btn" data-ca-q="Explain what the recent message means clearly in simple words and suggest a good response">${aiIco('lightbulb')} <span>Explain clearly</span></button>
          </div>
          <textarea id="zaiChatAskIn" rows="3" placeholder="Ask Zovio AI about this chat or tell it what reply to write…"></textarea>
          <div class="row between align-center wrap gap-s">
            <label class="zai-switch-wrap">
              <input type="checkbox" id="zaiChatUseCtx" checked class="zai-switch-input">
              <span class="zai-switch-track"><span class="zai-switch-thumb"></span></span>
              <span class="xs muted">Include chat history</span>
            </label>
            <button type="button" class="btn primary sm" id="zaiChatAskBtn">${icon('sparkle')} <span>Ask Chat AI</span></button>
          </div>
        </div>
        <div id="zaiChatAskResult" style="margin-top:10px"></div>
      </div>
    `, mbox => {
      hydrateIcons(mbox);
      const inp = mbox.querySelector('#zaiChatAskIn');
      const resEl = mbox.querySelector('#zaiChatAskResult');

      mbox.querySelectorAll('[data-ca-q]').forEach(ch => {
        ch.onclick = () => {
          inp.value = ch.dataset.caQ;
          mbox.querySelector('#zaiChatAskBtn').click();
        };
      });

      mbox.querySelector('#zaiChatAskBtn').onclick = async () => {
        const prompt = inp.value.trim();
        if (!prompt) return toast('Ask a question or pick a quick chat prompt', 'warn');
        const useCtx = mbox.querySelector('#zaiChatUseCtx').checked;
        resEl.innerHTML = aiLoaderHtml('Thinking about this chat…');
        hydrateIcons(resEl);
        try {
          const out = await aiRequest('/api/ai/chat', {
            action: 'ask',
            prompt,
            messages: useCtx ? getActiveChatPlainMessages(20) : [],
            todayISO: todayIsoLocal()
          });
          resEl.innerHTML = renderSummaryCardHtml(out);
          wireSummaryCardActions(resEl, out);
          if (Array.isArray(out.events) && out.events.length) {
            const evWrap = document.createElement('div');
            evWrap.style.marginTop = '10px';
            resEl.appendChild(evWrap);
            await processEventsAndRender({ provider: out.provider, events: out.events, reply: 'Event detected:' }, evWrap, { autoSave: false });
          }
        } catch (err) {
          resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Chat AI request failed')}</div>`;
        }
      };
    });
  }

  // ---------------- All-in-One Zovio AI Studio Modal ----------------
  function openHub(initialMode = 'summarize', opts = {}) {
    const validModes = ['summarize', 'calendar', 'write', 'ask'];
    const startMode = validModes.includes(initialMode) ? initialMode : 'summarize';

    showModal('Zovio AI Studio', `
      <div class="zai-hub">
        <div class="ws-tabs zai-hub-tabs">
          <button type="button" class="${startMode === 'summarize' ? 'active' : ''}" data-zh="summarize">${aiIco('doc')} <span>Explain</span></button>
          <button type="button" class="${startMode === 'calendar' ? 'active' : ''}" data-zh="calendar">${aiIco('calendar')} <span>Smart Calendar</span></button>
          <button type="button" class="${startMode === 'write' ? 'active' : ''}" data-zh="write">${aiIco('edit')} <span>AI Writer</span></button>
          <button type="button" class="${startMode === 'ask' ? 'active' : ''}" data-zh="ask">${aiIco('brain')} <span>Ask &amp; Study</span></button>
        </div>

        <div id="zaiHubBody" class="zai-hub-card col gap-s"></div>
        <div id="zaiHubResult" style="margin-top:10px"></div>
      </div>
    `, mbox => {
      const bodyEl = mbox.querySelector('#zaiHubBody');
      const resEl = mbox.querySelector('#zaiHubResult');
      let curMode = startMode;

      const renderMode = () => {
        mbox.querySelectorAll('[data-zh]').forEach(b => b.classList.toggle('active', b.dataset.zh === curMode));
        resEl.innerHTML = '';

        if (curMode === 'summarize') {
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Turn any <strong>article link, PDF, or pasted text</strong> into clear structured explanations, headings, takeaways, and tasks saved straight to Notes.</p>
            <input id="zaiUrlIn" placeholder="https://example.com/article-to-explain" autocomplete="off">
            <textarea id="zaiPasteTextIn" rows="3" placeholder="Or paste any long text, article, email, or lecture notes to explain…"></textarea>
            <div class="zai-studio-actions">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('file')} <span id="zaiPdfLabel">Upload PDF</span>
                <input id="zaiPdfIn" type="file" accept="application/pdf,.pdf" class="hidden">
              </label>
              <button type="button" class="btn primary sm" id="zaiRunSumBtn">${icon('sparkle')} <span>Explain Now</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          const pdfIn = bodyEl.querySelector('#zaiPdfIn');
          pdfIn.onchange = () => {
            const f = pdfIn.files?.[0];
            bodyEl.querySelector('#zaiPdfLabel').textContent = f ? f.name : 'Upload PDF';
          };
          bodyEl.querySelector('#zaiRunSumBtn').onclick = async () => {
            const url = bodyEl.querySelector('#zaiUrlIn').value.trim();
            const text = bodyEl.querySelector('#zaiPasteTextIn').value.trim();
            const file = pdfIn.files?.[0];
            if (!url && !text && !file) return toast('Enter a link, paste text, or attach a PDF', 'warn');
            const runBtn = bodyEl.querySelector('#zaiRunSumBtn');
            setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], true);
            resEl.innerHTML = aiLoaderHtml('Reading & explaining…');
            hydrateIcons(resEl);
            try {
              let out;
              if (file) {
                const pdfBase64 = await blobToBase64(file);
                out = await aiRequest('/api/ai/summarize', { pdfBase64, pdfName: file.name, title: file.name.replace(/\.pdf$/i, '') });
              } else if (url) {
                out = await aiRequest('/api/ai/summarize', { url });
              } else {
                out = await aiRequest('/api/ai/summarize', { text, title: 'Explained Notes' });
              }
              resEl.innerHTML = renderSummaryCardHtml(out);
              wireSummaryCardActions(resEl, out);
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Explanation failed')}</div>`;
            } finally {
              setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], false);
            }
          };
        } else if (curMode === 'calendar') {
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Extract dates &amp; times from <strong>tickets, screenshots, flyers, or casual plans</strong> and save directly to ZovioSpace Calendar.</p>
            <textarea id="zaiEvTextIn" rows="3" placeholder="e.g. Doctor appointment next Tuesday at 11am at Apollo Clinic"></textarea>
            <div class="zai-studio-cal-foot">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('image')} <span id="zaiImgLabel">Scan Ticket / Image</span>
                <input id="zaiImgIn" type="file" accept="image/*" class="hidden">
              </label>
              <label class="zai-switch-wrap">
                <input type="checkbox" id="zaiAutoSaveEv" checked class="zai-switch-input">
                <span class="zai-switch-track"><span class="zai-switch-thumb"></span></span>
                <span class="xs muted">Auto-save</span>
              </label>
            </div>
            <button type="button" class="btn primary sm zai-full-btn" id="zaiRunEvBtn">${icon('calendar')} <span>Extract &amp; Save to Calendar</span></button>
          `;
          hydrateIcons(bodyEl);
          const imgIn = bodyEl.querySelector('#zaiImgIn');
          imgIn.onchange = () => {
            const f = imgIn.files?.[0];
            bodyEl.querySelector('#zaiImgLabel').textContent = f ? f.name : 'Scan Ticket / Image';
          };
          bodyEl.querySelector('#zaiRunEvBtn').onclick = async () => {
            const text = bodyEl.querySelector('#zaiEvTextIn').value.trim();
            const file = imgIn.files?.[0];
            const autoSave = bodyEl.querySelector('#zaiAutoSaveEv').checked;
            if (!text && !file) return toast('Type an event or upload a ticket image', 'warn');
            const runBtn = bodyEl.querySelector('#zaiRunEvBtn');
            setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], true);
            resEl.innerHTML = aiLoaderHtml('Extracting date & details…');
            hydrateIcons(resEl);
            try {
              const payload = { text, todayISO: todayIsoLocal() };
              if (file) {
                payload.imageBase64 = await blobToBase64(file);
                payload.imageMime = file.type || 'image/jpeg';
                payload.imageName = file.name || 'ticket.jpg';
              }
              const out = await aiRequest('/api/ai/extract-event', payload);
              await processEventsAndRender(out, resEl, { autoSave });
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Event extraction failed')}</div>`;
            } finally {
              setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], false);
            }
          };
        } else if (curMode === 'write') {
          const existingDraft = String(opts.initialText ?? (document.getElementById('msgInput')?.value || '')).trim();
          let selTone = 'polish';
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Refine rough notes, fix grammar, adjust tone, or expand short bullets cleanly.</p>
            <div class="zai-mode-pills" id="zaiWritePills">
              <button type="button" class="zai-pill-opt active" data-wt="polish">${aiIco('sparkle')} <span>Polish</span></button>
              <button type="button" class="zai-pill-opt" data-wt="professional">${aiIco('briefcase')} <span>Professional</span></button>
              <button type="button" class="zai-pill-opt" data-wt="casual">${aiIco('smile')} <span>Friendly</span></button>
              <button type="button" class="zai-pill-opt" data-wt="concise">${aiIco('scissors')} <span>Shorten</span></button>
              <button type="button" class="zai-pill-opt" data-wt="expand">${aiIco('doc')} <span>Expand</span></button>
            </div>
            <textarea id="zaiWriteIn" rows="3" placeholder="Type or paste what you want Zovio AI to write or refine…">${esc(existingDraft)}</textarea>
            <button type="button" class="btn primary sm zai-full-btn" id="zaiRunWriteBtn">${icon('sparkle')} <span>Rewrite Text</span></button>
          `;
          hydrateIcons(bodyEl);
          bodyEl.querySelectorAll('#zaiWritePills .zai-pill-opt').forEach(btn => {
            btn.onclick = () => {
              selTone = btn.dataset.wt;
              bodyEl.querySelectorAll('#zaiWritePills .zai-pill-opt').forEach(b => b.classList.toggle('active', b === btn));
            };
          });
          bodyEl.querySelector('#zaiRunWriteBtn').onclick = async () => {
            const prompt = bodyEl.querySelector('#zaiWriteIn').value.trim();
            if (!prompt) return toast('Enter some text or bullets to rewrite', 'warn');
            const runBtn = bodyEl.querySelector('#zaiRunWriteBtn');
            setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], true);
            resEl.innerHTML = aiLoaderHtml('Writing with Zovio AI…');
            hydrateIcons(resEl);
            try {
              const out = await aiRequest('/api/ai/chat', {
                action: 'rewrite',
                prompt,
                tone: selTone
              });
              const rewritten = String(out.text || '').trim();
              const cardObj = {
                isDraft: true,
                title: `AI Writer (${selTone})`,
                answer: rewritten,
                tldr: '',
                sections: []
              };
              resEl.innerHTML = renderSummaryCardHtml(cardObj);
              wireSummaryCardActions(resEl, cardObj);
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Rewrite failed')}</div>`;
            } finally {
              setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], false);
            }
          };
        } else {
          let askMode = 'ask';
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Ask anything, generate <strong>study flashcards</strong>, or build an <strong>action task checklist</strong>.</p>
            <div class="zai-mode-pills" id="zaiAskPills">
              <button type="button" class="zai-pill-opt active" data-am="ask">${aiIco('chat')} <span>Ask Anything</span></button>
              <button type="button" class="zai-pill-opt" data-am="tasks">${aiIco('check')} <span>Action Plan / Tasks</span></button>
              <button type="button" class="zai-pill-opt" data-am="flashcards">${aiIco('gradCap')} <span>Study Flashcards</span></button>
            </div>
            <textarea id="zaiAskIn" rows="3" placeholder="Ask a question, paste study topic, or describe a goal to break into tasks…"></textarea>
            <div class="zai-studio-actions">
              ${S?.activeChatId ? `<button type="button" class="btn ghost sm" id="zaiSumCurChatBtn">Last 5m Chat Recap</button>` : ''}
              <button type="button" class="btn primary sm" id="zaiRunAskBtn">${icon('sparkle')} <span>Run Zovio AI</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          const askIn = bodyEl.querySelector('#zaiAskIn');
          const placeholders = {
            ask: 'Ask anything — explain a concept, plan a trip, debug code, or draft ideas…',
            tasks: 'Describe a goal or project — Zovio AI will build a prioritized checklist you can save to Tasks…',
            flashcards: 'Paste a topic or study material — Zovio AI will turn it into Q&A flashcards you can save to Notes…'
          };
          bodyEl.querySelectorAll('#zaiAskPills .zai-pill-opt').forEach(btn => {
            btn.onclick = () => {
              askMode = btn.dataset.am;
              bodyEl.querySelectorAll('#zaiAskPills .zai-pill-opt').forEach(b => b.classList.toggle('active', b === btn));
              askIn.placeholder = placeholders[askMode] || placeholders.ask;
            };
          });
          bodyEl.querySelector('#zaiSumCurChatBtn')?.addEventListener('click', () => {
            closeModal();
            summarizeCurrentChat();
          });
          bodyEl.querySelector('#zaiRunAskBtn').onclick = async () => {
            const prompt = askIn.value.trim();
            if (!prompt) return toast('Enter a question or topic for Zovio AI', 'warn');
            const runBtn = bodyEl.querySelector('#zaiRunAskBtn');
            setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], true);
            resEl.innerHTML = aiLoaderHtml('Thinking…');
            hydrateIcons(resEl);
            try {
              let out;
              if (askMode === 'flashcards') {
                const raw = await aiRequest('/api/ai/chat', {
                  action: 'note_assist',
                  tone: 'flashcards',
                  noteTitle: prompt.slice(0, 60),
                  noteText: prompt
                });
                out = {
                  provider: raw.provider,
                  model: raw.model,
                  title: `Study Flashcards: ${prompt.slice(0, 48)}`,
                  answer: raw.text || ''
                };
              } else if (askMode === 'tasks') {
                out = await aiRequest('/api/ai/chat', {
                  action: 'note_assist',
                  tone: 'extract_tasks',
                  noteTitle: prompt.slice(0, 60),
                  noteText: prompt
                });
              } else {
                out = await aiRequest('/api/ai/chat', {
                  action: 'ask',
                  prompt,
                  messages: getActiveChatPlainMessages(15),
                  todayISO: todayIsoLocal()
                });
              }
              resEl.innerHTML = renderSummaryCardHtml(out);
              wireSummaryCardActions(resEl, out);
              if (Array.isArray(out.events) && out.events.length) {
                const evWrap = document.createElement('div');
                evWrap.style.marginTop = '10px';
                resEl.appendChild(evWrap);
                await processEventsAndRender({ provider: out.provider, events: out.events, reply: 'Event detected:' }, evWrap, { autoSave: true });
              }
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'AI request failed')}</div>`;
            } finally {
              setAiTriggerLoading([runBtn, '#wsAiHubBtn', '#chatListAiBtn'], false);
            }
          };
        }
      };

      mbox.querySelectorAll('[data-zh]').forEach(btn => {
        btn.onclick = () => { curMode = btn.dataset.zh; renderMode(); };
      });
      renderMode();
    });
  }

  // ---------------- Universal /zovio Slash Command Interceptor ----------------
  async function handleSlashCommand(rawText) {
    const clean = String(rawText || '').trim();
    if (!/^\/zovio(?:\s|$)/i.test(clean)) return false;

    const args = clean.replace(/^\/zovio\s*/i, '').trim();
    if (!args) {
      openHub('ask');
      return true;
    }

    const lower = args.toLowerCase();
    const urlMatch = args.match(/https?:\/\/[^\s<>"']+/i);
    if (urlMatch) {
      const restPrompt = args.replace(urlMatch[0], '').trim();
      await summarizeArticleUrl(urlMatch[0], restPrompt);
      return true;
    }

    if (lower === 'pdf' || lower.startsWith('pdf ') || lower.includes('summarize pdf')) {
      pickLocalFileAndRun('application/pdf,.pdf', f => summarizePdfFile(f));
      return true;
    }

    if (lower === 'ticket' || lower === 'scan' || lower.startsWith('scan ')) {
      pickLocalFileAndRun('image/*', f => extractAndSaveEvent({ file: f, autoSave: true }));
      return true;
    }

    if (lower === 'summarize' || lower === 'summary' || lower === 'sum' || lower === 'chat summary' || lower === 'tl;dr' || lower === 'tldr') {
      await summarizeCurrentChat();
      return true;
    }

    if (lower === 'replies' || lower === 'reply') {
      await showSmartRepliesForChat();
      return true;
    }

    if (/^(?:schedule|event|calendar|remind|book|save\s+(?:an?\s+)?event|add\s+(?:an?\s+)?event)\b/i.test(lower)) {
      const cleanedText = args.replace(/^(?:schedule|event|calendar)\s+/i, '').trim() || args;
      await extractAndSaveEvent({ text: cleanedText, autoSave: true });
      return true;
    }

    if (/^(?:rewrite|fix|polish|professional|casual)\s+/i.test(lower)) {
      const m = args.match(/^(rewrite|fix|polish|professional|casual)\s+([\s\S]+)$/i);
      const tone = m ? (m[1].toLowerCase() === 'professional' ? 'professional' : (m[1].toLowerCase() === 'casual' ? 'casual' : 'polish')) : 'polish';
      const draft = m ? m[2].trim() : args;
      if (draft) {
        setAiTriggerLoading('#aiComposeBtn', true);
        try {
          const res = await aiRequest('/api/ai/chat', { action: 'rewrite', prompt: draft, tone });
          if (res.text) applyTextToComposer(res.text, '');
        } catch (err) {
          toast(err.message || 'Rewrite failed', 'err');
        } finally {
          setAiTriggerLoading('#aiComposeBtn', false);
        }
      }
      return true;
    }

    if (/^translate(?:\s|$)/i.test(lower)) {
      const rest = args.replace(/^translate\s*/i, '').trim();
      if (!rest) {
        openHub('write');
        return true;
      }
      let targetLang = 'English';
      let textToTrans = rest;
      const langMatch = rest.match(/^(?:to|in)\s+([a-zA-Z]+)\s*[:,-]?\s+([\s\S]+)$/i);
      if (langMatch) {
        targetLang = langMatch[1];
        textToTrans = langMatch[2].trim();
      }
      setAiTriggerLoading('#aiComposeBtn', true);
      try {
        const res = await aiRequest('/api/ai/chat', {
          action: 'rewrite',
          prompt: textToTrans,
          tone: 'translate',
          targetLang
        });
        if (res.text) applyTextToComposer(res.text, '');
      } catch (err) {
        toast(err.message || 'Translation failed', 'err');
      } finally {
        setAiTriggerLoading('#aiComposeBtn', false);
      }
      return true;
    }

    await askInCurrentChat(args);
    return true;
  }

  // ---------------- Composer AI Icon & Typing State Binding ----------------
  function bindChatComposerAI(inp) {
    if (!inp || inp._zaiBound) return;
    inp._zaiBound = true;

    const composerWrap = document.getElementById('composerWrap');
    if (!composerWrap) return;
    const composerRow = composerWrap.querySelector('.composer');

    const syncComposerDraftState = () => {
      const hasDraft = Boolean(inp.value && inp.value.length > 0);
      composerRow?.classList.toggle('has-draft', hasDraft);
      document.getElementById('zaiSlashPopup')?.classList.add('hidden');
      if (hasDraft) {
        document.getElementById('attachMenu')?.classList.add('hidden');
        document.getElementById('stickerGifDrawer')?.classList.add('hidden');
      }
    };

    syncComposerDraftState();
    inp.addEventListener('input', syncComposerDraftState);

    const aiBtn = document.getElementById('aiComposeBtn');
    const popover = document.getElementById('zaiComposerMenu');
    if (popover) {
      const togglePopover = e => {
        e.stopPropagation();
        document.getElementById('attachMenu')?.classList.add('hidden');
        document.getElementById('stickerGifDrawer')?.classList.add('hidden');
        document.getElementById('zaiSlashPopup')?.classList.add('hidden');
        popover.classList.toggle('hidden');
      };
      if (aiBtn) aiBtn.onclick = togglePopover;
      if (!composerWrap._zaiDocCloseBound) {
        composerWrap._zaiDocCloseBound = true;
        document.addEventListener('click', ev => {
          const p = document.getElementById('zaiComposerMenu');
          const b = document.getElementById('aiComposeBtn');
          if (p && !p.classList.contains('hidden') && !p.contains(ev.target) && ev.target !== b && !b?.contains(ev.target)) {
            p.classList.add('hidden');
          }
        });
      }

      popover.querySelectorAll('[data-zai-tool]').forEach(item => {
        item.onclick = () => {
          popover.classList.add('hidden');
          const tool = item.dataset.zaiTool;
          if (tool === 'chat-ask' || tool === 'hub-ask') return openChatAssistant();
          if (tool === 'smart-replies') return showSmartRepliesForChat();
          if (tool === 'summarize-chat') return summarizeCurrentChat();
          if (tool === 'rewrite-polish') return rewriteComposerDraft('polish');
          if (tool === 'chat-translate') return openHub('write');
          if (tool === 'chat-calendar') return openHub('calendar');
        };
      });
    }
  }

  // ---------------- ZovioSpace Note AI Assistant ----------------
  function openNoteEditorAiMenu({ noteTitle, setNoteTitle, getPlainText, applyAiHtml }) {
    const plain = String(getPlainText?.() || '').trim();
    showModal('Zovio AI — Note Assistant', `
      <div class="col gap-s">
        <div class="zai-na-writer-card">
          <div class="zai-na-writer-head">
            <span class="zai-cal-ico">${icon('sparkle')}</span>
            <div style="flex:1;min-width:0">
              <strong>AI Writer &amp; Explainer</strong>
              <div class="xs muted">Write about any topic, explain chapters, or explain a link/text directly into this note</div>
            </div>
          </div>
          <div class="zai-seg-tabs">
            <button type="button" class="zai-pill-opt active" data-naw="topic">${aiIco('edit')} <span>Write Topic / Study</span></button>
            <button type="button" class="zai-pill-opt" data-naw="summarize">${aiIco('link')} <span>Explain Link / Text</span></button>
          </div>
          <textarea id="zaiNoteWriteIn" rows="3" placeholder="e.g. Explain Atoms Chapter with all formulas, OR paste an article URL / long text…"></textarea>
          <div class="zai-na-writer-foot">
            ${plain ? `
            <label class="zai-switch-wrap">
              <input type="checkbox" id="zaiNoteAppendChk" checked class="zai-switch-input">
              <span class="zai-switch-track"><span class="zai-switch-thumb"></span></span>
              <span class="xs muted">Append below existing note</span>
            </label>` : `<span class="xs muted">Inserts straight into this note</span>`}
            <button type="button" class="btn primary sm zai-full-btn" id="zaiNoteWriteRunBtn">${icon('sparkle')} <span>Generate into Note</span></button>
          </div>
        </div>

        <div class="zai-na-divider"><span>Or enhance existing note content</span></div>

        <div class="col gap-xs">
          <button type="button" class="zai-na-row" data-znai="structure">
            <span class="zai-cm-ico">${icon('sparkle')}</span>
            <div class="zai-cm-txt"><strong>Clean Up &amp; Structure</strong><small>Organize with clear headings, sections &amp; bullets</small></div>
          </button>
          <button type="button" class="zai-na-row" data-znai="summarize">
            <span class="zai-cm-ico">${icon('note')}</span>
            <div class="zai-cm-txt"><strong>Quick Explanation</strong><small>Insert an overview explanation block at the top</small></div>
          </button>
          <button type="button" class="zai-na-row" data-znai="flashcards">
            <span class="zai-cm-ico">${icon('edit')}</span>
            <div class="zai-cm-txt"><strong>Study Q&amp;A Flashcards</strong><small>Turn this note into revision practice questions</small></div>
          </button>
          <button type="button" class="zai-na-row" data-znai="tasks">
            <span class="zai-cm-ico">${icon('check')}</span>
            <div class="zai-cm-txt"><strong>Action Checklist</strong><small>Extract tasks directly into ZovioSpace Tasks</small></div>
          </button>
          <button type="button" class="zai-na-row" data-znai="expand">
            <span class="zai-cm-ico">${icon('plus')}</span>
            <div class="zai-cm-txt"><strong>Expand &amp; Deepen</strong><small>Add detailed explanations and examples</small></div>
          </button>
        </div>
      </div>
    `, mbox => {
      hydrateIcons(mbox);
      let writeKind = 'topic';
      const writeIn = mbox.querySelector('#zaiNoteWriteIn');
      mbox.querySelectorAll('[data-naw]').forEach(p => {
        p.onclick = () => {
          writeKind = p.dataset.naw;
          mbox.querySelectorAll('[data-naw]').forEach(x => x.classList.toggle('active', x === p));
          writeIn.placeholder = writeKind === 'summarize'
            ? 'Paste an article URL (https://...) or any long text / chapter excerpt to explain…'
            : 'e.g. Explain Atoms Chapter with all formulas, or draft project meeting notes…';
        };
      });

      const runBtn = mbox.querySelector('#zaiNoteWriteRunBtn');
      runBtn.onclick = async () => {
        const val = writeIn.value.trim();
        if (!val) return toast('Enter a topic, link, or text to generate', 'warn');
        const shouldAppend = Boolean(plain && mbox.querySelector('#zaiNoteAppendChk')?.checked);
        runBtn.disabled = true;
        runBtn.innerHTML = aiIconHtml('Generating into Note…');
        hydrateIcons(runBtn);
        setAiTriggerLoading(['#znAiBtn', runBtn], true);
        try {
          let html = '';
          let genTitle = '';
          const urlMatch = val.match(/^https?:\/\/[^\s<>"']+$/i);
          if (writeKind === 'summarize' || urlMatch) {
            const payload = urlMatch ? { url: urlMatch[0] } : { text: val, title: noteTitle || 'Note Summary' };
            const res = await aiRequest('/api/ai/summarize', payload);
            html = markdownToNoteHtml(res);
            genTitle = res.title || '';
          } else {
            const res = await aiRequest('/api/ai/chat', {
              action: 'ask',
              prompt: val,
              messages: [],
              todayISO: todayIsoLocal()
            });
            html = markdownToNoteHtml(res);
            genTitle = res.title || val.slice(0, 60);
          }
          if (genTitle) setNoteTitle?.(genTitle);
          closeModal();
          applyAiHtml?.(html, shouldAppend ? 'append' : 'replace');
        } catch (err) {
          runBtn.disabled = false;
          runBtn.innerHTML = `${icon('sparkle')} <span>Generate into Note</span>`;
          hydrateIcons(runBtn);
          toast(err.message || 'Could not generate note content', 'err');
        } finally {
          setAiTriggerLoading(['#znAiBtn', runBtn], false);
        }
      };

      mbox.querySelectorAll('[data-znai]').forEach(btn => {
        btn.onclick = async () => {
          const mode = btn.dataset.znai;
          if (!plain) return toast('Write in your note first, or use AI Writer above!', 'warn');
          closeModal();
          if (mode === 'tasks') {
            showResultModal('Extracted Tasks from Note', async root => {
              setAiTriggerLoading('#znAiBtn', true);
              try {
                const res = await aiRequest('/api/ai/chat', {
                  action: 'note_assist',
                  tone: 'extract_tasks',
                  noteTitle,
                  noteText: plain
                });
                root.innerHTML = renderSummaryCardHtml(res);
                wireSummaryCardActions(root, res);
              } finally {
                setAiTriggerLoading('#znAiBtn', false);
              }
            });
            return;
          }
          setAiTriggerLoading('#znAiBtn', true);
          try {
            const res = await aiRequest('/api/ai/chat', {
              action: 'note_assist',
              tone: mode,
              noteTitle,
              noteText: plain
            });
            if (res.text) {
              const html = markdownToNoteHtml({ answer: res.text });
              applyAiHtml?.(html, mode);
            }
          } catch (err) {
            toast(err.message || 'Note AI failed', 'err');
          } finally {
            setAiTriggerLoading('#znAiBtn', false);
          }
        };
      });
    });
  }

  // ---------------- Calendar Tab Natural-Language + Ticket Bar ----------------
  function bindCalendarAiBar(box, onRefresh) {
    const input = box.querySelector('#calAiInput');
    const goBtn = box.querySelector('#calAiGoBtn');
    const scanBtn = box.querySelector('#calAiScanBtn');
    const calIco = box.querySelector('.zai-cal-ico');
    box.querySelectorAll('[data-cal-preset]').forEach(ch => {
      ch.onclick = () => {
        if (input) {
          input.value = ch.dataset.calPreset || '';
          input.focus();
        }
      };
    });
    if (goBtn && input) {
      const runText = () => {
        const txt = input.value.trim();
        if (!txt) return toast('Describe an event (e.g. "Dinner tomorrow at 8pm")', 'warn');
        setAiTriggerLoading([calIco, goBtn], true);
        extractAndSaveEvent({ text: txt, autoSave: true })
          .then(() => onRefresh?.())
          .finally(() => setAiTriggerLoading([calIco, goBtn], false));
      };
      goBtn.onclick = runText;
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); runText(); } };
    }
    if (scanBtn) {
      scanBtn.onclick = () => {
        pickLocalFileAndRun('image/*', f => {
          setAiTriggerLoading([calIco, scanBtn], true);
          extractAndSaveEvent({ file: f, autoSave: true })
            .then(() => onRefresh?.())
            .finally(() => setAiTriggerLoading([calIco, scanBtn], false));
        });
      };
    }
  }

  function openAiLimitModal(message, quota = null) {
    const q = quota || {};
    const dailyUsed = Number(q.dailyUsed || 0);
    const dailyLimit = Math.max(1, Number(q.dailyLimit || 15));
    const monthlyUsed = Number(q.monthlyUsed || 0);
    const monthlyLimit = Math.max(1, Number(q.monthlyLimit || 150));
    const resetDate = q.resetsAt ? new Date(q.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    showModal('Zovio AI Limit Reached', `
      <div class="col gap-m zai-limit-modal">
        <div class="zai-limit-hero">
          <span class="zai-cal-ico">${icon('sparkle')}</span>
          <div style="flex:1;min-width:0">
            <strong>Upgrade Plan or Connect Your Gemini Key</strong>
            <div class="xs muted" style="margin-top:2px;line-height:1.45">${esc(message || 'You have used your Zovio AI request allowance for this period.')}</div>
          </div>
        </div>

        <div class="zai-quota-box">
          <div class="row between xs" style="margin-bottom:4px">
            <span>Daily Allowance (${esc(q.planName || 'Starter')})</span>
            <strong>${dailyUsed} / ${dailyLimit}</strong>
          </div>
          <div class="zai-quota-bar"><div class="zai-quota-fill over" style="width:${Math.min(100, Math.round((dailyUsed / dailyLimit) * 100))}%"></div></div>
          <div class="row between xs muted" style="margin-top:8px">
            <span>Monthly: <b>${monthlyUsed} / ${monthlyLimit}</b></span>
            ${resetDate ? `<span>Resets at ${esc(resetDate)}</span>` : ''}
          </div>
        </div>

        <div class="zai-limit-key-box col gap-xs">
          <strong style="font-size:13px">Option 1 — Paste Your Own Free Gemini API Key (Unlimited)</strong>
          <div class="muted xs">Generate a free key at Google AI Studio — Zovio never charges your quota when using your own key.</div>
          <div class="zai-key-input-row">
            <input id="zaiQuickKeyIn" type="password" placeholder="Paste your Gemini key (AIza...)" autocomplete="off">
            <button type="button" class="btn primary sm" id="zaiQuickSaveKeyBtn">Save Key</button>
          </div>
          <a class="xs" style="color:#a78bfa;font-weight:700;align-self:flex-start" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Get a free Gemini key on Google AI Studio ↗</a>
        </div>

        <div class="zai-limit-upgrade-box">
          <div style="flex:1;min-width:0">
            <strong style="font-size:13px">Option 2 — Increase Your Zovio AI Limit</strong>
            <div class="xs muted">Upgrade to AI Plus (150/day) or AI Pro (600/day) with zero API setup.</div>
          </div>
          <button type="button" class="btn primary sm" id="zaiLimitUpgradeBtn">View AI Plans</button>
        </div>
      </div>
    `, mbox => {
      hydrateIcons(mbox);
      mbox.querySelector('#zaiQuickSaveKeyBtn').onclick = () => {
        const val = mbox.querySelector('#zaiQuickKeyIn').value.trim();
        if (!val) return toast('Paste a Gemini API key starting with AIza...', 'warn');
        if (isNonGeminiKey(val)) return toast('Only Google Gemini keys (starting with AIza...) are supported.', 'err');
        setConfig({ key: val });
        closeModal();
        toast('Personal Gemini API key saved! Unlimited AI unlocked — retry your request.', 'ok');
      };
      mbox.querySelector('#zaiLimitUpgradeBtn').onclick = () => {
        closeModal();
        window.openZovioAiSettings?.();
      };
    });
  }

  window.ZovioAI = {
    getConfig,
    setConfig,
    isNonGeminiKey,
    getAiHeaders,
    aiRequest,
    openAiLimitModal,
    openHub,
    openChatAssistant,
    handleSlashCommand,
    formatNoteMathHtml,
    summarizeArticleUrl,
    summarizePdfFile,
    summarizeCurrentChat,
    extractAndSaveEvent,
    saveStructuredNoteToSpace,
    saveExtractedEventToSpace,
    saveExtractedTasksToSpace,
    analyzeChatPdfMessage,
    analyzeChatImageForEvent,
    openMessageAiMenu,
    showSmartRepliesForChat,
    rewriteComposerDraft,
    applyTextToComposer,
    detectChatEventHint,
    detectChatTaskHint,
    detectChatNoteHint,
    buildInlineMessageBarHtml,
    quickAddMessageEventToCalendar,
    quickAddMessageToTasks,
    quickSaveMessageToNotes,
    bindChatComposerAI,
    openNoteEditorAiMenu,
    bindCalendarAiBar
  };

  const bindStaticTriggers = () => {
    const headBtn = document.getElementById('chatListAiBtn');
    if (headBtn && !headBtn._zaiBound) {
      headBtn._zaiBound = true;
      headBtn.onclick = () => openHub('summarize');
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindStaticTriggers);
  } else {
    bindStaticTriggers();
  }
})();

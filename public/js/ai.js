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

  function getConfig() {
    return {
      key: (localStorage.getItem(LS_KEY) || '').trim(),
      provider: (localStorage.getItem(LS_PROVIDER) || 'auto').trim().toLowerCase() || 'auto'
    };
  }

  function setConfig({ key, provider }) {
    if (typeof key === 'string') {
      const clean = key.trim();
      if (clean) localStorage.setItem(LS_KEY, clean);
      else localStorage.removeItem(LS_KEY);
    }
    if (typeof provider === 'string' && provider.trim()) {
      localStorage.setItem(LS_PROVIDER, provider.trim().toLowerCase());
    }
  }

  function getAiHeaders() {
    const cfg = getConfig();
    const h = {};
    if (cfg.key) h['x-zovio-ai-key'] = cfg.key;
    if (cfg.provider) h['x-zovio-ai-provider'] = cfg.provider;
    return h;
  }

  async function aiRequest(endpoint, body = null, method = 'POST') {
    const opts = { method, headers: getAiHeaders() };
    if (body && method !== 'GET') opts.body = body;
    return api(endpoint, opts);
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

  function markdownToNoteHtml({ tldr, sections = [], keyTakeaways = [], tags = [], sourceUrl = '', answer = '' }) {
    const parts = [];
    if (sourceUrl) {
      parts.push(`<p><strong>Source:</strong> <a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(sourceUrl)}</a></p>`);
    }
    if (tldr) {
      parts.push(`<h2>Overview</h2>`);
      parts.push(`<p>${formatInlineMd(tldr)}</p>`);
    }
    if (Array.isArray(sections) && sections.length) {
      for (const sec of sections) {
        if (sec?.heading) parts.push(`<h2>${esc(sec.heading)}</h2>`);
        if (Array.isArray(sec?.points) && sec.points.length) {
          parts.push(`<ul>${sec.points.map(pt => `<li>${formatInlineMd(pt)}</li>`).join('')}</ul>`);
        }
      }
    }
    if (Array.isArray(keyTakeaways) && keyTakeaways.length) {
      parts.push(`<h2>Key Takeaways</h2>`);
      parts.push(`<ul>${keyTakeaways.map(k => `<li>${formatInlineMd(k)}</li>`).join('')}</ul>`);
    }
    if (answer && !sections.length && !tldr) {
      const lines = String(answer).split(/\n/);
      let inUl = false;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          if (inUl) { parts.push('</ul>'); inUl = false; }
          continue;
        }
        if (/^#{1,3}\s+/.test(line)) {
          if (inUl) { parts.push('</ul>'); inUl = false; }
          const txt = line.replace(/^#{1,3}\s+/, '');
          parts.push(`<h2>${formatInlineMd(txt)}</h2>`);
        } else if (/^[-*•]\s+/.test(line)) {
          if (!inUl) { parts.push('<ul>'); inUl = true; }
          parts.push(`<li>${formatInlineMd(line.replace(/^[-*•]\s+/, ''))}</li>`);
        } else {
          if (inUl) { parts.push('</ul>'); inUl = false; }
          parts.push(`<p>${formatInlineMd(line)}</p>`);
        }
      }
      if (inUl) parts.push('</ul>');
    }
    if (Array.isArray(tags) && tags.length) {
      parts.push(`<p><em>Tags: ${tags.map(t => `#${esc(String(t).replace(/^#/, ''))}`).join(' ')}</em></p>`);
    }
    return parts.join('') || '<p></p>';
  }

  function summaryToPlainText(data) {
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
    const title = cleanPlainMath(String(data?.title || 'AI Note').trim()).slice(0, 140);
    const html = markdownToNoteHtml(data || {});
    const body = summaryToPlainText(data || {});
    const saved = await saveWsItem('note', {
      title,
      body,
      html,
      color: '#7c5cff',
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
    const providerBadge = res.localFallback
      ? `<span class="pill amber xs">Local Extractor</span>`
      : `<span class="pill xs" style="background:rgba(124,92,255,0.16);color:var(--brand)">${esc(res.provider || 'AI')} · ${esc(res.model || '')}</span>`;

    return `
      <div class="zai-result-card">
        <div class="zai-result-head">
          <div style="min-width:0;flex:1">
            <h4 class="zai-result-title">${esc(res.title || 'AI Summary')}</h4>
            ${res.sourceUrl ? `<div class="zai-source-link">${esc(res.sourceUrl)}</div>` : ''}
          </div>
          ${providerBadge}
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
          <h4 class="zai-result-title">${savedMap.size ? '📅 Added to Calendar' : '📅 Extracted Events'}</h4>
          <span class="pill xs" style="background:rgba(124,92,255,0.16);color:var(--brand)">${esc(result.provider || 'Zovio AI')}</span>
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
                      <span class="zai-ev-chip">🗓 ${esc(ev.date)}</span>
                      <span class="zai-ev-chip">🕒 ${esc(ev.time || '10:00')}</span>
                    </div>
                    ${ev.location ? `<div class="zai-ev-loc">📍 ${esc(ev.location)}</div>` : ''}
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
    showModal(title, `<div id="zaiModalResultRoot" class="zai-modal-body"><div class="zai-loading"><span class="spinner"></span><span>Zovio AI is thinking…</span></div></div>`, async mbox => {
      const root = mbox.querySelector('#zaiModalResultRoot');
      try {
        await renderFn(root);
      } catch (err) {
        root.innerHTML = `<div class="zai-error">${esc(err.message || 'Zovio AI request failed')}</div>`;
      }
    });
  }

  async function summarizeArticleUrl(url, customPrompt = '') {
    showResultModal('✨ Zovio AI — Article Summary', async root => {
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
    showResultModal(`✨ Zovio AI — ${file.name}`, async root => {
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
    showResultModal('📅 Zovio AI — Smart Calendar', async root => {
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
    });
  }

  async function askInCurrentChat(prompt) {
    const msgs = getActiveChatPlainMessages(20);
    showResultModal('✨ Zovio AI', async root => {
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
    });
  }

  async function analyzeChatPdfMessage(mid) {
    const list = window.S?.msgs?.get(S.activeChatId) || [];
    const m = list.find(x => x.id === mid);
    if (!m) return;
    const p = m._plain || m.body || {};
    showResultModal(`✨ Zovio AI — ${p.name || 'PDF Summary'}`, async root => {
      root.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Decrypting &amp; reading PDF…</span></div>`;
      const url = await fetchDecryptedBlob(m);
      const blob = await fetch(url).then(r => r.blob());
      if (blob.size > 14 * 1024 * 1024) throw new Error('PDF exceeds 14 MB limit for AI summary');
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
    showResultModal('📅 Zovio AI — Ticket & Event Scanner', async root => {
      root.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Decrypting image &amp; scanning for dates…</span></div>`;
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

    showModal('✨ Ask Zovio AI About Message', `
      <div class="col gap-s">
        <div class="zai-tldr" style="margin:0">
          <strong>Message Preview</strong>
          <p style="margin-top:4px">${esc(txt.slice(0, 260) || `[${m.kind}]`)}${txt.length > 260 ? '…' : ''}</p>
        </div>
        <div class="col gap-xs" id="zaiMsgOptList">
          <button type="button" class="info-action-row" data-ma="explain">${icon('sparkle')} <span>Explain / Simplify This Message</span></button>
          ${urlMatch ? `<button type="button" class="info-action-row" data-ma="url">${icon('link')} <span>Summarize Link (${esc(urlMatch[0].slice(0, 40))}…)</span></button>` : ''}
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
            showResultModal('📝 Save as ZovioSpace Note', async root => {
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
      bar.innerHTML = `<div class="zai-sr-head"><span class="zai-sr-title">${icon('sparkle')} <span>Thinking of reply ideas…</span></span></div>`;
      hydrateIcons(bar);
    }
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
    }
  }

  async function rewriteComposerDraft(tone) {
    const inp = document.getElementById('msgInput');
    const draft = inp?.value?.trim();
    if (!draft) return toast('Type a message draft first to rewrite it', 'warn');
    try {
      toast('Zovio AI rewriting…', 'ok');
      const res = await aiRequest('/api/ai/chat', {
        action: 'rewrite',
        prompt: draft,
        tone
      });
      if (res.text && inp) {
        applyTextToComposer(res.text, `Rewritten (${tone})`);
      }
    } catch (err) {
      toast(err.message || 'Rewrite failed', 'err');
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
    if (!raw || raw.length < 7 || raw.length > 480) return null;
    if (/^https?:\/\/\S+$/i.test(raw)) return null;
    const lower = raw.toLowerCase();

    const hasDateWord = /\b(today|tonight|tmrw|tmr|tomo|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|this\s+weekend)\b/.test(lower)
      || /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/.test(lower)
      || /\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/.test(lower);
    if (!hasDateWord) return null;

    const hasTimeSignal = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(lower)
      || /(?:^|\s)(?:at|@)\s*\d{1,2}(?::\d{2})?\b/i.test(lower)
      || /\b(?:morning|afternoon|evening|night|noon|midnight)\b/.test(lower);
    const hasEventKeyword = /\b(?:date|meet(?:ing)?|sync|call|hang\s*out|catch\s*up|dinner|lunch|brunch|breakfast|coffee|movie|film|show|concert|flight|train|appointment|doctor|dentist|interview|class|exam|party|birthday|anniversary|deadline|reminder|event|reservation|table|trip|wedding|match|game)\b/.test(lower);

    if (!hasTimeSignal && !hasEventKeyword) return null;
    return raw;
  }

  function buildInlineMessageBarHtml(msg) {
    const hint = detectChatEventHint(msg);
    if (!hint) return '';
    const enc = encodeURIComponent(hint);
    return `<div class="zai-inline-actions"><button type="button" class="zai-inline-cal" data-ai-cal-event="${enc}" title="Save detected event to ZovioSpace Calendar">📅 <span>Add to Calendar</span></button></div>`;
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
      btnEl.innerHTML = `<span class="spinner"></span> <span>Adding…</span>`;
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
          ${lastMsg ? `<div class="zai-chat-ctx-pill">💬 Latest (${esc(lastMsg.sender)}): "${esc(String(lastMsg.text || '').slice(0, 90))}${String(lastMsg.text || '').length > 90 ? '…' : ''}"</div>` : ''}
          <div class="zai-chip-row">
            <button type="button" class="zai-chip-btn" data-ca-q="Draft a friendly, natural reply to the latest message">💬 Draft reply</button>
            <button type="button" class="zai-chip-btn" data-ca-q="Are there any dates, times, or meetup plans mentioned in this chat?">📅 Check plans</button>
            <button type="button" class="zai-chip-btn" data-ca-q="Summarize the key points and decisions from the recent chat messages">📝 Key points</button>
            <button type="button" class="zai-chip-btn" data-ca-q="Explain what the recent message means clearly in simple words and suggest a good response">💡 Explain clearly</button>
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
        resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Thinking about this chat…</span></div>`;
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

    showModal('✨ Zovio AI Studio', `
      <div class="zai-hub">
        <div class="ws-tabs zai-hub-tabs">
          <button type="button" class="${startMode === 'summarize' ? 'active' : ''}" data-zh="summarize">📄 Summarize</button>
          <button type="button" class="${startMode === 'calendar' ? 'active' : ''}" data-zh="calendar">📅 Smart Calendar</button>
          <button type="button" class="${startMode === 'write' ? 'active' : ''}" data-zh="write">✍️ AI Writer</button>
          <button type="button" class="${startMode === 'ask' ? 'active' : ''}" data-zh="ask">🧠 Ask &amp; Study</button>
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
            <p class="zai-card-lead">Turn any <strong>article link, PDF, or pasted text</strong> into structured headings, takeaways, and tasks saved straight to Notes.</p>
            <input id="zaiUrlIn" placeholder="https://example.com/article-to-summarize" autocomplete="off">
            <textarea id="zaiPasteTextIn" rows="3" placeholder="Or paste any long text, email, or lecture notes to summarize…"></textarea>
            <div class="row gap-s align-center wrap between">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('file')} <span id="zaiPdfLabel">Upload PDF (optional)</span>
                <input id="zaiPdfIn" type="file" accept="application/pdf,.pdf" class="hidden">
              </label>
              <button type="button" class="btn primary sm" id="zaiRunSumBtn">${icon('sparkle')} <span>Summarize Now</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          const pdfIn = bodyEl.querySelector('#zaiPdfIn');
          pdfIn.onchange = () => {
            const f = pdfIn.files?.[0];
            bodyEl.querySelector('#zaiPdfLabel').textContent = f ? f.name : 'Upload PDF (optional)';
          };
          bodyEl.querySelector('#zaiRunSumBtn').onclick = async () => {
            const url = bodyEl.querySelector('#zaiUrlIn').value.trim();
            const text = bodyEl.querySelector('#zaiPasteTextIn').value.trim();
            const file = pdfIn.files?.[0];
            if (!url && !text && !file) return toast('Enter a link, paste text, or attach a PDF', 'warn');
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Reading &amp; summarizing…</span></div>`;
            try {
              let out;
              if (file) {
                const pdfBase64 = await blobToBase64(file);
                out = await aiRequest('/api/ai/summarize', { pdfBase64, pdfName: file.name, title: file.name.replace(/\.pdf$/i, '') });
              } else if (url) {
                out = await aiRequest('/api/ai/summarize', { url });
              } else {
                out = await aiRequest('/api/ai/summarize', { text, title: 'Text Summary' });
              }
              resEl.innerHTML = renderSummaryCardHtml(out);
              wireSummaryCardActions(resEl, out);
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Summarization failed')}</div>`;
            }
          };
        } else if (curMode === 'calendar') {
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Extract dates &amp; times from <strong>tickets, screenshots, flyers, or casual plans</strong> and save directly to ZovioSpace Calendar.</p>
            <div class="zai-chip-row">
              <button type="button" class="zai-chip-btn" data-ev-sample="Wanna go on a Date tmrw at 6pm at Blue Bottle">☕ Date tmrw 6pm</button>
              <button type="button" class="zai-chip-btn" data-ev-sample="Team Sprint Review Friday at 2:30 PM on Zoom">💼 Meeting Fri 2:30pm</button>
              <button type="button" class="zai-chip-btn" data-ev-sample="Dune 3 IMAX Ticket Saturday 7:00 PM at PVR">🎬 Movie Sat 7pm</button>
            </div>
            <textarea id="zaiEvTextIn" rows="2" placeholder="e.g. Doctor appointment next Tuesday at 11am at Apollo Clinic"></textarea>
            <div class="row gap-s align-center wrap between">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('image')} <span id="zaiImgLabel">Scan Ticket / Image</span>
                <input id="zaiImgIn" type="file" accept="image/*" class="hidden">
              </label>
              <label class="zai-switch-wrap">
                <input type="checkbox" id="zaiAutoSaveEv" checked class="zai-switch-input">
                <span class="zai-switch-track"><span class="zai-switch-thumb"></span></span>
                <span class="xs muted">Auto-save</span>
              </label>
              <button type="button" class="btn primary sm" id="zaiRunEvBtn">${icon('calendar')} <span>Extract &amp; Save</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          bodyEl.querySelectorAll('[data-ev-sample]').forEach(ch => {
            ch.onclick = () => { bodyEl.querySelector('#zaiEvTextIn').value = ch.dataset.evSample; };
          });
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
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Extracting date &amp; details…</span></div>`;
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
            }
          };
        } else if (curMode === 'write') {
          const existingDraft = String(opts.initialText ?? (document.getElementById('msgInput')?.value || '')).trim();
          let selTone = opts.presetTone || 'polish';
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Polish rough messages, switch tone, expand quick bullets, or <strong>translate into any language</strong>.</p>
            <div class="zai-mode-pills" id="zaiWritePills">
              <button type="button" class="zai-pill-opt ${selTone === 'polish' ? 'active' : ''}" data-wt="polish">✨ Polish</button>
              <button type="button" class="zai-pill-opt ${selTone === 'professional' ? 'active' : ''}" data-wt="professional">💼 Professional</button>
              <button type="button" class="zai-pill-opt ${selTone === 'casual' ? 'active' : ''}" data-wt="casual">😊 Friendly</button>
              <button type="button" class="zai-pill-opt ${selTone === 'concise' ? 'active' : ''}" data-wt="concise">✂️ Shorten</button>
              <button type="button" class="zai-pill-opt ${selTone === 'expand' ? 'active' : ''}" data-wt="expand">📝 Expand</button>
              <button type="button" class="zai-pill-opt ${selTone === 'translate' ? 'active' : ''}" data-wt="translate">🌐 Translate</button>
            </div>
            <div id="zaiLangRow" class="${selTone === 'translate' ? '' : 'hidden '}row gap-s align-center">
              <span class="xs muted" style="white-space:nowrap">Translate to:</span>
              <select id="zaiLangSel">
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Arabic">Arabic</option>
                <option value="Japanese">Japanese</option>
                <option value="Portuguese">Portuguese</option>
              </select>
            </div>
            <textarea id="zaiWriteIn" rows="3" placeholder="Type rough bullets or a draft message…">${esc(existingDraft)}</textarea>
            <div class="row between align-center">
              <span class="xs muted">Instant rewrite ready for chat or notes</span>
              <button type="button" class="btn primary sm" id="zaiRunWriteBtn">${icon('sparkle')} <span>Transform Text</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          const langRow = bodyEl.querySelector('#zaiLangRow');
          bodyEl.querySelectorAll('#zaiWritePills .zai-pill-opt').forEach(btn => {
            btn.onclick = () => {
              selTone = btn.dataset.wt;
              bodyEl.querySelectorAll('#zaiWritePills .zai-pill-opt').forEach(b => b.classList.toggle('active', b === btn));
              langRow.classList.toggle('hidden', selTone !== 'translate');
            };
          });
          bodyEl.querySelector('#zaiRunWriteBtn').onclick = async () => {
            const prompt = bodyEl.querySelector('#zaiWriteIn').value.trim();
            if (!prompt) return toast('Enter some text or bullets to rewrite', 'warn');
            const targetLang = bodyEl.querySelector('#zaiLangSel')?.value || 'English';
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Writing with Zovio AI…</span></div>`;
            try {
              const out = await aiRequest('/api/ai/chat', {
                action: 'rewrite',
                prompt,
                tone: selTone,
                targetLang
              });
              const rewritten = String(out.text || '').trim();
              const cardObj = {
                provider: out.provider || 'AI',
                model: out.model || '',
                title: selTone === 'translate' ? `Translated to ${targetLang}` : `Rewritten (${selTone})`,
                answer: rewritten,
                tldr: '',
                sections: []
              };
              resEl.innerHTML = renderSummaryCardHtml(cardObj);
              wireSummaryCardActions(resEl, cardObj);
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Rewrite failed')}</div>`;
            }
          };
        } else {
          let askMode = 'ask';
          bodyEl.innerHTML = `
            <p class="zai-card-lead">Ask anything with live chat context, generate <strong>study flashcards</strong>, or build an <strong>action task checklist</strong>.</p>
            <div class="zai-mode-pills" id="zaiAskPills">
              <button type="button" class="zai-pill-opt active" data-am="ask">💬 Ask Anything</button>
              <button type="button" class="zai-pill-opt" data-am="tasks">✅ Action Plan / Tasks</button>
              <button type="button" class="zai-pill-opt" data-am="flashcards">🎓 Study Flashcards</button>
            </div>
            <textarea id="zaiAskIn" rows="3" placeholder="Ask a question, paste study topic, or describe a goal to break into tasks…"></textarea>
            <div class="row between align-center wrap gap-s">
              ${S?.activeChatId ? `<button type="button" class="btn ghost sm" id="zaiSumCurChatBtn">💬 Summarize Active Chat</button>` : '<span></span>'}
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
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Thinking…</span></div>`;
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
        try {
          toast('Zovio AI rewriting…', 'ok');
          const res = await aiRequest('/api/ai/chat', { action: 'rewrite', prompt: draft, tone });
          if (res.text) applyTextToComposer(res.text, `Rewritten (${tone})`);
        } catch (err) {
          toast(err.message || 'Rewrite failed', 'err');
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
      try {
        toast(`Translating to ${targetLang}…`, 'ok');
        const res = await aiRequest('/api/ai/chat', {
          action: 'rewrite',
          prompt: textToTrans,
          tone: 'translate',
          targetLang
        });
        if (res.text) applyTextToComposer(res.text, `Translated (${targetLang})`);
      } catch (err) {
        toast(err.message || 'Translation failed', 'err');
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
          if (tool === 'chat-translate') {
            const draft = String(document.getElementById('msgInput')?.value || '').trim();
            const recent = getActiveChatPlainMessages(8);
            const fallbackMsg = recent.length ? String(recent[recent.length - 1].text || '').trim() : '';
            return openHub('write', { presetTone: 'translate', initialText: draft || fallbackMsg });
          }
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
              <strong>AI Writer &amp; Summarizer</strong>
              <div class="xs muted">Write about any topic, explain chapters, or summarize a link/text directly into this note</div>
            </div>
          </div>
          <div class="zai-chip-row">
            <button type="button" class="zai-pill-opt active" data-naw="topic">✍️ Write Topic / Study</button>
            <button type="button" class="zai-pill-opt" data-naw="summarize">🔗 Summarize Link / Text</button>
          </div>
          <textarea id="zaiNoteWriteIn" rows="3" placeholder="e.g. Explain Atoms Chapter with all formulas, OR paste an article URL / long text…"></textarea>
          <div class="row between align-center wrap gap-s">
            ${plain ? `<label class="row gap-xs xs muted" style="cursor:pointer"><input type="checkbox" id="zaiNoteAppendChk" checked> Append below existing note</label>` : `<span class="xs muted">Inserts straight into this note</span>`}
            <button type="button" class="btn primary sm" id="zaiNoteWriteRunBtn">${icon('sparkle')} <span>Generate into Note</span></button>
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
            <div class="zai-cm-txt"><strong>Quick Overview</strong><small>Insert an executive summary block at the top</small></div>
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
            ? 'Paste an article URL (https://...) or any long text / lecture transcript to summarize…'
            : 'e.g. Explain Atoms Chapter with all formulas, or draft project meeting notes…';
        };
      });

      const runBtn = mbox.querySelector('#zaiNoteWriteRunBtn');
      runBtn.onclick = async () => {
        const val = writeIn.value.trim();
        if (!val) return toast('Enter a topic, link, or text to generate', 'warn');
        const shouldAppend = Boolean(plain && mbox.querySelector('#zaiNoteAppendChk')?.checked);
        runBtn.disabled = true;
        runBtn.innerHTML = `<span class="spinner"></span> <span>Writing…</span>`;
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
          toast('Inserted into your note!', 'ok');
        } catch (err) {
          runBtn.disabled = false;
          runBtn.innerHTML = `${icon('sparkle')} <span>Generate into Note</span>`;
          hydrateIcons(runBtn);
          toast(err.message || 'Could not generate note content', 'err');
        }
      };

      mbox.querySelectorAll('[data-znai]').forEach(btn => {
        btn.onclick = async () => {
          const mode = btn.dataset.znai;
          if (!plain) return toast('Write in your note first, or use AI Writer above!', 'warn');
          closeModal();
          if (mode === 'tasks') {
            showResultModal('Extracted Tasks from Note', async root => {
              const res = await aiRequest('/api/ai/chat', {
                action: 'note_assist',
                tone: 'extract_tasks',
                noteTitle,
                noteText: plain
              });
              root.innerHTML = renderSummaryCardHtml(res);
              wireSummaryCardActions(root, res);
            });
            return;
          }
          toast('Zovio AI updating note…', 'ok');
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
              toast('Applied Zovio AI update to note!', 'ok');
            }
          } catch (err) {
            toast(err.message || 'Note AI failed', 'err');
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
        extractAndSaveEvent({ text: txt, autoSave: true }).then(() => onRefresh?.());
      };
      goBtn.onclick = runText;
      input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); runText(); } };
    }
    if (scanBtn) {
      scanBtn.onclick = () => {
        pickLocalFileAndRun('image/*', f => {
          extractAndSaveEvent({ file: f, autoSave: true }).then(() => onRefresh?.());
        });
      };
    }
  }

  window.ZovioAI = {
    getConfig,
    setConfig,
    getAiHeaders,
    aiRequest,
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
    buildInlineMessageBarHtml,
    quickAddMessageEventToCalendar,
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

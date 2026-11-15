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

  function formatInlineMd(str) {
    let safe = esc(String(str || ''));
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    return safe;
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
    if (data.title) out.push(`# ${data.title}`);
    if (data.sourceUrl) out.push(`Source: ${data.sourceUrl}`);
    if (data.tldr) out.push(`\nOverview:\n${data.tldr}`);
    if (Array.isArray(data.sections)) {
      for (const sec of data.sections) {
        if (sec.heading) out.push(`\n## ${sec.heading}`);
        if (Array.isArray(sec.points)) {
          sec.points.forEach(p => out.push(`• ${p}`));
        }
      }
    }
    if (Array.isArray(data.keyTakeaways) && data.keyTakeaways.length) {
      out.push(`\n## Key Takeaways`);
      data.keyTakeaways.forEach(k => out.push(`• ${k}`));
    }
    if (data.answer && (!data.sections || !data.sections.length)) {
      out.push(`\n${data.answer}`);
    }
    return out.join('\n').trim();
  }

  async function saveStructuredNoteToSpace(data, group = 'Default') {
    if (typeof saveWsItem !== 'function') {
      throw new Error('ZovioSpace is still initializing');
    }
    const title = String(data?.title || 'AI Note').trim().slice(0, 140);
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

  async function saveExtractedEventToSpace(ev) {
    if (typeof saveWsItem !== 'function') {
      throw new Error('ZovioSpace is still initializing');
    }
    const payload = {
      title: String(ev?.title || 'Event').trim().slice(0, 140),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(ev?.date || '')) ? ev.date : todayIsoLocal(),
      time: /^\d{2}:\d{2}$/.test(String(ev?.time || '')) ? ev.time : '10:00',
      notes: String(ev?.notes || (ev?.location ? `Location: ${ev.location}` : '')).trim()
    };
    return saveWsItem('event', payload);
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
          ${S?.activeChatId ? `<button type="button" class="btn ghost sm" data-zai-send-chat="1">${icon('send')} <span>Insert in Chat</span></button>` : ''}
          <button type="button" class="btn ghost sm" data-zai-copy="1">${icon('copy')} <span>Copy</span></button>
        </div>
      </div>`;
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
        const inp = document.getElementById('msgInput');
        if (inp) {
          inp.value = summaryToPlainText(res).slice(0, 3500);
          inp._resizeInput?.(true);
          inp.focus();
          try { closeModal?.(); } catch {}
          toast('Inserted AI summary into composer', 'ok');
        }
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
    const events = result?.events || [];
    const savedMap = new Map();

    if (autoSave && events.length) {
      for (let i = 0; i < events.length; i++) {
        try {
          const saved = await saveExtractedEventToSpace(events[i]);
          if (saved?.id) savedMap.set(i, saved.id);
        } catch {}
      }
      if (savedMap.size) {
        toast(`Saved ${savedMap.size} event${savedMap.size > 1 ? 's' : ''} to ZovioSpace Calendar!`, 'ok');
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
            return `
              <div class="zai-event-card" data-ev-idx="${idx}">
                <div class="zai-event-date-pill">
                  <span class="zai-ev-month">${esc(new Date((ev.date || todayIsoLocal()) + 'T00:00:00').toLocaleDateString([], { month: 'short' }))}</span>
                  <span class="zai-ev-day">${esc((ev.date || '').split('-')[2] || '--')}</span>
                </div>
                <div style="flex:1;min-width:0">
                  <strong>${esc(ev.title)}</strong>
                  <div class="muted xs">${esc(ev.date)} · ${esc(ev.time || '10:00')}${ev.location ? ` · 📍 ${esc(ev.location)}` : ''}</div>
                  ${ev.notes ? `<div class="muted xs" style="margin-top:3px;white-space:pre-line">${esc(ev.notes)}</div>` : ''}
                </div>
                <div class="row gap-xs" style="flex-shrink:0">
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
        const idx = Number(b.dataset.zaiAddEv);
        const ev = events[idx];
        if (!ev) return;
        b.disabled = true;
        try {
          await saveExtractedEventToSpace(ev);
          b.textContent = 'Saved ✓ View';
          b.className = 'btn ghost sm';
          b.disabled = false;
          b.onclick = () => jumpToWorkspace('calendar');
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
    const msgs = getActiveChatPlainMessages(35);
    if (!msgs.length) return toast('No text messages in this chat to summarize yet', 'warn');
    showResultModal('✨ Zovio AI — Chat Summary', async root => {
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
        await processEventsAndRender({ provider: res.provider, events: res.events, reply: 'Dates found in chat:' }, evWrap, { autoSave: false });
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
      bar.innerHTML = `<span class="zai-chip muted">✨ Thinking of replies…</span>`;
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
        <span class="zai-sr-label">✨</span>
        ${replies.map(r => `<button type="button" class="zai-chip" data-zai-sr="${esc(r)}">${esc(r)}</button>`).join('')}
        <button type="button" class="zai-sr-close" title="Hide suggestions">✕</button>
      `;
      bar.querySelectorAll('[data-zai-sr]').forEach(b => {
        b.onclick = () => {
          const inp = document.getElementById('msgInput');
          if (inp) {
            inp.value = b.dataset.zaiSr;
            inp._resizeInput?.(true);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.focus();
          }
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
        inp.value = res.text;
        inp._resizeInput?.(true);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.focus();
        toast(`Rewritten (${tone})`, 'ok');
      }
    } catch (err) {
      toast(err.message || 'Rewrite failed', 'err');
    }
  }

  // ---------------- All-in-One Zovio AI Hub Modal ----------------
  function openHub(initialMode = 'summarize') {
    showModal('✨ Zovio AI Studio', `
      <div class="zai-hub">
        <div class="ws-tabs zai-hub-tabs">
          <button type="button" class="${initialMode === 'summarize' ? 'active' : ''}" data-zh="summarize">Article / PDF</button>
          <button type="button" class="${initialMode === 'calendar' ? 'active' : ''}" data-zh="calendar">Ticket → Cal</button>
          <button type="button" class="${initialMode === 'ask' ? 'active' : ''}" data-zh="ask">Ask Zovio</button>
        </div>

        <div id="zaiHubBody" class="zai-hub-card col gap-s"></div>
        <div id="zaiHubResult" style="margin-top:10px"></div>
      </div>
    `, mbox => {
      const bodyEl = mbox.querySelector('#zaiHubBody');
      const resEl = mbox.querySelector('#zaiHubResult');
      let curMode = initialMode;

      const renderMode = () => {
        mbox.querySelectorAll('[data-zh]').forEach(b => b.classList.toggle('active', b.dataset.zh === curMode));
        resEl.innerHTML = '';

        if (curMode === 'summarize') {
          bodyEl.innerHTML = `
            <p class="muted xs" style="margin:0">Paste an article URL or upload a PDF — Zovio AI summarizes it cleanly with headings &amp; saves straight to Notes.</p>
            <input id="zaiUrlIn" placeholder="https://example.com/article-to-summarize" autocomplete="off">
            <div class="row gap-s align-center wrap">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('file')} <span id="zaiPdfLabel">Upload PDF (optional)</span>
                <input id="zaiPdfIn" type="file" accept="application/pdf,.pdf" class="hidden">
              </label>
              <button type="button" class="btn primary sm" id="zaiRunSumBtn">${icon('sparkle')} <span>Summarize</span></button>
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
            const file = pdfIn.files?.[0];
            if (!url && !file) return toast('Enter an article URL or choose a PDF file', 'warn');
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Reading &amp; summarizing…</span></div>`;
            try {
              let out;
              if (file) {
                const pdfBase64 = await blobToBase64(file);
                out = await aiRequest('/api/ai/summarize', { pdfBase64, pdfName: file.name, title: file.name.replace(/\.pdf$/i, '') });
              } else {
                out = await aiRequest('/api/ai/summarize', { url });
              }
              resEl.innerHTML = renderSummaryCardHtml(out);
              wireSummaryCardActions(resEl, out);
            } catch (err) {
              resEl.innerHTML = `<div class="zai-error">${esc(err.message || 'Summarization failed')}</div>`;
            }
          };
        } else if (curMode === 'calendar') {
          bodyEl.innerHTML = `
            <p class="muted xs" style="margin:0">Upload a movie ticket / flight / booking screenshot OR type something like <em>"Save an event of Dune 3 tomorrow at 7pm at PVR"</em>.</p>
            <textarea id="zaiEvTextIn" rows="2" placeholder="e.g. Save an event of Doctor Appointment on Friday at 4:30 PM at Apollo Clinic"></textarea>
            <div class="row gap-s align-center wrap">
              <label class="btn ghost sm" style="cursor:pointer">
                ${icon('image')} <span id="zaiImgLabel">Upload Ticket / Image</span>
                <input id="zaiImgIn" type="file" accept="image/*" class="hidden">
              </label>
              <label class="row gap-xs xs muted" style="cursor:pointer;margin-right:auto">
                <input type="checkbox" id="zaiAutoSaveEv" checked> Auto-save to Calendar
              </label>
              <button type="button" class="btn primary sm" id="zaiRunEvBtn">${icon('calendar')} <span>Extract &amp; Save</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          const imgIn = bodyEl.querySelector('#zaiImgIn');
          imgIn.onchange = () => {
            const f = imgIn.files?.[0];
            bodyEl.querySelector('#zaiImgLabel').textContent = f ? f.name : 'Upload Ticket / Image';
          };
          bodyEl.querySelector('#zaiRunEvBtn').onclick = async () => {
            const text = bodyEl.querySelector('#zaiEvTextIn').value.trim();
            const file = imgIn.files?.[0];
            const autoSave = bodyEl.querySelector('#zaiAutoSaveEv').checked;
            if (!text && !file) return toast('Type an event or attach a booking image', 'warn');
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
        } else {
          bodyEl.innerHTML = `
            <p class="muted xs" style="margin:0">Ask Zovio AI anything — brainstorm, explain concepts, plan a trip, or generate notes &amp; tasks.</p>
            <textarea id="zaiAskIn" rows="3" placeholder="Ask Zovio AI anything…"></textarea>
            <div class="row between align-center">
              ${S?.activeChatId ? `<button type="button" class="btn ghost sm" id="zaiSumCurChatBtn">Summarize Active Chat</button>` : '<span></span>'}
              <button type="button" class="btn primary sm" id="zaiRunAskBtn">${icon('sparkle')} <span>Ask AI</span></button>
            </div>
          `;
          hydrateIcons(bodyEl);
          bodyEl.querySelector('#zaiSumCurChatBtn')?.addEventListener('click', () => {
            closeModal();
            summarizeCurrentChat();
          });
          bodyEl.querySelector('#zaiRunAskBtn').onclick = async () => {
            const prompt = bodyEl.querySelector('#zaiAskIn').value.trim();
            if (!prompt) return toast('Enter a prompt for Zovio AI', 'warn');
            resEl.innerHTML = `<div class="zai-loading"><span class="spinner"></span><span>Thinking…</span></div>`;
            try {
              const out = await aiRequest('/api/ai/chat', {
                action: 'ask',
                prompt,
                messages: getActiveChatPlainMessages(15),
                todayISO: todayIsoLocal()
              });
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

    if (/^(?:rewrite|fix|polish)\s+/i.test(lower)) {
      const draft = args.replace(/^(?:rewrite|fix|polish)\s+/i, '').trim();
      const inp = document.getElementById('msgInput');
      if (inp && draft) {
        inp.value = draft;
        await rewriteComposerDraft('polish');
      }
      return true;
    }

    await askInCurrentChat(args);
    return true;
  }

  // ---------------- Composer / Slash Menu UI Binding ----------------
  const SLASH_COMMANDS = [
    { cmd: '/zovio ', label: 'Zovio AI', desc: 'Type any question or task (e.g. summarize, replies, event…)', fill: '/zovio ', runNow: false }
  ];

  function bindChatComposerAI(inp) {
    if (!inp || inp._zaiBound) return;
    inp._zaiBound = true;

    const composerWrap = document.getElementById('composerWrap');
    if (!composerWrap) return;
    const composerRow = composerWrap.querySelector('.composer');

    const syncComposerDraftState = () => {
      const hasDraft = Boolean(inp.value && inp.value.length > 0);
      composerRow?.classList.toggle('has-draft', hasDraft);
      if (hasDraft) {
        document.getElementById('attachMenu')?.classList.add('hidden');
        document.getElementById('stickerGifDrawer')?.classList.add('hidden');
      }
    };

    const updateSlashMenu = () => {
      syncComposerDraftState();
      const popup = document.getElementById('zaiSlashPopup');
      if (!popup) return;
      const val = inp.value;
      const trimmed = val.trimStart().toLowerCase();
      if (!trimmed.startsWith('/') || /\n/.test(val) || /^\/zovio\s/i.test(trimmed)) {
        popup.classList.add('hidden');
        return;
      }
      const matches = SLASH_COMMANDS.filter(c => c.cmd.toLowerCase().startsWith(trimmed) || trimmed === '/');
      if (!matches.length) {
        popup.classList.add('hidden');
        return;
      }
      popup.innerHTML = matches.map((c, idx) => `
        <button type="button" class="zai-slash-item ${idx === 0 ? 'active' : ''}" data-scmd="${esc(c.fill)}" data-run="${c.runNow ? '1' : '0'}">
          <div class="zai-slash-top">
            <strong>${esc(c.cmd.trim())}</strong>
            <span class="zai-slash-badge">${esc(c.label)}</span>
          </div>
          <div class="zai-slash-desc">${esc(c.desc)}</div>
        </button>
      `).join('');
      popup.classList.remove('hidden');

      popup.querySelectorAll('.zai-slash-item').forEach(btn => {
        btn.onclick = () => {
          popup.classList.add('hidden');
          const fill = btn.dataset.scmd;
          if (btn.dataset.run === '1') {
            inp.value = '';
            inp._resizeInput?.(false);
            syncComposerDraftState();
            handleSlashCommand(fill);
          } else {
            inp.value = fill;
            inp._resizeInput?.(true);
            syncComposerDraftState();
            inp.focus();
          }
        };
      });
    };

    syncComposerDraftState();
    inp.addEventListener('input', updateSlashMenu);

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
          if (tool === 'smart-replies') return showSmartRepliesForChat();
          if (tool === 'summarize-chat') return summarizeCurrentChat();
          if (tool === 'rewrite-polish') return rewriteComposerDraft('polish');
          if (tool === 'hub-ask') return openHub('ask');
        };
      });
    }
  }

  // ---------------- ZovioSpace Note AI Assistant ----------------
  function openNoteEditorAiMenu({ noteTitle, getPlainText, applyAiHtml }) {
    const plain = String(getPlainText?.() || '').trim();
    showModal('✨ Zovio AI — Note Assistant', `
      <div class="col gap-s">
        <p class="muted xs" style="margin:0">Enhance <strong>${esc(noteTitle || 'this note')}</strong> or summarize a new link/PDF right here.</p>
        <div class="col gap-xs">
          <button type="button" class="info-action-row" data-znai="structure">${icon('sparkle')} <span>Reorganize with Headings &amp; Clean Bullets</span></button>
          <button type="button" class="info-action-row" data-znai="summarize">${icon('note')} <span>Insert Executive Summary at Top</span></button>
          <button type="button" class="info-action-row" data-znai="tasks">${icon('check')} <span>Extract Action Tasks → ZovioSpace Tasks</span></button>
          <button type="button" class="info-action-row" data-znai="flashcards">${icon('edit')} <span>Generate Study Q&amp;A Flashcards</span></button>
          <button type="button" class="info-action-row" data-znai="expand">${icon('plus')} <span>Expand Ideas into Detailed Sections</span></button>
        </div>
      </div>
    `, mbox => {
      hydrateIcons(mbox);
      mbox.querySelectorAll('[data-znai]').forEach(btn => {
        btn.onclick = async () => {
          const mode = btn.dataset.znai;
          if (!plain) return toast('Write some text in the note first!', 'warn');
          closeModal();
          if (mode === 'tasks') {
            showResultModal('✅ Extracted Tasks from Note', async root => {
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
    if (goBtn && input) {
      const runText = () => {
        const txt = input.value.trim();
        if (!txt) return toast('Describe an event (e.g. "Movie Friday 7pm at PVR")', 'warn');
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
    handleSlashCommand,
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

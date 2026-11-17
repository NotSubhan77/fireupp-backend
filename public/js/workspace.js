/* ==========================================================================
   Tele — ZovioSpace (Today, Sleek Tasks, 4-Layout Calendar, Notes, Saved Whiteboards)
   ========================================================================== */

let wsTab = 'today';
let calCursor = new Date();
let calLayout = 'month'; // 'month' | 'week' | 'agenda' | 'year'
let clockTimer = null;
let activeBoardId = null;

let _persistWsTimer = null;
function persistWorkspaceLocalCache(immediate = false) {
  const flush = () => {
    const uid = S.user?.id;
    if (uid && window.ZovioLocalDB?.saveWorkspaceItems) {
      window.ZovioLocalDB.saveWorkspaceItems(uid, S.workspace).catch(() => {});
    }
    if (typeof window.syncZovioWorkspaceNotifications === 'function') {
      window.syncZovioWorkspaceNotifications();
    }
  };
  clearTimeout(_persistWsTimer);
  if (immediate) {
    flush();
  } else {
    _persistWsTimer = setTimeout(flush, 30);
  }
}

function dedupeWorkspaceList(arr) {
  const map = new Map();
  for (const item of (arr || [])) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function upsertWorkspaceEntry(entry) {
  if (!entry || !entry.id) return false;
  let updated = false;
  const next = [];
  for (const existing of S.workspace) {
    if (!existing || !existing.id) continue;
    if (existing.id === entry.id) {
      if (!updated) {
        next.push(entry);
        updated = true;
      }
      // skip any accidental duplicate entries sharing the same id
    } else {
      next.push(existing);
    }
  }
  if (!updated) next.push(entry);
  S.workspace = next;
  return true;
}

async function loadWorkspace() {
  const uid = S.user?.id;
  const raw = await api('/api/workspace').catch(() => []);
  const out = [];
  const cloudIds = new Set();
  for (const r of raw) {
    try {
      const data = await E2E.decryptJSON(S.vaultKey, { iv: r.iv, ct: r.ct });
      out.push({ id: r.id, type: r.type, createdAt: r.createdAt, updatedAt: r.updatedAt, ...data });
      cloudIds.add(r.id);
    } catch { /* skip undecryptable */ }
  }
  if (uid && window.ZovioLocalDB?.getWorkspaceItems) {
    const cached = await window.ZovioLocalDB.getWorkspaceItems(uid).catch(() => []);
    for (const item of cached) {
      if (item && item.id && !cloudIds.has(item.id) && (item.localOnly || String(item.id).startsWith('w_local_'))) {
        out.push({ ...item, localOnly: true });
      }
    }
  }
  S.workspace = dedupeWorkspaceList(out);
  persistWorkspaceLocalCache();
  if (S.view === 'workspace') renderWorkspaceView();
}

const _deletedWsIds = new Set();
const _wsIdAlias = new Map();
const _wsPendingCreations = new Map();
const _wsPendingByCipher = new Map();
let _wsSyncInFlightCount = 0;

function syncWsSaveLoaderPill() {
  const pill = document.getElementById('znSyncPill');
  if (pill) {
    pill.classList.toggle('hidden', _wsSyncInFlightCount <= 0);
  }
}

async function saveWsItem(type, payload, id = null) {
  if (id && _wsIdAlias.has(id)) id = _wsIdAlias.get(id);
  if (id && _wsPendingCreations.has(id)) {
    try { id = await _wsPendingCreations.get(id); } catch {}
  }
  const now = Date.now();
  const isLocalId = Boolean(id && String(id).startsWith('w_local_'));
  const targetId = id || `w_tmp_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const isTempNew = !id;

  const prevExisting = S.workspace.find(x => x.id === targetId);
  const optimisticEntry = prevExisting
    ? { ...prevExisting, ...payload, type: prevExisting.type || type, updatedAt: now, localOnly: isLocalId, _syncing: !isLocalId }
    : { id: targetId, type, createdAt: now, updatedAt: now, localOnly: isLocalId, _syncing: !isLocalId, ...payload };

  upsertWorkspaceEntry(optimisticEntry);
  renderWorkspaceView();
  persistWorkspaceLocalCache(false);

  const persistLocalOverflow = () => {
    const localId = isLocalId ? targetId : `w_local_${now}_${Math.random().toString(36).slice(2, 7)}`;
    if (localId !== targetId) {
      S.workspace = S.workspace.filter(x => x.id !== targetId);
    }
    const existingLocal = S.workspace.find(x => x.id === localId);
    const localEntry = existingLocal
      ? { ...existingLocal, ...payload, type: existingLocal.type || type, updatedAt: now, localOnly: true, _syncing: false }
      : { id: localId, type, createdAt: now, updatedAt: now, localOnly: true, _syncing: false, ...payload };
    upsertWorkspaceEntry(localEntry);
    persistWorkspaceLocalCache(false);
    window.ZovioDriveBackup?.maybeRunScheduledBackup?.();
    renderWorkspaceView();
    return localId;
  };

  if (isLocalId) {
    window.ZovioDriveBackup?.maybeRunScheduledBackup?.();
    return targetId;
  }

  _wsSyncInFlightCount++;
  syncWsSaveLoaderPill();

  const syncTask = (async () => {
    try {
      const box = await E2E.encryptJSON(S.vaultKey, payload);
      if (_deletedWsIds.has(targetId)) return targetId;
      if (!isTempNew) {
        const r = await api(`/api/workspace/${targetId}`, { method: 'PUT', body: box });
        if (_deletedWsIds.has(targetId)) return targetId;
        const cur = S.workspace.find(x => x.id === targetId);
        upsertWorkspaceEntry({ ...(cur || { id: targetId, type }), ...payload, updatedAt: r.updatedAt || now, localOnly: false, _syncing: false });
        persistWorkspaceLocalCache(false);
        window.ZovioDriveBackup?.maybeRunScheduledBackup?.();
        renderWorkspaceView();
        return targetId;
      } else {
        const cipherKey = `${box.iv}:${box.ct}`;
        _wsPendingByCipher.set(cipherKey, targetId);
        let r;
        try {
          r = await api('/api/workspace', { method: 'POST', body: { type, ...box } });
        } finally {
          _wsPendingByCipher.delete(cipherKey);
        }
        _wsIdAlias.set(targetId, r.id);
        if (_deletedWsIds.has(targetId)) {
          _deletedWsIds.delete(targetId);
          S.workspace = S.workspace.filter(x => x.id !== targetId && x.id !== r.id);
          api(`/api/workspace/${r.id}`, { method: 'DELETE' }).catch(() => {});
          return r.id;
        }
        const curLatest = S.workspace.find(x => x.id === targetId) || S.workspace.find(x => x.id === r.id);
        const syncedEntry = { ...(curLatest || {}), ...payload, id: r.id, type, createdAt: r.createdAt || now, updatedAt: r.updatedAt || now, localOnly: false, _syncing: false };
        S.workspace = S.workspace.filter(x => x.id !== targetId);
        upsertWorkspaceEntry(syncedEntry);
        S.workspace = dedupeWorkspaceList(S.workspace);
        persistWorkspaceLocalCache(false);
        window.ZovioDriveBackup?.maybeRunScheduledBackup?.();
        renderWorkspaceView();
        return r.id;
      }
    } catch (err) {
      if (err?.status === 402 || err?.code === 'QUOTA_EXCEEDED' || /quota/i.test(err?.message || '')) {
        return persistLocalOverflow();
      }
      if (isTempNew) S.workspace = S.workspace.filter(x => x.id !== targetId);
      else if (prevExisting) upsertWorkspaceEntry({ ...prevExisting, _syncing: false });
      persistWorkspaceLocalCache(false);
      renderWorkspaceView();
      throw err;
    } finally {
      _wsSyncInFlightCount = Math.max(0, _wsSyncInFlightCount - 1);
      syncWsSaveLoaderPill();
    }
  })();

  if (isTempNew) {
    _wsPendingCreations.set(targetId, syncTask);
    syncTask.finally(() => _wsPendingCreations.delete(targetId));
  }
  return await syncTask;
}

async function deleteWsItem(id) {
  if (id && _wsIdAlias.has(id)) id = _wsIdAlias.get(id);
  const sid = String(id || '');
  _deletedWsIds.add(sid);
  const prevList = [...S.workspace];
  const prevBoardId = activeBoardId;
  S.workspace = S.workspace.filter(x => x.id !== id);
  if (activeBoardId === id) activeBoardId = null;
  persistWorkspaceLocalCache();
  renderWorkspaceView();

  if (sid.startsWith('w_tmp_') && _wsPendingCreations.has(sid)) {
    try {
      const realId = await _wsPendingCreations.get(sid);
      if (realId && !String(realId).startsWith('w_tmp_') && !String(realId).startsWith('w_local_')) {
        await api(`/api/workspace/${realId}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}
    return;
  }

  if (!sid.startsWith('w_local_') && !sid.startsWith('w_tmp_')) {
    try {
      await api(`/api/workspace/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (err?.status !== 404) {
        _deletedWsIds.delete(sid);
        S.workspace = prevList;
        activeBoardId = prevBoardId;
        persistWorkspaceLocalCache();
        renderWorkspaceView();
        throw err;
      }
    }
  }
}

window.onWorkspaceSyncEvent = async function onWorkspaceSyncEvent(ev) {
  if (!ev || !S.vaultKey) return;
  let changed = false;
  if (ev.type === 'ws:upsert' && ev.item) {
    try {
      const cipherKey = ev.item.iv && ev.item.ct ? `${ev.item.iv}:${ev.item.ct}` : '';
      const pendingTmpId = cipherKey ? _wsPendingByCipher.get(cipherKey) : null;
      if (pendingTmpId) {
        _wsIdAlias.set(pendingTmpId, ev.item.id);
        if (_deletedWsIds.has(pendingTmpId)) {
          _deletedWsIds.add(String(ev.item.id));
          S.workspace = S.workspace.filter(x => x.id !== pendingTmpId && x.id !== ev.item.id);
          return;
        }
      }
      if (_deletedWsIds.has(String(ev.item.id))) return;
      const data = await E2E.decryptJSON(S.vaultKey, { iv: ev.item.iv, ct: ev.item.ct });
      const item = {
        id: ev.item.id,
        type: ev.item.type,
        createdAt: ev.item.createdAt,
        updatedAt: ev.item.updatedAt,
        localOnly: false,
        _syncing: false,
        ...data
      };
      if (pendingTmpId) {
        S.workspace = S.workspace.filter(x => x.id !== pendingTmpId);
      }
      const prev = S.workspace.find(x => x.id === item.id);
      if (!pendingTmpId && prev && prev.updatedAt && item.updatedAt && prev.updatedAt === item.updatedAt && JSON.stringify(prev) === JSON.stringify(item)) {
        // Still collapse any accidental duplicates if present
        const deduped = dedupeWorkspaceList(S.workspace);
        if (deduped.length === S.workspace.length) return;
        S.workspace = deduped;
      } else {
        upsertWorkspaceEntry(item);
        S.workspace = dedupeWorkspaceList(S.workspace);
      }
      changed = true;
    } catch {
      return;
    }
  } else if (ev.type === 'ws:removed' && ev.id) {
    const beforeLen = S.workspace.length;
    S.workspace = S.workspace.filter(x => x.id !== ev.id);
    if (activeBoardId === ev.id) activeBoardId = null;
    changed = S.workspace.length !== beforeLen;
  }
  if (!changed) return;
  persistWorkspaceLocalCache();
  if (S.view !== 'workspace') return;

  const wsBody = $('#wsBody');
  const ae = document.activeElement;
  const typingInWs = Boolean(ae && wsBody?.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'));
  if (wsTab === 'board' && (window._wbPointerDown || typingInWs)) {
    return;
  }
  if (typingInWs && ev.type === 'ws:upsert') {
    return;
  }
  const prevScroll = wsBody ? wsBody.scrollTop : 0;
  renderWorkspaceView();
  const nextBody = $('#wsBody');
  if (nextBody && prevScroll) nextBody.scrollTop = prevScroll;
};

const wsTabOrder = ['today', 'tasks', 'calendar', 'notes', 'board'];
let prevWsTab = wsTab;

function applyWsTabSlide(body, prevTab, nextTab) {
  if (!body || !prevTab || prevTab === nextTab) return;
  const p = wsTabOrder.indexOf(prevTab);
  const n = wsTabOrder.indexOf(nextTab);
  const cls = (n > p) ? 'tab-slide-right' : 'tab-slide-left';
  body.classList.remove('tab-slide-right', 'tab-slide-left');
  void body.offsetWidth;
  body.classList.add(cls);
}

function setWorkspaceTab(tab) {
  if (!tab) return;
  wsTab = tab;
  if (S.view !== 'workspace') {
    document.querySelector('.rail-btn[data-view="workspace"]')?.click();
  }
  renderWorkspaceView();
}
window.setWorkspaceTab = setWorkspaceTab;

function renderWorkspaceView() {
  const root = $('#view-workspace');
  if (!root) return;
  clearInterval(clockTimer);

  const localCount = S.workspace.filter(x => x.localOnly || String(x.id).startsWith('w_local_')).length;
  const tabs = [
    ['today', 'sun', 'Today'],
    ['tasks', 'check', 'Tasks'],
    ['calendar', 'calendar', 'Calendar'],
    ['notes', 'note', 'Notes'],
    ['board', 'board', 'Whiteboard']
  ];

  let body = $('#wsBody', root);
  if (!body || !root.querySelector('.ws-head')) {
    root.innerHTML = `
      <header class="ws-head">
        <div class="ws-head-top" id="wsHeadMeta">
          <div class="ws-head-brand">
            <h2 class="zs-brand-heading">
              <span class="zs-logo-mark" aria-hidden="true">
                <svg viewBox="0 0 28 28" fill="none">
                  <defs>
                    <linearGradient id="zsLogoGrad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" style="stop-color: var(--brand, #7c5cff)"/>
                      <stop offset="100%" style="stop-color: var(--brand-2, #ec4899)"/>
                    </linearGradient>
                  </defs>
                  <rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="url(#zsLogoGrad)"/>
                  <rect x="2" y="2" width="24" height="24" rx="7.5" stroke="rgba(255,255,255,0.38)" stroke-width="1"/>
                  <rect x="6.6" y="6.6" width="6" height="6" rx="2" fill="#ffffff"/>
                  <rect x="15.2" y="6.6" width="6" height="6" rx="2" fill="#ffffff" fill-opacity="0.72"/>
                  <rect x="6.6" y="15.2" width="6" height="6" rx="2" fill="#ffffff" fill-opacity="0.72"/>
                  <path d="M18.3 14.3l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1z" fill="#ffffff"/>
                </svg>
              </span>
              <span>ZovioSpace</span>
            </h2>
            <span class="pill">Personal Space</span>
          </div>
          <div class="ws-head-actions">
            <span class="pill amber ${localCount > 0 ? '' : 'hidden'}" id="wsLocalOverflowPill" title="Stored in local device cache">${localCount} in Local Cache</span>
            <button type="button" class="icon-btn zai-ws-btn" id="wsAiHubBtn" title="Zovio AI Studio" aria-label="Zovio AI Studio">${icon('sparkle')}</button>
            <button type="button" class="icon-btn mobile-theme-btn" data-theme-toggle="1" title="Toggle Dark / Light Theme" aria-label="Toggle Dark or Light Theme">${icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon')}</button>
          </div>
        </div>
        <div class="ws-tabs">
          ${tabs.map(([k, ic, label]) => `<button class="${wsTab === k ? 'active' : ''}" data-wstab="${k}">${icon(ic)} <span>${label}</span></button>`).join('')}
        </div>
      </header>
      <div class="ws-body" id="wsBody"></div>
      <button type="button" class="zn-compose-fab ${wsTab === 'notes' ? '' : 'hidden'}" id="newNoteBtn" title="New Note" aria-label="Create New Note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>`;
    body = $('#wsBody', root);
    $('#newNoteBtn', root)?.addEventListener('click', () => {
      openNoteModal(null, { defaultGroup: 'Default' });
    });
    $('#wsAiHubBtn', root)?.addEventListener('click', () => {
      const mode = wsTab === 'calendar' ? 'calendar' : 'summarize';
      window.ZovioAI?.openHub?.(mode);
    });
    const tabsWrap = $('.ws-tabs', root);
    if (tabsWrap && !tabsWrap._wsTabsDelegated) {
      tabsWrap._wsTabsDelegated = true;
      tabsWrap.addEventListener('click', e => {
        const b = e.target.closest('button[data-wstab]');
        if (!b || b.dataset.wstab === wsTab) return;
        prevWsTab = wsTab;
        wsTab = b.dataset.wstab;
        renderWorkspaceView();
      });
    }
  } else {
    $$('[data-wstab]', root).forEach(b => b.classList.toggle('active', b.dataset.wstab === wsTab));
    const pill = $('#wsLocalOverflowPill', root);
    if (pill) {
      pill.classList.toggle('hidden', localCount <= 0);
      if (localCount > 0) pill.textContent = `${localCount} in Local Cache`;
    }
  }

  if (wsTab !== body._renderedTab) {
    body._lastHtml = '';
    body.scrollTop = 0;
    if (body._renderedTab) applyWsTabSlide(body, body._renderedTab, wsTab);
  }
  prevWsTab = wsTab;
  body._renderedTab = wsTab;
  body.classList.toggle('ws-body-board', wsTab === 'board');
  $('#newNoteBtn', root)?.classList.toggle('hidden', wsTab !== 'notes');

  if (wsTab !== 'today' && clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  if (wsTab === 'today') renderTodayTab(body);
  else if (wsTab === 'tasks') renderTasksTab(body);
  else if (wsTab === 'calendar') renderCalendarTab(body);
  else if (wsTab === 'notes') renderNotesTab(body);
  else if (wsTab === 'board') renderWhiteboardTab(body);
}

// ==========================================================================
// 1. TODAY (Fixed Focus Task Addition + Live Clock)
// ==========================================================================
function renderTodayTab(box) {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const hr = now.getHours();
  const greet = (hr >= 4 && hr < 12)
    ? 'Good morning'
    : (hr >= 12 && hr < 17)
      ? 'Good afternoon'
      : (hr >= 17 && hr < 20)
        ? 'Good evening'
        : 'Good night';

  const tasks = S.workspace.filter(x => x.type === 'task' && x.status !== 'done');
  const events = S.workspace.filter(x => x.type === 'event' && x.date === todayISO).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const notes = S.workspace.filter(x => x.type === 'note' && !x.deleted && !x.locked).slice(-4).reverse();

  box.innerHTML = `
    <div class="today-hero">
      <div>
        <div style="font-size:13px;opacity:.85;font-weight:600">${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <h1 style="font-size:28px;font-weight:800;margin-top:4px">${greet}, ${esc(S.user.name.split(' ')[0])} ✨</h1>
        <p style="opacity:.9;margin-top:4px">You have <b>${tasks.length}</b> focus task${tasks.length === 1 ? '' : 's'} and <b>${events.length}</b> event${events.length === 1 ? '' : 's'} scheduled today.</p>
      </div>
      <div class="today-clock" id="liveClock">${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    </div>

    <div class="grid-3">
      <div class="card">
        <h3>
          <span>🎯 Focus Tasks (${tasks.length})</span>
          <button type="button" class="btn sm ghost" id="goTasksBtn">All Tasks →</button>
        </h3>
        <form id="focusTaskForm" class="row gap-xs focus-task-form">
          <input id="quickTaskIn" placeholder="Type a focus task for today…" style="flex:1;min-width:0">
          <select id="quickTaskPrio" class="focus-prio-select">
            <option value="high">🔥 High</option>
            <option value="medium" selected>⚡ Med</option>
            <option value="low">🌱 Low</option>
          </select>
          <button type="submit" class="btn primary" id="quickTaskBtn">+ Add</button>
        </form>
        <div class="col gap-s" style="margin-top:4px">
          ${tasks.slice(0, 6).map(t => `
            <div class="task-card" style="align-items:center">
              <div class="todo-box" data-done="${t.id}" style="cursor:pointer" title="Mark complete"></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700">${esc(t.title)}</div>
                <div class="row gap-xs" style="margin-top:3px">
                  <span class="pill ${t.priority === 'high' ? 'red' : t.priority === 'low' ? 'green' : 'amber'}">${esc(t.priority || 'medium')}</span>
                  ${t.due ? `<small class="muted">Due ${esc(t.due)}</small>` : ''}
                </div>
              </div>
              <button type="button" class="icon-btn" data-deltoday="${t.id}" title="Delete">${icon('trash')}</button>
            </div>`).join('') || `
            <div class="no-content-box" style="margin:8px 0;padding:22px 14px">
              <div class="nc-ico">${icon('check')}</div>
              <h4>No Focus Tasks Yet</h4>
              <p>Type a task above and press <b>+ Add</b> to lock in today's focus.</p>
            </div>`}
        </div>
      </div>

      <div class="card">
        <h3><span>📅 Today's Schedule</span><button type="button" class="btn sm ghost" id="goCalBtn">Calendar →</button></h3>
        <div class="col gap-s">
          ${events.map(ev => `
            <div class="task-card">
              <span class="pill">${esc(ev.time || 'All day')}</span>
              <div style="flex:1"><strong>${esc(ev.title)}</strong>${ev.notes ? `<div class="muted" style="font-size:12px">${esc(ev.notes)}</div>` : ''}</div>
            </div>`).join('') || `
            <div class="no-content-box" style="margin:8px 0;padding:22px 14px">
              <div class="nc-ico">${icon('calendar')}</div>
              <h4>No Events Today</h4>
              <p>Your schedule is clear today.</p>
              <button type="button" class="btn sm primary" id="quickAddEvBtn">+ Add Event</button>
            </div>`}
        </div>
      </div>

      <div class="card">
        <h3><span>📝 Recent Notes</span><button type="button" class="btn sm ghost" id="goNotesBtn">All Notes →</button></h3>
        <div class="col gap-s">
          ${notes.map(n => `
            <div class="task-card" data-open-note="${n.id}" style="flex-direction:column;gap:4px;cursor:pointer;border-left:3px solid ${esc(n.color || '#7c5cff')}">
              <strong>${esc(n.title)}</strong>
              <span class="muted" style="font-size:12.5px">${esc((n.body || '').slice(0, 100))}</span>
            </div>`).join('') || `
            <div class="no-content-box" style="margin:8px 0;padding:22px 14px">
              <div class="nc-ico">${icon('note')}</div>
              <h4>No Notes Found</h4>
              <p>Capture ideas & project notes.</p>
              <button type="button" class="btn sm primary" id="quickAddNoteBtn">+ New Note</button>
            </div>`}
        </div>
      </div>
    </div>`;

  hydrateIcons(box);

  clockTimer = setInterval(() => {
    const el = $('#liveClock');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, 1000);

  $('#focusTaskForm', box).onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form._submitting) return;
    const inp = $('#quickTaskIn', box);
    const val = inp.value.trim();
    const prio = $('#quickTaskPrio', box).value;
    if (!val) {
      openQuickFocusTaskModal(todayISO);
      return;
    }
    form._submitting = true;
    inp.value = '';
    try {
      await saveWsItem('task', { title: val, status: 'todo', priority: prio, due: todayISO, tag: 'Focus' });
    } finally {
      form._submitting = false;
    }
  };

  $$('[data-done]', box).forEach(el => el.onclick = async () => {
    const t = S.workspace.find(x => x.id === el.dataset.done);
    if (t) {
      await saveWsItem('task', { ...t, status: 'done' }, t.id);
    }
  });
  $$('[data-deltoday]', box).forEach(el => el.onclick = () => deleteWsItem(el.dataset.deltoday));
  $$('[data-open-note]', box).forEach(el => el.onclick = () => {
    const n = S.workspace.find(x => x.id === el.dataset.openNote);
    if (n) openNoteModal(n);
  });

  $('#goTasksBtn', box).onclick = () => { wsTab = 'tasks'; renderWorkspaceView(); };
  $('#goCalBtn', box).onclick = () => { wsTab = 'calendar'; renderWorkspaceView(); };
  $('#goNotesBtn', box).onclick = () => { wsTab = 'notes'; renderWorkspaceView(); };
  if ($('#quickAddEvBtn', box)) $('#quickAddEvBtn', box).onclick = () => openEventModal(todayISO);
  if ($('#quickAddNoteBtn', box)) $('#quickAddNoteBtn', box).onclick = () => openNoteModal(null);
}

function openQuickFocusTaskModal(todayISO) {
  showModal('🎯 Add Focus Task', `
    <label class="col gap-xs"><span class="muted">Task Title</span><input id="mFocusTitle" placeholder="Complete UI design review…"></label>
    <div class="row gap-s">
      <label style="flex:1">Priority
        <select id="mFocusPrio">
          <option value="high">🔥 High Priority</option>
          <option value="medium" selected>⚡ Medium Priority</option>
          <option value="low">🌱 Low Priority</option>
        </select>
      </label>
      <label style="flex:1">Due Date<input id="mFocusDue" type="date" value="${todayISO}"></label>
    </div>
    <button class="btn primary lg" id="mFocusSaveBtn">+ Add Focus Task</button>
  `, mbox => {
    $('#mFocusTitle', mbox).focus();
    $('#mFocusSaveBtn', mbox).onclick = async () => {
      const title = $('#mFocusTitle', mbox).value.trim();
      if (!title) return toast('Please enter a task title', 'err');
      closeModal();
      await saveWsItem('task', {
        title,
        status: 'todo',
        priority: $('#mFocusPrio', mbox).value,
        due: $('#mFocusDue', mbox).value,
        tag: 'Focus'
      });
    };
  });
}

// ==========================================================================
// 2. TASKS (Sleek Redesigned Command Bar, Stats Row, Kanban & No Content Found)
// ==========================================================================
let taskFilterPrio = 'all';

function renderTasksTab(box) {
  const allTasks = S.workspace.filter(x => x.type === 'task');
  const tasks = taskFilterPrio === 'all' ? allTasks : allTasks.filter(t => (t.priority || 'medium') === taskFilterPrio);
  const todayISO = new Date().toISOString().slice(0, 10);

  const todoCnt = allTasks.filter(t => (t.status || 'todo') === 'todo').length;
  const doingCnt = allTasks.filter(t => t.status === 'doing').length;
  const doneCnt = allTasks.filter(t => t.status === 'done').length;
  const pct = allTasks.length ? Math.round((doneCnt / allTasks.length) * 100) : 0;

  const cols = [
    ['todo', '📋 To Do', 'amber'],
    ['doing', '⚡ In Progress', ''],
    ['done', '✅ Completed', 'green']
  ];

  const nextTasksHtml = `
    <div class="task-stats-row">
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">Total Tasks</div><b>${allTasks.length}</b></div><span class="pill">Tasks</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">To Do</div><b style="color:var(--amber)">${todoCnt}</b></div><span class="pill amber">Queued</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">In Progress</div><b style="color:var(--brand)">${doingCnt}</b></div><span class="pill">Active</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">Completion</div><b style="color:var(--green)">${pct}%</b></div><span class="pill green">${doneCnt} Done</span></div>
    </div>

    <form class="task-composer-card" id="taskCreateForm">
      <input id="tTitle" class="task-title-in" placeholder="✨ What needs to get done? Type a task title…">
      <input id="tTag" class="task-tag-in" placeholder="Tag (e.g. Design, Dev)">
      <input id="tDue" class="task-due-in" type="date" value="${todayISO}">
      <select id="tPrio" class="task-prio-in">
        <option value="high">🔥 High Priority</option>
        <option value="medium" selected>⚡ Medium</option>
        <option value="low">🌱 Low Priority</option>
      </select>
      <button type="submit" class="btn primary task-add-btn" id="tAddBtn">+ Add Task</button>
    </form>

    <div class="ws-prio-bar" style="margin-bottom:16px">
      <span class="ws-prio-label">Priority</span>
      <div class="ws-prio-chips">
        ${[['all', 'All', ''], ['high', 'High', 'is-high'], ['medium', 'Medium', 'is-medium'], ['low', 'Low', 'is-low']].map(([k, label, dotCls]) =>
          `<button type="button" class="ws-prio-chip ${dotCls} ${taskFilterPrio === k ? 'active' : ''}" data-tf="${k}">${dotCls ? `<span class="ws-prio-dot ${dotCls}" aria-hidden="true"></span>` : ''}<span>${label}</span></button>`
        ).join('')}
      </div>
    </div>

    ${!tasks.length ? `
      <div class="no-content-box">
        <div class="nc-ico">${icon('check')}</div>
        <h4>No Content Found</h4>
        <p>${allTasks.length ? 'No tasks match your selected priority filter.' : 'Your ZovioSpace task board is empty. Add your first task above!'}</p>
      </div>
    ` : `
      <div class="kanban">
        ${cols.map(([st, label, pillCls]) => {
          const list = tasks.filter(t => (t.status || 'todo') === st);
          return `<div class="card">
            <h3><span>${label}</span><span class="pill ${pillCls}">${list.length}</span></h3>
            <div class="col gap-s">
              ${list.map(t => `
                <div class="task-card" style="border-left:3.5px solid ${t.priority === 'high' ? 'var(--red)' : t.priority === 'low' ? 'var(--green)' : 'var(--brand)'}">
                  <div class="todo-box" data-cycle="${t.id}" title="Click to advance stage" style="cursor:pointer;${st === 'done' ? 'background:var(--green);border-color:var(--green);color:#000' : ''}">${st === 'done' ? '✓' : (st === 'doing' ? '•' : '')}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:14px;${st === 'done' ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(t.title)}</div>
                    <div class="row gap-xs wrap" style="margin-top:6px">
                      <span class="pill ${t.priority === 'high' ? 'red' : t.priority === 'low' ? 'green' : 'amber'}">${esc(t.priority || 'medium')}</span>
                      ${t.tag ? `<span class="pill">${esc(t.tag)}</span>` : ''}
                      ${t.due ? `<small class="muted">📅 ${esc(t.due)}</small>` : ''}
                    </div>
                  </div>
                  <div class="row gap-xs">
                    <button type="button" class="chip" data-cycle="${t.id}" style="padding:4px 8px;font-size:11px">${st === 'todo' ? 'Start →' : st === 'doing' ? 'Done ✓' : 'Reopen'}</button>
                    <button type="button" class="icon-btn" data-del="${t.id}" title="Delete">${icon('trash')}</button>
                  </div>
                </div>`).join('') || `
                <div class="no-content-box" style="margin:6px 0;padding:24px 12px">
                  <p>No Content Found in ${esc(label)}</p>
                </div>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    `}`;

  if (box._lastHtml !== nextTasksHtml) {
    const prevScroll = box.scrollTop;
    box._lastHtml = nextTasksHtml;
    box.innerHTML = nextTasksHtml;
    hydrateIcons(box);
    if (prevScroll > 0) box.scrollTop = prevScroll;

    $('#taskCreateForm', box).onsubmit = async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const addBtn = $('#tAddBtn', box);
      if (form._submitting) return;
      const title = $('#tTitle', box).value.trim();
      if (!title) return toast('Enter a task title first', 'err');
      form._submitting = true;
      if (addBtn) addBtn.disabled = true;
      try {
        await saveWsItem('task', {
          title,
          tag: $('#tTag', box).value.trim(),
          status: 'todo',
          priority: $('#tPrio', box).value,
          due: $('#tDue', box).value
        });
      } finally {
        form._submitting = false;
        if (addBtn) addBtn.disabled = false;
      }
    };
  }

  if (!box._tasksDelegated) {
    box._tasksDelegated = true;
    box.addEventListener('click', e => {
      if (wsTab !== 'tasks') return;
      const tfBtn = e.target.closest('[data-tf]');
      if (tfBtn) {
        taskFilterPrio = tfBtn.dataset.tf;
        renderTasksTab(box);
        return;
      }
      const cycBtn = e.target.closest('[data-cycle]');
      if (cycBtn) {
        const t = S.workspace.find(x => x.id === cycBtn.dataset.cycle);
        if (!t) return;
        const next = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
        saveWsItem('task', { ...t, status: next }, t.id);
        return;
      }
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        deleteWsItem(delBtn.dataset.del);
      }
    });
  }
}

// ==========================================================================
// 3. CALENDAR (4 Layouts: Month Grid, Week Timeline, Agenda List, Year Overview)
// ==========================================================================
const toLocalISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function renderCalendarTab(box) {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  const todayISO = toLocalISO(new Date());
  const events = S.workspace.filter(x => x.type === 'event');

  const headerTitle = calLayout === 'year'
    ? `${y} Yearly Overview`
    : calCursor.toLocaleDateString([], { month: 'long', year: 'numeric' });

  let bodyHTML = '';

  if (calLayout === 'month') {
    const first = new Date(y, m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(`<div class="cal-cell other"></div>`);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvs = events.filter(e => e.date === iso).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      cells.push(`
        <div class="cal-cell ${iso === todayISO ? 'today' : ''} ${dayEvs.length ? 'has-events' : ''}" data-date="${iso}">
          <div class="row between cal-cell-top"><span class="cal-num">${d}</span>${dayEvs.length ? `<span class="pill cal-count-pill"><span class="cal-count-full">${dayEvs.length} event${dayEvs.length > 1 ? 's' : ''}</span><span class="cal-count-short">${dayEvs.length}</span></span>` : ''}</div>
          <div class="cal-ev-list">
          ${dayEvs.slice(0, 3).map(e => `
            <div class="cal-ev" data-evid="${e.id}" title="${esc(e.title)}${e.time ? ` at ${e.time}` : ''}${e.notes ? ` — ${e.notes}` : ''}">
              <span class="cal-ev-dot"></span>
              <span class="cal-ev-time" style="font-weight:700;opacity:0.9">${esc(e.time || '')}</span>
              <span class="cal-ev-title">${esc(e.title)}</span>
            </div>
          `).join('')}
          ${dayEvs.length > 3 ? `<div class="muted xs cal-more-pill" style="font-weight:700;margin-top:auto">+${dayEvs.length - 3} more</div>` : ''}
          </div>
        </div>`);
    }
    bodyHTML = `
      <div class="cal-grid">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
        ${cells.join('')}
      </div>`;
  } else if (calLayout === 'week') {
    const curr = new Date(calCursor);
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - curr.getDay());
    const cols = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const iso = toLocalISO(d);
      const dayEvs = events.filter(e => e.date === iso).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      cols.push(`
        <div class="cal-week-col ${iso === todayISO ? 'today' : ''}" data-date="${iso}" style="cursor:pointer">
          <div class="row between">
            <strong>${d.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}</strong>
            <span class="muted" style="font-size:11px">+ Add</span>
          </div>
          <div class="col gap-xs" style="margin-top:6px">
            ${dayEvs.map(e => `
              <div class="task-card" style="padding:8px 10px;flex-direction:column;gap:3px">
                <span class="pill" style="align-self:flex-start">${esc(e.time || 'All day')}</span>
                <strong style="font-size:12.5px">${esc(e.title)}</strong>
                ${e.notes ? `<small class="muted">${esc(e.notes)}</small>` : ''}
              </div>`).join('') || `<small class="muted" style="opacity:.6">No events</small>`}
          </div>
        </div>`);
    }
    bodyHTML = `<div class="cal-week-grid">${cols.join('')}</div>`;
  } else if (calLayout === 'agenda') {
    const sorted = [...events].sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
    bodyHTML = sorted.length ? `
      <div class="col gap-s" style="max-width:780px;margin:0 auto">
        ${sorted.map(e => `
          <div class="task-card cal-agenda-row" data-date="${esc(e.date)}">
            <span class="pill cal-agenda-date ${e.date === todayISO ? 'green' : ''}">${esc(e.date)}</span>
            <span class="pill amber cal-agenda-time">${esc(e.time || 'All day')}</span>
            <div class="cal-agenda-body" style="flex:1;min-width:0">
              <strong>${esc(e.title)}</strong>
              ${e.notes ? `<div class="muted" style="font-size:12px">${esc(e.notes)}</div>` : ''}
            </div>
            <button class="icon-btn" data-delev-direct="${e.id}">${icon('trash')}</button>
          </div>`).join('')}
      </div>
    ` : `
      <div class="no-content-box">
        <div class="nc-ico">${icon('calendar')}</div>
        <h4>No Content Found</h4>
        <p>No scheduled events in your agenda yet. Click <b>+ New Event</b> to add one!</p>
      </div>`;
  } else if (calLayout === 'year') {
    const months = [];
    for (let mi = 0; mi < 12; mi++) {
      const mFirst = new Date(y, mi, 1);
      const mDays = new Date(y, mi + 1, 0).getDate();
      const pad = mFirst.getDay();
      const spans = [];
      for (let p = 0; p < pad; p++) spans.push(`<span></span>`);
      for (let d = 1; d <= mDays; d++) {
        const iso = `${y}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasEv = events.some(e => e.date === iso);
        spans.push(`<span class="${iso === todayISO ? 'is-today' : hasEv ? 'has-ev' : ''}">${d}</span>`);
      }
      months.push(`
        <div class="cal-mini-month" data-jump-month="${mi}">
          <strong>${mFirst.toLocaleDateString([], { month: 'long' })}</strong>
          <div class="cal-mini-days">
            ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => `<b class="muted">${w}</b>`).join('')}
            ${spans.join('')}
          </div>
        </div>`);
    }
    bodyHTML = `<div class="cal-year-grid">${months.join('')}</div>`;
  }

  box.innerHTML = `
    <div class="row between wrap gap-s cal-toolbar" style="margin-bottom:16px">
      <div class="row gap-s cal-nav-group">
        <button class="btn sm" id="calPrev">← Prev</button>
        <button class="btn sm ghost" id="calTodayBtn">Today</button>
        <h3 class="cal-month-title">${headerTitle}</h3>
        <button class="btn sm" id="calNext">Next →</button>
      </div>
      <div class="row gap-s wrap cal-view-group">
        <div class="ws-tabs cal-layout-tabs">
          ${[['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda'], ['year', 'Year']].map(([k, lbl]) =>
            `<button type="button" class="${calLayout === k ? 'active' : ''}" data-callayout="${k}">${lbl}</button>`
          ).join('')}
        </div>
        <button class="btn primary sm" id="newEvBtn">+ New Event</button>
      </div>
    </div>
    <div class="zai-cal-card">
      <div class="zai-cal-top">
        <span class="zai-cal-ico">${icon('sparkle')}</span>
        <span class="zai-cal-label">Quick AI Schedule</span>
      </div>
      <div class="zai-cal-row">
        <input id="calAiInput" class="zai-cal-in" placeholder="e.g. Dinner tomorrow at 8pm at Taj" autocomplete="off">
      </div>
      <div class="zai-cal-actions">
        <button type="button" class="btn ghost sm" id="calAiScanBtn" title="Upload movie ticket or booking image">${icon('image')} <span>Scan Ticket</span></button>
        <button type="button" class="btn primary sm" id="calAiGoBtn">${icon('calendar')} <span>Schedule Event</span></button>
      </div>
    </div>
    ${bodyHTML}`;

  hydrateIcons(box);
  window.ZovioAI?.bindCalendarAiBar?.(box, () => renderCalendarTab(box));

  $$('[data-callayout]', box).forEach(b => b.onclick = () => {
    calLayout = b.dataset.callayout;
    renderCalendarTab(box);
  });

  $('#calPrev', box).onclick = () => {
    if (calLayout === 'week') calCursor = new Date(y, m, calCursor.getDate() - 7);
    else if (calLayout === 'year') calCursor = new Date(y - 1, m, 1);
    else calCursor = new Date(y, m - 1, 1);
    renderCalendarTab(box);
  };
  $('#calNext', box).onclick = () => {
    if (calLayout === 'week') calCursor = new Date(y, m, calCursor.getDate() + 7);
    else if (calLayout === 'year') calCursor = new Date(y + 1, m, 1);
    else calCursor = new Date(y, m + 1, 1);
    renderCalendarTab(box);
  };
  $('#calTodayBtn', box).onclick = () => { calCursor = new Date(); renderCalendarTab(box); };
  $('#newEvBtn', box).onclick = () => openCreateEventModal(todayISO, () => renderCalendarTab(box));
  $$('[data-evid]', box).forEach(el => el.onclick = e => {
    e.stopPropagation();
    const ev = S.workspace.find(x => x.id === el.dataset.evid);
    if (ev) openSingleEventModal(ev, () => renderCalendarTab(box));
  });
  $$('[data-date]', box).forEach(el => el.onclick = () => openDateEventsModal(el.dataset.date, () => renderCalendarTab(box)));
  $$('[data-delev-direct]', box).forEach(el => el.onclick = e => {
    e.stopPropagation();
    deleteWsItem(el.dataset.delevDirect).then(() => renderCalendarTab(box));
  });
  $$('[data-jump-month]', box).forEach(el => el.onclick = () => {
    calCursor = new Date(y, +el.dataset.jumpMonth, 1);
    calLayout = 'month';
    renderCalendarTab(box);
  });
}

// ---------------- Single Event Details Modal (Opens exactly that event) ----------------
function openSingleEventModal(e, onRefresh) {
  const dObj = new Date((e.date || todayISO) + 'T00:00:00');
  const formattedDate = dObj.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  showModal(`Event Details`, `
    <div class="col gap-m ws-modal-sheet" style="width:min(420px, 100%);min-width:0">
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div class="row between align-center">
          <div class="row gap-xs align-center">
            <span class="cal-ev-dot" style="width:10px;height:10px;background:#38ef7d;border-radius:50%;display:inline-block;box-shadow:0 0 10px #38ef7d"></span>
            <strong style="font-size:16px;color:var(--text-0)">${esc(e.title)}</strong>
          </div>
          <span class="pill xs" style="background:rgba(124,92,255,0.22);color:var(--brand);font-weight:700">${esc(e.time || 'All day')}</span>
        </div>

        <div class="row gap-xs align-center muted xs" style="color:var(--text-1)">
          <span>📅 ${esc(formattedDate)}</span>
          <span>·</span>
          <span>⏰ ${esc(e.time || 'All day')}</span>
        </div>

        ${e.notes ? `
          <div style="margin-top:4px;padding:12px 14px;background:var(--bg-1);border-radius:12px;border:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--text-1);white-space:pre-wrap">
            ${esc(e.notes)}
          </div>
        ` : ''}
      </div>

      <div class="row gap-s" style="margin-top:2px">
        <button type="button" class="btn danger" id="delSingleEvBtn" style="padding:10px 16px;border-radius:12px">
          ${icon('trash')} <span>Delete</span>
        </button>
        <button type="button" class="btn ghost" id="editSingleEvBtn" style="padding:10px 16px;border-radius:12px">
          <span>Edit</span>
        </button>
        <button type="button" class="btn primary" id="closeSingleEvBtn" style="flex:1;height:42px;border-radius:12px;font-weight:700">
          <span>Done</span>
        </button>
      </div>
    </div>
  `, mbox => {
    $('#delSingleEvBtn', mbox).onclick = async () => {
      await deleteWsItem(e.id);
      closeModal();
      if (onRefresh) onRefresh();
    };

    $('#editSingleEvBtn', mbox).onclick = () => {
      closeModal();
      openCreateEventModal(e.date || todayISO, onRefresh, e);
    };

    $('#closeSingleEvBtn', mbox).onclick = closeModal;
  });
}

// ---------------- Dedicated Add / Edit New Event Popup Modal ----------------
function openCreateEventModal(initialDateISO = todayISO, onRefresh, existingEvent = null) {
  const isEdit = !!existingEvent;
  const initTitle = existingEvent ? existingEvent.title : '';
  const initDate = existingEvent ? existingEvent.date : initialDateISO;
  const initTime = existingEvent ? (existingEvent.time || '10:00') : '10:00';
  const initNotes = existingEvent ? (existingEvent.notes || '') : '';

  showModal(isEdit ? 'Edit Event' : 'Add New Event', `
    <div class="col gap-m ws-modal-sheet" style="width:min(440px, 100%);min-width:0">
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow-md)">
        <label class="col gap-xs">
          <span class="muted" style="font-size:12px;font-weight:700">Event Title *</span>
          <input id="ceTitle" value="${esc(initTitle)}" placeholder="e.g. Design Sync / Workout / Team Call" style="height:42px;padding:0 14px;border-radius:12px;background:var(--bg-1);border:1px solid var(--border);color:var(--text-0);font-size:14px">
        </label>

        <div class="row gap-s">
          <label style="flex:1" class="col gap-xs">
            <span class="muted" style="font-size:12px;font-weight:700">Date</span>
            <input id="ceDate" type="date" value="${initDate}" style="height:42px;padding:0 12px;border-radius:12px;background:var(--bg-1);border:1px solid var(--border);color:var(--text-0)">
          </label>
          <label style="flex:1" class="col gap-xs">
            <span class="muted" style="font-size:12px;font-weight:700">Time</span>
            <input id="ceTime" type="time" value="${initTime}" style="height:42px;padding:0 12px;border-radius:12px;background:var(--bg-1);border:1px solid var(--border);color:var(--text-0)">
          </label>
        </div>

        <label class="col gap-xs">
          <span class="muted" style="font-size:12px;font-weight:700">Description / Room Link Notes</span>
          <textarea id="ceNotes" rows="3" placeholder="Optional details, agenda, or meet link…" style="padding:10px 14px;border-radius:12px;background:var(--bg-1);border:1px solid var(--border);color:var(--text-0);resize:vertical;font-size:13px">${esc(initNotes)}</textarea>
        </label>
      </div>

      <div class="row gap-s" style="margin-top:4px">
        <button type="button" class="btn ghost" id="ceCancelBtn" style="height:44px;border-radius:13px;flex:1">Cancel</button>
        <button type="button" class="btn primary glow" id="ceSaveBtn" style="height:44px;border-radius:13px;flex:1.4;font-weight:800">
          <span>${isEdit ? 'Update Event' : 'Add Event'}</span>
        </button>
      </div>
    </div>
  `, mbox => {
    setTimeout(() => $('#ceTitle', mbox)?.focus(), 50);

    $('#ceCancelBtn', mbox).onclick = closeModal;

    $('#ceSaveBtn', mbox).onclick = async () => {
      const saveBtn = $('#ceSaveBtn', mbox);
      if (saveBtn?.disabled) return;
      const title = $('#ceTitle', mbox).value.trim();
      if (!title) return toast('Enter an event title', 'err');
      if (saveBtn) saveBtn.disabled = true;
      const date = $('#ceDate', mbox).value || initialDateISO;
      const time = $('#ceTime', mbox).value || '10:00';
      const notes = $('#ceNotes', mbox).value.trim();

      try {
        if (isEdit && existingEvent) {
          await updateWsItem(existingEvent.id, { title, date, time, notes });
        } else {
          await saveWsItem('event', { title, date, time, notes });
        }
        closeModal();
        if (onRefresh) onRefresh();
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    };
  });
}

// ---------------- Date Events List Modal (With Smooth Scrollbar & Clean UI) ----------------
function openDateEventsModal(initialDateISO, onRefresh) {
  let currentDateISO = initialDateISO;

  const renderModalContent = (mbox) => {
    const existing = S.workspace.filter(x => x.type === 'event' && x.date === currentDateISO).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const dObj = new Date(currentDateISO + 'T00:00:00');
    const formattedDate = dObj.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    mbox.innerHTML = `
      <div class="col gap-m ws-modal-sheet" style="width:min(480px, 100%);min-width:0;padding:6px 0">
        <div class="row between align-center" style="padding-bottom:14px;border-bottom:1px solid var(--border)">
          <div>
            <strong style="font-size:17px;font-weight:800;display:block;color:var(--text-0)">${esc(formattedDate)}</strong>
            <span class="muted xs" style="font-weight:600;margin-top:2px;display:block">${existing.length} scheduled event${existing.length === 1 ? '' : 's'}</span>
          </div>
          <button type="button" class="btn primary sm glow" id="modalAddNewEvBtn" style="padding:8px 16px;border-radius:12px;font-weight:700">
            <span>+ Add Event</span>
          </button>
        </div>

        <div class="col gap-s cal-events-scroll-wrap" id="evListWrap" style="max-height:300px;overflow-y:auto;padding:4px 2px">
          ${existing.map(e => `
            <div class="cal-event-detail-card" data-openev="${e.id}" style="padding:14px 16px;background:var(--bg-2);border-radius:14px;border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;transition:all 0.16s ease">
              <div style="flex:1;min-width:0">
                <div class="row gap-xs align-center">
                  <span class="cal-ev-dot" style="width:8px;height:8px;background:#38ef7d;border-radius:50%;display:inline-block"></span>
                  <strong style="font-size:14px;color:var(--text-0)">${esc(e.title)}</strong>
                  <span class="pill xs" style="background:rgba(124,92,255,0.18);color:var(--brand);font-weight:700;margin-left:4px">${esc(e.time || 'All day')}</span>
                </div>
                ${e.notes ? `<div class="muted" style="font-size:12px;margin-top:5px;padding-left:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.notes)}</div>` : ''}
              </div>
              <button type="button" class="icon-btn" data-delev="${e.id}" title="Delete event" style="color:#ef4444;flex-shrink:0">${icon('trash')}</button>
            </div>
          `).join('') || `
            <div class="cal-empty-state-box" style="padding:32px 20px;text-align:center;background:var(--bg-2);border-radius:16px;border:1px dashed var(--border);margin:8px 0;display:flex;flex-direction:column;align-items:center;gap:10px">
              <div style="width:48px;height:48px;border-radius:14px;background:rgba(124,92,255,0.14);display:grid;place-items:center;font-size:24px">🗓️</div>
              <strong style="font-size:15px;color:var(--text-0);font-weight:700">No events on this date</strong>
              <p class="muted xs" style="max-width:300px;line-height:1.5;margin:0">No meetings or calendar events scheduled for this day yet.</p>
              <button type="button" class="btn primary sm" id="emptyAddEvBtn" style="margin-top:4px;border-radius:10px;padding:7px 18px;font-weight:700">+ Create Event</button>
            </div>
          `}
        </div>

        <div class="row between align-center" style="margin-top:8px;border-top:1px solid var(--border);padding-top:14px">
          <span class="muted xs" style="font-weight:500">Click any event to view full details</span>
          <button type="button" class="btn ghost" id="closeEvModalBtn" style="height:38px;padding:0 22px;border-radius:12px;font-weight:600">Done</button>
        </div>
      </div>
    `;

    hydrateIcons(mbox);

    const onAddClick = () => {
      closeModal();
      openCreateEventModal(currentDateISO, onRefresh);
    };
    if ($('#modalAddNewEvBtn', mbox)) $('#modalAddNewEvBtn', mbox).onclick = onAddClick;
    if ($('#emptyAddEvBtn', mbox)) $('#emptyAddEvBtn', mbox).onclick = onAddClick;

    // Clicking an event card opens ONLY that event's details
    $$('[data-openev]', mbox).forEach(card => {
      card.onclick = e => {
        if (e.target.closest('[data-delev]')) return;
        const ev = S.workspace.find(x => x.id === card.dataset.openev);
        if (ev) {
          closeModal();
          openSingleEventModal(ev, onRefresh);
        }
      };
    });

    // Delete in place without closing modal
    $$('[data-delev]', mbox).forEach(b => b.onclick = async e => {
      e.stopPropagation();
      await deleteWsItem(b.dataset.delev);
      renderModalContent(mbox);
      if (onRefresh) onRefresh();
    });

    // "+ Add Event" opens dedicated creation popup
    const addBtn = $('#modalAddNewEvBtn', mbox);
    if (addBtn) {
      addBtn.onclick = () => {
        closeModal();
        openCreateEventModal(currentDateISO, onRefresh);
      };
    }

    const closeBtn = $('#closeEvModalBtn', mbox);
    if (closeBtn) closeBtn.onclick = closeModal;
  };

  showModal(`Calendar Events`, `<div id="evModalRoot"></div>`, mbox => {
    renderModalContent($('#evModalRoot', mbox));
  });
}

// ==========================================================================
// 4. NOTES (Rich Zovio Notes — Groups, Lock, Skins, Voice, Doodle, Docs, Tables)
// ==========================================================================
const ZN_BUILTIN_GROUPS = ['Default', 'Quick note'];
const ZN_SKINS = [
  { id: 'default', name: 'Ambient', dot: '#7c5cff' },
  { id: 'aurora', name: 'Aurora', dot: '#2ed3b7' },
  { id: 'midnight', name: 'Midnight', dot: '#4c8dff' },
  { id: 'sunset', name: 'Sunset', dot: '#ff5c8a' },
  { id: 'mint', name: 'Sage Mint', dot: '#10b981' },
  { id: 'paper', name: 'Warm Paper', dot: '#eab308' },
  { id: 'grid', name: 'Dot Grid', dot: '#94a3b8' },
  { id: 'lined', name: 'Lined', dot: '#a78bfa' }
];

let noteActiveGroup = 'All';
let noteViewLayout = localStorage.getItem('zovio_note_layout') || 'grid';
let noteLockedUnlockedSession = false;

function znCustomGroupsKey() {
  return `zovio_note_groups_${S.user?.id || 'anon'}`;
}

function getAllNoteGroups(notes = []) {
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(znCustomGroupsKey()) || '[]'); } catch {}
  const removedLegacy = new Set(['Audio summaries', 'Call summaries', 'Article summaries', 'Recently deleted', 'All', 'Locked']);
  const set = new Set(ZN_BUILTIN_GROUPS);
  for (const g of stored) {
    if (g && typeof g === 'string' && !removedLegacy.has(g.trim())) set.add(g.trim());
  }
  for (const n of notes) {
    if (n?.group && !removedLegacy.has(n.group)) set.add(n.group);
  }
  return Array.from(set);
}

function addCustomNoteGroup(name) {
  const clean = String(name || '').trim().slice(0, 32);
  if (!clean || ['All', 'Locked'].includes(clean)) return null;
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(znCustomGroupsKey()) || '[]'); } catch {}
  if (!stored.includes(clean) && !ZN_BUILTIN_GROUPS.includes(clean)) {
    stored.push(clean);
    localStorage.setItem(znCustomGroupsKey(), JSON.stringify(stored));
  }
  return clean;
}

function sanitizeNoteHtml(raw) {
  const doc = new DOMParser().parseFromString(String(raw || ''), 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,link[rel="import"],meta').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

function noteHtmlToPlainText(html, fallbackBody = '') {
  if (!html) return String(fallbackBody || '');
  const tmp = document.createElement('div');
  tmp.innerHTML = String(html);
  tmp.querySelectorAll('.zn-audio-remove,.zn-media-remove,.zn-table-controls,.zn-file-remove,.zn-obj-actions,.zn-tbl-col-handle,.zn-tbl-row-handle').forEach(el => el.remove());
  tmp.querySelectorAll('td, th').forEach((cell, idx, list) => {
    if (cell.nextElementSibling) cell.append(' · ');
    else cell.append('\n');
  });
  tmp.querySelectorAll('p, div, li, tr, h1, h2, h3, blockquote').forEach(el => el.append('\n'));
  return (tmp.innerText || tmp.textContent || fallbackBody || '').replace(/\n{3,}/g, '\n\n').trim();
}

function noteSummaryMeta(n) {
  const html = n.html || '';
  const hasVoice = /zn-audio-card/.test(html);
  const hasImg = /<img\b/i.test(html);
  const hasTable = /<table\b/i.test(html);
  const checksTotal = (html.match(/zn-check-cb/g) || []).length;
  const checksDone = (html.match(/zn-check-row[^"]*checked/g) || []).length;
  return { hasVoice, hasImg, hasTable, checksTotal, checksDone };
}

function compressImageToDataUrl(sourceImgOrCanvas, { maxDim = 1280, quality = 0.82, scanFilter = false, mime = 'image/jpeg' } = {}) {
  const srcW = sourceImgOrCanvas.naturalWidth || sourceImgOrCanvas.videoWidth || sourceImgOrCanvas.width || 800;
  const srcH = sourceImgOrCanvas.naturalHeight || sourceImgOrCanvas.videoHeight || sourceImgOrCanvas.height || 600;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (scanFilter) ctx.filter = 'grayscale(1) contrast(1.42) brightness(1.06)';
  ctx.drawImage(sourceImgOrCanvas, 0, 0, w, h);
  return cv.toDataURL(mime, quality);
}

function fileToImageDataUrl(file, opts = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(compressImageToDataUrl(img, opts));
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function fileToCompactDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

async function ensureNotesLockPin() {
  if (noteLockedUnlockedSession) return true;
  if (typeof window.ensureChatLockPinForAction === 'function') {
    const pin = await window.ensureChatLockPinForAction(
      'Locked Notes',
      S.user?.hasChatLockPin
        ? 'Enter your Zovio Security PIN to view or lock notes.'
        : 'Create a Zovio Security PIN to protect locked notes.',
      { requireFresh: false }
    );
    if (pin) {
      noteLockedUnlockedSession = true;
      return true;
    }
    return false;
  }
  noteLockedUnlockedSession = true;
  return true;
}

const ZN_SVG = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  skins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1.5"/><path d="m4.5 8 1 1 2-2"/><path d="M13 8h8"/><path d="M13 16h8"/><rect x="3" y="13" width="6" height="6" rx="1.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  doodle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

function renderNoteCardHTML(n) {
  const skin = ZN_SKINS.find(s => s.id === (n.skin || 'default')) || ZN_SKINS[0];
  const accent = n.color || skin.dot || '#7c5cff';
  const meta = noteSummaryMeta(n);
  const preview = n.locked && !noteLockedUnlockedSession
    ? 'Locked note — enter PIN to view'
    : (n.body || noteHtmlToPlainText(n.html) || '').slice(0, 180);
  const badges = [
    meta.checksTotal ? `<span class="zn-card-chip"><span class="zn-svg-xs">${ZN_SVG.checklist}</span> ${meta.checksDone}/${meta.checksTotal}</span>` : '',
    meta.hasVoice ? `<span class="zn-card-chip"><span class="zn-svg-xs">${ZN_SVG.mic}</span> Voice</span>` : '',
    meta.hasImg ? `<span class="zn-card-chip"><span class="zn-svg-xs">${ZN_SVG.image}</span> Media</span>` : '',
    meta.hasTable ? `<span class="zn-card-chip"><span class="zn-svg-xs">${ZN_SVG.table}</span> Sheet</span>` : ''
  ].filter(Boolean).join('');

  return `
    <article class="zn-card ${n.skin ? `zn-skin-card-${esc(n.skin)}` : ''}" data-nid="${esc(n.id)}" style="--zn-accent:${esc(accent)}">
      <div class="zn-card-stripe"></div>
      <div class="zn-card-head">
        <strong class="zn-card-title">${n.locked ? `<span class="zn-svg-xs">${ZN_SVG.lock}</span> ` : ''}${esc(n.title || 'Untitled')}</strong>
        <button type="button" class="zn-card-more" data-nmore="${esc(n.id)}" title="Note actions" aria-label="Note actions"><span class="zn-svg-sm">${ZN_SVG.more}</span></button>
      </div>
      <p class="zn-card-body">${esc(preview || 'Empty note')}</p>
      ${badges ? `<div class="zn-card-chips">${badges}</div>` : ''}
      <div class="zn-card-foot">
        <span class="zn-card-time">${fmtTime(n.updatedAt)}</span>
        ${n._syncing ? `<span class="zn-card-sync-pill"><span class="zn-spin-dot"></span> Saving…</span>` : (n.pinned ? `<span class="zn-pin-tag" title="Pinned"><span class="zn-svg-xs">${ZN_SVG.pin}</span></span>` : '')}
      </div>
    </article>`;
}

function renderNotesTab(box) {
  const allNotes = dedupeWorkspaceList(S.workspace).filter(x => x.type === 'note' && !x.deleted);
  box._notesList = allNotes;
  const isPhoneNotes = (typeof isZovioPhoneHost === 'function' && isZovioPhoneHost()) || window.innerWidth <= 760;

  const searchVal = $('#noteSearch', box)?.value || '';
  if (!box.querySelector('#notesContainer')) {
    box.innerHTML = `
      <div class="zn-shell">
        <div class="zn-topbar">
          <div class="zn-search-wrap" style="flex:1;max-width:${isPhoneNotes ? '100%' : '440px'}">
            <span class="zn-search-ico">${icon('search')}</span>
            <input id="noteSearch" class="zn-search-in" placeholder="Search notes…" autocomplete="off">
          </div>
          <div class="zn-topbar-right" style="flex:0 0 auto">
            <span class="zn-sync-loader ${_wsSyncInFlightCount > 0 ? '' : 'hidden'}" id="znSyncPill"><span class="zn-spin-dot"></span><span>Saving…</span></span>
            ${isPhoneNotes ? '' : `<div class="zn-layout-toggle" role="group" aria-label="Notes layout">
              <button type="button" class="zn-layout-btn ${noteViewLayout === 'grid' ? 'active' : ''}" data-znlayout="grid" title="Grid View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                <span>Grid</span>
              </button>
              <button type="button" class="zn-layout-btn ${noteViewLayout === 'list' ? 'active' : ''}" data-znlayout="list" title="List View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
                <span>List</span>
              </button>
            </div>`}
          </div>
        </div>

        <div id="znQuickFolders" class="zn-quick-chips"></div>
        <div id="notesContainer" class="zn-notes-scroll"></div>
      </div>`;

    hydrateIcons(box);
    $('#noteSearch', box).oninput = e => draw(e.target.value.trim().toLowerCase());

    $$('[data-znlayout]', box).forEach(btn => {
      btn.onclick = () => {
        noteViewLayout = btn.dataset.znlayout;
        localStorage.setItem('zovio_note_layout', noteViewLayout);
        $$('[data-znlayout]', box).forEach(x => x.classList.toggle('active', x === btn));
        draw($('#noteSearch', box)?.value.trim().toLowerCase() || '');
      };
    });
  }

  const draw = q => {
    const curNotes = dedupeWorkspaceList(box._notesList || S.workspace.filter(x => x.type === 'note' && !x.deleted));
    const lockedCount = curNotes.filter(n => n.locked).length;
    if (!['All', 'Locked'].includes(noteActiveGroup)) noteActiveGroup = 'All';

    const quickStrip = $('#znQuickFolders', box);
    if (quickStrip) {
      if (lockedCount > 0 || noteActiveGroup === 'Locked') {
        const allCnt = curNotes.filter(n => !n.locked).length;
        quickStrip.innerHTML = `
          <button type="button" class="zn-qchip ${noteActiveGroup === 'All' ? 'active' : ''}" data-qgrp="All">All<span>${allCnt}</span></button>
          <button type="button" class="zn-qchip ${noteActiveGroup === 'Locked' ? 'active' : ''}" data-qgrp="Locked"><span class="zn-svg-xs">${ZN_SVG.lock}</span> Locked<span>${lockedCount}</span></button>
          ${noteLockedUnlockedSession ? `<button type="button" class="zn-qchip" id="znRelockQuickBtn"><span class="zn-svg-xs">${ZN_SVG.lock}</span> Lock Vault</button>` : ''}`;
        quickStrip.classList.remove('hidden');
      } else {
        quickStrip.innerHTML = '';
        quickStrip.classList.add('hidden');
      }
    }

    const pool = noteActiveGroup === 'Locked'
      ? (noteLockedUnlockedSession ? curNotes.filter(n => n.locked) : [])
      : curNotes.filter(n => !n.locked);

    const filtered = pool
      .filter(n => {
        if (!q) return true;
        const hay = `${n.title || ''}\n${n.body || noteHtmlToPlainText(n.html)}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    const container = $('#notesContainer', box);
    if (!container) return;

    let nextHtml = '';
    if (noteActiveGroup === 'Locked' && !noteLockedUnlockedSession) {
      nextHtml = `
        <div class="no-content-box zn-locked-gate">
          <div class="nc-ico">${icon('lock')}</div>
          <h4>Locked Notes Vault</h4>
          <p>${lockedCount} protected note${lockedCount === 1 ? '' : 's'}. Enter your Zovio Security PIN to access them.</p>
          <button type="button" class="btn primary sm" id="unlockNotesVaultBtn">Unlock Notes Vault</button>
        </div>`;
    } else if (!filtered.length) {
      nextHtml = `
        <div class="no-content-box">
          <div class="nc-ico">${icon('note')}</div>
          <h4>${q ? 'No Matching Notes' : 'No Notes Yet'}</h4>
          <p>${q ? 'Try a different keyword.' : 'Capture thoughts, doodles, voice memos, spreadsheets & scans.'}</p>
          <button type="button" class="btn primary sm" id="emptyCreateNoteBtn">Create Note</button>
        </div>`;
    } else {
      const pinned = filtered.filter(n => n.pinned);
      const others = filtered.filter(n => !n.pinned);
      const effectiveLayout = isPhoneNotes ? 'list' : noteViewLayout;
      const layoutCls = effectiveLayout === 'list' ? 'is-list' : '';
      nextHtml = `
        ${pinned.length ? `
          <div class="zn-sec-label"><span class="zn-svg-xs">${ZN_SVG.pin}</span> Pinned (${pinned.length})</div>
          <div class="zn-cards ${layoutCls}">${pinned.map(renderNoteCardHTML).join('')}</div>
        ` : ''}
        ${others.length ? `
          ${pinned.length ? `<div class="zn-sec-label">Notes (${others.length})</div>` : ''}
          <div class="zn-cards ${layoutCls}">${others.map(renderNoteCardHTML).join('')}</div>
        ` : ''}`;
    }

    if (container._lastNotesHtml !== nextHtml) {
      container._lastNotesHtml = nextHtml;
      container.innerHTML = nextHtml;
      hydrateIcons(container);
    }

    if (!box._notesShellDelegated) {
      box._notesShellDelegated = true;
      box.addEventListener('click', async e => {
        if (wsTab !== 'notes') return;

        const qchip = e.target.closest('[data-qgrp]');
        if (qchip) {
          const target = qchip.dataset.qgrp;
          if (target === 'Locked' && !noteLockedUnlockedSession) {
            const ok = await ensureNotesLockPin();
            if (!ok) return;
          }
          noteActiveGroup = target;
          draw($('#noteSearch', box)?.value.trim().toLowerCase() || '');
          return;
        }

        if (e.target.closest('#znRelockQuickBtn')) {
          noteLockedUnlockedSession = false;
          if (noteActiveGroup === 'Locked') noteActiveGroup = 'All';
          draw($('#noteSearch', box)?.value.trim().toLowerCase() || '');
          return;
        }
        if (e.target.closest('#unlockNotesVaultBtn')) {
          if (await ensureNotesLockPin()) draw($('#noteSearch', box)?.value.trim().toLowerCase() || '');
          return;
        }
        if (e.target.closest('#emptyCreateNoteBtn')) {
          openNoteModal(null, { defaultGroup: 'Default' });
          return;
        }

        const moreBtn = e.target.closest('[data-nmore]');
        if (moreBtn) {
          e.stopPropagation();
          const item = S.workspace.find(x => x.id === moreBtn.dataset.nmore);
          if (item) openSingleNoteQuickMenu(item, box);
          return;
        }

        const card = e.target.closest('[data-nid]');
        if (card) {
          if (box._openingNoteLock) return;
          box._openingNoteLock = true;
          setTimeout(() => { box._openingNoteLock = false; }, 350);
          const item = S.workspace.find(x => x.id === card.dataset.nid);
          if (!item) return;
          if (item.locked && !(await ensureNotesLockPin())) return;
          openNoteModal(item);
        }
      });
    }
  };

  draw(searchVal.trim().toLowerCase());
}

function openSingleNoteQuickMenu(note, box) {
  showModal(esc(note.title || 'Note Options'), `
    <div class="col gap-s">
      <button type="button" class="zn-act-row" id="qnPinBtn"><span class="zn-act-ico">${ZN_SVG.pin}</span><span>${note.pinned ? 'Unpin Note' : 'Pin to Top'}</span></button>
      <button type="button" class="zn-act-row" id="qnLockBtn"><span class="zn-act-ico">${note.locked ? ZN_SVG.unlock : ZN_SVG.lock}</span><span>${note.locked ? 'Remove Note Lock' : 'Lock Note'}</span></button>
      <button type="button" class="zn-act-row" id="qnShareBtn"><span class="zn-act-ico">${ZN_SVG.share}</span><span>Share to Zovio Chat</span></button>
      <button type="button" class="zn-act-row danger" id="qnDeleteBtn"><span class="zn-act-ico">${ZN_SVG.trash}</span><span>Delete Note</span></button>
    </div>
  `, mbox => {
    $('#qnPinBtn', mbox).onclick = async () => {
      closeModal();
      await saveWsItem('note', { ...note, pinned: !note.pinned }, note.id);
    };
    $('#qnLockBtn', mbox).onclick = async () => {
      if (!(await ensureNotesLockPin())) return;
      closeModal();
      await saveWsItem('note', { ...note, locked: !note.locked }, note.id).catch(() => {});
    };
    $('#qnShareBtn', mbox).onclick = () => {
      closeModal();
      shareNoteToZovioChat(note);
    };
    $('#qnDeleteBtn', mbox).onclick = async () => {
      closeModal();
      await deleteWsItem(note.id).catch(() => {});
    };
  });
}

async function buildSharedNotePayload(note) {
  const title = String(note?.title || '').trim() || 'Untitled Note';
  const color = /^#[0-9a-f]{3,8}$/i.test(String(note?.color || '')) ? note.color : '#7c5cff';
  const tmp = document.createElement('div');
  tmp.innerHTML = sanitizeNoteHtml(note?.html || '');

  const checklist = [];
  tmp.querySelectorAll('.zn-check-row').forEach(row => {
    const txt = (row.querySelector('.zn-check-txt')?.innerText || row.textContent || '').trim();
    if (txt) checklist.push({ text: txt, done: row.classList.contains('checked') });
    row.remove();
  });

  const tables = [];
  tmp.querySelectorAll('.zn-table-wrap').forEach(wrap => {
    const tbl = wrap.querySelector('table');
    if (tbl) {
      const rows = Array.from(tbl.querySelectorAll('tr')).map(tr =>
        Array.from(tr.querySelectorAll('th,td')).map(c => (c.innerText || c.textContent || '').trim())
      ).filter(r => r.some(Boolean) || r.length > 0);
      if (rows.length) tables.push(rows);
    }
    wrap.remove();
  });
  tmp.querySelectorAll('table.zn-table, table').forEach(tbl => {
    const rows = Array.from(tbl.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(c => (c.innerText || c.textContent || '').trim())
    ).filter(r => r.length > 0);
    if (rows.length) tables.push(rows);
    tbl.remove();
  });

  const shrinkImage = (src) => new Promise(resolve => {
    if (!src || typeof src !== 'string') return resolve('');
    if (!src.startsWith('data:image/') || src.length <= 260000) return resolve(src);
    const img = new Image();
    img.onload = () => {
      try { resolve(compressImageToDataUrl(img, { maxDim: 960, quality: 0.78 })); }
      catch { resolve(src.slice(0, 260000)); }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

  const images = [];
  const imgNodes = Array.from(tmp.querySelectorAll('.zn-media-card img, img'));
  for (const imgEl of imgNodes) {
    const src = imgEl.getAttribute('src') || '';
    const cap = (imgEl.closest('.zn-media-card')?.querySelector('.zn-media-cap')?.textContent || imgEl.getAttribute('alt') || 'Image').trim();
    const compactUrl = await shrinkImage(src);
    if (compactUrl) images.push({ name: cap || 'Image', dataUrl: compactUrl });
    const card = imgEl.closest('.zn-media-card');
    if (card) card.remove(); else imgEl.remove();
  }

  const files = [];
  tmp.querySelectorAll('.zn-file-card').forEach(fc => {
    const link = fc.querySelector('a.zn-file-link');
    const name = (link?.textContent || fc.querySelector('.zn-file-meta strong')?.textContent || 'Attachment').trim();
    const sizeText = (fc.querySelector('.zn-file-size')?.textContent || '').trim();
    const href = link?.getAttribute('href') || '';
    files.push({
      name,
      sizeText,
      href: href && href.length <= 2400000 ? href : ''
    });
    fc.remove();
  });

  const audios = [];
  tmp.querySelectorAll('.zn-audio-card').forEach(ac => {
    const au = ac.querySelector('audio');
    const src = au?.getAttribute('src') || '';
    const auTitle = (ac.querySelector('.zn-audio-head strong')?.textContent || 'Voice Note').replace(/^🎙️?\s*/u, '').trim() || 'Voice Note';
    const playerEl = ac.querySelector('.fire-audio-player[data-duration]');
    const rawDur = Number(ac.getAttribute('data-dur') || playerEl?.getAttribute('data-duration') || 0);
    if (src && src.length <= 1200000) audios.push({ title: auTitle, src, duration: Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 0 });
    ac.remove();
  });

  tmp.querySelectorAll('.zn-audio-remove,.zn-media-remove,.zn-table-controls,.zn-file-remove,button').forEach(el => el.remove());
  tmp.querySelectorAll('p, div, li, h1, h2, h3, blockquote').forEach(el => el.append('\n'));
  const body = (tmp.innerText || tmp.textContent || note?.body || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const textParts = [title];
  if (body && body !== title) textParts.push(body);
  if (checklist.length) textParts.push(checklist.map(c => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('\n'));
  if (files.length) textParts.push(files.map(f => `📎 ${f.name}${f.sizeText ? ` (${f.sizeText})` : ''}`).join('\n'));

  return {
    title,
    body: body === title ? '' : body,
    color,
    checklist,
    tables,
    images,
    files,
    audios,
    text: textParts.filter(Boolean).join('\n\n')
  };
}

window.saveSharedNoteFromChat = async function saveSharedNoteFromChat(p) {
  if (!p) return;
  const title = String(p.title || '').trim() || 'Shared Note';
  const parts = [];
  if (p.body) {
    String(p.body).split('\n').forEach(line => {
      parts.push(line.trim() ? `<p>${esc(line)}</p>` : '<p><br></p>');
    });
  }
  if (Array.isArray(p.checklist) && p.checklist.length) {
    p.checklist.forEach(it => {
      parts.push(`<div class="zn-check-row ${it.done ? 'checked' : ''}"><span class="zn-check-cb" contenteditable="false">${it.done ? '✓' : ''}</span><span class="zn-check-txt">${esc(it.text || '')}</span></div>`);
    });
  }
  if (Array.isArray(p.tables)) {
    p.tables.forEach(rows => {
      if (!Array.isArray(rows) || !rows.length) return;
      parts.push(`<div class="zn-table-wrap" contenteditable="false"><div class="zn-table-scroll"><table class="zn-table">${rows.map((r, ri) => `<tr>${(r || []).map(c => `<${ri === 0 ? 'th' : 'td'} contenteditable="true">${esc(c || '')}</${ri === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table></div></div>`);
    });
  }
  if (Array.isArray(p.images)) {
    p.images.forEach(im => {
      if (!im?.dataUrl) return;
      parts.push(`<div class="zn-media-card" contenteditable="false"><img src="${esc(im.dataUrl)}" alt="${esc(im.name || 'Image')}"><div class="zn-media-cap">${esc(im.name || 'Image')}</div></div>`);
    });
  }
  if (Array.isArray(p.files)) {
    p.files.forEach(f => {
      parts.push(`<div class="zn-file-card" contenteditable="false"><div class="zn-file-meta">${f.href ? `<a class="zn-file-link" href="${esc(f.href)}" download="${esc(f.name || 'file')}">${esc(f.name || 'File')}</a>` : `<strong>${esc(f.name || 'File')}</strong>`}<span class="zn-file-size">${esc(f.sizeText || '')}</span></div></div>`);
    });
  }
  if (Array.isArray(p.audios)) {
    p.audios.forEach(a => {
      if (!a?.src) return;
      const auTitle = String(a.title || 'Voice Note').replace(/^🎙️?\s*/u, '').trim() || 'Voice Note';
      const dur = Number(a.duration || 0);
      const playerHtml = typeof window.renderCustomAudioPlayer === 'function'
        ? window.renderCustomAudioPlayer(a.src, { isVoice: true, title: auTitle, duration: dur })
        : `<audio controls src="${esc(a.src)}" preload="metadata"></audio>`;
      parts.push(`<div class="zn-audio-card" contenteditable="false" data-dur="${dur}"><div class="zn-audio-head"><strong>${ZN_SVG.mic} <span>${esc(auTitle)}</span></strong><button type="button" class="zn-audio-remove" title="Remove">✕</button></div>${playerHtml}</div>`);
    });
  }
  const html = parts.join('') || '<p></p>';
  await saveWsItem('note', {
    title,
    body: p.body || noteHtmlToPlainText(html),
    html,
    color: p.color || '#7c5cff',
    skin: 'default',
    group: 'Default',
    pinned: false,
    locked: false,
    deleted: false
  });
};

async function shareNoteToZovioChat(note) {
  const plain = noteHtmlToPlainText(note.html, note.body).trim();
  const noteTitle = String(note.title || '').trim() || 'Untitled Note';
  const formattedText = plain && plain !== noteTitle ? `${noteTitle}\n\n${plain}` : (plain || noteTitle);
  const chats = Array.from(S.chats.values())
    .filter(c => c && !c.hidden && !c.isDeleted && c.type !== 'channel')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const snippet = (plain || 'Rich note').slice(0, 120);
  showModal('Share Note', `
    <div class="col gap-s">
      <div class="zn-share-preview">
        <strong>${esc(noteTitle)}</strong>
        <span class="muted xs">${esc(snippet)}${plain.length > 120 ? '…' : ''}</span>
      </div>
      ${chats.length ? `
        <div class="zn-share-search">
          <span class="zn-share-sico">${ZN_SVG.search}</span>
          <input id="znShareSearchIn" placeholder="Search conversations…" autocomplete="off">
        </div>
        <div id="znShareChatList" class="col gap-xs zn-share-list"></div>
      ` : '<div class="muted xs" style="padding:14px;text-align:center">No active conversations yet.</div>'}
      <button type="button" class="zn-act-row zn-copy-note-btn" id="copyNoteShareBtn">
        <span class="zn-act-ico">${ZN_SVG.copy}</span>
        <span>Copy Note Text</span>
      </button>
    </div>
  `, mbox => {
    const listEl = $('#znShareChatList', mbox);
    const searchIn = $('#znShareSearchIn', mbox);
    const renderChats = () => {
      if (!listEl) return;
      const q = (searchIn?.value || '').trim().toLowerCase();
      const filtered = chats.filter(c => {
        const d = typeof chatDisplay === 'function' ? chatDisplay(c) : { title: c.name || 'Chat' };
        return !q || `${d.title || ''} ${d.peer?.username || ''}`.toLowerCase().includes(q);
      });
      if (!filtered.length) {
        listEl.innerHTML = '<div class="muted xs" style="padding:18px;text-align:center">No matching conversations.</div>';
        return;
      }
      listEl.innerHTML = filtered.slice(0, 40).map(c => {
        const d = typeof chatDisplay === 'function' ? chatDisplay(c) : { title: c.name || 'Chat' };
        const sub = c.type === 'self'
          ? 'Saved Messages'
          : (d.peer?.username ? `@${d.peer.username}` : (c.type === 'group' ? `${(c.members || []).length} members` : 'Direct message'));
        return `
          <button type="button" class="zn-share-row" data-sharechat="${esc(c.id)}">
            ${typeof avatarHTML === 'function' ? avatarHTML(d.ava || { name: d.title }) : ''}
            <span class="zn-share-meta">
              <strong>${esc(d.title || 'Chat')}</strong>
              <small>${esc(sub)}</small>
            </span>
            <span class="zn-share-send-ico" aria-hidden="true">${ZN_SVG.send}</span>
          </button>`;
      }).join('');
      $$('[data-sharechat]', listEl).forEach(b => {
        b.onclick = async () => {
          const chatId = b.dataset.sharechat;
          b.disabled = true;
          const edEl = $('#znEditorOverlay');
          const quickPreview = {
            title: noteTitle,
            body: plain.slice(0, 260),
            color: note?.color || '#7c5cff',
            checklist: [],
            tables: [],
            images: [],
            files: [],
            audios: []
          };
          closeModal();
          if (edEl) {
            if (typeof edEl._commitAndClose === 'function') edEl._commitAndClose();
            else edEl.remove();
          }
          if (typeof window.sendSharedNoteWithProgress === 'function') {
            window.sendSharedNoteWithProgress(chatId, quickPreview, () => buildSharedNotePayload(note)).catch(() => {});
          } else {
            try {
              const notePayload = await buildSharedNotePayload(note);
              if (typeof switchView === 'function') switchView('chats');
              if (typeof openChat === 'function') await openChat(chatId);
              if (S.activeChatId === chatId && typeof sendChatPayload === 'function') {
                await sendChatPayload('note', notePayload);
              }
            } catch {}
          }
        };
      });
    };
    renderChats();
    if (searchIn) searchIn.oninput = renderChats;
    $('#copyNoteShareBtn', mbox).onclick = async () => {
      try { await navigator.clipboard.writeText(formattedText); } catch {}
      closeModal();
    };
  });
}

function openDoodlePadModal(onDone) {
  showModal('Doodle Pad', `
    <div class="zn-doodle-wrap">
      <div class="row between wrap gap-xs" style="margin-bottom:8px">
        <div class="row gap-xs" id="zdColors">
          ${['#ffffff', '#7c5cff', '#2ed3b7', '#ff5c8a', '#f59e0b', '#38bdf8', '#111827'].map((col, idx) =>
            `<button type="button" class="color-dot ${idx === 0 ? 'active' : ''}" data-dc="${col}" style="background:${col}"></button>`).join('')}
        </div>
        <div class="row gap-xs">
          <button type="button" class="btn xs ghost" id="zdEraserBtn">Eraser</button>
          <button type="button" class="btn xs ghost" id="zdUndoBtn">Undo</button>
          <button type="button" class="btn xs ghost" id="zdClearBtn">Clear</button>
        </div>
      </div>
      <canvas id="zdCanvas" width="680" height="400" class="zn-doodle-canvas"></canvas>
      <div class="row between align-center" style="margin-top:8px">
        <label class="row gap-xs align-center xs muted">Size <input type="range" id="zdSize" min="2" max="18" value="4"></label>
        <button type="button" class="btn primary sm" id="zdInsertBtn">Insert Doodle</button>
      </div>
    </div>
  `, mbox => {
    const cv = $('#zdCanvas', mbox);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#111424';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const history = [cv.toDataURL()];
    let color = '#ffffff';
    let erasing = false;
    let drawing = false;

    const getPos = e => {
      const r = cv.getBoundingClientRect();
      const pt = e.touches?.[0] || e;
      return { x: (pt.clientX - r.left) * (cv.width / r.width), y: (pt.clientY - r.top) * (cv.height / r.height) };
    };
    const startDraw = e => {
      drawing = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = erasing ? '#111424' : color;
      ctx.lineWidth = Number($('#zdSize', mbox).value) || 4;
    };
    const moveDraw = e => {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const endDraw = () => {
      if (!drawing) return;
      drawing = false;
      history.push(cv.toDataURL());
      if (history.length > 25) history.shift();
    };
    cv.addEventListener('pointerdown', startDraw);
    cv.addEventListener('pointermove', moveDraw);
    window.addEventListener('pointerup', endDraw);

    $$('#zdColors [data-dc]', mbox).forEach(b => b.onclick = () => {
      erasing = false;
      $('#zdEraserBtn', mbox).classList.remove('primary');
      color = b.dataset.dc;
      $$('#zdColors [data-dc]', mbox).forEach(x => x.classList.toggle('active', x === b));
    });
    $('#zdEraserBtn', mbox).onclick = () => {
      erasing = !erasing;
      $('#zdEraserBtn', mbox).classList.toggle('primary', erasing);
    };
    $('#zdClearBtn', mbox).onclick = () => {
      ctx.fillStyle = '#111424';
      ctx.fillRect(0, 0, cv.width, cv.height);
      history.push(cv.toDataURL());
    };
    $('#zdUndoBtn', mbox).onclick = () => {
      if (history.length <= 1) return;
      history.pop();
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = history[history.length - 1];
    };
    $('#zdInsertBtn', mbox).onclick = () => {
      window.removeEventListener('pointerup', endDraw);
      const dataUrl = compressImageToDataUrl(cv, { maxDim: 1100, quality: 0.85, mime: 'image/jpeg' });
      closeModal();
      onDone?.(dataUrl);
    };
  });
}

function openQuickCameraForNote(scanMode, onCaptured) {
  let stream = null;
  showModal(scanMode ? 'Scan Document' : 'Take Photo', `
    <div class="col gap-s">
      <div style="position:relative;border-radius:14px;overflow:hidden;background:#0a0c16;aspect-ratio:4/3">
        <video id="znCamFeed" autoplay muted playsinline poster="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" style="width:100%;height:100%;object-fit:cover"></video>
      </div>
      <div class="row between gap-s">
        <button type="button" class="btn ghost sm" id="znCamUploadAlt">Pick from Files</button>
        <button type="button" class="btn primary sm" id="znCamSnapBtn">${scanMode ? 'Capture & Enhance Scan' : 'Capture Photo'}</button>
      </div>
    </div>
  `, async mbox => {
    const vid = $('#znCamFeed', mbox);
    const stopCam = () => { try { stream?.getTracks().forEach(t => t.stop()); } catch {} };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      vid.srcObject = stream;
      vid.play().catch(() => {});
    } catch {
      toast('Camera unavailable — use Pick from Files', 'warn');
    }
    mbox.closest('.modal-back')?.addEventListener('click', e => {
      if (e.target.classList.contains('modal-back')) stopCam();
    });
    $('#znCamUploadAlt', mbox).onclick = () => {
      stopCam();
      closeModal();
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = async () => {
        if (inp.files?.[0]) {
          const url = await fileToImageDataUrl(inp.files[0], { maxDim: 1280, quality: 0.82, scanFilter: scanMode });
          onCaptured?.(url);
        }
      };
      inp.click();
    };
    $('#znCamSnapBtn', mbox).onclick = () => {
      if (!vid.videoWidth) return toast('Camera still starting…', 'warn');
      const dataUrl = compressImageToDataUrl(vid, { maxDim: 1280, quality: 0.84, scanFilter: scanMode });
      stopCam();
      closeModal();
      onCaptured?.(dataUrl);
    };
  });
}

function openNoteModal(note, opts = {}) {
  const existing = $('#znEditorOverlay');
  if (existing) existing.remove();

  const noteId = note?.id || null;
  let noteGroup = note?.group || opts.defaultGroup || 'Default';
  let notePinned = Boolean(note?.pinned);
  let noteLocked = Boolean(note?.locked);
  let noteSkin = note?.skin || 'default';
  let noteColor = note?.color || '#7c5cff';

  const rawInitialHtml = note?.html
    ? sanitizeNoteHtml(note.html)
    : (note?.body ? esc(note.body).replace(/\n/g, '<br>') : '');
  const initialHtml = window.ZovioAI?.formatNoteMathHtml
    ? window.ZovioAI.formatNoteMathHtml(rawInitialHtml)
    : rawInitialHtml;

  const undoStack = [initialHtml];
  let undoIdx = 0;
  let activeDrawer = null;
  let isSaving = false;

  const overlay = document.createElement('div');
  overlay.id = 'znEditorOverlay';
  overlay.className = `zn-editor-overlay zn-skin-${noteSkin}`;
  overlay.innerHTML = `
    <div class="zn-ed-top">
      <button type="button" class="icon-btn zn-ed-ico-btn" id="znBackBtn" title="Back to Notes">${icon('back')}</button>
      <div class="zn-ed-top-right">
        <button type="button" class="icon-btn zn-ed-ico-btn zn-hist-btn" id="znUndoBtn" title="Undo" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg></button>
        <button type="button" class="icon-btn zn-ed-ico-btn zn-hist-btn" id="znRedoBtn" title="Redo" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg></button>
        <button type="button" class="icon-btn zn-ed-ico-btn zai-zn-btn" id="znAiBtn" title="Zovio AI Assistant">${icon('sparkle')}</button>
        <button type="button" class="icon-btn zn-ed-ico-btn" id="znShareBtn" title="Share Note">${ZN_SVG.share}</button>
        <button type="button" class="icon-btn zn-ed-ico-btn" id="znEdMoreBtn" title="More actions">${ZN_SVG.more}</button>
        <button type="button" class="btn primary sm zn-done-btn" id="znDoneBtn">${ZN_SVG.check} <span>Done</span></button>
      </div>
    </div>

    <div id="znFindBar" class="zn-find-bar hidden">
      <input id="znFindIn" placeholder="Find in note…" autocomplete="off">
      <span id="znFindCnt" class="xs muted"></span>
      <button type="button" class="icon-btn xs zn-find-nav" id="znFindPrev" title="Previous match" aria-label="Previous match">↑</button>
      <button type="button" class="icon-btn xs zn-find-nav" id="znFindNext" title="Next match" aria-label="Next match">↓</button>
      <button type="button" class="icon-btn xs" id="znFindClose" title="Close">${icon('close')}</button>
    </div>

    <div class="zn-ed-scroll">
      <div class="zn-ed-header">
        <input id="znTitleIn" class="zn-ed-title" placeholder="Title" value="${esc(note?.title || '')}" maxlength="160">
        <div class="zn-ed-meta">
          <span id="znMetaTime">${fmtTime(note?.updatedAt || Date.now())}</span>
          <span>·</span>
          <span id="znCharCnt">0 characters</span>
          <span id="znPinnedTag" class="zn-tag-mini ${notePinned ? '' : 'hidden'}">${ZN_SVG.pin} Pinned</span>
          <span id="znLockedTag" class="zn-tag-mini ${noteLocked ? '' : 'hidden'}">${ZN_SVG.lock} Locked</span>
        </div>
      </div>

      <div id="znRichEditor" class="zn-rich-editor" contenteditable="true" data-placeholder="Start writing… Type &quot;/&quot; for blocks"></div>
    </div>

    <div id="znSlashMenu" class="zn-slash-menu hidden">
      <button type="button" data-cmd="h1"><b>T</b> Title</button>
      <button type="button" data-cmd="h2"><b>H</b> Heading</button>
      <button type="button" data-cmd="check"><span class="zn-svg-sm">${ZN_SVG.checklist}</span> Checklist</button>
      <button type="button" data-cmd="ul"><b>•</b> Bulleted list</button>
      <button type="button" data-cmd="ol"><b>1.</b> Numbered list</button>
      <button type="button" data-cmd="table"><span class="zn-svg-sm">${ZN_SVG.table}</span> Spreadsheet Table</button>
      <button type="button" data-cmd="doodle"><span class="zn-svg-sm">${ZN_SVG.doodle}</span> Doodle</button>
      <button type="button" data-cmd="scan"><span class="zn-svg-sm">${ZN_SVG.scan}</span> Scan Document</button>
      <button type="button" data-cmd="hr"><b>―</b> Divider</button>
    </div>

    <div id="znDrawerArea" class="zn-drawer-area hidden"></div>

    <div id="znVoiceRecBar" class="zn-voice-rec-bar hidden">
      <div class="zn-voice-wave"><span class="zn-rec-dot"></span> <span id="znRecClock">00:00 / 05:00</span></div>
      <div id="znLiveTranscript" class="zn-live-transcript">Listening…</div>
      <div class="row gap-xs">
        <button type="button" class="btn xs ghost" id="znVoiceDiscard">Discard</button>
        <button type="button" class="btn xs ghost" id="znVoicePause">Pause</button>
        <button type="button" class="btn xs primary" id="znVoiceKeep">✓ Keep</button>
      </div>
    </div>

    <div id="znBottomBar" class="zn-bottom-bar">
      <button type="button" class="zn-tb-btn" data-zntb="skins" title="Skins">${ZN_SVG.skins}<span>Skins</span></button>
      <button type="button" class="zn-tb-btn" data-zntb="check" title="Checklist">${ZN_SVG.checklist}<span>Checklist</span></button>
      <button type="button" class="zn-tb-btn" data-zntb="format" title="Format Aa"><strong class="zn-aa-glyph">Aa</strong><span>Format</span></button>
      <button type="button" class="zn-tb-btn" data-zntb="audio" title="Voice & Transcript">${ZN_SVG.mic}<span>Audio</span></button>
      <button type="button" class="zn-tb-btn zn-tb-add" data-zntb="add" title="Insert Media">${ZN_SVG.plus}<span>Add</span></button>
    </div>
  `;

  document.body.appendChild(overlay);
  hydrateIcons(overlay);

  const editor = $('#znRichEditor', overlay);
  const titleIn = $('#znTitleIn', overlay);
  editor.innerHTML = initialHtml;

  // Track whether the user has explicitly selected a line inside the note body
  let userSelectedRange = null;
  const saveEditorSelection = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (editor.contains(r.commonAncestorContainer)) {
      userSelectedRange = r.cloneRange();
    }
  };
  ['mouseup', 'keyup', 'touchend', 'input'].forEach(ev => {
    editor.addEventListener(ev, saveEditorSelection, { passive: true });
  });
  titleIn.addEventListener('focus', () => {
    userSelectedRange = null;
  });

  const OBJ_SELECTOR = '.zn-table-wrap,.zn-media-card,.zn-audio-card,.zn-file-card';

  // Floating context popover for tables (row/column handles) & objects (tap menu)
  const popMenu = document.createElement('div');
  popMenu.className = 'zn-floating-pop hidden';
  popMenu.setAttribute('contenteditable', 'false');
  overlay.appendChild(popMenu);

  let internalObjClipboard = '';

  const closeFloatingPop = () => {
    popMenu.classList.add('hidden');
    popMenu.innerHTML = '';
    editor.querySelectorAll('.zn-col-selected,.zn-row-selected,.zn-obj-selected').forEach(el => {
      el.classList.remove('zn-col-selected', 'zn-row-selected', 'zn-obj-selected');
    });
  };

  const hideAllTableHandles = exceptWrap => {
    editor.querySelectorAll('.zn-table-wrap').forEach(tw => {
      if (tw === exceptWrap) return;
      tw.classList.remove('is-active-table');
      tw.querySelector('.zn-tbl-col-handle')?.classList.add('hidden');
      tw.querySelector('.zn-tbl-row-handle')?.classList.add('hidden');
      tw.querySelectorAll('.zn-cell-active,.zn-col-selected,.zn-row-selected').forEach(c => {
        c.classList.remove('zn-cell-active', 'zn-col-selected', 'zn-row-selected');
      });
    });
  };

  const positionTableHandles = (tw, cell) => {
    if (!tw || !cell) return;
    const tbl = tw.querySelector('table');
    if (!tbl) return;
    hideAllTableHandles(tw);
    tw.classList.add('is-active-table');
    const colH = tw.querySelector('.zn-tbl-col-handle');
    const rowH = tw.querySelector('.zn-tbl-row-handle');
    if (!colH || !rowH) return;

    const twRect = tw.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const colCenterX = Math.max(24, Math.min(twRect.width - 24, (cellRect.left - twRect.left) + (cellRect.width / 2)));
    const rowCenterY = Math.max(18, Math.min(twRect.height - 18, (cellRect.top - twRect.top) + (cellRect.height / 2)));

    colH.style.left = `${colCenterX}px`;
    rowH.style.top = `${rowCenterY}px`;
    colH.classList.remove('hidden');
    rowH.classList.remove('hidden');
  };

  const positionFloatingPopNear = (anchorEl, preferSide = 'bottom') => {
    popMenu.classList.remove('hidden');
    const r = anchorEl.getBoundingClientRect();
    const popRect = popMenu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left + (r.width / 2) - (popRect.width / 2);
    let top = preferSide === 'right' ? r.top : (r.bottom + 8);
    if (preferSide === 'right') {
      left = r.right + 8;
      if (left + popRect.width > vw - 12) left = Math.max(12, r.left - popRect.width - 8);
    }
    if (left < 12) left = 12;
    if (left + popRect.width > vw - 12) left = Math.max(12, vw - popRect.width - 12);
    if (top + popRect.height > vh - 16) top = Math.max(16, r.top - popRect.height - 8);
    if (top < 16) top = 16;
    popMenu.style.left = `${Math.round(left)}px`;
    popMenu.style.top = `${Math.round(top)}px`;
  };

  const POP_ICONS = {
    insertCol: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16.5" y1="9" x2="16.5" y2="15"/><line x1="13.5" y1="12" x2="19.5" y2="12"/></svg>`,
    insertRow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="13.5" x2="12" y2="19.5"/><line x1="9" y1="16.5" x2="15" y2="16.5"/></svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    moveLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="6" height="16" rx="1"/><path d="M10 12H4"/><polyline points="7 9 4 12 7 15"/></svg>`,
    moveRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="16" rx="1"/><path d="M14 12h6"/><polyline points="17 9 20 12 17 15"/></svg>`,
    moveUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="14" width="16" height="6" rx="1"/><path d="M12 10V4"/><polyline points="9 7 12 4 15 7"/></svg>`,
    moveDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="6" rx="1"/><path d="M12 14v6"/><polyline points="9 17 12 20 15 17"/></svg>`,
    cut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`
  };

  const copyCardHtml = async card => {
    const clone = card.cloneNode(true);
    clone.classList.remove('is-active-table', 'zn-obj-selected', 'zn-dragging-source');
    clone.querySelectorAll('.zn-tbl-col-handle,.zn-tbl-row-handle').forEach(h => h.classList.add('hidden'));
    clone.querySelectorAll('.zn-cell-active,.zn-col-selected,.zn-row-selected').forEach(c => {
      c.classList.remove('zn-cell-active', 'zn-col-selected', 'zn-row-selected');
    });
    internalObjClipboard = clone.outerHTML;
    overlay.querySelector('.zn-paste-chip')?.classList.remove('hidden');
    try {
      await navigator.clipboard?.writeText(card.innerText || '');
    } catch {}
  };

  const openTableColMenu = (tw, colH) => {
    const tbl = tw.querySelector('table');
    if (!tbl || !tbl.rows.length) return;
    const colCount = tbl.rows[0].cells.length;
    const colIdx = Math.max(0, Math.min(colCount - 1, Number(tbl._activeColIdx ?? 0)));
    tbl.querySelectorAll('.zn-col-selected,.zn-row-selected').forEach(c => c.classList.remove('zn-col-selected', 'zn-row-selected'));
    Array.from(tbl.rows).forEach(tr => {
      if (tr.cells[colIdx]) tr.cells[colIdx].classList.add('zn-col-selected');
    });

    const canMoveLeft = colIdx > 0;
    const canMoveRight = colIdx < colCount - 1;
    popMenu.innerHTML = `
      <button type="button" class="zn-pop-item" data-pop="ins-col">${POP_ICONS.insertCol}<span>Insert column</span></button>
      <button type="button" class="zn-pop-item" data-pop="del-col">${POP_ICONS.delete}<span>Delete column</span></button>
      ${canMoveLeft ? `<button type="button" class="zn-pop-item" data-pop="col-left">${POP_ICONS.moveLeft}<span>Move left</span></button>` : ''}
      ${canMoveRight ? `<button type="button" class="zn-pop-item" data-pop="col-right">${POP_ICONS.moveRight}<span>Move right</span></button>` : ''}
      <div class="zn-pop-sep"></div>
      <button type="button" class="zn-pop-item" data-pop="cut">${POP_ICONS.cut}<span>Cut</span></button>
      <button type="button" class="zn-pop-item" data-pop="copy">${POP_ICONS.copy}<span>Copy</span></button>
      <button type="button" class="zn-pop-item danger" data-pop="del-tbl">${POP_ICONS.delete}<span>Delete table</span></button>
    `;
    positionFloatingPopNear(colH, 'bottom');

    popMenu.querySelectorAll('[data-pop]').forEach(btn => {
      btn.onclick = async ev => {
        ev.stopPropagation();
        const act = btn.dataset.pop;
        closeFloatingPop();
        if (act === 'ins-col') {
          Array.from(tbl.rows).forEach(tr => {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.innerHTML = '<br>';
            const ref = tr.cells[colIdx];
            if (ref && ref.nextSibling) ref.after(td);
            else tr.appendChild(td);
          });
          tbl._activeColIdx = colIdx + 1;
          const newCell = tbl.rows[tbl._activeRowIdx || 0]?.cells[tbl._activeColIdx];
          if (newCell) {
            newCell.focus();
            positionTableHandles(tw, newCell);
          }
          pushSnapshot();
          updateCharMeta();
        } else if (act === 'del-col') {
          if (colCount <= 1) {
            tw.remove();
            pushSnapshot();
            updateCharMeta();
            return;
          }
          Array.from(tbl.rows).forEach(tr => {
            if (tr.cells[colIdx]) tr.deleteCell(colIdx);
          });
          tbl._activeColIdx = Math.max(0, Math.min(colIdx, colCount - 2));
          const nextCell = tbl.rows[tbl._activeRowIdx || 0]?.cells[tbl._activeColIdx];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
          updateCharMeta();
        } else if (act === 'col-left' && colIdx > 0) {
          Array.from(tbl.rows).forEach(tr => {
            const cur = tr.cells[colIdx];
            const prev = tr.cells[colIdx - 1];
            if (cur && prev) prev.before(cur);
          });
          tbl._activeColIdx = colIdx - 1;
          const nextCell = tbl.rows[tbl._activeRowIdx || 0]?.cells[tbl._activeColIdx];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
        } else if (act === 'col-right' && colIdx < colCount - 1) {
          Array.from(tbl.rows).forEach(tr => {
            const cur = tr.cells[colIdx];
            const next = tr.cells[colIdx + 1];
            if (cur && next) next.after(cur);
          });
          tbl._activeColIdx = colIdx + 1;
          const nextCell = tbl.rows[tbl._activeRowIdx || 0]?.cells[tbl._activeColIdx];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
        } else if (act === 'cut') {
          await copyCardHtml(tw);
          tw.remove();
          pushSnapshot();
          updateCharMeta();
          toast('Table cut — tap anywhere to paste', 'ok');
        } else if (act === 'copy') {
          await copyCardHtml(tw);
          toast('Table copied', 'ok');
        } else if (act === 'del-tbl') {
          tw.remove();
          pushSnapshot();
          updateCharMeta();
        }
      };
    });
  };

  const openTableRowMenu = (tw, rowH) => {
    const tbl = tw.querySelector('table');
    if (!tbl || !tbl.rows.length) return;
    const rowCount = tbl.rows.length;
    const rowIdx = Math.max(0, Math.min(rowCount - 1, Number(tbl._activeRowIdx ?? 0)));
    tbl.querySelectorAll('.zn-col-selected,.zn-row-selected').forEach(c => c.classList.remove('zn-col-selected', 'zn-row-selected'));
    const activeRow = tbl.rows[rowIdx];
    if (activeRow) {
      Array.from(activeRow.cells).forEach(c => c.classList.add('zn-row-selected'));
    }

    const canMoveUp = rowIdx > 0;
    const canMoveDown = rowIdx < rowCount - 1;
    popMenu.innerHTML = `
      <button type="button" class="zn-pop-item" data-pop="ins-row">${POP_ICONS.insertRow}<span>Insert row</span></button>
      <button type="button" class="zn-pop-item" data-pop="del-row">${POP_ICONS.delete}<span>Delete row</span></button>
      ${canMoveUp ? `<button type="button" class="zn-pop-item" data-pop="row-up">${POP_ICONS.moveUp}<span>Move up</span></button>` : ''}
      ${canMoveDown ? `<button type="button" class="zn-pop-item" data-pop="row-down">${POP_ICONS.moveDown}<span>Move down</span></button>` : ''}
      <div class="zn-pop-sep"></div>
      <button type="button" class="zn-pop-item" data-pop="cut">${POP_ICONS.cut}<span>Cut</span></button>
      <button type="button" class="zn-pop-item" data-pop="copy">${POP_ICONS.copy}<span>Copy</span></button>
      <button type="button" class="zn-pop-item danger" data-pop="del-tbl">${POP_ICONS.delete}<span>Delete table</span></button>
    `;
    positionFloatingPopNear(rowH, 'right');

    popMenu.querySelectorAll('[data-pop]').forEach(btn => {
      btn.onclick = async ev => {
        ev.stopPropagation();
        const act = btn.dataset.pop;
        closeFloatingPop();
        if (act === 'ins-row') {
          const cols = tbl.rows[0].cells.length;
          const tr = document.createElement('tr');
          for (let i = 0; i < cols; i++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.innerHTML = '<br>';
            tr.appendChild(td);
          }
          if (activeRow) activeRow.after(tr);
          else (tbl.tBodies[0] || tbl).appendChild(tr);
          tbl._activeRowIdx = rowIdx + 1;
          const newCell = tr.cells[tbl._activeColIdx || 0];
          if (newCell) {
            newCell.focus();
            positionTableHandles(tw, newCell);
          }
          pushSnapshot();
          updateCharMeta();
        } else if (act === 'del-row') {
          if (rowCount <= 1) {
            tw.remove();
            pushSnapshot();
            updateCharMeta();
            return;
          }
          tbl.deleteRow(rowIdx);
          tbl._activeRowIdx = Math.max(0, Math.min(rowIdx, rowCount - 2));
          const nextCell = tbl.rows[tbl._activeRowIdx]?.cells[tbl._activeColIdx || 0];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
          updateCharMeta();
        } else if (act === 'row-up' && rowIdx > 0) {
          const prevRow = tbl.rows[rowIdx - 1];
          if (activeRow && prevRow) prevRow.before(activeRow);
          tbl._activeRowIdx = rowIdx - 1;
          const nextCell = tbl.rows[tbl._activeRowIdx]?.cells[tbl._activeColIdx || 0];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
        } else if (act === 'row-down' && rowIdx < rowCount - 1) {
          const nextRow = tbl.rows[rowIdx + 1];
          if (activeRow && nextRow) nextRow.after(activeRow);
          tbl._activeRowIdx = rowIdx + 1;
          const nextCell = tbl.rows[tbl._activeRowIdx]?.cells[tbl._activeColIdx || 0];
          if (nextCell) positionTableHandles(tw, nextCell);
          pushSnapshot();
        } else if (act === 'cut') {
          await copyCardHtml(tw);
          tw.remove();
          pushSnapshot();
          updateCharMeta();
          toast('Table cut — tap anywhere to paste', 'ok');
        } else if (act === 'copy') {
          await copyCardHtml(tw);
          toast('Table copied', 'ok');
        } else if (act === 'del-tbl') {
          tw.remove();
          pushSnapshot();
          updateCharMeta();
        }
      };
    });
  };

  const openObjectCardMenu = card => {
    closeFloatingPop();
    hideAllTableHandles(null);
    if (document.activeElement && (document.activeElement === editor || editor.contains(document.activeElement))) {
      document.activeElement.blur();
    }
    editor.blur();
    card.classList.add('zn-obj-selected');
    const imgEl = card.querySelector('img');
    const linkEl = card.querySelector('a.zn-file-link');
    const audioEl = card.querySelector('audio') || card.querySelector('[data-src]');
    const downloadUrl = imgEl?.src || linkEl?.getAttribute('href') || audioEl?.getAttribute('src') || audioEl?.getAttribute('data-src') || '';
    const downloadName = linkEl?.getAttribute('download') || imgEl?.getAttribute('alt') || 'zovio-note-item.png';

    popMenu.innerHTML = `
      ${downloadUrl ? `<button type="button" class="zn-pop-item" data-pop="save">${POP_ICONS.save}<span>Save</span></button>` : ''}
      <button type="button" class="zn-pop-item" data-pop="cut">${POP_ICONS.cut}<span>Cut</span></button>
      <button type="button" class="zn-pop-item" data-pop="copy">${POP_ICONS.copy}<span>Copy</span></button>
      <button type="button" class="zn-pop-item" data-pop="share">${POP_ICONS.share}<span>Share</span></button>
      <button type="button" class="zn-pop-item danger" data-pop="delete">${POP_ICONS.delete}<span>Delete</span></button>
    `;
    positionFloatingPopNear(card, 'bottom');
    // Center over the card like in the screen recording if tall
    const cRect = card.getBoundingClientRect();
    const pRect = popMenu.getBoundingClientRect();
    if (cRect.height > 120) {
      const midTop = Math.max(20, Math.min(window.innerHeight - pRect.height - 20, cRect.top + (cRect.height / 2) - (pRect.height / 2)));
      popMenu.style.top = `${Math.round(midTop)}px`;
    }

    popMenu.querySelectorAll('[data-pop]').forEach(btn => {
      btn.onclick = async ev => {
        ev.stopPropagation();
        const act = btn.dataset.pop;
        closeFloatingPop();
        if (act === 'save' && downloadUrl) {
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = downloadName.includes('.') ? downloadName : `${downloadName}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          toast('Saved to device', 'ok');
        } else if (act === 'cut') {
          await copyCardHtml(card);
          card.remove();
          pushSnapshot();
          updateCharMeta();
          toast('Cut — tap anywhere to paste', 'ok');
        } else if (act === 'copy') {
          await copyCardHtml(card);
          toast('Copied', 'ok');
        } else if (act === 'share') {
          if (navigator.share && downloadUrl) {
            try {
              const res = await fetch(downloadUrl);
              const blob = await res.blob();
              const file = new File([blob], downloadName.includes('.') ? downloadName : `${downloadName}.png`, { type: blob.type || 'image/png' });
              if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: titleIn.value || 'Note Attachment' });
                return;
              }
            } catch {}
          }
          shareNoteToZovioChat({
            title: titleIn.value.trim() || 'Untitled Note',
            html: card.outerHTML,
            body: noteHtmlToPlainText(card.outerHTML),
            color: noteColor,
            skin: noteSkin
          });
        } else if (act === 'delete') {
          card.remove();
          pushSnapshot();
          updateCharMeta();
        }
      };
    });
  };

  const ensureEditableLinesAroundObjects = () => {
    const isObj = el => el && el.nodeType === 1 && el.matches(OBJ_SELECTOR);
    const children = Array.from(editor.children);
    children.forEach((child, idx) => {
      if (!isObj(child)) return;
      if (idx === 0) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        child.before(p);
      }
      const next = child.nextElementSibling;
      if (!next || isObj(next)) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        child.after(p);
      }
    });
  };

  // Repair legacy notes & upgrade tables/objects to clean buttonless cards with native handles
  const normalizeEditorBlocks = () => {
    // Unwrap any outer AI container divs so blocks are direct children of editor
    editor.querySelectorAll('.zai-note-doc,.zai-section').forEach(wrapper => {
      const frag = document.createDocumentFragment();
      while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);
      wrapper.replaceWith(frag);
    });
    // Unwrap nested blockquotes so there are never double quote bars (||)
    editor.querySelectorAll('blockquote blockquote').forEach(innerBq => {
      const frag = document.createDocumentFragment();
      while (innerBq.firstChild) frag.appendChild(innerBq.firstChild);
      innerBq.replaceWith(frag);
    });

    editor.querySelectorAll(OBJ_SELECTOR).forEach(card => {
      const checkParent = card.closest('.zn-check-row');
      if (checkParent && checkParent.parentElement === editor) {
        checkParent.after(card);
      } else if (card.parentElement !== editor) {
        let topAncestor = card.parentElement;
        while (topAncestor && topAncestor.parentElement !== editor) {
          topAncestor = topAncestor.parentElement;
        }
        if (topAncestor && topAncestor.parentElement === editor && topAncestor !== editor) {
          topAncestor.after(card);
        }
      }
    });

    // Clean up tables: remove legacy .zn-table-controls header bar, convert th to clean td, and ensure floating handles exist
    editor.querySelectorAll('.zn-table-wrap').forEach(tw => {
      tw.querySelector('.zn-table-controls')?.remove();
      tw.querySelector('.zn-obj-actions')?.remove();
      const tbl = tw.querySelector('table');
      if (tbl) {
        tbl.querySelectorAll('th').forEach(th => {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          const txt = th.textContent.trim();
          td.innerHTML = /^Column\s+\d+$/i.test(txt) || /^Col\s+\d+$/i.test(txt) ? '<br>' : (th.innerHTML || '<br>');
          th.replaceWith(td);
        });
      }
      if (!tw.querySelector('.zn-tbl-col-handle')) {
        const colH = document.createElement('button');
        colH.type = 'button';
        colH.className = 'zn-tbl-col-handle hidden';
        colH.setAttribute('contenteditable', 'false');
        colH.textContent = '•••';
        tw.appendChild(colH);
      }
      if (!tw.querySelector('.zn-tbl-row-handle')) {
        const rowH = document.createElement('button');
        rowH.type = 'button';
        rowH.className = 'zn-tbl-row-handle hidden';
        rowH.setAttribute('contenteditable', 'false');
        rowH.textContent = '⋮';
        tw.appendChild(rowH);
      }
    });

    // Clean up Media cards (Doodle / Photo / Scan) — remove old corner buttons
    editor.querySelectorAll('.zn-media-card').forEach(mc => {
      mc.querySelector('.zn-obj-actions')?.remove();
      mc.querySelector('.zn-media-remove')?.remove();
    });

    // Clean up File cards
    editor.querySelectorAll('.zn-file-card').forEach(fc => {
      fc.querySelector('.zn-obj-actions')?.remove();
      fc.querySelector('.zn-file-remove')?.remove();
      const link = fc.querySelector('a');
      if (!link) return;
      if (!link.classList.contains('zn-file-link')) link.classList.add('zn-file-link');
      const href = link.getAttribute('href') || '';
      const nameAttr = link.getAttribute('download') || link.textContent.trim();
      const isImg = /^data:image\//i.test(href) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(nameAttr);
      const oldIco = fc.querySelector('.zn-file-ico');
      if (isImg && !fc.querySelector('.zn-file-thumb')) {
        const thumb = document.createElement('img');
        thumb.className = 'zn-file-thumb';
        thumb.src = href;
        thumb.alt = nameAttr || 'Image';
        if (oldIco) oldIco.replaceWith(thumb);
        else link.prepend(thumb);
      } else if (!oldIco && !fc.querySelector('.zn-file-thumb')) {
        const icoSpan = document.createElement('span');
        icoSpan.className = 'zn-file-ico';
        icoSpan.innerHTML = ZN_SVG.file;
        link.prepend(icoSpan);
      }
      if (!link.querySelector('.zn-file-meta')) {
        const rawText = (link.textContent || '').trim() || nameAttr || 'Attachment';
        const matchSize = rawText.match(/\(([^)]+)\)\s*$/);
        const cleanName = matchSize ? rawText.slice(0, matchSize.index).trim() : (nameAttr || rawText);
        const sizeLabel = matchSize ? matchSize[1] : '';
        const visual = link.querySelector('.zn-file-thumb, .zn-file-ico');
        link.innerHTML = '';
        if (visual) link.appendChild(visual);
        const metaSpan = document.createElement('span');
        metaSpan.className = 'zn-file-meta';
        metaSpan.innerHTML = `<span class="zn-file-name">${esc(cleanName)}</span>${sizeLabel ? `<span class="zn-file-size">${esc(sizeLabel)}</span>` : ''}`;
        link.appendChild(metaSpan);
      }
    });

    // Clean up Audio cards
    editor.querySelectorAll('.zn-audio-card').forEach(ac => {
      ac.querySelector('.zn-obj-actions')?.remove();
      ac.querySelector('.zn-audio-remove')?.remove();
      const strong = ac.querySelector('.zn-audio-head strong');
      let cleanTitle = (strong?.textContent || 'Voice Note').replace(/^🎙️?\s*/u, '').trim() || 'Voice Note';
      if (strong && (!strong.querySelector('svg') || /🎙/.test(strong.textContent || ''))) {
        strong.innerHTML = `${ZN_SVG.mic} <span>${esc(cleanTitle)}</span>`;
      }
      let durSec = Number(ac.getAttribute('data-dur') || ac.querySelector('.fire-audio-player')?.getAttribute('data-duration') || 0);
      if (!durSec) {
        const mDur = cleanTitle.match(/(\d+):(\d{2})/);
        if (mDur) durSec = (+mDur[1]) * 60 + (+mDur[2]);
      }
      if (!ac.querySelector('.fire-audio-player')) {
        const rawAudio = ac.querySelector('audio');
        const src = rawAudio?.getAttribute('src') || '';
        if (src && typeof window.renderCustomAudioPlayer === 'function') {
          const wrap = document.createElement('div');
          wrap.innerHTML = window.renderCustomAudioPlayer(src, { isVoice: true, title: cleanTitle, duration: durSec }).trim();
          const customEl = wrap.firstElementChild;
          if (customEl) rawAudio.replaceWith(customEl);
        }
      }
    });

    ensureEditableLinesAroundObjects();
    if (typeof window.initCustomAudioPlayers === 'function') {
      window.initCustomAudioPlayers(editor);
    }
  };
  normalizeEditorBlocks();

  const syncHistoryButtons = () => {
    const ub = $('#znUndoBtn', overlay);
    const rb = $('#znRedoBtn', overlay);
    if (ub) ub.disabled = undoIdx <= 0;
    if (rb) rb.disabled = undoIdx >= undoStack.length - 1;
  };

  const pushSnapshot = () => {
    const html = editor.innerHTML;
    if (undoStack[undoIdx] === html) {
      syncHistoryButtons();
      return;
    }
    undoStack.splice(undoIdx + 1);
    undoStack.push(html);
    if (undoStack.length > 40) undoStack.shift();
    undoIdx = undoStack.length - 1;
    syncHistoryButtons();
  };

  const updateCharMeta = () => {
    const plain = noteHtmlToPlainText(editor.innerHTML);
    const chars = plain.length;
    const words = plain ? plain.split(/\s+/).length : 0;
    $('#znCharCnt', overlay).textContent = `${chars} chars · ${words} words`;
  };
  updateCharMeta();

  let snapTimer = null;
  editor.addEventListener('input', () => {
    updateCharMeta();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(pushSnapshot, 350);
    const sel = window.getSelection();
    const txt = sel?.anchorNode?.textContent || '';
    const trimmed = txt.trim();
    const slashMenu = $('#znSlashMenu', overlay);
    if (trimmed === '/' || trimmed.endsWith(' /')) {
      slashMenu.classList.remove('hidden');
    } else {
      slashMenu.classList.add('hidden');
    }
  });

  // Track active table cell & show floating column (•••) and row (⋮) handles
  editor.addEventListener('focusin', e => {
    if (e.target.closest?.('.zn-tbl-col-handle,.zn-tbl-row-handle')) return;
    const cell = e.target.closest?.('.zn-table th, .zn-table td');
    if (cell) {
      const tw = cell.closest('.zn-table-wrap');
      const tbl = cell.closest('table');
      if (tbl && tw) {
        tbl._activeRowIdx = cell.parentElement.rowIndex;
        tbl._activeColIdx = cell.cellIndex;
        tbl.querySelectorAll('.zn-cell-active,.zn-col-selected,.zn-row-selected').forEach(c => {
          c.classList.remove('zn-cell-active', 'zn-col-selected', 'zn-row-selected');
        });
        cell.classList.add('zn-cell-active');
        positionTableHandles(tw, cell);
      }
    } else {
      hideAllTableHandles(null);
    }
  });

  // Press-and-Hold Drag-and-Drop to reorder any Object (Doodle, Image, Table, Audio, File) anywhere in the note
  // Uses non-passive touch events + mouse events so Android WebView NEVER cancels active drag into native scroll
  let dragState = null;
  const edScroll = overlay.querySelector('.zn-ed-scroll');
  let autoScrollRaf = 0;

  const stopAutoScroll = () => {
    if (autoScrollRaf) {
      cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = 0;
    }
  };

  const cleanupDrag = () => {
    stopAutoScroll();
    if (edScroll) {
      edScroll.style.overflowY = '';
      edScroll.style.touchAction = '';
    }
    if (!dragState) {
      if (editor.getAttribute('contenteditable') !== 'true') {
        setTimeout(() => {
          if (!dragState && document.body.contains(editor)) editor.setAttribute('contenteditable', 'true');
        }, 90);
      }
      return;
    }
    const wasActive = dragState.active;
    clearTimeout(dragState.holdTimer);
    dragState.card?.classList.remove('zn-dragging-source');
    dragState.ghost?.remove();
    dragState.dropCaret?.remove();
    dragState = null;
    if (wasActive || editor.getAttribute('contenteditable') !== 'true') {
      setTimeout(() => {
        if (!dragState && document.body.contains(editor)) editor.setAttribute('contenteditable', 'true');
      }, 90);
    }
  };

  const updateDragPosition = (clientX, clientY) => {
    if (!dragState || !dragState.active) return;
    dragState.lastX = clientX;
    dragState.lastY = clientY;
    dragState.moved = true;
    if (dragState.ghost) {
      dragState.ghost.style.left = `${clientX}px`;
      dragState.ghost.style.top = `${clientY}px`;
    }

    const children = Array.from(editor.children).filter(el => el !== dragState.card && el !== dragState.dropCaret);
    let targetBlock = null;
    let placeAfter = false;
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) {
        targetBlock = child;
        placeAfter = false;
        break;
      }
      targetBlock = child;
      placeAfter = true;
    }
    if (targetBlock && dragState.dropCaret) {
      if (placeAfter) targetBlock.after(dragState.dropCaret);
      else targetBlock.before(dragState.dropCaret);
    }
  };

  const runEdgeAutoScroll = () => {
    if (!dragState || !dragState.active || !edScroll) {
      autoScrollRaf = 0;
      return;
    }
    const sr = edScroll.getBoundingClientRect();
    const y = dragState.lastY ?? dragState.startY;
    let delta = 0;
    if (y < sr.top + 68) delta = -Math.max(4, Math.round((sr.top + 68 - y) * 0.22));
    else if (y > sr.bottom - 68) delta = Math.max(4, Math.round((y - (sr.bottom - 68)) * 0.22));
    if (delta !== 0) {
      edScroll.scrollTop += delta;
      updateDragPosition(dragState.lastX ?? dragState.startX, y);
    }
    autoScrollRaf = requestAnimationFrame(runEdgeAutoScroll);
  };

  const beginDragTracking = (card, clientX, clientY, isTouch, touchId) => {
    cleanupDrag();
    const isTable = card.classList.contains('zn-table-wrap');
    const startObjectDrag = () => {
      if (!dragState) return;
      closeFloatingPop();
      hideAllTableHandles(null);
      if (document.activeElement && (document.activeElement === editor || editor.contains(document.activeElement))) {
        document.activeElement.blur();
      }
      editor.blur();
      editor.setAttribute('contenteditable', 'false');
      dragState.active = true;
      card.classList.add('zn-dragging-source');
      if (edScroll) {
        edScroll.style.overflowY = 'hidden';
        edScroll.style.touchAction = 'none';
      }
      try { navigator.vibrate?.(18); } catch {}

      const ghost = document.createElement('div');
      ghost.className = 'zn-drag-ghost';
      const img = card.querySelector('img');
      if (img) {
        ghost.innerHTML = `<img src="${img.src}" alt="">`;
      } else if (isTable) {
        ghost.innerHTML = `<div class="zn-ghost-table-preview">${card.querySelector('table')?.outerHTML || 'Table'}</div>`;
      } else {
        ghost.innerHTML = `<div class="zn-ghost-card-preview">${card.innerHTML}</div>`;
      }
      overlay.appendChild(ghost);
      ghost.style.left = `${dragState.lastX}px`;
      ghost.style.top = `${dragState.lastY}px`;
      dragState.ghost = ghost;

      const dropCaret = document.createElement('div');
      dropCaret.className = 'zn-drop-caret';
      dragState.dropCaret = dropCaret;
      card.before(dropCaret);
      updateDragPosition(dragState.lastX, dragState.lastY);
      if (!autoScrollRaf) autoScrollRaf = requestAnimationFrame(runEdgeAutoScroll);
    };

    dragState = {
      card,
      isTouch,
      touchId,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      active: false,
      moved: false,
      holdTimer: setTimeout(startObjectDrag, isTable ? 320 : 190)
    };
  };

  const commitOrCancelDrag = (cancelled = false) => {
    if (!dragState) return;
    const wasActive = dragState.active;
    const card = dragState.card;
    const dropCaret = dragState.dropCaret;
    if (!cancelled && wasActive && card && dropCaret && dropCaret.parentElement === editor) {
      dropCaret.replaceWith(card);
      ensureEditableLinesAroundObjects();
      pushSnapshot();
      updateCharMeta();
      card._justDraggedAt = Date.now();
    }
    cleanupDrag();
  };

  // Keep focus anchored on table cell when tapping ••• or ⋮ handles,
  // and prevent non-text object cards (doodles/images/files/audio) from focusing editor & popping keyboard
  editor.addEventListener('pointerdown', e => {
    if (e.target.closest('.zn-tbl-col-handle,.zn-tbl-row-handle')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.closest('.zn-media-card,.zn-file-card,.zn-audio-card')) {
      e.preventDefault();
    }
  });

  editor.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) {
      cleanupDrag();
      return;
    }
    if (e.target.closest('.zn-tbl-col-handle,.zn-tbl-row-handle,.fire-audio-player button,.fire-audio-player input')) return;
    const card = e.target.closest(OBJ_SELECTOR);
    if (!card || card.parentElement !== editor) return;
    const t = e.touches[0];
    beginDragTracking(card, t.clientX, t.clientY, true, t.identifier);
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (!dragState || !dragState.isTouch) return;
    const t = Array.from(e.touches).find(x => x.identifier === dragState.touchId) || e.touches[0];
    if (!t) return;
    const dx = t.clientX - dragState.startX;
    const dy = t.clientY - dragState.startY;
    if (!dragState.active) {
      dragState.lastX = t.clientX;
      dragState.lastY = t.clientY;
      if (Math.hypot(dx, dy) > 10) {
        clearTimeout(dragState.holdTimer);
        cleanupDrag();
      }
      return;
    }
    if (e.cancelable) e.preventDefault();
    updateDragPosition(t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('touchend', e => {
    if (!dragState || !dragState.isTouch) return;
    const stillDown = Array.from(e.touches || []).some(x => x.identifier === dragState.touchId);
    if (stillDown) return;
    commitOrCancelDrag(false);
  });
  window.addEventListener('touchcancel', () => {
    if (!dragState || !dragState.isTouch) return;
    commitOrCancelDrag(true);
  });

  // Desktop mouse drag support
  editor.addEventListener('mousedown', e => {
    if (e.button !== 0 || ('ontouchstart' in window && e.sourceCapabilities?.firesTouchEvents)) return;
    if (e.target.closest('.zn-tbl-col-handle,.zn-tbl-row-handle,.fire-audio-player button,.fire-audio-player input')) return;
    const card = e.target.closest(OBJ_SELECTOR);
    if (!card || card.parentElement !== editor) return;
    beginDragTracking(card, e.clientX, e.clientY, false, null);
  });
  window.addEventListener('mousemove', e => {
    if (!dragState || dragState.isTouch) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.active) {
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      if (Math.hypot(dx, dy) > 10) {
        clearTimeout(dragState.holdTimer);
        cleanupDrag();
      }
      return;
    }
    e.preventDefault();
    updateDragPosition(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', () => {
    if (!dragState || dragState.isTouch) return;
    commitOrCancelDrag(false);
  });

  // Interactive checklist + table handles + media tap menu delegation inside contenteditable
  editor.addEventListener('click', e => {
    const colHandle = e.target.closest('.zn-tbl-col-handle');
    if (colHandle) {
      e.preventDefault();
      e.stopPropagation();
      const tw = colHandle.closest('.zn-table-wrap');
      if (tw) openTableColMenu(tw, colHandle);
      return;
    }
    const rowHandle = e.target.closest('.zn-tbl-row-handle');
    if (rowHandle) {
      e.preventDefault();
      e.stopPropagation();
      const tw = rowHandle.closest('.zn-table-wrap');
      if (tw) openTableRowMenu(tw, rowHandle);
      return;
    }

    const cell = e.target.closest('.zn-table th, .zn-table td');
    if (cell) {
      closeFloatingPop();
      const tw = cell.closest('.zn-table-wrap');
      const tbl = cell.closest('table');
      if (tbl && tw) {
        tbl._activeRowIdx = cell.parentElement.rowIndex;
        tbl._activeColIdx = cell.cellIndex;
        tbl.querySelectorAll('.zn-cell-active,.zn-col-selected,.zn-row-selected').forEach(c => {
          c.classList.remove('zn-cell-active', 'zn-col-selected', 'zn-row-selected');
        });
        cell.classList.add('zn-cell-active');
        positionTableHandles(tw, cell);
      }
      return;
    }

    const mediaOrObj = e.target.closest('.zn-media-card,.zn-file-card,.zn-audio-card');
    if (mediaOrObj) {
      if (mediaOrObj._justDraggedAt && Date.now() - mediaOrObj._justDraggedAt < 350) return;
      if (e.target.closest('.fire-audio-player')) return;
      e.preventDefault();
      e.stopPropagation();
      openObjectCardMenu(mediaOrObj);
      return;
    }

    closeFloatingPop();
    hideAllTableHandles(null);

    const cb = e.target.closest('.zn-check-cb');
    if (cb) {
      const row = cb.closest('.zn-check-row');
      if (row) {
        const nextChecked = !row.classList.contains('checked');
        row.classList.toggle('checked', nextChecked);
        cb.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
        cb.textContent = nextChecked ? '✓' : '';
        pushSnapshot();
      }
    }
  });

  editor.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      const row = sel?.anchorNode?.nodeType === 3
        ? sel.anchorNode.parentElement?.closest('.zn-check-row')
        : sel?.anchorNode?.closest?.('.zn-check-row');
      if (row) {
        e.preventDefault();
        const txtEl = row.querySelector('.zn-check-text');
        if (!txtEl?.textContent.trim()) {
          const p = document.createElement('div');
          p.innerHTML = '<br>';
          row.replaceWith(p);
          const range = document.createRange();
          range.selectNodeContents(p);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          insertChecklistBlock(row);
        }
        pushSnapshot();
      }
    }
  });

  const insertHtmlBlock = htmlStr => {
    const wrap = document.createElement('div');
    wrap.innerHTML = htmlStr.trim();
    const frag = document.createDocumentFragment();
    const nodes = Array.from(wrap.childNodes);
    const lastInserted = nodes[nodes.length - 1];
    nodes.forEach(n => frag.appendChild(n));

    // Check if the user explicitly selected a line in the editor
    const sel = window.getSelection();
    let activeRange = null;
    if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer) && document.activeElement === editor) {
      activeRange = sel.getRangeAt(0);
    } else if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
      activeRange = userSelectedRange;
    }

    let insertedAtSelection = false;
    if (activeRange) {
      const anchorNode = activeRange.commonAncestorContainer;
      const anchorEl = anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
      const blockAncestor = anchorEl?.closest?.('.zn-check-row,.zn-table-wrap,.zn-media-card,.zn-audio-card,.zn-file-card');
      if (blockAncestor && blockAncestor.parentElement === editor) {
        blockAncestor.after(frag);
        insertedAtSelection = true;
      } else if (anchorEl && anchorEl !== editor && editor.contains(anchorEl)) {
        let topLine = anchorEl;
        while (topLine.parentElement && topLine.parentElement !== editor) {
          topLine = topLine.parentElement;
        }
        if (topLine.parentElement === editor) {
          // If the selected line is empty, replace it or insert right after it
          if (!topLine.textContent.trim() && !topLine.querySelector('img,table,audio')) {
            topLine.replaceWith(frag);
          } else {
            topLine.after(frag);
          }
          insertedAtSelection = true;
        }
      } else if (anchorEl === editor) {
        activeRange.collapse(false);
        activeRange.insertNode(frag);
        insertedAtSelection = true;
      }
    }

    // If no line was selected by the user, ALWAYS place the object at the very end (last) of the note
    if (!insertedAtSelection) {
      editor.appendChild(frag);
    }

    normalizeEditorBlocks();
    editor.focus();
    if (lastInserted && editor.contains(lastInserted)) {
      const r = document.createRange();
      r.selectNodeContents(lastInserted);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
      userSelectedRange = r.cloneRange();
    }
    pushSnapshot();
    updateCharMeta();
  };

  const insertChecklistBlock = afterEl => {
    const row = document.createElement('div');
    row.className = 'zn-check-row';
    row.innerHTML = `<span class="zn-check-cb" contenteditable="false" role="checkbox" aria-checked="false"></span><span class="zn-check-text" contenteditable="true"></span>`;
    if (afterEl && afterEl.parentNode) {
      afterEl.after(row);
    } else if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
      const anchorNode = userSelectedRange.commonAncestorContainer;
      const anchorEl = anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
      let topLine = anchorEl;
      while (topLine && topLine !== editor && topLine.parentElement !== editor) {
        topLine = topLine.parentElement;
      }
      if (topLine && topLine !== editor && topLine.parentElement === editor) {
        if (!topLine.textContent.trim() && !topLine.querySelector('img,table,audio')) topLine.replaceWith(row);
        else topLine.after(row);
      } else {
        editor.appendChild(row);
      }
    } else {
      editor.appendChild(row);
    }
    editor.focus();
    const textSpan = row.querySelector('.zn-check-text');
    const r = document.createRange();
    r.selectNodeContents(textSpan);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    userSelectedRange = r.cloneRange();
  };

  const insertSpreadsheetBlock = (rows = 2, cols = 2) => {
    const bodyRows = Array.from({ length: rows }, () => `<tr>${Array.from({ length: cols }, () => `<td contenteditable="true"><br></td>`).join('')}</tr>`).join('');
    insertHtmlBlock(`
      <div class="zn-table-wrap" contenteditable="false">
        <div class="zn-table-scroll"><table class="zn-table"><tbody>${bodyRows}</tbody></table></div>
        <button type="button" class="zn-tbl-col-handle hidden" contenteditable="false">•••</button>
        <button type="button" class="zn-tbl-row-handle hidden" contenteditable="false">⋮</button>
      </div><p><br></p>`);
  };

  const insertImageBlock = (dataUrl, label = 'Image') => {
    insertHtmlBlock(`
      <div class="zn-media-card" contenteditable="false">
        <img src="${dataUrl}" alt="${esc(label)}">
      </div><p><br></p>`);
  };

  // Support pasting a Cut/Copied object block anywhere in the note (both Ctrl+V and 1-tap Paste chip on mobile)
  const pastePill = document.createElement('button');
  pastePill.type = 'button';
  pastePill.className = 'zn-paste-chip hidden';
  pastePill.innerHTML = `${POP_ICONS.copy}<span>Paste here</span>`;
  overlay.appendChild(pastePill);

  const showPasteChip = () => {
    if (internalObjClipboard) pastePill.classList.remove('hidden');
  };
  const hidePasteChip = () => {
    pastePill.classList.add('hidden');
  };

  pastePill.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    if (!internalObjClipboard) {
      hidePasteChip();
      return;
    }
    const html = internalObjClipboard;
    internalObjClipboard = '';
    hidePasteChip();
    insertHtmlBlock(`${html}<p><br></p>`);
  };

  editor.addEventListener('contextmenu', e => {
    if (e.target.closest(OBJ_SELECTOR)) e.preventDefault();
  });

  editor.addEventListener('paste', e => {
    if (internalObjClipboard) {
      const clipText = e.clipboardData?.getData('text/plain') || '';
      if (!clipText.trim() || internalObjClipboard.includes('zn-table-wrap') || internalObjClipboard.includes('zn-media-card')) {
        e.preventDefault();
        const html = internalObjClipboard;
        internalObjClipboard = '';
        hidePasteChip();
        insertHtmlBlock(`${html}<p><br></p>`);
      }
    }
  });

  // Deterministic block-level formatting (Title=h1, Subtitle=h2, Heading=h3, Body=p, Quote=blockquote)
  // Works on normal lines, AI-generated blocks, and list items (<li>), and strips any inline font-size overrides
  const getActiveEditorBlock = () => {
    const sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
      range = userSelectedRange;
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    if (!range) return null;
    let node = range.startContainer;
    if (node === editor) {
      const child = editor.childNodes[range.startOffset] || editor.lastElementChild;
      if (child) node = child;
    }
    if (node && node.nodeType === 3 && node.parentElement === editor) {
      const p = document.createElement('p');
      node.before(p);
      p.appendChild(node);
      return p;
    }
    let el = node?.nodeType === 3 ? node.parentElement : node;
    // Find nearest semantic block (li, h1..h6, p, blockquote, or direct child div of editor)
    while (el && el !== editor) {
      if (el.matches?.(OBJ_SELECTOR) || el.classList?.contains('zn-check-row')) return null;
      const t = el.tagName;
      if (t === 'LI' || /^H[1-6]$/.test(t) || t === 'P' || t === 'BLOCKQUOTE' || el.parentElement === editor) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  };

  const stripInlineSizing = rootEl => {
    if (!rootEl) return;
    if (rootEl.style) {
      rootEl.style.fontSize = '';
      rootEl.style.lineHeight = '';
      rootEl.style.fontWeight = '';
      if (!rootEl.getAttribute('style')?.trim()) rootEl.removeAttribute('style');
    }
    rootEl.querySelectorAll('[style]').forEach(el => {
      el.style.fontSize = '';
      el.style.lineHeight = '';
      el.style.fontWeight = '';
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    });
    rootEl.querySelectorAll('font[size]').forEach(f => f.removeAttribute('size'));
  };

  const applyNoteBlockFormat = rawTag => {
    const tag = String(rawTag || 'p').replace(/[<>]/g, '').toLowerCase();
    editor.focus();
    const sel = window.getSelection();
    if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(userSelectedRange);
    }
    let block = getActiveEditorBlock();
    if (!block) {
      const newBlock = document.createElement(tag);
      newBlock.innerHTML = '<br>';
      editor.appendChild(newBlock);
      const r = document.createRange();
      r.selectNodeContents(newBlock);
      r.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r);
      userSelectedRange = r.cloneRange();
      pushSnapshot();
      return;
    }

    // If block is inside an outer heading or blockquote ancestor, unwrap that outer wrapper first
    let anc = block.parentElement;
    while (anc && anc !== editor) {
      const nextAnc = anc.parentElement;
      if (/^H[1-6]$/.test(anc.tagName) || anc.tagName === 'BLOCKQUOTE') {
        const frag = document.createDocumentFragment();
        while (anc.firstChild) frag.appendChild(anc.firstChild);
        anc.replaceWith(frag);
      }
      anc = nextAnc;
    }

    // Case 1: Inside a list item (<li>)
    if (block.tagName === 'LI') {
      block.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,div').forEach(inner => {
        const frag = document.createDocumentFragment();
        while (inner.firstChild) frag.appendChild(inner.firstChild);
        inner.replaceWith(frag);
      });
      stripInlineSizing(block);
      block.setAttribute('data-zn-fmt', tag);
      const r = document.createRange();
      r.selectNodeContents(block);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
      userSelectedRange = r.cloneRange();
      pushSnapshot();
      return;
    }

    // Case 2: Standard block (h1, h2, h3, p, blockquote, div)
    const replacement = document.createElement(tag);
    replacement.innerHTML = block.innerHTML || '<br>';
    replacement.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,div').forEach(inner => {
      const frag = document.createDocumentFragment();
      while (inner.firstChild) frag.appendChild(inner.firstChild);
      inner.replaceWith(frag);
    });
    stripInlineSizing(replacement);

    block.replaceWith(replacement);
    const r = document.createRange();
    r.selectNodeContents(replacement);
    r.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(r);
    userSelectedRange = r.cloneRange();
    pushSnapshot();
  };

  // Slash commands
  $$('#znSlashMenu [data-cmd]', overlay).forEach(btn => {
    btn.onclick = () => {
      $('#znSlashMenu', overlay).classList.add('hidden');
      const sel = window.getSelection();
      if (sel?.anchorNode?.nodeType === 3 && sel.anchorNode.textContent.trim().endsWith('/')) {
        sel.anchorNode.textContent = sel.anchorNode.textContent.replace(/\/\s*$/, '');
      }
      const cmd = btn.dataset.cmd;
      if (cmd === 'h1') applyNoteBlockFormat('h1');
      else if (cmd === 'h2') applyNoteBlockFormat('h2');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'ol') document.execCommand('insertOrderedList');
      else if (cmd === 'check') insertChecklistBlock();
      else if (cmd === 'table') insertSpreadsheetBlock(2, 2);
      else if (cmd === 'hr') document.execCommand('insertHorizontalRule');
      else if (cmd === 'doodle') openDoodlePadModal(url => insertImageBlock(url, 'Doodle'));
      else if (cmd === 'scan') openQuickCameraForNote(true, url => insertImageBlock(url, 'Scanned Document'));
      pushSnapshot();
    };
  });

  // Drawers (Skins / Aa Format / + Add)
  const drawerArea = $('#znDrawerArea', overlay);
  const toggleDrawer = name => {
    saveEditorSelection();
    closeFloatingPop();
    if (activeDrawer === name) {
      activeDrawer = null;
      drawerArea.classList.add('hidden');
      drawerArea.innerHTML = '';
      $$('.zn-tb-btn', overlay).forEach(b => b.classList.remove('active'));
      return;
    }
    activeDrawer = name;
    $$('.zn-tb-btn', overlay).forEach(b => b.classList.toggle('active', b.dataset.zntb === name));
    drawerArea.classList.remove('hidden');

    if (name === 'skins') {
      drawerArea.innerHTML = `
        <div class="zn-skins-row">
          ${ZN_SKINS.map(s => `
            <button type="button" class="zn-skin-thumb-card ${noteSkin === s.id ? 'active' : ''}" data-skin="${s.id}">
              <span class="zn-skin-preview zn-skin-${s.id}">
                <span class="zn-skin-pv-bar" style="background:${s.dot}"></span>
                <span class="zn-skin-pv-l1"></span>
                <span class="zn-skin-pv-l2"></span>
                <span class="zn-skin-pv-l3"></span>
              </span>
              <span class="zn-skin-pv-name">${esc(s.name)}</span>
            </button>`).join('')}
        </div>`;
      $$('[data-skin]', drawerArea).forEach(sb => sb.onclick = () => {
        overlay.classList.remove(`zn-skin-${noteSkin}`);
        noteSkin = sb.dataset.skin;
        const found = ZN_SKINS.find(x => x.id === noteSkin);
        if (found) noteColor = found.dot;
        overlay.classList.add(`zn-skin-${noteSkin}`);
        $$('[data-skin]', drawerArea).forEach(x => x.classList.toggle('active', x === sb));
      });
    } else if (name === 'format') {
      const actBlk = getActiveEditorBlock();
      const curBlkTag = (actBlk?.getAttribute?.('data-zn-fmt') || actBlk?.tagName || 'P').toLowerCase();
      drawerArea.innerHTML = `
        <div class="zn-fmt-sheet">
          <div class="zn-fmt-row">
            <button type="button" class="zn-fmt-pill ${curBlkTag === 'h1' ? 'active' : ''}" data-fmtblock="h1">Title</button>
            <button type="button" class="zn-fmt-pill ${curBlkTag === 'h2' ? 'active' : ''}" data-fmtblock="h2">Subtitle</button>
            <button type="button" class="zn-fmt-pill ${curBlkTag === 'h3' ? 'active' : ''}" data-fmtblock="h3">Heading</button>
            <button type="button" class="zn-fmt-pill ${curBlkTag === 'p' || curBlkTag === 'div' || curBlkTag === 'li' ? 'active' : ''}" data-fmtblock="p">Body</button>
            <button type="button" class="zn-fmt-pill ${curBlkTag === 'blockquote' ? 'active' : ''}" data-fmtblock="blockquote">Quote</button>
          </div>
          <div class="zn-fmt-row">
            <button type="button" class="zn-fmt-ico" data-fmtcmd="bold"><b>B</b></button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="italic"><i>I</i></button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="underline"><u>U</u></button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="strikeThrough"><s>S</s></button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="insertUnorderedList">• List</button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="insertOrderedList">1. List</button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="justifyLeft" title="Align Left"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg></button>
            <button type="button" class="zn-fmt-ico" data-fmtcmd="justifyCenter" title="Align Center"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button>
          </div>
          <div class="zn-fmt-row">
            <span class="xs muted" style="font-weight:700">Text</span>
            ${['#f8fafc', '#a78bfa', '#38bdf8', '#2ed3b7', '#fbbf24', '#fb7185'].map(c =>
              `<button type="button" class="color-dot" data-txtcol="${c}" style="background:${c}"></button>`).join('')}
            <span class="xs muted" style="font-weight:700;margin-left:8px">Highlight</span>
            ${['transparent', 'rgba(124,92,255,0.34)', 'rgba(46,211,183,0.32)', 'rgba(250,204,21,0.34)', 'rgba(244,63,94,0.32)'].map(c =>
              `<button type="button" class="color-dot" data-hilite="${c}" style="background:${c === 'transparent' ? '#334155' : c}"></button>`).join('')}
          </div>
        </div>`;
      $$('[data-fmtblock]', drawerArea).forEach(b => b.onclick = () => {
        const tag = b.dataset.fmtblock;
        applyNoteBlockFormat(tag);
        $$('[data-fmtblock]', drawerArea).forEach(x => x.classList.toggle('active', x === b));
      });
      $$('[data-fmtcmd]', drawerArea).forEach(b => b.onclick = () => {
        editor.focus();
        if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(userSelectedRange);
        }
        document.execCommand(b.dataset.fmtcmd, false, null);
        saveEditorSelection();
        pushSnapshot();
      });
      $$('[data-txtcol]', drawerArea).forEach(b => b.onclick = () => {
        editor.focus();
        if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(userSelectedRange);
        }
        document.execCommand('foreColor', false, b.dataset.txtcol);
        saveEditorSelection();
        pushSnapshot();
      });
      $$('[data-hilite]', drawerArea).forEach(b => b.onclick = () => {
        editor.focus();
        if (userSelectedRange && editor.contains(userSelectedRange.commonAncestorContainer)) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(userSelectedRange);
        }
        document.execCommand('hiliteColor', false, b.dataset.hilite);
        saveEditorSelection();
        pushSnapshot();
      });
    } else if (name === 'add') {
      drawerArea.innerHTML = `
        <div class="zn-add-grid">
          <button type="button" class="zn-add-tile" data-zadd="photos"><span class="zn-add-svg">${ZN_SVG.image}</span><small>Photos</small></button>
          <button type="button" class="zn-add-tile" data-zadd="camera"><span class="zn-add-svg">${ZN_SVG.camera}</span><small>Camera</small></button>
          <button type="button" class="zn-add-tile" data-zadd="doodle"><span class="zn-add-svg">${ZN_SVG.doodle}</span><small>Doodle</small></button>
          <button type="button" class="zn-add-tile" data-zadd="sheet"><span class="zn-add-svg">${ZN_SVG.table}</span><small>Spreadsheet</small></button>
          <button type="button" class="zn-add-tile" data-zadd="files"><span class="zn-add-svg">${ZN_SVG.file}</span><small>Files</small></button>
          <button type="button" class="zn-add-tile" data-zadd="scan"><span class="zn-add-svg">${ZN_SVG.scan}</span><small>Scan Docs</small></button>
        </div>`;
      $$('[data-zadd]', drawerArea).forEach(b => b.onclick = () => {
        const act = b.dataset.zadd;
        toggleDrawer('add');
        if (act === 'photos') {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = 'image/*';
          inp.multiple = true;
          inp.onchange = async () => {
            for (const f of Array.from(inp.files || []).slice(0, 6)) {
              const url = await fileToImageDataUrl(f, { maxDim: 1280, quality: 0.82 });
              insertImageBlock(url, f.name);
            }
          };
          inp.click();
        } else if (act === 'camera') {
          openQuickCameraForNote(false, url => insertImageBlock(url, 'Camera Photo'));
        } else if (act === 'doodle') {
          openDoodlePadModal(url => insertImageBlock(url, 'Doodle'));
        } else if (act === 'sheet') {
          insertSpreadsheetBlock(2, 2);
        } else if (act === 'scan') {
          openQuickCameraForNote(true, url => insertImageBlock(url, 'Scanned Document'));
        } else if (act === 'files') {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.multiple = true;
          inp.onchange = async () => {
            for (const f of Array.from(inp.files || []).slice(0, 6)) {
              if (f.size > 1800000 && !f.type.startsWith('image/')) {
                toast(`${f.name}: files under 1.8 MB can be stored in E2EE notes`, 'warn');
                continue;
              }
              const isImg = f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name || '');
              const dataUrl = isImg
                ? await fileToImageDataUrl(f, { maxDim: 1280, quality: 0.82 })
                : await fileToCompactDataUrl(f);
              const thumbOrIco = isImg
                ? `<img class="zn-file-thumb" src="${dataUrl}" alt="${esc(f.name)}">`
                : `<span class="zn-file-ico">${ZN_SVG.file}</span>`;
              insertHtmlBlock(`
                <div class="zn-file-card" contenteditable="false">
                  <a class="zn-file-link" href="${dataUrl}" download="${esc(f.name)}">
                    ${thumbOrIco}
                    <span class="zn-file-meta">
                      <span class="zn-file-name">${esc(f.name)}</span>
                      <span class="zn-file-size">${fmtBytes(f.size)}</span>
                    </span>
                  </a>
                </div><p><br></p>`);
            }
          };
          inp.click();
        }
      });
    }
  };

  // Voice Note + SpeechRecognition Live Transcription
  let voiceRec = null;
  let voiceStream = null;
  let voiceChunks = [];
  let voiceTimer = null;
  let voiceSec = 0;
  let voicePaused = false;
  let speechRec = null;
  let transcriptParts = [];

  const stopVoiceCapture = () => {
    clearInterval(voiceTimer);
    voiceTimer = null;
    try { speechRec?.stop(); } catch {}
    speechRec = null;
    try { voiceStream?.getTracks().forEach(t => t.stop()); } catch {}
    voiceStream = null;
    $('#znVoiceRecBar', overlay).classList.add('hidden');
    $('#znBottomBar', overlay).classList.remove('hidden');
  };

  const startVoiceCapture = async () => {
    try {
      voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast('Microphone permission unavailable', 'err');
      return;
    }
    voiceChunks = [];
    voiceSec = 0;
    voicePaused = false;
    transcriptParts = [];
    $('#znRecClock', overlay).textContent = '00:00 / 05:00';
    $('#znLiveTranscript', overlay).textContent = 'Listening for speech…';
    $('#znBottomBar', overlay).classList.add('hidden');
    $('#znVoiceRecBar', overlay).classList.remove('hidden');
    if (activeDrawer) toggleDrawer(activeDrawer);

    try {
      voiceRec = new MediaRecorder(voiceStream, { audioBitsPerSecond: 32000 });
    } catch {
      voiceRec = new MediaRecorder(voiceStream);
    }
    voiceRec.ondataavailable = e => { if (e.data?.size) voiceChunks.push(e.data); };
    voiceRec.start(250);

    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechCtor) {
      try {
        speechRec = new SpeechCtor();
        speechRec.continuous = true;
        speechRec.interimResults = true;
        speechRec.onresult = ev => {
          let finalStr = '';
          let interim = '';
          for (let i = 0; i < ev.results.length; i++) {
            const txt = ev.results[i][0]?.transcript || '';
            if (ev.results[i].isFinal) finalStr += `${txt} `;
            else interim += txt;
          }
          transcriptParts = [finalStr.trim()];
          const preview = (finalStr + interim).trim();
          $('#znLiveTranscript', overlay).textContent = preview || 'Listening…';
        };
        speechRec.start();
      } catch {}
    }

    voiceTimer = setInterval(() => {
      if (voicePaused) return;
      voiceSec++;
      const mm = String(Math.floor(voiceSec / 60)).padStart(2, '0');
      const ss = String(voiceSec % 60).padStart(2, '0');
      $('#znRecClock', overlay).textContent = `${mm}:${ss} / 05:00`;
      if (voiceSec >= 300) $('#znVoiceKeep', overlay).click();
    }, 1000);
  };

  $('#znVoicePause', overlay).onclick = () => {
    if (!voiceRec) return;
    voicePaused = !voicePaused;
    try { voicePaused ? voiceRec.pause() : voiceRec.resume(); } catch {}
    $('#znVoicePause', overlay).textContent = voicePaused ? 'Resume' : 'Pause';
  };
  $('#znVoiceDiscard', overlay).onclick = () => {
    try { if (voiceRec?.state !== 'inactive') voiceRec.stop(); } catch {}
    voiceRec = null;
    stopVoiceCapture();
  };
  $('#znVoiceKeep', overlay).onclick = () => {
    if (!voiceRec) return;
    const recRef = voiceRec;
    const durLabel = `${String(Math.floor(voiceSec / 60)).padStart(2, '0')}:${String(voiceSec % 60).padStart(2, '0')}`;
    const transcript = (transcriptParts.join(' ') || $('#znLiveTranscript', overlay).textContent || '').trim();
    const cleanTranscript = transcript === 'Listening for speech…' || transcript === 'Listening…' ? '' : transcript;
    recRef.onstop = async () => {
      const blob = new Blob(voiceChunks, { type: recRef.mimeType || 'audio/webm' });
      const dataUrl = await fileToCompactDataUrl(blob);
      const customPlayerHtml = typeof window.renderCustomAudioPlayer === 'function'
        ? window.renderCustomAudioPlayer(dataUrl, { isVoice: true, title: `Voice Note · ${durLabel}`, duration: voiceSec })
        : `<audio controls src="${dataUrl}" preload="metadata" style="width:100%;height:36px"></audio>`;
      insertHtmlBlock(`
        <div class="zn-audio-card" contenteditable="false" data-dur="${voiceSec}">
          <div class="zn-audio-head">
            <strong>${ZN_SVG.mic} <span>Voice Note · ${durLabel}</span></strong>
          </div>
          ${customPlayerHtml}
          ${cleanTranscript ? `<div class="zn-audio-transcript"><b>Transcript:</b> ${esc(cleanTranscript)}</div>` : ''}
        </div><p><br></p>`);
    };
    try { recRef.stop(); } catch {}
    voiceRec = null;
    stopVoiceCapture();
  };

  $$('.zn-tb-btn', overlay).forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.zntb;
      if (k === 'check') {
        if (activeDrawer) toggleDrawer(activeDrawer);
        insertChecklistBlock();
        pushSnapshot();
      } else if (k === 'audio') {
        startVoiceCapture();
      } else {
        toggleDrawer(k);
      }
    };
  });

  // Close Skins / Format / Add drawers & floating menus whenever tapping outside
  overlay.addEventListener('pointerdown', e => {
    if (!popMenu.classList.contains('hidden') && !popMenu.contains(e.target) && !e.target.closest('.zn-tbl-col-handle,.zn-tbl-row-handle')) {
      closeFloatingPop();
    }
    if (!e.target.closest('.zn-table-wrap') && !popMenu.contains(e.target)) {
      hideAllTableHandles(null);
    }
    if (!activeDrawer) return;
    if (drawerArea && drawerArea.contains(e.target)) return;
    if (e.target.closest('#znBottomBar') || e.target.closest('[data-zntb]')) return;
    if (e.target.closest('.modal-back')) return;
    toggleDrawer(activeDrawer);
  });

  $('#znUndoBtn', overlay).onclick = () => {
    if (undoIdx > 0) {
      undoIdx--;
      editor.innerHTML = undoStack[undoIdx];
      normalizeEditorBlocks();
      updateCharMeta();
      syncHistoryButtons();
    } else {
      document.execCommand('undo');
    }
  };
  $('#znRedoBtn', overlay).onclick = () => {
    if (undoIdx < undoStack.length - 1) {
      undoIdx++;
      editor.innerHTML = undoStack[undoIdx];
      normalizeEditorBlocks();
      updateCharMeta();
      syncHistoryButtons();
    } else {
      document.execCommand('redo');
    }
  };

  let findMatches = [];
  let findActiveIdx = -1;
  const clearInNoteFindMarks = () => {
    titleIn.classList.remove('has-find-match');
    const marks = Array.from(editor.querySelectorAll('mark.zn-find-hl'));
    marks.forEach(mk => {
      const p = mk.parentNode;
      if (!p) return;
      p.replaceChild(document.createTextNode(mk.textContent || ''), mk);
      p.normalize();
    });
    findMatches = [];
    findActiveIdx = -1;
  };
  const activateFindMatch = (idx) => {
    if (!findMatches.length) return;
    findActiveIdx = ((idx % findMatches.length) + findMatches.length) % findMatches.length;
    findMatches.forEach((m, i) => {
      if (m.type === 'mark' && m.el) m.el.classList.toggle('active', i === findActiveIdx);
    });
    const cur = findMatches[findActiveIdx];
    const cntEl = $('#znFindCnt', overlay);
    if (cntEl) cntEl.textContent = `${findActiveIdx + 1} / ${findMatches.length}`;
    if (cur?.type === 'title') {
      titleIn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (cur?.el) {
      cur.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const runInNoteFind = (qRaw) => {
    clearInNoteFindMarks();
    const q = String(qRaw || '').trim();
    const cntEl = $('#znFindCnt', overlay);
    if (!q) {
      if (cntEl) cntEl.textContent = '';
      return;
    }
    const qLow = q.toLowerCase();
    const titleLow = (titleIn.value || '').toLowerCase();
    let tPos = 0;
    while (titleLow && (tPos = titleLow.indexOf(qLow, tPos)) !== -1) {
      findMatches.push({ type: 'title', start: tPos });
      titleIn.classList.add('has-find-match');
      tPos += Math.max(1, qLow.length);
    }

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('.zn-table-controls, .zn-audio-remove, .zn-media-remove, .zn-file-remove, button')) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.toLowerCase().includes(qLow) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const textNodes = [];
    let curNode;
    while ((curNode = walker.nextNode())) textNodes.push(curNode);

    for (const tn of textNodes) {
      const txt = tn.nodeValue;
      const low = txt.toLowerCase();
      let idx = 0;
      let matchIdx;
      const frag = document.createDocumentFragment();
      while ((matchIdx = low.indexOf(qLow, idx)) !== -1) {
        if (matchIdx > idx) frag.appendChild(document.createTextNode(txt.slice(idx, matchIdx)));
        const mk = document.createElement('mark');
        mk.className = 'zn-find-hl';
        mk.textContent = txt.slice(matchIdx, matchIdx + qLow.length);
        frag.appendChild(mk);
        findMatches.push({ type: 'mark', el: mk });
        idx = matchIdx + Math.max(1, qLow.length);
      }
      if (idx < txt.length) frag.appendChild(document.createTextNode(txt.slice(idx)));
      tn.parentNode?.replaceChild(frag, tn);
    }

    if (cntEl) {
      cntEl.textContent = findMatches.length
        ? `1 / ${findMatches.length}`
        : '0 matches';
    }
    if (findMatches.length) activateFindMatch(0);
  };

  $('#znFindClose', overlay).onclick = () => {
    clearInNoteFindMarks();
    const fIn = $('#znFindIn', overlay);
    if (fIn) fIn.value = '';
    const cntEl = $('#znFindCnt', overlay);
    if (cntEl) cntEl.textContent = '';
    $('#znFindBar', overlay).classList.add('hidden');
  };
  $('#znFindPrev', overlay).onclick = () => activateFindMatch(findActiveIdx - 1);
  $('#znFindNext', overlay).onclick = () => activateFindMatch(findActiveIdx + 1);
  $('#znFindIn', overlay).oninput = e => runInNoteFind(e.target.value);
  $('#znFindIn', overlay).onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (findMatches.length) activateFindMatch(findActiveIdx + (e.shiftKey ? -1 : 1));
    } else if (e.key === 'Escape') {
      $('#znFindClose', overlay).click();
    }
  };

  $('#znEdMoreBtn', overlay).onclick = () => {
    showModal('Note Actions', `
      <div class="col gap-s">
        <button type="button" class="zn-act-row" id="znMFind"><span class="zn-act-ico">${ZN_SVG.search}</span><span>Find in Note</span></button>
        <button type="button" class="zn-act-row" id="znMSkins"><span class="zn-act-ico">${ZN_SVG.skins}</span><span>Note Skins</span></button>
        <button type="button" class="zn-act-row" id="znMPin"><span class="zn-act-ico">${ZN_SVG.pin}</span><span>${notePinned ? 'Unpin Note' : 'Pin Note'}</span></button>
        <button type="button" class="zn-act-row" id="znMLock"><span class="zn-act-ico">${noteLocked ? ZN_SVG.unlock : ZN_SVG.lock}</span><span>${noteLocked ? 'Unlock Note' : 'Lock Note'}</span></button>
        ${noteId ? `<button type="button" class="zn-act-row danger" id="znMDel"><span class="zn-act-ico">${ZN_SVG.trash}</span><span>Delete Note</span></button>` : ''}
      </div>
    `, mb => {
      $('#znMFind', mb).onclick = () => { closeModal(); $('#znFindBar', overlay).classList.remove('hidden'); $('#znFindIn', overlay).focus(); };
      $('#znMSkins', mb).onclick = () => { closeModal(); toggleDrawer('skins'); };
      $('#znMPin', mb).onclick = () => {
        notePinned = !notePinned;
        $('#znPinnedTag', overlay)?.classList.toggle('hidden', !notePinned);
        closeModal();
      };
      $('#znMLock', mb).onclick = async () => {
        if (!(await ensureNotesLockPin())) return;
        noteLocked = !noteLocked;
        $('#znLockedTag', overlay)?.classList.toggle('hidden', !noteLocked);
        closeModal();
      };
      $('#znMDel', mb)?.addEventListener('click', async () => {
        closeModal();
        stopVoiceCapture();
        overlay.remove();
        await deleteWsItem(noteId).catch(() => {});
      });
    });
  };

  const commitAndClose = () => {
    if (isSaving) return;
    isSaving = true;
    clearInNoteFindMarks();
    const doneBtn = $('#znDoneBtn', overlay);
    if (doneBtn) {
      doneBtn.disabled = true;
      doneBtn.innerHTML = `<span class="zn-spin-dot"></span><span>Saving…</span>`;
    }
    normalizeEditorBlocks();
    const html = sanitizeNoteHtml(editor.innerHTML);
    const body = noteHtmlToPlainText(html);
    const title = titleIn.value.trim() || (body.split('\n')[0] || '').slice(0, 48) || 'Untitled';
    const nothingEntered = !noteId && !titleIn.value.trim() && !body && !/<(img|table|audio)\b/i.test(html);
    stopVoiceCapture();
    overlay.remove();
    if (nothingEntered) return;
    saveWsItem('note', {
      title,
      body,
      html,
      color: noteColor,
      skin: noteSkin,
      group: noteGroup,
      pinned: notePinned,
      locked: noteLocked,
      deleted: false
    }, noteId).catch(() => {});
  };
  overlay._commitAndClose = commitAndClose;

  $('#znAiBtn', overlay)?.addEventListener('click', () => {
    window.ZovioAI?.openNoteEditorAiMenu?.({
      noteTitle: titleIn.value.trim(),
      setNoteTitle: (t) => {
        if (t && (!titleIn.value.trim() || /^untitled/i.test(titleIn.value.trim()))) {
          titleIn.value = String(t).trim().slice(0, 140);
        }
      },
      getPlainText: () => noteHtmlToPlainText(editor.innerHTML),
      applyAiHtml: (newHtml, mode) => {
        const spacer = '<p><br></p>';
        const cleanNew = String(newHtml || '').trim();
        if (mode === 'summarize') {
          editor.innerHTML = `<div class="zn-ai-callout"><strong>AI Explanation</strong>${spacer}${cleanNew}</div>${spacer}<hr>${spacer}` + editor.innerHTML;
        } else if (mode === 'flashcards') {
          editor.innerHTML = editor.innerHTML + `${spacer}<hr>${spacer}<h2>Study Q&amp;A Flashcards</h2>${spacer}` + cleanNew;
        } else if (mode === 'append' && editor.innerHTML.trim()) {
          editor.innerHTML = editor.innerHTML + `${spacer}<hr>${spacer}` + cleanNew;
        } else {
          editor.innerHTML = cleanNew;
        }
        if (typeof pushSnapshot === 'function') pushSnapshot();
        if (typeof updateCharMeta === 'function') updateCharMeta();
      }
    });
  });

  $('#znShareBtn', overlay).onclick = () => {
    const html = sanitizeNoteHtml(editor.innerHTML);
    shareNoteToZovioChat({ title: titleIn.value.trim() || 'Untitled Note', html, body: noteHtmlToPlainText(html) });
  };
  $('#znDoneBtn', overlay).onclick = commitAndClose;
  $('#znBackBtn', overlay).onclick = commitAndClose;
}

// ==========================================================================
// 5. WHITEBOARD (Saved Boards Gallery + Rich Tools + Precision Dual-Mode Eraser)
// ==========================================================================
// 5. WHITEBOARD (Interactive Select, Move, Resize, Graphs, Notes & Tools)
// ==========================================================================
function renderWhiteboardTab(box) {
  const boards = S.workspace.filter(x => x.type === 'board').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!activeBoardId && boards.length) activeBoardId = boards[0].id;
  let activeBoard = boards.find(b => b.id === activeBoardId) || null;

  let tool = 'select'; // 'select' | 'pen' | 'hl' | 'line' | 'arrow' | 'rect' | 'circle' | 'graph' | 'sticky' | 'text' | 'erase'
  let eraseMode = 'pixel'; // 'pixel' | 'stroke'
  let color = '#7c5cff';
  let size = 4;
  let showGrid = true;
  let strokes = activeBoard?.strokes ? JSON.parse(JSON.stringify(activeBoard.strokes)) : [];
  let redoHistory = [];
  let boardTitle = activeBoard?.title || `Board #${boards.length + 1}`;

  // Selection & Manipulation State
  let selectedIdx = -1;
  let dragMode = null; // 'move' | 'resize' | 'draw'
  let resizeHandle = ''; // 'tl' | 'tr' | 'br' | 'bl'
  let dragStart = { x: 0, y: 0 };
  let origBounds = null;

  const colors = ['#7c5cff', '#ff5c8a', '#2ed3b7', '#ff9f43', '#4c8dff', '#ffffff', '#111322'];
  const wbToolSvgs = {
    select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7 16 2.5-6.5L20 11 4 4z"/></svg>',
    pan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>',
    hl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
    line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>',
    rect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/></svg>',
    circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>',
    graph: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    sticky: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    erase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>'
  };
  const tools = [
    ['select', 'Select'],
    ['pan', 'Scroll'],
    ['pen', 'Pen'],
    ['hl', 'Marker'],
    ['line', 'Line'],
    ['arrow', 'Arrow'],
    ['rect', 'Box'],
    ['circle', 'Circle'],
    ['graph', 'Chart'],
    ['sticky', 'Note'],
    ['text', 'Text'],
    ['erase', 'Eraser']
  ];

  box.innerHTML = `
    <div class="wb-layout">
      <div class="wb-sidebar-backdrop hidden" id="wbSidebarBackdrop"></div>
      <aside class="wb-sidebar" id="wbSidebar">
        <div class="row between">
          <strong>Saved Boards (${boards.length})</strong>
          <div class="row gap-xs">
            <button type="button" class="btn primary sm" id="wbNewBoardBtn">+ New</button>
            <button type="button" class="icon-btn wb-sidebar-close" id="wbSidebarCloseBtn" title="Close">${icon('close')}</button>
          </div>
        </div>
        <div class="col gap-xs" style="flex:1;overflow-y:auto">
          ${boards.map(b => `
            <div class="wb-board-item ${b.id === activeBoard?.id ? 'active' : ''}" data-bid="${b.id}">
              <div style="min-width:0;flex:1">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title || 'Untitled Board')}</div>
                <small class="muted">${(b.strokes || []).length} items · ${fmtTime(b.updatedAt)}</small>
              </div>
              <button type="button" class="icon-btn" data-delboard="${b.id}" title="Delete board" style="width:28px;height:28px">${icon('trash')}</button>
            </div>`).join('') || `<div class="muted" style="font-size:12px;padding:8px 2px">No saved whiteboards yet. Draw or add charts, notes & click <b>Save</b>!</div>`}
        </div>
      </aside>

      <div class="wb-wrap wb-ms-shell">
        <div class="wb-bar wb-ms-topbar">
          <div class="wb-bar-top-row">
            <button type="button" class="btn sm ghost wb-boards-toggle" id="wbBoardsToggleBtn" title="Saved Boards (${boards.length})">
              ${icon('folder')} <span class="wb-hide-xs">Boards</span><span class="wb-count-badge">${boards.length}</span>
            </button>
            <input id="wbTitleIn" value="${esc(boardTitle)}" placeholder="Board title…">
            <div class="wb-quick-acts">
              <button type="button" class="btn sm ghost wb-ico-btn" id="wbUndo" title="Undo (Ctrl+Z)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                <span class="wb-act-lbl">Undo</span>
              </button>
              <button type="button" class="btn sm ghost wb-ico-btn" id="wbRedo" title="Redo (Ctrl+Y)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
                <span class="wb-act-lbl">Redo</span>
              </button>
              <div class="wb-more-wrap">
                <button type="button" class="btn sm ghost wb-ico-btn wb-more-trigger" id="wbMoreActionsBtn" title="Board Options">${icon('more')}</button>
                <div class="wb-secondary-actions" id="wbSecondaryActions">
                  <button type="button" class="chip active" id="wbGridBtn">Dot Grid</button>
                  <button type="button" class="btn sm ghost" id="wbDelSelBtn" title="Delete selected object">${icon('trash')} Delete Item</button>
                  <button type="button" class="btn sm ghost" id="wbClear">Clear Canvas</button>
                  <button type="button" class="btn sm ghost" id="wbExport">Export PNG</button>
                </div>
              </div>
              <button type="button" class="btn sm primary" id="wbSave">
                ${icon('check')} <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        <div class="wb-canvas-box" id="wbCanvasBox">
          <div class="wb-canvas-scroll" id="wbCanvasScroll">
            <div class="wb-canvas-stage grid-bg" id="wbCanvasStage">
              <canvas id="wbCanvas"></canvas>
              <div id="wbEraserRing" class="wb-eraser-ring hidden"></div>
              <div id="wbOverlayLayer" class="wb-overlay-layer"></div>
            </div>
          </div>

          <button type="button" class="wb-scroll-space-btn" id="wbScrollSpaceBtn" title="Scroll down for more space">
            <span>↓ More Space</span>
          </button>

          <!-- Microsoft Whiteboard Floating Bottom Pill Toolbar -->
          <div class="wb-ms-dock-wrap" id="wbToolsDock">
            <div class="wb-style-popover wb-ms-flyout" id="wbStylePopover">
              <div class="wb-flyout-section">
                <span class="muted xs" style="font-weight:700">Ink Color</span>
                <div class="row gap-xs wb-flyout-colors" id="wbColors">
                  ${colors.map(c => `<button type="button" class="color-dot ${c === color ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
                </div>
              </div>
              <div class="wb-flyout-section">
                <div class="row between align-center" style="width:100%">
                  <span class="muted xs" style="font-weight:700">Thickness</span>
                  <span class="xs" id="wbFlyoutSizeVal" style="font-weight:800">${size}px</span>
                </div>
                <label class="row gap-xs wb-size-wrap" style="width:100%"><input id="wbSize" type="range" min="2" max="28" value="${size}"></label>
              </div>
            </div>

            <div class="wb-ms-dock">
              <div class="wb-tools-scroll">
                ${tools.map(([t, label]) => `
                  <button type="button" class="chip wb-tool-chip ${tool === t ? 'active' : ''}" data-tool="${t}" title="${label}">
                    <span class="wb-tool-ico">${wbToolSvgs[t] || ''}</span>
                    <span class="wb-tool-lbl">${label}</span>
                  </button>`).join('')}
              </div>
              <div class="wb-ms-dock-divider"></div>
              <button type="button" class="chip hidden wb-erase-mode-chip" id="wbEraseModeBtn" title="Switch eraser mode">Pixel</button>
              <button type="button" class="wb-style-pill-btn wb-ms-ink-btn" id="wbStyleToggleBtn" title="Ink Color &amp; Thickness">
                <span class="wb-style-swatch" id="wbActiveColorPreview" style="background:${color}"></span>
                <span id="wbSizeNumLabel">${size}px</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  hydrateIcons(box);

  const wbSidebar = $('#wbSidebar', box);
  const wbBackdrop = $('#wbSidebarBackdrop', box);
  const toggleBoardsDrawer = (open) => {
    const show = open === undefined ? !wbSidebar?.classList.contains('drawer-open') : Boolean(open);
    wbSidebar?.classList.toggle('drawer-open', show);
    wbBackdrop?.classList.toggle('hidden', !show);
  };
  $('#wbBoardsToggleBtn', box)?.addEventListener('click', () => toggleBoardsDrawer());
  $('#wbSidebarCloseBtn', box)?.addEventListener('click', () => toggleBoardsDrawer(false));
  wbBackdrop?.addEventListener('click', () => toggleBoardsDrawer(false));

  const stylePopover = $('#wbStylePopover', box);
  const secActions = $('#wbSecondaryActions', box);
  const toolsDock = $('#wbToolsDock', box);
  toolsDock?.addEventListener('pointerdown', e => e.stopPropagation());
  toolsDock?.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  $('#wbStyleToggleBtn', box)?.addEventListener('click', e => {
    e.stopPropagation();
    secActions?.classList.remove('menu-open');
    stylePopover?.classList.toggle('popover-open');
  });
  stylePopover?.addEventListener('pointerdown', e => e.stopPropagation());
  stylePopover?.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  stylePopover?.addEventListener('click', e => e.stopPropagation());
  $('#wbMoreActionsBtn', box)?.addEventListener('click', e => {
    e.stopPropagation();
    stylePopover?.classList.remove('popover-open');
    secActions?.classList.toggle('menu-open');
  });
  secActions?.addEventListener('click', e => {
    if (e.target.closest('button')) secActions.classList.remove('menu-open');
  });
  box.addEventListener('click', e => {
    if (!e.target.closest('#wbStylePopover, #wbStyleToggleBtn')) stylePopover?.classList.remove('popover-open');
    if (!e.target.closest('#wbSecondaryActions, #wbMoreActionsBtn')) secActions?.classList.remove('menu-open');
  });

  const canvasBox = $('#wbCanvasBox', box);
  const canvasScroll = $('#wbCanvasScroll', box);
  const canvasStage = $('#wbCanvasStage', box);
  const canvas = $('#wbCanvas', box);
  const eraserRing = $('#wbEraserRing', box);
  const overlayLayer = $('#wbOverlayLayer', box);
  const ctx = canvas.getContext('2d');
  let viewW = 800;
  let viewH = 2200;
  let vpW = 800;
  let vpH = 500;
  let extraStageH = 0;
  let dpr = 1;

  function resize() {
    const r = canvasScroll.getBoundingClientRect();
    vpW = Math.max(1, Math.round(r.width));
    vpH = Math.max(1, Math.round(r.height));
    let maxStrokeY = 0;
    for (const st of strokes) {
      const b = getStrokeBounds(st);
      if (b.y + b.h > maxStrokeY) maxStrokeY = b.y + b.h;
    }
    const targetH = Math.max(2200, Math.round(vpH * 2.4), Math.round(maxStrokeY + 600), extraStageH);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = vpW;
    viewH = targetH;
    canvasStage.style.width = `${viewW}px`;
    canvasStage.style.height = `${viewH}px`;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function ensureStageSpace(yPos) {
    if (yPos > viewH - 360) {
      extraStageH = Math.max(extraStageH, Math.ceil(yPos + 750));
      const savedTop = canvasScroll.scrollTop;
      resize();
      canvasScroll.scrollTop = savedTop;
    }
  }

  $('#wbScrollSpaceBtn', box)?.addEventListener('click', e => {
    e.stopPropagation();
    const nearBottom = (canvasScroll.scrollTop + canvasScroll.clientHeight) >= (viewH - 280);
    if (nearBottom) {
      extraStageH = Math.max(extraStageH, viewH + 900);
      const savedTop = canvasScroll.scrollTop;
      resize();
      canvasScroll.scrollTop = savedTop;
    }
    canvasScroll.scrollBy({ top: Math.max(240, Math.round(vpH * 0.65)), behavior: 'smooth' });
  });

  // ---------------- Bounds & Hit Testing ----------------
  function getStrokeBounds(s) {
    const pts = s.pts || [];
    if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
    if (s.tool === 'sticky') {
      const w = s.w || 200, h = s.h || 140;
      return { x: pts[0].x, y: pts[0].y, w, h };
    }
    if (s.tool === 'graph') {
      const w = s.w || 280, h = s.h || 185;
      return { x: pts[0].x, y: pts[0].y, w, h };
    }
    if (s.tool === 'text') {
      const fontSize = s.fontSize || Math.max(18, (s.size || 4) * 4);
      const fontWeight = s.bold === false ? '400' : '700';
      const fontStyle = s.italic ? 'italic ' : '';
      const fontFamily = s.fontFamily || '"Plus Jakarta Sans", sans-serif';
      const rawText = String(s.text || '');
      const lines = (rawText || 'Type text…').split('\n');
      const lineHeight = fontSize * 1.35;
      const padX = 14;
      const padY = 10;

      ctx.save();
      ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
      let maxLineW = 0;
      for (const line of lines) {
        const w = ctx.measureText(line || ' ').width;
        if (w > maxLineW) maxLineW = w;
      }
      ctx.restore();

      const calcW = Math.max(s.w || 0, Math.ceil(maxLineW + padX * 2), 140);
      const calcH = Math.max(s.h || 0, Math.ceil(lines.length * lineHeight + padY * 2), 42);
      const topY = s._topLeftCoords ? pts[0].y : (pts[0].y - fontSize);
      return { x: pts[0].x, y: topY, w: calcW, h: calcH };
    }
    let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = Math.max(8, (s.size || 4) / 2);
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.max(16, (maxX - minX) + pad * 2),
      h: Math.max(16, (maxY - minY) + pad * 2)
    };
  }

  function hitTestStroke(p, s) {
    const b = getStrokeBounds(s);
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }

  function hitTestHandles(p, b) {
    const sz = 12;
    const handles = {
      tl: { x: b.x, y: b.y },
      tr: { x: b.x + b.w, y: b.y },
      br: { x: b.x + b.w, y: b.y + b.h },
      bl: { x: b.x, y: b.y + b.h }
    };
    for (const [k, h] of Object.entries(handles)) {
      if (Math.abs(p.x - h.x) <= sz && Math.abs(p.y - h.y) <= sz) return k;
    }
    return '';
  }

  function redraw() {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    for (let i = 0; i < strokes.length; i++) {
      // While a text box is actively selected, #wbTextInput renders it live without double ghost text
      if (i === selectedIdx && strokes[i]?.tool === 'text') continue;
      drawStroke(ctx, strokes[i], i === selectedIdx);
    }
    // Draw selection handles (for non-text strokes, text is cleanly framed by its inline editor)
    if (selectedIdx >= 0 && strokes[selectedIdx] && tool === 'select') {
      if (strokes[selectedIdx].tool !== 'text') {
        const b = getStrokeBounds(strokes[selectedIdx]);
        drawSelectionBox(ctx, b);
      }
    }
    ctx.restore();
  }

  function drawSelectionBox(c, b) {
    c.save();
    c.strokeStyle = 'rgba(124, 92, 255, 0.75)';
    c.lineWidth = 1.5;
    c.setLineDash([5, 4]);
    c.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    c.restore();
  }

  function drawStroke(c, s, isSelected = false) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.size || 4;
    c.globalAlpha = s.tool === 'hl' ? 0.35 : 1;
    c.globalCompositeOperation = s.tool === 'erase' ? 'destination-out' : 'source-over';

    const pts = s.pts || [];
    if (!pts.length) { c.restore(); return; }

    // 1. TEXT OBJECT (Custom Fonts, Bold, Italic, Underline, Background & Resizing)
    if (s.tool === 'text') {
      const fontSize = s.fontSize || Math.max(18, (s.size || 4) * 4);
      const fontWeight = s.bold === false ? '400' : '700';
      const fontStyle = s.italic ? 'italic ' : '';
      const fontFamily = s.fontFamily || '"Plus Jakarta Sans", sans-serif';
      const rawText = String(s.text || '');
      if (!rawText.trim() && !isSelected) {
        c.restore();
        return;
      }
      const lines = (rawText || '').split('\n');
      const lineHeight = fontSize * 1.35;
      const padX = 14;
      const padY = 10;

      c.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
      c.textBaseline = 'top';

      let maxLineW = 0;
      for (const line of lines) {
        const m = c.measureText(line || ' ');
        if (m.width > maxLineW) maxLineW = m.width;
      }
      const bW = Math.max(s.w || 0, Math.ceil(maxLineW + padX * 2), 90);
      const bH = Math.max(s.h || 0, Math.ceil(lines.length * lineHeight + padY * 2), 38);
      const bx = pts[0].x;
      const by = s._topLeftCoords ? pts[0].y : (pts[0].y - fontSize);

      // Draw background and text on canvas when not actively being edited in the DOM overlay
      if (!isSelected) {
        if (s.bgColor && s.bgColor !== 'transparent') {
          c.save();
          c.fillStyle = s.bgColor;
          c.beginPath();
          c.roundRect ? c.roundRect(bx, by, bW, bH, 10) : c.rect(bx, by, bW, bH);
          c.fill();
          c.restore();
        }

        c.fillStyle = s.color || '#7c5cff';
        let ty = by + padY;
        for (const line of lines) {
          c.fillText(line, bx + padX, ty);
          if (s.underline && line.length) {
            const m = c.measureText(line);
            c.save();
            c.strokeStyle = s.color || '#7c5cff';
            c.lineWidth = Math.max(1.8, fontSize / 14);
            c.beginPath();
            c.moveTo(bx + padX, ty + fontSize * 1.06);
            c.lineTo(bx + padX + m.width, ty + fontSize * 1.06);
            c.stroke();
            c.restore();
          }
          ty += lineHeight;
        }
      }

      c.restore();
      return;
    }

    // 2. MICROSOFT WHITEBOARD STICKY NOTE
    if (s.tool === 'sticky') {
      const x = pts[0].x, y = pts[0].y, w = s.w || 200, h = s.h || 140;
      const noteColor = s.color === '#111322' ? '#ffda79' : s.color;

      // Card shadow
      c.shadowColor = 'rgba(0, 0, 0, 0.45)';
      c.shadowBlur = 16;
      c.shadowOffsetY = 6;

      // Note body
      c.fillStyle = noteColor;
      c.beginPath();
      c.roundRect ? c.roundRect(x, y, w, h, 14) : c.rect(x, y, w, h);
      c.fill();
      c.shadowColor = 'transparent';

      // Header Tape / Top Band
      c.fillStyle = 'rgba(0, 0, 0, 0.08)';
      c.beginPath();
      c.roundRect ? c.roundRect(x, y, w, 28, [14, 14, 0, 0]) : c.rect(x, y, w, 28);
      c.fill();

      // Top pin/header indicator
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.font = '700 11px sans-serif';
      c.fillText('📌 NOTE', x + 12, y + 18);

      // Note Text
      if (!isSelected) {
        c.fillStyle = '#111322';
        c.font = '600 13px "Plus Jakarta Sans", sans-serif';
        const words = String(s.text || 'Sticky Note').split(' ');
        let line = '', ly = y + 48;
        const maxChars = Math.max(12, Math.floor(w / 10));
        for (const wWord of words) {
          if ((line + wWord).length > maxChars) {
            c.fillText(line, x + 14, ly);
            line = wWord + ' ';
            ly += 18;
            if (ly > y + h - 14) break;
          } else {
            line += wWord + ' ';
          }
        }
        if (line && ly <= y + h - 14) c.fillText(line, x + 14, ly);
      }

      // Corner Fold
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.beginPath();
      c.moveTo(x + w - 18, y + h);
      c.lineTo(x + w, y + h - 18);
      c.lineTo(x + w - 18, y + h - 18);
      c.closePath();
      c.fill();

      c.restore();
      return;
    }

    // 3. MICROSOFT WHITEBOARD GRAPH OBJECT
    if (s.tool === 'graph') {
      const x = pts[0].x, y = pts[0].y, w = s.w || 290, h = s.h || 195;
      const gType = s.graphType || 'bar';
      if (!Array.isArray(s.data) || !s.data.length) {
        s.data = [
          { label: 'Q1', val: 32 },
          { label: 'Q2', val: 68 },
          { label: 'Q3', val: 45 },
          { label: 'Q4', val: 88 }
        ];
      }

      // Graph Card Background
      c.fillStyle = 'rgba(16, 20, 32, 0.94)';
      c.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.roundRect ? c.roundRect(x, y, w, h, 16) : c.rect(x, y, w, h);
      c.fill();
      c.stroke();

      // Card Header
      c.fillStyle = '#ffffff';
      c.font = '700 12.5px "Plus Jakarta Sans", sans-serif';
      c.fillText('📊' + (isSelected ? '' : ' ' + (s.title || (gType === 'bar' ? 'Performance Growth' : gType === 'line' ? 'Trend Line' : 'Distribution'))), x + 14, y + 24);

      // Plot Area
      const axX = x + 38, axY = y + 42, axW = w - 54, axH = h - 74;
      const originY = axY + axH;

      if (gType === 'pie') {
        const total = s.data.reduce((sum, d) => sum + (Number(d.val) || 0), 0) || 1;
        const pieRadius = Math.min(axW, axH) * 0.42;
        const pieCx = axX + pieRadius + 8;
        const pieCy = axY + axH / 2;
        const sliceColors = ['#7c5cff', '#ff5c8a', '#2ed3b7', '#ff9f43', '#4c8dff', '#e056fd', '#f9ca24', '#badc58'];
        let currentAngle = -Math.PI / 2;
        s.data.forEach((d, pi) => {
          const sliceAngle = (Math.max(0, Number(d.val)) / total) * Math.PI * 2;
          if (sliceAngle <= 0) return;
          c.beginPath();
          c.moveTo(pieCx, pieCy);
          c.arc(pieCx, pieCy, pieRadius, currentAngle, currentAngle + sliceAngle);
          c.closePath();
          c.fillStyle = sliceColors[pi % sliceColors.length];
          c.fill();
          currentAngle += sliceAngle;
        });
        // Center cutout
        c.beginPath();
        c.arc(pieCx, pieCy, pieRadius * 0.45, 0, Math.PI * 2);
        c.fillStyle = 'rgba(16, 20, 32, 0.96)';
        c.fill();
        // Legend on right
        const legX = pieCx + pieRadius + 18;
        let legY = axY + 12;
        s.data.forEach((d, pi) => {
          if (legY > originY + 8) return;
          c.fillStyle = sliceColors[pi % sliceColors.length];
          c.beginPath();
          c.roundRect ? c.roundRect(legX, legY - 8, 10, 10, 3) : c.rect(legX, legY - 8, 10, 10);
          c.fill();
          c.fillStyle = '#ffffff';
          c.font = '600 10.5px sans-serif';
          c.fillText(`${d.label || 'Item'}: ${d.val}`, legX + 16, legY);
          legY += 16;
        });
      } else {
        // Coordinate axes
        c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(axX, axY);
        c.lineTo(axX, originY);
        c.lineTo(axX + axW, originY);
        c.stroke();

        // Axis Arrowheads
        c.fillStyle = 'rgba(255, 255, 255, 0.4)';
        c.beginPath();
        c.moveTo(axX, axY - 2);
        c.lineTo(axX - 4, axY + 6);
        c.lineTo(axX + 4, axY + 6);
        c.closePath();
        c.fill();

        c.beginPath();
        c.moveTo(axX + axW + 2, originY);
        c.lineTo(axX + axW - 6, originY - 4);
        c.lineTo(axX + axW - 6, originY + 4);
        c.closePath();
        c.fill();

        // Dotted Grid lines
        c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        for (let gl = 1; gl <= 3; gl++) {
          const gly = originY - (axH / 4) * gl;
          c.beginPath();
          c.moveTo(axX, gly);
          c.lineTo(axX + axW, gly);
          c.stroke();
        }
        c.setLineDash([]);

        if (gType === 'line') {
          // Line Graph
          const maxVal = Math.max(...s.data.map(d => +d.val || 0), 10);
          const count = Math.max(2, s.data.length);
          const stepX = axW / (count - 1);

          c.beginPath();
          s.data.forEach((d, pi) => {
            const px = axX + pi * stepX;
            const py = originY - ((Number(d.val) || 0) / maxVal) * (axH * 0.85);
            if (pi === 0) c.moveTo(px, py); else c.lineTo(px, py);
          });
          c.strokeStyle = s.color || '#2ed3b7';
          c.lineWidth = 3;
          c.stroke();

          // Area Glow Fill
          const lastX = axX + (s.data.length - 1) * stepX;
          c.lineTo(lastX, originY);
          c.lineTo(axX, originY);
          c.closePath();
          c.fillStyle = 'rgba(46, 211, 183, 0.15)';
          c.fill();

          // Data circles & labels
          s.data.forEach((d, pi) => {
            const px = axX + pi * stepX;
            const py = originY - ((Number(d.val) || 0) / maxVal) * (axH * 0.85);
            c.fillStyle = '#ffffff';
            c.beginPath();
            c.arc(px, py, 4, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = 'rgba(255, 255, 255, 0.9)';
            c.font = '700 10px sans-serif';
            c.textAlign = 'center';
            c.fillText(String(d.val), px, py - 6);
            c.fillStyle = 'rgba(255, 255, 255, 0.65)';
            c.fillText(d.label || `P${pi + 1}`, px, originY + 14);
            c.textAlign = 'left';
          });
        } else {
          // Bar Chart (default)
          const maxVal = Math.max(...s.data.map(d => +d.val || 0), 10);
          const barSlot = axW / Math.max(1, s.data.length);
          const barW = Math.max(10, Math.min(42, barSlot * 0.58));

          s.data.forEach((d, bi) => {
            const bx = axX + bi * barSlot + (barSlot - barW) / 2;
            const bh = Math.max(4, ((Number(d.val) || 0) / maxVal) * (axH * 0.85));
            const by = originY - bh;

            // Gradient Bar
            const grad = c.createLinearGradient(0, by, 0, originY);
            grad.addColorStop(0, s.color || '#7c5cff');
            grad.addColorStop(1, '#ff5c8a');
            c.fillStyle = grad;
            c.beginPath();
            c.roundRect ? c.roundRect(bx, by, barW, bh, [6, 6, 0, 0]) : c.rect(bx, by, barW, bh);
            c.fill();

            // Value and label
            c.fillStyle = 'rgba(255, 255, 255, 0.9)';
            c.font = '700 10.5px sans-serif';
            c.textAlign = 'center';
            c.fillText(String(d.val), bx + barW / 2, by - 5);
            c.fillStyle = 'rgba(255, 255, 255, 0.65)';
            c.font = '600 10px sans-serif';
            c.fillText(d.label || `P${bi + 1}`, bx + barW / 2, originY + 14);
            c.textAlign = 'left';
          });
        }
      }

      c.restore();
      return;
    }

    // 4. SHAPES (RECT, CIRCLE, LINE, ARROW, PEN)
    c.beginPath();
    if (s.tool === 'rect' && pts.length >= 2) {
      const a = pts[0], b = pts[pts.length - 1];
      c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (s.tool === 'circle' && pts.length >= 2) {
      const a = pts[0], b = pts[pts.length - 1];
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      c.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      c.stroke();
    } else if ((s.tool === 'line' || s.tool === 'arrow') && pts.length >= 2) {
      const a = pts[0], b = pts[pts.length - 1];
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      if (s.tool === 'arrow') {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = Math.max(10, (s.size || 4) * 3);
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
        c.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
        c.closePath();
        c.fill();
      }
    } else {
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
    }
    c.restore();
  }

  function eraseStrokeAtPoint(p, radius) {
    const before = strokes.length;
    strokes = strokes.filter(s => {
      if (s.tool === 'erase') return true;
      return !(s.pts || []).some(pt => Math.hypot(pt.x - p.x, pt.y - p.y) <= radius + (s.size || 4));
    });
    if (strokes.length !== before) {
      selectedIdx = -1;
      redraw();
    }
  }

  let cur = null;
  let _wbMoveRaf = null;
  const scheduleMoveRender = () => {
    if (_wbMoveRaf) return;
    _wbMoveRaf = requestAnimationFrame(() => {
      _wbMoveRaf = null;
      redraw();
      updateOverlay();
    });
  };
  const pt = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ---------------- Interactive Overlay Layer (Inline Editors & Controls) ----------------
  function updateOverlay() {
    if (selectedIdx < 0 || !strokes[selectedIdx] || tool !== 'select') {
      overlayLayer.innerHTML = '';
      return;
    }
    const s = strokes[selectedIdx];
    const b = getStrokeBounds(s);

    let html = '';

    // Action Confirmation: Tick and Cross at Bottom-Right (Text studio embeds its own in top bar)
    const isTextObj = s.tool === 'text';
    if (!isTextObj) {
      const actX = Math.max(8, Math.min(Math.max(8, viewW - 86), b.x + b.w - 78));
      const actY = Math.max(8, Math.min(Math.max(8, viewH - 68), b.y + b.h + 8));
      html += `
        <div class="wb-obj-actions-bottom-right" style="left:${actX}px;top:${actY}px">
          <button type="button" class="wb-action-btn keep" id="wbKeepObjBtn" title="Keep Object (Done)">✓</button>
          <button type="button" class="wb-action-btn discard" id="wbDiscardObjBtn" title="Discard Object (Delete)">✕</button>
        </div>
      `;
    }

    // Sticky Note Inline Controls
    if (s.tool === 'sticky') {
      const noteX = b.x + 10;
      const noteY = b.y + 34;
      const noteW = Math.max(100, b.w - 20);
      const noteH = Math.max(60, b.h - 44);
      html += `
        <div class="wb-note-color-bar" style="left:${Math.max(8, b.x)}px;top:${Math.max(6, b.y - 32)}px">
          ${['#ffda79', '#ff9ff3', '#55efc4', '#74b9ff', '#ffeaa7', '#a29bfe'].map(col => `
            <div class="wb-note-dot ${s.color === col ? 'active' : ''}" data-notecol="${col}" style="background:${col}"></div>
          `).join('')}
        </div>
        <textarea class="wb-inline-note-textarea" id="wbNoteTextarea" style="left:${noteX}px;top:${noteY}px;width:${noteW}px;height:${noteH}px" placeholder="Type your note here...">${esc(s.text || '')}</textarea>
      `;
    }

    // Graph Inline Controls & Data Panel
    if (s.tool === 'graph') {
      const titleX = b.x + 36;
      const titleY = b.y + 8;
      const titleW = Math.max(120, b.w - 50);

      let panelX = b.x;
      let panelY = b.y + b.h + 46;
      if (panelY + 240 > viewH) {
        if (b.x + b.w + 310 <= viewW) {
          panelX = b.x + b.w + 14;
          panelY = Math.max(10, b.y);
        } else {
          panelY = Math.max(10, b.y - 250);
        }
      }
      panelX = Math.max(8, Math.min(Math.max(8, viewW - 310), panelX));

      const gData = s.data || [];
      const gType = s.graphType || 'bar';

      html += `
        <input class="wb-inline-graph-title" id="wbGraphTitleIn" style="left:${titleX}px;top:${titleY}px;width:${titleW}px" value="${esc(s.title || 'Performance Growth')}" placeholder="Graph Title…">
        
        <div class="wb-graph-data-panel" style="left:${panelX}px;top:${panelY}px">
          <div class="wb-gpanel-head">
            <span>📊 Graph Data & Type</span>
            <div class="wb-gpanel-types">
              <button type="button" class="wb-gtype-btn ${gType === 'bar' ? 'active' : ''}" data-gtype="bar">Bar</button>
              <button type="button" class="wb-gtype-btn ${gType === 'line' ? 'active' : ''}" data-gtype="line">Line</button>
              <button type="button" class="wb-gtype-btn ${gType === 'pie' ? 'active' : ''}" data-gtype="pie">Pie</button>
            </div>
          </div>
          <div class="wb-gpanel-list" id="wbGDataList">
            ${gData.map((d, di) => `
              <div class="wb-gdata-row" data-di="${di}">
                <input class="wb-gdata-lbl" type="text" value="${esc(d.label)}" placeholder="Label" data-didx="${di}" data-dfield="label">
                <input class="wb-gdata-val" type="number" value="${d.val}" placeholder="Value" data-didx="${di}" data-dfield="val">
                <button type="button" class="wb-gdata-del" data-ddel="${di}" title="Delete point">✕</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="wb-gdata-add-btn" id="wbGAddPointBtn">+ Add Data Point</button>
        </div>
      `;
    }

    // Text Object Inline Controls & Formatting Toolbar
    if (s.tool === 'text') {
      const currentFontSize = s.fontSize || Math.max(18, (s.size || 4) * 4);
      const isBold = s.bold !== false;
      const isItalic = !!s.italic;
      const isUnderline = !!s.underline;
      const currentFont = s.fontFamily || '"Plus Jakarta Sans", sans-serif';
      const currentBg = s.bgColor || '';
      const isNarrow = viewW < 600;
      const maxBoxW = Math.max(140, viewW - 20);
      const textW = Math.min(maxBoxW, Math.max(168, b.w));
      const textH = Math.max(46, b.h);
      const minTextTop = isNarrow ? 64 : 62;
      const maxTextTop = Math.max(minTextTop, viewH - textH - 86);
      const textX = Math.max(8, Math.min(Math.max(8, viewW - textW - 8), b.x));
      const textY = Math.max(minTextTop, Math.min(maxTextTop, b.y));
      s.pts[0].x = textX;
      s.pts[0].y = textY;
      s._topLeftCoords = true;

      const tbMaxW = isNarrow ? Math.max(220, viewW - 16) : Math.min(540, Math.max(240, viewW - 16));
      let tbY = isNarrow ? Math.max(8, (canvasScroll?.scrollTop || 0) + 8) : (textY - 56);
      if (!isNarrow && tbY < 8) tbY = textY + textH + 40;
      const tbX = isNarrow ? 8 : Math.max(8, Math.min(Math.max(8, viewW - tbMaxW - 8), textX));

      html += `
        <div class="wb-text-toolbar ${isNarrow ? 'is-compact' : ''}" id="wbTextToolbar" style="left:${tbX}px;top:${tbY}px;max-width:${tbMaxW}px">
          <!-- Font Style -->
          <select class="wb-text-font-select" id="wbTextFontSelect" title="Font Family">
            <option value='"Plus Jakarta Sans", sans-serif' ${currentFont.includes('Jakarta') ? 'selected' : ''}>Sans</option>
            <option value='Georgia, "Times New Roman", serif' ${currentFont.includes('Georgia') || currentFont.includes('serif') ? 'selected' : ''}>Serif</option>
            <option value='"Courier New", monospace' ${currentFont.includes('monospace') || currentFont.includes('Courier') ? 'selected' : ''}>Mono</option>
            <option value='"Comic Sans MS", "Caveat", cursive' ${currentFont.includes('cursive') || currentFont.includes('Comic') ? 'selected' : ''}>Script</option>
            <option value='Impact, sans-serif' ${currentFont.includes('Impact') ? 'selected' : ''}>Impact</option>
          </select>

          <!-- Font Size Controls -->
          <div class="wb-text-size-wrap">
            <button type="button" class="wb-tb-btn" id="wbTextSizeDec" title="Decrease size">−</button>
            <input type="number" min="12" max="140" class="wb-text-size-input" id="wbTextSizeIn" value="${currentFontSize}" title="Font size in px">
            <button type="button" class="wb-tb-btn" id="wbTextSizeInc" title="Increase size">+</button>
          </div>

          <div class="wb-tb-sep"></div>

          <!-- Bold, Italic, Underline -->
          <button type="button" class="wb-tb-btn ${isBold ? 'active' : ''}" id="wbTextBoldBtn" title="Bold (B)"><b>B</b></button>
          <button type="button" class="wb-tb-btn ${isItalic ? 'active' : ''}" id="wbTextItalicBtn" title="Italic (I)"><i>I</i></button>
          <button type="button" class="wb-tb-btn ${isUnderline ? 'active' : ''}" id="wbTextUnderlineBtn" title="Underline (U)"><u>U</u></button>

          <div class="wb-tb-sep"></div>

          <!-- Text Color Quick Dots -->
          <div class="wb-text-colors" title="Text Color">
            ${['#7c5cff', '#ff5c8a', '#2ed3b7', '#ff9f43', '#4c8dff', '#ffffff', '#0f111a'].map(c => `
              <div class="wb-tcol-dot ${s.color === c ? 'active' : ''}" data-tcol="${c}" style="background:${c};${c === '#ffffff' ? 'border:1px solid #aaa' : ''}"></div>
            `).join('')}
          </div>

          <div class="wb-tb-sep"></div>

          <!-- Background / Highlight Selector -->
          <div class="wb-text-bg-wrap" title="Text Background Highlight">
            <span style="font-size:10.5px;font-weight:700;opacity:0.75">BG</span>
            ${[
              ['', 'None (Transparent)', 'transparent'],
              ['rgba(255, 234, 115, 0.5)', 'Soft Yellow', '#ffd700'],
              ['rgba(124, 92, 255, 0.3)', 'Soft Purple', '#7c5cff'],
              ['rgba(255, 92, 138, 0.3)', 'Soft Pink', '#ff5c8a'],
              ['rgba(46, 211, 183, 0.3)', 'Soft Teal', '#2ed3b7'],
              ['rgba(15, 18, 30, 0.88)', 'Dark Glass', '#111322'],
              ['rgba(255, 255, 255, 0.95)', 'Clean White', '#ffffff']
            ].map(([bgVal, bgTitle, dotCol]) => `
              <div class="wb-bg-dot ${currentBg === bgVal ? 'active' : ''}" data-tbg="${bgVal}" title="${bgTitle}" style="background:${dotCol};${dotCol === '#ffffff' || dotCol === 'transparent' ? 'border:1px solid #aaa' : ''}"></div>
            `).join('')}
          </div>
        </div>

        <div class="wb-text-studio-box" id="wbTextStudioBox" style="left:${textX}px;top:${textY}px;width:${textW}px;max-width:${maxBoxW}px">
          <div class="wb-text-drag-grip" id="wbTextDragGrip" title="Drag to reposition text anywhere on the board">
            <span class="wb-text-drag-label">⠿ Move</span>
            <div class="wb-text-head-actions">
              <button type="button" class="wb-head-act-btn discard" id="wbDiscardObjBtn" title="Delete text">✕</button>
              <button type="button" class="wb-head-act-btn keep" id="wbKeepObjBtn" title="Done">✓ Done</button>
            </div>
          </div>
          <textarea class="wb-inline-text-in" id="wbTextInput" spellcheck="false" placeholder="Type text…" style="width:100%;min-height:${textH}px;font-size:${currentFontSize}px;font-family:${currentFont};font-weight:${isBold ? '700' : '400'};font-style:${isItalic ? 'italic' : 'normal'};text-decoration:${isUnderline ? 'underline' : 'none'};color:${s.color || '#7c5cff'};background:${currentBg || 'transparent'}">${esc(s.text || '')}</textarea>
        </div>
      `;
    }

    // 4 Corner Interactive Resize Handles on selected object (skip for text studio which has its own drag header & resize)
    if (s.tool !== 'text') {
      html += `
        <div class="wb-dom-resize-handle tl" data-wb-handle="tl" style="left:${b.x - 7}px;top:${b.y - 7}px" title="Drag to resize"></div>
        <div class="wb-dom-resize-handle tr" data-wb-handle="tr" style="left:${b.x + b.w - 7}px;top:${b.y - 7}px" title="Drag to resize"></div>
        <div class="wb-dom-resize-handle br" data-wb-handle="br" style="left:${b.x + b.w - 7}px;top:${b.y + b.h - 7}px" title="Drag to resize"></div>
        <div class="wb-dom-resize-handle bl" data-wb-handle="bl" style="left:${b.x - 7}px;top:${b.y + b.h - 7}px" title="Drag to resize"></div>
      `;
    }

    overlayLayer.innerHTML = html;

    // Corner handle pointer listeners
    $$('.wb-dom-resize-handle', overlayLayer).forEach(hEl => {
      hEl.onpointerdown = e => {
        e.stopPropagation();
        const ti = $('#wbTextInput', overlayLayer);
        if (ti && s.tool === 'text') s.text = ti.value;
        dragMode = 'resize';
        resizeHandle = hEl.dataset.wbHandle;
        dragStart = pt(e);
        origBounds = { ...getStrokeBounds(s) };
        if (s.tool === 'text') {
          s.baseFontSize = s.fontSize || Math.max(18, (s.size || 4) * 4);
        }
        canvas.setPointerCapture(e.pointerId);
      };
    });

    // Keep text input focused when tapping toolbar controls
    const textTb = $('#wbTextToolbar', overlayLayer);
    if (textTb) {
      textTb.onpointerdown = e => {
        e.stopPropagation();
        if (!e.target.closest('select, input')) e.preventDefault();
      };
    }

    // Dedicated Drag Grip for Text Box (ignoring Done/Delete buttons inside bar)
    const textGrip = $('#wbTextDragGrip', overlayLayer);
    if (textGrip) {
      textGrip.onpointerdown = e => {
        if (e.target.closest('button')) return;
        e.stopPropagation();
        e.preventDefault();
        const ti = $('#wbTextInput', overlayLayer);
        if (ti && s.tool === 'text') s.text = ti.value;
        dragMode = 'move';
        dragStart = pt(e);
        canvas.setPointerCapture(e.pointerId);
      };
    }

    // Action button listeners
    const keepBtn = $('#wbKeepObjBtn', overlayLayer);
    if (keepBtn) {
      keepBtn.onclick = () => {
        const ti = $('#wbTextInput', overlayLayer);
        if (ti && s.tool === 'text') {
          s.text = ti.value;
          if (!String(s.text || '').trim()) {
            strokes.splice(selectedIdx, 1);
          }
        }
        selectedIdx = -1;
        updateOverlay();
        redraw();
      };
    }

    const discardBtn = $('#wbDiscardObjBtn', overlayLayer);
    if (discardBtn) {
      discardBtn.onclick = () => {
        if (selectedIdx >= 0) {
          strokes.splice(selectedIdx, 1);
          selectedIdx = -1;
          updateOverlay();
          redraw();
        }
      };
    }

    // Sticky Note listeners
    const noteTa = $('#wbNoteTextarea', overlayLayer);
    if (noteTa) {
      noteTa.oninput = e => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].text = e.target.value;
          redraw();
        }
      };
      $$('[data-notecol]', overlayLayer).forEach(dot => {
        dot.onclick = () => {
          if (selectedIdx >= 0 && strokes[selectedIdx]) {
            strokes[selectedIdx].color = dot.dataset.notecol;
            $$('[data-notecol]', overlayLayer).forEach(x => x.classList.toggle('active', x === dot));
            redraw();
          }
        };
      });
    }

    // Graph listeners
    const gTitle = $('#wbGraphTitleIn', overlayLayer);
    if (gTitle) {
      gTitle.oninput = e => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].title = e.target.value;
          redraw();
        }
      };
      $$('[data-gtype]', overlayLayer).forEach(b => {
        b.onclick = () => {
          if (selectedIdx >= 0 && strokes[selectedIdx]) {
            strokes[selectedIdx].graphType = b.dataset.gtype;
            $$('[data-gtype]', overlayLayer).forEach(x => x.classList.toggle('active', x === b));
            redraw();
          }
        };
      });

      $$('[data-dfield]', overlayLayer).forEach(inp => {
        inp.oninput = () => {
          const di = +inp.dataset.didx;
          const field = inp.dataset.dfield;
          if (selectedIdx >= 0 && strokes[selectedIdx] && strokes[selectedIdx].data && strokes[selectedIdx].data[di]) {
            strokes[selectedIdx].data[di][field] = field === 'val' ? (+inp.value || 0) : inp.value;
            redraw();
          }
        };
      });

      $$('[data-ddel]', overlayLayer).forEach(btn => {
        btn.onclick = () => {
          const di = +btn.dataset.ddel;
          if (selectedIdx >= 0 && strokes[selectedIdx] && strokes[selectedIdx].data) {
            strokes[selectedIdx].data.splice(di, 1);
            redraw();
            updateOverlay();
          }
        };
      });

      const addPointBtn = $('#wbGAddPointBtn', overlayLayer);
      if (addPointBtn) {
        addPointBtn.onclick = () => {
          if (selectedIdx >= 0 && strokes[selectedIdx]) {
            if (!strokes[selectedIdx].data) strokes[selectedIdx].data = [];
            const num = strokes[selectedIdx].data.length + 1;
            strokes[selectedIdx].data.push({ label: `Item ${num}`, val: Math.floor(Math.random() * 60) + 20 });
            redraw();
            updateOverlay();
          }
        };
      }
    }

    const syncTextareaSize = (ti, s) => {
      if (!ti) return;
      const nb = getStrokeBounds(s);
      const studioBox = $('#wbTextStudioBox', overlayLayer);
      const maxW = Math.max(140, viewW - 16);
      const nextW = Math.min(maxW, Math.max(160, nb.w));
      const nextH = Math.max(44, nb.h);
      if (studioBox) {
        studioBox.style.width = `${nextW}px`;
      }
      ti.style.width = '100%';
      ti.style.height = `${nextH}px`;
      const handles = {
        tl: { x: nb.x - 7, y: nb.y - 7 },
        tr: { x: nb.x + nb.w - 7, y: nb.y - 7 },
        br: { x: nb.x + nb.w - 7, y: nb.y + nb.h - 7 },
        bl: { x: nb.x - 7, y: nb.y + nb.h - 7 }
      };
      for (const [k, pos] of Object.entries(handles)) {
        const hEl = $(`.wb-dom-resize-handle.${k}`, overlayLayer);
        if (hEl) {
          hEl.style.left = `${pos.x}px`;
          hEl.style.top = `${pos.y}px`;
        }
      }
      const actEl = $('.wb-obj-actions-bottom-right', overlayLayer);
      if (actEl) {
        actEl.style.left = `${Math.max(8, Math.min(Math.max(8, viewW - 96), nb.x + nb.w - 86))}px`;
        actEl.style.top = `${Math.max(8, Math.min(Math.max(8, viewH - 68), nb.y + nb.h + 10))}px`;
      }
    };

    // Live Text Formatting Helper: updates styles in real time without destroying DOM
    const applyLiveTextFormatting = (s) => {
      const ti = $('#wbTextInput', overlayLayer);
      if (!ti) return;
      const fontSize = s.fontSize || Math.max(18, (s.size || 4) * 4);
      const isBold = s.bold !== false;
      const isItalic = !!s.italic;
      const isUnderline = !!s.underline;
      const font = s.fontFamily || '"Plus Jakarta Sans", sans-serif';
      const col = s.color || '#7c5cff';
      const bg = s.bgColor || 'transparent';

      ti.style.fontFamily = font;
      ti.style.fontSize = `${fontSize}px`;
      ti.style.fontWeight = isBold ? '700' : '400';
      ti.style.fontStyle = isItalic ? 'italic' : 'normal';
      ti.style.textDecoration = isUnderline ? 'underline' : 'none';
      ti.style.color = col;
      ti.style.background = bg;

      // Update Toolbar Controls
      $('#wbTextBoldBtn', overlayLayer)?.classList.toggle('active', isBold);
      $('#wbTextItalicBtn', overlayLayer)?.classList.toggle('active', isItalic);
      $('#wbTextUnderlineBtn', overlayLayer)?.classList.toggle('active', isUnderline);
      const fontSelEl = $('#wbTextFontSelect', overlayLayer);
      if (fontSelEl) fontSelEl.value = font;
      const sizeInEl = $('#wbTextSizeIn', overlayLayer);
      if (sizeInEl && document.activeElement !== sizeInEl) sizeInEl.value = fontSize;

      $$('[data-tcol]', overlayLayer).forEach(dot => dot.classList.toggle('active', dot.dataset.tcol === col));
      $$('[data-tbg]', overlayLayer).forEach(dot => dot.classList.toggle('active', (dot.dataset.tbg || '') === (s.bgColor || '')));

      syncTextareaSize(ti, s);
      redraw();
    };

    // Text object listeners & formatting actions
    const textIn = $('#wbTextInput', overlayLayer);
    if (textIn) {
      syncTextareaSize(textIn, s);
      textIn.oninput = () => {
        s.text = textIn.value;
        syncTextareaSize(textIn, s);
        redraw();
      };
      textIn.onkeydown = e => {
        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || e.key === 'Escape') {
          e.preventDefault();
          s.text = textIn.value;
          if (!String(s.text || '').trim()) {
            strokes.splice(selectedIdx, 1);
          }
          selectedIdx = -1;
          updateOverlay();
          redraw();
        }
      };
    }

    const fontSel = $('#wbTextFontSelect', overlayLayer);
    if (fontSel) {
      fontSel.onchange = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].fontFamily = fontSel.value;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    }

    const sizeDec = $('#wbTextSizeDec', overlayLayer);
    const sizeInc = $('#wbTextSizeInc', overlayLayer);
    if (sizeDec && sizeInc) {
      sizeDec.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          const s = strokes[selectedIdx];
          s.fontSize = Math.max(12, (s.fontSize || 20) - 4);
          s.size = Math.round(s.fontSize / 4);
          applyLiveTextFormatting(s);
        }
      };
      sizeInc.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          const s = strokes[selectedIdx];
          s.fontSize = Math.min(120, (s.fontSize || 20) + 4);
          s.size = Math.round(s.fontSize / 4);
          applyLiveTextFormatting(s);
        }
      };
    }

    const sizeIn = $('#wbTextSizeIn', overlayLayer);
    if (sizeIn) {
      sizeIn.oninput = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          const val = Math.max(10, Math.min(140, +sizeIn.value || 18));
          strokes[selectedIdx].fontSize = val;
          strokes[selectedIdx].size = Math.round(val / 4);
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    }

    const boldBtn = $('#wbTextBoldBtn', overlayLayer);
    if (boldBtn) {
      boldBtn.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].bold = strokes[selectedIdx].bold === false ? true : false;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    }

    const italicBtn = $('#wbTextItalicBtn', overlayLayer);
    if (italicBtn) {
      italicBtn.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].italic = !strokes[selectedIdx].italic;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    }

    const underlineBtn = $('#wbTextUnderlineBtn', overlayLayer);
    if (underlineBtn) {
      underlineBtn.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].underline = !strokes[selectedIdx].underline;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    }

    $$('[data-tcol]', overlayLayer).forEach(dot => {
      dot.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].color = dot.dataset.tcol;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    });

    $$('[data-tbg]', overlayLayer).forEach(dot => {
      dot.onclick = () => {
        if (selectedIdx >= 0 && strokes[selectedIdx]) {
          strokes[selectedIdx].bgColor = dot.dataset.tbg;
          applyLiveTextFormatting(strokes[selectedIdx]);
        }
      };
    });
  }

  const activePointers = new Map();
  let panState = null;

  // Pointer Down
  canvas.onpointerdown = e => {
    window._wbPointerDown = true;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pan gesture works from any tool without accidental strokes
    if (activePointers.size >= 2) {
      if (cur && (!cur.pts || cur.pts.length <= 4)) {
        if (strokes[strokes.length - 1] === cur) strokes.pop();
        cur = null;
        redraw();
      }
      dragMode = 'pan';
      panState = { lastX: e.clientX, lastY: e.clientY };
      return;
    }

    // Dedicated Pan/Scroll tool
    if (tool === 'pan') {
      dragMode = 'pan';
      panState = { lastX: e.clientX, lastY: e.clientY };
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // Immediately save any currently active text input or sticky note before any selection change
    const curTextIn = $('#wbTextInput', overlayLayer);
    if (curTextIn && selectedIdx >= 0 && strokes[selectedIdx] && strokes[selectedIdx].tool === 'text') {
      strokes[selectedIdx].text = curTextIn.value;
      if (!String(strokes[selectedIdx].text || '').trim()) {
        strokes.splice(selectedIdx, 1);
        selectedIdx = -1;
      }
    }
    const curNoteTa = $('#wbNoteTextarea', overlayLayer);
    if (curNoteTa && selectedIdx >= 0 && strokes[selectedIdx] && strokes[selectedIdx].tool === 'sticky') {
      strokes[selectedIdx].text = curNoteTa.value || strokes[selectedIdx].text;
    }

    const p = pt(e);

    // SELECT TOOL: Select, Move, Resize, or Pan empty canvas space
    if (tool === 'select') {
      // Check handles on current selection first
      if (selectedIdx >= 0 && strokes[selectedIdx]) {
        const b = getStrokeBounds(strokes[selectedIdx]);
        const handle = hitTestHandles(p, b);
        if (handle) {
          dragMode = 'resize';
          resizeHandle = handle;
          dragStart = p;
          origBounds = { ...b };
          if (strokes[selectedIdx].tool === 'text') {
            strokes[selectedIdx].baseFontSize = strokes[selectedIdx].fontSize || Math.max(18, (strokes[selectedIdx].size || 4) * 4);
          }
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }

      // Hit test strokes in reverse (top to bottom)
      let found = -1;
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (hitTestStroke(p, strokes[i])) {
          found = i;
          break;
        }
      }

      selectedIdx = found;
      updateOverlay();
      if (found >= 0) {
        dragMode = 'move';
        dragStart = p;
        canvas.setPointerCapture(e.pointerId);
      } else {
        dragMode = 'pan';
        panState = { lastX: e.clientX, lastY: e.clientY };
        try { canvas.setPointerCapture(e.pointerId); } catch {}
      }
      redraw();
      return;
    }

    // GRAPH TOOL - Immediate canvas placement without prompt
    if (tool === 'graph') {
      strokes.push({
        tool: 'graph',
        graphType: 'bar',
        title: 'Performance Growth',
        color,
        size,
        w: 290,
        h: 195,
        pts: [p],
        data: [
          { label: 'Q1', val: 32 },
          { label: 'Q2', val: 68 },
          { label: 'Q3', val: 45 },
          { label: 'Q4', val: 88 }
        ]
      });
      selectedIdx = strokes.length - 1;
      tool = 'select';
      $$('[data-tool]', box).forEach(b => b.classList.toggle('active', b.dataset.tool === 'select'));
      redraw();
      updateOverlay();
      return;
    }

    // STICKY NOTE TOOL - Immediate placement and auto-focus inline textarea
    if (tool === 'sticky') {
      strokes.push({
        tool: 'sticky',
        color: color === '#111322' ? '#ffda79' : color,
        size,
        text: 'Project Note:\nType your ideas here...',
        w: 210,
        h: 150,
        pts: [p]
      });
      selectedIdx = strokes.length - 1;
      tool = 'select';
      $$('[data-tool]', box).forEach(b => b.classList.toggle('active', b.dataset.tool === 'select'));
      redraw();
      updateOverlay();
      setTimeout(() => {
        const ta = $('#wbNoteTextarea', overlayLayer);
        if (ta) { ta.focus(); ta.select(); }
      }, 30);
      return;
    }

    // TEXT TOOL - Immediate placement and auto-focus inline input
    if (tool === 'text') {
      // If user clicked onto an existing text stroke while in Text tool, select and edit it!
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokes[i].tool === 'text' && hitTestStroke(p, strokes[i])) {
          selectedIdx = i;
          tool = 'select';
          $$('[data-tool]', box).forEach(b => b.classList.toggle('active', b.dataset.tool === 'select'));
          redraw();
          updateOverlay();
          setTimeout(() => {
            const ti = $('#wbTextInput', overlayLayer);
            if (ti) { ti.focus(); ti.setSelectionRange(ti.value.length, ti.value.length); }
          }, 30);
          return;
        }
      }

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const defaultTextColor = isLight && (color === '#ffffff' || color === '#111322') ? '#0f111a' : (color === '#111322' ? '#ffffff' : color);
      const minTopY = viewW < 600 ? 64 : 62;
      const clampX = Math.max(10, Math.min(Math.max(10, viewW - 178), p.x));
      const clampY = Math.max(minTopY, Math.min(Math.max(minTopY, viewH - 120), p.y));
      strokes.push({
        tool: 'text',
        _topLeftCoords: true,
        color: defaultTextColor,
        fontSize: Math.max(20, size * 5),
        size,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        bold: true,
        italic: false,
        underline: false,
        bgColor: '',
        text: '',
        pts: [{ x: clampX, y: clampY }]
      });
      selectedIdx = strokes.length - 1;
      tool = 'select';
      $$('[data-tool]', box).forEach(b => b.classList.toggle('active', b.dataset.tool === 'select'));
      eraserRing.classList.add('hidden');
      redraw();
      updateOverlay();
      setTimeout(() => {
        const ti = $('#wbTextInput', overlayLayer);
        if (ti) ti.focus();
      }, 30);
      return;
    }

    // ERASER
    canvas.setPointerCapture(e.pointerId);
    if (tool === 'erase' && eraseMode === 'stroke') {
      eraseStrokeAtPoint(p, size * 2.5);
      cur = { strokeEraser: true };
      return;
    }

    // DRAWING (pen, hl, line, arrow, rect, circle)
    const strokeSize = tool === 'erase' ? size * 3.5 : tool === 'hl' ? size * 3 : size;
    cur = { tool, color, size: strokeSize, pts: [p] };
    strokes.push(cur);
    selectedIdx = -1;
    updateOverlay();
    redraw();
  };

  // Pointer Move
  canvas.onpointermove = e => {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (dragMode === 'pan' && panState) {
      const dx = e.clientX - panState.lastX;
      const dy = e.clientY - panState.lastY;
      panState.lastX = e.clientX;
      panState.lastY = e.clientY;
      canvasScroll.scrollTop -= dy;
      canvasScroll.scrollLeft -= dx;
      return;
    }
    if (tool === 'pan') {
      canvas.style.cursor = 'grab';
      eraserRing.classList.add('hidden');
      return;
    }
    const p = pt(e);

    // Eraser Ring Cursor or Text Tool Preview Cursor
    if (tool === 'erase') {
      const d = size * 3.5;
      eraserRing.classList.remove('hidden');
      eraserRing.style.width = `${d}px`;
      eraserRing.style.height = `${d}px`;
      eraserRing.style.borderRadius = '50%';
      eraserRing.style.border = '2px solid rgba(255,255,255,0.7)';
      eraserRing.style.background = 'transparent';
      eraserRing.style.padding = '0';
      eraserRing.style.color = 'inherit';
      eraserRing.textContent = '';
      eraserRing.style.left = `${p.x}px`;
      eraserRing.style.top = `${p.y}px`;
    } else if (tool === 'text' && e.pointerType !== 'touch') {
      eraserRing.classList.remove('hidden');
      eraserRing.style.width = 'auto';
      eraserRing.style.height = 'auto';
      eraserRing.style.borderRadius = '8px';
      eraserRing.style.border = '1.5px dashed ' + color;
      eraserRing.style.background = 'rgba(15,18,30,0.85)';
      eraserRing.style.padding = '3px 8px';
      eraserRing.style.color = color;
      eraserRing.style.fontSize = `${Math.max(13, size * 3)}px`;
      eraserRing.textContent = 'Click to add text';
      eraserRing.style.left = `${p.x}px`;
      eraserRing.style.top = `${p.y}px`;
    } else {
      eraserRing.classList.add('hidden');
    }

    // SELECT TOOL: MOVE OR RESIZE
    if (tool === 'select') {
      if (dragMode === 'move' && selectedIdx >= 0 && strokes[selectedIdx]) {
        const dx = p.x - dragStart.x;
        const dy = p.y - dragStart.y;
        dragStart = p;
        const s = strokes[selectedIdx];
        const curTi = $('#wbTextInput', overlayLayer);
        if (curTi && s.tool === 'text') s.text = curTi.value;
        for (const ptItem of s.pts) {
          ptItem.x += dx;
          ptItem.y += dy;
        }
        scheduleMoveRender();
        return;
      }
      if (dragMode === 'resize' && selectedIdx >= 0 && strokes[selectedIdx] && origBounds) {
        const dx = p.x - dragStart.x;
        const dy = p.y - dragStart.y;
        const s = strokes[selectedIdx];
        const curTi = $('#wbTextInput', overlayLayer);
        if (curTi && s.tool === 'text') s.text = curTi.value;

        if (s.tool === 'sticky' || s.tool === 'graph') {
          if (resizeHandle === 'br') {
            s.w = Math.max(120, origBounds.w + dx);
            s.h = Math.max(90, origBounds.h + dy);
          } else if (resizeHandle === 'tr') {
            s.w = Math.max(120, origBounds.w + dx);
            s.h = Math.max(90, origBounds.h - dy);
            s.pts[0].y = origBounds.y + dy;
          } else if (resizeHandle === 'bl') {
            s.w = Math.max(120, origBounds.w - dx);
            s.h = Math.max(90, origBounds.h + dy);
            s.pts[0].x = origBounds.x + dx;
          } else if (resizeHandle === 'tl') {
            s.w = Math.max(120, origBounds.w - dx);
            s.h = Math.max(90, origBounds.h - dy);
            s.pts[0].x = origBounds.x + dx;
            s.pts[0].y = origBounds.y + dy;
          }
        } else if (s.tool === 'text') {
          s._topLeftCoords = true;
          const origW = origBounds.w || 140;
          let newW = origW;
          let newH = origBounds.h || 44;
          if (resizeHandle === 'br') {
            newW = Math.max(80, origBounds.w + dx);
            newH = Math.max(36, origBounds.h + dy);
          } else if (resizeHandle === 'tr') {
            newW = Math.max(80, origBounds.w + dx);
            newH = Math.max(36, origBounds.h - dy);
            s.pts[0].y = origBounds.y + dy;
          } else if (resizeHandle === 'bl') {
            newW = Math.max(80, origBounds.w - dx);
            newH = Math.max(36, origBounds.h + dy);
            s.pts[0].x = origBounds.x + dx;
          } else if (resizeHandle === 'tl') {
            newW = Math.max(80, origBounds.w - dx);
            newH = Math.max(36, origBounds.h - dy);
            s.pts[0].x = origBounds.x + dx;
            s.pts[0].y = origBounds.y + dy;
          }
          const scale = Math.max(0.4, Math.min(4, newW / origW));
          const baseSize = s.baseFontSize || s.fontSize || 20;
          s.fontSize = Math.max(12, Math.min(120, Math.round(baseSize * scale)));
          s.size = Math.round(s.fontSize / 4);
          s.w = newW;
          s.h = newH;
        } else if (s.pts.length >= 2) {
          // Shapes: scale endpoint
          const last = s.pts[s.pts.length - 1];
          last.x += dx;
          last.y += dy;
          dragStart = p;
        }
        redraw();
        updateOverlay();
        return;
      }

      // Cursor preview
      if (selectedIdx >= 0 && strokes[selectedIdx]) {
        const b = getStrokeBounds(strokes[selectedIdx]);
        const h = hitTestHandles(p, b);
        if (h === 'tl' || h === 'br') canvas.style.cursor = 'nwse-resize';
        else if (h === 'tr' || h === 'bl') canvas.style.cursor = 'nesw-resize';
        else if (hitTestStroke(p, strokes[selectedIdx])) canvas.style.cursor = 'move';
        else canvas.style.cursor = 'default';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    if (!cur) return;
    if (cur.strokeEraser) {
      eraseStrokeAtPoint(p, size * 2.5);
      return;
    }
    cur.pts.push(p);
    ensureStageSpace(p.y);
    redraw();
  };

  // Pointer Up & Cancel
  const endPointer = e => {
    window._wbPointerDown = false;
    if (e?.pointerId !== undefined) activePointers.delete(e.pointerId);
    if (dragMode === 'pan') {
      panState = null;
      dragMode = null;
      canvas.style.cursor = tool === 'pan' ? 'grab' : 'default';
      return;
    }
    cur = null;
    dragMode = null;
    panState = null;
    origBounds = null;
    updateOverlay();
  };
  canvas.onpointerup = endPointer;
  canvas.onpointercancel = endPointer;
  canvas.onpointerleave = e => {
    if (e?.pointerId !== undefined) activePointers.delete(e.pointerId);
    eraserRing.classList.add('hidden');
  };

  // Double Click with Select tool focuses inline input
  canvas.ondblclick = () => {
    if (tool !== 'select' || selectedIdx < 0) return;
    updateOverlay();
    const ta = $('#wbNoteTextarea', overlayLayer);
    if (ta) { ta.focus(); return; }
    const gt = $('#wbGraphTitleIn', overlayLayer);
    if (gt) { gt.focus(); return; }
    const ti = $('#wbTextInput', overlayLayer);
    if (ti) { ti.focus(); return; }
  };

  // Delete key deletes selected item
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx >= 0) {
      strokes.splice(selectedIdx, 1);
      selectedIdx = -1;
      updateOverlay();
      redraw();
    }
  });

  $('#wbDelSelBtn', box).onclick = () => {
    if (selectedIdx >= 0) {
      strokes.splice(selectedIdx, 1);
      selectedIdx = -1;
      updateOverlay();
      redraw();
    } else {
      toast('Select an item first to delete it', 'err');
    }
  };

  $$('[data-tool]', box).forEach(b => b.onclick = () => {
    tool = b.dataset.tool;
    $$('[data-tool]', box).forEach(x => x.classList.toggle('active', x === b));
    $('#wbEraseModeBtn', box).classList.toggle('hidden', tool !== 'erase');
    if (tool !== 'erase') eraserRing.classList.add('hidden');
    if (tool !== 'select') selectedIdx = -1;
    canvas.style.cursor = tool === 'pan' ? 'grab' : (tool === 'select' ? 'default' : 'crosshair');
    updateOverlay();
    redraw();
  });

  $('#wbEraseModeBtn', box).onclick = e => {
    eraseMode = eraseMode === 'pixel' ? 'stroke' : 'pixel';
    e.currentTarget.textContent = eraseMode === 'pixel' ? 'Mode: Pixel Brush' : 'Mode: Whole Object';
  };

  $$('#wbColors button', box).forEach(b => b.onclick = () => {
    color = b.dataset.c;
    $$('#wbColors button', box).forEach(x => x.classList.toggle('active', x === b));
    const sw = $('#wbActiveColorPreview', box);
    if (sw) sw.style.background = color;
    if (selectedIdx >= 0 && strokes[selectedIdx]) {
      strokes[selectedIdx].color = color;
      const ti = $('#wbTextInput', overlayLayer);
      if (ti && strokes[selectedIdx].tool === 'text') ti.style.color = color;
      redraw();
    }
  });

  const wbSizeInput = $('#wbSize', box);
  if (wbSizeInput) {
    const syncSize = e => {
      e.stopPropagation();
      size = +e.target.value;
      const lbl = $('#wbSizeNumLabel', box);
      if (lbl) lbl.textContent = `${size}px`;
      const flyLbl = $('#wbFlyoutSizeVal', box);
      if (flyLbl) flyLbl.textContent = `${size}px`;
      if (selectedIdx >= 0 && strokes[selectedIdx]) {
        strokes[selectedIdx].size = size;
        if (strokes[selectedIdx].tool === 'text') {
          strokes[selectedIdx].fontSize = Math.max(16, size * 4);
        }
        redraw();
      }
    };
    wbSizeInput.addEventListener('input', syncSize);
    wbSizeInput.addEventListener('change', syncSize);
    wbSizeInput.addEventListener('pointerdown', e => e.stopPropagation());
    wbSizeInput.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    wbSizeInput.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  }
  $('#wbGridBtn', box).onclick = e => {
    showGrid = !showGrid;
    e.currentTarget.classList.toggle('active', showGrid);
    canvasStage.classList.toggle('grid-bg', showGrid);
  };
  $('#wbUndo', box).onclick = () => {
    if (strokes.length) {
      redoHistory.push(strokes.pop());
      selectedIdx = -1;
      updateOverlay();
      redraw();
    }
  };
  $('#wbRedo', box).onclick = () => {
    if (redoHistory.length) {
      strokes.push(redoHistory.pop());
      selectedIdx = strokes.length - 1;
      updateOverlay();
      redraw();
    }
  };
  $('#wbClear', box).onclick = () => {
    if (strokes.length) redoHistory.push(...strokes);
    strokes = [];
    selectedIdx = -1;
    updateOverlay();
    redraw();
  };

  const onWbKey = e => {
    if (e.target.matches('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        $('#wbRedo', box)?.click();
      } else {
        e.preventDefault();
        $('#wbUndo', box)?.click();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      $('#wbRedo', box)?.click();
    }
  };
  window.addEventListener('keydown', onWbKey);
  $('#wbExport', box).onclick = () => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;
    const octx = outCanvas.getContext('2d');
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    octx.fillStyle = isLight ? '#fbfcfd' : '#131722';
    octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    octx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.href = outCanvas.toDataURL('image/png');
    a.download = `${($('#wbTitleIn', box).value.trim() || 'whiteboard')}.png`;
    a.click();
  };

  $('#wbSave', box).onclick = async () => {
    const title = $('#wbTitleIn', box).value.trim() || 'Untitled Board';
    const savedId = await saveWsItem('board', { title, strokes }, activeBoard?.id || null);
    activeBoardId = savedId;
  };

  $('#wbNewBoardBtn', box).onclick = async () => {
    const title = prompt('Name your new Whiteboard:', `Board #${boards.length + 1}`);
    if (!title) return;
    const newId = await saveWsItem('board', { title: title.trim(), strokes: [] }, null);
    activeBoardId = newId;
  };

  $$('[data-bid]', box).forEach(el => el.onclick = e => {
    if (e.target.closest('[data-delboard]')) return;
    activeBoardId = el.dataset.bid;
    renderWhiteboardTab(box);
  });

  $$('[data-delboard]', box).forEach(b => b.onclick = async e => {
    e.stopPropagation();
    await deleteWsItem(b.dataset.delboard);
  });

  if (window._wbResizeFn) window.removeEventListener('resize', window._wbResizeFn);
  window._wbResizeFn = resize;
  window.addEventListener('resize', resize);

  setTimeout(resize, 20);
}

// ---------------- Background Reminders & Event / Task Notification Scheduler ----------------
const WS_FIRED_ALERTS_KEY = 'zovio_fired_ws_alerts_v1';
function getFiredWsAlertsMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(WS_FIRED_ALERTS_KEY) || '{}');
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    const cleaned = {};
    for (const [k, ts] of Object.entries(raw || {})) {
      if (Number(ts) > cutoff) cleaned[k] = Number(ts);
    }
    return cleaned;
  } catch {
    return {};
  }
}

function markWsAlertFired(alertKey) {
  try {
    const map = getFiredWsAlertsMap();
    map[alertKey] = Date.now();
    localStorage.setItem(WS_FIRED_ALERTS_KEY, JSON.stringify(map));
  } catch {}
}

function buildUpcomingWorkspaceAlerts() {
  const list = Array.isArray(S?.workspace) ? S.workspace : [];
  const prefs = S?.user?.preferences || S?.user?.prefs || {};
  const leadMins = Number.isFinite(Number(prefs.notifyEventLeadMins)) ? Number(prefs.notifyEventLeadMins) : 15;
  const nowMs = Date.now();
  const maxAheadMs = nowMs + 48 * 3600 * 1000;
  const upcoming = [];

  for (const item of list) {
    if (!item || item.deleted || !item.id) continue;
    if (item.type === 'event' && prefs.notifyEvents !== false && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) {
      const hm = /^\d{2}:\d{2}$/.test(item.time || '') ? item.time : '10:00';
      const startMs = new Date(`${item.date}T${hm}:00`).getTime();
      if (!Number.isFinite(startMs)) continue;
      if (leadMins > 0) {
        const leadAt = startMs - leadMins * 60000;
        if (leadAt > nowMs - 90000 && leadAt <= maxAheadMs) {
          upcoming.push({
            key: `ev:${item.id}:lead:${leadMins}:${item.date}:${hm}`,
            atMs: Math.max(nowMs + 2000, leadAt),
            category: 'event',
            title: `Upcoming Event in ${leadMins}m`,
            body: `${item.title || 'Event'} (${hm})${item.notes ? ' · ' + item.notes : ''}`,
            tag: `ws-ev-${item.id}`
          });
        }
      }
      if (startMs > nowMs - 90000 && startMs <= maxAheadMs) {
        upcoming.push({
          key: `ev:${item.id}:start:${item.date}:${hm}`,
          atMs: Math.max(nowMs + 2000, startMs),
          category: 'event',
          title: 'Calendar Event Starting Now',
          body: `${item.title || 'Event'}${item.notes ? ' · ' + item.notes : ''}`,
          tag: `ws-ev-${item.id}`
        });
      }
    } else if (item.type === 'task' && prefs.notifyTasks !== false && item.status !== 'done' && /^\d{4}-\d{2}-\d{2}$/.test(item.due || '')) {
      const dueMs = new Date(`${item.due}T09:00:00`).getTime();
      if (Number.isFinite(dueMs) && dueMs > nowMs - 90000 && dueMs <= maxAheadMs) {
        upcoming.push({
          key: `task:${item.id}:${item.due}`,
          atMs: Math.max(nowMs + 2000, dueMs),
          category: 'task',
          title: 'Task Due Today',
          body: `${item.title || 'Task'} (${item.priority || 'medium'} priority)`,
          tag: `ws-task-${item.id}`
        });
      }
    }
  }
  return upcoming.sort((a, b) => a.atMs - b.atMs).slice(0, 40);
}

function checkDueWorkspaceAlerts() {
  if (!S?.user?.id || !Array.isArray(S?.workspace)) return;
  const prefs = S.user.preferences || S.user.prefs || {};
  if (prefs.winNotifications === false) return;
  const fired = getFiredWsAlertsMap();
  const nowMs = Date.now();
  const leadMins = Number.isFinite(Number(prefs.notifyEventLeadMins)) ? Number(prefs.notifyEventLeadMins) : 15;
  const dNow = new Date();
  const todayISO = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`;

  for (const item of S.workspace) {
    if (!item || item.deleted || !item.id) continue;
    if (item.type === 'event' && prefs.notifyEvents !== false && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) {
      const hm = /^\d{2}:\d{2}$/.test(item.time || '') ? item.time : '10:00';
      const startMs = new Date(`${item.date}T${hm}:00`).getTime();
      if (!Number.isFinite(startMs)) continue;
      if (leadMins > 0) {
        const leadAt = startMs - leadMins * 60000;
        const leadKey = `ev:${item.id}:lead:${leadMins}:${item.date}:${hm}`;
        if (!fired[leadKey] && nowMs >= leadAt && nowMs <= leadAt + 150000) {
          markWsAlertFired(leadKey);
          showDesktopNotification?.(`Upcoming Event in ${leadMins}m`, {
            category: 'event',
            tag: `ws-ev-${item.id}`,
            body: `${item.title || 'Event'} at ${hm}`
          });
        }
      }
      const startKey = `ev:${item.id}:start:${item.date}:${hm}`;
      if (!fired[startKey] && nowMs >= startMs && nowMs <= startMs + 150000) {
        markWsAlertFired(startKey);
        showDesktopNotification?.('Calendar Event Starting', {
          category: 'event',
          tag: `ws-ev-${item.id}`,
          body: `${item.title || 'Event'}${item.notes ? ' · ' + item.notes : ''}`
        });
      }
    } else if (item.type === 'task' && prefs.notifyTasks !== false && item.status !== 'done' && item.due === todayISO) {
      const taskKey = `task:${item.id}:${todayISO}`;
      if (!fired[taskKey] && dNow.getHours() >= 9) {
        markWsAlertFired(taskKey);
        showDesktopNotification?.('Task Due Today', {
          category: 'task',
          tag: `ws-task-${item.id}`,
          body: `${item.title || 'Task'} (${item.priority || 'medium'} priority)`
        });
      }
    }
  }
}

let _wsNotifInterval = null;
function syncZovioWorkspaceNotifications() {
  checkDueWorkspaceAlerts();
  if (!_wsNotifInterval) {
    _wsNotifInterval = setInterval(checkDueWorkspaceAlerts, 30000);
  }
  if (typeof isZovioPhoneHost === 'function' && isZovioPhoneHost() && window.ZovioAndroid?.syncWorkspaceReminders) {
    const alerts = buildUpcomingWorkspaceAlerts();
    window.ZovioAndroid.syncWorkspaceReminders(alerts).catch(() => {});
  }
}
window.syncZovioWorkspaceNotifications = syncZovioWorkspaceNotifications;

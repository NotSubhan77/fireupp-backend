/* ==========================================================================
   Tele — FireSpace (Today, Sleek Tasks, 4-Layout Calendar, Notes, Saved Whiteboards)
   ========================================================================== */

let wsTab = 'today';
let calCursor = new Date();
let calLayout = 'month'; // 'month' | 'week' | 'agenda' | 'year'
let clockTimer = null;
let activeBoardId = null;

async function loadWorkspace() {
  const raw = await api('/api/workspace').catch(() => []);
  const out = [];
  for (const r of raw) {
    try {
      const data = await E2E.decryptJSON(S.vaultKey, { iv: r.iv, ct: r.ct });
      out.push({ id: r.id, type: r.type, createdAt: r.createdAt, updatedAt: r.updatedAt, ...data });
    } catch { /* skip undecryptable */ }
  }
  S.workspace = out;
  if (S.view === 'workspace') renderWorkspaceView();
}

async function saveWsItem(type, payload, id = null) {
  const box = await E2E.encryptJSON(S.vaultKey, payload);
  let savedId = id;
  if (id) {
    const r = await api(`/api/workspace/${id}`, { method: 'PUT', body: box });
    const idx = S.workspace.findIndex(x => x.id === id);
    if (idx >= 0) S.workspace[idx] = { ...S.workspace[idx], ...payload, updatedAt: r.updatedAt };
  } else {
    const r = await api('/api/workspace', { method: 'POST', body: { type, ...box } });
    savedId = r.id;
    S.workspace.push({ id: r.id, type, createdAt: r.createdAt, updatedAt: r.updatedAt, ...payload });
  }
  renderWorkspaceView();
  return savedId;
}

async function deleteWsItem(id) {
  await api(`/api/workspace/${id}`, { method: 'DELETE' });
  S.workspace = S.workspace.filter(x => x.id !== id);
  if (activeBoardId === id) activeBoardId = null;
  renderWorkspaceView();
}

function renderWorkspaceView() {
  const root = $('#view-workspace');
  if (!root) return;
  clearInterval(clockTimer);

  const tabs = [
    ['today', 'sun', 'Today'],
    ['tasks', 'check', 'Tasks'],
    ['calendar', 'calendar', 'Calendar'],
    ['notes', 'note', 'Notes'],
    ['board', 'board', 'Whiteboard']
  ];

  root.innerHTML = `
    <header class="ws-head">
      <div class="row gap-m">
        <h2 style="font-size:21px;font-weight:800">FireSpace 🔥</h2>
        <span class="pill">Personal Space</span>
      </div>
      <div class="ws-tabs">
        ${tabs.map(([k, ic, label]) => `<button class="${wsTab === k ? 'active' : ''}" data-wstab="${k}">${icon(ic)} <span>${label}</span></button>`).join('')}
      </div>
    </header>
    <div class="ws-body" id="wsBody"></div>`;

  $$('[data-wstab]', root).forEach(b => b.onclick = () => { wsTab = b.dataset.wstab; renderWorkspaceView(); });

  const body = $('#wsBody');
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
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const hr = now.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  const tasks = S.workspace.filter(x => x.type === 'task' && x.status !== 'done');
  const events = S.workspace.filter(x => x.type === 'event' && x.date === todayISO).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const notes = S.workspace.filter(x => x.type === 'note').slice(-4).reverse();

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
        <form id="focusTaskForm" class="row gap-xs">
          <input id="quickTaskIn" placeholder="Type a focus task for today…" style="flex:1">
          <select id="quickTaskPrio" style="width:98px;padding:10px 8px">
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
    const inp = $('#quickTaskIn', box);
    const val = inp.value.trim();
    const prio = $('#quickTaskPrio', box).value;
    if (!val) {
      openQuickFocusTaskModal(todayISO);
      return;
    }
    inp.value = '';
    await saveWsItem('task', { title: val, status: 'todo', priority: prio, due: todayISO, tag: 'Focus' });
    toast('Focus task added!');
  };

  $$('[data-done]', box).forEach(el => el.onclick = async () => {
    const t = S.workspace.find(x => x.id === el.dataset.done);
    if (t) {
      await saveWsItem('task', { ...t, status: 'done' }, t.id);
      toast('Focus task completed! 🎉');
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
      toast('Focus task added!');
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

  box.innerHTML = `
    <div class="task-stats-row">
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">Total Tasks</div><b>${allTasks.length}</b></div><span class="pill">Tasks</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">To Do</div><b style="color:var(--amber)">${todoCnt}</b></div><span class="pill amber">Queued</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">In Progress</div><b style="color:var(--brand)">${doingCnt}</b></div><span class="pill">Active</span></div>
      <div class="stat-pill-card"><div><div class="muted" style="font-size:12px">Completion</div><b style="color:var(--green)">${pct}%</b></div><span class="pill green">${doneCnt} Done</span></div>
    </div>

    <form class="task-composer-card" id="taskCreateForm">
      <input id="tTitle" class="task-title-in" placeholder="✨ What needs to get done? Type a task title…">
      <input id="tTag" placeholder="Tag (e.g. Design, Dev)" style="width:155px">
      <input id="tDue" type="date" value="${todayISO}" style="width:155px">
      <select id="tPrio" style="width:140px">
        <option value="high">🔥 High Priority</option>
        <option value="medium" selected>⚡ Medium</option>
        <option value="low">🌱 Low Priority</option>
      </select>
      <button type="submit" class="btn primary" id="tAddBtn" style="padding:11px 18px">+ Add Task</button>
    </form>

    <div class="row between wrap gap-s" style="margin-bottom:16px">
      <div class="row gap-xs">
        <span class="muted" style="font-size:12px;margin-right:4px">Filter priority:</span>
        ${[['all', 'All'], ['high', '🔥 High'], ['medium', '⚡ Medium'], ['low', '🌱 Low']].map(([k, label]) =>
          `<button type="button" class="chip ${taskFilterPrio === k ? 'active' : ''}" data-tf="${k}">${label}</button>`
        ).join('')}
      </div>
    </div>

    ${!tasks.length ? `
      <div class="no-content-box">
        <div class="nc-ico">${icon('check')}</div>
        <h4>No Content Found</h4>
        <p>${allTasks.length ? 'No tasks match your selected priority filter.' : 'Your FireSpace task board is empty. Add your first task above!'}</p>
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

  hydrateIcons(box);

  $$('[data-tf]', box).forEach(b => b.onclick = () => {
    taskFilterPrio = b.dataset.tf;
    renderTasksTab(box);
  });

  $('#taskCreateForm', box).onsubmit = async e => {
    e.preventDefault();
    const title = $('#tTitle', box).value.trim();
    if (!title) return toast('Enter a task title first', 'err');
    await saveWsItem('task', {
      title,
      tag: $('#tTag', box).value.trim(),
      status: 'todo',
      priority: $('#tPrio', box).value,
      due: $('#tDue', box).value
    });
    toast('Task added to FireSpace');
  };

  $$('[data-cycle]', box).forEach(el => el.onclick = () => {
    const t = S.workspace.find(x => x.id === el.dataset.cycle);
    if (!t) return;
    const next = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
    saveWsItem('task', { ...t, status: next }, t.id);
  });
  $$('[data-del]', box).forEach(el => el.onclick = () => deleteWsItem(el.dataset.del));
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
        <div class="cal-cell ${iso === todayISO ? 'today' : ''}" data-date="${iso}">
          <div class="row between"><span class="cal-num">${d}</span>${dayEvs.length ? `<span class="pill" style="font-size:10px;padding:1px 6px;border-radius:6px;background:rgba(124,92,255,0.2);color:#a78bfa">${dayEvs.length} event${dayEvs.length > 1 ? 's' : ''}</span>` : ''}</div>
          ${dayEvs.slice(0, 3).map(e => `
            <div class="cal-ev" data-evid="${e.id}" title="${esc(e.title)}${e.time ? ` at ${e.time}` : ''}${e.notes ? ` — ${e.notes}` : ''}">
              <span class="cal-ev-dot"></span>
              <span style="font-weight:700;opacity:0.9">${esc(e.time || '')}</span>
              <span style="overflow:hidden;text-overflow:ellipsis">${esc(e.title)}</span>
            </div>
          `).join('')}
          ${dayEvs.length > 3 ? `<div class="muted xs" style="font-weight:700;margin-top:auto">+${dayEvs.length - 3} more</div>` : ''}
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
          <div class="task-card" style="align-items:center" data-date="${esc(e.date)}">
            <span class="pill ${e.date === todayISO ? 'green' : ''}" style="min-width:105px;justify-content:center">${esc(e.date)}</span>
            <span class="pill amber">${esc(e.time || 'All day')}</span>
            <div style="flex:1">
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
    <div class="row between wrap gap-s" style="margin-bottom:16px">
      <div class="row gap-s">
        <button class="btn sm" id="calPrev">← Prev</button>
        <button class="btn sm ghost" id="calTodayBtn">Today</button>
        <h3 style="font-size:18px;font-weight:800;min-width:180px;text-align:center">${headerTitle}</h3>
        <button class="btn sm" id="calNext">Next →</button>
      </div>
      <div class="row gap-s wrap">
        <div class="ws-tabs">
          ${[['month', '🗓️ Month'], ['week', '📆 Week'], ['agenda', '📋 Agenda'], ['year', '🌐 Year']].map(([k, lbl]) =>
            `<button type="button" class="${calLayout === k ? 'active' : ''}" data-callayout="${k}">${lbl}</button>`
          ).join('')}
        </div>
        <button class="btn primary sm" id="newEvBtn">+ New Event</button>
      </div>
    </div>
    ${bodyHTML}`;

  hydrateIcons(box);

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
    <div class="col gap-m" style="min-width:min(420px, 86vw)">
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div class="row between align-center">
          <div class="row gap-xs align-center">
            <span class="cal-ev-dot" style="width:10px;height:10px;background:#38ef7d;border-radius:50%;display:inline-block;box-shadow:0 0 10px #38ef7d"></span>
            <strong style="font-size:16px;color:#fff">${esc(e.title)}</strong>
          </div>
          <span class="pill xs" style="background:rgba(124,92,255,0.22);color:#c4b5fd;font-weight:700">${esc(e.time || 'All day')}</span>
        </div>

        <div class="row gap-xs align-center muted xs" style="color:var(--text-1)">
          <span>📅 ${esc(formattedDate)}</span>
          <span>·</span>
          <span>⏰ ${esc(e.time || 'All day')}</span>
        </div>

        ${e.notes ? `
          <div style="margin-top:4px;padding:12px 14px;background:rgba(0,0,0,0.25);border-radius:12px;border:1px solid rgba(255,255,255,0.06);font-size:13px;line-height:1.55;color:#cbd5e1;white-space:pre-wrap">
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
      toast('Event deleted');
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
    <div class="col gap-m" style="min-width:min(440px, 86vw)">
      <div style="background:linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 35px rgba(0,0,0,0.35)">
        <label class="col gap-xs">
          <span class="muted" style="font-size:12px;font-weight:700">Event Title *</span>
          <input id="ceTitle" value="${esc(initTitle)}" placeholder="e.g. Design Sync / Workout / Team Call" style="height:42px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:14px">
        </label>

        <div class="row gap-s">
          <label style="flex:1" class="col gap-xs">
            <span class="muted" style="font-size:12px;font-weight:700">Date</span>
            <input id="ceDate" type="date" value="${initDate}" style="height:42px;padding:0 12px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff">
          </label>
          <label style="flex:1" class="col gap-xs">
            <span class="muted" style="font-size:12px;font-weight:700">Time</span>
            <input id="ceTime" type="time" value="${initTime}" style="height:42px;padding:0 12px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff">
          </label>
        </div>

        <label class="col gap-xs">
          <span class="muted" style="font-size:12px;font-weight:700">Description / Room Link Notes</span>
          <textarea id="ceNotes" rows="3" placeholder="Optional details, agenda, or meet link…" style="padding:10px 14px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff;resize:vertical;font-size:13px">${esc(initNotes)}</textarea>
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
      const title = $('#ceTitle', mbox).value.trim();
      if (!title) return toast('Enter an event title', 'err');
      const date = $('#ceDate', mbox).value || initialDateISO;
      const time = $('#ceTime', mbox).value || '10:00';
      const notes = $('#ceNotes', mbox).value.trim();

      if (isEdit && existingEvent) {
        await updateWsItem(existingEvent.id, { title, date, time, notes });
        toast('Event updated!');
      } else {
        await saveWsItem('event', { title, date, time, notes });
        toast('Event added!');
      }
      closeModal();
      if (onRefresh) onRefresh();
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
      <div class="col gap-m" style="min-width:min(460px, 88vw)">
        <div class="row between align-center" style="padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <div>
            <strong style="font-size:16px;display:block;color:#fff">${esc(formattedDate)}</strong>
            <span class="muted xs">${existing.length} scheduled event${existing.length === 1 ? '' : 's'}</span>
          </div>
          <button type="button" class="btn primary sm glow" id="modalAddNewEvBtn" style="padding:6px 14px;border-radius:10px;font-weight:700">
            <span>+ Add Event</span>
          </button>
        </div>

        <div class="col gap-xs cal-events-scroll-wrap" id="evListWrap" style="max-height:280px;overflow-y:auto;padding-right:4px">
          ${existing.map(e => `
            <div class="cal-event-detail-card" data-openev="${e.id}" style="padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:14px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;transition:all 0.16s ease">
              <div style="flex:1;min-width:0">
                <div class="row gap-xs align-center">
                  <span class="cal-ev-dot" style="width:8px;height:8px;background:#38ef7d;border-radius:50%;display:inline-block"></span>
                  <strong style="font-size:13.5px;color:#fff">${esc(e.title)}</strong>
                  <span class="pill xs" style="background:rgba(124,92,255,0.2);color:#a78bfa">${esc(e.time || 'All day')}</span>
                </div>
                ${e.notes ? `<div class="muted" style="font-size:12px;margin-top:4px;padding-left:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.notes)}</div>` : ''}
              </div>
              <button type="button" class="icon-btn" data-delev="${e.id}" title="Delete event" style="color:#ef4444;flex-shrink:0">${icon('trash')}</button>
            </div>
          `).join('') || '<div class="muted" style="padding:24px;text-align:center;font-size:13.5px">No events scheduled on this date yet. Click <b>+ Add Event</b> above to create one!</div>'}
        </div>

        <div class="row between align-center" style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px">
          <span class="muted xs">Click any event to view full details</span>
          <button type="button" class="btn ghost" id="closeEvModalBtn" style="height:38px;border-radius:12px">Done</button>
        </div>
      </div>
    `;

    hydrateIcons(mbox);

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
      toast('Event deleted');
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
// 4. NOTES (With "No Content Found" Empty State)
// ==========================================================================
function renderNotesTab(box) {
  const notes = S.workspace.filter(x => x.type === 'note').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  box.innerHTML = `
    <div class="row between wrap gap-s" style="margin-bottom:16px">
      <input id="noteSearch" placeholder="🔍 Search notes…" style="max-width:360px">
      <button class="btn primary" id="newNoteBtn">+ New Note</button>
    </div>
    <div id="notesContainer"></div>`;

  const draw = q => {
    const filtered = notes.filter(n => !q || (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q));
    const container = $('#notesContainer', box);
    if (!filtered.length) {
      container.innerHTML = `
        <div class="no-content-box">
          <div class="nc-ico">${icon('note')}</div>
          <h4>No Content Found</h4>
          <p>${notes.length ? 'No notes match your search query.' : 'You have not created any notes yet.'}</p>
          <button type="button" class="btn primary sm" id="emptyCreateNoteBtn">+ Create Note</button>
        </div>`;
      hydrateIcons(container);
      $('#emptyCreateNoteBtn', container).onclick = () => openNoteModal(null);
      return;
    }

    container.innerHTML = `<div class="notes-grid">${filtered.map(n => `
      <div class="note-card" data-nid="${n.id}" style="border-top:4px solid ${n.color || '#7c5cff'}">
        <div class="row between"><strong>${esc(n.title || 'Untitled')}</strong><small class="muted">${fmtTime(n.updatedAt)}</small></div>
        <p style="font-size:13px;color:var(--text-1);white-space:pre-wrap;flex:1">${esc((n.body || '').slice(0, 220))}</p>
      </div>`).join('')}</div>`;
    $$('[data-nid]', container).forEach(el => el.onclick = () => openNoteModal(notes.find(x => x.id === el.dataset.nid)));
  };
  draw('');
  $('#noteSearch', box).oninput = e => draw(e.target.value.trim().toLowerCase());
  $('#newNoteBtn', box).onclick = () => openNoteModal(null);
}

function openNoteModal(note) {
  const colors = ['#7c5cff', '#ff5c8a', '#2ed3b7', '#ff9f43', '#4c8dff'];
  let picked = note?.color || colors[0];
  showModal(note ? 'Edit Note' : 'New Note', `
    <input id="nTitle" placeholder="Note title" value="${esc(note?.title || '')}">
    <textarea id="nBody" rows="8" placeholder="Write your note here…">${esc(note?.body || '')}</textarea>
    <div class="row between">
      <div class="row gap-s" id="nColors">
        ${colors.map(c => `<button type="button" class="color-dot ${c === picked ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="row gap-s">
        ${note ? `<button class="btn danger sm" id="delNoteBtn">Delete</button>` : ''}
        <button class="btn primary" id="saveNoteBtn">Save Note</button>
      </div>
    </div>
  `, mbox => {
    $$('#nColors button', mbox).forEach(b => b.onclick = () => {
      picked = b.dataset.c;
      $$('#nColors button', mbox).forEach(x => x.classList.toggle('active', x === b));
    });
    if ($('#delNoteBtn', mbox)) $('#delNoteBtn', mbox).onclick = async () => { await deleteWsItem(note.id); closeModal(); };
    $('#saveNoteBtn', mbox).onclick = async () => {
      const title = $('#nTitle', mbox).value.trim() || 'Untitled';
      const body = $('#nBody', mbox).value;
      closeModal();
      await saveWsItem('note', { title, body, color: picked }, note?.id);
      toast('Note saved');
    };
  });
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
  const tools = [
    ['select', '👆 Select'],
    ['pen', '✏️ Pen'],
    ['hl', '🖍️ Highlight'],
    ['line', '╱ Line'],
    ['arrow', '↗ Arrow'],
    ['rect', '▭ Box'],
    ['circle', '◯ Circle'],
    ['graph', '📊 Graph'],
    ['sticky', '🟨 Note'],
    ['text', '🔤 Text'],
    ['erase', '⌫ Eraser']
  ];

  box.innerHTML = `
    <div class="wb-layout">
      <aside class="wb-sidebar">
        <div class="row between">
          <strong>Saved Boards (${boards.length})</strong>
          <button type="button" class="btn primary sm" id="wbNewBoardBtn">+ New</button>
        </div>
        <div class="col gap-xs" style="flex:1;overflow-y:auto">
          ${boards.map(b => `
            <div class="wb-board-item ${b.id === activeBoard?.id ? 'active' : ''}" data-bid="${b.id}">
              <div style="min-width:0;flex:1">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title || 'Untitled Board')}</div>
                <small class="muted">${(b.strokes || []).length} items · ${fmtTime(b.updatedAt)}</small>
              </div>
              <button type="button" class="icon-btn" data-delboard="${b.id}" title="Delete board" style="width:28px;height:28px">${icon('trash')}</button>
            </div>`).join('') || `<div class="muted" style="font-size:12px;padding:8px 2px">No saved whiteboards yet. Draw or add charts, notes & click <b>Save Board</b>!</div>`}
        </div>
      </aside>

      <div class="wb-wrap">
        <div class="wb-bar">
          <input id="wbTitleIn" value="${esc(boardTitle)}" placeholder="Board title…" style="width:140px;padding:6px 10px;font-weight:700">
          <div class="row gap-xs wrap">
            ${tools.map(([t, label]) => `<button type="button" class="chip ${tool === t ? 'active' : ''}" data-tool="${t}">${label}</button>`).join('')}
          </div>
          <button type="button" class="chip hidden" id="wbEraseModeBtn" title="Switch eraser mode">Mode: Pixel Brush</button>
          <div class="row gap-xs" id="wbColors">
            ${colors.map(c => `<button type="button" class="color-dot ${c === color ? 'active' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
          </div>
          <label class="row gap-xs"><span class="muted" style="font-size:12px">Size</span><input id="wbSize" type="range" min="2" max="28" value="${size}" style="width:70px"></label>
          <button type="button" class="chip active" id="wbGridBtn">Grid</button>
          <div class="spacer"></div>
          <button type="button" class="btn sm ghost" id="wbDelSelBtn" title="Delete selected object">${icon('trash')} Del</button>
          <button type="button" class="btn sm ghost" id="wbUndo" title="Undo (Ctrl+Z)">Undo</button>
          <button type="button" class="btn sm ghost" id="wbRedo" title="Redo (Ctrl+Y)">Redo</button>
          <button type="button" class="btn sm ghost" id="wbClear">Clear</button>
          <button type="button" class="btn sm ghost" id="wbExport">PNG</button>
          <button type="button" class="btn sm primary" id="wbSave">💾 Save Board</button>
        </div>

        <div class="wb-canvas-box grid-bg" id="wbCanvasBox">
          <canvas id="wbCanvas"></canvas>
          <div id="wbEraserRing" class="wb-eraser-ring hidden"></div>
          <div id="wbOverlayLayer" class="wb-overlay-layer"></div>
        </div>
      </div>
    </div>`;

  hydrateIcons(box);

  const canvasBox = $('#wbCanvasBox', box);
  const canvas = $('#wbCanvas', box);
  const eraserRing = $('#wbEraserRing', box);
  const overlayLayer = $('#wbOverlayLayer', box);
  const ctx = canvas.getContext('2d');

  function resize() {
    const r = canvasBox.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    redraw();
  }

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < strokes.length; i++) {
      drawStroke(ctx, strokes[i], i === selectedIdx);
    }
    // Draw selection handles (for non-text strokes, text is cleanly framed by its inline editor)
    if (selectedIdx >= 0 && strokes[selectedIdx] && tool === 'select') {
      if (strokes[selectedIdx].tool !== 'text') {
        const b = getStrokeBounds(strokes[selectedIdx]);
        drawSelectionBox(ctx, b);
      }
    }
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

    // Action Confirmation: Tick and Cross at Bottom-Right of the Object
    const isTextObj = s.tool === 'text';
    const actX = isTextObj
      ? Math.max(8, Math.min(canvas.width - 86, b.x))
      : Math.max(8, Math.min(canvas.width - 86, b.x + b.w - 78));
    const actY = isTextObj
      ? Math.max(8, Math.min(canvas.height - 46, b.y + b.h + 38))
      : Math.max(8, Math.min(canvas.height - 42, b.y + b.h + 8));
    html += `
      <div class="wb-obj-actions-bottom-right" style="left:${actX}px;top:${actY}px">
        <button type="button" class="wb-action-btn keep" id="wbKeepObjBtn" title="Keep Object (Done)">✓</button>
        <button type="button" class="wb-action-btn discard" id="wbDiscardObjBtn" title="Discard Object (Delete)">✕</button>
      </div>
    `;

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
      if (panelY + 240 > canvas.height) {
        if (b.x + b.w + 310 <= canvas.width) {
          panelX = b.x + b.w + 14;
          panelY = Math.max(10, b.y);
        } else {
          panelY = Math.max(10, b.y - 250);
        }
      }
      panelX = Math.max(8, Math.min(canvas.width - 310, panelX));

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
      const textX = Math.max(8, b.x);
      const textY = Math.max(8, b.y);
      const textW = Math.max(180, b.w);
      const textH = Math.max(44, b.h);

      let tbY = textY - 56;
      if (tbY < 8) tbY = textY + textH + 14;
      const tbX = Math.max(8, Math.min(canvas.width - 540, textX));

      html += `
        <div class="wb-text-toolbar" id="wbTextToolbar" style="left:${tbX}px;top:${tbY}px">
          <!-- Font Style -->
          <select class="wb-text-font-select" id="wbTextFontSelect" title="Font Family">
            <option value='"Plus Jakarta Sans", sans-serif' ${currentFont.includes('Jakarta') ? 'selected' : ''}>Sans-Serif (Modern)</option>
            <option value='Georgia, "Times New Roman", serif' ${currentFont.includes('Georgia') || currentFont.includes('serif') ? 'selected' : ''}>Serif (Classic)</option>
            <option value='"Courier New", monospace' ${currentFont.includes('monospace') || currentFont.includes('Courier') ? 'selected' : ''}>Monospace (Code)</option>
            <option value='"Comic Sans MS", "Caveat", cursive' ${currentFont.includes('cursive') || currentFont.includes('Comic') ? 'selected' : ''}>Handwriting</option>
            <option value='Impact, sans-serif' ${currentFont.includes('Impact') ? 'selected' : ''}>Impact (Display)</option>
          </select>

          <!-- Font Size Controls -->
          <div class="wb-text-size-wrap">
            <button type="button" class="wb-tb-btn" id="wbTextSizeDec" title="Decrease size">−</button>
            <input type="number" min="12" max="140" class="wb-text-size-input" id="wbTextSizeIn" value="${currentFontSize}" title="Direct font size in px">
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
            <span style="font-size:11px;font-weight:700;opacity:0.75">BG:</span>
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

        <div class="wb-text-studio-box" id="wbTextStudioBox" style="left:${textX}px;top:${textY}px;min-width:${textW}px">
          <div class="wb-text-drag-grip" id="wbTextDragGrip" title="Drag to reposition text anywhere on the board">
            <span>⠿ Drag to move</span>
            <span style="opacity:0.7;font-size:10px">Ctrl+Enter or ✓ when done</span>
          </div>
          <textarea class="wb-inline-text-in" id="wbTextInput" spellcheck="false" placeholder="Type text here…" style="min-width:${textW}px;min-height:${textH}px;font-size:${currentFontSize}px;font-family:${currentFont};font-weight:${isBold ? '700' : '400'};font-style:${isItalic ? 'italic' : 'normal'};text-decoration:${isUnderline ? 'underline' : 'none'};color:${s.color || '#7c5cff'};background:${currentBg || 'transparent'}">${esc(s.text || '')}</textarea>
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

    // Dedicated Drag Grip for Text Box
    const textGrip = $('#wbTextDragGrip', overlayLayer);
    if (textGrip) {
      textGrip.onpointerdown = e => {
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
        toast('Saved to whiteboard ✓', 'info');
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
          toast('Object removed');
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
      ti.style.width = `${Math.max(180, nb.w)}px`;
      ti.style.height = `${Math.max(44, nb.h)}px`;
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
        actEl.style.left = `${Math.max(8, Math.min(canvas.width - 96, nb.x + nb.w - 86))}px`;
        actEl.style.top = `${Math.max(8, Math.min(canvas.height - 44, nb.y + nb.h + 10))}px`;
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

  // Pointer Down
  canvas.onpointerdown = e => {
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

    // SELECT TOOL: Select, Move, or Resize
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
      const clampX = Math.max(12, Math.min(canvas.width - 220, p.x));
      const clampY = Math.max(16, Math.min(canvas.height - 80, p.y));
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
    } else if (tool === 'text') {
      eraserRing.classList.remove('hidden');
      eraserRing.style.width = 'auto';
      eraserRing.style.height = 'auto';
      eraserRing.style.borderRadius = '6px';
      eraserRing.style.border = '1.5px dashed ' + color;
      eraserRing.style.background = 'rgba(15,18,30,0.85)';
      eraserRing.style.padding = '3px 8px';
      eraserRing.style.color = color;
      eraserRing.style.fontSize = `${Math.max(14, size * 3.5)}px`;
      eraserRing.textContent = '🔤 Click to add text';
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
        redraw();
        updateOverlay();
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
    redraw();
  };

  // Pointer Up
  canvas.onpointerup = () => {
    cur = null;
    dragMode = null;
    origBounds = null;
    updateOverlay();
  };
  canvas.onpointerleave = () => {
    eraserRing.classList.add('hidden');
    dragMode = null;
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
      toast('Item deleted from whiteboard');
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
    if (selectedIdx >= 0 && strokes[selectedIdx]) {
      strokes[selectedIdx].color = color;
      redraw();
    }
  });

  $('#wbSize', box).oninput = e => { size = +e.target.value; };
  $('#wbGridBtn', box).onclick = e => {
    showGrid = !showGrid;
    e.currentTarget.classList.toggle('active', showGrid);
    canvasBox.classList.toggle('grid-bg', showGrid);
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
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${($('#wbTitleIn', box).value.trim() || 'whiteboard')}.png`;
    a.click();
  };

  $('#wbSave', box).onclick = async () => {
    const title = $('#wbTitleIn', box).value.trim() || 'Untitled Board';
    const savedId = await saveWsItem('board', { title, strokes }, activeBoard?.id || null);
    activeBoardId = savedId;
    toast(`Saved "${title}" to FireSpace!`);
  };

  $('#wbNewBoardBtn', box).onclick = async () => {
    const title = prompt('Name your new Whiteboard:', `Board #${boards.length + 1}`);
    if (!title) return;
    const newId = await saveWsItem('board', { title: title.trim(), strokes: [] }, null);
    activeBoardId = newId;
    toast(`Created "${title}"`);
  };

  $$('[data-bid]', box).forEach(el => el.onclick = e => {
    if (e.target.closest('[data-delboard]')) return;
    activeBoardId = el.dataset.bid;
    renderWhiteboardTab(box);
  });

  $$('[data-delboard]', box).forEach(b => b.onclick = async e => {
    e.stopPropagation();
    await deleteWsItem(b.dataset.delboard);
    toast('Whiteboard deleted');
  });

  setTimeout(resize, 20);
}

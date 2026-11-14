/* ==========================================================================
   Tele — FireMeet Hub & Peer-to-Peer WebRTC Video Room with Audio/Video Studio
   ========================================================================== */

let activeRoom = null;

async function loadMeetings() {
  S.meetings = await api('/api/meetings').catch(() => []);
  if (typeof loadCalls === 'function') await loadCalls().catch(() => {});
  if (S.view === 'meetings' || S.view === 'calls') renderMeetingsView();
}

function renderMeetingsView() {
  const root = $('#view-calls') || $('#view-meetings');
  if (!root) return;

  // Deduplicate and filter out ended/abandoned instant rooms
  const seenKeys = new Set();
  S.meetings = S.meetings.filter(m => {
    const k = m.id || m.code;
    if (!k || seenKeys.has(k) || seenKeys.has(m.code)) return false;
    seenKeys.add(k);
    if (m.code) seenKeys.add(m.code);
    // If it's a scheduled meeting, keep it
    if (m.scheduledAt) return true;
    // If it's an instant room, only keep if it's currently live or recently created (< 10 mins)
    const isLive = Boolean(m.live && m.live > 0);
    const isRecent = (Date.now() - (m.createdAt || 0)) < 10 * 60 * 1000;
    return isLive || isRecent;
  });

  const activeTab = S.meetTab || 'calls'; // 'calls' | 'scheduled'

  function formatCallTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }

  const renderCallHistoryRows = () => {
    const list = S.calls || [];
    if (!list.length) {
      return `
        <div class="no-content-box" style="padding:32px 16px;border-radius:16px">
          <div class="nc-ico" style="width:48px;height:48px;font-size:22px">${icon('phone')}</div>
          <h4 style="font-size:15px;margin-top:10px">No Call History</h4>
          <p style="font-size:12px;max-width:240px;margin:4px auto 0">Your recent voice and video calls will appear here automatically.</p>
        </div>`;
    }
    const rowsHtml = list.slice(0, 30).map(c => {
      const isOutgoing = c.isCaller;
      const isMissed = !isOutgoing && c.status !== 'completed';
      const isAudio = (c.mode || 'audio') === 'audio';
      const peerObj = c.peer || (c.peerId ? S.users?.get(c.peerId) : null) || { name: c.peerName || 'Contact', id: c.peerId };
      const peerIdVal = esc(peerObj.id || c.peerId || c.peer?.id || '');
      const durText = c.duration ? (typeof formatDuration === 'function' ? formatDuration(c.duration) : c.duration + 's') : (isMissed ? 'Missed call' : 'No answer');
      const badgeCls = isMissed ? 'missed' : (isAudio ? 'voice' : 'video');
      const dirLabel = isOutgoing ? 'Outgoing' : (isMissed ? 'Missed' : 'Incoming');

      return `
        <div class="meet-item-row ${isMissed ? 'is-missed-row' : ''}" data-call-id="${esc(c.id)}" data-call-name="${esc(peerObj.name || 'Contact')}" data-call-meta="${esc(dirLabel)} · ${esc(durText)} · ${esc(formatCallTime(c.createdAt))}">
          <div class="meet-row-ava-wrap">
            ${avatarHTML(peerObj, 'md')}
            <span class="call-badge-sub ${badgeCls}">
              ${isAudio ? icon('phone') : icon('video')}
            </span>
          </div>
          <div style="flex:1;min-width:0">
            <div class="row gap-xs align-center" style="flex-wrap:nowrap">
              <strong style="font-size:14.5px;font-weight:700;color:var(--text-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(peerObj.name || 'Contact')}</strong>
            </div>
            <div class="call-meta-line">
              <span class="call-direction-icon ${isOutgoing ? 'outgoing' : (isMissed ? 'missed' : 'incoming')}" title="${dirLabel} ${isAudio ? 'Voice' : 'Video'} Call" aria-label="${dirLabel}">
                ${isOutgoing
                  ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>'
                  : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>'}
                ${isAudio ? icon('phone') : icon('video')}
              </span>
              <span class="call-meta-dot">·</span>
              <span class="call-duration ${isMissed ? 'is-missed' : ''}">${durText}</span>
              <span class="call-meta-dot">·</span>
              <span class="call-time">${formatCallTime(c.createdAt)}</span>
            </div>
          </div>
          <div class="call-actions-cell">
            <button type="button" class="meet-quick-call-btn voice meet-call-back-btn" data-peer-id="${peerIdVal}" data-mode="audio" title="Voice Call">
              ${icon('phone')}
            </button>
            <button type="button" class="meet-quick-call-btn video meet-call-back-btn" data-peer-id="${peerIdVal}" data-mode="video" title="Video Call">
              ${icon('video')}
            </button>
          </div>
        </div>`;
    }).join('');
    return `
      ${rowsHtml}
      <div class="meet-calls-footer">
        <button type="button" class="meet-action-btn danger" id="clearCallsBtn" title="Delete all call logs">
          ${icon('trash')} <span>Delete All Call Logs</span>
        </button>
      </div>`;
  };

  const renderScheduledRows = () => {
    const headerBar = `
      <div class="meet-sched-section-head">
        <span class="meet-sched-section-label">${S.meetings.length ? `Upcoming Calls (${S.meetings.length})` : 'Scheduled Meetings'}</span>
        <button type="button" class="meet-action-btn primary" id="schedQuickBtn" title="Schedule a call">
          <span>+ Schedule</span>
        </button>
      </div>`;
    if (!S.meetings.length) {
      return `
        ${headerBar}
        <div class="no-content-box" style="padding:28px 16px;border-radius:16px">
          <div class="nc-ico" style="width:48px;height:48px;font-size:22px">${icon('video')}</div>
          <h4 style="font-size:15px;margin-top:10px">No Upcoming Meetings</h4>
          <p style="font-size:12px;max-width:240px;margin:4px auto 0">Tap <b>+ Schedule</b> above to plan a meeting or invite contacts.</p>
        </div>`;
    }
    return headerBar + S.meetings.map(m => `
      <div class="meet-item-row">
        <div class="meet-row-ava-wrap">
          <div class="ava md" style="background:var(--brand);flex-shrink:0">${icon('video')}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="row gap-xs align-center" style="flex-wrap:nowrap">
            <strong style="font-size:13.5px;color:var(--text-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.title)}</strong>
            ${m.live ? `<span class="pill green xs" style="flex-shrink:0">● ${m.live} live</span>` : ''}
          </div>
          <div class="call-meta-line">
            <code class="mono xs" style="color:var(--brand);font-weight:700">${esc(m.code)}</code>
            <span class="call-meta-dot">·</span>
            <span class="call-time">${m.scheduledAt ? new Date(m.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Instant room'}</span>
          </div>
        </div>
        <div class="call-actions-cell">
          <button class="icon-btn" data-copy="${esc(m.code)}" title="Copy code">${icon('copy')}</button>
          <button class="btn primary sm" data-join="${esc(m.code)}" style="padding:6px 14px;font-size:12px;border-radius:9px;font-weight:600">Join</button>
          ${m.hostId === S.user.id ? `<button class="meet-del-row-btn" data-cancel="${m.id}" title="Delete meeting">${icon('trash')}</button>` : ''}
        </div>
      </div>
    `).join('');
  };

  const nextHtml = `
    <div class="calls-bg-ambient" aria-hidden="true">
      <div class="calls-orb calls-orb-1"></div>
      <div class="calls-orb calls-orb-2"></div>
      <div class="calls-orb calls-orb-3"></div>
    </div>
    <div class="meet-hub-wrap">
      <div class="meet-hub-hero">
        <!-- LEFT: CLEAN TITLE & THREE DEDICATED CALL ACTIONS -->
        <div class="meet-hub-left">
          <div class="meet-hub-headline">
            <h1 class="meet-hub-title">Zovio Calls</h1>
            <p class="meet-hub-tagline">Connect with everyone</p>
          </div>

          <div class="meet-hub-actions">
            <button type="button" class="btn primary lg glow meet-hub-action-btn" id="instantMeetBtn">
              <span class="meet-act-ico">${icon('video')}</span>
              <span class="meet-act-txt">
                <strong>Start Instant Call</strong>
                <small>Launch a private voice or video room</small>
              </span>
            </button>
            <button type="button" class="btn ghost lg meet-hub-action-btn" id="openJoinCallBtn">
              <span class="meet-act-ico">${icon('keyboard')}</span>
              <span class="meet-act-txt">
                <strong>Join Call</strong>
                <small>Enter a room code or invite link</small>
              </span>
            </button>
            <button type="button" class="btn ghost lg meet-hub-action-btn" id="directCallContactBtn">
              <span class="meet-act-ico">${icon('phone')}</span>
              <span class="meet-act-txt">
                <strong>Call Contacts</strong>
                <small>Ring any friend directly 1-on-1</small>
              </span>
            </button>
          </div>
        </div>

        <!-- RIGHT: UNIFIED CALLS & MEETINGS TABS -->
        <div class="meet-hub-right">
          <div class="meet-quick-card glass-panel">
            <div class="meet-quick-card-head">
              <div class="meet-tab-switcher">
                <button class="meet-tab-btn ${activeTab === 'calls' ? 'active' : ''}" id="tabMeetCalls">
                  ${icon('phone')} <span>Calls</span> <span class="meet-tab-count">${(S.calls || []).length}</span>
                </button>
                <button class="meet-tab-btn ${activeTab === 'scheduled' ? 'active' : ''}" id="tabMeetScheduled">
                  ${icon('video')} <span>Scheduled</span> <span class="meet-tab-count">${S.meetings.length}</span>
                </button>
              </div>
            </div>

            <div class="col gap-xs meet-tab-content tab-switch-anim" id="meetTabContent">
              ${activeTab === 'calls' ? renderCallHistoryRows() : renderScheduledRows()}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  if (root._lastMeetingsHtml === nextHtml) return;
  const prevScroll = $('#meetTabContent', root)?.scrollTop || 0;
  root._lastMeetingsHtml = nextHtml;
  root.innerHTML = nextHtml;
  const tabContent = $('#meetTabContent', root);
  if (tabContent && prevScroll > 0) tabContent.scrollTop = prevScroll;

  hydrateIcons(root);

  $('#tabMeetCalls', root).onclick = () => {
    S.meetTab = 'calls';
    renderMeetingsView();
  };
  $('#tabMeetScheduled', root).onclick = () => {
    S.meetTab = 'scheduled';
    renderMeetingsView();
  };

  $('#directCallContactBtn', root).onclick = () => {
    if (typeof openStartCallModal === 'function') {
      openStartCallModal();
    } else if (typeof openNewCallChooserModal === 'function') {
      openNewCallChooserModal();
    }
  };

  // Clear All Call History confirmation modal
  const clearBtn = $('#clearCallsBtn', root);
  if (clearBtn) {
    clearBtn.onclick = () => {
      showModal('Clear Call History', `
        <div class="col gap-m items-center justify-center" style="text-align:center;padding:12px 6px">
          <div style="width:58px;height:58px;margin:0 auto;border-radius:18px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.3);display:grid;place-items:center;color:#ef4444;font-size:26px">
            ${icon('trash')}
          </div>
          <div class="col gap-xs items-center">
            <strong style="font-size:17px;font-weight:800;color:var(--text-0)">Clear all call logs?</strong>
            <p class="muted xs" style="max-width:320px;line-height:1.5;margin:0 auto">
              This will permanently delete all incoming, outgoing, and missed call history from your account. This action cannot be undone.
            </p>
          </div>
          <div class="row gap-s" style="width:100%;margin-top:8px">
            <button type="button" class="btn ghost" id="cancelClearCallsBtn" style="flex:1;height:42px;border-radius:12px;font-weight:600">Cancel</button>
            <button type="button" class="btn danger" id="confirmClearCallsBtn" style="flex:1.2;height:42px;border-radius:12px;font-weight:700">Clear History</button>
          </div>
        </div>
      `, mbox => {
        $('#cancelClearCallsBtn', mbox).onclick = closeModal;
        $('#confirmClearCallsBtn', mbox).onclick = async () => {
          const btn = $('#confirmClearCallsBtn', mbox);
          btn.disabled = true;
          btn.textContent = 'Clearing...';
          try {
            await api('/api/calls/history', { method: 'DELETE' });
            S.calls = [];
            if (typeof updateCallsBadge === 'function') updateCallsBadge();
            closeModal();
            renderMeetingsView();
          } catch (err) {
            toast(err.message || 'Failed to clear call history', 'err');
            btn.disabled = false;
            btn.textContent = 'Clear History';
          }
        };
      }, 'modal-glass-glow');
    };
  }

  $('#instantMeetBtn', root).onclick = openStartInstantCallModal;
  $('#openJoinCallBtn', root).onclick = openJoinCallModal;
  if ($('#schedQuickBtn', root)) $('#schedQuickBtn', root).onclick = openScheduleMeetingModal;

  // Single delegated click listener + deep-press individual log delete
  if (!root._meetDelegated) {
    root._meetDelegated = true;
    root.addEventListener('click', async e => {
      const callBackBtn = e.target.closest('.meet-call-back-btn');
      if (callBackBtn) {
        const peerId = callBackBtn.dataset.peerId;
        const mode = callBackBtn.dataset.mode || 'audio';
        if (typeof directCallUser === 'function' && peerId) directCallUser(peerId, mode);
        return;
      }
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        navigator.clipboard?.writeText(copyBtn.dataset.copy);
        toast(`Copied code: ${copyBtn.dataset.copy}`);
        return;
      }
      const joinBtn = e.target.closest('[data-join]');
      if (joinBtn) {
        try {
          const m = await api(`/api/meetings/code/${encodeURIComponent(joinBtn.dataset.join)}`);
          if (typeof openPreJoinModal === 'function') {
            openPreJoinModal(m);
          } else {
            enterMeetingRoom(m);
          }
        } catch (err) {
          toast(err.message, 'err');
        }
        return;
      }
      const cancelBtn = e.target.closest('[data-cancel]');
      if (cancelBtn) {
        await api(`/api/meetings/${cancelBtn.dataset.cancel}`, { method: 'DELETE' }).catch(() => {});
        S.meetings = S.meetings.filter(m => m.id !== cancelBtn.dataset.cancel);
        renderMeetingsView();
      }
    });

    if (typeof window.attachCallRowLongPress === 'function') {
      window.attachCallRowLongPress(root, '.meet-item-row[data-call-id]', async callId => {
        if (!callId) return;
        if (typeof deleteCallHistory === 'function') {
          await deleteCallHistory(callId);
        } else {
          await api(`/api/calls/history/${callId}`, { method: 'DELETE' }).catch(() => {});
          S.calls = (S.calls || []).filter(c => c.id !== callId);
        }
        renderMeetingsView();
      });
    }
  }
}

async function openStartInstantCallModal() {
  showModal('Start Instant Call', `
    <div class="col gap-m">
      <label class="col gap-xs">
        <span class="muted xs">Call room title (optional)</span>
        <input id="instantCallTitleIn" placeholder="${esc(S.user?.name || 'My')}'s Call" autocomplete="off">
      </label>
      <div class="col gap-s">
        <button type="button" class="btn primary lg glow" id="launchInstantVideoBtn" style="width:100%;justify-content:center">
          ${icon('video')} <span>Start Video Room</span>
        </button>
        <button type="button" class="btn ghost lg" id="launchInstantAudioBtn" style="width:100%;justify-content:center">
          ${icon('phone')} <span>Start Voice Room</span>
        </button>
      </div>
    </div>
  `, box => {
    hydrateIcons(box);
    const launch = (withVideo) => {
      const title = $('#instantCallTitleIn', box)?.value.trim() || `${S.user?.name || 'Zovio'}'s Call`;
      const pendingCode = `call-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
      closeModal();
      const meetingPromise = api('/api/meetings', { method: 'POST', body: { code: pendingCode, title } }).then(m => {
        const idx = S.meetings.findIndex(x => x.id === m.id || x.code === m.code);
        if (idx >= 0) S.meetings[idx] = m; else S.meetings.unshift(m);
        renderMeetingsView();
        return m;
      });
      enterMeetingRoom({ code: pendingCode, title }, { initialAudio: false, initialVideo: false, meetingPromise });
      meetingPromise.catch(e => {
        toast(e.message || 'Could not start call', 'err');
        if (activeRoom?.code === pendingCode) leaveMeetingRoom();
      });
    };
    $('#launchInstantVideoBtn', box).onclick = () => launch(true);
    $('#launchInstantAudioBtn', box).onclick = () => launch(false);
  });
}

function openJoinCallModal() {
  showModal('Join Call', `
    <div class="col gap-m">
      <label class="col gap-xs">
        <span class="muted xs">Enter call code or invitation link</span>
        <input id="joinCodeIn" placeholder="e.g. abc-defg-hij" autocomplete="off" spellcheck="false">
      </label>
      <button type="button" class="btn primary lg glow" id="joinCodeBtn" disabled style="width:100%;justify-content:center">
        ${icon('video')} <span>Join Call</span>
      </button>
    </div>
  `, box => {
    hydrateIcons(box);
    const codeIn = $('#joinCodeIn', box);
    const joinBtn = $('#joinCodeBtn', box);
    const doJoin = async () => {
      const rawVal = codeIn.value.trim();
      if (!rawVal) return;
      joinBtn.disabled = true;
      joinBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> <span>Joining…</span>`;
      try {
        const m = await api(`/api/meetings/code/${encodeURIComponent(rawVal)}`);
        closeModal();
        if (typeof openPreJoinModal === 'function') openPreJoinModal(m);
        else enterMeetingRoom(m, { initialAudio: false, initialVideo: false });
      } catch (e) {
        toast(e.message || 'Unable to join call', 'err');
        joinBtn.disabled = !codeIn.value.trim();
        joinBtn.innerHTML = `${icon('video')} <span>Join Call</span>`;
        hydrateIcons(joinBtn);
      }
    };
    codeIn.oninput = () => { joinBtn.disabled = !codeIn.value.trim(); };
    codeIn.onkeydown = e => {
      if (e.key === 'Enter' && codeIn.value.trim()) {
        e.preventDefault();
        doJoin();
      }
    };
    joinBtn.onclick = doJoin;
    setTimeout(() => codeIn?.focus(), 60);
  });
}

async function openScheduleMeetingModal() {
  const users = await api('/api/users').catch(() => []);
  const def = new Date(Date.now() + 3600e3);
  def.setMinutes(0, 0, 0);
  const isoLocal = new Date(def.getTime() - def.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  showModal('📅 Schedule a Call', `
    <label class="col gap-xs"><span class="muted">Call or meeting title</span><input id="mTitle" placeholder="Weekly Design & Product Sync"></label>
    <div class="row gap-s">
      <label style="flex:1">Date & time<input id="mWhen" type="datetime-local" value="${isoLocal}"></label>
      <label style="width:130px">Duration<select id="mDur"><option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label>
    </div>
    <div class="muted" style="font-size:12px">Invite teammates:</div>
    <div class="col gap-xs" style="max-height:180px;overflow-y:auto">
      ${users.map(u => `<label class="row gap-s" style="padding:6px;background:var(--bg-2);border-radius:10px">
        <input type="checkbox" value="${u.id}" style="width:auto"> ${avatarHTML(u, 'sm')} <strong>${esc(u.name)}</strong>
      </label>`).join('') || '<div class="muted">No other users registered yet.</div>'}
    </div>
    <button class="btn primary lg" id="createSchedBtn">Schedule Call</button>
  `, box => {
    $('#createSchedBtn', box).onclick = async () => {
      const title = $('#mTitle', box).value.trim() || `${S.user.name}'s Call`;
      const scheduledAt = new Date($('#mWhen', box).value).getTime();
      const duration = +$('#mDur', box).value;
      const invitees = $$('input:checked', box).map(i => i.value);
      const m = await api('/api/meetings', { method: 'POST', body: { title, scheduledAt, duration, invitees } });
      if (!S.meetings.some(x => x.id === m.id)) S.meetings.push(m);
      closeModal();
      renderMeetingsView();
      toast(`Call scheduled · code ${m.code}`);
    };
  }, 'modal-glass-glow');
}

// ==========================================================================
// Pre-Meeting Green Room (Preview & Toggle Mic/Camera Before Joining)
// ==========================================================================
async function openPreJoinModal(m) {
  let previewStream = null;
  let micEnabled = false;
  let camEnabled = false;

  try {
    previewStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
    });
  } catch {
    try {
      previewStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      camEnabled = false;
    } catch {
      previewStream = null;
      micEnabled = false;
      camEnabled = false;
    }
  }

  showModal('Ready to Join Call?', `
    <div class="prejoin-wrap">
      <div class="prejoin-preview-card">
        <video id="prejoinVideo" class="prejoin-video mirror ${camEnabled ? '' : 'hidden'}" autoplay muted playsinline></video>
        <div id="prejoinNoCam" class="prejoin-no-cam ${camEnabled ? 'hidden' : ''}">
          ${avatarHTML(S.user, 'xl')}
          <span class="muted xs" style="margin-top:10px;font-weight:600">Camera is turned off</span>
        </div>
        <div class="prejoin-floating-controls">
          <button type="button" class="prejoin-ctrl-btn ${micEnabled ? '' : 'off'}" id="prejoinMicBtn" title="Toggle Microphone">
            ${icon(micEnabled ? 'mic' : 'micOff')}
          </button>
          <button type="button" class="prejoin-ctrl-btn ${camEnabled ? '' : 'off'}" id="prejoinCamBtn" title="Toggle Camera">
            ${icon(camEnabled ? 'video' : 'videoOff')}
          </button>
        </div>
      </div>

      <div class="prejoin-info-col">
        <div>
          <h3 style="margin:0 0 6px;font-size:18px;font-weight:800">${esc(m.title ? m.title.replace(/FireCall/gi, 'Call').replace(/FireMeet/gi, 'Meeting') : 'Zovio Meeting')}</h3>
          <div class="row gap-xs align-center">
            <code class="mono xs" style="color:var(--brand);font-weight:700">${esc(m.code)}</code>
            <span class="muted xs">·</span>
            <span class="pill xs green">Ready to connect</span>
          </div>
        </div>

        <div class="col gap-xs" style="width:100%">
          <label class="col gap-xs">
            <span class="muted xs" style="font-weight:700">Microphone</span>
            <select id="prejoinMicSelect" class="input sm"></select>
          </label>
          <label class="col gap-xs">
            <span class="muted xs" style="font-weight:700">Camera</span>
            <select id="prejoinCamSelect" class="input sm"></select>
          </label>
        </div>

        <div class="row gap-s align-center" style="margin-top:10px;width:100%">
          <button type="button" class="btn ghost lg" id="prejoinCancelBtn" style="flex:1">Cancel</button>
          <button type="button" class="btn primary lg glow" id="prejoinJoinBtn" style="flex:1.4">
            ${icon('video')} <span>Join Meeting</span>
          </button>
        </div>
      </div>
    </div>
  `, async box => {
    const videoEl = $('#prejoinVideo', box);
    const noCamEl = $('#prejoinNoCam', box);
    const micBtn = $('#prejoinMicBtn', box);
    const camBtn = $('#prejoinCamBtn', box);
    const selMic = $('#prejoinMicSelect', box);
    const selCam = $('#prejoinCamSelect', box);

    if (videoEl && previewStream && camEnabled) {
      videoEl.srcObject = previewStream;
      videoEl.play().catch(() => {});
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const mics = devices.filter(d => d.kind === 'audioinput');
      const cams = devices.filter(d => d.kind === 'videoinput');
      if (selMic) {
        selMic.innerHTML = mics.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `Microphone ${i + 1}`)}</option>`).join('') || '<option value="">Default Microphone</option>';
      }
      if (selCam) {
        selCam.innerHTML = cams.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `Camera ${i + 1}`)}</option>`).join('') || '<option value="">Default Camera</option>';
      }
    }

    if (selMic) {
      selMic.onchange = async () => {
        const deviceId = selMic.value;
        if (!deviceId) return;
        try {
          const newAudio = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
          const oldTrack = previewStream?.getAudioTracks()[0];
          if (oldTrack) {
            previewStream.removeTrack(oldTrack);
            oldTrack.stop();
          }
          const newTrack = newAudio.getAudioTracks()[0];
          if (newTrack) {
            newTrack.enabled = micEnabled;
            previewStream?.addTrack(newTrack);
          }
        } catch (err) {
          console.warn('Switch mic error:', err);
        }
      };
    }

    if (selCam) {
      selCam.onchange = async () => {
        const deviceId = selCam.value;
        if (!deviceId) return;
        try {
          const newVid = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
          const oldTrack = previewStream?.getVideoTracks()[0];
          if (oldTrack) {
            previewStream.removeTrack(oldTrack);
            oldTrack.stop();
          }
          const newTrack = newVid.getVideoTracks()[0];
          if (newTrack) {
            newTrack.enabled = camEnabled;
            previewStream?.addTrack(newTrack);
            if (videoEl && camEnabled) {
              videoEl.srcObject = previewStream;
              videoEl.play().catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Switch cam error:', err);
        }
      };
    }

    // Toggle Mic
    micBtn.onclick = () => {
      micEnabled = !micEnabled;
      previewStream?.getAudioTracks().forEach(t => { t.enabled = micEnabled; });
      micBtn.classList.toggle('off', !micEnabled);
      micBtn.innerHTML = icon(micEnabled ? 'mic' : 'micOff');
      hydrateIcons(micBtn);
    };

    // Toggle Cam: Physically stop/start track so camera flash/LED turns 100% OFF
    camBtn.onclick = async () => {
      camEnabled = !camEnabled;
      if (!camEnabled) {
        // Physically STOP all video tracks so webcam hardware & LED/flash turns completely OFF!
        if (previewStream) {
          previewStream.getVideoTracks().forEach(t => {
            t.enabled = false;
            try { t.stop(); } catch {}
            previewStream.removeTrack(t);
          });
        }
        if (videoEl) {
          try { videoEl.pause(); } catch {}
          videoEl.srcObject = null;
        }
        videoEl.classList.add('hidden');
        noCamEl.classList.remove('hidden');
      } else {
        // Re-acquire camera hardware
        try {
          const devId = selCam?.value;
          const newVid = await navigator.mediaDevices.getUserMedia({
            video: devId ? { deviceId: { exact: devId } } : { facingMode: 'user' }
          });
          const newTrack = newVid.getVideoTracks()[0];
          if (newTrack) {
            if (!previewStream) previewStream = new MediaStream();
            previewStream.addTrack(newTrack);
          }
        } catch (err) {
          camEnabled = false;
          toast('Camera unavailable', 'err');
        }
        if (camEnabled && previewStream) {
          videoEl.classList.remove('hidden');
          noCamEl.classList.add('hidden');
          videoEl.srcObject = previewStream;
          videoEl.play().catch(() => {});
        }
      }
      camBtn.classList.toggle('off', !camEnabled);
      camBtn.innerHTML = icon(camEnabled ? 'video' : 'videoOff');
      hydrateIcons(camBtn);
    };

    // Cleanup tracks on cancel
    const cleanup = () => {
      if (previewStream) {
        try { previewStream.getTracks().forEach(t => t.stop()); } catch {}
        previewStream = null;
      }
      closeModal();
    };

    $('#prejoinCancelBtn', box).onclick = cleanup;
    $('#modalClose').onclick = cleanup;
    $('#modalBack').onclick = e => { if (e.target.id === 'modalBack') cleanup(); };

    // Join Now
    $('#prejoinJoinBtn', box).onclick = () => {
      const streamToPass = previewStream;
      previewStream = null;
      closeModal();
      enterMeetingRoom(m, {
        initialStream: streamToPass,
        initialAudio: micEnabled,
        initialVideo: camEnabled,
        audioDeviceId: selMic?.value || '',
        videoDeviceId: selCam?.value || ''
      });
    };
  }, 'modal-glass-glow');
}

// ==========================================================================
// Live WebRTC Room with In-Call Device Switcher, Audio Mix DSP & Video Studio
// ==========================================================================
// Live WebRTC Room with In-Call Device Switcher, Audio Mix DSP & Video Studio
// ==========================================================================
const RTC_CFG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ],
  iceCandidatePoolSize: 6,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

function toggleTileFullscreen(tile) {
  if (!tile) return;
  if (tile.id === 'localTile' && tile.classList.contains('is-screen') && !tile.classList.contains('is-fullscreen-tile')) {
    if (typeof toast === 'function') toast('Sharing your screen — switch apps or minimize to keep presenting', 'ok');
    return;
  }
  const isAlreadyFs = tile.classList.contains('is-fullscreen-tile') || document.fullscreenElement === tile;

  if (!isAlreadyFs) {
    // Enter Fullscreen (Pure CSS Stage Fullscreen guaranteed everywhere + Native OS API)
    tile.classList.add('is-fullscreen-tile');
    $('#meetRoom')?.classList.add('in-tile-fullscreen');

    try {
      if (tile.requestFullscreen) tile.requestFullscreen().catch(() => {});
      else if (tile.webkitRequestFullscreen) tile.webkitRequestFullscreen();
    } catch {}

    // Floating Exit Fullscreen Button
    let exitBtn = document.getElementById('meetTileExitFsBtn');
    if (!exitBtn) {
      exitBtn = document.createElement('button');
      exitBtn.id = 'meetTileExitFsBtn';
      exitBtn.className = 'meet-exit-fs-btn';
      exitBtn.innerHTML = `${icon('close')} <span>Exit Full Screen (Esc)</span>`;
      document.body.appendChild(exitBtn);
    }
    exitBtn.onclick = () => toggleTileFullscreen(tile);
    exitBtn.classList.remove('hidden');

    const handleKey = e => {
      if (e.key === 'Escape') {
        toggleTileFullscreen(tile);
        document.removeEventListener('keydown', handleKey);
      }
    };
    document.addEventListener('keydown', handleKey);

    const handleNativeChange = () => {
      if (!document.fullscreenElement && tile.classList.contains('is-fullscreen-tile')) {
        tile.classList.remove('is-fullscreen-tile');
        $('#meetRoom')?.classList.remove('in-tile-fullscreen');
        exitBtn.classList.add('hidden');
        document.removeEventListener('fullscreenchange', handleNativeChange);
      }
    };
    document.addEventListener('fullscreenchange', handleNativeChange);
  } else {
    // Exit Fullscreen
    tile.classList.remove('is-fullscreen-tile');
    $('#meetRoom')?.classList.remove('in-tile-fullscreen');
    $('#meetTileExitFsBtn')?.classList.add('hidden');

    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch {}
  }
}

function togglePinTile(tile) {
  if (!tile) return;
  const isPinned = tile.dataset.pinned === 'true';
  document.querySelectorAll('.video-tile').forEach(t => {
    t.dataset.pinned = 'false';
    t.querySelector('.tile-pin-btn')?.classList.remove('active');
  });
  if (!isPinned) {
    tile.dataset.pinned = 'true';
    tile.querySelector('.tile-pin-btn')?.classList.add('active');
  }
  updateStageLayout();
}

function updateStageLayout() {
  const stage = $('#meetStage');
  const spotlightSlot = $('#meetSpotlightSlot');
  const gridSlot = $('#meetGridSlot');
  const filmstripSlot = $('#meetFilmstripSlot');
  if (!stage || !spotlightSlot || !gridSlot || !filmstripSlot) return;

  const allTiles = Array.from(stage.querySelectorAll('.video-tile'));
  if (!allTiles.length) return;

  // Prioritize active screen share, then manually pinned tile
  const screenTile = allTiles.find(t => t.classList.contains('is-screen')) ||
                     allTiles.find(t => t.dataset.pinned === 'true');

  const roomEl = $('#meetRoom');
  const dockFsBtn = $('#dockFullscreen');

  if (screenTile) {
    stage.classList.add('has-screen-share');
    if (roomEl) roomEl.classList.add('has-screen-share');
    if (dockFsBtn) dockFsBtn.classList.add('hidden');
    screenTile.querySelector('.tile-fs-btn')?.classList.add('hidden');

    spotlightSlot.classList.remove('hidden');
    filmstripSlot.classList.remove('hidden');
    gridSlot.classList.add('hidden');

    if (screenTile.parentElement !== spotlightSlot) {
      spotlightSlot.appendChild(screenTile);
    }

    const otherTiles = allTiles.filter(t => t !== screenTile);
    filmstripSlot.dataset.count = otherTiles.length;
    otherTiles.forEach(t => {
      if (t.parentElement !== filmstripSlot) {
        filmstripSlot.appendChild(t);
      }
    });
  } else {
    stage.classList.remove('has-screen-share');
    if (roomEl) roomEl.classList.remove('has-screen-share');
    if (dockFsBtn) dockFsBtn.classList.remove('hidden');

    spotlightSlot.classList.add('hidden');
    filmstripSlot.classList.add('hidden');
    gridSlot.classList.remove('hidden');

    gridSlot.dataset.count = allTiles.length;
    allTiles.forEach(t => {
      t.querySelector('.tile-fs-btn')?.classList.remove('hidden');
      if (t.parentElement !== gridSlot) {
        gridSlot.appendChild(t);
      }
    });
  }

  // If in PiP / pop-up mode, ensure exactly the primary remote speaker or screenshare is focused
  if (roomEl && roomEl.classList.contains('is-pip')) {
    const focusTile = allTiles.find(t => t.classList.contains('is-screen')) ||
                      allTiles.find(t => t.id !== 'localTile') ||
                      allTiles[0];
    allTiles.forEach(t => t.classList.remove('pip-active'));
    if (focusTile) focusTile.classList.add('pip-active');
  }
}

function getVideoTransceiver(pc) {
  if (!pc || !pc.getTransceivers) return null;
  const list = pc.getTransceivers().filter(t => !t.stopped && (t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'));
  return list.find(t => t.mid !== null) || list[0] || null;
}

function getAudioTransceiver(pc) {
  if (!pc || !pc.getTransceivers) return null;
  const list = pc.getTransceivers().filter(t => !t.stopped && (t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'));
  return list.find(t => t.mid !== null) || list[0] || null;
}

function getVideoSender(pc) {
  if (!pc) return null;
  const tr = getVideoTransceiver(pc);
  if (tr && tr.sender) return tr.sender;
  return pc.getSenders?.().find(s => s.track?.kind === 'video') || null;
}

function getAudioSender(pc) {
  if (!pc) return null;
  const tr = getAudioTransceiver(pc);
  if (tr && tr.sender) return tr.sender;
  return pc.getSenders?.().find(s => s.track?.kind === 'audio') || null;
}

async function syncPeerTrack(connId, entry, kind, track, stream) {
  if (!entry?.pc) return;
  const tr = kind === 'video' ? getVideoTransceiver(entry.pc) : getAudioTransceiver(entry.pc);
  if (tr && tr.sender) {
    let needsRenegotiation = false;
    if (track && !tr.sender.track) {
      needsRenegotiation = true;
    }
    if (track && tr.direction !== 'sendrecv') {
      try { tr.direction = 'sendrecv'; needsRenegotiation = true; } catch {}
    }
    if (track && (!tr.mid || (tr.currentDirection && tr.currentDirection !== 'sendrecv' && tr.currentDirection !== 'sendonly'))) {
      needsRenegotiation = true;
    }
    await tr.sender.replaceTrack(track).catch(() => {});
    if (needsRenegotiation) {
      await renegotiatePeer(connId, entry);
    }
  } else if (track) {
    try {
      entry.pc.addTrack(track, stream || new MediaStream([track]));
      await renegotiatePeer(connId, entry);
    } catch (e) {
      console.warn('syncPeerTrack addTrack err:', e);
    }
  }
}

function applyPipSavedSize(roomEl) {
  if (!roomEl) return;
  const vw = window.innerWidth || document.documentElement.clientWidth || 360;
  const vh = window.innerHeight || document.documentElement.clientHeight || 640;
  const minW = 156;
  const maxW = Math.min(340, vw - 16);
  const minH = 124;
  const maxH = Math.min(440, vh - 96);
  let w = 0, h = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('zovio.pipSize') || 'null');
    if (saved && Number(saved.w) > 0 && Number(saved.h) > 0) {
      w = Math.max(minW, Math.min(maxW, Number(saved.w)));
      h = Math.max(minH, Math.min(maxH, Number(saved.h)));
    }
  } catch {}
  if (w > 0 && h > 0) {
    roomEl.style.setProperty('width', `${Math.round(w)}px`, 'important');
    roomEl.style.setProperty('height', `${Math.round(h)}px`, 'important');
    roomEl.classList.toggle('pip-compact', w < 192);
    roomEl.classList.toggle('pip-expanded', w >= 256);
  } else {
    roomEl.style.removeProperty('width');
    roomEl.style.removeProperty('height');
    roomEl.classList.remove('pip-compact', 'pip-expanded');
  }
}

function enablePipDragging(roomEl) {
  if (!roomEl) return;
  if (typeof roomEl._pipDragCleanup === 'function') {
    roomEl._pipDragCleanup();
  }

  let isDragging = false;
  let isResizing = false;
  let activePointerId = null;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let initialW = 0, initialH = 0;
  let fixedRight = 0, fixedBottom = 0;

  const beginDrag = (clientX, clientY) => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    const rect = roomEl.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    roomEl.classList.add('is-dragging');
    roomEl.style.transition = 'none';
    roomEl.style.setProperty('right', 'auto', 'important');
    roomEl.style.setProperty('bottom', 'auto', 'important');
    roomEl.style.setProperty('left', `${Math.round(initialLeft)}px`, 'important');
    roomEl.style.setProperty('top', `${Math.round(initialTop)}px`, 'important');
  };

  const beginResize = (clientX, clientY) => {
    isResizing = true;
    startX = clientX;
    startY = clientY;
    const rect = roomEl.getBoundingClientRect();
    initialW = rect.width || 210;
    initialH = rect.height || 148;
    fixedRight = rect.right;
    fixedBottom = rect.bottom;
    roomEl.classList.add('is-dragging');
    roomEl.style.transition = 'none';
    roomEl.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
    roomEl.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
    roomEl.style.setProperty('right', 'auto', 'important');
    roomEl.style.setProperty('bottom', 'auto', 'important');
  };

  const updateDrag = (clientX, clientY) => {
    if (!isDragging || !roomEl.classList.contains('is-pip')) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const pipW = roomEl.offsetWidth || 230;
    const pipH = roomEl.offsetHeight || 150;
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;
    const clampLeft = Math.max(8, Math.min(vw - pipW - 8, initialLeft + dx));
    const clampTop = Math.max(8, Math.min(vh - pipH - 8, initialTop + dy));
    roomEl.style.setProperty('left', `${Math.round(clampLeft)}px`, 'important');
    roomEl.style.setProperty('top', `${Math.round(clampTop)}px`, 'important');
    roomEl.style.setProperty('right', 'auto', 'important');
    roomEl.style.setProperty('bottom', 'auto', 'important');
  };

  const updateResize = (clientX, clientY) => {
    if (!isResizing || !roomEl.classList.contains('is-pip')) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
    const vh = window.innerHeight || document.documentElement.clientHeight || 640;
    const minW = 156;
    const maxW = Math.min(340, vw - 16, Math.max(minW, fixedRight - 8));
    const minH = 124;
    const maxH = Math.min(440, vh - 80, Math.max(minH, fixedBottom - 8));

    const nextW = Math.max(minW, Math.min(maxW, Math.round(initialW - dx)));
    const nextH = Math.max(minH, Math.min(maxH, Math.round(initialH - dy)));
    const nextLeft = Math.max(8, Math.round(fixedRight - nextW));
    const nextTop = Math.max(8, Math.round(fixedBottom - nextH));

    roomEl.style.setProperty('width', `${nextW}px`, 'important');
    roomEl.style.setProperty('height', `${nextH}px`, 'important');
    roomEl.style.setProperty('left', `${nextLeft}px`, 'important');
    roomEl.style.setProperty('top', `${nextTop}px`, 'important');
    roomEl.classList.toggle('pip-compact', nextW < 192);
    roomEl.classList.toggle('pip-expanded', nextW >= 256);
    try {
      localStorage.setItem('zovio.pipSize', JSON.stringify({ w: nextW, h: nextH }));
    } catch {}
  };

  const endDrag = () => {
    if (!isDragging && !isResizing) return;
    isDragging = false;
    isResizing = false;
    activePointerId = null;
    roomEl.classList.remove('is-dragging');
    roomEl.style.transition = 'box-shadow 0.25s var(--ease-spring)';
  };

  const onPointerDown = (e) => {
    if (!roomEl.classList.contains('is-pip')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.pip-resize-handle')) {
      activePointerId = e.pointerId;
      beginResize(e.clientX, e.clientY);
      try { roomEl.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.closest('button, input, select, .dock-btn, .pip-expand-btn, a')) return;
    activePointerId = e.pointerId;
    beginDrag(e.clientX, e.clientY);
    try { roomEl.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if ((!isDragging && !isResizing) || activePointerId === null || e.pointerId !== activePointerId) return;
    if (isResizing) updateResize(e.clientX, e.clientY);
    else updateDrag(e.clientX, e.clientY);
    e.preventDefault();
  };

  const onPointerUp = (e) => {
    if ((!isDragging && !isResizing) || activePointerId === null || e.pointerId !== activePointerId) return;
    try { roomEl.releasePointerCapture(e.pointerId); } catch {}
    endDrag();
  };

  const onTouchStart = (e) => {
    if (!roomEl.classList.contains('is-pip') || activePointerId !== null) return;
    const t = e.touches?.[0];
    if (!t) return;
    if (e.target.closest('.pip-resize-handle')) {
      beginResize(t.clientX, t.clientY);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.closest('button, input, select, .dock-btn, .pip-expand-btn, a')) return;
    beginDrag(t.clientX, t.clientY);
    e.preventDefault();
  };

  const onTouchMove = (e) => {
    if ((!isDragging && !isResizing) || activePointerId !== null) return;
    const t = e.touches?.[0];
    if (!t) return;
    if (isResizing) updateResize(t.clientX, t.clientY);
    else updateDrag(t.clientX, t.clientY);
    e.preventDefault();
  };

  const onTouchEnd = () => {
    if ((!isDragging && !isResizing) || activePointerId !== null) return;
    endDrag();
  };

  roomEl.addEventListener('pointerdown', onPointerDown, { passive: false });
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  roomEl.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);

  roomEl._pipDragCleanup = () => {
    roomEl.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    roomEl.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
  };
}

function enterMeetingRoom(m, opts = {}) {
  if (activeRoom) {
    leaveMeetingRoom();
  }
  const rawStream = opts.initialStream || null;
  const isDirect = Boolean(opts.isDirectCall || (m.chatId && S.chats.get(m.chatId)?.type === 'dm'));
  const initialAudio = isDirect ? (opts.initialAudio !== false) : Boolean(opts.initialAudio);
  const initialVideo = Boolean(opts.initialVideo);
  const hasInitialVideo = Boolean(rawStream?.getVideoTracks().length && initialVideo);

  if (rawStream) {
    rawStream.getAudioTracks().forEach(t => {
      t.enabled = initialAudio;
      try { if ('contentHint' in t) t.contentHint = 'speech'; } catch {}
    });
    rawStream.getVideoTracks().forEach(t => { t.enabled = initialVideo; });
  }

  activeRoom = {
    code: m.code,
    title: m.title,
    isDirectCall: isDirect,
    rawStream,
    stream: rawStream,
    screenStream: null,
    peers: new Map(),
    audioOn: initialAudio,
    videoOn: rawStream ? hasInitialVideo : initialVideo,
    studioOpen: false,
    audioDeviceId: opts.audioDeviceId || rawStream?.getAudioTracks()[0]?.getSettings()?.deviceId || '',
    videoDeviceId: opts.videoDeviceId || rawStream?.getVideoTracks()[0]?.getSettings()?.deviceId || '',
    speakerDeviceId: '',
    audioMix: {
      gain: 100,
      eq: 'natural', // 'natural' | 'podcast' | 'crisp' | 'broadcast'
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    },
    videoFx: {
      preset: 'natural',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      warmth: 0,
      mirror: true
    },
    audioCtx: null,
    gainNode: null,
    biquadNode: null,
    meterTimer: null
  };
  const roomRef = activeRoom;

  // Render & display call room immediately on frame 1 while hardware/permissions warm up in parallel
  const roomEl = $('#meetRoom');
  roomEl.classList.remove('hidden');
  roomEl.innerHTML = `
    <!-- Top Overlay for Picture-in-Picture Mode (Google Meet Style) -->
    <button type="button" class="pip-resize-handle hidden" id="meetPipResizeHandle" title="Drag to resize call pop-up" aria-label="Resize call pop-up">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 8V2H8M2 2L9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="pip-title-pill hidden" id="pipTitlePill">
      <span class="live-dot" style="width:6px;height:6px"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.title)}</span>
    </div>
    <button type="button" class="pip-expand-btn hidden" id="meetPipExpandBtn" title="Expand to Fullscreen">${icon('maximize')}</button>

    <header class="convo-head meet-room-head" style="background:rgba(14,16,26,.95);display:flex;align-items:center;gap:10px">
      <button type="button" class="icon-btn" id="meetPipBtn" title="Minimize call to floating widget / Back to chat" style="margin-right:2px">${icon('back')}</button>
      <div class="row gap-s align-center meet-room-title-wrap" style="min-width:0;flex:1">
        <span class="live-dot"></span>
        <strong class="meet-room-title">${esc(m.title)}</strong>
        <code class="pill mono" id="roomCodeBadge" style="cursor:pointer" title="Click to copy">${esc(m.code)}</code>
      </div>
      <div class="spacer"></div>
      <span class="e2e-tag meet-e2e-tag">${icon('lock')} DTLS-SRTP P2P</span>
      <button class="btn sm ghost" id="meetExpandBtn" style="display:none;margin-right:4px">${icon('maximize')} Expand</button>
    </header>

    <div class="meet-body">
      <div class="meet-stage" id="meetStage">
        <!-- Presentation / Spotlight Slot (Screenshare or Pinned Tile) -->
        <div class="meet-spotlight-slot hidden" id="meetSpotlightSlot"></div>
        <!-- Standard Video Grid Slot -->
        <div class="meet-grid-slot" id="meetGridSlot">
          <div class="video-tile" id="localTile">
            <video id="localVideo" class="mirror ${hasInitialVideo ? '' : 'hidden'}" autoplay muted playsinline></video>
            <div id="localNoCam" class="tile-no-cam-hero ${hasInitialVideo ? 'hidden' : ''}">
              <div class="tile-avatar-halo">
                ${avatarHTML(S.user, 'xl')}
              </div>
              <div class="tile-hero-name">${esc(S.user.name)}</div>
              <div class="tile-status-tag">
                <span class="tile-tag-dot"></span>
                <span>Camera Off</span>
              </div>
            </div>

            <!-- Floating Top HUD Controls -->
            <div class="tile-hud-top">
              <div class="tile-hud-badges">
                <div class="tile-screen-badge hidden" id="localScreenBadge">
                  ${icon('screen')} <span>Presenting Screen</span>
                </div>
              </div>
              <div class="tile-hud-actions">
                <button type="button" class="tile-action-btn tile-pin-btn" title="Pin / Spotlight">${icon('pin')}</button>
                <button type="button" class="tile-action-btn tile-fs-btn" title="Full Screen">${icon('maximize')}</button>
              </div>
            </div>

            <!-- Floating Bottom HUD Bar -->
            <div class="video-label-bar">
              <div class="tile-name-badge">
                <span class="tile-mic-icon ${activeRoom.audioOn ? 'on' : 'off'}" id="localMicIcon">
                  ${activeRoom.audioOn ? icon('mic') : icon('micOff')}
                </span>
                <span>${esc(S.user.name)} (You)</span>
                <span class="tile-voice-wave" aria-hidden="true"><i></i><i></i><i></i></span>
              </div>
            </div>
          </div>
        </div>
        <!-- Filmstrip Slot for participants during Presentation -->
        <div class="meet-filmstrip-slot hidden" id="meetFilmstripSlot"></div>
      </div>

      <aside class="meet-studio-drawer hidden" id="meetStudioDrawer">
        <div class="row between align-center" style="margin-bottom:12px">
          <strong style="font-size:15px;display:flex;align-items:center;gap:6px">⚙️ Call Audio &amp; Video Settings</strong>
          <button class="icon-btn" id="closeStudioBtn" style="color:#fff">${icon('close')}</button>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05);display:flex;flex-direction:column;gap:12px">
          <strong style="font-size:13px;display:flex;align-items:center;gap:6px">🔌 Input &amp; Output Devices</strong>
          
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Microphone (Audio Input)</span>
            <select id="selAudioIn"></select>
          </label>

          <div>
            <div class="muted" style="font-size:11px;margin-bottom:4px;display:flex;justify-content:space-between">
              <span>Microphone Input Level</span>
              <span id="gainValLabel" class="pill green" style="padding:1px 6px;font-size:10px">Live</span>
            </div>
            <div class="meter-bar"><div class="meter-fill" id="micMeterFill"></div></div>
          </div>

          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Speaker / Headphones (Audio Output)</span>
            <select id="selAudioOut"></select>
          </label>
          <div style="margin-top:-4px">
            <button type="button" class="btn sm ghost" id="testSpeakerBtn" style="width:100%;font-size:11.5px;padding:5px 0">
              🔊 Test Speakers
            </button>
          </div>

          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Camera (Video Input)</span>
            <select id="selVideoIn"></select>
          </label>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05);display:flex;flex-direction:column;gap:10px">
          <strong style="font-size:13px;display:flex;align-items:center;gap:6px">🎙️ Voice Processing</strong>
          <label class="pref-toggle-row" style="padding:10px 12px;border-radius:12px">
            <div>
              <strong style="font-size:12.5px">AI Noise Suppression</strong>
              <p class="muted xs">Filter background noise and keyboard clicks</p>
            </div>
            <input type="checkbox" id="mixNoise" checked>
          </label>
          <label class="pref-toggle-row" style="padding:10px 12px;border-radius:12px">
            <div>
              <strong style="font-size:12.5px">Echo Cancellation</strong>
              <p class="muted xs">Prevent speaker feedback loops</p>
            </div>
            <input type="checkbox" id="mixEcho" checked>
          </label>
          <label class="pref-toggle-row" style="padding:10px 12px;border-radius:12px">
            <div>
              <strong style="font-size:12.5px">Auto Gain Control</strong>
              <p class="muted xs">Normalize voice volume automatically</p>
            </div>
            <input type="checkbox" id="mixAgc" checked>
          </label>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05);display:flex;flex-direction:column;gap:10px">
          <strong style="font-size:13px;display:flex;align-items:center;gap:6px">📹 Camera Options</strong>
          <label class="pref-toggle-row" style="padding:10px 12px;border-radius:12px">
            <div>
              <strong style="font-size:12.5px">Mirror My Video</strong>
              <p class="muted xs">Flip local camera preview horizontally</p>
            </div>
            <input type="checkbox" id="fxMirror" checked>
          </label>
        </div>
      </aside>
    </div>

    <div class="meet-react-popover hidden" id="meetReactPopover">
      <div class="meet-react-row">
        <button type="button" class="meet-react-btn" data-emoji="❤️" title="Love">❤️</button>
        <button type="button" class="meet-react-btn" data-emoji="👍" title="Thumbs Up">👍</button>
        <button type="button" class="meet-react-btn" data-emoji="👏" title="Applause">👏</button>
        <button type="button" class="meet-react-btn" data-emoji="😂" title="Laugh">😂</button>
        <button type="button" class="meet-react-btn" data-emoji="🎉" title="Party">🎉</button>
        <button type="button" class="meet-react-btn" data-emoji="🔥" title="Fire">🔥</button>
        <button type="button" class="meet-react-btn" data-emoji="😮" title="Surprised">😮</button>
        <button type="button" class="meet-react-btn" data-emoji="🙌" title="Celebrate">🙌</button>
        <button type="button" class="meet-react-btn" data-emoji="💯" title="100">💯</button>
      </div>
    </div>

    <div class="meet-dock-popover hidden" id="meetAudioMenuPopover">
      <div class="meet-popover-title">Audio Output &amp; Mic</div>
      <div class="meet-popover-list" id="meetAudioMenuList"></div>
    </div>

    <div class="meet-dock-popover hidden" id="meetMorePopover">
      <button type="button" class="meet-more-item" id="dockScreen">${icon('screen')} <span>Share Screen</span></button>
      <button type="button" class="meet-more-item" id="dockFlipCam">${icon('refresh')} <span>Switch Camera</span></button>
      <button type="button" class="meet-more-item" id="dockFullscreen">${icon('maximize')} <span>Fullscreen</span></button>
      <button type="button" class="meet-more-item" id="dockStudio">${icon('sliders')} <span>Call Settings &amp; Effects</span></button>
    </div>

    <footer class="meet-dock">
      <div class="dock-audio-group ${activeRoom.audioOn ? '' : 'off'}" id="dockAudioGroup">
        <button class="dock-btn dock-audio-menu-btn" id="dockAudioRouteBtn" title="Audio Output (Speaker / Headphones)" aria-label="Select audio output">
          ${icon('chevronUp')}
        </button>
        <button class="dock-btn ${activeRoom.audioOn ? '' : 'off'}" id="dockMic" title="Toggle microphone" aria-label="Toggle microphone">${icon(activeRoom.audioOn ? 'mic' : 'micOff')}</button>
      </div>
      <button class="dock-btn ${activeRoom.videoOn ? '' : 'off'}" id="dockCam" title="Toggle camera" aria-label="Toggle camera">${icon('video')}</button>
      <button class="dock-btn" id="dockReact" title="Send reaction" aria-label="Send reaction">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      </button>
      <button class="dock-btn" id="dockMore" title="More options" aria-label="More options">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      <button class="dock-btn hangup" id="dockLeave" title="Leave Call" aria-label="Leave Call">${icon('phone')}</button>
    </footer>`;

  hydrateIcons(roomEl);

  const localV = $('#localVideo');
  if (rawStream && localV) {
    setLocalVideoPreview(localV, activeRoom.videoOn ? rawStream : null);
  }
  $('#roomCodeBadge').onclick = () => { navigator.clipboard?.writeText(m.code).catch(() => {}); };

  const localTile = $('#localTile');
  if (localTile) {
    localTile.ondblclick = () => toggleTileFullscreen(localTile);
    localTile.querySelector('.tile-fs-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTileFullscreen(localTile);
    });
    localTile.querySelector('.tile-pin-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePinTile(localTile);
    });
  }

  // Picture-in-Picture Multitasking Toggle (Google Meet & Discord Style)
  const pipBtn = $('#meetPipBtn');
  const expandBtn = $('#meetExpandBtn');
  const pipExpandBtn = $('#meetPipExpandBtn');
  const pipTitlePill = $('#pipTitlePill');
  const pipResizeHandle = $('#meetPipResizeHandle');

  const enterPip = () => {
    roomEl.classList.add('is-pip');
    // In PiP mode, select the focused tile: screenshare > remote peer > local
    const stage = $('#meetStage');
    const allTiles = Array.from(stage?.querySelectorAll('.video-tile') || []);
    const focusTile = allTiles.find(t => t.classList.contains('is-screen')) ||
                      allTiles.find(t => t.id !== 'localTile') ||
                      allTiles[0];
    allTiles.forEach(t => t.classList.remove('pip-active'));
    if (focusTile) focusTile.classList.add('pip-active');

    // Always snap cleanly to the bottom-right corner on pop-up using CSS rules + saved size
    roomEl.style.removeProperty('left');
    roomEl.style.removeProperty('top');
    roomEl.style.removeProperty('right');
    roomEl.style.removeProperty('bottom');
    applyPipSavedSize(roomEl);
    pipBtn.style.display = 'none';
    if (expandBtn) expandBtn.style.display = 'inline-flex';
    if (pipExpandBtn) pipExpandBtn.classList.remove('hidden');
    if (pipTitlePill) pipTitlePill.classList.remove('hidden');
    if (pipResizeHandle) pipResizeHandle.classList.remove('hidden');
  };

  const exitPip = () => {
    roomEl.classList.remove('is-pip', 'pip-compact', 'pip-expanded');
    const allTiles = Array.from(document.querySelectorAll('.video-tile'));
    allTiles.forEach(t => t.classList.remove('pip-active'));
    roomEl.style.removeProperty('left');
    roomEl.style.removeProperty('top');
    roomEl.style.removeProperty('right');
    roomEl.style.removeProperty('bottom');
    roomEl.style.removeProperty('width');
    roomEl.style.removeProperty('height');
    roomEl.style.transition = '';
    pipBtn.style.display = 'inline-flex';
    if (expandBtn) expandBtn.style.display = 'none';
    if (pipExpandBtn) pipExpandBtn.classList.add('hidden');
    if (pipTitlePill) pipTitlePill.classList.add('hidden');
    if (pipResizeHandle) pipResizeHandle.classList.add('hidden');
    updateStageLayout();
  };

  if (pipBtn) pipBtn.onclick = enterPip;
  if (expandBtn) expandBtn.onclick = exitPip;
  if (pipExpandBtn) pipExpandBtn.onclick = exitPip;
  window.minimizeMeetingToPip = enterPip;
  window.expandMeetingFromPip = exitPip;
  enablePipDragging(roomEl);

  const closeAllDockPopovers = (exceptId = '') => {
    ['meetReactPopover', 'meetAudioMenuPopover', 'meetMorePopover'].forEach(id => {
      if (id !== exceptId) document.getElementById(id)?.classList.add('hidden');
    });
  };

  if (roomEl._outsideClickHandler) {
    document.removeEventListener('click', roomEl._outsideClickHandler);
  }
  roomEl._outsideClickHandler = (e) => {
    if (!e.target.closest('.meet-dock, .meet-react-popover, .meet-dock-popover')) {
      closeAllDockPopovers();
    }
  };
  document.addEventListener('click', roomEl._outsideClickHandler);

  // Fullscreen dock item (inside 3-dots More menu)
  $('#dockFullscreen')?.addEventListener('click', () => {
    closeAllDockPopovers();
    const spotlightTile = $('#meetSpotlightSlot .video-tile') ||
                          document.querySelector('.video-tile.is-screen') ||
                          document.querySelector('.video-tile[data-pinned="true"]') ||
                          $('#localTile');
    if (spotlightTile) {
      toggleTileFullscreen(spotlightTile);
    }
  });

  // Switch Camera (cycles front/back cameras cleanly on phone or multi-cam setups)
  $('#dockFlipCam')?.addEventListener('click', async () => {
    closeAllDockPopovers();
    if (!activeRoom) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const cams = devices.filter(d => d.kind === 'videoinput');
      let nextDeviceId = '';
      if (cams.length > 1) {
        const curIdx = cams.findIndex(c => c.deviceId === activeRoom.videoDeviceId);
        nextDeviceId = cams[(curIdx + 1) % cams.length]?.deviceId || '';
      }
      const nextFacing = activeRoom._facingMode === 'environment' ? 'user' : 'environment';
      activeRoom._facingMode = nextFacing;
      const newVid = await navigator.mediaDevices.getUserMedia({
        video: nextDeviceId ? { deviceId: { exact: nextDeviceId } } : { facingMode: nextFacing }
      });
      const newTrack = newVid.getVideoTracks()[0];
      if (!newTrack) return;
      activeRoom.videoDeviceId = newTrack.getSettings?.().deviceId || nextDeviceId || activeRoom.videoDeviceId;
      activeRoom.videoOn = true;
      if (!activeRoom.rawStream) activeRoom.rawStream = new MediaStream();
      activeRoom.rawStream.getVideoTracks().forEach(t => { t.stop(); activeRoom.rawStream.removeTrack(t); });
      activeRoom.rawStream.addTrack(newTrack);
      if (activeRoom.stream && activeRoom.stream !== activeRoom.rawStream) {
        activeRoom.stream.getVideoTracks().forEach(t => { t.stop(); activeRoom.stream.removeTrack(t); });
        activeRoom.stream.addTrack(newTrack);
      }
      if (localV) {
        setLocalVideoPreview(localV, activeRoom.rawStream);
        localV.classList.remove('hidden');
      }
      $('#localNoCam')?.classList.add('hidden');
      $('#dockCam')?.classList.remove('off');
      activeRoom.peers.forEach(async (entry, connId) => {
        await syncPeerTrack(connId, entry, 'video', newTrack, activeRoom.stream || activeRoom.rawStream);
      });
    } catch {}
  });

  // Reaction popover & action
  $('#dockReact')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = $('#meetReactPopover');
    const willOpen = pop?.classList.contains('hidden');
    closeAllDockPopovers();
    if (willOpen) pop?.classList.remove('hidden');
  });

  $('#meetReactPopover')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.target.closest('.meet-react-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    if (emoji) sendMeetingReaction(emoji);
  });

  // 3-dots More menu
  $('#dockMore')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = $('#meetMorePopover');
    const willOpen = pop?.classList.contains('hidden');
    closeAllDockPopovers();
    if (willOpen) pop?.classList.remove('hidden');
  });

  const toggleStudio = () => {
    closeAllDockPopovers();
    activeRoom.studioOpen = !activeRoom.studioOpen;
    $('#meetStudioDrawer').classList.toggle('hidden', !activeRoom.studioOpen);
    $('#dockStudio')?.classList.toggle('active', activeRoom.studioOpen);
    if (activeRoom.studioOpen) populateStudioDevices();
  };
  $('#dockStudio').onclick = toggleStudio;
  $('#closeStudioBtn').onclick = toggleStudio;

  bindStudioControls();

  // Merged Google-Meet Audio Output + Mic group
  activeRoom.speakerOn = Boolean(initialVideo);
  const renderAudioMenuList = async () => {
    const list = $('#meetAudioMenuList');
    if (!list || !activeRoom) return;
    const isAndroid = Boolean(window.ZovioAndroid?.isAvailable?.());
    if (isAndroid) {
      let info = null;
      try { info = await window.ZovioAndroid.getAudioRoutes(); } catch {}
      const hasBluetooth = Boolean(info?.hasBluetooth);
      const hasHeadset = Boolean(info?.hasHeadset);
      const btLabel = info?.bluetoothName || 'Bluetooth Headphones';
      const wiredLabel = info?.headsetName || 'Wired Headphones';
      const activeRoute = info?.activeRoute || (info?.speaker ? 'speaker' : (hasBluetooth ? 'bluetooth' : (hasHeadset ? 'wired' : 'earpiece')));
      activeRoom.audioRoute = activeRoute;
      activeRoom.speakerOn = activeRoute === 'speaker';

      const choices = [];
      if (hasBluetooth) {
        choices.push({ route: 'bluetooth', ic: 'bluetooth', label: btLabel });
      }
      if (hasHeadset) {
        choices.push({ route: 'wired', ic: 'headphones', label: wiredLabel });
      }
      choices.push({ route: 'speaker', ic: 'volume', label: 'Speakerphone' });
      choices.push({ route: 'earpiece', ic: 'phone', label: 'Phone Earpiece' });

      list.innerHTML = choices.map(ch => `
        <button type="button" class="meet-audio-choice ${activeRoute === ch.route ? 'active' : ''}" data-android-route="${ch.route}">
          ${icon(ch.ic)} <span>${esc(ch.label)}</span> ${activeRoute === ch.route ? '<span class="check-dot"></span>' : ''}
        </button>`).join('');
      hydrateIcons(list);
      list.querySelectorAll('[data-android-route]').forEach(b => {
        b.onclick = async (ev) => {
          ev.stopPropagation();
          const chosen = b.dataset.androidRoute || 'speaker';
          activeRoom.audioRoute = chosen;
          activeRoom.speakerOn = chosen === 'speaker';
          await window.ZovioAndroid?.setAudioRoute?.(chosen).catch(() => {});
          closeAllDockPopovers();
        };
      });
    } else {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const outs = devices.filter(d => d.kind === 'audiooutput');
      const curOut = $('#studioOutputSelect')?.value || 'default';
      list.innerHTML = (outs.length ? outs : [{ deviceId: 'default', label: 'System Default Speaker' }]).map(d => `
        <button type="button" class="meet-audio-choice ${curOut === d.deviceId ? 'active' : ''}" data-sink-id="${esc(d.deviceId)}">
          ${icon('volume')} <span>${esc(d.label || 'Audio Output')}</span> ${curOut === d.deviceId ? '<span class="check-dot"></span>' : ''}
        </button>`).join('');
      hydrateIcons(list);
      list.querySelectorAll('[data-sink-id]').forEach(b => {
        b.onclick = async (ev) => {
          ev.stopPropagation();
          const sinkId = b.dataset.sinkId;
          const outSel = $('#studioOutputSelect');
          if (outSel) outSel.value = sinkId;
          document.querySelectorAll('.remote-tile audio, .remote-tile video').forEach(el => {
            if (typeof el.setSinkId === 'function') el.setSinkId(sinkId).catch(() => {});
          });
          closeAllDockPopovers();
        };
      });
    }
  };

  $('#dockAudioRouteBtn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const pop = $('#meetAudioMenuPopover');
    const willOpen = pop?.classList.contains('hidden');
    closeAllDockPopovers();
    if (willOpen) {
      await renderAudioMenuList();
      pop?.classList.remove('hidden');
    }
  });

  // Microphone toggle
  $('#dockMic').onclick = () => {
    activeRoom.audioOn = !activeRoom.audioOn;
    activeRoom.rawStream?.getAudioTracks().forEach(t => { t.enabled = activeRoom.audioOn; });
    activeRoom.stream?.getAudioTracks().forEach(t => { t.enabled = activeRoom.audioOn; });
    $('#dockMic').classList.toggle('off', !activeRoom.audioOn);
    $('#dockMic').innerHTML = activeRoom.audioOn ? icon('mic') : icon('micOff');
    $('#dockAudioGroup')?.classList.toggle('off', !activeRoom.audioOn);
    if (!activeRoom.audioOn) {
      activeRoom._localSpeakUntil = 0;
      setTileSpeaking($('#localTile'), false);
    }
    const localMicIcon = $('#localMicIcon');
    if (localMicIcon) {
      localMicIcon.className = `tile-mic-icon ${activeRoom.audioOn ? 'on' : 'off'}`;
      localMicIcon.innerHTML = activeRoom.audioOn ? icon('mic') : icon('micOff');
    }
    S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: !!activeRoom.screenStream } }));
  };

  // Camera toggle (Hardware-Safe: physically releases webcam device when off)
  $('#dockCam').onclick = async () => {
    activeRoom.videoOn = !activeRoom.videoOn;
    if (!activeRoom.videoOn) {
      // Physically stop and remove all video tracks so webcam light turns 100% OFF
      if (activeRoom.rawStream) {
        activeRoom.rawStream.getVideoTracks().forEach(t => {
          t.enabled = false;
          t.stop();
          activeRoom.rawStream.removeTrack(t);
        });
      }
      if (activeRoom.stream) {
        activeRoom.stream.getVideoTracks().forEach(t => {
          t.enabled = false;
          t.stop();
          activeRoom.stream.removeTrack(t);
        });
      }
      if (localV) {
        localV.srcObject = null;
      }
      activeRoom.peers.forEach(async (entry) => {
        const sender = getVideoSender(entry.pc);
        if (sender) {
          await sender.replaceTrack(null).catch(() => {});
        }
      });
    } else {
      try {
        const newVid = await navigator.mediaDevices.getUserMedia({
          video: activeRoom.videoDeviceId ? { deviceId: { exact: activeRoom.videoDeviceId } } : true
        });
        const newTrack = newVid.getVideoTracks()[0];
        if (newTrack) {
          if (!activeRoom.rawStream) activeRoom.rawStream = new MediaStream();
          activeRoom.rawStream.addTrack(newTrack);
          if (activeRoom.stream && activeRoom.stream !== activeRoom.rawStream) {
            activeRoom.stream.addTrack(newTrack);
          } else {
            activeRoom.stream = activeRoom.rawStream;
          }
          if (localV) {
            setLocalVideoPreview(localV, activeRoom.rawStream);
          }
          activeRoom.peers.forEach(async (entry, connId) => {
            await syncPeerTrack(connId, entry, 'video', newTrack, activeRoom.stream || activeRoom.rawStream);
          });
        }
      } catch (err) {
        activeRoom.videoOn = false;
        toast('Camera unavailable: ' + err.message, 'err');
      }
    }

    $('#dockCam').classList.toggle('off', !activeRoom.videoOn);
    if (localV) localV.classList.toggle('hidden', !activeRoom.videoOn);
    $('#localNoCam')?.classList.toggle('hidden', activeRoom.videoOn);
    S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: !!activeRoom.screenStream } }));
  };

  const cleanupRustScreenCapture = () => {
    if (!activeRoom) return;
    activeRoom._rustCaptureActive = false;
    if (activeRoom._relayTrackReader) {
    try { activeRoom._relayTrackReader.cancel(); } catch {}
    activeRoom._relayTrackReader = null;
  }
  if (activeRoom._relayEncoder) {
    try {
      if (activeRoom._relayEncoder.state !== 'closed') activeRoom._relayEncoder.close();
    } catch {}
    activeRoom._relayEncoder = null;
  }
  if (activeRoom._rustVideoTimer) {
      clearInterval(activeRoom._rustVideoTimer);
      activeRoom._rustVideoTimer = null;
    }
    if (activeRoom._rustAudioTimer) {
      clearInterval(activeRoom._rustAudioTimer);
      activeRoom._rustAudioTimer = null;
    }
    try { activeRoom._rustVideoWriter?.close?.(); } catch {}
    try { activeRoom._rustAudioWriter?.close?.(); } catch {}
    activeRoom._rustVideoWriter = null;
    activeRoom._rustAudioWriter = null;
    try { window.fireuppNative?.stopRustScreenShare?.(); } catch {}
  };

  const cleanupAndroidScreenCapture = () => {
    window.__zovioAndroidScreenFrame = null;
    if (activeRoom?._androidScreenCanvas) {
      activeRoom._androidScreenCanvas = null;
    }
    try { window.ZovioAndroid?.stopScreenShare?.().catch(() => {}); } catch {}
  };

  const tryStartAndroidScreenStream = async (maxW, maxH, targetFps, shareAudio) => {
    if (!window.ZovioAndroid?.isAvailable?.()) return null;
    const capW = Math.min(1280, Math.max(480, maxW || 720));
    const capH = Math.min(1280, Math.max(480, maxH || 1280));
    const fps = Math.min(30, Math.max(10, targetFps || 20));
    const res = await window.ZovioAndroid.startScreenShare({
      maxWidth: capW,
      maxHeight: capH,
      fps,
      shareAudio: Boolean(shareAudio)
    });
    if (!res?.ok) throw new Error(res?.error || 'Screen sharing permission denied');

    const canvas = document.createElement('canvas');
    canvas.width = res.width || capW;
    canvas.height = res.height || capH;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let drawing = false;
    window.__zovioAndroidScreenFrame = (dataUrl) => {
      if (!activeRoom || !canvas || drawing || !dataUrl) return;
      drawing = true;
      const img = new Image();
      img.onload = () => {
        try {
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch {}
        drawing = false;
      };
      img.onerror = () => { drawing = false; };
      img.src = dataUrl;
    };

    const stream = canvas.captureStream(fps);
    activeRoom._androidScreenCanvas = canvas;
    return { stream };
  };

  // Screen sharing controls
  const stopScreenShare = async () => {
    cleanupRustScreenCapture();
    cleanupAndroidScreenCapture();
    if (!activeRoom || !activeRoom.screenStream) return;
    try {
      activeRoom.screenStream.getTracks().forEach(t => { t.enabled = false; t.stop(); });
    } catch {}
    activeRoom.screenStream = null;
    if (activeRoom.screenAudioSrc) {
      try { activeRoom.screenAudioSrc.disconnect(); } catch {}
      activeRoom.screenAudioSrc = null;
    }
    activeRoom.screenAudioTrack = null;
    try { window.fireuppNative?.setScreenShareActive?.(false); } catch {}

    const camTrack = activeRoom.videoOn ? (activeRoom.rawStream?.getVideoTracks()[0] || null) : null;
    const micTrack = activeRoom.rawStream?.getAudioTracks()[0] || null;
    const tile = $('#localTile');
    if (tile) tile.classList.remove('is-screen');
    if (localV) {
      setLocalVideoPreview(localV, activeRoom.videoOn ? activeRoom.rawStream : null);
      localV.classList.remove('screen-share');
      if (activeRoom.videoFx?.mirror) localV.classList.add('mirror');
      localV.style.objectFit = 'cover';
      localV.classList.toggle('hidden', !activeRoom.videoOn);
    }
    $('#localNoCam')?.classList.toggle('hidden', activeRoom.videoOn);
    $('#dockScreen')?.classList.remove('active');
    if (roomEl?.classList.contains('is-pip') || document.body.classList.contains('android-pip-active')) {
      const allTiles = Array.from($('#meetStage')?.querySelectorAll('.video-tile') || []);
      const focusTile = allTiles.find(t => t.id !== 'localTile') || allTiles[0];
      allTiles.forEach(t => t.classList.remove('pip-active'));
      if (focusTile) focusTile.classList.add('pip-active');
    }
    updateStageLayout();

    activeRoom.peers.forEach(async (entry, connId) => {
      await syncPeerTrack(connId, entry, 'video', camTrack, activeRoom.rawStream);
      if (micTrack) {
        await syncPeerTrack(connId, entry, 'audio', micTrack, activeRoom.rawStream);
      }
    });

    S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: false } }));
    activeRoom._refreshRelayPump?.();
  };

  const tryStartRustScreenStream = (targetSourceId, maxW, maxH, targetFps, shareAudio) => {
    if (!window.fireuppNative?.hasRustMediaEngine || typeof MediaStreamTrackGenerator !== 'function' || typeof VideoFrame !== 'function') {
      return null;
    }
    const res = window.fireuppNative.startRustScreenShare({
      sourceId: targetSourceId || 'screen:0:0',
      maxWidth: maxW,
      maxHeight: maxH,
      fps: targetFps,
      shareAudio: Boolean(shareAudio),
      showCursor: true
    });
    if (!res || !res.ok) {
      console.warn('[RustMedia] Native capture unavailable, falling back:', res?.error);
      return null;
    }

    const vGen = new MediaStreamTrackGenerator({ kind: 'video' });
    const vWriter = vGen.writable.getWriter();
    const tracks = [vGen];

    let aWriter = null;
    if (res.audioOk && typeof AudioData === 'function') {
      const aGen = new MediaStreamTrackGenerator({ kind: 'audio' });
      aWriter = aGen.writable.getWriter();
      tracks.push(aGen);
    }

    activeRoom._rustCaptureActive = true;
    activeRoom._rustVideoWriter = vWriter;
    activeRoom._rustAudioWriter = aWriter;

    let lastSeq = 0;
    let rustFrameIdx = 0;
    let writingV = false;
    const pollVideoMs = Math.max(4, Math.floor(1000 / Math.min(120, (targetFps || 30) * 3)));
    const pumpVideo = () => {
      if (!activeRoom || !activeRoom._rustCaptureActive) return;
      const peersArr = activeRoom.peers ? Array.from(activeRoom.peers.values()) : [];
      const hasLiveRtcPeer = peersArr.some(p => p.pc?.iceConnectionState === 'connected' || p.pc?.iceConnectionState === 'completed');
      const relayActive = peersArr.length > 0 && !hasLiveRtcPeer && activeRoom._relayEncoder?.state === 'configured';
      if (relayActive && activeRoom._canAcceptRelayVideo && !activeRoom._canAcceptRelayVideo(targetFps || 30)) {
        return; // Avoid copying 1.4-3MB I420 frames into JS while encoder is cooling down or busy
      }
      const frame = window.fireuppNative.pollRustVideoFrame(lastSeq);
      if (!frame || !frame.data || frame.seq === lastSeq) return;
      lastSeq = frame.seq;
      rustFrameIdx++;
      let vf = null;
      try {
        vf = new VideoFrame(frame.data, {
          format: 'I420',
          codedWidth: frame.width,
          codedHeight: frame.height,
          timestamp: Math.round(performance.now() * 1000)
        });
        // Feed WebCodecs Server Relay directly at native Rust WGC cadence
        try {
          activeRoom._encodeRustVideoFrame?.(vf, frame.width, frame.height, targetFps || 30);
        } catch {}
        // Skip duplicate WebRTC track encoding when all peers use WebCodecs Server Relay
        const skipPreviewWrite = relayActive
          ? (document.hidden ? (rustFrameIdx % 20 !== 0) : (rustFrameIdx % 3 !== 0))
          : (document.hidden && peersArr.length > 0 && !hasLiveRtcPeer && (rustFrameIdx % 15 !== 0));
        if (!writingV && !skipPreviewWrite) {
          writingV = true;
          Promise.resolve(vWriter.write(vf)).catch(() => {}).finally(() => {
            try { vf.close(); } catch {}
            writingV = false;
          });
        } else {
          try { vf.close(); } catch {}
        }
      } catch {
        try { vf?.close(); } catch {}
      }
    };
    pumpVideo();
    activeRoom._rustVideoTimer = setInterval(pumpVideo, pollVideoMs);

    if (aWriter) {
      let audioSamplesCursor = 0;
      let writingA = false;
      const pumpAudio = () => {
        if (!activeRoom || !activeRoom._rustCaptureActive || writingA) return;
        const pcm = window.fireuppNative.pollRustAudioPcm();
        if (!pcm || pcm.length < 2) return;
        const numFrames = Math.floor(pcm.length / 2);
        if (numFrames <= 0) return;
        writingA = true;
        let ad = null;
        try {
          ad = new AudioData({
            format: 'f32',
            sampleRate: 48000,
            numberOfFrames: numFrames,
            numberOfChannels: 2,
            timestamp: Math.round((audioSamplesCursor / 48000) * 1000000),
            data: pcm
          });
          audioSamplesCursor += numFrames;
          Promise.resolve(aWriter.write(ad)).catch(() => {}).finally(() => {
            try { ad.close(); } catch {}
            writingA = false;
          });
        } catch {
          try { ad?.close(); } catch {}
          writingA = false;
        }
      };
      activeRoom._rustAudioTimer = setInterval(pumpAudio, 12);
    }

    return { stream: new MediaStream(tracks), audioOk: Boolean(res.audioOk), audioError: res.audioError || null };
  };

  const executeScreenCapture = async (displaySurface, targetFps, targetRes, shareAudio, sourceId = null) => {
    try {
      cleanupRustScreenCapture();
      cleanupAndroidScreenCapture();
      if (activeRoom.screenStream) {
        try { activeRoom.screenStream.getTracks().forEach(t => { t.enabled = false; t.stop(); }); } catch {}
        activeRoom.screenStream = null;
      }
      const width = targetRes === 1080 ? 1920 : 1280;
      const height = targetRes === 1080 ? 1080 : 720;
      let disp = null;
      let usedRustEngine = false;

      const rustCap = tryStartRustScreenStream(sourceId, width, height, targetFps, shareAudio);
      if (rustCap && rustCap.stream) {
        disp = rustCap.stream;
        usedRustEngine = true;
        if (shareAudio && !rustCap.audioOk && rustCap.audioError) {
          console.warn('[RustMedia] PID-excluded audio fallback:', rustCap.audioError);
        }
      } else if (window.ZovioAndroid?.isAvailable?.()) {
        const androidCap = await tryStartAndroidScreenStream(720, 1280, Math.min(20, targetFps || 20), shareAudio);
        if (androidCap?.stream) disp = androidCap.stream;
      } else if (sourceId) {
        // Native Desktop Screen Capture fallback via Electron Source ID
        disp = await navigator.mediaDevices.getUserMedia({
          audio: shareAudio ? { mandatory: { chromeMediaSource: 'desktop' } } : false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: width,
              maxHeight: height,
              maxFrameRate: targetFps
            }
          }
        });
      } else {
        try {
          disp = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface,
              cursor: 'always',
              frameRate: { ideal: targetFps, max: 60 },
              width: { ideal: width, max: 2560 },
              height: { ideal: height, max: 1440 }
            },
            audio: shareAudio,
            selfBrowserSurface: 'exclude',
            systemAudio: shareAudio ? 'include' : 'exclude'
          });
        } catch {
          disp = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false
          });
        }
      }

      const screenTrack = disp.getVideoTracks()[0];
      if (!screenTrack) return;

      try {
        if ('contentHint' in screenTrack) {
          screenTrack.contentHint = targetFps >= 30 ? 'motion' : 'detail';
        }
      } catch {}

      activeRoom.screenStream = disp;
      activeRoom.screenTargetFps = targetFps;
      activeRoom.screenTargetRes = targetRes;
      try { window.fireuppNative?.setScreenShareActive?.(true); } catch {}

      // Mix Chrome/YouTube/Desktop audio into outgoing call audio if captured
      const dispAudioTrack = disp.getAudioTracks()[0] || null;
      let outgoingAudioTrack = activeRoom.rawStream?.getAudioTracks()[0] || null;
      let outgoingAudioStream = activeRoom.rawStream;
      if (dispAudioTrack && activeRoom.audioCtx && activeRoom.audioMixGain) {
        try {
          if (activeRoom.screenAudioSrc) {
            try { activeRoom.screenAudioSrc.disconnect(); } catch {}
          }
          const screenSrc = activeRoom.audioCtx.createMediaStreamSource(new MediaStream([dispAudioTrack]));
          const screenGain = activeRoom.audioCtx.createGain();
          screenGain.gain.value = 0.90;
          screenSrc.connect(screenGain);
          // audioMixGain already feeds both audioProcessor (WS relay) and mixDest (WebRTC)
          screenGain.connect(activeRoom.audioMixGain);
          if (activeRoom.mixDest) {
            outgoingAudioTrack = activeRoom.mixDest.stream.getAudioTracks()[0] || outgoingAudioTrack;
            outgoingAudioStream = activeRoom.mixDest.stream;
          }
          activeRoom.screenAudioSrc = screenSrc;
          activeRoom.screenAudioTrack = dispAudioTrack;
        } catch (saErr) {
          console.warn('Screen audio mix err:', saErr);
        }
      }

      $('#dockScreen')?.classList.add('active');

      const tile = $('#localTile');
      if (tile) tile.classList.add('is-screen');
      if (localV) {
        setLocalVideoPreview(localV, disp);
        localV.classList.remove('mirror', 'hidden');
        localV.classList.add('screen-share');
        localV.style.objectFit = 'contain';
      }
      $('#localNoCam')?.classList.add('hidden');
      updateStageLayout();

      try {
        if ('contentHint' in screenTrack) screenTrack.contentHint = 'motion';
      } catch {}

      activeRoom.peers.forEach(async (entry, connId) => {
        preferHardwareVideoCodecs(entry.pc);
        await syncPeerTrack(connId, entry, 'video', screenTrack, disp);
        if (dispAudioTrack && outgoingAudioTrack) {
          await syncPeerTrack(connId, entry, 'audio', outgoingAudioTrack, outgoingAudioStream);
        }
        try {
          const vTr = getVideoTransceiver(entry.pc);
          if (vTr?.sender && typeof vTr.sender.getParameters === 'function') {
            const params = vTr.sender.getParameters();
            if (!params.encodings || !params.encodings.length) params.encodings = [{}];
            params.degradationPreference = 'maintain-framerate';
            params.encodings[0].scaleResolutionDownBy = 1.0;
            params.encodings[0].maxBitrate = targetRes >= 1080 ? 3500000 : 2200000;
            params.encodings[0].maxFramerate = Math.min(60, targetFps || 30);
            params.encodings[0].networkPriority = 'high';
            await vTr.sender.setParameters(params).catch(() => {});
          }
        } catch {}
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: true } }));
      activeRoom._refreshRelayPump?.();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen share error:', err);
        toast('Could not share screen: ' + err.message, 'err');
      }
    }
  };

  const openDiscordScreenShareModal = async () => {
    let nativeSources = [];
    if (window.fireuppNative?.getScreenSources) {
      try {
        nativeSources = await window.fireuppNative.getScreenSources();
      } catch (e) {
        console.warn('Native getScreenSources err:', e);
      }
    }

    if (!nativeSources || !nativeSources.length) {
      // Fallback for browsers or when native sources aren't available
      await executeScreenCapture('monitor', 30, 720, true);
      return;
    }

    let modal = document.getElementById('discordScreenModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'discordScreenModal';
      modal.className = 'modal-back';
      document.body.appendChild(modal);
    }

    const windowSources = nativeSources.filter(s => s.id.startsWith('window:'));
    const screenSources = nativeSources.filter(s => s.id.startsWith('screen:'));
    let activeTab = windowSources.length ? 'window' : 'screen';
    let chosenSourceId = (windowSources[0] || screenSources[0])?.id;
    let chosenFps = 30;
    let chosenRes = 720;

    const renderSourcesGrid = () => {
      const list = activeTab === 'window' ? windowSources : screenSources;
      return list.map(s => `
        <div class="dc-source-card ${s.id === chosenSourceId ? 'active' : ''}" data-sid="${esc(s.id)}" style="display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:12px;background:rgba(255,255,255,0.04);border:2px solid ${s.id === chosenSourceId ? '#ff5722' : 'rgba(255,255,255,0.08)'};cursor:pointer;transition:all .2s ease">
          <div style="aspect-ratio:16/9;width:100%;border-radius:8px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center">
            ${s.thumbnail ? `<img src="${esc(s.thumbnail)}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-size:24px">🖥️</span>`}
          </div>
          <div class="row gap-xs align-center" style="overflow:hidden">
            ${s.appIcon ? `<img src="${esc(s.appIcon)}" style="width:16px;height:16px;object-fit:contain;flex-shrink:0">` : ''}
            <span style="font-size:11.5px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</span>
          </div>
        </div>
      `).join('');
    };

    modal.innerHTML = `
      <div class="modal-card discord-screen-card">
        <div class="discord-screen-head">
          <div class="row gap-s align-center">
            <span style="font-size:24px">🖥️</span>
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0">Share Your Screen</h3>
              <p class="muted xs" style="margin:2px 0 0 0">Select an application or entire display to stream</p>
            </div>
          </div>
          <button type="button" class="icon-btn" id="closeDiscordScreenModalBtn">${icon('close')}</button>
        </div>

        <div class="discord-screen-body">
          <div class="row gap-s" style="margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px">
            <button type="button" class="btn sm ${activeTab === 'window' ? 'primary' : 'ghost'} sc-tab-btn" data-tab="window" style="flex:1">Applications (${windowSources.length})</button>
            <button type="button" class="btn sm ${activeTab === 'screen' ? 'primary' : 'ghost'} sc-tab-btn" data-tab="screen" style="flex:1">Screens (${screenSources.length})</button>
          </div>

          <div id="discordSourcesGrid" class="discord-sources-grid">
            ${renderSourcesGrid()}
          </div>

          <div class="row between align-center wrap gap-m" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
            <div class="row gap-xs align-center">
              <span class="muted xs" style="font-weight:700">Quality:</span>
              <button type="button" class="chip active sc-fps-opt" data-fps="30" data-res="720">720p 30fps</button>
              <button type="button" class="chip sc-fps-opt" data-fps="60" data-res="1080">1080p 60fps ⚡</button>
            </div>
            <label class="row gap-xs align-center" style="cursor:pointer;font-size:12.5px;font-weight:600" title="Enable only when sharing video/music; capturing desktop audio on speakers can echo call voices">
              <input type="checkbox" id="discordScAudio" style="width:auto">
              <span>Share System Audio</span>
            </label>
          </div>

          <div class="row gap-s" style="margin-top:16px">
            <button type="button" class="btn ghost sm" id="cancelDiscordScreenBtn" style="flex:1;height:42px">Cancel</button>
            <button type="button" class="btn primary sm" id="confirmDiscordScreenBtn" style="flex:2;height:42px;font-weight:800">Go Live</button>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');

    const closeModal = () => {
      modal.classList.add('hidden');
      document.removeEventListener('keydown', onEsc);
      modal.onclick = null;
    };

    const onEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onEsc);

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    const updateGridListeners = () => {
      modal.querySelectorAll('.dc-source-card').forEach(card => {
        card.onclick = () => {
          modal.querySelectorAll('.dc-source-card').forEach(c => {
            c.classList.remove('active');
            c.style.border = '2px solid rgba(255,255,255,0.08)';
          });
          card.classList.add('active');
          card.style.border = '2px solid #ff5722';
          chosenSourceId = card.dataset.sid;
        };
      });
    };
    updateGridListeners();

    modal.querySelectorAll('.sc-tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        modal.querySelectorAll('.sc-tab-btn').forEach(b => {
          b.classList.remove('primary');
          b.classList.add('ghost');
        });
        btn.classList.add('primary');
        btn.classList.remove('ghost');
        const grid = modal.querySelector('#discordSourcesGrid');
        if (grid) {
          grid.innerHTML = renderSourcesGrid();
          updateGridListeners();
          const firstCard = grid.querySelector('.dc-source-card');
          if (firstCard) firstCard.click();
        }
      };
    });

    modal.querySelectorAll('.sc-fps-opt').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.sc-fps-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chosenFps = parseInt(btn.dataset.fps, 10) || 30;
        chosenRes = parseInt(btn.dataset.res, 10) || 720;
      };
    });

    const closeBtn = modal.querySelector('#closeDiscordScreenModalBtn');
    const cancelBtn = modal.querySelector('#cancelDiscordScreenBtn');
    const confirmBtn = modal.querySelector('#confirmDiscordScreenBtn');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const shareAudio = Boolean(modal.querySelector('#discordScAudio')?.checked);
        const targetSource = chosenSourceId || (activeTab === 'window' ? windowSources[0]?.id : screenSources[0]?.id) || 'screen:0:0';
        closeModal();
        try {
          await executeScreenCapture(activeTab === 'window' ? 'window' : 'monitor', chosenFps, chosenRes, shareAudio, targetSource);
        } catch (err) {
          console.warn('Screen share start error:', err);
          toast('Could not share screen: ' + (err?.message || 'Error'), 'err');
        }
      };
    }
  };

  const startScreenShare = async () => {
    if (activeRoom._screenShareBusy) return;
    activeRoom._screenShareBusy = true;
    const scrBtn = $('#dockScreen');
    if (scrBtn) scrBtn.disabled = true;
    try {
      if (window.fireuppNative?.getScreenSources) {
        await openDiscordScreenShareModal();
      } else {
        await executeScreenCapture('monitor', 30, 720, true);
      }
    } finally {
      activeRoom._screenShareBusy = false;
      if (scrBtn) scrBtn.disabled = false;
    }
  };

  window.__zovioScreenShareStopped = () => {
    try {
      if (activeRoom?.screenStream) stopScreenShare();
    } catch {}
  };

  $('#dockScreen').onclick = () => {
    $('#meetMorePopover')?.classList.add('hidden');
    if (activeRoom._screenShareBusy) return;
    if (activeRoom.screenStream) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  $('#dockLeave').onclick = leaveMeetingRoom;

  const attachLocalStreamToRoom = async (acquiredStream) => {
    if (!acquiredStream) return;
    if (activeRoom !== roomRef) {
      acquiredStream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      return;
    }

    const wantAudio = Boolean(roomRef.audioOn);
    const wantVideo = Boolean(roomRef.videoOn);
    const targetStream = roomRef.rawStream || new MediaStream();
    const hasExistingAudio = targetStream.getAudioTracks().length > 0;
    const hasExistingVideo = targetStream.getVideoTracks().length > 0;

    acquiredStream.getAudioTracks().forEach(t => {
      if (hasExistingAudio) {
        try { t.stop(); } catch {}
        return;
      }
      t.enabled = wantAudio;
      try { if ('contentHint' in t) t.contentHint = 'speech'; } catch {}
      targetStream.addTrack(t);
    });
    if (!wantVideo || hasExistingVideo) {
      acquiredStream.getVideoTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
    } else {
      acquiredStream.getVideoTracks().forEach(t => {
        t.enabled = true;
        targetStream.addTrack(t);
      });
    }

    roomRef.rawStream = targetStream;
    roomRef.stream = targetStream;
    roomRef.audioDeviceId = opts.audioDeviceId || targetStream.getAudioTracks()[0]?.getSettings()?.deviceId || '';
    roomRef.videoDeviceId = opts.videoDeviceId || targetStream.getVideoTracks()[0]?.getSettings()?.deviceId || '';

    const hasVid = Boolean(targetStream.getVideoTracks().length && wantVideo);
    roomRef.videoOn = hasVid;
    $('#dockCam')?.classList.toggle('off', !hasVid);
    if (localV) {
      setLocalVideoPreview(localV, hasVid ? targetStream : null);
      localV.classList.toggle('hidden', !hasVid);
    }
    $('#localNoCam')?.classList.toggle('hidden', hasVid);

    const aTrack = targetStream.getAudioTracks()[0] || null;
    const vTrack = !roomRef.screenStream ? (targetStream.getVideoTracks()[0] || null) : null;
    if (aTrack || vTrack) {
      const peerSyncs = [];
      roomRef.peers.forEach((entry, connId) => {
        if (aTrack) peerSyncs.push(syncPeerTrack(connId, entry, 'audio', aTrack, targetStream));
        if (vTrack) peerSyncs.push(syncPeerTrack(connId, entry, 'video', vTrack, targetStream));
      });
      if (peerSyncs.length) Promise.allSettled(peerSyncs);
    }

    if (roomRef._pendingAndroidRoute && window.ZovioAndroid?.isAvailable?.()) {
      window.ZovioAndroid.setAudioRoute(roomRef._pendingAndroidRoute).catch(() => {});
    }

    S.ws?.send(JSON.stringify({
      type: 'meet:state',
      state: { audio: roomRef.audioOn, video: roomRef.videoOn, screen: !!roomRef.screenStream }
    }));

    setTimeout(() => {
      if (activeRoom === roomRef) setupAudioMixPipeline();
    }, 0);
  };

  // Defer keep-alive AudioContext + MediaSession slightly so frame-1 opening animation never blocks
  setTimeout(() => {
    if (activeRoom !== roomRef) return;
    if (!window.ZovioAndroid) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const keepAliveCtx = new AudioCtx();
          const osc = keepAliveCtx.createOscillator();
          const gain = keepAliveCtx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(keepAliveCtx.destination);
          osc.start();
          roomRef.keepAliveCtx = keepAliveCtx;
        }
      } catch {}
    }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: roomRef.title || m.title || 'Zovio Call',
          artist: 'Zovio Live Audio',
          album: 'Encrypted Voice & Video'
        });
      } catch {}
    }
  }, 16);

  const isAndroidDevice = Boolean(window.ZovioAndroid?.isAvailable?.());
  if (isAndroidDevice) {
    window.ZovioAndroid.setCallPipAllowed?.(true).catch(() => {});
  }

  if (rawStream) {
    if (isAndroidDevice) {
      window.ZovioAndroid.startCallService({ title: roomRef.title || m.title || 'Zovio Call', video: initialVideo }).catch(() => {});
    }
    setTimeout(() => {
      if (activeRoom === roomRef) setupAudioMixPipeline();
    }, 0);
  } else {
    // Run Android native call service/audio routing AND camera/mic acquisition in parallel
    (async () => {
      try {
        if (isAndroidDevice) {
          await window.ZovioAndroid.ensurePermissions({ video: initialVideo, audio: true }).catch(() => {});
          if (activeRoom !== roomRef) return;
          window.ZovioAndroid.setCallPipAllowed?.(true).catch(() => {});
          window.ZovioAndroid.startCallService({ title: roomRef.title || m.title || 'Zovio Call', video: initialVideo }).catch(() => {});
          window.ZovioAndroid.getAudioRoutes().then(initialRoutes => {
            if (activeRoom !== roomRef) return;
            const defaultRoute = initialRoutes?.hasBluetooth
              ? 'bluetooth'
              : (initialRoutes?.hasHeadset ? 'wired' : (initialVideo ? 'speaker' : 'earpiece'));
            roomRef._pendingAndroidRoute = defaultRoute;
            window.ZovioAndroid.setAudioRoute(defaultRoute).catch(() => {});
          }).catch(() => {});
        }

        let acquired = null;
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            video: initialVideo ? (opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : true) : false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 48000
            }
          });
        } catch {
          try {
            acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            acquired = null;
          }
        }
        await attachLocalStreamToRoom(acquired);
      } catch (mediaErr) {
        console.warn('enterMeetingRoom media warmup error:', mediaErr);
      }
    })();
  }

  startRoomMediaRelay();

  (async () => {
    let resolvedM = m;
    if (opts.meetingPromise) {
      const applyResolvedMeeting = (fetched) => {
        if (!fetched || activeRoom !== roomRef) return;
        resolvedM = fetched;
        if (fetched.code) roomRef.code = fetched.code;
        if (fetched.title) {
          roomRef.title = fetched.title;
          const titleEl = $('.meet-room-title', roomEl);
          if (titleEl) titleEl.textContent = fetched.title;
          const pipTitleEl = $('#pipTitlePill span:last-child', roomEl);
          if (pipTitleEl) pipTitleEl.textContent = fetched.title;
        }
        const codeEl = $('#roomCodeBadge', roomEl);
        if (codeEl && resolvedM.code) codeEl.textContent = resolvedM.code;
      };
      if (opts.waitForMeeting) {
        try { applyResolvedMeeting(await opts.meetingPromise); } catch {}
      } else {
        Promise.resolve(opts.meetingPromise).then(applyResolvedMeeting).catch(() => {});
      }
    }
    if (activeRoom !== roomRef) return;
    S.ws?.send(JSON.stringify({
      type: 'meet:join',
      code: roomRef.code || resolvedM.code,
      state: { audio: roomRef.audioOn, video: roomRef.videoOn }
    }));
  })();
}

function setLocalVideoPreview(localV, stream) {
  if (!localV) return;
  localV.muted = true;
  localV.volume = 0;
  const vTracks = stream ? stream.getVideoTracks() : [];
  localV.srcObject = vTracks.length ? new MediaStream(vTracks) : null;
  if (vTracks.length) localV.play().catch(() => {});
}

function isPeerRtcAudioLive(entry) {
  if (!entry || !entry.pc) return false;
  const st = entry.pc.iceConnectionState;
  return (st === 'connected' || st === 'completed') && Boolean(entry.rtcAudioActive && entry.rtcAudioVerified);
}

function stopRelayAudioForPeer(entry) {
  if (!entry) return;
  if (entry._scheduledSources && entry._scheduledSources.size > 0) {
    entry._scheduledSources.forEach(src => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {}
    });
    entry._scheduledSources.clear();
  }
  entry._nextAudioTime = 0;
}

function setTileSpeaking(tile, speaking) {
  if (!tile) return;
  const want = Boolean(speaking);
  if (tile.classList.contains('speaking') !== want) {
    tile.classList.toggle('speaking', want);
  }
}

function pulsePeerSpeaking(entry, active = true, holdMs = 380) {
  if (!entry) return;
  if (!active || entry.state?.audio === false) {
    entry._speakUntil = 0;
    if (entry._speakTimer) {
      clearTimeout(entry._speakTimer);
      entry._speakTimer = null;
    }
    setTileSpeaking(entry.tile, false);
    return;
  }
  const now = Date.now();
  entry._speakUntil = Math.max(entry._speakUntil || 0, now + holdMs);
  setTileSpeaking(entry.tile, true);
  if (entry._speakTimer) clearTimeout(entry._speakTimer);
  const wait = Math.max(90, entry._speakUntil - now + 20);
  entry._speakTimer = setTimeout(() => {
    entry._speakTimer = null;
    if (!activeRoom || !entry.tile) return;
    if (entry.state?.audio === false || Date.now() >= (entry._speakUntil || 0)) {
      setTileSpeaking(entry.tile, false);
    }
  }, wait);
}

function detachPeerAudioAnalyser(entry) {
  if (!entry) return;
  try { entry._rxSource?.disconnect(); } catch {}
  try { entry._rxAnalyser?.disconnect(); } catch {}
  entry._rxSource = null;
  entry._rxAnalyser = null;
  entry._rxFreqData = null;
}

function attachPeerAudioAnalyser(entry, track) {
  if (!activeRoom || !entry || !track || track.kind !== 'audio') return;
  if (entry._rxTrackId === track.id && entry._rxAnalyser) return;
  detachPeerAudioAnalyser(entry);
  entry._rxTrackId = track.id;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!activeRoom.rxAudioCtx || activeRoom.rxAudioCtx.state === 'closed') {
      activeRoom.rxAudioCtx = new AudioCtx({ latencyHint: 'interactive' });
    }
    const ctx = activeRoom.rxAudioCtx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.45;
    // Connect only to analyser (never destination) so <audio> handles playback with zero echo
    src.connect(analyser);
    entry._rxSource = src;
    entry._rxAnalyser = analyser;
    entry._rxFreqData = new Uint8Array(analyser.frequencyBinCount);
    ensurePeerSpeakMonitor();
  } catch {}
}

function ensurePeerSpeakMonitor() {
  if (!activeRoom || activeRoom._peerSpeakTimer) return;
  activeRoom._peerSpeakTimer = setInterval(() => {
    if (!activeRoom) return;
    for (const entry of activeRoom.peers.values()) {
      if (!entry?._rxAnalyser || !entry._rxFreqData || entry.state?.audio === false) {
        if (entry?.state?.audio === false) setTileSpeaking(entry.tile, false);
        continue;
      }
      if (!entry.rtcAudioActive) continue;
      entry._rxAnalyser.getByteFrequencyData(entry._rxFreqData);
      let sum = 0;
      const arr = entry._rxFreqData;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      const avg = sum / arr.length;
      if (avg > 7.5) {
        pulsePeerSpeaking(entry, true, 360);
      }
    }
  }, 110);
}

function resetEntryRelayVideo(entry, keepDecoder = false) {
  if (!entry) return;
  if (entry._relayRafId) {
    try { cancelAnimationFrame(entry._relayRafId); } catch {}
    entry._relayRafId = 0;
  }
  if (entry._pendingRelayVf) {
    try { entry._pendingRelayVf.close(); } catch {}
    entry._pendingRelayVf = null;
  }
  if (!keepDecoder && entry._videoDecoder) {
    try {
      if (entry._videoDecoder.state !== 'closed') entry._videoDecoder.close();
    } catch {}
    entry._videoDecoder = null;
  }
  if (!keepDecoder) entry._gotKeyFrame = false;
}

function cleanupTileMedia(tile, entry) {
  if (entry) {
    stopRelayAudioForPeer(entry);
    detachPeerAudioAnalyser(entry);
    if (entry._speakTimer) {
      clearTimeout(entry._speakTimer);
      entry._speakTimer = null;
    }
    if (entry._statsTimer) {
      clearInterval(entry._statsTimer);
      entry._statsTimer = null;
    }
    if (entry._lastRelayBlobUrl) {
      try { URL.revokeObjectURL(entry._lastRelayBlobUrl); } catch {}
      entry._lastRelayBlobUrl = null;
    }
    resetEntryRelayVideo(entry, false);
  }
  if (!tile) return;
  tile.querySelectorAll('audio, video').forEach(mediaEl => {
    try {
      mediaEl.pause();
      mediaEl.srcObject = null;
      mediaEl.removeAttribute('src');
      mediaEl.load();
    } catch {}
  });
  tile.remove();
}

function preferHardwareVideoCodecs(pc) {
  if (!pc || !pc.getTransceivers || typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') return;
  try {
    const caps = RTCRtpSender.getCapabilities('video');
    if (!caps || !caps.codecs || !caps.codecs.length) return;
    const rankCodec = (mime) => {
      const m = (mime || '').toLowerCase();
      if (m === 'video/h264') return 0;
      if (m === 'video/vp9') return 1;
      if (m === 'video/vp8') return 2;
      if (m === 'video/av1') return 3;
      if (m === 'video/rtx' || m === 'video/red' || m === 'video/ulpfec') return 4;
      return 5;
    };
    const sorted = [...caps.codecs].sort((a, b) => rankCodec(a.mimeType) - rankCodec(b.mimeType));
    pc.getTransceivers().forEach(tr => {
      if ((tr.sender?.track?.kind === 'video' || tr.receiver?.track?.kind === 'video') && typeof tr.setCodecPreferences === 'function') {
        try { tr.setCodecPreferences(sorted); } catch {}
      }
    });
  } catch {}
}

function optimizeOpusSdp(sdp) {
  if (!sdp || typeof sdp !== 'string') return sdp;
  try {
    const m = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
    if (!m) return sdp;
    const pt = m[1];
    const fmtpRe = new RegExp(`a=fmtp:${pt}\\s+([^\\r\\n]+)`, 'i');
    // Resilient HD voice: in-band FEC enabled, continuous smooth transmission (usedtx=0), 40kbps VBR to prevent breakup under network load
    const extra = 'useinbandfec=1;usedtx=0;maxaveragebitrate=40000;maxplaybackrate=48000;ptime=20;minptime=10;cbr=0;stereo=0;sprop-stereo=0';
    if (fmtpRe.test(sdp)) {
      return sdp.replace(fmtpRe, (_, existing) => {
        let cleaned = existing
          .replace(/(?:^|;)\s*(?:useinbandfec|usedtx|maxaveragebitrate|maxplaybackrate|ptime|minptime|cbr|stereo|sprop-stereo)=[^;]*/gi, '')
          .replace(/^;+|;+$/g, '');
        return `a=fmtp:${pt} ${cleaned ? cleaned + ';' + extra : extra}`;
      });
    }
    return sdp.replace(new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000[^\\r\\n]*\\r?\\n)`, 'i'), `$1a=fmtp:${pt} ${extra}\r\n`);
  } catch {
    return sdp;
  }
}

function optimizePeerAudio(pc) {
  if (!pc || !pc.getSenders) return;
  pc.getSenders().forEach(sender => {
    if (sender.track && sender.track.kind === 'audio') {
      try {
        if ('contentHint' in sender.track) sender.track.contentHint = 'speech';
      } catch {}
      if (typeof sender.getParameters === 'function') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || !params.encodings.length) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 44000;
          params.encodings[0].priority = 'high';
          params.encodings[0].networkPriority = 'high';
          if (params.encodings[0].dtx !== undefined) params.encodings[0].dtx = false;
          sender.setParameters(params).catch(() => {});
        } catch {}
      }
    }
  });
}

function startRoomMediaRelay() {
  if (!activeRoom) return;
  clearTimeout(activeRoom.videoRelayTimer);
  try {
    if (activeRoom._relayEncoder && activeRoom._relayEncoder.state !== 'closed') {
      activeRoom._relayEncoder.close();
    }
  } catch {}
  activeRoom._relayEncoder = null;
  if (activeRoom._relayTrackReader) {
    try { activeRoom._relayTrackReader.cancel(); } catch {}
    activeRoom._relayTrackReader = null;
  }

  const relayCanvas = document.createElement('canvas');
  const relayCtx = relayCanvas.getContext('2d');
  const canWebCodecs = typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';

  let grabInFlight = false;
  let encodeInFlight = false;
  let cachedIcTrackId = null;
  let cachedIc = null;
  let encCfgKey = '';
  let encFrameCount = 0;
  let encIsScreen = false;
  let encWidth = 0;
  let encHeight = 0;
  let encPacketKind = 2; // 2 = vp8, 3 = h264-annexb
  let lastEncodeMs = 0;
  let activeProcessorTrackId = null;
  let processorAbort = false;

  // Synchronous default: VP8 'no-preference' runs ~95 FPS in Electron 34; upgrade to GPU H.264 only if truly hardware-supported
  let hwH264Supported = false;
  if (canWebCodecs) {
    VideoEncoder.isConfigSupported({
      codec: 'avc1.42E028',
      avc: { format: 'annexb' },
      hardwareAcceleration: 'prefer-hardware',
      width: 1280,
      height: 720,
      bitrate: 1_800_000,
      framerate: 30,
      latencyMode: 'realtime'
    }).then((sup) => {
      if (sup?.supported && activeRoom) {
        hwH264Supported = true;
      }
    }).catch(() => {});
  }

  const anyPeerNeedsRelay = () => {
    if (!activeRoom?.peers || activeRoom.peers.size === 0) return false;
    for (const p of activeRoom.peers.values()) {
      const st = p.pc?.iceConnectionState;
      if (st !== 'connected' && st !== 'completed') return true;
    }
    return false;
  };

  const getActiveEncoderSpec = (outW, outH, bitrate, fps) => {
    const useH264 = hwH264Supported && !activeRoom?._forceRelayVp8;
    if (useH264) {
      return {
        kind: 3,
        config: {
          codec: 'avc1.42E028',
          avc: { format: 'annexb' },
          hardwareAcceleration: 'prefer-hardware',
          width: outW,
          height: outH,
          bitrate,
          framerate: fps,
          latencyMode: 'realtime'
        }
      };
    }
    return {
      kind: 2,
      config: {
        codec: 'vp8',
        hardwareAcceleration: 'no-preference',
        width: outW,
        height: outH,
        bitrate,
        framerate: fps,
        latencyMode: 'realtime',
        bitrateMode: 'variable'
      }
    };
  };

  const getVideoSocket = () => (activeRoom?.videoWs && activeRoom.videoWs.readyState === 1) ? activeRoom.videoWs : S.ws;

  let adaptiveBitrate = 0;
  let configuredBitrate = 0;
  let cleanStreak = 0;
  let lastCongestMs = 0;
  let lastReconfigMs = 0;
  let lastEncCfgSpec = null;

  const getBitrateBounds = (outW, isScreen) => {
    if (!isScreen) return { min: 180_000, init: 320_000, max: 420_000 };
    if (outW >= 1600) return { min: 750_000, init: 1_800_000, max: 2_600_000 };
    return { min: 500_000, init: 1_350_000, max: 1_900_000 };
  };

  const applyAdaptiveBitrate = (nextBps, outW, isScreen) => {
    const enc = activeRoom?._relayEncoder;
    const { min, max } = getBitrateBounds(outW, isScreen);
    const clamped = Math.max(min, Math.min(max, Math.round(nextBps)));
    adaptiveBitrate = clamped;
    const now = performance.now();
    // Avoid thrashing enc.configure() on brief bursts; only reconfigure when bitrate shifts >=15% after 1400ms cooldown
    const baseCfg = configuredBitrate || clamped;
    const shiftRatio = Math.abs(clamped - baseCfg) / Math.max(1, baseCfg);
    if (!enc || enc.state !== 'configured' || !lastEncCfgSpec || shiftRatio < 0.15 || (now - lastReconfigMs) < 1400) return;
    lastReconfigMs = now;
    configuredBitrate = clamped;
    try {
      enc.configure({ ...lastEncCfgSpec.config, bitrate: clamped });
    } catch {}
  };

  activeRoom._canAcceptRelayVideo = (fps = 30) => {
    const enc = activeRoom?._relayEncoder;
    const vsock = getVideoSocket();
    if (!vsock || vsock.readyState !== 1) return false;
    if (enc && enc.state === 'configured' && enc.encodeQueueSize >= 2) return false;
    if (vsock.bufferedAmount > 98304) return false;
    const minGapMs = Math.max(12, Math.floor(820 / Math.min(60, fps || 30)));
    return (performance.now() - lastEncodeMs) >= minGapMs;
  };

  activeRoom._onRelayCongestion = () => {
    const now = performance.now();
    lastCongestMs = now;
    cleanStreak = 0;
    const outW = encWidth || 1280;
    const bounds = getBitrateBounds(outW, encIsScreen);
    const cur = adaptiveBitrate || bounds.init;
    applyAdaptiveBitrate(cur * 0.80, outW, encIsScreen);
  };

  // Synchronous VideoFrame -> VideoEncoder -> dedicated videoWs 0x5A relay
  const encodeVideoFrameDirect = (vfInput, srcW, srcH, isScreen, targetFps) => {
    if (!canWebCodecs || !activeRoom || !vfInput) return false;
    const maxW = isScreen ? (activeRoom.screenTargetRes === 1080 ? 1920 : 1280) : 384;
    const scale = Math.min(1, maxW / Math.max(2, srcW));
    const outW = Math.max(2, (Math.round(srcW * scale) & ~1));
    const outH = Math.max(2, (Math.round(srcH * scale) & ~1));
    const bounds = getBitrateBounds(outW, isScreen);
    if (!adaptiveBitrate || encWidth !== outW || encIsScreen !== isScreen) {
      adaptiveBitrate = bounds.init;
      configuredBitrate = bounds.init;
      cleanStreak = 0;
    }

    const baseFps = isScreen ? Math.min(60, targetFps || 30) : 24;
    // Steady interval with headroom (82%) so frames are never skipped by timer jitter
    const minGapMs = Math.max(12, Math.floor(820 / baseFps));
    const nowMs = performance.now();
    if (nowMs - lastEncodeMs < minGapMs) return true;

    const bitrate = Math.max(bounds.min, Math.min(bounds.max, adaptiveBitrate || bounds.init));

    if (activeRoom._resetRelayEncoder) {
      activeRoom._resetRelayEncoder = false;
      try {
        if (activeRoom._relayEncoder && activeRoom._relayEncoder.state !== 'closed') {
          activeRoom._relayEncoder.close();
        }
      } catch {}
      activeRoom._relayEncoder = null;
    }

    const spec = getActiveEncoderSpec(outW, outH, bitrate, baseFps);
    const cfgKey = `${spec.kind}:${outW}x${outH}@${baseFps}:${isScreen ? 1 : 0}`;
    if (!activeRoom._relayEncoder || activeRoom._relayEncoder.state === 'closed' || encCfgKey !== cfgKey) {
      try {
        if (activeRoom._relayEncoder && activeRoom._relayEncoder.state !== 'closed') {
          activeRoom._relayEncoder.close();
        }
      } catch {}
      encCfgKey = cfgKey;
      encFrameCount = 0;
      encIsScreen = isScreen;
      encWidth = outW;
      encHeight = outH;
      encPacketKind = spec.kind;
      lastEncCfgSpec = spec;
      configuredBitrate = bitrate;
      activeRoom._forceRelayKeyframe = true;

      activeRoom._relayEncoder = new VideoEncoder({
        output: (chunk) => {
          const vsock = getVideoSocket();
          if (!vsock || vsock.readyState !== 1) return;
          const isKey = chunk.type === 'key';
          const byteLen = chunk.byteLength;
          const pkt = new Uint8Array(11 + byteLen);
          pkt[0] = 0x5A;
          pkt[1] = encPacketKind;
          pkt[2] = (encIsScreen ? 1 : 0) | (isKey ? 2 : 0);
          pkt[3] = (encWidth >> 8) & 0xFF;
          pkt[4] = encWidth & 0xFF;
          pkt[5] = (encHeight >> 8) & 0xFF;
          pkt[6] = encHeight & 0xFF;
          const tsMs = Math.max(0, Math.round((chunk.timestamp || 0) / 1000)) >>> 0;
          pkt[7] = (tsMs >>> 24) & 0xFF;
          pkt[8] = (tsMs >>> 16) & 0xFF;
          pkt[9] = (tsMs >>> 8) & 0xFF;
          pkt[10] = tsMs & 0xFF;
          chunk.copyTo(pkt.subarray(11));
          try { vsock.send(pkt.buffer); } catch {}
        },
        error: (err) => {
          console.warn('[WebCodecs Relay] Encoder error, switching to VP8:', err);
          try { activeRoom._relayEncoder?.close?.(); } catch {}
          activeRoom._relayEncoder = null;
          if (encPacketKind === 3) {
            hwH264Supported = false;
            activeRoom._forceRelayVp8 = true;
          }
        }
      });

      try {
        activeRoom._relayEncoder.configure(spec.config);
      } catch (cfgErr) {
        console.warn('[WebCodecs Relay] configure err:', cfgErr);
        try { activeRoom._relayEncoder?.close?.(); } catch {}
        activeRoom._relayEncoder = null;
        if (spec.kind === 3) {
          hwH264Supported = false;
          activeRoom._forceRelayVp8 = true;
        }
        return false;
      }
    }

    const enc = activeRoom._relayEncoder;
    const vsock = getVideoSocket();
    if (!enc || enc.state !== 'configured') return false;
    if (!vsock || vsock.readyState !== 1) return true;

    // 96 KB in-flight guard allows gunfire/action bursts & keyframes without stuttering
    if (enc.encodeQueueSize >= 2 || vsock.bufferedAmount > 98304) {
      cleanStreak = 0;
      if ((nowMs - lastCongestMs) > 650) {
        lastCongestMs = nowMs;
        applyAdaptiveBitrate((adaptiveBitrate || bounds.init) * 0.84, outW, isScreen);
      }
      return true;
    }

    if (vsock.bufferedAmount < 24576 && enc.encodeQueueSize === 0) {
      cleanStreak++;
      if (cleanStreak >= 75 && adaptiveBitrate < bounds.max) {
        cleanStreak = 0;
        applyAdaptiveBitrate(adaptiveBitrate * 1.10, outW, isScreen);
      }
    } else if (vsock.bufferedAmount > 57344) {
      cleanStreak = 0;
      if ((nowMs - lastCongestMs) > 900) {
        lastCongestMs = nowMs;
        applyAdaptiveBitrate((adaptiveBitrate || bounds.init) * 0.88, outW, isScreen);
      }
    }

    lastEncodeMs = nowMs;
    encIsScreen = isScreen;
    // TCP WebSocket is lossless; 300-frame GOP (~10s) prevents periodic keyframe micro-stutters
    const needKey = encFrameCount < 2 || Boolean(activeRoom._forceRelayKeyframe) || (encFrameCount % 300 === 0);
    activeRoom._forceRelayKeyframe = false;
    try {
      enc.encode(vfInput, { keyFrame: needKey });
      encFrameCount++;
      return true;
    } catch (encErr) {
      console.warn('[WebCodecs Relay] encode err:', encErr);
      try { enc.close(); } catch {}
      activeRoom._relayEncoder = null;
      return false;
    }
  };

  activeRoom._encodeRustVideoFrame = (vf, w, h, targetFps) => {
    if (!activeRoom || !anyPeerNeedsRelay()) return false;
    return encodeVideoFrameDirect(vf, w, h, true, targetFps || 30);
  };

  const sendWebCodecsFrame = (source, srcW, srcH, isScreen, targetFps) => {
    let vf = null;
    try {
      const tsUs = Math.round(performance.now() * 1000);
      vf = new VideoFrame(source, { timestamp: tsUs });
      return encodeVideoFrameDirect(vf, srcW, srcH, isScreen, targetFps);
    } catch {
      return false;
    } finally {
      try { vf?.close(); } catch {}
    }
  };

  // Lockstep MediaStreamTrackProcessor ONLY for non-Rust streams (camera / browser getDisplayMedia)
  const refreshTrackProcessorPump = () => {
    if (!activeRoom || !canWebCodecs || typeof MediaStreamTrackProcessor !== 'function') return false;
    if (activeRoom._rustCaptureActive && activeRoom.screenStream) {
      if (activeRoom._relayTrackReader) {
        processorAbort = true;
        try { activeRoom._relayTrackReader.cancel(); } catch {}
        activeRoom._relayTrackReader = null;
        activeProcessorTrackId = null;
      }
      return true; // Rust WGC pumpVideo pushes directly via _encodeRustVideoFrame
    }
    const screenTrack = activeRoom.screenStream?.getVideoTracks?.()[0] || null;
    const camTrack = activeRoom.videoOn ? (activeRoom.rawStream?.getVideoTracks?.()[0] || null) : null;
    const liveTrack = screenTrack || camTrack;
    const isScreen = Boolean(screenTrack);

    if (!liveTrack || liveTrack.readyState !== 'live') {
      if (activeRoom._relayTrackReader) {
        processorAbort = true;
        try { activeRoom._relayTrackReader.cancel(); } catch {}
        activeRoom._relayTrackReader = null;
        activeProcessorTrackId = null;
      }
      return false;
    }

    if (activeProcessorTrackId === liveTrack.id && activeRoom._relayTrackReader) {
      return true;
    }

    processorAbort = true;
    if (activeRoom._relayTrackReader) {
      try { activeRoom._relayTrackReader.cancel(); } catch {}
      activeRoom._relayTrackReader = null;
    }

    try {
      const proc = new MediaStreamTrackProcessor({ track: liveTrack });
      const reader = proc.readable.getReader();
      activeRoom._relayTrackReader = reader;
      activeProcessorTrackId = liveTrack.id;
      processorAbort = false;

      (async () => {
        try {
          while (!processorAbort && activeRoom && activeRoom._relayTrackReader === reader) {
            const { value: vf, done } = await reader.read();
            if (done || !vf) break;
            try {
              if (!anyPeerNeedsRelay()) continue;
              const fps = isScreen ? Math.min(60, activeRoom.screenTargetFps || 30) : 15;
              const w = vf.displayWidth || vf.codedWidth || 1280;
              const h = vf.displayHeight || vf.codedHeight || 720;
              encodeVideoFrameDirect(vf, w, h, isScreen, fps);
            } catch {} finally {
              try { vf.close(); } catch {}
            }
          }
        } catch {} finally {
          if (activeRoom && activeRoom._relayTrackReader === reader) {
            activeRoom._relayTrackReader = null;
            activeProcessorTrackId = null;
          }
        }
      })();
      return true;
    } catch {
      return false;
    }
  };
  activeRoom._refreshRelayPump = refreshTrackProcessorPump;

  const sendCanvasBlobAsync = (isScreen) => {
    const vsock = getVideoSocket();
    if (encodeInFlight || !vsock || vsock.readyState !== 1 || vsock.bufferedAmount > 65536) return;
    encodeInFlight = true;
    relayCanvas.toBlob(async (blob) => {
      try {
        const curSock = getVideoSocket();
        if (!blob || !curSock || curSock.readyState !== 1 || curSock.bufferedAmount > 98304) return;
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const pkt = new Uint8Array(3 + bytes.length);
        pkt[0] = 0x5A;
        pkt[1] = 1; // 1 = WebP fallback frame
        pkt[2] = isScreen ? 1 : 0;
        pkt.set(bytes, 3);
        if (curSock && curSock.readyState === 1 && curSock.bufferedAmount <= 98304) {
          curSock.send(pkt.buffer);
        }
      } catch {} finally {
        encodeInFlight = false;
      }
    }, 'image/webp', isScreen ? 0.72 : 0.56);
  };

  const scheduleNextRelayTick = () => {
    if (!activeRoom) return;
    const isSharingScreen = Boolean(activeRoom.screenStream);
    const fps = isSharingScreen ? Math.min(60, activeRoom.screenTargetFps || 30) : 20;
    const vsock = getVideoSocket();
    const congested = !vsock || vsock.bufferedAmount > 131072 || (activeRoom._relayEncoder?.encodeQueueSize > 2);
    const baseDelay = isSharingScreen ? Math.max(16, Math.floor(1000 / fps)) : 52;
    const delay = congested ? Math.min(160, baseDelay * 2) : baseDelay;
    activeRoom.videoRelayTimer = setTimeout(runRelayTick, delay);
  };

  const runRelayTick = async () => {
    if (!activeRoom) return;
    try {
      if (refreshTrackProcessorPump()) return;
      if (!anyPeerNeedsRelay()) return;
      const isSharingScreen = Boolean(activeRoom.screenStream);
      if (document.hidden && !isSharingScreen) return;
      if (!activeRoom.videoOn && !isSharingScreen) return;
      const vsock = getVideoSocket();
      if (!vsock || vsock.readyState !== 1 || vsock.bufferedAmount > 131072 || encodeInFlight) return;

      const screenTrack = activeRoom.screenStream?.getVideoTracks?.()[0];
      const localV = $('#localVideo');
      const targetFps = activeRoom.screenTargetFps || 30;

      if (isSharingScreen && screenTrack && (document.hidden || !localV || localV.paused || localV.readyState < 2) && typeof ImageCapture === 'function') {
        if (grabInFlight) return;
        grabInFlight = true;
        try {
          if (cachedIcTrackId !== screenTrack.id) {
            cachedIcTrackId = screenTrack.id;
            cachedIc = new ImageCapture(screenTrack);
          }
          const bitmap = await cachedIc.grabFrame();
          try {
            if (canWebCodecs && sendWebCodecsFrame(bitmap, bitmap.width, bitmap.height, true, targetFps)) {
              return;
            }
            const targetW = 960;
            const targetH = Math.max(120, Math.round((bitmap.height / bitmap.width) * targetW));
            if (relayCanvas.width !== targetW) relayCanvas.width = targetW;
            if (relayCanvas.height !== targetH) relayCanvas.height = targetH;
            relayCtx.drawImage(bitmap, 0, 0, targetW, targetH);
            sendCanvasBlobAsync(true);
          } finally {
            try { bitmap.close(); } catch {}
          }
        } catch {
          cachedIcTrackId = null;
          cachedIc = null;
        } finally {
          grabInFlight = false;
        }
        return;
      }

      if (!localV || localV.readyState < 2 || !localV.videoWidth || !localV.videoHeight) return;

      if (canWebCodecs && sendWebCodecsFrame(localV, localV.videoWidth, localV.videoHeight, isSharingScreen, targetFps)) {
        return;
      }

      const targetW = isSharingScreen ? 960 : 420;
      const targetH = Math.max(120, Math.round((localV.videoHeight / localV.videoWidth) * targetW));
      if (relayCanvas.width !== targetW) relayCanvas.width = targetW;
      if (relayCanvas.height !== targetH) relayCanvas.height = targetH;

      try {
        relayCtx.drawImage(localV, 0, 0, targetW, targetH);
        sendCanvasBlobAsync(isSharingScreen);
      } catch {}
    } finally {
      scheduleNextRelayTick();
    }
  };
  scheduleNextRelayTick();
}

function scheduleRelayAudioFloatSamples(entry, rawSamples, sampleRate) {
  if (!activeRoom || !entry || !rawSamples || !rawSamples.length) return;
  if (isPeerRtcAudioLive(entry)) {
    stopRelayAudioForPeer(entry);
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!activeRoom.rxAudioCtx || activeRoom.rxAudioCtx.state === 'closed') {
    activeRoom.rxAudioCtx = new AudioCtx({ latencyHint: window.ZovioAndroid ? 'balanced' : 'interactive' });
    if (activeRoom.speakerDeviceId && typeof activeRoom.rxAudioCtx.setSinkId === 'function') {
      activeRoom.rxAudioCtx.setSinkId(activeRoom.speakerDeviceId).catch(() => {});
    }
    if (!window.ZovioAndroid) {
      try {
        const osc = activeRoom.rxAudioCtx.createOscillator();
        const g = activeRoom.rxAudioCtx.createGain();
        osc.frequency.value = 20000;
        g.gain.value = 0.00002;
        osc.connect(g);
        g.connect(activeRoom.rxAudioCtx.destination);
        osc.start();
      } catch {}
    }
  }
  const ctx = activeRoom.rxAudioCtx;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const len = rawSamples.length;
  if (entry.state?.audio !== false && len > 0) {
    let sumSq = 0;
    let count = 0;
    const step = Math.max(1, Math.floor(len / 96));
    for (let i = 0; i < len; i += step) {
      const s = rawSamples[i];
      sumSq += s * s;
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    if (rms > 0.012) {
      pulsePeerSpeaking(entry, true, 420);
    }
  }
  const buf = ctx.createBuffer(1, len, sampleRate);
  const ch = buf.getChannelData(0);
  ch.set(rawSamples);

  if (!entry._scheduledSources) entry._scheduledSources = new Set();
  const nowTime = ctx.currentTime;

  const maxAudioLead = entry.state?.screen ? 0.42 : 0.95;
  // Clear queued audio cleanly if stale so audio stays locked with live screen/voice
  if (entry._nextAudioTime && (entry._nextAudioTime - nowTime) > maxAudioLead) {
    stopRelayAudioForPeer(entry);
  }

  const targetAudioJitter = entry.state?.screen ? 0.095 : (window.ZovioAndroid ? 0.105 : 0.08);
  const isNewTalkspurt = !entry._nextAudioTime || (nowTime - entry._nextAudioTime) > 0.22;
  if (isNewTalkspurt) {
    entry._nextAudioTime = nowTime + targetAudioJitter;
    const fadeLen = Math.min(48, len);
    for (let i = 0; i < fadeLen; i++) ch[i] *= (i / fadeLen);
  } else if (entry._nextAudioTime < nowTime) {
    entry._nextAudioTime = nowTime + (window.ZovioAndroid ? 0.032 : 0.014);
    const fadeLen = Math.min(48, len);
    for (let i = 0; i < fadeLen; i++) ch[i] *= (i / fadeLen);
  }

  const bufferedAhead = entry._nextAudioTime - nowTime;
  let rate = 1.0;
  if (bufferedAhead > 0.42) rate = 1.18;
  else if (bufferedAhead > 0.24) rate = 1.10;
  else if (bufferedAhead > 0.14) rate = 1.04;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gainNode = ctx.createGain();
  gainNode.gain.value = entry._peerGain !== undefined ? entry._peerGain : 1.0;
  src.connect(gainNode);
  gainNode.connect(ctx.destination);
  entry._scheduledSources.add(src);
  src.onended = () => {
    entry._scheduledSources?.delete(src);
    try { src.disconnect(); } catch {}
    try { gainNode.disconnect(); } catch {}
  };

  src.start(entry._nextAudioTime);
  entry._nextAudioTime += (buf.duration / rate);
}

function playRelayAudioChunk(entry, b64Pcm, sampleRate = 16000) {
  if (!activeRoom || !entry || !b64Pcm) return;
  try {
    const bin = atob(b64Pcm);
    const len = bin.length >> 1;
    if (len <= 0) return;
    const samples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const lo = bin.charCodeAt(i * 2);
      const hi = bin.charCodeAt(i * 2 + 1);
      let val = (hi << 8) | lo;
      if (val >= 0x8000) val -= 0x10000;
      samples[i] = val / 32768;
    }
    scheduleRelayAudioFloatSamples(entry, samples, sampleRate);
  } catch (e) {
    console.warn('playRelayAudioChunk err:', e);
  }
}

window.handleMeetBinaryMedia = function (arrayBuffer) {
  if (!activeRoom || !(arrayBuffer instanceof ArrayBuffer)) return;
  const view = new Uint8Array(arrayBuffer);
  if (view.byteLength < 6 || view[0] !== 0x5A) return;
  const kind = view[1];
  const flags = view[2];
  const connIdLen = view[3];
  const headerEnd = 4 + connIdLen;
  if (connIdLen === 0 || headerEnd >= view.byteLength) return;
  let connId;
  try {
    connId = new TextDecoder().decode(view.subarray(4, headerEnd));
  } catch { return; }
  if (!connId || connId === activeRoom.connId) return;
  const entry = activeRoom.peers.get(connId);
  if (!entry) return;
  const payload = view.subarray(headerEnd);

  if (kind === 4) {
    if (entry.state?.audio === false || payload.byteLength < 2) return;
    const len = payload.byteLength >> 1;
    const samples = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let val = (payload[i * 2 + 1] << 8) | payload[i * 2];
      if (val >= 0x8000) val -= 0x10000;
      samples[i] = val / 32768;
    }
    scheduleRelayAudioFloatSamples(entry, samples, 24000);
    return;
  }

  if (kind === 1 || kind === 2 || kind === 3) {
    const isScreen = (flags & 1) === 1;
    const tile = entry.tile;
    const relayImg = tile?.querySelector('.remote-relay-frame');
    const relayCanvas = tile?.querySelector('.remote-relay-canvas');
    const v = tile?.querySelector('video');
    const noCam = tile?.querySelector('.peer-no-cam');
    const prevScreen = Boolean(entry.state?.screen);
    entry.state = { ...(entry.state || {}), video: true, screen: isScreen };

    tile?.classList.toggle('is-screen', isScreen);
    tile?.querySelector('.tile-screen-badge')?.classList.toggle('hidden', !isScreen);
    if (noCam) noCam.classList.add('hidden');

    const rtcVideoPlaying = v && !v.classList.contains('hidden') && !v.paused && v.readyState >= 2 && v.videoWidth > 0 && (entry.pc?.iceConnectionState === 'connected' || entry.pc?.iceConnectionState === 'completed');

    if (kind === 1) {
      if (relayCanvas) relayCanvas.classList.add('hidden');
      if (relayImg) {
        if (rtcVideoPlaying) {
          relayImg.classList.add('hidden');
        } else {
          const blobUrl = URL.createObjectURL(new Blob([payload], { type: 'image/webp' }));
          const oldUrl = entry._lastRelayBlobUrl;
          entry._lastRelayBlobUrl = blobUrl;
          if (oldUrl && oldUrl !== blobUrl) {
            setTimeout(() => { try { URL.revokeObjectURL(oldUrl); } catch {} }, 400);
          }
          relayImg.src = blobUrl;
          relayImg.style.objectFit = isScreen ? 'contain' : 'cover';
          relayImg.classList.remove('hidden');
        }
      }
    } else if ((kind === 2 || kind === 3) && typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function') {
      if (rtcVideoPlaying) {
        if (relayCanvas) relayCanvas.classList.add('hidden');
        if (relayImg) relayImg.classList.add('hidden');
      } else if (payload.byteLength > 8) {
        const w = (payload[0] << 8) | payload[1];
        const h = (payload[2] << 8) | payload[3];
        const tsMs = ((payload[4] << 24) | (payload[5] << 16) | (payload[6] << 8) | payload[7]) >>> 0;
        const isKey = (flags & 2) === 2;
        const chunkData = payload.subarray(8);
        const codecName = kind === 3 ? 'avc1.42E028' : 'vp8';
        const dimKey = `${kind}:${w}x${h}`;

        const requestSenderKeyframe = (preferVp8 = false) => {
          const now = Date.now();
          if (!preferVp8 && entry._lastKeyReqAt && (now - entry._lastKeyReqAt) < 700) return;
          entry._lastKeyReqAt = now;
          try {
            S.ws?.send(JSON.stringify({
              type: 'meet:signal',
              to: connId,
              data: preferVp8 ? { relayKeyframe: true, preferVp8: true } : { relayKeyframe: true }
            }));
          } catch {}
        };

        const paintDecodedFrame = (vf) => {
          try {
            if (relayCanvas) {
              let ctx = entry._relayCanvasCtx;
              if (!ctx) {
                ctx = relayCanvas.getContext('2d', { alpha: false, desynchronized: true }) || relayCanvas.getContext('2d', { alpha: false }) || relayCanvas.getContext('2d');
                entry._relayCanvasCtx = ctx;
              }
              const dw = vf.displayWidth || vf.codedWidth || w;
              const dh = vf.displayHeight || vf.codedHeight || h;
              if (relayCanvas.width !== dw) relayCanvas.width = dw;
              if (relayCanvas.height !== dh) relayCanvas.height = dh;
              ctx?.drawImage(vf, 0, 0, dw, dh);
              relayCanvas.style.objectFit = entry.state?.screen ? 'contain' : 'cover';
              relayCanvas.classList.remove('hidden');
              relayImg?.classList.add('hidden');
            }
          } finally {
            try { vf.close(); } catch {}
          }
        };

        if (!entry._videoDecoder || entry._videoDecoder.state === 'closed' || entry._decDimKey !== dimKey) {
          resetEntryRelayVideo(entry, false);
          entry._decDimKey = dimKey;
          entry._videoDecoder = new VideoDecoder({
            output: (vf) => {
              if (!relayCanvas) {
                try { vf.close(); } catch {}
                return;
              }
              // Clean 1-frame rAF latest-frame coalesce: V-Sync aligned without artificial queue holding jitter
              if (!document.hidden && typeof requestAnimationFrame === 'function') {
                if (entry._pendingRelayVf) {
                  try { entry._pendingRelayVf.close(); } catch {}
                }
                entry._pendingRelayVf = vf;
                if (!entry._relayRafId) {
                  entry._relayRafId = requestAnimationFrame(() => {
                    entry._relayRafId = 0;
                    const frame = entry._pendingRelayVf;
                    entry._pendingRelayVf = null;
                    if (frame) paintDecodedFrame(frame);
                  });
                }
              } else {
                paintDecodedFrame(vf);
              }
            },
            error: (err) => {
              console.warn('[WebCodecs Relay] Decoder error:', err);
              resetEntryRelayVideo(entry, false);
              requestSenderKeyframe(kind === 3);
            }
          });
          try {
            // 'no-preference' uses GPU decode where supported and prevents Electron 34 VP8 'prefer-hardware' closed-codec crashes
            entry._videoDecoder.configure({
              codec: codecName,
              codedWidth: w,
              codedHeight: h,
              hardwareAcceleration: 'no-preference',
              optimizeForLatency: true
            });
          } catch (cfgErr) {
            console.warn('[WebCodecs Relay] Decoder configure error:', cfgErr);
            try { entry._videoDecoder?.close?.(); } catch {}
            entry._videoDecoder = null;
            requestSenderKeyframe(kind === 3);
          }
          if (!isKey) requestSenderKeyframe(false);
        }

        if (isKey) {
          entry._gotKeyFrame = true;
        } else if (!entry._gotKeyFrame) {
          requestSenderKeyframe(false);
        }

        if (entry._gotKeyFrame && entry._videoDecoder?.state === 'configured') {
          if (entry._videoDecoder.decodeQueueSize > 12) {
            resetEntryRelayVideo(entry, false);
            requestSenderKeyframe(kind === 3);
          } else if (entry._videoDecoder.decodeQueueSize > 8 && !isKey) {
            entry._gotKeyFrame = false;
            requestSenderKeyframe(false);
          } else {
            try {
              entry._videoDecoder.decode(new EncodedVideoChunk({
                type: isKey ? 'key' : 'delta',
                timestamp: tsMs * 1000,
                data: chunkData
              }));
            } catch {
              entry._gotKeyFrame = false;
              requestSenderKeyframe(false);
            }
          }
        }
      }
    }

    if (prevScreen !== isScreen) {
      updateStageLayout();
    }
  }
};

function setupAudioMixPipeline() {
  if (!activeRoom?.rawStream || !activeRoom.rawStream.getAudioTracks().length) return;
  try {
    if (activeRoom.audioWorkletNode) {
      try {
        activeRoom.audioWorkletNode.port.onmessage = null;
        activeRoom.audioWorkletNode.disconnect();
      } catch {}
      activeRoom.audioWorkletNode = null;
    }
    if (activeRoom.audioProcessor) {
      try {
        activeRoom.audioProcessor.onaudioprocess = null;
        activeRoom.audioProcessor.disconnect();
      } catch {}
      activeRoom.audioProcessor = null;
    }
    if (activeRoom.audioCtx) activeRoom.audioCtx.close().catch(() => {});
    clearInterval(activeRoom.meterTimer);

    // WebRTC peer connections always receive the direct hardware microphone stream
    activeRoom.stream = activeRoom.rawStream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx({ latencyHint: window.ZovioAndroid ? 'balanced' : 'interactive' });
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Keep capture AudioContext hardware clock unthrottled when minimized on desktop
    if (!window.ZovioAndroid) {
      try {
        const keepOsc = ctx.createOscillator();
        const keepGain = ctx.createGain();
        keepOsc.frequency.value = 20000;
        keepGain.gain.value = 0.00002;
        keepOsc.connect(keepGain);
        keepGain.connect(ctx.destination);
        keepOsc.start();
      } catch {}
    }

    const src = ctx.createMediaStreamSource(activeRoom.rawStream);
    const gainNode = ctx.createGain();
    const audioMixGain = ctx.createGain();
    const mixDest = ctx.createMediaStreamDestination();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    gainNode.gain.value = (activeRoom.audioMix.gain || 100) / 100;
    audioMixGain.gain.value = 1.0;
    src.connect(gainNode);
    gainNode.connect(audioMixGain);
    audioMixGain.connect(analyser);
    audioMixGain.connect(mixDest);

    activeRoom.audioMixGain = audioMixGain;
    activeRoom.mixDest = mixDest;

    // High-clarity 24kHz zero-JSON binary WebSocket Voice Relay: prefer off-thread AudioWorklet, fall back cleanly to 2048-sample ScriptProcessor
    const canSendAudioRelay = () => {
      if (!activeRoom || (!activeRoom.audioOn && !activeRoom.screenAudioTrack) || !activeRoom.peers || activeRoom.peers.size === 0) return false;
      if (!S.ws || S.ws.readyState !== 1 || S.ws.bufferedAmount > 384000) return false;
      for (const p of activeRoom.peers.values()) {
        const st = p.pc?.iceConnectionState;
        if (st !== 'connected' && st !== 'completed') return true;
      }
      return false;
    };

    const startScriptProcessorFallback = () => {
      if (!activeRoom || activeRoom.audioProcessor || ctx.state === 'closed') return;
      try {
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        const zeroGain = ctx.createGain();
        zeroGain.gain.value = 0;
        audioMixGain.connect(processor);
        processor.connect(zeroGain);
        zeroGain.connect(ctx.destination);

        const targetRate = 24000;
        let hangoverFrames = 0;

        processor.onaudioprocess = (ev) => {
          if (!canSendAudioRelay()) return;
          const input = ev.inputBuffer.getChannelData(0);
          const ratio = ctx.sampleRate / targetRate;
          const outLen = Math.floor(input.length / ratio);
          if (outLen <= 0) return;

          let peak = 0;
          const pkt = new Uint8Array(3 + outLen * 2);
          pkt[0] = 0x5A;
          pkt[1] = 4; // 4 = 24kHz PCM16 audio
          pkt[2] = 0;
          for (let i = 0; i < outLen; i++) {
            const startIdx = Math.floor(i * ratio);
            const endIdx = Math.min(input.length, Math.floor((i + 1) * ratio));
            let sum = 0;
            let count = 0;
            for (let j = startIdx; j < endIdx; j++) {
              sum += input[j];
              count++;
            }
            const rawSample = count > 0 ? (sum / count) : (input[startIdx] || 0);
            const sample = Math.max(-1, Math.min(1, rawSample));
            const abs = Math.abs(sample);
            if (abs > peak) peak = abs;
            const s16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            const v = s16 | 0;
            pkt[3 + i * 2] = v & 0xff;
            pkt[3 + i * 2 + 1] = (v >> 8) & 0xff;
          }

          if (peak >= 0.0008) {
            hangoverFrames = 26;
          } else if (hangoverFrames > 0) {
            hangoverFrames--;
          } else {
            return;
          }

          try { S.ws.send(pkt.buffer); } catch {}
        };
        activeRoom.audioProcessor = processor;
      } catch (procErr) {
        console.warn('Voice relay processor warning:', procErr);
      }
    };

    if (ctx.audioWorklet && typeof AudioWorkletNode === 'function') {
      (async () => {
        try {
          const workletSrc = `
            class ZovioRelayAudioProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.buf = new Float32Array(2048);
                this.pos = 0;
                this.hangover = 0;
                this.started = false;
              }
              process(inputs) {
                if (!this.started) {
                  this.started = true;
                  this.port.postMessage('ready');
                }
                const ch = inputs[0] && inputs[0][0];
                if (!ch) return true;
                let offset = 0;
                while (offset < ch.length) {
                  const take = Math.min(2048 - this.pos, ch.length - offset);
                  this.buf.set(ch.subarray(offset, offset + take), this.pos);
                  this.pos += take;
                  offset += take;
                  if (this.pos >= 2048) {
                    const ratio = sampleRate / 24000;
                    const outLen = Math.floor(2048 / ratio);
                    let peak = 0;
                    const pkt = new Uint8Array(3 + outLen * 2);
                    pkt[0] = 0x5A; pkt[1] = 4; pkt[2] = 0;
                    for (let i = 0; i < outLen; i++) {
                      const s = Math.floor(i * ratio);
                      const e = Math.min(2048, Math.floor((i + 1) * ratio));
                      let sum = 0, c = 0;
                      for (let j = s; j < e; j++) { sum += this.buf[j]; c++; }
                      const val = Math.max(-1, Math.min(1, c > 0 ? sum / c : (this.buf[s] || 0)));
                      const a = val < 0 ? -val : val;
                      if (a > peak) peak = a;
                      const s16 = (val < 0 ? val * 0x8000 : val * 0x7FFF) | 0;
                      pkt[3 + i * 2] = s16 & 0xff;
                      pkt[3 + i * 2 + 1] = (s16 >> 8) & 0xff;
                    }
                    if (peak >= 0.0008) this.hangover = 26;
                    else if (this.hangover > 0) this.hangover--;
                    if (peak >= 0.0008 || this.hangover > 0) {
                      this.port.postMessage(pkt.buffer, [pkt.buffer]);
                    }
                    this.pos = 0;
                  }
                }
                return true;
              }
            }
            registerProcessor('zovio-relay-audio', ZovioRelayAudioProcessor);
          `;
          const blobUrl = URL.createObjectURL(new Blob([workletSrc], { type: 'application/javascript' }));
          await ctx.audioWorklet.addModule(blobUrl);
          URL.revokeObjectURL(blobUrl);
          if (!activeRoom || ctx.state === 'closed') return;
          const workletNode = new AudioWorkletNode(ctx, 'zovio-relay-audio', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1
          });
          const zeroGain = ctx.createGain();
          zeroGain.gain.value = 0;
          let workletReady = false;
          workletNode.port.onmessage = (ev) => {
            if (ev.data === 'ready') {
              workletReady = true;
              return;
            }
            if (!canSendAudioRelay()) return;
            try { S.ws.send(ev.data); } catch {}
          };
          audioMixGain.connect(workletNode);
          workletNode.connect(zeroGain);
          zeroGain.connect(ctx.destination);
          activeRoom.audioWorkletNode = workletNode;
          setTimeout(() => {
            if (!workletReady && activeRoom && activeRoom.audioCtx === ctx && ctx.state !== 'closed') {
              startScriptProcessorFallback();
            }
          }, 1200);
        } catch (wkErr) {
          console.warn('AudioWorklet relay fallback to ScriptProcessor:', wkErr);
          startScriptProcessorFallback();
        }
      })();
    } else {
      startScriptProcessorFallback();
    }

    activeRoom.audioCtx = ctx;
    activeRoom.gainNode = gainNode;

    const dataArr = new Uint8Array(analyser.frequencyBinCount);
    activeRoom.meterTimer = setInterval(() => {
      if (!activeRoom) return;
      const fill = $('#micMeterFill');
      if (!activeRoom.audioOn) {
        if (fill) fill.style.width = '0%';
        activeRoom._localSpeakUntil = 0;
        setTileSpeaking($('#localTile'), false);
        return;
      }
      analyser.getByteFrequencyData(dataArr);
      let sum = 0;
      for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
      const avg = sum / dataArr.length;
      if (fill && activeRoom.studioOpen) {
        fill.style.width = `${Math.min(100, Math.round((avg / 140) * 100))}%`;
      }
      const now = Date.now();
      if (avg > 8.5) {
        activeRoom._localSpeakUntil = now + 380;
        setTileSpeaking($('#localTile'), true);
      } else if (now > (activeRoom._localSpeakUntil || 0)) {
        setTileSpeaking($('#localTile'), false);
      }
    }, window.ZovioAndroid ? 180 : 95);
  } catch (err) {
    console.warn('Audio meter setup warning:', err);
    activeRoom.stream = activeRoom.rawStream;
  }
}

function applyEqPresetToNode(biquad, preset) {
  if (!biquad) return;
  if (preset === 'podcast') {
    biquad.type = 'lowshelf';
    biquad.frequency.value = 180;
    biquad.gain.value = 6;
  } else if (preset === 'crisp') {
    biquad.type = 'highshelf';
    biquad.frequency.value = 3200;
    biquad.gain.value = 6;
  } else if (preset === 'broadcast') {
    biquad.type = 'highpass';
    biquad.frequency.value = 110;
    biquad.gain.value = 0;
  } else {
    biquad.type = 'allpass';
    biquad.frequency.value = 1000;
    biquad.gain.value = 0;
  }
}

async function populateStudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices || !activeRoom) return;
  // If devices don't have labels yet (due to permissions), prompt getUserMedia to unlock Bluetooth names
  let devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  if (devices.length > 0 && !devices.some(d => d.label)) {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      devices = await navigator.mediaDevices.enumerateDevices().catch(() => devices);
      tempStream.getTracks().forEach(t => t.stop());
    } catch {}
  }
  const mics = devices.filter(d => d.kind === 'audioinput');
  const speakers = devices.filter(d => d.kind === 'audiooutput');
  const cams = devices.filter(d => d.kind === 'videoinput');

  const selMic = $('#selAudioIn');
  const selSpk = $('#selAudioOut');
  const selCam = $('#selVideoIn');

  if (selMic) {
    selMic.innerHTML = mics.map((d, i) => `<option value="${esc(d.deviceId)}" ${d.deviceId === activeRoom.audioDeviceId ? 'selected' : ''}>${esc(d.label || `Microphone ${i + 1}`)}</option>`).join('') || '<option value="">Default Microphone</option>';
  }
  if (selSpk) {
    selSpk.innerHTML = speakers.map((d, i) => `<option value="${esc(d.deviceId)}" ${d.deviceId === activeRoom.speakerDeviceId ? 'selected' : ''}>${esc(d.label || `Speaker / Bluetooth ${i + 1}`)}</option>`).join('') || '<option value="">System Default Speaker</option>';
  }
  if (selCam) {
    selCam.innerHTML = cams.map((d, i) => `<option value="${esc(d.deviceId)}" ${d.deviceId === activeRoom.videoDeviceId ? 'selected' : ''}>${esc(d.label || `Camera ${i + 1}`)}</option>`).join('') || '<option value="">Default Camera</option>';
  }
}

// Automatically listen for device plug/unplug & Bluetooth connection changes
if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    if (activeRoom) populateStudioDevices();
  });
}

function bindStudioControls() {
  populateStudioDevices();

  $('#selAudioIn').onchange = async e => {
    const deviceId = e.target.value;
    if (!deviceId || !activeRoom) return;
    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          noiseSuppression: { ideal: activeRoom.audioMix.noiseSuppression },
          echoCancellation: { ideal: activeRoom.audioMix.echoCancellation },
          autoGainControl: { ideal: activeRoom.audioMix.autoGainControl },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          latency: { ideal: 0.01 }
        }
      });
      const newTrack = newAudioStream.getAudioTracks()[0];
      if (newTrack) {
        newTrack.enabled = activeRoom.audioOn;
        try { if ('contentHint' in newTrack) newTrack.contentHint = 'speech'; } catch {}
      }
      activeRoom.audioDeviceId = deviceId;
      activeRoom.rawStream?.getAudioTracks().forEach(t => { activeRoom.rawStream.removeTrack(t); t.stop(); });
      if (activeRoom.rawStream && newTrack) activeRoom.rawStream.addTrack(newTrack);
      else activeRoom.rawStream = newAudioStream;
      activeRoom.stream = activeRoom.rawStream;

      setupAudioMixPipeline();
      const sendTrack = activeRoom.rawStream.getAudioTracks()[0];
      activeRoom.peers.forEach(({ pc }) => {
        const sender = getAudioSender(pc);
        if (sender) {
          sender.replaceTrack(sendTrack).then(() => optimizePeerAudio(pc)).catch(() => {});
        }
      });
    } catch (err) {
      toast('Could not switch microphone: ' + err.message, 'err');
    }
  };

  $('#selAudioOut').onchange = async e => {
    const sinkId = e.target.value;
    activeRoom.speakerDeviceId = sinkId;
    $$('#meetStage audio.remote-audio-track').forEach(el => {
      if (typeof el.setSinkId === 'function') {
        el.setSinkId(sinkId).catch(err => console.warn('setSinkId error:', err));
      }
    });
    if (activeRoom.rxAudioCtx && typeof activeRoom.rxAudioCtx.setSinkId === 'function') {
      activeRoom.rxAudioCtx.setSinkId(sinkId).catch(() => {});
    }
  };

  $('#selVideoIn').onchange = async e => {
    const deviceId = e.target.value;
    if (!deviceId || !activeRoom) return;
    activeRoom.videoDeviceId = deviceId;
    // Guard: If camera is currently OFF, do NOT activate webcam hardware
    if (!activeRoom.videoOn) {
      return;
    }
    try {
      const newCamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      const newTrack = newCamStream.getVideoTracks()[0];
      activeRoom.rawStream?.getVideoTracks().forEach(t => { activeRoom.rawStream.removeTrack(t); t.stop(); });
      if (activeRoom.rawStream) activeRoom.rawStream.addTrack(newTrack);
      if ($('#localVideo')) setLocalVideoPreview($('#localVideo'), activeRoom.rawStream);

      activeRoom.peers.forEach(({ pc }) => {
        const sender = getVideoSender(pc);
        if (sender) sender.replaceTrack(newTrack).catch(() => {});
      });
    } catch (err) {
      toast('Could not switch camera: ' + err.message, 'err');
    }
  };

  $('#testSpeakerBtn')?.addEventListener('click', () => {
    SoundFX?.play('join');
  });

  const applyAudioConstraints = () => {
    const noise = $('#mixNoise')?.checked ?? true;
    const echo = $('#mixEcho')?.checked ?? true;
    const agc = $('#mixAgc')?.checked ?? true;
    activeRoom.audioMix.noiseSuppression = noise;
    activeRoom.audioMix.echoCancellation = echo;
    activeRoom.audioMix.autoGainControl = agc;
    activeRoom.rawStream?.getAudioTracks().forEach(t => {
      t.applyConstraints?.({
        noiseSuppression: noise,
        echoCancellation: echo,
        autoGainControl: agc
      }).catch(() => {});
    });
  };
  if ($('#mixNoise')) $('#mixNoise').onchange = applyAudioConstraints;
  if ($('#mixEcho')) $('#mixEcho').onchange = applyAudioConstraints;
  if ($('#mixAgc')) $('#mixAgc').onchange = applyAudioConstraints;

  $('#fxMirror')?.addEventListener('change', e => {
    activeRoom.videoFx.mirror = e.target.checked;
    $('#localVideo')?.classList.toggle('mirror', e.target.checked);
  });
}

async function renegotiatePeer(connId, entry) {
  if (!entry) entry = activeRoom?.peers?.get(connId);
  if (!entry || !entry.pc) return;
  if (entry.makingOffer || entry.pc.signalingState !== 'stable') {
    entry._pendingRenegotiate = true;
    return;
  }
  try {
    entry.makingOffer = true;
    preferHardwareVideoCodecs(entry.pc);
    const offer = await entry.pc.createOffer();
    if (entry.pc.signalingState !== 'stable') {
      entry._pendingRenegotiate = true;
      return;
    }
    try {
      await entry.pc.setLocalDescription({ type: offer.type, sdp: optimizeOpusSdp(offer.sdp) });
    } catch {
      await entry.pc.setLocalDescription(offer);
    }
    optimizePeerAudio(entry.pc);
    S.ws?.send(JSON.stringify({ type: 'meet:signal', to: connId, data: { desc: entry.pc.localDescription } }));
  } catch (err) {
    console.warn('Renegotiate peer error:', err);
  } finally {
    entry.makingOffer = false;
    if (entry._pendingRenegotiate && entry.pc?.signalingState === 'stable') {
      entry._pendingRenegotiate = false;
      renegotiatePeer(connId, entry);
    }
  }
}

function isPeerVideoStreamActive(entry, videoEl, track) {
  const st = entry?.state;
  if (st?.video || st?.screen) return true;
  if (st && (st.video === false || Object.keys(st).length > 0)) return false;
  return Boolean(track && track.readyState === 'live' && !track.muted && videoEl && videoEl.videoWidth > 0);
}

function hydratePeerTileIdentity(entry) {
  if (!entry || !entry.tile) return;
  const cachedUser = entry.userId && S.users?.get(entry.userId);
  const peerUser = cachedUser || {
    id: entry.userId,
    name: entry.name || 'Participant',
    username: entry.name,
    avatar: entry.avatar || null,
    avatarColor: entry.avatarColor || '#7c5cff'
  };
  const halo = entry.tile.querySelector('.tile-avatar-halo');
  if (halo) halo.innerHTML = avatarHTML(peerUser, 'xl');
  const heroName = entry.tile.querySelector('.tile-hero-name');
  if (heroName) heroName.textContent = peerUser.name || entry.name || 'Participant';
  const badgeName = entry.tile.querySelector('.tile-user-name');
  if (badgeName) badgeName.textContent = peerUser.name || entry.name || 'Participant';

  if (entry.userId && (!cachedUser || !peerUser.avatar || !peerUser.name || peerUser.name === 'Participant') && !entry._lookupPending) {
    entry._lookupPending = true;
    api('/api/users/lookup', { method: 'POST', body: { ids: [entry.userId] } }).then(list => {
      if (list && list[0]) {
        const fullU = list[0];
        S.users.set(fullU.id, fullU);
        if (fullU.name) entry.name = fullU.name;
        if (fullU.avatar) entry.avatar = fullU.avatar;
        if (fullU.avatarColor) entry.avatarColor = fullU.avatarColor;
        const h = entry.tile?.querySelector('.tile-avatar-halo');
        if (h) h.innerHTML = avatarHTML(fullU, 'xl');
        const bn = entry.tile?.querySelector('.tile-user-name');
        if (bn) bn.textContent = fullU.name || entry.name;
        const hn = entry.tile?.querySelector('.tile-hero-name');
        if (hn) hn.textContent = fullU.name || entry.name;
      }
    }).catch(() => {}).finally(() => {
      entry._lookupPending = false;
    });
  }
}

function ensurePeer(connId, name, polite, userId, avatar, avatarColor, initialState) {
  if (!activeRoom) return null;
  if (activeRoom.peers.has(connId)) {
    const existing = activeRoom.peers.get(connId);
    if (existing) {
      if (userId && !existing.userId) existing.userId = userId;
      if (avatar && !existing.avatar) existing.avatar = avatar;
      if (avatarColor && !existing.avatarColor) existing.avatarColor = avatarColor;
      if (name && (!existing.name || existing.name === 'Participant')) existing.name = name;
      if (initialState) existing.state = { ...(existing.state || {}), ...initialState };

      hydratePeerTileIdentity(existing);

      // Synchronize video element and no-cam hero visibility
      const v = existing.tile?.querySelector('video');
      const vidTrack = v?.srcObject?.getVideoTracks?.()[0] || existing.pc?.getReceivers?.().find(r => r.track?.kind === 'video')?.track;
      const hasActiveVideo = isPeerVideoStreamActive(existing, v, vidTrack);
      const noCam = existing.tile?.querySelector('.peer-no-cam');
      if (v) v.classList.toggle('hidden', !hasActiveVideo);
      if (noCam) noCam.classList.toggle('hidden', hasActiveVideo);
    }
    return existing;
  }
  if (userId) {
    for (const [existingConnId, existingPeer] of activeRoom.peers.entries()) {
      if (existingPeer.userId === userId && existingConnId !== connId) {
        try { existingPeer.pc.close(); } catch {}
        cleanupTileMedia(existingPeer.tile, existingPeer);
        activeRoom.peers.delete(existingConnId);
      }
    }
  }

  const pc = new RTCPeerConnection(RTC_CFG);
  const sendStream = activeRoom.rawStream || activeRoom.stream;

  const audioTrack = sendStream?.getAudioTracks()[0];
  const videoTrack = activeRoom.screenStream?.getVideoTracks()[0] || sendStream?.getVideoTracks()[0];

  if (audioTrack) {
    pc.addTrack(audioTrack, sendStream);
  } else if (!polite) {
    try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch {}
  }

  if (videoTrack) {
    pc.addTrack(videoTrack, activeRoom.screenStream || sendStream);
  } else if (!polite) {
    try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch {}
  }

  preferHardwareVideoCodecs(pc);
  optimizePeerAudio(pc);

  const peerUser = (userId && S.users?.get(userId)) || {
    id: userId,
    name: name || 'Participant',
    username: name,
    avatar: avatar || null,
    avatarColor: avatarColor || '#7c5cff'
  };

  const videoActive = Boolean(initialState?.video || initialState?.screen);

  // Remove any previous stale or duplicate tile for this user / connId and explicitly stop its audio
  const staleTiles = document.querySelectorAll(`#tile-${connId}${userId ? `, .video-tile[data-uid="${userId}"]` : ''}`);
  staleTiles.forEach(el => cleanupTileMedia(el));

  const tile = document.createElement('div');
  tile.className = 'video-tile';
  tile.id = `tile-${connId}`;
  if (userId) tile.dataset.uid = userId;
  tile.innerHTML = `
    <audio autoplay playsinline class="remote-audio-track"></audio>
    <video muted autoplay playsinline class="${videoActive ? '' : 'hidden'}"></video>
    <canvas class="remote-relay-canvas hidden" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:2;pointer-events:none"></canvas>
    <img class="remote-relay-frame hidden" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:2;pointer-events:none" />
    <div class="tile-no-cam-hero peer-no-cam ${videoActive ? 'hidden' : ''}">
      <div class="tile-avatar-halo">
        ${avatarHTML(peerUser, 'xl')}
      </div>
      <div class="tile-status-tag">
        <span class="tile-tag-dot"></span>
        <span>Camera Off</span>
      </div>
    </div>

    <!-- Floating Top HUD Controls -->
    <div class="tile-hud-top">
      <div class="tile-hud-badges">
        <div class="tile-screen-badge hidden">
          ${icon('screen')} <span>Live Screen</span>
        </div>
      </div>
      <div class="tile-hud-actions">
        <div class="tile-vol-wrap" title="User Volume">
          <button type="button" class="tile-vol-mute-btn" title="Mute / Unmute">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
          <input type="range" class="tile-vol-slider" min="0" max="150" value="100" aria-label="User Volume">
          <span class="tile-vol-pct">100%</span>
        </div>
        <button type="button" class="tile-action-btn tile-pin-btn" title="Pin / Spotlight">${icon('pin')}</button>
        <button type="button" class="tile-action-btn tile-fs-btn" title="Full Screen">${icon('maximize')}</button>
      </div>
    </div>

    <!-- Floating Bottom HUD Bar -->
    <div class="video-label-bar">
      <div class="tile-name-badge">
        <span class="tile-mic-icon ${initialState?.audio === false ? 'off' : 'on'}">
          ${initialState?.audio === false ? icon('micOff') : icon('mic')}
        </span>
        <span class="tile-user-name">${esc(peerUser.name || name || 'Participant')}</span>
        <span class="tile-voice-wave" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
    </div>
  `;
  tile.ondblclick = () => toggleTileFullscreen(tile);
  tile.querySelector('.tile-fs-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTileFullscreen(tile);
  });
  tile.querySelector('.tile-pin-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePinTile(tile);
  });

  const targetContainer = $('#meetGridSlot') || $('#meetStage');
  targetContainer?.appendChild(tile);
  updateStageLayout();

  const audioEl = tile.querySelector('audio');
  const videoEl = tile.querySelector('video');
  const relayImg = tile.querySelector('.remote-relay-frame');
  const remoteStream = new MediaStream();
  videoEl.srcObject = null;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true; // Video element muted to prevent echo; audioEl handles pure voice output
  videoEl.volume = 0;

  // Start <audio> muted until WebRTC RTP audio bytes are verified flowing so it never echoes against the WebSocket relay
  audioEl.muted = true;

  const entry = {
    pc,
    name,
    tile,
    polite,
    userId,
    avatar,
    avatarColor,
    state: initialState || {},
    remoteStream,
    iceQueue: [],
    rtcAudioActive: false,
    rtcAudioVerified: false,
    _scheduledSources: new Set(),
    _nextAudioTime: 0,
    _statsTimer: null,
    _peerGain: 1.0,
    _pendingRenegotiate: false
  };

  const syncAudioPathExclusivity = () => {
    const rtcLive = isPeerRtcAudioLive(entry);
    const gain = entry._peerGain !== undefined ? entry._peerGain : 1.0;
    if (audioEl) {
      audioEl.muted = !rtcLive || gain <= 0.001;
      if (rtcLive) {
        audioEl.volume = Math.max(0, Math.min(1, gain));
        stopRelayAudioForPeer(entry);
        audioEl.play().catch(() => {});
      }
    }
  };

  const volWrap = tile.querySelector('.tile-vol-wrap');
  const volSlider = tile.querySelector('.tile-vol-slider');
  const volMuteBtn = tile.querySelector('.tile-vol-mute-btn');
  const volPct = tile.querySelector('.tile-vol-pct');
  const updateVolUi = (val) => {
    const pctNum = Math.max(0, Math.min(150, Number(val) || 0));
    if (volSlider) {
      volSlider.value = String(pctNum);
      volSlider.style.setProperty('--vol-pct', `${((pctNum / 150) * 100).toFixed(1)}%`);
    }
    if (volPct) volPct.textContent = `${Math.round(pctNum)}%`;
    if (volMuteBtn) volMuteBtn.classList.toggle('muted', pctNum <= 0);
  };
  if (volWrap) {
    ['click', 'dblclick', 'mousedown', 'pointerdown'].forEach(ev => volWrap.addEventListener(ev, e => e.stopPropagation()));
  }
  if (volSlider) {
    updateVolUi(volSlider.value);
    volSlider.addEventListener('input', () => {
      const val = Number(volSlider.value);
      if (val > 0) entry._lastNonZeroVol = val;
      entry._peerGain = val / 100;
      updateVolUi(val);
      syncAudioPathExclusivity();
    });
  }
  if (volMuteBtn && volSlider) {
    volMuteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = Number(volSlider.value) || 0;
      const next = cur > 0 ? (entry._lastNonZeroVol = cur, 0) : (entry._lastNonZeroVol || 100);
      entry._peerGain = next / 100;
      updateVolUi(next);
      syncAudioPathExclusivity();
    });
  }

  // Poll WebRTC inbound-rtp audio bytesReceived so we only switch from WebSocket relay to WebRTC <audio> when UDP packets actually arrive
  entry._statsTimer = setInterval(async () => {
    if (!activeRoom || !entry.pc || entry.pc.connectionState === 'closed') {
      clearInterval(entry._statsTimer);
      return;
    }
    const iceSt = entry.pc.iceConnectionState;
    if (iceSt !== 'connected' && iceSt !== 'completed') {
      entry._rtcFailCount = (entry._rtcFailCount || 0) + 1;
      // Wait ~2.8s before falling back to WS relay so brief ICE flickers never cause double-echo
      if (entry.rtcAudioVerified && entry._rtcFailCount >= 4) {
        entry.rtcAudioVerified = false;
        syncAudioPathExclusivity();
      }
      return;
    }
    entry._rtcFailCount = 0;
    try {
      const stats = await entry.pc.getStats();
      let audioBytes = 0;
      let audioLevel = 0;
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
          audioBytes += (report.bytesReceived || 0);
          if (typeof report.audioLevel === 'number') audioLevel = Math.max(audioLevel, report.audioLevel);
        } else if (report.type === 'track' && report.kind === 'audio' && typeof report.audioLevel === 'number') {
          audioLevel = Math.max(audioLevel, report.audioLevel);
        }
      });
      const prevBytes = entry._lastRtcAudioBytes || 0;
      entry._lastRtcAudioBytes = audioBytes;
      if (audioBytes > 2048 && audioBytes > prevBytes) {
        if (!entry.rtcAudioVerified) {
          entry.rtcAudioVerified = true;
          syncAudioPathExclusivity();
        }
      }
      if (audioLevel > 0.014 && entry.state?.audio !== false) {
        pulsePeerSpeaking(entry, true, 520);
      }
    } catch {}
  }, 700);

  pc.ontrack = e => {
    if (e.track.kind === 'audio') {
      entry.rtcAudioActive = true;
      const targetPlayoutSec = window.ZovioAndroid ? 0.14 : 0.06;
      if (e.receiver && 'playoutDelayHint' in e.receiver) {
        try { e.receiver.playoutDelayHint = targetPlayoutSec; } catch {}
      }
      if (e.receiver && 'jitterBufferTarget' in e.receiver) {
        try { e.receiver.jitterBufferTarget = Math.round(targetPlayoutSec * 1000); } catch {}
      }
      // Isolate ONLY the audio track on <audio> so no video/duplicate stream is attached
      audioEl.srcObject = new MediaStream([e.track]);
      attachPeerAudioAnalyser(entry, e.track);
      syncAudioPathExclusivity();
      audioEl.play().catch(() => {
        const resumeAudio = () => {
          audioEl.play().catch(() => {});
          document.removeEventListener('click', resumeAudio);
        };
        document.addEventListener('click', resumeAudio);
      });
      if (activeRoom.speakerDeviceId && typeof audioEl.setSinkId === 'function') {
        audioEl.setSinkId(activeRoom.speakerDeviceId).catch(() => {});
      }
    } else if (e.track.kind === 'video') {
      // Strictly isolate ONLY the video track on <video> and keep it muted so it never outputs audio
      videoEl.muted = true;
      videoEl.volume = 0;
      videoEl.srcObject = new MediaStream([e.track]);
      const syncVid = () => {
        const isVideoAllowed = isPeerVideoStreamActive(entry, videoEl, e.track);
        videoEl.classList.toggle('hidden', !isVideoAllowed);
        if (isVideoAllowed) {
          tile.querySelector('.peer-no-cam')?.classList.add('hidden');
          videoEl.play().catch(() => {});
          if (videoEl.videoWidth > 0) {
            if (relayImg) relayImg.classList.add('hidden');
            tile.querySelector('.remote-relay-canvas')?.classList.add('hidden');
          }
        } else {
          tile.querySelector('.peer-no-cam')?.classList.remove('hidden');
        }
      };
      videoEl.onloadedmetadata = syncVid;
      videoEl.onplaying = syncVid;
      e.track.onunmute = syncVid;
      e.track.onmute = syncVid;
      syncVid();
    }
  };

  pc.onicecandidate = e => {
    if (e.candidate) S.ws?.send(JSON.stringify({ type: 'meet:signal', to: connId, data: { candidate: e.candidate } }));
  };

  pc.oniceconnectionstatechange = () => {
    syncAudioPathExclusivity();
    if (pc.iceConnectionState === 'failed') {
      try { pc.restartIce(); } catch {}
    }
  };

  pc.onsignalingstatechange = () => {
    if (pc.signalingState === 'stable' && entry._pendingRenegotiate) {
      entry._pendingRenegotiate = false;
      renegotiatePeer(connId, entry);
    }
  };

  activeRoom.peers.set(connId, entry);
  hydratePeerTileIdentity(entry);
  return entry;
}

function sendMeetingReaction(emoji) {
  if (!activeRoom) return;
  showMeetingReaction(activeRoom.connId, emoji, S.user?.name || 'You');
  S.ws?.send(JSON.stringify({ type: 'meet:reaction', emoji }));
  $('#meetReactPopover')?.classList.add('hidden');
}

function showMeetingReaction(connId, emoji, name) {
  if (!activeRoom) return;
  SoundFX?.play?.('react');

  // Find target tile
  let tile = null;
  if (connId === activeRoom.connId) {
    tile = $('#localTile');
  } else if (activeRoom.peers.has(connId)) {
    tile = activeRoom.peers.get(connId)?.tile;
  } else {
    tile = document.getElementById(`tile-${connId}`);
  }
  const stage = $('#meetStage') || $('#meetRoom');
  if (!tile) tile = $('#localTile') || stage;
  const host = stage || tile;
  if (!host) return;

  // 1. Spawn floating emoji particles on stage (never clipped by tile overflow:hidden)
  let anchorLeftPct = 50;
  let anchorBottomPx = 68;
  try {
    if (tile && stage && tile !== stage) {
      const sRect = stage.getBoundingClientRect();
      const tRect = tile.getBoundingClientRect();
      if (sRect.width > 0 && tRect.width > 0) {
        anchorLeftPct = ((tRect.left - sRect.left + tRect.width / 2) / sRect.width) * 100;
        anchorBottomPx = Math.max(48, sRect.bottom - tRect.bottom + 42);
      }
    }
  } catch {}

  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      if (!activeRoom || !host) return;
      const particle = document.createElement('div');
      particle.className = 'meet-flying-emoji';
      particle.textContent = emoji;
      const offsetX = (Math.random() - 0.5) * 68;
      particle.style.left = `calc(${anchorLeftPct.toFixed(1)}% + ${offsetX}px)`;
      particle.style.bottom = `${anchorBottomPx}px`;
      particle.style.fontSize = `${26 + Math.floor(Math.random() * 14)}px`;
      particle.style.animationDuration = `${1.3 + Math.random() * 0.45}s`;
      host.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove());
      setTimeout(() => particle.remove(), 2000);
    }, i * 80);
  }

  // 2. Tile reaction badge
  let pill = tile.querySelector('.tile-reaction-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.className = 'tile-reaction-pill';
    tile.appendChild(pill);
  }
  pill.innerHTML = `<span class="pill-emoji">${emoji}</span>`;
  pill.classList.remove('hidden', 'fade-out');
  void pill.offsetWidth;
  pill.classList.add('pop-in');
  clearTimeout(tile._reactTimer);
  tile._reactTimer = setTimeout(() => {
    pill.classList.add('fade-out');
    setTimeout(() => pill.remove(), 400);
  }, 2200);
}

function openMeetVideoRelayChannel() {
  if (!activeRoom || !activeRoom.connId || !S.token) return;
  if (activeRoom.videoWs && (activeRoom.videoWs.readyState === 0 || activeRoom.videoWs.readyState === 1)) return;
  try {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const vws = new WebSocket(`${proto}//${location.host}`);
    vws.binaryType = 'arraybuffer';
    activeRoom.videoWs = vws;
    const roomRef = activeRoom;
    vws.onopen = () => {
      if (activeRoom !== roomRef) {
        try { vws.close(); } catch {}
        return;
      }
      try {
        vws.send(JSON.stringify({
          type: 'meet:media-channel',
          token: S.token,
          code: roomRef.code,
          connId: roomRef.connId
        }));
      } catch {}
    };
    vws.onmessage = (ev) => {
      if (activeRoom !== roomRef) return;
      if (ev.data instanceof ArrayBuffer) {
        window.handleMeetBinaryMedia?.(ev.data);
      }
    };
    vws.onclose = () => {
      if (activeRoom === roomRef) {
        roomRef.videoWs = null;
        setTimeout(() => {
          if (activeRoom === roomRef) openMeetVideoRelayChannel();
        }, 1800);
      }
    };
    vws.onerror = () => {};
  } catch {}
}

async function handleMeetWS(msg) {
  if (!activeRoom) return;
  if (msg.type === 'meet:joined') {
    activeRoom.connId = msg.connId;
    openMeetVideoRelayChannel();
    for (const p of msg.peers) {
      const entry = ensurePeer(p.connId, p.name, false, p.userId, p.avatar, p.avatarColor, p.state);
      try {
        entry.makingOffer = true;
        const offer = await entry.pc.createOffer();
        try {
          await entry.pc.setLocalDescription({ type: offer.type, sdp: optimizeOpusSdp(offer.sdp) });
        } catch {
          await entry.pc.setLocalDescription(offer);
        }
        optimizePeerAudio(entry.pc);
        S.ws?.send(JSON.stringify({ type: 'meet:signal', to: p.connId, data: { desc: entry.pc.localDescription } }));
      } catch (err) {
        console.warn('Initial offer error:', err);
      } finally {
        entry.makingOffer = false;
        if (entry._pendingRenegotiate && entry.pc?.signalingState === 'stable') {
          entry._pendingRenegotiate = false;
          renegotiatePeer(p.connId, entry);
        }
      }
    }
  } else if (msg.type === 'meet:peer') {
    ensurePeer(msg.connId, msg.name, true, msg.userId, msg.avatar, msg.avatarColor, msg.state);
    activeRoom._forceRelayKeyframe = true;
  } else if (msg.type === 'meet:signal') {
    const { desc, candidate, relayKeyframe, preferVp8, congested } = msg.data || {};
    if (relayKeyframe || preferVp8 || congested) {
      if (preferVp8) {
        activeRoom._forceRelayVp8 = true;
        activeRoom._resetRelayEncoder = true;
      }
      if (congested) {
        activeRoom._onRelayCongestion?.();
      }
      if (relayKeyframe) activeRoom._forceRelayKeyframe = true;
      if (!desc && !candidate) return;
    }
    const entry = ensurePeer(msg.from, 'Participant', true, msg.userId);
    if (!entry) return;
    if (desc) {
      const isOffer = desc.type === 'offer';
      const offerCollision = isOffer && (entry.makingOffer || entry.pc.signalingState !== 'stable');
      entry.ignoreOffer = !entry.polite && offerCollision;
      if (entry.ignoreOffer) {
        console.warn('Ignoring offer due to glare on impolite peer');
        return;
      }
      if (offerCollision) {
        try {
          await entry.pc.setLocalDescription({ type: 'rollback' });
        } catch (err) {
          console.warn('Rollback failed:', err);
        }
      }
      await entry.pc.setRemoteDescription(new RTCSessionDescription(desc));
      // Drain any queued ICE candidates that arrived before remoteDescription was set
      if (entry.iceQueue && entry.iceQueue.length) {
        while (entry.iceQueue.length > 0) {
          const queuedCand = entry.iceQueue.shift();
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(queuedCand));
          } catch (e) {
            console.warn('Drain ICE candidate err:', e);
          }
        }
      }
      if (desc.type === 'offer') {
        const sendStream = activeRoom.rawStream || activeRoom.stream;
        const localAudio = sendStream?.getAudioTracks()[0] || null;
        const localVideo = activeRoom.screenStream?.getVideoTracks()[0] || (activeRoom.videoOn ? sendStream?.getVideoTracks()[0] : null) || null;

        const aTr = getAudioTransceiver(entry.pc);
        if (aTr) {
          try { aTr.direction = 'sendrecv'; } catch {}
          if (localAudio && aTr.sender?.track !== localAudio) {
            await aTr.sender.replaceTrack(localAudio).catch(() => {});
          }
        } else if (localAudio) {
          try { entry.pc.addTrack(localAudio, sendStream); } catch {}
        }

        const vTr = getVideoTransceiver(entry.pc);
        if (vTr) {
          try { vTr.direction = 'sendrecv'; } catch {}
          if (localVideo && vTr.sender?.track !== localVideo) {
            await vTr.sender.replaceTrack(localVideo).catch(() => {});
          }
        } else if (localVideo) {
          try { entry.pc.addTrack(localVideo, activeRoom.screenStream || sendStream); } catch {}
        }

        preferHardwareVideoCodecs(entry.pc);
        const ans = await entry.pc.createAnswer();
        try {
          await entry.pc.setLocalDescription({ type: ans.type, sdp: optimizeOpusSdp(ans.sdp) });
        } catch {
          await entry.pc.setLocalDescription(ans);
        }
        optimizePeerAudio(entry.pc);
        S.ws?.send(JSON.stringify({ type: 'meet:signal', to: msg.from, data: { desc: entry.pc.localDescription } }));
      }
    } else if (candidate) {
      if (entry.pc.remoteDescription && entry.pc.remoteDescription.type) {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Direct addIceCandidate err:', e);
        }
      } else {
        if (!entry.iceQueue) entry.iceQueue = [];
        entry.iceQueue.push(candidate);
      }
    }
  } else if (msg.type === 'meet:media') {
    if (msg.userId && S.user && msg.userId === S.user.id) return;
    const entry = ensurePeer(msg.connId, 'Participant', true, msg.userId);
    if (!entry) return;
    if (msg.kind === 'video' && msg.frame) {
      const tile = entry.tile;
      const relayImg = tile?.querySelector('.remote-relay-frame');
      const v = tile?.querySelector('video');
      const noCam = tile?.querySelector('.peer-no-cam');
      const isScreen = Boolean(msg.screen);
      const prevScreen = Boolean(entry.state?.screen);
      entry.state = { ...(entry.state || {}), video: true, screen: isScreen };

      tile?.classList.toggle('is-screen', isScreen);
      tile?.querySelector('.tile-screen-badge')?.classList.toggle('hidden', !isScreen);
      if (noCam) noCam.classList.add('hidden');

      const rtcVideoPlaying = v && !v.classList.contains('hidden') && !v.paused && v.readyState >= 2 && v.videoWidth > 0 && (entry.pc?.iceConnectionState === 'connected' || entry.pc?.iceConnectionState === 'completed');
      if (relayImg) {
        const wantFit = isScreen ? 'contain' : 'cover';
        if (relayImg.style.objectFit !== wantFit) relayImg.style.objectFit = wantFit;
        relayImg.src = msg.frame;
        if (relayImg.classList.contains('hidden') !== Boolean(rtcVideoPlaying)) {
          relayImg.classList.toggle('hidden', Boolean(rtcVideoPlaying));
        }
      }
      if (prevScreen !== isScreen) {
        updateStageLayout();
      }
    } else if (msg.kind === 'audio' && msg.pcm) {
      if (entry.state?.audio === false) return;
      if (!isPeerRtcAudioLive(entry)) {
        playRelayAudioChunk(entry, msg.pcm, msg.rate || 16000);
      } else {
        stopRelayAudioForPeer(entry);
      }
    }
  } else if (msg.type === 'meet:state') {
    const entry = activeRoom.peers.get(msg.connId);
    if (entry) {
      const prevIsScreen = Boolean(entry.state?.screen);
      const prevIsVideo = Boolean(entry.state?.video || prevIsScreen);
      entry.state = msg.state || {};
      if (msg.state?.audio === false) {
        stopRelayAudioForPeer(entry);
        pulsePeerSpeaking(entry, false, 0);
      }
      const tile = entry.tile;
      const v = tile?.querySelector('video');
      const relayImg = tile?.querySelector('.remote-relay-frame');
      const relayCanvas = tile?.querySelector('.remote-relay-canvas');
      const noCam = tile?.querySelector('.peer-no-cam');
      const micIcon = tile?.querySelector('.tile-mic-icon');
      const isScreen = !!msg.state?.screen;
      const isVideo = !!msg.state?.video || isScreen;

      if (micIcon) {
        const micCls = `tile-mic-icon ${msg.state?.audio === false ? 'off' : 'on'}`;
        if (micIcon.className !== micCls) {
          micIcon.className = micCls;
          micIcon.innerHTML = msg.state?.audio === false ? icon('micOff') : icon('mic');
        }
      }

      if (prevIsScreen !== isScreen) {
        tile?.classList.toggle('is-screen', isScreen);
        tile?.querySelector('.tile-screen-badge')?.classList.toggle('hidden', !isScreen);
      }

      if (!isVideo && prevIsVideo) {
        if (relayImg) {
          relayImg.classList.add('hidden');
          relayImg.removeAttribute('src');
        }
        if (relayCanvas) relayCanvas.classList.add('hidden');
        resetEntryRelayVideo(entry, false);
      }
      if (v) {
        v.muted = true;
        v.volume = 0;
        const remoteVidTrack = entry.pc.getReceivers?.().find(r => r.track?.kind === 'video')?.track;
        const curVidTrack = v.srcObject?.getVideoTracks?.()[0];
        if (remoteVidTrack && (!curVidTrack || curVidTrack.id !== remoteVidTrack.id)) {
          v.srcObject = new MediaStream([remoteVidTrack]);
        }
        v.classList.toggle('hidden', !isVideo);
        if (isScreen) {
          v.classList.add('screen-share');
          v.classList.remove('mirror', 'hidden');
          if (v.style.objectFit !== 'contain') v.style.objectFit = 'contain';
        } else {
          v.classList.remove('screen-share');
          if (v.style.objectFit !== 'cover') v.style.objectFit = 'cover';
        }
        if (isVideo) {
          noCam?.classList.add('hidden');
          if (v.paused) v.play().catch(() => {});
          if (v.videoWidth > 0 && relayImg) {
            relayImg.classList.add('hidden');
          }
        } else {
          noCam?.classList.remove('hidden');
        }
      }
      const audioEl = tile?.querySelector('audio');
      if (audioEl) {
        const remoteAudioTrack = entry.pc.getReceivers?.().find(r => r.track?.kind === 'audio')?.track;
        const curAudTrack = audioEl.srcObject?.getAudioTracks?.()[0];
        if (remoteAudioTrack && (!curAudTrack || curAudTrack.id !== remoteAudioTrack.id)) {
          audioEl.srcObject = new MediaStream([remoteAudioTrack]);
        }
        const rtcLive = isPeerRtcAudioLive(entry);
        audioEl.muted = !rtcLive;
        if (rtcLive) {
          audioEl.volume = 1.0;
          if (audioEl.paused) audioEl.play().catch(() => {});
        }
      }
      if (prevIsScreen !== isScreen) {
        updateStageLayout();
      }
    }
  } else if (msg.type === 'meet:reaction') {
    showMeetingReaction(msg.connId, msg.emoji, msg.name);
  } else if (msg.type === 'meet:left') {
    const isDirect = Boolean(activeRoom.isDirectCall || msg.isDirectCall);
    const hadOnlyTwo = !msg.replaced && isDirect && ((activeRoom.peers.size === 1) || msg.wasTwoPersonCall);
    const entry = activeRoom.peers.get(msg.connId);
    if (entry) {
      try { entry.pc.close(); } catch {}
      cleanupTileMedia(entry.tile, entry);
      activeRoom.peers.delete(msg.connId);
      updateStageLayout();
    }
    if (msg.replaced) return;
    if (hadOnlyTwo) {
      SoundFX?.play?.('leave');
      leaveMeetingRoom();
      return;
    }
  }
}

function leaveMeetingRoom() {
  if (!activeRoom) return;
  clearInterval(activeRoom.meterTimer);
  clearInterval(activeRoom._peerSpeakTimer);
  clearInterval(activeRoom.videoRelayTimer);
  if (activeRoom.audioWorkletNode) {
    try {
      activeRoom.audioWorkletNode.port.onmessage = null;
      activeRoom.audioWorkletNode.disconnect();
    } catch {}
    activeRoom.audioWorkletNode = null;
  }
  if (activeRoom.audioProcessor) {
    try {
      activeRoom.audioProcessor.onaudioprocess = null;
      activeRoom.audioProcessor.disconnect();
    } catch {}
    activeRoom.audioProcessor = null;
  }
  if (activeRoom.videoWs) {
    try { activeRoom.videoWs.close(); } catch {}
    activeRoom.videoWs = null;
  }
  if (activeRoom.audioCtx) activeRoom.audioCtx.close().catch(() => {});
  if (activeRoom.rxAudioCtx) activeRoom.rxAudioCtx.close().catch(() => {});
  if (activeRoom.keepAliveCtx) activeRoom.keepAliveCtx.close().catch(() => {});
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.playbackState = 'none'; } catch {}
  }
  if (activeRoom._relayTrackReader) {
    try { activeRoom._relayTrackReader.cancel(); } catch {}
    activeRoom._relayTrackReader = null;
  }
  if (activeRoom._relayEncoder) {
    try {
      if (activeRoom._relayEncoder.state !== 'closed') activeRoom._relayEncoder.close();
    } catch {}
    activeRoom._relayEncoder = null;
  }
  if (activeRoom._rustVideoTimer) {
    clearInterval(activeRoom._rustVideoTimer);
    activeRoom._rustVideoTimer = null;
  }
  if (activeRoom._rustAudioTimer) {
    clearInterval(activeRoom._rustAudioTimer);
    activeRoom._rustAudioTimer = null;
  }
  activeRoom._rustCaptureActive = false;
  try { activeRoom._rustVideoWriter?.close?.(); } catch {}
  try { activeRoom._rustAudioWriter?.close?.(); } catch {}
  try { window.fireuppNative?.stopRustScreenShare?.(); } catch {}
  window.__zovioAndroidScreenFrame = null;
  try { window.ZovioAndroid?.stopScreenShare?.().catch(() => {}); } catch {}
  window.__zovioScreenShareStopped = null;
  try { window.ZovioAndroid?.setCallPipAllowed?.(false).catch(() => {}); } catch {}
  try { window.ZovioAndroid?.stopCallService?.().catch(() => {}); } catch {}
  document.body.classList.remove('android-pip-active');
  if (activeRoom.screenStream) {
    try { activeRoom.screenStream.getTracks().forEach(t => t.stop()); } catch {}
    activeRoom.screenStream = null;
  }
  try { window.fireuppNative?.setScreenShareActive?.(false); } catch {}
  // If this was a direct 1-on-1 call session, notify server and peer
  if (typeof activeCallSession !== 'undefined' && activeCallSession) {
    S.ws?.send(JSON.stringify({
      type: 'call:end',
      chatId: activeCallSession.chatId,
      code: activeCallSession.code || activeRoom.code,
      callId: activeCallSession.callId
    }));
    activeCallSession = null;
  }
  S.ws?.send(JSON.stringify({ type: 'meet:leave' }));
  activeRoom.peers.forEach(p => {
    cleanupTileMedia(p.tile, p);
    try { p.pc.close(); } catch {}
  });
  cleanupTileMedia($('#localTile'));
  activeRoom.rawStream?.getTracks().forEach(t => t.stop());
  activeRoom.stream?.getTracks().forEach(t => t.stop());
  activeRoom = null;
  $('#meetTileExitFsBtn')?.remove();
  window.minimizeMeetingToPip = null;
  window.expandMeetingFromPip = null;
  $('#meetRoom').classList.add('hidden');
  $('#meetRoom').innerHTML = '';
  loadMeetings();
}

window.openPreJoinModal = openPreJoinModal;
window.enterMeetingRoom = enterMeetingRoom;
window.leaveMeetingRoom = leaveMeetingRoom;
window.renderMeetingsView = renderMeetingsView;
window.renderFireCallsView = renderMeetingsView;
window.loadMeetings = loadMeetings;

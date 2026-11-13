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
    return list.slice(0, 30).map(c => {
      const isOutgoing = c.isCaller;
      const isMissed = !isOutgoing && c.status !== 'completed';
      const isAudio = (c.mode || 'audio') === 'audio';
      const peerObj = c.peer || (c.peerId ? S.users?.get(c.peerId) : null) || { name: c.peerName || 'Contact', id: c.peerId };
      const peerIdVal = esc(peerObj.id || c.peerId || c.peer?.id || '');
      const durText = c.duration ? (typeof formatDuration === 'function' ? formatDuration(c.duration) : c.duration + 's') : (isMissed ? 'Missed call' : 'No answer');
      const badgeCls = isMissed ? 'missed' : (isAudio ? 'voice' : 'video');
      const dirLabel = isOutgoing ? 'Outgoing' : (isMissed ? 'Missed' : 'Incoming');

      return `
        <div class="meet-item-row ${isMissed ? 'is-missed-row' : ''}">
          <div class="meet-row-ava-wrap">
            ${avatarHTML(peerObj, 'md')}
            <span class="call-badge-sub ${badgeCls}">
              ${isMissed ? '✕' : (isAudio ? icon('phone') : icon('video'))}
            </span>
          </div>
          <div style="flex:1;min-width:0">
            <div class="row gap-xs align-center" style="flex-wrap:nowrap">
              <strong style="font-size:14px;font-weight:700;color:var(--text-0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(peerObj.name || 'Contact')}</strong>
              ${isMissed
                ? `<span class="pill red xs" style="flex-shrink:0">Missed</span>`
                : `<span class="pill xs" style="flex-shrink:0;background:rgba(255,255,255,0.06);color:var(--text-2)">${isAudio ? 'Voice' : 'Video'}</span>`
              }
            </div>
            <div class="call-meta-line">
              <span class="call-direction ${isOutgoing ? 'outgoing' : (isMissed ? 'missed' : 'incoming')}">
                ${isOutgoing ? '↗' : '↙'} ${dirLabel}
              </span>
              <span class="call-meta-dot">·</span>
              <span class="call-duration">${durText}</span>
              <span class="call-meta-dot">·</span>
              <span class="call-time">${formatCallTime(c.createdAt)}</span>
            </div>
          </div>
          <div class="call-actions-cell">
            <button class="meet-quick-call-btn voice meet-call-back-btn" data-peer-id="${peerIdVal}" data-mode="audio" title="Voice Call">
              ${icon('phone')}
            </button>
            <button class="meet-quick-call-btn video meet-call-back-btn" data-peer-id="${peerIdVal}" data-mode="video" title="Video Call">
              ${icon('video')}
            </button>
            <button class="meet-del-row-btn" data-call-id="${esc(c.id)}" title="Delete call log">${icon('trash')}</button>
          </div>
        </div>`;
    }).join('');
  };

  const renderScheduledRows = () => {
    if (!S.meetings.length) {
      return `
        <div class="no-content-box" style="padding:32px 16px;border-radius:16px">
          <div class="nc-ico" style="width:48px;height:48px;font-size:22px">${icon('video')}</div>
          <h4 style="font-size:15px;margin-top:10px">No Upcoming Meetings</h4>
          <p style="font-size:12px;max-width:240px;margin:4px auto 0">Launch an instant room or enter a code on the left to connect.</p>
        </div>`;
    }
    return S.meetings.map(m => `
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

  root.innerHTML = `
    <div class="calls-bg-ambient" aria-hidden="true">
      <div class="calls-orb calls-orb-1"></div>
      <div class="calls-orb calls-orb-2"></div>
      <div class="calls-orb calls-orb-3"></div>
    </div>
    <div class="meet-hub-wrap">
      <div class="meet-hub-hero">
        <!-- LEFT: CLEAN TITLE, CALL TO ACTION & CODE INPUT -->
        <div class="meet-hub-left">
          <div class="meet-brand-badge">
            ${icon('phone')} <span>ZOVIO CALLS</span>
          </div>
          <h1 class="meet-hub-title">Zovio Calls.<br>Connect with anyone instantly.</h1>
          <p class="meet-hub-desc">
            Direct 1-on-1 audio/video calls, group calls, and room meetings with ultra-low latency WebRTC P2P and Discord-style screensharing.
          </p>

          <div class="meet-hub-actions">
            <button class="btn primary lg glow" id="instantMeetBtn">
              ${icon('video')} <span>Start Instant Call</span>
            </button>
            <button class="btn ghost lg" id="directCallContactBtn" title="Call any contact">
              ${icon('phone')} <span>Call Contact</span>
            </button>
            <button class="btn ghost lg" id="schedMeetBtn">
              ${icon('calendar')} <span>Schedule Call</span>
            </button>
          </div>

          <!-- JOIN BY CODE OR LINK -->
          <div class="meet-join-row">
            <div class="meet-join-input-wrap">
              <span class="meet-join-icon">${icon('keyboard')}</span>
              <input id="joinCodeIn" placeholder="Enter call code or link (e.g. abc-defg-hij)" autocomplete="off" spellcheck="false">
            </div>
            <button class="btn primary" id="joinCodeBtn" disabled>Join Call</button>
          </div>
          <span class="muted xs" style="margin-top:-6px;display:block">Enter a room code or paste an invitation link to connect immediately.</span>
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
              <div class="meet-tab-actions">
                ${activeTab === 'calls' && (S.calls || []).length > 0 ? `
                  <button class="meet-action-btn danger" id="clearCallsBtn" title="Clear all call history">
                    ${icon('trash')} <span>Clear History</span>
                  </button>` : ''}
                <button class="meet-action-btn primary" id="schedQuickBtn" title="Schedule a call">
                  <span>+ Schedule</span>
                </button>
              </div>
            </div>

            <div class="col gap-xs" id="meetTabContent" style="max-height:380px;overflow-y:auto">
              ${activeTab === 'calls' ? renderCallHistoryRows() : renderScheduledRows()}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  hydrateIcons(root);

  $('#tabMeetCalls', root)?.addEventListener('click', () => {
    S.meetTab = 'calls';
    renderMeetingsView();
  });
  $('#tabMeetScheduled', root)?.addEventListener('click', () => {
    S.meetTab = 'scheduled';
    renderMeetingsView();
  });

  $('#directCallContactBtn', root)?.addEventListener('click', () => {
    if (typeof openStartCallModal === 'function') {
      openStartCallModal();
    } else if (typeof openNewCallChooserModal === 'function') {
      openNewCallChooserModal();
    }
  });

  // Wire Call Back buttons in call history
  $$('.meet-call-back-btn', root).forEach(btn => {
    btn.onclick = () => {
      const peerId = btn.dataset.peerId;
      const mode = btn.dataset.mode || 'audio';
      if (typeof directCallUser === 'function' && peerId) {
        directCallUser(peerId, mode);
      }
    };
  });

  // Wire Individual Delete Call Log buttons
  $$('.meet-del-row-btn, .meet-del-call-btn', root).forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const callId = btn.dataset.callId;
      if (!callId) return;
      if (typeof deleteCallHistory === 'function') {
        await deleteCallHistory(callId);
      } else {
        await api(`/api/calls/history/${callId}`, { method: 'DELETE' }).catch(() => {});
        S.calls = (S.calls || []).filter(c => c.id !== callId);
      }
      renderMeetingsView();
    };
  });

  // Wire Clear All Call History with sleek modern confirmation modal
  $('#clearCallsBtn', root)?.addEventListener('click', () => {
    showModal('Clear Call History', `
      <div class="col gap-m items-center" style="text-align:center;padding:12px 6px">
        <div style="width:58px;height:58px;border-radius:18px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.3);display:grid;place-items:center;color:#ef4444;font-size:26px">
          ${icon('trash')}
        </div>
        <div class="col gap-xs">
          <strong style="font-size:17px;font-weight:800;color:var(--text-0)">Clear all call logs?</strong>
          <p class="muted xs" style="max-width:320px;line-height:1.5;margin:0">
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
          toast('Call history cleared');
        } catch (err) {
          toast(err.message || 'Failed to clear call history', 'err');
          btn.disabled = false;
          btn.textContent = 'Clear History';
        }
      };
    }, 'modal-glass-glow');
  });

  $('#instantMeetBtn', root).onclick = async () => {
    const btn = $('#instantMeetBtn', root);
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> <span>Starting…</span>`;
    try {
      const m = await api('/api/meetings', { method: 'POST', body: { title: `${S.user.name}'s Call` } });
      const idx = S.meetings.findIndex(x => x.id === m.id || x.code === m.code);
      if (idx >= 0) {
        S.meetings[idx] = m;
      } else {
        S.meetings.unshift(m);
      }
      renderMeetingsView();
      // Meetings default: mic and video are OFF
      enterMeetingRoom(m, { initialAudio: false, initialVideo: false });
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('video')} <span>Start Instant Call</span>`;
      hydrateIcons(btn);
    }
  };

  $('#schedMeetBtn', root).onclick = openScheduleMeetingModal;
  if ($('#schedQuickBtn', root)) $('#schedQuickBtn', root).onclick = openScheduleMeetingModal;

  const codeIn = $('#joinCodeIn', root);
  const joinBtn = $('#joinCodeBtn', root);

  const doJoin = async () => {
    const rawVal = codeIn.value.trim();
    if (!rawVal) return;
    joinBtn.disabled = true;
    joinBtn.innerHTML = `<span class="spinner" style="width:13px;height:13px;border-width:2px;display:inline-block"></span> Joining…`;
    try {
      const m = await api(`/api/meetings/code/${encodeURIComponent(rawVal)}`);
      if (typeof openPreJoinModal === 'function') {
        openPreJoinModal(m);
      } else {
        enterMeetingRoom(m);
      }
    } catch (e) {
      toast(e.message || 'Unable to join meeting', 'err');
    } finally {
      joinBtn.disabled = !codeIn.value.trim();
      joinBtn.textContent = 'Join Call';
    }
  };

  codeIn.oninput = () => {
    joinBtn.disabled = !codeIn.value.trim();
  };
  codeIn.onkeydown = e => {
    if (e.key === 'Enter' && codeIn.value.trim()) {
      e.preventDefault();
      doJoin();
    }
  };
  joinBtn.onclick = doJoin;

  $$('[data-copy]', root).forEach(b => b.onclick = () => {
    navigator.clipboard?.writeText(b.dataset.copy);
    toast(`Copied code: ${b.dataset.copy}`);
  });
  $$('[data-join]', root).forEach(b => b.onclick = async () => {
    try {
      const m = await api(`/api/meetings/code/${encodeURIComponent(b.dataset.join)}`);
      if (typeof openPreJoinModal === 'function') {
        openPreJoinModal(m);
      } else {
        enterMeetingRoom(m);
      }
    } catch (e) {
      toast(e.message, 'err');
    }
  });
  $$('[data-cancel]', root).forEach(b => b.onclick = async () => {
    await api(`/api/meetings/${b.dataset.cancel}`, { method: 'DELETE' });
    S.meetings = S.meetings.filter(m => m.id !== b.dataset.cancel);
    renderMeetingsView();
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

    toast('Full screen active — Press Esc to exit ⛶');
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

function enablePipDragging(roomEl) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  const onDown = (e) => {
    if (!roomEl.classList.contains('is-pip')) return;
    if (e.target.closest('button, input, select, .dock-btn, .pip-expand-btn, a')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = roomEl.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    roomEl.style.transition = 'none';
    roomEl.style.setProperty('right', 'auto', 'important');
    roomEl.style.setProperty('bottom', 'auto', 'important');
    roomEl.style.setProperty('left', `${initialLeft}px`, 'important');
    roomEl.style.setProperty('top', `${initialTop}px`, 'important');
    try { roomEl.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };

  roomEl.onpointerdown = onDown;

  const onMove = (e) => {
    if (!isDragging || !roomEl.classList.contains('is-pip')) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const pipW = roomEl.offsetWidth || 350;
    const pipH = roomEl.offsetHeight || 220;
    const clampLeft = Math.max(10, Math.min(window.innerWidth - pipW - 10, initialLeft + dx));
    const clampTop = Math.max(10, Math.min(window.innerHeight - pipH - 10, initialTop + dy));
    roomEl.style.setProperty('left', `${clampLeft}px`, 'important');
    roomEl.style.setProperty('top', `${clampTop}px`, 'important');
    roomEl.style.setProperty('right', 'auto', 'important');
    roomEl.style.setProperty('bottom', 'auto', 'important');
  };

  window.addEventListener('pointermove', onMove);

  const onUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    try { if (e && e.pointerId) roomEl.releasePointerCapture(e.pointerId); } catch {}
    roomEl.style.transition = 'box-shadow 0.25s var(--ease-spring)';
  };

  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

async function enterMeetingRoom(m, opts = {}) {
  if (activeRoom) {
    leaveMeetingRoom();
  }
  let rawStream = opts.initialStream || null;
  const isDirect = Boolean(opts.isDirectCall || (m.chatId && S.chats.get(m.chatId)?.type === 'dm'));
  const initialAudio = isDirect ? (opts.initialAudio !== false) : Boolean(opts.initialAudio);
  const initialVideo = Boolean(opts.initialVideo);

  if (!rawStream) {
    try {
      rawStream = await navigator.mediaDevices.getUserMedia({
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
        rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        rawStream = null;
      }
    }
  }

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
    isDirectCall: Boolean(opts.isDirectCall || (m.chatId && S.chats.get(m.chatId)?.type === 'dm')),
    rawStream,
    stream: rawStream,
    screenStream: null,
    peers: new Map(),
    audioOn: initialAudio,
    videoOn: initialVideo && !!rawStream?.getVideoTracks().length,
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

  setupAudioMixPipeline();

  // Keep audio context active so Chromium and OS never throttle WebRTC voice buffers when window is minimized or blurred
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const keepAliveCtx = new AudioCtx();
      const osc = keepAliveCtx.createOscillator();
      const gain = keepAliveCtx.createGain();
      gain.gain.value = 0.0001; // inaudible keep-alive carrier
      osc.connect(gain);
      gain.connect(keepAliveCtx.destination);
      osc.start();
      activeRoom.keepAliveCtx = keepAliveCtx;
    }
  } catch {}

  // Register OS Media Session so Windows MMCSS grants real-time Pro Audio priority
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: m.title || 'Zovio Call',
        artist: 'Zovio Live Audio',
        album: 'Encrypted Voice & Video'
      });
    } catch {}
  }

  const roomEl = $('#meetRoom');
  roomEl.classList.remove('hidden');
  roomEl.innerHTML = `
    <!-- Top Overlay for Picture-in-Picture Mode (Google Meet Style) -->
    <div class="pip-title-pill hidden" id="pipTitlePill">
      <span class="live-dot" style="width:6px;height:6px"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.title)}</span>
    </div>
    <button type="button" class="pip-expand-btn hidden" id="meetPipExpandBtn" title="Expand to Fullscreen">${icon('maximize')}</button>

    <header class="convo-head" style="background:rgba(14,16,26,.95);display:flex;align-items:center;gap:10px">
      <button type="button" class="icon-btn" id="meetPipBtn" title="Minimize call to floating widget / Back to chat" style="margin-right:2px">${icon('back')}</button>
      <div class="row gap-s align-center" style="min-width:0;flex:1">
        <span class="live-dot"></span>
        <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${esc(m.title)}</strong>
        <code class="pill mono" id="roomCodeBadge" style="cursor:pointer" title="Click to copy">${esc(m.code)}</code>
      </div>
      <div class="spacer"></div>
      <span class="e2e-tag">${icon('lock')} DTLS-SRTP P2P</span>
      <button class="btn sm ghost" id="meetExpandBtn" style="display:none;margin-right:4px">${icon('maximize')} Expand</button>
      <button class="btn sm primary" id="headStudioBtn">${icon('sliders')} Settings</button>
    </header>

    <div class="meet-body">
      <div class="meet-stage" id="meetStage">
        <!-- Presentation / Spotlight Slot (Screenshare or Pinned Tile) -->
        <div class="meet-spotlight-slot hidden" id="meetSpotlightSlot"></div>
        <!-- Standard Video Grid Slot -->
        <div class="meet-grid-slot" id="meetGridSlot">
          <div class="video-tile" id="localTile">
            <video id="localVideo" class="mirror ${activeRoom.videoOn ? '' : 'hidden'}" autoplay muted playsinline></video>
            <div id="localNoCam" class="tile-no-cam-hero ${activeRoom.videoOn ? 'hidden' : ''}">
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
        <button type="button" class="meet-react-btn" data-emoji="🤝" title="Handshake">🤝</button>
        <button type="button" class="meet-react-btn" data-emoji="💯" title="100">💯</button>
      </div>
    </div>

    <footer class="meet-dock">
      <button class="dock-btn ${activeRoom.audioOn ? '' : 'off'}" id="dockMic" title="Toggle microphone">${icon('mic')}</button>
      <button class="dock-btn ${activeRoom.videoOn ? '' : 'off'}" id="dockCam" title="Toggle camera">${icon('video')}</button>
      <button class="dock-btn" id="dockScreen" title="Share screen">${icon('screen')}</button>
      <button class="dock-btn" id="dockReact" title="Send reaction"><span style="font-size:18px;line-height:1">😀</span></button>
      <button class="dock-btn" id="dockFullscreen" title="Toggle Fullscreen">${icon('maximize')}</button>
      <button class="dock-btn" id="dockStudio" title="Audio & Video Studio Settings">${icon('sliders')}</button>
      <button class="dock-btn hangup" id="dockLeave" title="Leave Call">${icon('phone')}</button>
    </footer>`;

  hydrateIcons(roomEl);

  const localV = $('#localVideo');
  if (rawStream && localV) {
    setLocalVideoPreview(localV, activeRoom.videoOn ? rawStream : null);
  }
  $('#roomCodeBadge').onclick = () => { navigator.clipboard?.writeText(m.code); toast(`Copied ${m.code}`); };

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

    // Always snap cleanly to the bottom-right corner on pop-up
    roomEl.style.removeProperty('left');
    roomEl.style.removeProperty('top');
    roomEl.style.setProperty('right', '20px', 'important');
    roomEl.style.setProperty('bottom', '20px', 'important');
    pipBtn.style.display = 'none';
    if (expandBtn) expandBtn.style.display = 'inline-flex';
    if (pipExpandBtn) pipExpandBtn.classList.remove('hidden');
    if (pipTitlePill) pipTitlePill.classList.remove('hidden');
  };

  const exitPip = () => {
    roomEl.classList.remove('is-pip');
    const allTiles = Array.from(document.querySelectorAll('.video-tile'));
    allTiles.forEach(t => t.classList.remove('pip-active'));
    roomEl.style.removeProperty('left');
    roomEl.style.removeProperty('top');
    roomEl.style.removeProperty('right');
    roomEl.style.removeProperty('bottom');
    roomEl.style.transition = '';
    pipBtn.style.display = 'inline-flex';
    if (expandBtn) expandBtn.style.display = 'none';
    if (pipExpandBtn) pipExpandBtn.classList.add('hidden');
    if (pipTitlePill) pipTitlePill.classList.add('hidden');
    updateStageLayout();
  };

  if (pipBtn) pipBtn.onclick = enterPip;
  if (expandBtn) expandBtn.onclick = exitPip;
  if (pipExpandBtn) pipExpandBtn.onclick = exitPip;
  enablePipDragging(roomEl);

  // Fullscreen dock button
  $('#dockFullscreen')?.addEventListener('click', () => {
    const spotlightTile = $('#meetSpotlightSlot .video-tile') ||
                          document.querySelector('.video-tile.is-screen') ||
                          document.querySelector('.video-tile[data-pinned="true"]') ||
                          $('#localTile');
    if (spotlightTile) {
      toggleTileFullscreen(spotlightTile);
    }
  });

  // Reaction popover & action
  $('#dockReact')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('#meetReactPopover')?.classList.toggle('hidden');
  });

  $('#meetReactPopover')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.meet-react-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    if (emoji) sendMeetingReaction(emoji);
  });

  const toggleStudio = () => {
    activeRoom.studioOpen = !activeRoom.studioOpen;
    $('#meetStudioDrawer').classList.toggle('hidden', !activeRoom.studioOpen);
    $('#dockStudio').classList.toggle('active', activeRoom.studioOpen);
    if (activeRoom.studioOpen) populateStudioDevices();
  };
  $('#dockStudio').onclick = toggleStudio;
  $('#headStudioBtn').onclick = toggleStudio;
  $('#closeStudioBtn').onclick = toggleStudio;

  bindStudioControls();

  // Microphone toggle
  $('#dockMic').onclick = () => {
    activeRoom.audioOn = !activeRoom.audioOn;
    activeRoom.rawStream?.getAudioTracks().forEach(t => { t.enabled = activeRoom.audioOn; });
    activeRoom.stream?.getAudioTracks().forEach(t => { t.enabled = activeRoom.audioOn; });
    $('#dockMic').classList.toggle('off', !activeRoom.audioOn);
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

  // Screen sharing controls
  const stopScreenShare = async () => {
    cleanupRustScreenCapture();
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
      toast(usedRustEngine ? 'Screen sharing live — Rust 60 FPS + Echo-Free Audio' : 'Screen sharing live — Spotlight presentation active');
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
      <div class="modal-card" style="max-width:580px;width:95vw;padding:24px;border-radius:22px;background:linear-gradient(160deg,#161618 0%,#0a0a0c 100%);border:1px solid rgba(255,255,255,0.13);box-shadow:0 28px 72px rgba(0,0,0,0.9);backdrop-filter:blur(28px);position:relative;animation:popIn .22s var(--ease-spring)">
        <div class="row between align-center" style="margin-bottom:14px">
          <div class="row gap-s align-center">
            <span style="font-size:24px">🖥️</span>
            <div>
              <h3 style="font-size:17px;font-weight:800;color:#fff;margin:0">Share Your Screen</h3>
              <p class="muted xs" style="margin:2px 0 0 0">Select an application or entire display to stream</p>
            </div>
          </div>
          <button type="button" class="icon-btn" id="closeDiscordScreenModalBtn">${icon('close')}</button>
        </div>

        <div class="row gap-s" style="margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px">
          <button type="button" class="btn sm ${activeTab === 'window' ? 'primary' : 'ghost'} sc-tab-btn" data-tab="window" style="flex:1">Applications (${windowSources.length})</button>
          <button type="button" class="btn sm ${activeTab === 'screen' ? 'primary' : 'ghost'} sc-tab-btn" data-tab="screen" style="flex:1">Screens (${screenSources.length})</button>
        </div>

        <div id="discordSourcesGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:240px;overflow-y:auto;margin-bottom:16px;padding-right:4px">
          ${renderSourcesGrid()}
        </div>

        <div class="row between align-center" style="margin-bottom:14px">
          <div class="row gap-xs align-center">
            <span class="muted xs" style="font-weight:700">Quality:</span>
            <button type="button" class="chip active sc-fps-opt" data-fps="30" data-res="720">720p 30fps</button>
            <button type="button" class="chip sc-fps-opt" data-fps="60" data-res="1080">1080p 60fps ⚡</button>
          </div>
          <label class="row gap-xs align-center" style="cursor:pointer;font-size:12px;font-weight:600" title="Enable only when sharing video/music; capturing desktop audio on speakers can echo call voices">
            <input type="checkbox" id="discordScAudio" style="width:auto">
            <span>Share System Audio</span>
          </label>
        </div>

        <div class="row gap-s">
          <button type="button" class="btn ghost sm" id="cancelDiscordScreenBtn" style="flex:1">Cancel</button>
          <button type="button" class="btn primary sm" id="confirmDiscordScreenBtn" style="flex:2;font-weight:800">Go Live</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');

    const closeModal = () => {
      modal.classList.add('hidden');
      document.removeEventListener('keydown', onEsc);
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

    const closeScreenModal = () => modal.classList.add('hidden');
    modal.querySelector('#closeDiscordScreenModalBtn').onclick = closeScreenModal;
    modal.querySelector('#cancelDiscordScreenBtn').onclick = closeScreenModal;

    modal.querySelector('#confirmDiscordScreenBtn').onclick = async () => {
      const shareAudio = modal.querySelector('#discordScAudio').checked;
      closeScreenModal();
      await executeScreenCapture('monitor', chosenFps, chosenRes, shareAudio, chosenSourceId);
    };
  };

  const startScreenShare = async () => {
    if (window.fireuppNative?.getScreenSources) {
      await openDiscordScreenShareModal();
    } else {
      await executeScreenCapture('monitor', 30, 720, true);
    }
  };

  $('#dockScreen').onclick = () => {
    if (activeRoom.screenStream) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  $('#dockLeave').onclick = leaveMeetingRoom;

  startRoomMediaRelay();

  S.ws?.send(JSON.stringify({ type: 'meet:join', code: m.code, state: { audio: activeRoom.audioOn, video: activeRoom.videoOn } }));
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
          params.encodings[0].maxBitrate = 96000;
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

    const baseFps = isScreen ? Math.min(60, targetFps || 30) : 15;
    // Steady interval with headroom (82%) so 33.3ms/16.6ms WGC frames are never skipped by timer jitter
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
    }, 'image/webp', isScreen ? 0.68 : 0.50);
  };

  const scheduleNextRelayTick = () => {
    if (!activeRoom) return;
    const isSharingScreen = Boolean(activeRoom.screenStream);
    const fps = isSharingScreen ? Math.min(60, activeRoom.screenTargetFps || 30) : 12;
    const vsock = getVideoSocket();
    const congested = !vsock || vsock.bufferedAmount > 131072 || (activeRoom._relayEncoder?.encodeQueueSize > 2);
    const baseDelay = isSharingScreen ? Math.max(16, Math.floor(1000 / fps)) : 120;
    const delay = congested ? Math.min(180, baseDelay * 2) : baseDelay;
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

      const targetW = isSharingScreen ? 960 : 320;
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
    activeRoom.rxAudioCtx = new AudioCtx({ latencyHint: 'interactive' });
    if (activeRoom.speakerDeviceId && typeof activeRoom.rxAudioCtx.setSinkId === 'function') {
      activeRoom.rxAudioCtx.setSinkId(activeRoom.speakerDeviceId).catch(() => {});
    }
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
  const ctx = activeRoom.rxAudioCtx;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const len = rawSamples.length;
  const buf = ctx.createBuffer(1, len, sampleRate);
  const ch = buf.getChannelData(0);
  ch.set(rawSamples);

  if (!entry._scheduledSources) entry._scheduledSources = new Set();
  const nowTime = ctx.currentTime;

  const maxAudioLead = entry.state?.screen ? 0.38 : 0.85;
  // Clear queued audio cleanly if stale so audio stays locked with live screen/voice
  if (entry._nextAudioTime && (entry._nextAudioTime - nowTime) > maxAudioLead) {
    stopRelayAudioForPeer(entry);
  }

  const targetAudioJitter = entry.state?.screen ? 0.085 : 0.065;
  const isNewTalkspurt = !entry._nextAudioTime || (nowTime - entry._nextAudioTime) > 0.22;
  if (isNewTalkspurt) {
    entry._nextAudioTime = nowTime + targetAudioJitter;
    const fadeLen = Math.min(32, len);
    for (let i = 0; i < fadeLen; i++) ch[i] *= (i / fadeLen);
  } else if (entry._nextAudioTime < nowTime) {
    entry._nextAudioTime = nowTime + 0.004;
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
    const ctx = new AudioCtx({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Keep capture AudioContext hardware clock unthrottled when minimized
    try {
      const keepOsc = ctx.createOscillator();
      const keepGain = ctx.createGain();
      keepOsc.frequency.value = 20000;
      keepGain.gain.value = 0.00002;
      keepOsc.connect(keepGain);
      keepGain.connect(ctx.destination);
      keepOsc.start();
    } catch {}

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

          if (peak >= 0.0025) {
            hangoverFrames = 18;
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
                this.buf = new Float32Array(1024);
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
                  const take = Math.min(1024 - this.pos, ch.length - offset);
                  this.buf.set(ch.subarray(offset, offset + take), this.pos);
                  this.pos += take;
                  offset += take;
                  if (this.pos >= 1024) {
                    const ratio = sampleRate / 24000;
                    const outLen = Math.floor(1024 / ratio);
                    let peak = 0;
                    const pkt = new Uint8Array(3 + outLen * 2);
                    pkt[0] = 0x5A; pkt[1] = 4; pkt[2] = 0;
                    for (let i = 0; i < outLen; i++) {
                      const s = Math.floor(i * ratio);
                      const e = Math.min(1024, Math.floor((i + 1) * ratio));
                      let sum = 0, c = 0;
                      for (let j = s; j < e; j++) { sum += this.buf[j]; c++; }
                      const val = Math.max(-1, Math.min(1, c > 0 ? sum / c : (this.buf[s] || 0)));
                      const a = val < 0 ? -val : val;
                      if (a > peak) peak = a;
                      const s16 = (val < 0 ? val * 0x8000 : val * 0x7FFF) | 0;
                      pkt[3 + i * 2] = s16 & 0xff;
                      pkt[3 + i * 2 + 1] = (s16 >> 8) & 0xff;
                    }
                    if (peak >= 0.0025) this.hangover = 30;
                    else if (this.hangover > 0) this.hangover--;
                    if (peak >= 0.0025 || this.hangover > 0) {
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
      if (!activeRoom?.studioOpen) return;
      const fill = $('#micMeterFill');
      if (!fill || !activeRoom?.audioOn) {
        if (fill) fill.style.width = '0%';
        return;
      }
      analyser.getByteFrequencyData(dataArr);
      const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
      fill.style.width = `${Math.min(100, Math.round((avg / 140) * 100))}%`;
    }, 120);
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
      toast('Switched microphone');
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
    toast('Switched audio output: ' + (e.target.options[e.target.selectedIndex]?.text || 'selected device'));
  };

  $('#selVideoIn').onchange = async e => {
    const deviceId = e.target.value;
    if (!deviceId || !activeRoom) return;
    activeRoom.videoDeviceId = deviceId;
    // Guard: If camera is currently OFF, do NOT activate webcam hardware
    if (!activeRoom.videoOn) {
      toast('Camera preference saved');
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
      toast('Switched camera device');
    } catch (err) {
      toast('Could not switch camera: ' + err.message, 'err');
    }
  };

  $('#testSpeakerBtn')?.addEventListener('click', () => {
    SoundFX?.play('join');
    toast('🔊 Playing test audio tone');
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
    await entry.pc.setLocalDescription(offer);
    optimizePeerAudio(entry.pc);
    S.ws?.send(JSON.stringify({ type: 'meet:signal', to: connId, data: { desc: entry.pc.localDescription } }));
  } catch (err) {
    console.warn('Renegotiate peer error:', err);
  } finally {
    entry.makingOffer = false;
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

      // Update avatar halo and name badges if info arrived after initial connection
      const peerUser = (existing.userId && S.users?.get(existing.userId)) || {
        id: existing.userId,
        name: existing.name,
        username: existing.name,
        avatar: existing.avatar,
        avatarColor: existing.avatarColor || '#7c5cff'
      };
      const halo = existing.tile?.querySelector('.tile-avatar-halo');
      if (halo) halo.innerHTML = avatarHTML(peerUser, 'xl');
      const heroName = existing.tile?.querySelector('.tile-hero-name');
      if (heroName) heroName.textContent = peerUser.name || existing.name;
      const badgeName = existing.tile?.querySelector('.tile-user-name');
      if (badgeName) badgeName.textContent = peerUser.name || existing.name;

      // Proactively fetch full profile if avatar is still missing
      if (existing.userId && (!peerUser.avatar || !peerUser.name || peerUser.name === 'Participant')) {
        api('/api/users/lookup', { method: 'POST', body: { ids: [existing.userId] } }).then(list => {
          if (list && list[0]) {
            const fullU = list[0];
            S.users.set(fullU.id, fullU);
            if (halo) halo.innerHTML = avatarHTML(fullU, 'xl');
            if (badgeName) badgeName.textContent = fullU.name;
          }
        }).catch(() => {});
      }

      // Synchronize video element and no-cam hero visibility
      const hasActiveVideo = Boolean(existing.state?.video || existing.state?.screen);
      const v = existing.tile?.querySelector('video');
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
        <div class="tile-net-badge checking" title="Checking WebRTC transport…">
          <span class="tile-net-dot"></span>
          <span class="tile-net-text">Connecting</span>
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

  const netBadge = tile.querySelector('.tile-net-badge');
  const netText = tile.querySelector('.tile-net-text');
  const setNetBadge = (mode, label, title) => {
    if (!netBadge || !netText) return;
    netBadge.classList.remove('checking', 'is-p2p', 'is-relay', 'is-turn');
    netBadge.classList.add(mode);
    netText.textContent = label;
    if (title) netBadge.title = title;
  };

  // Poll WebRTC inbound-rtp audio bytesReceived so we only switch from WebSocket relay to WebRTC <audio> when UDP packets actually arrive
  entry._statsTimer = setInterval(async () => {
    if (!activeRoom || !entry.pc || entry.pc.connectionState === 'closed') {
      clearInterval(entry._statsTimer);
      return;
    }
    const iceSt = entry.pc.iceConnectionState;
    if (iceSt !== 'connected' && iceSt !== 'completed') {
      entry._rtcFailCount = (entry._rtcFailCount || 0) + 1;
      setNetBadge('is-relay', 'Server Relay', 'Direct P2P UDP not connected — falling back to Railway WebSocket relay');
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
      let activePair = null;
      const localCands = new Map();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && (report.kind === 'audio' || report.mediaType === 'audio')) {
          audioBytes += (report.bytesReceived || 0);
        } else if (report.type === 'local-candidate') {
          localCands.set(report.id, report);
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.nominated || report.selected || !activePair) {
            activePair = report;
          }
        }
      });
      if (activePair) {
        const lc = localCands.get(activePair.localCandidateId);
        const cType = lc?.candidateType || 'p2p';
        const rttMs = typeof activePair.currentRoundTripTime === 'number' ? Math.round(activePair.currentRoundTripTime * 1000) : null;
        const rttStr = rttMs !== null ? ` · ${rttMs}ms` : '';
        if (cType === 'relay') {
          setNetBadge('is-turn', `TURN Relay${rttStr}`, 'Connected via WebRTC TURN relay');
        } else {
          setNetBadge('is-p2p', `P2P Direct${rttStr}`, `Direct peer-to-peer WebRTC (${cType.toUpperCase()} / ${(lc?.protocol || 'udp').toUpperCase()})`);
        }
      } else {
        setNetBadge('is-p2p', 'P2P Direct', 'Direct peer-to-peer WebRTC');
      }
      const prevBytes = entry._lastRtcAudioBytes || 0;
      entry._lastRtcAudioBytes = audioBytes;
      if (audioBytes > 2048 && audioBytes > prevBytes) {
        if (!entry.rtcAudioVerified) {
          entry.rtcAudioVerified = true;
          syncAudioPathExclusivity();
        }
      }
    } catch {}
  }, 700);

  pc.ontrack = e => {
    if (e.track.kind === 'audio') {
      entry.rtcAudioActive = true;
      if (e.receiver && 'playoutDelayHint' in e.receiver) {
        try { e.receiver.playoutDelayHint = 0.04; } catch {}
      }
      // Isolate ONLY the audio track on <audio> so no video/duplicate stream is attached
      audioEl.srcObject = new MediaStream([e.track]);
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
        const trackLive = Boolean(e.track && e.track.readyState === 'live' && !e.track.muted);
        const isVideoAllowed = Boolean(trackLive || entry.state?.video || entry.state?.screen);
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
  return entry;
}

function sendMeetingReaction(emoji) {
  if (!activeRoom) return;
  SoundFX?.play?.('react');
  // Immediately show reaction locally on sender's own tile
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
  if (!tile) tile = $('#localTile') || $('#meetStage');
  if (!tile) return;

  // 1. Spawn floating emoji particles
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      if (!activeRoom || !tile) return;
      const particle = document.createElement('div');
      particle.className = 'meet-flying-emoji';
      particle.textContent = emoji;
      const offsetX = (Math.random() - 0.5) * 80;
      particle.style.left = `calc(50% + ${offsetX}px)`;
      particle.style.bottom = `45px`;
      particle.style.fontSize = `${26 + Math.floor(Math.random() * 16)}px`;
      particle.style.animationDuration = `${1.3 + Math.random() * 0.5}s`;
      tile.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove());
      setTimeout(() => particle.remove(), 2000);
    }, i * 90);
  }

  // 2. Tile reaction badge
  let pill = tile.querySelector('.tile-reaction-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.className = 'tile-reaction-pill';
    tile.appendChild(pill);
  }
  pill.innerHTML = `<span class="pill-emoji">${emoji}</span> <span class="pill-name">${esc(name || '')}</span>`;
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
        await entry.pc.setLocalDescription(offer);
        optimizePeerAudio(entry.pc);
        S.ws?.send(JSON.stringify({ type: 'meet:signal', to: p.connId, data: { desc: entry.pc.localDescription } }));
      } catch (err) {
        console.warn('Initial offer error:', err);
      } finally {
        entry.makingOffer = false;
      }
    }
  } else if (msg.type === 'meet:peer') {
    ensurePeer(msg.connId, msg.name, true, msg.userId, msg.avatar, msg.avatarColor, msg.state);
    activeRoom._forceRelayKeyframe = true;
    toast(`${msg.name} joined the call`);
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
        await entry.pc.setLocalDescription(ans);
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
        relayImg.src = msg.frame;
        relayImg.style.objectFit = isScreen ? 'contain' : 'cover';
        relayImg.classList.toggle('hidden', Boolean(rtcVideoPlaying));
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
      entry.state = msg.state || {};
      if (msg.state?.audio === false) {
        stopRelayAudioForPeer(entry);
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
        micIcon.className = `tile-mic-icon ${msg.state?.audio === false ? 'off' : 'on'}`;
        micIcon.innerHTML = msg.state?.audio === false ? icon('micOff') : icon('mic');
      }

      tile?.classList.toggle('is-screen', isScreen);
      tile?.querySelector('.tile-screen-badge')?.classList.toggle('hidden', !isScreen);
      if (!isVideo) {
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
        if (!v.srcObject || !v.srcObject.getVideoTracks().length) {
          const remoteVidTrack = entry.pc.getReceivers?.().find(r => r.track?.kind === 'video')?.track;
          if (remoteVidTrack) {
            v.srcObject = new MediaStream([remoteVidTrack]);
          }
        }
        v.classList.toggle('hidden', !isVideo);
        if (isVideo) {
          noCam?.classList.add('hidden');
          v.play().catch(() => {});
          if (v.videoWidth > 0 && relayImg) {
            relayImg.classList.add('hidden');
          }
        } else {
          noCam?.classList.remove('hidden');
        }
        if (isScreen) {
          v.classList.add('screen-share');
          v.classList.remove('mirror', 'hidden');
          v.style.objectFit = 'contain';
          if (noCam) noCam.classList.add('hidden');
          v.play().catch(() => {});
          toast(`${entry.name || 'Participant'} is sharing their screen 🖥️`);
        } else {
          v.classList.remove('screen-share');
          v.style.objectFit = 'cover';
          v.classList.toggle('hidden', !isVideo);
          if (noCam) noCam.classList.toggle('hidden', isVideo);
          if (isVideo) v.play().catch(() => {});
        }
      }
      const audioEl = tile?.querySelector('audio');
      if (audioEl) {
        if (!audioEl.srcObject || !audioEl.srcObject.getAudioTracks().length) {
          const remoteAudioTrack = entry.pc.getReceivers?.().find(r => r.track?.kind === 'audio')?.track;
          if (remoteAudioTrack) {
            audioEl.srcObject = new MediaStream([remoteAudioTrack]);
          }
        }
        const rtcLive = isPeerRtcAudioLive(entry);
        audioEl.muted = !rtcLive;
        if (rtcLive) {
          audioEl.volume = 1.0;
          audioEl.play().catch(() => {});
        }
      }
      updateStageLayout();
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
      toast('Call ended');
      SoundFX?.play?.('leave');
      leaveMeetingRoom();
      return;
    }
    toast(`${entry?.name || 'Participant'} left`);
  }
}

function leaveMeetingRoom() {
  if (!activeRoom) return;
  clearInterval(activeRoom.meterTimer);
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

/* ==========================================================================
   Tele — FireMeet Hub & Peer-to-Peer WebRTC Video Room with Audio/Video Studio
   ========================================================================== */

let activeRoom = null;

async function loadMeetings() {
  S.meetings = await api('/api/meetings').catch(() => []);
  if (S.view === 'meetings') renderMeetingsView();
}

function renderMeetingsView() {
  const root = $('#view-meetings');
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

  root.innerHTML = `
    <div class="meet-hub-wrap">
      <div class="meet-hub-hero">
        <!-- LEFT: CLEAN TITLE, CALL TO ACTION & CODE INPUT -->
        <div class="meet-hub-left">
          <div class="meet-brand-badge">
            ${icon('video')} <span>FIREMEET STUDIO</span>
          </div>
          <h1 class="meet-hub-title">Video meetings.<br>Now free for everyone.</h1>
          <p class="meet-hub-desc">
            Connect and collaborate with ultra-low latency WebRTC P2P video, live mic DSP enhancement, AI noise cancellation, and screen sharing.
          </p>

          <div class="meet-hub-actions">
            <button class="btn primary lg glow" id="instantMeetBtn">
              ${icon('video')} <span>Start Instant FireMeet</span>
            </button>
            <button class="btn ghost lg" id="schedMeetBtn">
              ${icon('calendar')} <span>Schedule</span>
            </button>
            <button class="btn ghost lg" id="viewCallsHistoryBtn" title="View all call history">
              ${icon('phone')} <span>FireCalls History</span>
            </button>
          </div>

          <!-- JOIN BY CODE OR LINK -->
          <div class="meet-join-row">
            <div class="meet-join-input-wrap">
              <span class="meet-join-icon">${icon('keyboard')}</span>
              <input id="joinCodeIn" placeholder="Enter meeting code or link (e.g. abc-defg-hij)" autocomplete="off" spellcheck="false">
            </div>
            <button class="btn primary" id="joinCodeBtn" disabled>Join</button>
          </div>
          <span class="muted xs" style="margin-top:-6px;display:block">Enter a room code or paste an invitation link to connect immediately.</span>
        </div>

        <!-- RIGHT: SCHEDULED & ACTIVE MEETINGS CARD -->
        <div class="meet-hub-right">
          <div class="meet-quick-card glass-panel">
            <div class="row between align-center" style="margin-bottom:14px">
              <div class="row gap-xs align-center">
                <strong style="font-size:15px">Scheduled &amp; Active</strong>
                <span class="pill xs" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text-1)">${S.meetings.length}</span>
              </div>
              <button class="btn ghost sm" id="schedQuickBtn" style="padding:4px 10px;font-size:11.5px">+ Schedule</button>
            </div>

            <div class="col gap-xs" style="max-height:360px;overflow-y:auto">
              ${S.meetings.length ? S.meetings.map(m => `
                <div class="meet-item-row">
                  <div class="ava sm" style="background:var(--brand);flex-shrink:0">${icon('video')}</div>
                  <div style="flex:1;min-width:0">
                    <div class="row gap-xs align-center wrap">
                      <strong style="font-size:13.5px;color:var(--text-0)">${esc(m.title)}</strong>
                      ${m.live ? `<span class="pill green xs">● ${m.live} live</span>` : ''}
                    </div>
                    <div class="row gap-xs align-center" style="margin-top:2px">
                      <code class="mono xs" style="color:var(--brand);font-weight:700">${esc(m.code)}</code>
                      <span class="muted xs">·</span>
                      <small class="muted xs">${m.scheduledAt ? new Date(m.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Instant room'}</small>
                    </div>
                  </div>
                  <div class="row gap-xs flex-shrink-0">
                    <button class="icon-btn" data-copy="${esc(m.code)}" title="Copy code">${icon('copy')}</button>
                    <button class="btn primary sm" data-join="${esc(m.code)}" style="padding:5px 12px;font-size:12px">Join</button>
                    ${m.hostId === S.user.id ? `<button class="icon-btn" data-cancel="${m.id}" title="Delete meeting">${icon('trash')}</button>` : ''}
                  </div>
                </div>
              `).join('') : `
                <div class="no-content-box" style="padding:32px 16px;border-radius:16px">
                  <div class="nc-ico" style="width:48px;height:48px;font-size:22px">${icon('video')}</div>
                  <h4 style="font-size:15px;margin-top:10px">No Upcoming Meetings</h4>
                  <p style="font-size:12px;max-width:240px;margin:4px auto 0">Launch an instant room or enter a code on the left to join teammates.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  hydrateIcons(root);

  if ($('#viewCallsHistoryBtn', root)) {
    $('#viewCallsHistoryBtn', root).onclick = () => {
      if (typeof switchView === 'function') switchView('calls');
    };
  }

  $('#instantMeetBtn', root).onclick = async () => {
    const btn = $('#instantMeetBtn', root);
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block"></span> <span>Starting…</span>`;
    try {
      const m = await api('/api/meetings', { method: 'POST', body: { title: `${S.user.name}'s FireMeet` } });
      const idx = S.meetings.findIndex(x => x.id === m.id || x.code === m.code);
      if (idx >= 0) {
        S.meetings[idx] = m;
      } else {
        S.meetings.unshift(m);
      }
      renderMeetingsView();
      if (typeof openPreJoinModal === 'function') {
        openPreJoinModal(m);
      } else {
        enterMeetingRoom(m);
      }
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('video')} <span>Start Instant FireMeet</span>`;
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
      joinBtn.textContent = 'Join';
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
    toast('Meeting cancelled');
  });
}

async function openScheduleMeetingModal() {
  const users = await api('/api/users').catch(() => []);
  const def = new Date(Date.now() + 3600e3);
  def.setMinutes(0, 0, 0);
  const isoLocal = new Date(def.getTime() - def.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  showModal('📅 Schedule a FireMeet', `
    <label class="col gap-xs"><span class="muted">Meeting title</span><input id="mTitle" placeholder="Weekly Design & Product Sync"></label>
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
    <button class="btn primary lg" id="createSchedBtn">Schedule FireMeet</button>
  `, box => {
    $('#createSchedBtn', box).onclick = async () => {
      const title = $('#mTitle', box).value.trim() || `${S.user.name}'s FireMeet`;
      const scheduledAt = new Date($('#mWhen', box).value).getTime();
      const duration = +$('#mDur', box).value;
      const invitees = $$('input:checked', box).map(i => i.value);
      const m = await api('/api/meetings', { method: 'POST', body: { title, scheduledAt, duration, invitees } });
      if (!S.meetings.some(x => x.id === m.id)) S.meetings.push(m);
      closeModal();
      renderMeetingsView();
      toast(`FireMeet scheduled · code ${m.code}`);
    };
  });
}

// ==========================================================================
// Pre-Meeting Green Room (Preview & Toggle Mic/Camera Before Joining)
// ==========================================================================
async function openPreJoinModal(m) {
  let previewStream = null;
  let micEnabled = true;
  let camEnabled = true;

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

  showModal('Ready to Join FireMeet?', `
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
          <h3 style="margin:0 0 6px;font-size:18px;font-weight:800">${esc(m.title)}</h3>
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

    // Toggle Cam
    camBtn.onclick = async () => {
      camEnabled = !camEnabled;
      if (camEnabled && (!previewStream || !previewStream.getVideoTracks().length)) {
        try {
          const newVid = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = newVid.getVideoTracks()[0];
          if (newTrack) {
            if (!previewStream) previewStream = new MediaStream();
            previewStream.addTrack(newTrack);
          }
        } catch {
          camEnabled = false;
          toast('Camera unavailable', 'err');
        }
      }
      previewStream?.getVideoTracks().forEach(t => { t.enabled = camEnabled; });
      camBtn.classList.toggle('off', !camEnabled);
      camBtn.innerHTML = icon(camEnabled ? 'video' : 'videoOff');
      hydrateIcons(camBtn);

      if (camEnabled) {
        videoEl.classList.remove('hidden');
        noCamEl.classList.add('hidden');
        if (videoEl.srcObject !== previewStream) videoEl.srcObject = previewStream;
        videoEl.play().catch(() => {});
      } else {
        videoEl.classList.add('hidden');
        noCamEl.classList.remove('hidden');
      }
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
  });
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
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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

  if (screenTile) {
    stage.classList.add('has-screen-share');
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
    spotlightSlot.classList.add('hidden');
    filmstripSlot.classList.add('hidden');
    gridSlot.classList.remove('hidden');

    gridSlot.dataset.count = allTiles.length;
    allTiles.forEach(t => {
      if (t.parentElement !== gridSlot) {
        gridSlot.appendChild(t);
      }
    });
  }
}

function enablePipDragging(roomEl) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;

  roomEl.onmousedown = (e) => {
    if (!roomEl.classList.contains('is-pip')) return;
    if (e.target.closest('button, input, select, .dock-btn, .pip-expand-btn')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = roomEl.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    roomEl.style.transition = 'none';
    e.preventDefault();
  };

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !roomEl.classList.contains('is-pip')) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    roomEl.style.left = `${Math.max(10, Math.min(window.innerWidth - 355, initialLeft + dx))}px`;
    roomEl.style.top = `${Math.max(10, Math.min(window.innerHeight - 230, initialTop + dy))}px`;
    roomEl.style.right = 'auto';
    roomEl.style.bottom = 'auto';
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    roomEl.style.transition = 'box-shadow 0.25s var(--ease-spring), transform 0.25s var(--ease-spring)';
  });
}

async function enterMeetingRoom(m, opts = {}) {
  if (activeRoom) {
    leaveMeetingRoom();
  }
  let rawStream = opts.initialStream || null;
  const initialAudio = opts.initialAudio !== false;
  const initialVideo = opts.initialVideo !== false;

  if (!rawStream) {
    try {
      rawStream = await navigator.mediaDevices.getUserMedia({
        video: initialVideo ? (opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : true) : false,
        audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
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
    rawStream.getAudioTracks().forEach(t => { t.enabled = initialAudio; });
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
              <div class="tile-screen-badge hidden" id="localScreenBadge">
                ${icon('screen')} <span>Presenting Screen</span>
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
        <div class="row between">
          <strong style="font-size:15px">🎚️ FireMeet Studio Settings</strong>
          <button class="icon-btn" id="closeStudioBtn" style="color:#fff">${icon('close')}</button>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05)">
          <strong style="font-size:13px">🔌 Change Audio & Video Devices</strong>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Microphone (Audio Input)</span>
            <select id="selAudioIn"></select>
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Speaker / Headphones (Audio Output)</span>
            <select id="selAudioOut"></select>
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Camera (Video Input)</span>
            <select id="selVideoIn"></select>
          </label>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05)">
          <div class="row between">
            <strong style="font-size:13px">🎙️ Audio Mix & Voice DSP</strong>
            <span class="pill green" id="gainValLabel">100%</span>
          </div>
          <div>
            <div class="muted" style="font-size:11px;margin-bottom:4px">Live Microphone Level</div>
            <div class="meter-bar"><div class="meter-fill" id="micMeterFill"></div></div>
          </div>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Mic Input Gain / Boost</span>
            <input type="range" id="mixGainSlider" min="0" max="250" value="100">
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Voice Tone / EQ Preset</span>
            <select id="mixEqSelect">
              <option value="natural">Studio Natural (Flat)</option>
              <option value="podcast">Warm Podcast (Bass Boost)</option>
              <option value="crisp">Crisp Clarity (Treble Presence)</option>
              <option value="broadcast">Radio Broadcast (Low-Cut)</option>
            </select>
          </label>
          <label class="row between" style="cursor:pointer;font-size:12.5px"><span>AI Noise Suppression</span><input type="checkbox" id="mixNoise" style="width:auto" checked></label>
          <label class="row between" style="cursor:pointer;font-size:12.5px"><span>Echo Cancellation</span><input type="checkbox" id="mixEcho" style="width:auto" checked></label>
          <label class="row between" style="cursor:pointer;font-size:12.5px"><span>Auto Gain Control</span><input type="checkbox" id="mixAgc" style="width:auto" checked></label>
        </div>

        <div class="info-card" style="background:rgba(255,255,255,0.05)">
          <div class="row between">
            <strong style="font-size:13px">✨ Video Enhancement</strong>
            <button type="button" class="btn sm ghost" id="resetVideoFxBtn" style="padding:3px 8px;font-size:11px">Reset</button>
          </div>
          <div class="row gap-xs wrap" id="vfxPresets">
            ${[['natural', 'Natural'], ['warm', 'Warm Glow'], ['cinema', 'Cinema'], ['cool', 'Cool Crisp'], ['bw', 'Noir B&W']].map(([k, lbl]) =>
              `<button type="button" class="chip ${k === 'natural' ? 'active' : ''}" data-vfx="${k}" style="font-size:11px;padding:4px 9px">${lbl}</button>`
            ).join('')}
          </div>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Brightness (<span id="lblBright">100</span>%)</span>
            <input type="range" id="fxBright" min="50" max="160" value="100">
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Contrast (<span id="lblContrast">100</span>%)</span>
            <input type="range" id="fxContrast" min="50" max="160" value="100">
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Saturation (<span id="lblSat">100</span>%)</span>
            <input type="range" id="fxSat" min="0" max="200" value="100">
          </label>
          <label class="col gap-xs"><span class="muted" style="font-size:11.5px">Warmth (<span id="lblWarm">0</span>%)</span>
            <input type="range" id="fxWarm" min="0" max="80" value="0">
          </label>
          <label class="row between" style="cursor:pointer;font-size:12.5px"><span>Mirror My Video</span><input type="checkbox" id="fxMirror" style="width:auto" checked></label>
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
    localV.srcObject = rawStream;
    localV.play().catch(() => {});
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
    pipBtn.style.display = 'none';
    if (expandBtn) expandBtn.style.display = 'inline-flex';
    if (pipExpandBtn) pipExpandBtn.classList.remove('hidden');
    if (pipTitlePill) pipTitlePill.classList.remove('hidden');
    toast('Call minimized to floating widget — All chats are accessible 💬');
  };

  const exitPip = () => {
    roomEl.classList.remove('is-pip');
    roomEl.style.left = '';
    roomEl.style.top = '';
    roomEl.style.right = '';
    roomEl.style.bottom = '';
    pipBtn.style.display = 'inline-flex';
    if (expandBtn) expandBtn.style.display = 'none';
    if (pipExpandBtn) pipExpandBtn.classList.add('hidden');
    if (pipTitlePill) pipTitlePill.classList.add('hidden');
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

  // Camera toggle
  $('#dockCam').onclick = async () => {
    activeRoom.videoOn = !activeRoom.videoOn;
    if (activeRoom.videoOn && (!activeRoom.rawStream || !activeRoom.rawStream.getVideoTracks().length)) {
      try {
        const newVid = await navigator.mediaDevices.getUserMedia({
          video: activeRoom.videoDeviceId ? { deviceId: { exact: activeRoom.videoDeviceId } } : true
        });
        const newTrack = newVid.getVideoTracks()[0];
        if (newTrack) {
          if (!activeRoom.rawStream) activeRoom.rawStream = new MediaStream();
          activeRoom.rawStream.addTrack(newTrack);
          activeRoom.stream?.addTrack(newTrack);
          if (localV) {
            localV.srcObject = activeRoom.rawStream;
            localV.play().catch(() => {});
          }
          activeRoom.peers.forEach(async (entry, connId) => {
            const sender = entry.pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack).catch(() => {});
            } else {
              entry.pc.addTrack(newTrack, activeRoom.stream || activeRoom.rawStream);
              await renegotiatePeer(connId, entry);
            }
          });
        }
      } catch (err) {
        activeRoom.videoOn = false;
        toast('Camera unavailable: ' + err.message, 'err');
      }
    } else {
      activeRoom.rawStream?.getVideoTracks().forEach(t => { t.enabled = activeRoom.videoOn; });
    }

    $('#dockCam').classList.toggle('off', !activeRoom.videoOn);
    if (localV) localV.classList.toggle('hidden', !activeRoom.videoOn);
    $('#localNoCam')?.classList.toggle('hidden', activeRoom.videoOn);
    S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: !!activeRoom.screenStream } }));
  };

  // Screen sharing controls
  const stopScreenShare = async () => {
    if (!activeRoom || !activeRoom.screenStream) return;
    try {
      activeRoom.screenStream.getTracks().forEach(t => t.stop());
    } catch {}
    activeRoom.screenStream = null;

    const camTrack = activeRoom.videoOn ? (activeRoom.rawStream?.getVideoTracks()[0] || null) : null;
    const tile = $('#localTile');
    if (tile) tile.classList.remove('is-screen');
    if (localV) {
      localV.srcObject = activeRoom.rawStream;
      localV.classList.remove('screen-share');
      if (activeRoom.videoFx?.mirror) localV.classList.add('mirror');
      localV.style.objectFit = 'cover';
      localV.classList.toggle('hidden', !activeRoom.videoOn);
    }
    $('#localNoCam')?.classList.toggle('hidden', activeRoom.videoOn);
    $('#dockScreen')?.classList.remove('active');
    updateStageLayout();

    activeRoom.peers.forEach(async (entry) => {
      const sender = entry.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(camTrack).catch(() => {});
      }
    });

    S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: false } }));
    toast('Screen sharing stopped');
  };

  const executeScreenCapture = async (displaySurface, targetFps, targetRes, shareAudio, sourceId = null) => {
    try {
      const width = targetRes === 1080 ? 1920 : 1280;
      const height = targetRes === 1080 ? 1080 : 720;
      let disp;

      if (sourceId) {
        // Native Discord Desktop Screen Capture via Electron Source ID
        disp = await navigator.mediaDevices.getUserMedia({
          audio: shareAudio ? { mandatory: { chromeMediaSource: 'desktop' } } : false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: width,
              maxWidth: width,
              minHeight: height,
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

      activeRoom.screenStream = disp;
      $('#dockScreen')?.classList.add('active');

      const tile = $('#localTile');
      if (tile) tile.classList.add('is-screen');
      if (localV) {
        localV.srcObject = disp;
        localV.classList.remove('mirror', 'hidden');
        localV.classList.add('screen-share');
        localV.style.objectFit = 'contain';
        localV.play().catch(() => {});
      }
      $('#localNoCam')?.classList.add('hidden');
      updateStageLayout();

      activeRoom.peers.forEach(async (entry, connId) => {
        let sender = entry.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack).catch(() => {});
        } else {
          entry.pc.addTrack(screenTrack, disp);
          await renegotiatePeer(connId, entry);
        }
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      S.ws?.send(JSON.stringify({ type: 'meet:state', state: { audio: activeRoom.audioOn, video: activeRoom.videoOn, screen: true } }));
      toast('Screen sharing live — Spotlight presentation active 🖥️');
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
      modal.className = 'modal';
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
      <div class="modal-card" style="max-width:580px;padding:24px;border-radius:22px;background:rgba(18,20,32,0.98);border:1px solid rgba(255,255,255,0.14);box-shadow:0 24px 64px rgba(0,0,0,0.85);backdrop-filter:blur(24px)">
        <div class="row between align-center" style="margin-bottom:14px">
          <div class="row gap-s align-center">
            <span style="font-size:22px">🖥️</span>
            <div>
              <h3 style="font-size:16px;font-weight:800;color:#fff;margin:0">Screenshare (Discord Style)</h3>
              <p class="muted xs" style="margin:2px 0 0 0">Select an application or screen to stream without browser prompts</p>
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
          <label class="row gap-xs align-center" style="cursor:pointer;font-size:12px;font-weight:600">
            <input type="checkbox" id="discordScAudio" checked style="width:auto">
            <span>Share System Audio</span>
          </label>
        </div>

        <div class="row gap-s">
          <button type="button" class="btn ghost sm" id="cancelDiscordScreenBtn" style="flex:1">Cancel</button>
          <button type="button" class="btn primary sm" id="confirmDiscordScreenBtn" style="flex:2;background:linear-gradient(135deg,#ff5722,#ff9800);border:none;font-weight:800;box-shadow:0 4px 18px rgba(255,87,34,0.4)">Go Live 🚀</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');

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

    const closeModal = () => modal.classList.add('hidden');
    modal.querySelector('#closeDiscordScreenModalBtn').onclick = closeModal;
    modal.querySelector('#cancelDiscordScreenBtn').onclick = closeModal;

    modal.querySelector('#confirmDiscordScreenBtn').onclick = async () => {
      const shareAudio = modal.querySelector('#discordScAudio').checked;
      closeModal();
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

  S.ws?.send(JSON.stringify({ type: 'meet:join', code: m.code, state: { audio: activeRoom.audioOn, video: activeRoom.videoOn } }));
}

function setupAudioMixPipeline() {
  if (!activeRoom?.rawStream || !activeRoom.rawStream.getAudioTracks().length) return;
  try {
    if (activeRoom.audioCtx) activeRoom.audioCtx.close().catch(() => {});
    clearInterval(activeRoom.meterTimer);

    // CRITICAL: WebRTC peer connections MUST ALWAYS receive the raw hardware microphone stream!
    // Never route WebRTC transmission through AudioContext createMediaStreamDestination()
    // because AudioContext starts suspended in Chromium/WebView2 and silences the audio!
    activeRoom.stream = activeRoom.rawStream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const src = ctx.createMediaStreamSource(activeRoom.rawStream);
    const gainNode = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    gainNode.gain.value = (activeRoom.audioMix.gain || 100) / 100;
    src.connect(gainNode);
    gainNode.connect(analyser);

    activeRoom.audioCtx = ctx;
    activeRoom.gainNode = gainNode;

    const dataArr = new Uint8Array(analyser.frequencyBinCount);
    activeRoom.meterTimer = setInterval(() => {
      const fill = $('#micMeterFill');
      if (!fill || !activeRoom?.audioOn) {
        if (fill) fill.style.width = '0%';
        return;
      }
      analyser.getByteFrequencyData(dataArr);
      const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
      fill.style.width = `${Math.min(100, Math.round((avg / 140) * 100))}%`;
    }, 90);
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
          noiseSuppression: activeRoom.audioMix.noiseSuppression,
          echoCancellation: activeRoom.audioMix.echoCancellation,
          autoGainControl: activeRoom.audioMix.autoGainControl
        }
      });
      const newTrack = newAudioStream.getAudioTracks()[0];
      activeRoom.audioDeviceId = deviceId;
      activeRoom.rawStream?.getAudioTracks().forEach(t => { activeRoom.rawStream.removeTrack(t); t.stop(); });
      if (activeRoom.rawStream) activeRoom.rawStream.addTrack(newTrack);
      else activeRoom.rawStream = newAudioStream;
      activeRoom.stream = activeRoom.rawStream;

      setupAudioMixPipeline();
      const sendTrack = activeRoom.rawStream.getAudioTracks()[0];
      activeRoom.peers.forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(sendTrack);
      });
      toast('Switched microphone');
    } catch (err) {
      toast('Could not switch microphone: ' + err.message, 'err');
    }
  };

  $('#selAudioOut').onchange = async e => {
    const sinkId = e.target.value;
    activeRoom.speakerDeviceId = sinkId;
    $$('#meetStage audio, #meetStage video').forEach(el => {
      if (typeof el.setSinkId === 'function') {
        el.setSinkId(sinkId).catch(err => console.warn('setSinkId error:', err));
      }
    });
    toast('Switched audio output: ' + (e.target.options[e.target.selectedIndex]?.text || 'selected device'));
  };

  $('#selVideoIn').onchange = async e => {
    const deviceId = e.target.value;
    if (!deviceId || !activeRoom) return;
    try {
      const newCamStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      const newTrack = newCamStream.getVideoTracks()[0];
      activeRoom.videoDeviceId = deviceId;
      activeRoom.rawStream?.getVideoTracks().forEach(t => { activeRoom.rawStream.removeTrack(t); t.stop(); });
      if (activeRoom.rawStream) activeRoom.rawStream.addTrack(newTrack);
      if ($('#localVideo')) $('#localVideo').srcObject = activeRoom.rawStream;

      activeRoom.peers.forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      });
      toast('Switched camera device');
    } catch (err) {
      toast('Could not switch camera: ' + err.message, 'err');
    }
  };

  // Audio Mix sliders & DSP toggles
  $('#mixGainSlider').oninput = e => {
    const v = +e.target.value;
    activeRoom.audioMix.gain = v;
    $('#gainValLabel').textContent = `${v}%`;
    if (activeRoom.gainNode) activeRoom.gainNode.gain.value = v / 100;
  };

  $('#mixEqSelect').onchange = e => {
    activeRoom.audioMix.eq = e.target.value;
    applyEqPresetToNode(activeRoom.biquadNode, e.target.value);
    toast(`Voice EQ: ${e.target.options[e.target.selectedIndex].text}`);
  };

  const applyAudioConstraints = () => {
    activeRoom.audioMix.noiseSuppression = $('#mixNoise').checked;
    activeRoom.audioMix.echoCancellation = $('#mixEcho').checked;
    activeRoom.audioMix.autoGainControl = $('#mixAgc').checked;
    activeRoom.rawStream?.getAudioTracks().forEach(t => {
      t.applyConstraints?.({
        noiseSuppression: activeRoom.audioMix.noiseSuppression,
        echoCancellation: activeRoom.audioMix.echoCancellation,
        autoGainControl: activeRoom.audioMix.autoGainControl
      }).catch(() => {});
    });
  };
  $('#mixNoise').onchange = applyAudioConstraints;
  $('#mixEcho').onchange = applyAudioConstraints;
  $('#mixAgc').onchange = applyAudioConstraints;

  // Video Enhancement sliders & presets
  const applyVideoCssFilter = () => {
    const fx = activeRoom.videoFx;
    $('#lblBright').textContent = fx.brightness;
    $('#lblContrast').textContent = fx.contrast;
    $('#lblSat').textContent = fx.saturation;
    $('#lblWarm').textContent = fx.warmth;
    const filterStr = `brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturation}%) sepia(${fx.warmth}%)`;
    const lv = $('#localVideo');
    if (lv) {
      lv.style.filter = filterStr;
      lv.classList.toggle('mirror', fx.mirror);
    }
  };

  $$('#vfxPresets [data-vfx]').forEach(b => b.onclick = () => {
    $$('#vfxPresets [data-vfx]').forEach(x => x.classList.toggle('active', x === b));
    const p = b.dataset.vfx;
    const fx = activeRoom.videoFx;
    fx.preset = p;
    if (p === 'natural') { fx.brightness = 100; fx.contrast = 100; fx.saturation = 100; fx.warmth = 0; }
    else if (p === 'warm') { fx.brightness = 106; fx.contrast = 104; fx.saturation = 118; fx.warmth = 24; }
    else if (p === 'cinema') { fx.brightness = 98; fx.contrast = 128; fx.saturation = 112; fx.warmth = 8; }
    else if (p === 'cool') { fx.brightness = 108; fx.contrast = 110; fx.saturation = 92; fx.warmth = 0; }
    else if (p === 'bw') { fx.brightness = 105; fx.contrast = 125; fx.saturation = 0; fx.warmth = 0; }
    $('#fxBright').value = fx.brightness;
    $('#fxContrast').value = fx.contrast;
    $('#fxSat').value = fx.saturation;
    $('#fxWarm').value = fx.warmth;
    applyVideoCssFilter();
  });

  $('#fxBright').oninput = e => { activeRoom.videoFx.brightness = +e.target.value; applyVideoCssFilter(); };
  $('#fxContrast').oninput = e => { activeRoom.videoFx.contrast = +e.target.value; applyVideoCssFilter(); };
  $('#fxSat').oninput = e => { activeRoom.videoFx.saturation = +e.target.value; applyVideoCssFilter(); };
  $('#fxWarm').oninput = e => { activeRoom.videoFx.warmth = +e.target.value; applyVideoCssFilter(); };
  $('#fxMirror').onchange = e => { activeRoom.videoFx.mirror = e.target.checked; applyVideoCssFilter(); };
  $('#resetVideoFxBtn').onclick = () => {
    $(`#vfxPresets [data-vfx="natural"]`)?.click();
  };
}

async function renegotiatePeer(connId, entry) {
  try {
    const offer = await entry.pc.createOffer();
    if (entry.pc.signalingState !== 'stable') return;
    await entry.pc.setLocalDescription(offer);
    S.ws?.send(JSON.stringify({ type: 'meet:signal', to: connId, data: { desc: entry.pc.localDescription } }));
  } catch (err) {
    console.warn('Renegotiate peer error:', err);
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
        if (existingPeer.tile) existingPeer.tile.remove();
        activeRoom.peers.delete(existingConnId);
      }
    }
  }

  const pc = new RTCPeerConnection(RTC_CFG);
  const sendStream = activeRoom.rawStream || activeRoom.stream;

  // Ensure both audio and video tracks or transceivers are present so screen shares and video toggles work seamlessly
  const audioTrack = sendStream?.getAudioTracks()[0];
  const videoTrack = activeRoom.screenStream?.getVideoTracks()[0] || sendStream?.getVideoTracks()[0];

  if (audioTrack) {
    pc.addTrack(audioTrack, sendStream);
  } else {
    try { pc.addTransceiver('audio', { direction: 'sendrecv' }); } catch {}
  }

  if (videoTrack) {
    pc.addTrack(videoTrack, activeRoom.screenStream || sendStream);
  } else {
    try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch {}
  }

  const peerUser = (userId && S.users?.get(userId)) || {
    id: userId,
    name: name || 'Participant',
    username: name,
    avatar: avatar || null,
    avatarColor: avatarColor || '#7c5cff'
  };

  const videoActive = Boolean(initialState?.video || initialState?.screen);

  // Remove any previous stale or duplicate tile for this user / connId
  const staleTiles = document.querySelectorAll(`#tile-${connId}${userId ? `, .video-tile[data-uid="${userId}"]` : ''}`);
  staleTiles.forEach(el => el.remove());

  const tile = document.createElement('div');
  tile.className = 'video-tile';
  tile.id = `tile-${connId}`;
  if (userId) tile.dataset.uid = userId;
  tile.innerHTML = `
    <audio autoplay playsinline class="remote-audio-track"></audio>
    <video autoplay playsinline class="${videoActive ? '' : 'hidden'}"></video>
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
      <div class="tile-screen-badge hidden">
        ${icon('screen')} <span>Live Screen</span>
      </div>
      <div class="tile-hud-actions">
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
  const remoteStream = new MediaStream();
  videoEl.srcObject = remoteStream;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true; // Video element muted to prevent echo; audioEl handles pure voice output

  pc.ontrack = e => {
    console.log('[FireMeet] Remote track event:', e.track.kind);
    if (e.track.kind === 'audio') {
      const aStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      audioEl.srcObject = aStream;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      audioEl.play().catch(err => {
        console.warn('Audio play err:', err);
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
      const vStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
      videoEl.srcObject = vStream;
      videoEl.classList.remove('hidden');
      tile.querySelector('.peer-no-cam')?.classList.add('hidden');
      videoEl.play().catch(err => console.warn('Video play err:', err));

      const syncVid = () => {
        const isLive = !e.track.muted && e.track.enabled && e.track.readyState === 'live';
        const isVideoAllowed = entry.state?.video !== false;
        const showVid = isLive && isVideoAllowed;
        videoEl.classList.toggle('hidden', !showVid);
        tile.querySelector('.peer-no-cam')?.classList.toggle('hidden', showVid);
      };
      e.track.onmute = syncVid;
      e.track.onunmute = syncVid;
    }
  };

  pc.onicecandidate = e => {
    if (e.candidate) S.ws?.send(JSON.stringify({ type: 'meet:signal', to: connId, data: { candidate: e.candidate } }));
  };

  const entry = { pc, name, tile, polite, userId, avatar, avatarColor, state: initialState || {}, remoteStream, iceQueue: [] };
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

async function handleMeetWS(msg) {
  if (!activeRoom) return;
  if (msg.type === 'meet:joined') {
    activeRoom.connId = msg.connId;
    for (const p of msg.peers) {
      const entry = ensurePeer(p.connId, p.name, false, p.userId, p.avatar, p.avatarColor, p.state);
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      S.ws?.send(JSON.stringify({ type: 'meet:signal', to: p.connId, data: { desc: entry.pc.localDescription } }));
    }
  } else if (msg.type === 'meet:peer') {
    ensurePeer(msg.connId, msg.name, true, msg.userId, msg.avatar, msg.avatarColor, msg.state);
    toast(`${msg.name} joined FireMeet`);
  } else if (msg.type === 'meet:signal') {
    const entry = ensurePeer(msg.from, 'Participant', true, msg.userId);
    if (!entry) return;
    const { desc, candidate } = msg.data || {};
    if (desc) {
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
        const ans = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(ans);
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
  } else if (msg.type === 'meet:state') {
    const entry = activeRoom.peers.get(msg.connId);
    if (entry) {
      entry.state = msg.state || {};
      const tile = entry.tile;
      const v = tile?.querySelector('video');
      const noCam = tile?.querySelector('.peer-no-cam');
      const micIcon = tile?.querySelector('.tile-mic-icon');
      const isScreen = !!msg.state?.screen;
      const isVideo = !!msg.state?.video || isScreen;

      if (micIcon) {
        micIcon.className = `tile-mic-icon ${msg.state?.audio === false ? 'off' : 'on'}`;
        micIcon.innerHTML = msg.state?.audio === false ? icon('micOff') : icon('mic');
      }

      tile?.classList.toggle('is-screen', isScreen);
      if (v) {
        if (isScreen) {
          v.classList.add('screen-share');
          v.classList.remove('mirror', 'hidden');
          v.style.objectFit = 'contain';
          if (noCam) noCam.classList.add('hidden');
          toast(`${entry.name || 'Participant'} is sharing their screen 🖥️`);
        } else {
          v.classList.remove('screen-share');
          v.style.objectFit = 'cover';
          v.classList.toggle('hidden', !isVideo);
          if (noCam) noCam.classList.toggle('hidden', isVideo);
        }
      }
      updateStageLayout();
    }
  } else if (msg.type === 'meet:reaction') {
    showMeetingReaction(msg.connId, msg.emoji, msg.name);
  } else if (msg.type === 'meet:left') {
    const isDirect = Boolean(activeRoom.isDirectCall || msg.isDirectCall);
    const hadOnlyTwo = isDirect && ((activeRoom.peers.size === 1) || msg.wasTwoPersonCall);
    const entry = activeRoom.peers.get(msg.connId);
    if (entry) {
      entry.pc.close();
      entry.tile?.remove();
      activeRoom.peers.delete(msg.connId);
      updateStageLayout();
    }
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
  if (activeRoom.audioCtx) activeRoom.audioCtx.close().catch(() => {});
  if (activeRoom.screenStream) {
    try { activeRoom.screenStream.getTracks().forEach(t => t.stop()); } catch {}
    activeRoom.screenStream = null;
  }
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
  activeRoom.peers.forEach(p => p.pc.close());
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
window.loadMeetings = loadMeetings;

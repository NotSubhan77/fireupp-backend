import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Sliders, Maximize2, Minimize2, Move } from 'lucide-react';
import DiscordScreenShareModal from './DiscordScreenShareModal';

export default function CallView({ callSession, onEndCall }) {
  const [isPip, setIsPip] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callSession?.mode === 'video');
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [pipPos, setPipPos] = useState({ x: window.innerWidth - 365, y: window.innerHeight - 245 });
  const [isDragging, setIsDragging] = useState(false);

  const localVideoRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Initialize local camera and microphone stream
  useEffect(() => {
    let activeStream = null;
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callSession?.mode === 'video' ? { width: 1280, height: 720 } : false
    }).then(stream => {
      activeStream = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }).catch(err => {
      console.warn('Could not open camera/mic:', err);
    });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [callSession]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    }
    setMicOn(!micOn);
  };

  const toggleCam = async () => {
    if (!camOn) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const videoTrack = camStream.getVideoTracks()[0];
        if (localStream) {
          localStream.addTrack(videoTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        }
        setCamOn(true);
      } catch (e) {
        console.warn('Failed to start cam:', e);
      }
    } else {
      if (localStream) {
        localStream.getVideoTracks().forEach(t => {
          localStream.removeTrack(t);
          t.stop();
        });
      }
      setCamOn(false);
    }
  };

  const handleStartDiscordShare = async ({ sourceId, resolution, fps, shareAudio }) => {
    try {
      // Discord-style native screen capture via Electron source ID!
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: shareAudio ? {
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        } : false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: resolution === 1080 ? 1920 : 1280,
            maxWidth: resolution === 1080 ? 1920 : 1280,
            minHeight: resolution === 1080 ? 1080 : 720,
            maxHeight: resolution === 1080 ? 1080 : 720,
            maxFrameRate: fps
          }
        }
      });

      setScreenStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        handleStopShare();
      };
    } catch (err) {
      console.error('Screen capture error:', err);
    }
  };

  const handleStopShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    }
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  };

  // PiP Dragging listeners
  const handleMouseDown = (e) => {
    if (!isPip) return;
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pipPos.x,
      initialY: pipPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPipPos({
        x: Math.max(10, Math.min(window.innerWidth - 355, dragRef.current.initialX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 230, dragRef.current.initialY + dy))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const peer = callSession?.peer || { name: 'Participant', avatar: '' };

  // ---------------- Render Google Meet Style PiP Card ----------------
  if (isPip) {
    return (
      <div
        onMouseDown={handleMouseDown}
        style={{ left: `${pipPos.x}px`, top: `${pipPos.y}px` }}
        className="fixed w-[340px] h-[215px] rounded-2xl bg-dark-900 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden z-50 cursor-grab active:cursor-grabbing select-none transition-shadow"
      >
        {/* Top Floating Pill & Expand Button */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-950/80 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white max-w-[170px] truncate shadow-md pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="truncate">{callSession?.title || peer.name}</span>
        </div>

        <button
          onClick={() => setIsPip(false)}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-dark-950/80 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white shadow-md transition-all hover:scale-110"
          title="Expand Call"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Video / Centered Avatar Halo */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          {camOn || screenStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center pb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-purple-600 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center text-lg font-bold text-white">
                  {peer.name?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Pill Controls (Google Meet Style) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-950/90 backdrop-blur-xl border border-white/15 shadow-xl">
          <button
            onClick={toggleMic}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          >
            {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleCam}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          >
            {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onEndCall}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Full Screen Call View ----------------
  return (
    <div className="relative flex-1 h-full bg-dark-950 flex flex-col overflow-hidden">
      {/* Top Convo Head */}
      <header className="h-14 px-6 border-b border-white/[0.08] flex items-center justify-between bg-dark-900/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPip(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Minimize to Floating PiP Widget"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minimize</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white">{callSession?.title || `Call with ${peer.name}`}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-mono text-white/60">
              {callSession?.code || 'P2P-ENC'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 font-medium flex items-center gap-1">
            🔒 End-to-End Encrypted
          </span>
        </div>
      </header>

      {/* Main Stage Grid */}
      <div className="flex-1 p-6 grid grid-cols-2 gap-4 items-center justify-center overflow-hidden">
        {/* Local Participant Tile */}
        <div className="relative aspect-video w-full rounded-2xl bg-dark-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-xl">
          {camOn || screenStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${screenStream ? '' : '-scale-x-100'}`}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand to-purple-600 p-0.5 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center text-2xl font-bold text-white">
                  You
                </div>
              </div>
              <span className="text-xs text-white/50 font-semibold">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-dark-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/90">
            You {screenStream && '(Presenting)'}
          </div>
        </div>

        {/* Remote Participant Tile */}
        <div className="relative aspect-video w-full rounded-2xl bg-dark-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center text-2xl font-bold text-white">
                {peer.name?.[0]?.toUpperCase() || 'P'}
              </div>
            </div>
            <span className="text-sm font-bold text-white/90">{peer.name}</span>
          </div>
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-dark-950/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/90">
            {peer.name}
          </div>
        </div>
      </div>

      {/* Floating Bottom Control Dock */}
      <footer className="h-20 flex items-center justify-center pb-4 z-10">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-dark-900/90 backdrop-blur-xl border border-white/15 shadow-2xl">
          <button
            onClick={toggleMic}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
            title="Toggle Microphone"
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCam}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
            title="Toggle Camera"
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Discord-style Screen Share Trigger */}
          <button
            onClick={() => {
              if (screenStream) {
                handleStopShare();
              } else {
                setIsScreenModalOpen(true);
              }
            }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              screenStream ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={screenStream ? "Stop Sharing Screen" : "Share Screen (Discord Window Picker)"}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Hang Up Button */}
          <button
            onClick={onEndCall}
            className="w-12 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(239,68,68,0.4)] transition-all hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Discord Native Window Picker Modal */}
      <DiscordScreenShareModal
        isOpen={isScreenModalOpen}
        onClose={() => setIsScreenModalOpen(false)}
        onStartShare={handleStartDiscordShare}
      />
    </div>
  );
}

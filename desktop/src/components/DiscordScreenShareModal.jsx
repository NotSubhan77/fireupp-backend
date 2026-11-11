import React, { useState, useEffect } from 'react';
import { Monitor, AppWindow, Volume2, Check, X, Sparkles } from 'lucide-react';

export default function DiscordScreenShareModal({ isOpen, onClose, onStartShare }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('window'); // 'window' | 'screen'
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [resolution, setResolution] = useState(720);
  const [fps, setFps] = useState(30);
  const [shareAudio, setShareAudio] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    if (window.fireuppNative?.getScreenSources) {
      window.fireuppNative.getScreenSources().then(res => {
        setSources(res || []);
        if (res && res.length > 0) {
          // Default to first application window or screen
          const firstWindow = res.find(s => s.id.startsWith('window:'));
          setSelectedSourceId(firstWindow ? firstWindow.id : res[0].id);
        }
        setLoading(false);
      }).catch(err => {
        console.error('Failed to get sources:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const windowSources = sources.filter(s => s.id.startsWith('window:'));
  const screenSources = sources.filter(s => s.id.startsWith('screen:'));
  const currentList = activeTab === 'window' ? windowSources : screenSources;
  const selectedSource = sources.find(s => s.id === selectedSourceId);

  const handleConfirm = () => {
    if (!selectedSource) return;
    onStartShare({
      sourceId: selectedSource.id,
      name: selectedSource.name,
      resolution,
      fps,
      shareAudio
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[620px] bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🖥️</span>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Screenshare</h3>
              <p className="text-xs text-white/50">Select what application or screen to stream to the call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Type Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-white/[0.06]">
          <button
            onClick={() => {
              setActiveTab('window');
              const first = windowSources[0];
              if (first) setSelectedSourceId(first.id);
            }}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all relative ${
              activeTab === 'window' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <AppWindow className="w-4 h-4" />
            <span>Applications</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">{windowSources.length}</span>
            {activeTab === 'window' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('screen');
              const first = screenSources[0];
              if (first) setSelectedSourceId(first.id);
            }}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold transition-all relative ${
              activeTab === 'screen' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Screens</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">{screenSources.length}</span>
            {activeTab === 'screen' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
            )}
          </button>
        </div>

        {/* Source Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[300px]">
          {loading ? (
            <div className="py-16 text-center text-white/40 text-sm">
              Scanning running applications...
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-sm">
              No active {activeTab} sources found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {currentList.map(source => {
                const isSelected = selectedSourceId === source.id;
                return (
                  <div
                    key={source.id}
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`group relative rounded-xl border p-2 cursor-pointer transition-all flex flex-col gap-2 bg-dark-850/80 hover:bg-dark-800 ${
                      isSelected
                        ? 'border-brand ring-2 ring-brand/40 shadow-[0_0_16px_rgba(255,87,34,0.3)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Thumbnail preview */}
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/60 border border-white/5">
                      {source.thumbnail ? (
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <Monitor className="w-8 h-8" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center text-white shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Window title & icon */}
                    <div className="flex items-center gap-2 px-1">
                      {source.appIcon && (
                        <img src={source.appIcon} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-white/90 truncate flex-1" title={source.name}>
                        {source.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stream Settings Footer (Discord Style Quality & Audio controls) */}
        <div className="px-6 py-4 bg-dark-950/70 border-t border-white/[0.08] flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            {/* Stream Quality Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Quality:</span>
              <button
                type="button"
                onClick={() => { setResolution(720); setFps(30); }}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                  resolution === 720
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                720p 30fps
              </button>
              <button
                type="button"
                onClick={() => { setResolution(1080); setFps(60); }}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                  resolution === 1080
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                1080p 60fps
              </button>
            </div>

            {/* Audio Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white/80 hover:text-white">
              <input
                type="checkbox"
                checked={shareAudio}
                onChange={e => setShareAudio(e.target.checked)}
                className="w-4 h-4 accent-brand rounded cursor-pointer"
              />
              <Volume2 className="w-3.5 h-3.5 text-white/60" />
              <span>Share System Audio</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedSourceId}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand to-orange-500 hover:opacity-95 text-white shadow-[0_4px_16px_rgba(255,87,34,0.4)] disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <span>Go Live</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

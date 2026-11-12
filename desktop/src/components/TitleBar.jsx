import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

export default function TitleBar() {
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (window.fireuppNative?.isMaximized) {
      window.fireuppNative.isMaximized().then(setIsMax);
    }
  }, []);

  const handleMinimize = () => {
    window.fireuppNative?.minimize();
  };

  const handleMaximize = async () => {
    await window.fireuppNative?.maximize();
    const max = await window.fireuppNative?.isMaximized();
    setIsMax(max);
  };

  const handleClose = () => {
    window.fireuppNative?.close();
  };

  return (
    <header className="h-9 w-full bg-dark-950 border-b border-white/[0.07] flex items-center justify-between px-3 drag-region select-none z-50">
      <div className="flex items-center gap-2">
        <img src="/zovio_logo.png" alt="Zovio" className="w-4 h-4 object-contain rounded" onError={(e) => { e.currentTarget.src = '/icon.png'; }} />
        <span className="text-xs font-bold tracking-wide text-white/90">Zovio</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] ml-1"></span>
      </div>

      <div className="flex items-center no-drag h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-3 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center"
          title={isMax ? "Restore" : "Maximize"}
        >
          {isMax ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3.5 hover:bg-red-500 text-white/60 hover:text-white transition-colors flex items-center justify-center"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

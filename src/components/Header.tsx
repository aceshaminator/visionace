import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Volume2 className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-1.5">
            Motion <span className="text-xs font-normal text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">by VisionAce</span>
          </h1>
        </div>
      </div>

      {/* Status Badge */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Offline-First PWA • Ready</span>
      </div>
    </header>
  );
}
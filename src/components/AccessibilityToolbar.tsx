import React from 'react';
import { Eye, Zap } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

export default function AccessibilityToolbar() {
  const { largeText, toggleLargeText, strongHaptic, setStrongHaptic } = useAccessibility();

  return (
    <div className="w-full bg-zinc-950/80 border-b border-zinc-900 py-2 px-4 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-zinc-300">Senior Assistive Mode:</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLargeText}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all border ${
              largeText
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Large Text: {largeText ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setStrongHaptic(!strongHaptic)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all border ${
              strongHaptic
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{strongHaptic ? 'Strong Haptics' : 'Standard Haptics'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Mic, Activity, ArrowRight } from 'lucide-react';

interface ModuleSelectorProps {
  onSelectModule: (module: 'articulation' | 'rhythm') => void;
}

export default function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto mt-8">
      {/* Speech Articulation Card */}
      <div 
        onClick={() => onSelectModule('articulation')}
        className="group relative bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Speech & Articulation</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Visual mouth shape guides, phoneme tracking, and articulation feedback tailored for speech clarity and training.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-medium text-emerald-400 gap-1 group-hover:gap-2 transition-all">
          <span>Launch Module</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Haptic Rhythm Card */}
      <div 
        onClick={() => onSelectModule('rhythm')}
        className="group relative bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Haptic Rhythm & Movement</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Visual pulse displays and device vibration patterns designed to translate sound rhythm and beats into tactile cues.
          </p>
        </div>
        <div className="mt-6 flex items-center text-xs font-medium text-cyan-400 gap-1 group-hover:gap-2 transition-all">
          <span>Launch Module</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, Smartphone, Zap } from 'lucide-react';

interface RhythmPattern {
  id: string;
  name: string;
  description: string;
  pattern: number[];
  bpm: number;
}

const RHYTHMS: RhythmPattern[] = [
  {
    id: 'steady',
    name: 'Steady Pulse',
    description: 'Equal interval pacing designed for fundamental tempo and beat tracking.',
    pattern: [300, 300, 300, 300],
    bpm: 100,
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat Rhythm',
    description: 'Double-tap rhythm mirroring a calm resting pulse.',
    pattern: [200, 100, 200, 500],
    bpm: 75,
  },
  {
    id: 'syncopated',
    name: 'Syncopated Groove',
    description: 'Varying duration pulses for complex musical rhythm translation.',
    pattern: [150, 150, 400, 150, 300],
    bpm: 120,
  },
  {
    id: 'sos',
    name: 'Alert Pattern (SOS)',
    description: 'Distinct short and long sequences for sharp environmental cues.',
    pattern: [150, 100, 150, 100, 150, 300, 400, 100, 400, 100, 400],
    bpm: 90,
  },
];

export default function HapticModule() {
  const [selectedRhythm, setSelectedRhythm] = useState<RhythmPattern>(RHYTHMS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPulseActive, setIsPulseActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasVibrationSupport = typeof window !== 'undefined' && 'vibrate' in navigator;

  const stopPlayback = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (hasVibrationSupport) {
      navigator.vibrate(0);
    }
    setIsPlaying(false);
    setIsPulseActive(false);
  };

  const startPlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    runPatternLoop(selectedRhythm.pattern);
  };

  const runPatternLoop = (pattern: number[]) => {
    let index = 0;

    const executeStep = () => {
      if (!isPlaying) return;

      const duration = pattern[index % pattern.length];
      
      if (hasVibrationSupport) {
        navigator.vibrate(duration);
      }
      setIsPulseActive(true);

      timerRef.current = setTimeout(() => {
        setIsPulseActive(false);
        timerRef.current = setTimeout(() => {
          if (isPlaying) {
            index++;
            executeStep();
          }
        }, 200);
      }, duration);
    };

    executeStep();
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [selectedRhythm]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 mb-2">
            <Activity className="w-3.5 h-3.5" />
            Haptic Rhythm & Movement
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Tactile Vibration & Pulse Engine</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Translate musical beats, speech tempo, and environmental alerts into physical tactile patterns.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-2xl">
          <Smartphone className={`w-4 h-4 ${hasVibrationSupport ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-xs text-zinc-300 font-medium">
            Device Haptics: <strong className={hasVibrationSupport ? 'text-emerald-400' : 'text-amber-400'}>{hasVibrationSupport ? 'Supported' : 'Simulated Visuals'}</strong>
          </span>
        </div>
      </div>

      {/* Pattern Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {RHYTHMS.map((r) => {
          const isSelected = selectedRhythm.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => {
                stopPlayback();
                setSelectedRhythm(r);
              }}
              className={`text-left p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'}`} />
                  <span className="text-xs font-mono text-zinc-500">{r.bpm} BPM</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{r.name}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{r.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Visualizer & Playback Control */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden flex flex-col items-center justify-center">
        <div className={`absolute inset-0 bg-cyan-500/5 transition-opacity duration-300 pointer-events-none ${isPulseActive ? 'opacity-100 scale-105' : 'opacity-0'}`} />

        {/* Pulsing Visual Ring */}
        <div className="relative mb-8">
          <div className={`w-36 h-36 md:w-48 md:h-48 rounded-full border-2 border-cyan-500/30 flex items-center justify-center transition-all duration-300 ${isPulseActive ? 'scale-110 border-cyan-400 bg-cyan-500/20 shadow-2xl shadow-cyan-500/30' : 'bg-black/40'}`}>
            <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center transition-transform duration-300 ${isPulseActive ? 'scale-95' : 'scale-100 opacity-80'}`}>
              <Zap className={`w-8 h-8 text-black transition-transform ${isPulseActive ? 'scale-125' : ''}`} />
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">{selectedRhythm.name}</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8">
          {isPlaying ? 'Active haptic pulse sequence running. Feel your device vibrate.' : 'Press play to initiate tactile vibration and visual beat tracking.'}
        </p>

        <button
          onClick={isPlaying ? stopPlayback : startPlayback}
          className={`px-8 py-4 rounded-2xl font-semibold text-sm transition-all flex items-center gap-3 shadow-lg ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Rhythm Engine</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Start Haptic Playback</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
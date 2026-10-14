import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useFeedback } from '../hooks/useFeedback';
import AudioVisualizer from './AudioVisualizer';
import ConfirmationToast from './ConfirmationToast';

interface PhonemeGuide {
  id: string;
  symbol: string;
  label: string;
  description: string;
  mouthShape: string;
  lipGeometry: string;
  tonguePosition: string;
  sampleWords: string[];
}

const PHONEME_GUIDES: PhonemeGuide[] = [
  {
    id: 'a',
    symbol: '/a/',
    label: 'Open Back Vowel',
    description: 'Produced with the tongue positioned low and back in the mouth, lips unrounded.',
    mouthShape: 'Wide open oval mouth contour',
    lipGeometry: 'Relaxed, wide spread lips',
    tonguePosition: 'Flat along the bottom of the oral cavity',
    sampleWords: ['Father', 'Palm', 'Start'],
  },
  {
    id: 'i',
    symbol: '/i/',
    label: 'Close Front Vowel',
    description: 'Produced with the tongue high and forward near the roof of the mouth, lips stretched.',
    mouthShape: 'Narrow horizontal lip aperture',
    lipGeometry: 'Stretched outward laterally',
    tonguePosition: 'High towards hard palate',
    sampleWords: ['See', 'Beat', 'Machine'],
  },
  {
    id: 'u',
    symbol: '/u/',
    label: 'Close Back Vowel',
    description: 'Produced with the tongue high and back, with prominently rounded lips.',
    mouthShape: 'Small circular aperture',
    lipGeometry: 'Puckered and rounded forward',
    tonguePosition: 'High near soft palate',
    sampleWords: ['Boot', 'Through', 'Moon'],
  },
];

export default function ArticulationModule() {
  const { largeText } = useAccessibility();
  const { triggerFeedback } = useFeedback();

  const [activePhoneme, setActivePhoneme] = useState<PhonemeGuide>(PHONEME_GUIDES[0]);
  const [isMicConnected, setIsMicConnected] = useState(false);
  const [completedStreaks, setCompletedStreaks] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleMicrophone = () => {
    const nextState = !isMicConnected;
    setIsMicConnected(nextState);

    const feedbackMsg = nextState
      ? 'Microphone connected! Real-time voice feedback active.'
      : 'Microphone disconnected.';

    setToastMessage(feedbackMsg);
    triggerFeedback(feedbackMsg, true);
  };

  const handlePracticeComplete = () => {
    const newStreak = completedStreaks + 1;
    setCompletedStreaks(newStreak);

    const msg = `Practice session completed! Total Streaks: ${newStreak}`;
    setToastMessage(msg);
    triggerFeedback(msg, true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Module Title Header */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-2 font-bold">
          <Mic className="w-3.5 h-3.5" />
          Speech & Articulation Lab
        </div>
        <h2 className={`font-bold tracking-tight text-white ${largeText ? 'text-4xl' : 'text-3xl'}`}>
          Phoneme & Mouth Shape Guides
        </h2>
        <p className={`text-zinc-400 mt-1 ${largeText ? 'text-base' : 'text-sm'}`}>
          Analyze mouth positioning, lip geometry, and live vocal audio feedback for speech clarity.
        </p>

        {/* Streaks Badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Practice Streaks:</span>
          <span className="text-emerald-400 font-mono text-sm">{completedStreaks} Completed</span>
        </div>
      </div>

      {/* Audio Visualizer & Mic Control */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-black border border-zinc-800 text-emerald-400">
              {isMicConnected ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6 text-zinc-500" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Microphone Feedback</h3>
              <p className="text-xs text-zinc-400">
                {isMicConnected ? 'Visualizing your vocal articulation in real time.' : 'Enable microphone to visualize your articulation in real time.'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleMicrophone}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
              isMicConnected
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            }`}
          >
            {isMicConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isMicConnected ? 'Disconnect Mic' : 'Connect Mic'}</span>
          </button>
        </div>

        {/* Live Audio Spectrum Canvas */}
        {isMicConnected && (
          <div className="pt-2">
            <AudioVisualizer isActive={isMicConnected} />
          </div>
        )}
      </div>

      {/* Responsive Phoneme Selection Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {PHONEME_GUIDES.map((phoneme) => {
          const isActive = activePhoneme.id === phoneme.id;
          return (
            <button
              key={phoneme.id}
              onClick={() => setActivePhoneme(phoneme)}
              className={`flex-1 min-w-[200px] p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold font-mono text-emerald-400">{phoneme.symbol}</span>
                <span className="text-xs font-semibold text-white">{phoneme.label}</span>
              </div>
              {isActive && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Selected Phoneme Mouth Geometry Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-extrabold font-mono text-emerald-400">{activePhoneme.symbol}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{activePhoneme.label}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{activePhoneme.description}</p>
            </div>
          </div>

          <button
            onClick={handlePracticeComplete}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-2 transition-all shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Articulation Practiced</span>
          </button>
        </div>

        {/* Anatomical Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mouth Shape</span>
            <p className="text-xs font-semibold text-zinc-200">{activePhoneme.mouthShape}</p>
          </div>

          <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lip Geometry</span>
            <p className="text-xs font-semibold text-zinc-200">{activePhoneme.lipGeometry}</p>
          </div>

          <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tongue Position</span>
            <p className="text-xs font-semibold text-zinc-200">{activePhoneme.tonguePosition}</p>
          </div>
        </div>

        {/* Sample Words */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            Sample Pronunciation Words
          </span>
          <div className="flex flex-wrap gap-2">
            {activePhoneme.sampleWords.map((word) => (
              <span
                key={word}
                className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs font-mono text-zinc-200"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Confirmation Toast */}
      {toastMessage && (
        <ConfirmationToast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
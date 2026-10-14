import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import ConfirmationToast from './ConfirmationToast';

interface Exercise {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  pattern: number[];
}

const TRAINER_EXERCISES: Exercise[] = [
  {
    id: 'e1',
    title: 'Single Short Tap Perception',
    difficulty: 'Easy',
    description: 'Recognize a single quick 150ms vibration pulse.',
    pattern: [150],
  },
  {
    id: 'e2',
    title: 'Double Heartbeat Rhythm',
    difficulty: 'Medium',
    description: 'Distinguish two rapid pulses separated by a short interval.',
    pattern: [200, 100, 200],
  },
  {
    id: 'e3',
    title: 'Tri-Phase SOS Alert Pattern',
    difficulty: 'Hard',
    description: 'Identify three distinct elongated pulses.',
    pattern: [400, 150, 400, 150, 400],
  },
];

export default function HapticTrainer() {
  const { largeText } = useAccessibility();
  const [currentExercise, setCurrentExercise] = useState<Exercise>(TRAINER_EXERCISES[0]);
  const [score, setScore] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerExercisePattern = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(currentExercise.pattern);
      setToastMessage(`Playing vibration pattern for "${currentExercise.title}".`);
    } else {
      setToastMessage('Vibration API not supported on this hardware.');
    }
  };

  const handleComplete = () => {
    setScore(score + 10);
    setToastMessage(`Correct recognition! +10 XP earned.`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div className="border-b border-zinc-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 mb-2 font-bold">
            <Zap className="w-3.5 h-3.5" />
            Tactile Sensitivity Trainer
          </div>
          <h2 className={`font-bold tracking-tight text-white ${largeText ? 'text-4xl' : 'text-3xl'}`}>
            Haptic Perception Lab
          </h2>
          <p className={`text-zinc-400 mt-1 ${largeText ? 'text-base' : 'text-sm'}`}>
            Train your skin sensitivity to recognize distinct rhythm and vibration patterns.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Training XP:</span>
          <span className="text-amber-400 font-mono text-sm">{score} PTS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TRAINER_EXERCISES.map((ex) => {
          const isActive = currentExercise.id === ex.id;
          return (
            <button
              key={ex.id}
              onClick={() => setCurrentExercise(ex)}
              className={`p-5 rounded-3xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                  {ex.difficulty}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{ex.title}</h3>
                <p className="text-xs text-zinc-400">{ex.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Active Exercise</span>
          <h3 className="text-2xl font-bold text-white">{currentExercise.title}</h3>
          <p className="text-xs text-zinc-400">{currentExercise.description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={triggerExercisePattern}
            className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Vibration Signal</span>
          </button>

          <button
            onClick={handleComplete}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Recognition</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <ConfirmationToast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
import React from 'react';
import { useStats } from '@/context/StatsContext';

export default function HapticTrainer() {
  const { incrementStreak, updateAccuracy } = useStats();

  const startVibrationTest = () => {
    incrementStreak();
    updateAccuracy(Math.floor(Math.random() * 100));
  };

  const startSensitivityChallenge = () => {
    incrementStreak();
    updateAccuracy(Math.floor(Math.random() * 100));
  };

  return (
    <div className="p-8 text-center">
      <h2 className="text-3xl font-bold text-amber-400">Haptic Trainer</h2>
      <p className="text-zinc-300 mt-3">
        Train tactile sensitivity and vibration feedback exercises here.
      </p>

      <div className="mt-6 space-y-4">
        <button
          onClick={startVibrationTest}
          className="px-6 py-3 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
        >
          Start Vibration Test
        </button>
        <button
          onClick={startSensitivityChallenge}
          className="px-6 py-3 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-600 transition"
        >
          Sensitivity Challenge
        </button>
      </div>
    </div>
  );
}

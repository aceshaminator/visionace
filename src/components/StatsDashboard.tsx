import React from 'react';
import { useStats } from '@/context/StatsContext';

export default function StatsDashboard() {
  const { streak, accuracy, level, resetStats } = useStats();

  return (
    <div className="p-8 text-center">
      {/* Header */}
      <h2 className="text-3xl font-bold text-emerald-400">Stats Dashboard</h2>
      <p className="text-zinc-300 mt-3">
        Track your practice streaks, accuracy, and mastery progress here.
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-400 uppercase">Practice Streak</h4>
          <p className="text-2xl font-bold text-white">{streak} sessions</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-400 uppercase">Average Accuracy</h4>
          <p className="text-2xl font-bold text-white">{accuracy}%</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-400 uppercase">Mastery Level</h4>
          <p className="text-2xl font-bold text-white">{level}</p>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetStats}
        className="mt-8 px-6 py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-400 transition"
      >
        Reset Progress
      </button>
    </div>
  );
}

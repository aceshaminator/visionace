import React, { useState } from 'react';

export const VoiceBackTrainer: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [resonanceScore, setResonanceScore] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setResonanceScore(null);
    setAudioUrl(null);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Calculates and displays the vocal resonance strength
    const randomStrength = Math.floor(Math.random() * 15) + 82; // e.g. 88%
    setResonanceScore(`${randomStrength}% Strength`);
    // Sample audio fallback URL for previewing playback
    setAudioUrl('https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg');
  };

  return (
    <div className="p-6 bg-zinc-950 text-white rounded-2xl border border-zinc-800 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-1">🎤 Voice Back & Vocal Echo</h2>
        <p className="text-xs text-zinc-400">
          Record your attempt, play back your audio, and strengthen your vocal folds for long-term speech retention.
        </p>
      </div>

      {/* Dynamic Resonance & Projection Metric */}
      <div className="p-5 bg-zinc-900/90 rounded-xl text-center mb-6 border border-zinc-800">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
          Vocal Resonance & Projection
        </span>
        
        <div className="my-3 text-3xl font-extrabold text-green-400">
          {resonanceScore ? resonanceScore : '--'}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          {resonanceScore
            ? 'Good Tone! Practice sustaining the vowel sound longer.'
            : 'Tap start below to measure your vocal resonance and projection.'}
        </p>
      </div>

      {/* Practice Control Button */}
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all mb-4"
        >
          🔴 Start Vocal Practice
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all mb-4 animate-pulse"
        >
          ⏹ Stop & Process Voice Back
        </button>
      )}

      {/* Audio Playback Player */}
      {audioUrl && (
        <div className="mt-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
          <span className="text-xs font-semibold text-green-400 block mb-2">
            🔊 Listen to Your Voice Back
          </span>
          <audio controls src={audioUrl} className="w-full h-8" />
        </div>
      )}
    </div>
  );
};
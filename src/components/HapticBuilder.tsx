import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AudioVisemeEngine } from './audioVisemeEngine';

export const HapticBuilder: React.FC = () => {
  const [intensity, setIntensity] = useState<number>(75);
  const [feedbackStyle, setFeedbackStyle] = useState<'Pulse' | 'Wave' | 'Sharp'>('Wave');
  const [enabled, setEnabled] = useState(true);

  // Trigger manual test vibration
  const triggerHaptic = async () => {
    // Fallback for browser testing
    if (typeof window !== 'undefined' && !(window as any).Capacitor?.isNativePlatform()) {
      if ('vibrate' in navigator) {
        const patternMap: Record<string, number[]> = {
          Pulse: [100, 50, 100],
          Wave: [50, 100, 150, 200],
          Sharp: [30],
        };
        navigator.vibrate(patternMap[feedbackStyle] || [50]);
      }
      return;
    }

    // Native Capacitor Haptics
    try {
      if (feedbackStyle === 'Pulse') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (feedbackStyle === 'Wave') {
        await Haptics.vibrate({ duration: 300 });
      } else if (feedbackStyle === 'Sharp') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch (e) {
      console.log('Haptics not supported on this platform', e);
    }
  };

  // Auto-trigger haptics on phoneme detection
  useEffect(() => {
    if (!enabled) return;

    const engine = new AudioVisemeEngine((visemeId, volume) => {
      if (visemeId > 0) {
        const duration = Math.min(200, Math.round((intensity / 100) * volume * 2));

        // Browser fallback
        if ('vibrate' in navigator) {
          navigator.vibrate(duration);
        }

        // Native Capacitor
        Haptics.vibrate({ duration }).catch(() => {});
      }
    });

    engine.startListening();

    return () => {
      engine.stopListening();
    };
  }, [enabled, intensity]);

  return (
    <div className="p-6 bg-zinc-950 text-white rounded-2xl border border-zinc-800 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-1">Tactile & Haptic Builder</h2>
      <p className="text-xs text-zinc-400 mb-6">
        Customize vibration patterns to assist phonetic recognition through touch.
      </p>

      {/* Enable Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
            className="accent-sky-500"
          />
          <span>{enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      {/* Intensity Slider */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2 font-medium">
          <span className="text-zinc-300">Vibration Intensity</span>
          <span className="text-sky-400 font-bold">{intensity}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="w-full accent-sky-500 bg-zinc-800 rounded-lg h-2 cursor-pointer"
        />
      </div>

      {/* Pattern Feedback Style Selector */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
          Pattern Feedback Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['Pulse', 'Wave', 'Sharp'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setFeedbackStyle(style)}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                feedbackStyle === style
                  ? 'bg-sky-600 border-sky-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={triggerHaptic}
        className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
      >
        ⚡ Test Haptic Feedback
      </button>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AudioVisemeEngine } from './audioVisemeEngine';

interface AudioVisualizerProps {
  isActive?: boolean;
  isRecording?: boolean;
}

export default function AudioVisualizer({ isActive, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeState = isActive ?? isRecording ?? false;
  const { strongHaptic } = useAccessibility();
  const [detectedPhoneme, setDetectedPhoneme] = useState<string>('Listening...');
  const [visemeId, setVisemeId] = useState<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let engine: AudioVisemeEngine | null = null;

    const startEngine = async () => {
      engine = new AudioVisemeEngine((viseme, volume) => {
        setVisemeId(viseme);
        setDetectedPhoneme(`Viseme ${viseme} | Volume ${volume}`);

        // Optional haptic feedback
        if (strongHaptic && viseme > 0) {
          navigator.vibrate?.(50); // short vibration
        }
      });
      await engine.startListening();
      renderSpectrum();
    };

    const renderSpectrum = () => {
      if (!ctx || !canvas) return;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple visualization: bars based on visemeId
        const barCount = 6;
        const barWidth = canvas.width / barCount;
        for (let i = 0; i < barCount; i++) {
          const barHeight = i === visemeId ? canvas.height * 0.8 : canvas.height * 0.2;
          ctx.fillStyle = i === visemeId ? '#06b6d4' : '#059669';
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 4, barHeight);
        }

        animationFrameId = requestAnimationFrame(draw);
      };
      draw();
    };

    if (activeState) {
      startEngine();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDetectedPhoneme('Inactive');
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (engine) engine.stopListening();
    };
  }, [activeState, strongHaptic]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2 text-xs font-mono">
        <span className="text-zinc-400">Phoneme Analysis Engine:</span>
        <span className="text-cyan-400 font-bold">{detectedPhoneme}</span>
      </div>
      <div className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 overflow-hidden shadow-inner">
        <canvas ref={canvasRef} width={800} height={100} className="w-full h-24 block" />
      </div>
    </div>
  );
}

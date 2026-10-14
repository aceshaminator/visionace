import React, { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

interface AudioVisualizerProps {
  isActive?: boolean;
  isRecording?: boolean;
}

export default function AudioVisualizer({ isActive, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeState = isActive ?? isRecording ?? false;
  const { strongHaptic } = useAccessibility();
  const [detectedVowel, setDetectedVowel] = useState<string>('Listening...');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;

    const setupAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        renderSpectrum();
      } catch (err) {
        setDetectedVowel('Microphone Offline');
      }
    };

    const renderSpectrum = () => {
      if (!analyser || !ctx || !canvas) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        analyser!.getByteFrequencyData(dataArray);

        // Simple Formant Analysis based on peak frequency ranges
        let maxEnergy = 0;
        let peakIndex = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxEnergy) {
            maxEnergy = dataArray[i];
            peakIndex = i;
          }
        }

        // Estimate vowel based on dominant frequency range
        if (maxEnergy > 100) {
          const sampleRate = audioCtx?.sampleRate || 44100;
          const peakFreq = (peakIndex * sampleRate) / (analyser!.fftSize);

          if (peakFreq >= 700 && peakFreq <= 1100) {
            setDetectedVowel('Vowel Sound: /a/ (Open Mouth)');
          } else if (peakFreq >= 200 && peakFreq <= 600) {
            setDetectedVowel('Vowel Sound: /i/ or /u/ (High/Closed)');
          } else {
            setDetectedVowel('Speech Tone Detected');
          }
        } else {
          setDetectedVowel('Listening...');
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#059669');
          gradient.addColorStop(1, '#06b6d4');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();
    };

    if (activeState) {
      setupAudio();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDetectedVowel('Inactive');
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (audioCtx) audioCtx.close();
    };
  }, [activeState, strongHaptic]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2 text-xs font-mono">
        <span className="text-zinc-400">Phoneme Analysis Engine:</span>
        <span className="text-cyan-400 font-bold">{detectedVowel}</span>
      </div>
      <div className="w-full bg-black/80 border border-zinc-800 rounded-2xl p-4 overflow-hidden shadow-inner">
        <canvas ref={canvasRef} width={800} height={100} className="w-full h-24 block" />
      </div>
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { useStats } from '@/context/StatsContext';
import MouthVisualizer, { PhonemeEntry } from './MouthVisualizer';
import { useVosk } from '@/hooks/useVosk';
import { useRecorder } from '@/hooks/useRecorder';

export default function SpeechTrainer() {
  const { incrementStreak, updateAccuracy } = useStats();
  const { ready, error, sendAudio, finalize, on } = useVosk('https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz');
  const { recording, start, stop, blobUrl, clear } = useRecorder();

  const [timeline, setTimeline] = useState<PhonemeEntry[]>([]);
  const [partialText, setPartialText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const [playTime, setPlayTime] = useState(0);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    on({
      phoneme: (p) => {
        setTimeline(prev => {
          const mapped = p.map((ph: any) => ({
            phoneme: ph.phoneme || ph.ph || ph.phon || ph.phoneme || ph.ph,
            start: (ph.start || 0),
            end: (ph.end || ph.start + 0.08),
            word: ph.word,
          }));
          return [...prev, ...mapped];
        });
      },
      partial: (t) => setPartialText(t),
      final: (t) => setTranscript(t),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      start(stream);

      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        sendAudio(copy);
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsListening(true);
      startTimeRef.current = audioCtx.currentTime;
    } catch (err) {
      console.warn('mic error', err);
    }
  };

  const stopListening = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    stop();
    finalize();
    setIsListening(false);
  };

  const startPractice = (type: string) => {
    incrementStreak();

    let detected: string[] = [];
    if (type === 'Vowel') {
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      detected = vowels.filter(v => transcript.toLowerCase().includes(v));
    } else if (type === 'Consonant') {
      const consonants = ['th', 'sh', 'ch', 'r', 'l'];
      detected = consonants.filter(c => transcript.toLowerCase().includes(c));
    }

    const accuracy = Math.round((detected.length / 5) * 100);
    updateAccuracy(accuracy);

    const el = document.getElementById('speech-feedback');
    if (el) {
      el.textContent = `Started ${type} practice — detected: ${detected.join(', ') || 'none'} — accuracy: ${accuracy}%`;
      el.classList.add('opacity-100');
      setTimeout(() => el.classList.remove('opacity-100'), 2200);
    }
  };

  useEffect(() => {
    if (!blobUrl) return;
    const audio = new Audio(blobUrl);
    playbackRef.current = audio;
    audio.onplay = () => {
      const start = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        setPlayTime(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    audio.onpause = audio.onended = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setPlayTime(0);
    };
    return () => {
      audio.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [blobUrl]);

  const playRecording = () => {
    if (!playbackRef.current && blobUrl) {
      playbackRef.current = new Audio(blobUrl);
    }
    playbackRef.current?.play();
  };

  const stopPlayback = () => {
    playbackRef.current?.pause();
    playbackRef.current = null;
    setPlayTime(0);
  };

  return (
    <div className="p-8 text-center">
      <h2 className="text-3xl font-bold text-cyan-400">Speech Trainer</h2>
      <p className="text-zinc-300 mt-3">Practice vowels, consonants, and articulation exercises here.</p>

      <div className="mt-6 flex justify-center">
        <MouthVisualizer timeline={timeline} playTime={playTime} />
      </div>

      <div className="mt-4 flex gap-3 justify-center">
        {!isListening ? (
          <button onClick={startListening} className="px-4 py-2 rounded bg-cyan-600 text-black">Enable Mic & Recognize</button>
        ) : (
          <button onClick={stopListening} className="px-4 py-2 rounded bg-red-600 text-white">Stop Recognition</button>
        )}
        <button onClick={() => startPractice('Vowel')} className="px-6 py-3 rounded bg-cyan-500">Start Vowel Practice</button>
        <button onClick={() => startPractice('Consonant')} className="px-6 py-3 rounded bg-cyan-700 text-white">Consonant Drills</button>
      </div>

      <div className="mt-6">
        <div className="text-sm text-zinc-400">Transcript (live): <span className="text-white">{partialText || transcript}</span></div>
        <div className="mt-2">
          {blobUrl ? (
            <>
              <button onClick={playRecording} className="px-4 py-2 rounded bg-emerald-500 text-black">Play Recording</button>
              <button onClick={stopPlayback} className="ml-2 px-4 py-2 rounded bg-zinc-700 text-white">Stop</button>
              <button onClick={() => { clear(); setTimeline([]); }} className="ml-2 px-4 py-2 rounded bg-red-500 text-white">Clear</button>
            </>
          ) : <span className="text-zinc-500">No recording yet</span>}
        </div>
      </div>

      <div className="mt-8 p-6 rounded-lg bg-zinc-900 border border-zinc-800">
        <h3 className="text-xl font-semibold text-white">Training Session</h3>
        <p id="speech-feedback" className="text-zinc-400 mt-2 transition-opacity duration-300 opacity-0">Click a practice to begin. Enable the microphone when you want recognition and recording.</p>
      </div>
    </div>
  );
}
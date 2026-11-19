import React, { useEffect, useState, useRef } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import * as THREE from 'three';
import {
  Mic, Hand, Smile, Music, FileText, Globe, Play, Square, Share2, Download, Trash2,
  SlidersHorizontal, Minus, Plus, Loader2, WifiOff, Cloud, Zap, Type, Maximize2, Volume2, X, RotateCcw, ShieldAlert, MessageSquare, Phone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MouthAvatar from './MouthAvatar';
import { TONES, TONE_KEYS, wordsFromText } from './mouthShapes';
import type { MouthPlay, MouthWord, ToneKey } from './mouthShapes';
import { guessVoiceGender, pickVoice, pitchFor } from './voices';
import type { VoiceKind } from './voices';
import { detectThreat, hasProfanity, helpMessage, maskProfanity, smsLink, whatsappLink } from './safety';
import { estimatePitch, guessVoice } from './pitch';

declare const Vosk: any;

// Plain-language reason shown to the person when the microphone cannot start.
function micErrorMessage(err: any): string {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone permission was blocked. Allow the microphone for this app in your phone settings, then try again.';
  }
  if (name === 'NotFoundError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'The microphone is being used by another app. Close it and try again.';
  return `Could not start the microphone: ${err?.message || 'unknown error'}`;
}


type Mode = 'text' | 'dance' | 'avatar' | 'sign' | 'community';

// Order shown on screen. The Alt+number shortcuts stay as they were.
const MODES: { id: Mode; label: string; Icon: LucideIcon; shortcut: string; badge?: string }[] = [
  { id: 'text', label: 'Text', Icon: FileText, shortcut: 'Alt+4' },
  { id: 'sign', label: 'Sign', Icon: Hand, shortcut: 'Alt+1' },
  { id: 'avatar', label: 'Avatar', Icon: Smile, shortcut: 'Alt+2' },
  { id: 'dance', label: 'Dance', Icon: Music, shortcut: 'Alt+3' },
  { id: 'community', label: 'Community', Icon: Globe, shortcut: 'Alt+5', badge: 'Soon' },
];

// Caption text sizes, smallest to largest. The person's choice is remembered on the device.
const CAPTION_SIZES = ['text-lg', 'text-2xl', 'text-3xl', 'text-4xl'];

// Safety settings, kept on the device only.
type Safety = {
  hideRude: boolean;     // hide swear words behind stars (tap to show)
  threatAlerts: boolean; // ask about possible threats
  voiceGuess: boolean;   // guess whether a voice sounds male or female
  contactName: string;
  contactPhone: string;
  emergency: string;
};
const SAFETY_KEY = 'motion_safety';
const DEFAULT_SAFETY: Safety = { hideRude: true, threatAlerts: true, voiceGuess: true, contactName: '', contactPhone: '', emergency: '112' };
const VOICE_LABELS: Record<string, string> = { male: 'Likely male voice', female: 'Likely female voice', unclear: 'Voice unclear' };

// Quick phrases for answering. The person can add and remove their own; they are saved on the device.
const PHRASES_KEY = 'motion_quick_phrases';
const DEFAULT_PHRASES = [
  'Hello',
  'Yes',
  'No',
  'Thank you',
  'Please say that again',
  'Please speak slowly and face me',
  'Please type or write it for me',
  'I cannot hear well',
  'I need help',
  'Where is the restroom?',
];

// Size of the text when a reply is shown full screen: short messages get huge letters.
function overlayFont(text: string): string {
  if (text.length < 20) return '4.5rem';
  if (text.length < 50) return '3rem';
  if (text.length < 110) return '2.25rem';
  return '1.75rem';
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  options: { value: T; label: string; aria: string; icon?: React.ReactNode; activeClass?: string }[];
}) {
  const { label, value, onChange, disabled, options } = props;
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex rounded-xl bg-slate-950 p-1">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.aria}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${focusRing} ${
                on ? o.activeClass || 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Panel(props: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeLabel: string;
  badgeClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          {props.icon}
          {props.title}
        </h2>
        <span aria-label={props.badgeLabel} className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${props.badgeClass}`}>
          {props.badge}
        </span>
      </div>
      {props.children}
    </section>
  );
}

const actionBtn = `flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  rude?: boolean;      // contains swear words
  threat?: boolean;    // matched a possible threat
  voice?: 'male' | 'female' | 'unclear'; // a guess from pitch
  pitchHz?: number;
}

export default function TranscriptTest() {
  const [appMode, setAppMode] = useState<Mode>('text');
  const [provider, setProvider] = useState<'vosk' | 'azure'>('vosk');
  const [activeSpeaker, setActiveSpeaker] = useState<'Speaker 1' | 'Speaker 2'>('Speaker 1');
  const [entries, setEntries] = useState<TranscriptEntry[]>(() => {
    const saved = localStorage.getItem('motion_transcript_entries');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });
  const [status, setStatus] = useState('Loading speech model...');
  const [isReady, setIsReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null);

  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [showBassVisuals, setShowBassVisuals] = useState<boolean>(true);
  const [showMidVisuals, setShowMidVisuals] = useState<boolean>(true);
  const [showTrebleVisuals, setShowTrebleVisuals] = useState<boolean>(true);
  const [hapticIntensity, setHapticIntensity] = useState<number>(100);
  const [visualIntensity, setVisualIntensity] = useState<number>(100);

  const [freqBands, setFreqBands] = useState({ bass: 0, mids: 0, treble: 0 });
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [isBeat, setIsBeat] = useState(false);
  const [bpm, setBpm] = useState<number | null>(120);
  const [currentViseme, setCurrentViseme] = useState<string>('Resting / Neutral');
  const [currentGloss, setCurrentGloss] = useState<string>('READY');
  const [captionSize, setCaptionSize] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('motion_caption_size'));
      return Number.isInteger(v) && v >= 0 && v < CAPTION_SIZES.length ? v : 1;
    } catch { return 1; }
  });

  // Two-way talking: what the person types, their saved phrases, and the full-screen message.
  const [draft, setDraft] = useState('');
  const [phrases, setPhrases] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PHRASES_KEY) || 'null');
      if (Array.isArray(saved) && saved.every((p) => typeof p === 'string')) return saved;
    } catch { /* use the default phrases */ }
    return DEFAULT_PHRASES;
  });
  const [editPhrases, setEditPhrases] = useState(false);
  const [showing, setShowing] = useState<string | null>(null);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  // While the phone speaks a reply, the microphone ignores sound so the phone does not caption its own voice.
  const speakingRef = useRef(false);
  const speakIdRef = useRef(0);

  // Noise filter: the speech engine sometimes turns room noise into words ("huh"). A caption is only kept
  // when the sound behind it was clearly louder than the room's usual background level.
  const [noiseGate, setNoiseGate] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('motion_noise_gate'));
      return v >= 1 && v <= 6 ? v : 2.5;
    } catch { return 2.5; }
  });
  const gateRef = useRef(noiseGate);
  useEffect(() => { gateRef.current = noiseGate; }, [noiseGate]);
  const noiseFloorRef = useRef(0);   // the room's usual background level
  const peakRatioRef = useRef(0);    // loudest moment since the last caption, compared with the background
  const warmupEndRef = useRef(0);    // the first seconds are used to learn the background, nothing is dropped
  const loudRunRef = useRef(0);      // how many blocks in a row were clearly louder than the background
  const lastSpeechAtRef = useRef(0); // the last moment when sustained speech-level sound was heard
  const discardResultsUntilRef = useRef(0); // results arriving before this time are thrown away

  // Mouth avatar: what it is showing, the skin tone, and the practice box.
  const [mouthPlay, setMouthPlay] = useState<MouthPlay | null>(null);
  const [avatarTone, setAvatarTone] = useState<ToneKey>(() => {
    try {
      const v = localStorage.getItem('motion_avatar_tone');
      return v && v in TONES ? (v as ToneKey) : 'brown';
    } catch { return 'brown'; }
  });
  const [practiceText, setPracticeText] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceKind, setVoiceKind] = useState<VoiceKind>(() => {
    try { const v = localStorage.getItem('motion_voice_kind'); return v === 'female' || v === 'male' ? v : 'default'; } catch { return 'default'; }
  });
  const [voiceName, setVoiceName] = useState<string>(() => { try { return localStorage.getItem('motion_voice_name') || ''; } catch { return ''; } });
  const [voicePitch, setVoicePitch] = useState<number>(() => { try { const v = Number(localStorage.getItem('motion_voice_pitch')); return v >= 0.5 && v <= 2 ? v : 1; } catch { return 1; } });
  const [voiceRate, setVoiceRate] = useState<number>(() => { try { const v = Number(localStorage.getItem('motion_voice_rate')); return v >= 0.5 && v <= 1.6 ? v : 0.95; } catch { return 0.95; } });
  const [voiceOpen, setVoiceOpen] = useState(false);

  // Safety: settings, the current alert, hidden-word reveals, and the location for the help message.
  const [safety, setSafety] = useState<Safety>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
      return raw && typeof raw === 'object' ? { ...DEFAULT_SAFETY, ...raw } : DEFAULT_SAFETY;
    } catch { return DEFAULT_SAFETY; }
  });
  const safetyRef = useRef(safety);
  useEffect(() => { safetyRef.current = safety; }, [safety]);
  const updateSafety = (patch: Partial<Safety>) => {
    setSafety((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SAFETY_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const [threat, setThreat] = useState<{ id: string; text: string; phrase: string; confirmed: boolean | null } | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [helpLoc, setHelpLoc] = useState('');
  const pitchSamplesRef = useRef<number[]>([]);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState('');
  const raiseThreat = (id: string, text: string, phrase: string) => {
    setThreat({ id, text, phrase, confirmed: null });
    try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* not available */ }
  };
  const [practiceSlow, setPracticeSlow] = useState(true);
  const levelFloorRef = useRef(0); // the room's usual loudness as the mouth sees it
  const playMouth = (words: MouthWord[], speed = 1) => {
    if (words.length) setMouthPlay({ id: Math.random(), at: Date.now(), words, speed });
  };

  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowing(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showing]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* not available */ } }, []);

  useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const azureRecognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarContainerRef = useRef<HTMLDivElement | null>(null);
  const signContainerRef = useRef<HTMLDivElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const beatTimestampsRef = useRef<number[]>([]);
  const lastVibrateTimeRef = useRef<number>(0);
  const metronomeIntervalRef = useRef<any>(null);

  const mouthMeshRef = useRef<THREE.Mesh | null>(null);
  const upperTeethRef = useRef<THREE.Mesh | null>(null);
  const lowerTeethRef = useRef<THREE.Mesh | null>(null);
  const tongueRef = useRef<THREE.Mesh | null>(null);
  const headAnimFrameRef = useRef<number | null>(null);
  const signAnimFrameRef = useRef<number | null>(null);
  
  const currentScaleYRef = useRef<number>(1);
  const currentScaleXRef = useRef<number>(1);
  const currentPosYRef = useRef<number>(-0.35);

  const hapticIntensityRef = useRef<number>(100);
  const visualIntensityRef = useRef<number>(100);
  const bassVisualsRef = useRef<boolean>(true);
  const midVisualsRef = useRef<boolean>(true);
  const trebleVisualsRef = useRef<boolean>(true);

  useEffect(() => {
    hapticIntensityRef.current = hapticIntensity;
    visualIntensityRef.current = visualIntensity;
    bassVisualsRef.current = showBassVisuals;
    midVisualsRef.current = showMidVisuals;
    trebleVisualsRef.current = showTrebleVisuals;
  }, [hapticIntensity, visualIntensity, showBassVisuals, showMidVisuals, showTrebleVisuals]);

  // Global Keyboard Shortcuts for Accessibility (Alt + 1 to 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') setAppMode('sign');
        if (e.key === '2') setAppMode('avatar');
        if (e.key === '3') setAppMode('dance');
        if (e.key === '4') setAppMode('text');
        if (e.key === '5') setAppMode('community');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const confidenceSumRef = useRef<number>(0);
  const confidenceCountRef = useRef<number>(0);

  // The speech model keeps running for the whole session, so it reads the current speaker from here
  // instead of being reloaded (41 MB) every time the speaker button is pressed.
  const activeSpeakerRef = useRef<'Speaker 1' | 'Speaker 2'>(activeSpeaker);
  useEffect(() => { activeSpeakerRef.current = activeSpeaker; }, [activeSpeaker]);

  // Initialize Three.js Sign Language Canvas & Articulated Skeletal Rig
  useEffect(() => {
    if (appMode !== 'sign') return;
    let timerId: number;

    const initSignAvatar = () => {
      if (!signContainerRef.current) return;
      const container = signContainerRef.current;
      const width = container.clientWidth || 700;
      const height = 260;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0b0f19');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, -0.5, 3.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
      pointLight.position.set(2, 3, 4);
      scene.add(pointLight);

      const rigGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#151c2c', roughness: 0.3 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 1.0, 16), bodyMat);
      torso.position.set(0, -1.0, 0);
      rigGroup.add(torso);

      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), bodyMat);
      headMesh.position.set(0, -0.2, 0);
      rigGroup.add(headMesh);

      const createArticulatedHand = () => {
        const handGroup = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.3 });
        const fingerJoints: THREE.Group[] = [];

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), skinMat);
        palm.position.set(0, -0.65, 0);
        handGroup.add(palm);

        for (let i = 0; i < 5; i++) {
          const fingerBase = new THREE.Group();
          fingerBase.position.set((i - 2) * 0.038, -0.74, 0);
          const phalanx = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.02), skinMat);
          phalanx.position.set(0, -0.05, 0);
          fingerBase.add(phalanx);
          handGroup.add(fingerBase);
          fingerJoints.push(fingerBase);
        }
        return { handGroup, fingerJoints };
      };

      const leftHandData = createArticulatedHand();
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-0.45, -0.6, 0);
      const armMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2 });
      const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.7), armMat);
      leftForearm.position.set(0, -0.35, 0);
      leftArmGroup.add(leftForearm);
      leftArmGroup.add(leftHandData.handGroup);
      rigGroup.add(leftArmGroup);

      const rightHandData = createArticulatedHand();
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(0.45, -0.6, 0);
      const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.7), armMat);
      rightForearm.position.set(0, -0.35, 0);
      rightArmGroup.add(rightForearm);
      rightArmGroup.add(rightHandData.handGroup);
      rigGroup.add(rightArmGroup);

      scene.add(rigGroup);

      const clock = new THREE.Clock();
      const animateSign = () => {
        const dt = clock.getDelta();
        const t = clock.getElapsedTime();

        let targetFingerCurl = 0.3;
        let leftArmTargetZ = Math.sin(t * 3) * 0.3 + 0.3;
        let rightArmTargetZ = -Math.sin(t * 3) * 0.3 - 0.3;

        if (currentGloss.includes('HELLO') || currentGloss.includes('HI')) {
          targetFingerCurl = 0.1;
          rightArmTargetZ = -1.2 + Math.sin(t * 6) * 0.4;
        } else if (currentGloss.includes('YES') || currentGloss.includes('TRUE')) {
          targetFingerCurl = 1.2;
        } else if (currentGloss.includes('THANK') || currentGloss.includes('THANKS')) {
          targetFingerCurl = 0.0;
        }

        leftArmGroup.rotation.z = THREE.MathUtils.damp(leftArmGroup.rotation.z, leftArmTargetZ, 8, dt);
        rightArmGroup.rotation.z = THREE.MathUtils.damp(rightArmGroup.rotation.z, rightArmTargetZ, 8, dt);
        leftArmGroup.rotation.x = Math.cos(t * 2) * 0.2;
        rightArmGroup.rotation.x = Math.cos(t * 2) * 0.2;

        leftHandData.fingerJoints.forEach(joint => { joint.rotation.x = THREE.MathUtils.damp(joint.rotation.x, targetFingerCurl, 10, dt); });
        rightHandData.fingerJoints.forEach(joint => { joint.rotation.x = THREE.MathUtils.damp(joint.rotation.x, targetFingerCurl, 10, dt); });

        renderer.render(scene, camera);
        signAnimFrameRef.current = requestAnimationFrame(animateSign);
      };
      animateSign();
    };

    timerId = requestAnimationFrame(initSignAvatar);
    return () => {
      cancelAnimationFrame(timerId);
      if (signAnimFrameRef.current) cancelAnimationFrame(signAnimFrameRef.current);
    };
  }, [appMode, currentGloss]);

  // Initialize Vosk engine on mount
  useEffect(() => {
    let isMounted = true;
    async function initVosk() {
      try {
        setStatus('Loading local Vosk model...');
        const model = await Vosk.createModel('/models/vosk-model-small-en-us-0.15.zip');
        if (!isMounted) { try { model.terminate(); } catch (e) { /* already gone */ } return; }
        modelRef.current = model;
        const recognizer = new model.KaldiRecognizer(16000);
        recognizerRef.current = recognizer;
        try { recognizer.setWords(true); } catch (e) { /* older engine build: confidence stays unavailable */ }

        recognizer.on('result', (message: any) => {
          if (performance.now() < discardResultsUntilRef.current) { peakRatioRef.current = 0; pitchSamplesRef.current = []; return; }
          const heardRatio = peakRatioRef.current;
          peakRatioRef.current = 0;
          if (performance.now() > warmupEndRef.current && heardRatio < gateRef.current) { pitchSamplesRef.current = []; return; } // quiet noise, not speech
          if (message.result && message.result.text) {
            if (Array.isArray(message.result.result)) {
              message.result.result.forEach((w: any) => {
                if (typeof w.conf === 'number') {
                  confidenceSumRef.current += w.conf;
                  confidenceCountRef.current += 1;
                  setAvgConfidence(Number((confidenceSumRef.current / confidenceCountRef.current).toFixed(2)));
                }
              });
            }
            const text = message.result.text;
            setCurrentGloss(text.toUpperCase());
            const heard: MouthWord[] = Array.isArray(message.result.result)
              ? message.result.result
                  .filter((w: any) => typeof w.start === 'number' && typeof w.end === 'number')
                  .map((w: any) => ({ word: String(w.word), start: w.start, end: w.end }))
              : [];
            playMouth(heard.length ? heard : wordsFromText(text, Math.max(0.8, text.length * 0.085)));
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const th = detectThreat(text);
            const vg = guessVoice(pitchSamplesRef.current);
            pitchSamplesRef.current = [];
            const newEntry: TranscriptEntry = {
              id: Math.random().toString(36).substring(2),
              speaker: `${activeSpeakerRef.current} (Local)`,
              text,
              timestamp: now,
              rude: hasProfanity(text),
              threat: !!th,
              voice: vg ? vg.voice : undefined,
              pitchHz: vg ? vg.hz : undefined,
            };
            if (th && safetyRef.current.threatAlerts) raiseThreat(newEntry.id, text, th.phrase);
            setEntries((prev) => {
              const updated = [...prev, newEntry];
              localStorage.setItem('motion_transcript_entries', JSON.stringify(updated));
              return updated;
            });
          }
        });
        setIsReady(true);
        setStatus('Engine Ready!');
      } catch (err: any) {
        setStatus(`Error loading model: ${err.message}`);
      }
    }
    initVosk();
    return () => {
      isMounted = false;
      if (recognizerRef.current) recognizerRef.current.remove();
      if (modelRef.current) modelRef.current.terminate();
      recognizerRef.current = null;
      modelRef.current = null;
    };
  }, []);

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

  useEffect(() => {
    if (metronomeEnabled && recording && bpm) {
      const intervalMs = (60 / bpm) * 1000;
      metronomeIntervalRef.current = setInterval(() => {
        if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(Math.round(40 * (hapticIntensityRef.current / 100)));
        }
      }, intervalMs);
    } else {
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
    }
    return () => { if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current); };
  }, [metronomeEnabled, recording, bpm, hapticsEnabled]);

  const triggerHaptics = (bass: number, mids: number, treble: number) => {
    if (!hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const now = Date.now();
    if (now - lastVibrateTimeRef.current < 80) return;
    const mult = hapticIntensityRef.current / 100;
    if (bass > 180) { navigator.vibrate(Math.round(60 * mult)); lastVibrateTimeRef.current = now; }
    else if (mids > 160) { navigator.vibrate(Math.round(30 * mult)); lastVibrateTimeRef.current = now; }
    else if (treble > 150) { navigator.vibrate(Math.round(10 * mult)); lastVibrateTimeRef.current = now; }
  };

  const setupAudioAnalysis = (audioContext: AudioContext, source: MediaStreamAudioSourceNode) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const nyquist = audioContext.sampleRate / 2;
    const binSize = nyquist / bufferLength;

    const getRangeAvg = (lowHz: number, highHz: number) => {
      const startBin = Math.floor(lowHz / binSize);
      const endBin = Math.min(Math.floor(highHz / binSize), bufferLength - 1);
      if (startBin > endBin) return 0;
      let sum = 0;
      for (let i = startBin; i <= endBin; i++) sum += dataArray[i];
      return Math.round(sum / (endBin - startBin + 1));
    };

    let waveOffset = 0, arrowPulse = 0;
    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);
      const bassAvg = getRangeAvg(20, 250);
      const midsAvg = getRangeAvg(250, 2000);
      const trebleAvg = getRangeAvg(2000, 8000);

      setFreqBands({ bass: bassAvg, mids: midsAvg, treble: trebleAvg });
      triggerHaptics(bassAvg, midsAvg, trebleAvg);

      const now = Date.now();
      let detectedBeat = false;
      if (bassAvg > 180) {
        detectedBeat = true;
        setIsBeat(true);
        beatTimestampsRef.current.push(now);
        beatTimestampsRef.current = beatTimestampsRef.current.filter((t: number) => now - t <= 10000);
        if (beatTimestampsRef.current.length > 2) {
          const durationMin = (beatTimestampsRef.current[beatTimestampsRef.current.length - 1] - beatTimestampsRef.current[0]) / 60000;
          const calculatedBpm = Math.round((beatTimestampsRef.current.length - 1) / durationMin);
          if (calculatedBpm > 40 && calculatedBpm < 220) setBpm(calculatedBpm);
        }
      } else {
        setIsBeat(false);
      }

      if (ctx && canvas && appMode === 'dance') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;
        const visMult = visualIntensityRef.current / 100;
        const beatBoost = detectedBeat ? 1.25 : 1.0;

        if (bassVisualsRef.current) {
          ctx.beginPath();
          ctx.arc(cx, cy, (30 + (bassAvg / 255) * 80 * visMult) * beatBoost, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${Math.min(1, (0.4 + (bassAvg / 255) * 0.6) * visMult)})`;
          ctx.lineWidth = (detectedBeat ? 5 : 2.5) * visMult;
          ctx.stroke();
        }
        if (midVisualsRef.current) {
          waveOffset += detectedBeat ? 0.12 : 0.05;
          ctx.beginPath();
          ctx.moveTo(0, cy);
          for (let x = 0; x < canvas.width; x++) {
            ctx.lineTo(x, cy + Math.sin(x * 0.03 + waveOffset) * (((midsAvg / 255) * 40 * visMult) * beatBoost));
          }
          ctx.strokeStyle = detectedBeat ? `rgba(245, 158, 11, ${Math.min(1, visMult)})` : `rgba(245, 158, 11, ${Math.min(1, 0.7 * visMult)})`;
          ctx.lineWidth = (detectedBeat ? 3 : 2) * visMult;
          ctx.stroke();
        }
        if (trebleVisualsRef.current) {
          arrowPulse = detectedBeat ? 1 : Math.max(0.3, arrowPulse - 0.04);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(1, arrowPulse * visMult)})`;
          ctx.fillStyle = `rgba(56, 189, 248, ${Math.min(1, arrowPulse * 0.8 * visMult)})`;
          ctx.lineWidth = (detectedBeat ? 4 : 2) * visMult;
          const arrowDist = (60 + (bassAvg / 255) * 15 * visMult) * beatBoost;
          [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((angle) => {
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -arrowDist);
            ctx.lineTo(-9, -arrowDist + 16);
            ctx.lineTo(9, -arrowDist + 16);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
          ctx.restore();
        }
      }
      animFrameRef.current = requestAnimationFrame(analyze);
    };
    analyze();
  };

  const startRecording = async () => {
    if (provider === 'vosk') {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          alert('The microphone needs a secure (https) connection. Open the app from its https address.');
          return;
        }
        if (!isReady || !recognizerRef.current) { alert('Local model is still loading...'); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        streamRef.current = stream;
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        noiseFloorRef.current = 0;
        levelFloorRef.current = 0;
        peakRatioRef.current = 0;
        warmupEndRef.current = performance.now() + 2000;
        pitchSamplesRef.current = [];
        loudRunRef.current = 0;
        lastSpeechAtRef.current = 0;
        discardResultsUntilRef.current = 0;
        processor.onaudioprocess = (e) => {
          if (speakingRef.current) return;
          const ch = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
          const rms = Math.sqrt(sum / ch.length);
          let floor = noiseFloorRef.current;
          if (floor === 0) floor = rms;
          else if (rms < floor) floor = floor * 0.6 + rms * 0.4;            // quieter: follow down quickly
          else if (rms < floor * 2) floor += (rms - floor) * 0.02;          // slowly rising background: follow up
          noiseFloorRef.current = Math.max(floor, 0.0005);
          const ratio = rms / noiseFloorRef.current;
          if (ratio > peakRatioRef.current) peakRatioRef.current = ratio;
          // Speech lasts longer than a click or a bump, so it takes two loud blocks in a row to count.
          if (ratio >= gateRef.current) {
            loudRunRef.current += 1;
            if (loudRunRef.current >= 2) lastSpeechAtRef.current = performance.now();
          } else {
            loudRunRef.current = 0;
          }
          // While someone is clearly speaking, measure the pitch of the voice (for the male or female guess).
          if (ratio >= gateRef.current && safetyRef.current.voiceGuess) {
            for (let w = 0; w + 1024 <= ch.length; w += 1024) {
              const hz = estimatePitch(ch.subarray(w, w + 1024), e.inputBuffer.sampleRate);
              if (hz && pitchSamplesRef.current.length < 300) pitchSamplesRef.current.push(hz);
            }
          }
          try { recognizerRef.current.acceptWaveform(e.inputBuffer); } catch (err) {}
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        setupAudioAnalysis(audioContext, source);
        setRecording(true);
        setStatus('Recording via Vosk (Offline)...');
      } catch (err: any) {
        console.error(err);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        const msg = micErrorMessage(err);
        setStatus(msg);
        alert(msg);
      }
    } else {
      const subKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
      const reg = import.meta.env.VITE_AZURE_SPEECH_REGION;
      if (!subKey || !reg) { alert('Azure credentials missing.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        streamRef.current = stream;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        setupAudioAnalysis(audioContext, audioContext.createMediaStreamSource(stream));

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subKey, reg);
        speechConfig.speechRecognitionLanguage = 'en-US';
        speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, SpeechSDK.AudioConfig.fromDefaultMicrophoneInput());
        azureRecognizerRef.current = recognizer;

        recognizer.recognized = (s, e) => {
          if (speakingRef.current) return;
          if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
            try {
              const j = JSON.parse(e.result.json);
              if (j.NBest?.[0]?.Confidence) {
                confidenceSumRef.current += j.NBest[0].Confidence;
                confidenceCountRef.current += 1;
                setAvgConfidence(Number((confidenceSumRef.current / confidenceCountRef.current).toFixed(2)));
              }
            } catch (err) {}
            const text = e.result.text;
            setCurrentGloss(text.toUpperCase());
            playMouth(wordsFromText(text, Math.max(0.8, (Number(e.result.duration) || 0) / 1e7 || text.length * 0.085)));
            const th = detectThreat(text);
            if (th && safetyRef.current.threatAlerts) raiseThreat(Math.random().toString(36).substring(2), text, th.phrase);
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setEntries((prev) => {
              const updated = [...prev, { id: Math.random().toString(36).substring(2), speaker: `${activeSpeakerRef.current} (Cloud)`, text, timestamp: now, rude: hasProfanity(text), threat: !!detectThreat(text) }];
              localStorage.setItem('motion_transcript_entries', JSON.stringify(updated));
              return updated;
            });
          }
        };
        recognizer.startContinuousRecognitionAsync(() => { setRecording(true); setStatus('Recording via Azure AI Speech...'); });
      } catch (err: any) {
        console.error(err);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
        const msg = micErrorMessage(err);
        setStatus(msg);
        alert(msg);
      }
    }
  };

  const stopRecording = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (metronomeIntervalRef.current) { clearInterval(metronomeIntervalRef.current); metronomeIntervalRef.current = null; }
    if (provider === 'vosk' && processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
      // Always empty the engine so no half-heard noise stays inside it. The words it gives back are kept
      // only when someone was clearly speaking just before Stop; otherwise they are noise and are dropped.
      const spokeJustNow = performance.now() - lastSpeechAtRef.current < 2000;
      discardResultsUntilRef.current = spokeJustNow ? 0 : performance.now() + 1500;
      try { recognizerRef.current?.retrieveFinalResult(); } catch (e) { /* nothing pending */ }
    }
    if (provider === 'azure' && azureRecognizerRef.current) {
      azureRecognizerRef.current.stopContinuousRecognitionAsync(() => { azureRecognizerRef.current?.close(); azureRecognizerRef.current = null; });
    }
    if (audioContextRef.current?.state !== 'closed') { audioContextRef.current?.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setFreqBands({ bass: 0, mids: 0, treble: 0 });
    setIsBeat(false);
    setRecording(false);
    setStatus('Engine Ready!');
  };

  const fullText = entries.filter(e => e.speaker !== 'You').map(e => e.text).join(' ');
  const vowels = fullText.toLowerCase().match(/[aeiou]/g)?.length || 0;
  const consonants = fullText.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]/g)?.length || 0;

  const exportText = (e: TranscriptEntry) => (safetyRef.current.hideRude && e.rude ? maskProfanity(e.text) : e.text);

  const downloadTxt = () => {
    const f = entries.map(e => `[${e.timestamp}] ${e.speaker}: ${exportText(e)}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f], { type: 'text/plain' }));
    a.download = `motion-${Date.now()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadJson = () => {
    const d = { timestamp: new Date().toISOString(), entries: entries.map(e => ({ ...e, text: exportText(e) })), analysis: { vowels, consonants, avgConfidence, bpm } };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
    a.download = `motion-${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const shareTranscript = async () => {
    const f = entries.map(e => `[${e.timestamp}] ${e.speaker}: ${exportText(e)}`).join('\n');
    if (navigator.share) { try { await navigator.share({ title: 'Motion Transcript', text: f }); } catch (e) {} }
    else { navigator.clipboard.writeText(f); alert('Copied to clipboard!'); }
  };

  const clearTranscript = () => {
    setEntries([]); localStorage.removeItem('motion_transcript_entries');
    confidenceSumRef.current = 0; confidenceCountRef.current = 0; setAvgConfidence(null); setBpm(null); setCurrentGloss('READY');
  };

  const changeCaptionSize = (delta: number) => {
    const next = Math.min(CAPTION_SIZES.length - 1, Math.max(0, captionSize + delta));
    setCaptionSize(next);
    try { localStorage.setItem('motion_caption_size', String(next)); } catch { /* storage unavailable */ }
  };

  const addReplyEntry = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry: TranscriptEntry = { id: Math.random().toString(36).substring(2), speaker: 'You', text, timestamp: now };
    setEntries((prev) => {
      const updated = [...prev, entry];
      try { localStorage.setItem('motion_transcript_entries', JSON.stringify(updated)); } catch { /* storage unavailable */ }
      return updated;
    });
  };

  const showReply = () => {
    const text = draft.trim();
    if (!text) return;
    addReplyEntry(text);
    setDraft('');
    setShowing(text);
  };

  const saveVoice = (kind: VoiceKind, name: string, pitch: number, rate: number) => {
    try {
      localStorage.setItem('motion_voice_kind', kind);
      localStorage.setItem('motion_voice_name', name);
      localStorage.setItem('motion_voice_pitch', String(pitch));
      localStorage.setItem('motion_voice_rate', String(rate));
    } catch { /* storage unavailable */ }
  };
  const chooseVoiceKind = (kind: VoiceKind) => {
    let name = '';
    let pitch = 1;
    if (kind !== 'default') {
      const v = pickVoice(voices, kind, navigator.language || 'en-US');
      name = v ? v.name : '';
      pitch = pitchFor(kind, v);
    }
    setVoiceKind(kind);
    setVoiceName(name);
    setVoicePitch(pitch);
    saveVoice(kind, name, pitch, voiceRate);
  };
  const makeUtterance = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.name === voiceName);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = voicePitch;
    u.rate = voiceRate;
    return u;
  };
  const testVoice = () => {
    if (!canSpeak) return;
    const u = makeUtterance('Hello, this is how I will sound.');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const speakReply = () => {
    const text = draft.trim();
    if (!text || !canSpeak) return;
    addReplyEntry(text);
    setDraft('');
    playMouth(wordsFromText(text, Math.max(0.8, text.length * 0.08)));
    const id = ++speakIdRef.current;
    const release = (delay: number) => window.setTimeout(() => { if (speakIdRef.current === id) speakingRef.current = false; }, delay);
    const u = makeUtterance(text);
    u.onend = () => release(800);
    u.onerror = () => release(800);
    speakingRef.current = true;
    release(text.length * 90 + 3000); // safety: never leave the microphone muted if the phone never reports the end
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const savePhrases = (next: string[]) => {
    setPhrases(next);
    try { localStorage.setItem(PHRASES_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const savePhrase = () => {
    const text = draft.trim();
    if (!text || phrases.includes(text)) return;
    savePhrases([...phrases, text].slice(-30));
  };
  const removePhrase = (p: string) => savePhrases(phrases.filter((x) => x !== p));

  // How loud the sound is right now, compared with the room's usual background (0 = nothing, 1 = loud).
  const getMicLevel = () => {
    const an = analyserRef.current;
    if (!an || !recording || speakingRef.current) return 0;
    const n = an.fftSize;
    const buf = new Float32Array(n); // fine-grained samples, the same scale the noise filter uses
    an.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / n);
    let floor = levelFloorRef.current;
    if (floor === 0) floor = rms;
    else if (rms < floor) floor = floor * 0.9 + rms * 0.1;               // quieter: follow down
    else if (rms < floor * 2) floor += (rms - floor) * 0.01;             // slowly rising background: follow up
    floor = Math.max(floor, 0.0004);
    levelFloorRef.current = floor;
    if (rms < 0.004) return 0;                                           // too quiet to be speech
    return Math.min(1, Math.max(0, (rms / floor - gateRef.current) / 6));
  };

  const mouthSpeed = practiceSlow ? 0.5 : 1;
  const playPractice = () => {
    const t = practiceText.trim();
    if (!t) return;
    playMouth(wordsFromText(t, Math.max(0.6, t.replace(/\s+/g, ' ').length * 0.085)), mouthSpeed);
  };
  const replayMouth = () => {
    if (mouthPlay) setMouthPlay({ ...mouthPlay, id: Math.random(), at: Date.now(), speed: mouthSpeed });
  };

  // Lets the person type a sentence to see what the checks would do, including the real alert.
  const runCheckTest = () => {
    const t = testText.trim();
    if (!t) return;
    const th = detectThreat(t);
    const rude = hasProfanity(t);
    setTestResult(
      `${th ? `Threat: yes (${th.kind}, matched "${th.phrase}")${safety.threatAlerts ? '. The alert is shown at the top.' : '. Alerts are switched off, so no alert is shown.'}` : 'Threat: no'}. ` +
      `${rude ? `Rude words: yes, shown as "${maskProfanity(t)}"` : 'Rude words: no'}.`,
    );
    if (th && safety.threatAlerts) raiseThreat('test-' + Date.now(), t, th.phrase);
  };

  const confirmThreat = (yes: boolean) => {
    if (!threat) return;
    if (!yes) { setThreat(null); return; }
    setThreat({ ...threat, confirmed: true });
    setHelpLoc('');
    // Find the location now, so the message is ready when the person taps it.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setHelpLoc(`https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
        () => setHelpLoc(''),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    }
  };
  const helpBody = helpMessage(threat ? threat.text : '', helpLoc, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const bigAction = `flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition ${focusRing}`;

  const canStart = provider === 'azure' || isReady;
  const statusTone = recording
    ? 'border-red-500/40 bg-red-500/10 text-red-200'
    : isReady
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  const statusDot = recording ? 'bg-red-400' : isReady ? 'bg-emerald-400' : 'bg-amber-400';

  return (
    <div role="main" aria-label="Motion Accessibility Application" className="min-h-screen bg-slate-950 font-sans text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10">
        {/* Header */}
        <header className="mb-4 flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              recording ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            <Mic className={`h-6 w-6 ${recording ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight">Motion</h1>
            <p className="text-xs text-slate-400">Speech made visible, by VisionAce</p>
          </div>
        </header>

        {/* Mode navigation: bottom bar on phones, top bar on wider screens */}
        <nav
          aria-label="App modes"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mb-4 md:rounded-2xl md:border md:bg-slate-900 md:p-1.5"
        >
          <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 md:flex">
            {MODES.map((m) => {
              const on = appMode === m.id;
              return (
                <li key={m.id} className="md:flex-1">
                  <button
                    type="button"
                    onClick={() => setAppMode(m.id)}
                    aria-current={on ? 'page' : undefined}
                    aria-label={`${m.label} mode. Shortcut: ${m.shortcut}`}
                    title={`${m.label} (${m.shortcut})`}
                    className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition md:min-h-[44px] md:flex-row md:gap-2 md:text-sm ${focusRing} ${
                      on ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <m.Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{m.label}</span>
                    {m.badge && (
                      <span className="hidden rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300 md:inline">
                        {m.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Threat alert: shown on every screen, pinned to the top */}
        {threat && (
          <div role="alert" className="sticky top-2 z-40 mb-3 max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-red-500 bg-slate-950 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-200">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
              <h3 className="text-lg font-bold">Possible threat heard</h3>
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-50">&ldquo;{threat.text}&rdquo;</p>
            {threat.confirmed === null ? (
              <>
                <p className="mt-2 text-sm text-slate-200">Motion can make mistakes. Did someone threaten you?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => confirmThreat(true)} className={`${bigAction} bg-red-600 text-white hover:bg-red-500`}>
                    Yes, I feel threatened
                  </button>
                  <button type="button" onClick={() => confirmThreat(false)} className={`${bigAction} border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800`}>
                    No, a mistake or a joke
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-slate-200">Move toward other people and light. You do not have to answer or argue.</p>
                {safety.contactPhone ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a href={smsLink(safety.contactPhone, helpBody)} className={`${bigAction} bg-red-600 text-white hover:bg-red-500`}>
                      <MessageSquare className="h-5 w-5" aria-hidden="true" /> Text {safety.contactName || 'my contact'} with my location
                    </a>
                    <a href={whatsappLink(safety.contactPhone, helpBody)} className={`${bigAction} bg-emerald-600 text-white hover:bg-emerald-500`}>
                      <MessageSquare className="h-5 w-5" aria-hidden="true" /> WhatsApp {safety.contactName || 'my contact'}
                    </a>
                  </div>
                ) : (
                  <button type="button" onClick={() => setSafetyOpen(true)} className={`${bigAction} w-full border border-amber-500 bg-amber-500/10 text-amber-200`}>
                    No trusted contact saved. Add one in Safety settings below
                  </button>
                )}
                <p className="text-xs text-slate-300">
                  {helpLoc ? 'Your location is in the message.' : 'Finding your location. You can send now; it is added if found.'} The message opens ready to send. You tap Send.
                </p>
                <button
                  type="button"
                  onClick={() => setShowing('I am deaf and I need help. Please stay with me and call for help.')}
                  className={`${bigAction} w-full bg-sky-500 text-slate-950 hover:bg-sky-400`}
                >
                  <Maximize2 className="h-5 w-5" aria-hidden="true" /> Show &ldquo;I need help&rdquo; to people nearby
                </button>
                <a href={`tel:${safety.emergency}`} className={`${bigAction} w-full border border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800`}>
                  <Phone className="h-5 w-5" aria-hidden="true" /> Call {safety.emergency} (a voice call, ask someone nearby to speak)
                </a>
                <button type="button" onClick={() => setThreat(null)} className={`w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 underline-offset-2 hover:underline ${focusRing}`}>
                  Close this alert
                </button>
              </div>
            )}
          </div>
        )}



        {appMode !== 'community' && (
          <>
            {/* Status */}
            <div role="status" aria-live="polite" className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${statusTone}`}>
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot} ${recording ? 'animate-pulse motion-reduce:animate-none' : ''}`}
              />
              <span>{status}</span>
            </div>

            {/* Settings */}
            <section aria-label="Settings" className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Segmented<'vosk' | 'azure'>
                  label="Engine"
                  value={provider}
                  onChange={setProvider}
                  disabled={recording}
                  options={[
                    { value: 'vosk', label: 'Offline', aria: 'Use Vosk offline engine', icon: <WifiOff className="h-4 w-4" aria-hidden="true" />, activeClass: 'bg-emerald-500/20 text-emerald-300' },
                    { value: 'azure', label: 'Cloud', aria: 'Use Azure cloud engine', icon: <Cloud className="h-4 w-4" aria-hidden="true" />, activeClass: 'bg-sky-500/20 text-sky-300' },
                  ]}
                />
                {appMode === 'text' && (
                  <Segmented<'Speaker 1' | 'Speaker 2'>
                    label="Speaker"
                    value={activeSpeaker}
                    onChange={setActiveSpeaker}
                    options={[
                      { value: 'Speaker 1', label: '1', aria: 'Set active speaker to 1', activeClass: 'bg-sky-500/20 text-sky-300' },
                      { value: 'Speaker 2', label: '2', aria: 'Set active speaker to 2', activeClass: 'bg-violet-500/20 text-violet-300' },
                    ]}
                  />
                )}
                {appMode === 'text' && provider === 'vosk' && (
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Noise filter
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={noiseGate}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setNoiseGate(v);
                        try { localStorage.setItem('motion_noise_gate', String(v)); } catch { /* storage unavailable */ }
                      }}
                      aria-label="Noise filter strength. Higher ignores more quiet sounds."
                      className="w-28 accent-emerald-500"
                    />
                    <span className="w-8 normal-case text-slate-200">{noiseGate <= 1 ? 'Off' : noiseGate}</span>
                  </label>
                )}
              </div>
              {appMode === 'dance' && (
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  aria-expanded={showAdvancedControls}
                  className={`flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${focusRing} ${
                    showAdvancedControls ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Advanced
                </button>
              )}
            </section>

            {/* Dance: advanced controls */}
            {appMode === 'dance' && showAdvancedControls && (
              <section className="mb-4 rounded-2xl border border-sky-500/40 bg-slate-900 p-4 text-sm text-slate-200">
                <h3 className="mb-3 font-bold text-sky-300">Dance and haptic settings</h3>
                <div className="mb-4 flex flex-wrap gap-x-5 gap-y-3">
                  {[
                    { label: 'Bass visuals', on: showBassVisuals, set: setShowBassVisuals },
                    { label: 'Mid visuals', on: showMidVisuals, set: setShowMidVisuals },
                    { label: 'Treble visuals', on: showTrebleVisuals, set: setShowTrebleVisuals },
                    { label: 'Haptics', on: hapticsEnabled, set: setHapticsEnabled },
                    { label: 'Metronome', on: metronomeEnabled, set: setMetronomeEnabled },
                  ].map((c) => (
                    <label key={c.label} className="flex min-h-[32px] cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={c.on} onChange={(e) => c.set(e.target.checked)} />
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex justify-between"><span>Haptic strength</span><strong>{hapticIntensity}%</strong></span>
                    <input type="range" min="50" max="200" value={hapticIntensity} onChange={(e) => setHapticIntensity(Number(e.target.value))} aria-label="Haptic intensity slider" className="w-full accent-emerald-500" />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex justify-between"><span>Visual size</span><strong>{visualIntensity}%</strong></span>
                    <input type="range" min="50" max="200" value={visualIntensity} onChange={(e) => setVisualIntensity(Number(e.target.value))} aria-label="Visual scale brightness slider" className="w-full accent-emerald-500" />
                  </label>
                </div>
              </section>
            )}

            {/* Recording controls */}
            <section aria-label="Recording controls" className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={!recording && !canStart}
                aria-label={recording ? 'Stop Recording' : 'Start Recording'}
                className={`flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl text-lg font-bold transition disabled:cursor-not-allowed ${focusRing} ${
                  recording
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : canStart
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-slate-800 text-slate-300'
                }`}
              >
                {recording ? (
                  <>
                    <Square className="h-6 w-6" aria-hidden="true" /> Stop listening
                  </>
                ) : canStart ? (
                  <>
                    <Play className="h-6 w-6" aria-hidden="true" /> Start listening
                  </>
                ) : (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading speech model...
                  </>
                )}
              </button>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <button type="button" onClick={shareTranscript} disabled={entries.length === 0} className={actionBtn} aria-label="Share Transcript">
                  <Share2 className="h-4 w-4" aria-hidden="true" /> Share
                </button>
                <button type="button" onClick={downloadTxt} disabled={entries.length === 0} className={actionBtn} aria-label="Download as Text File">
                  <Download className="h-4 w-4" aria-hidden="true" /> .txt
                </button>
                <button type="button" onClick={downloadJson} disabled={entries.length === 0} className={actionBtn} aria-label="Download as JSON File">
                  <Download className="h-4 w-4" aria-hidden="true" /> .json
                </button>
                <button type="button" onClick={clearTranscript} className={actionBtn} aria-label="Clear Transcript">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear
                </button>
              </div>
            </section>
          </>
        )}

        {/* ACTIVE MODES */}
        {appMode === 'sign' && (
          <Panel
            icon={<Hand className="h-5 w-5 text-amber-300" aria-hidden="true" />}
            title="Sign language"
            badge={`GLOSS: ${currentGloss}`}
            badgeLabel={`Current Gloss: ${currentGloss}`}
            badgeClass="bg-amber-900/60 text-amber-200"
          >
            <div ref={signContainerRef} aria-label="3D Sign Language Render Canvas" tabIndex={0} className="w-full bg-slate-950" style={{ height: '260px' }} />
          </Panel>
        )}

        {appMode === 'avatar' && (
          <Panel
            icon={<Smile className="h-5 w-5 text-emerald-300" aria-hidden="true" />}
            title="Avatar: mouth shapes"
            badge={`VISEME: ${currentViseme}`}
            badgeLabel={`Current Viseme: ${currentViseme}`}
            badgeClass="bg-emerald-900/60 text-emerald-200"
          >
            <MouthAvatar play={mouthPlay} getLevel={getMicLevel} onViseme={setCurrentViseme} tone={avatarTone} />
            <div className="space-y-3 border-t border-slate-800 p-3">
              <div className="flex flex-wrap gap-2">
                <label htmlFor="mouth-practice" className="sr-only">Type a word or sentence to see the mouth say it</label>
                <input
                  id="mouth-practice"
                  value={practiceText}
                  onChange={(e) => setPracticeText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') playPractice(); }}
                  placeholder="Type a word to see the mouth say it"
                  className={`min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-50 placeholder-slate-500 ${focusRing}`}
                />
                <button
                  type="button"
                  onClick={playPractice}
                  disabled={!practiceText.trim()}
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <Play className="h-4 w-4" aria-hidden="true" /> Play
                </button>
                <button
                  type="button"
                  onClick={replayMouth}
                  disabled={!mouthPlay}
                  aria-label="Replay the last words on the mouth"
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={practiceSlow}
                  onClick={() => setPracticeSlow(!practiceSlow)}
                  className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold ${focusRing} ${
                    practiceSlow ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  Slow motion: {practiceSlow ? 'On' : 'Off'}
                </button>
                <div role="radiogroup" aria-label="Skin tone" className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skin</span>
                  {TONE_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={avatarTone === k}
                      aria-label={`${TONES[k].label} skin tone`}
                      onClick={() => {
                        setAvatarTone(k);
                        try { localStorage.setItem('motion_avatar_tone', k); } catch { /* storage unavailable */ }
                      }}
                      className={`h-9 w-9 rounded-full border-2 ${focusRing} ${avatarTone === k ? 'border-white' : 'border-slate-700'}`}
                      style={{ background: TONES[k].skin[0] }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {appMode === 'dance' && (
          <Panel
            icon={<Music className="h-5 w-5 text-sky-300" aria-hidden="true" />}
            title="Dance: rhythm guidance"
            badge={isBeat ? `BEAT (${bpm || '---'} BPM)` : 'RHYTHM IDLE'}
            badgeLabel={isBeat ? `Beat detected at ${bpm || '---'} BPM` : 'Rhythm idle'}
            badgeClass={isBeat ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}
          >
            <canvas ref={canvasRef} width={700} height={240} aria-label="Dance rhythm and visualizer canvas" tabIndex={0} className="block w-full bg-slate-950" style={{ height: '240px' }} />
          </Panel>
        )}

        {appMode === 'text' && (
          <section aria-label="Captions">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live captions</h2>
              <div role="group" aria-label="Caption text size" className="flex items-center gap-1">
                <button type="button" onClick={() => changeCaptionSize(-1)} disabled={captionSize === 0} aria-label="Smaller text" className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-40 ${focusRing}`}>
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <Type className="h-5 w-5 text-slate-400" aria-hidden="true" />
                <button type="button" onClick={() => changeCaptionSize(1)} disabled={captionSize === CAPTION_SIZES.length - 1} aria-label="Larger text" className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-40 ${focusRing}`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              role="log"
              aria-live="polite"
              aria-label="Live transcript stream log"
              className="h-[32vh] min-h-[190px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-3 md:h-[320px]"
            >
              {entries.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
                  <Mic className="h-8 w-8" aria-hidden="true" />
                  <p className="text-base">Press Start listening. What people say will appear here in large text.</p>
                </div>
              ) : (
                entries.map((entry) => {
                  const mine = entry.speaker === 'You';
                  const one = entry.speaker.includes('Speaker 1');
                  const edge = mine ? 'border-emerald-400' : one ? 'border-sky-400' : 'border-violet-400';
                  const tone = mine ? 'text-emerald-300' : one ? 'text-sky-300' : 'text-violet-300';
                  return (
                    <article key={entry.id} className={`mb-3 rounded-xl border-l-4 bg-slate-950/70 p-3 ${edge} ${mine ? 'ml-6' : ''}`}>
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <strong className={tone}>{entry.speaker.replace(/\s*\((Local|Cloud)\)$/, '')}</strong>
                        <span className="text-slate-400">{entry.timestamp}</span>
                        {safety.voiceGuess && entry.voice && !mine && (
                          <span title={entry.pitchHz ? `Pitch about ${entry.pitchHz} Hz. This is only a guess.` : 'Only a guess'} className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                            {VOICE_LABELS[entry.voice]}
                          </span>
                        )}
                        {entry.threat && <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-semibold text-red-200">Possible threat</span>}
                      </div>
                      <p className={`${CAPTION_SIZES[captionSize]} font-medium leading-snug text-slate-50`}>
                        {safety.hideRude && entry.rude && !revealed[entry.id] ? maskProfanity(entry.text) : entry.text}
                      </p>
                      {safety.hideRude && entry.rude && (
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [entry.id]: !r[entry.id] }))}
                          className={`mt-2 rounded-lg px-1 py-1 text-xs font-semibold text-sky-300 underline-offset-2 hover:underline ${focusRing}`}
                        >
                          {revealed[entry.id] ? 'Hide rude words' : 'Rude words hidden. Tap to show'}
                        </button>
                      )}
                    </article>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your reply</h3>
                <button
                  type="button"
                  onClick={() => setEditPhrases(!editPhrases)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold text-sky-300 underline-offset-2 hover:underline ${focusRing}`}
                >
                  {editPhrases ? 'Done' : 'Edit phrases'}
                </button>
              </div>
              <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden">
                {phrases.map((p) => (
                  <span key={p} className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDraft(p)}
                      aria-label={`Use phrase: ${p}`}
                      className={`min-h-[40px] rounded-full border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-slate-100 hover:bg-slate-800 ${focusRing}`}
                    >
                      {p}
                    </button>
                    {editPhrases && (
                      <button
                        type="button"
                        onClick={() => removePhrase(p)}
                        aria-label={`Remove phrase: ${p}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 ${focusRing}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <label htmlFor="reply-draft" className="sr-only">Type your reply</label>
              <textarea
                id="reply-draft"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); showReply(); } }}
                enterKeyHint="send"
                placeholder="Type what you want to say..."
                className={`w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 text-lg text-slate-50 placeholder-slate-500 ${focusRing}`}
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={showReply}
                  disabled={!draft.trim()}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" /> Show
                </button>
                <button
                  type="button"
                  onClick={speakReply}
                  disabled={!draft.trim() || !canSpeak}
                  title={canSpeak ? 'Say it out loud' : 'Speaking is not available on this device'}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" /> Speak
                </button>
                <button
                  type="button"
                  onClick={savePhrase}
                  disabled={!draft.trim() || phrases.includes(draft.trim())}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Save phrase
                </button>
              </div>

              <div className="mt-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setVoiceOpen(!voiceOpen)}
                  aria-expanded={voiceOpen}
                  className={`flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-semibold text-slate-200 ${focusRing}`}
                >
                  <span>Speaking voice: {voiceKind === 'default' ? 'phone default' : voiceKind}</span>
                  <span className="text-xs font-semibold text-sky-300">{voiceOpen ? 'Hide' : 'Change'}</span>
                </button>
                {voiceOpen && (
                  <div className="mt-3 space-y-3 text-sm text-slate-200">
                    {!canSpeak && <p className="text-amber-300">This device cannot speak aloud.</p>}
                    <div role="radiogroup" aria-label="Voice type" className="flex flex-wrap gap-2">
                      {([['default', 'Phone default'], ['female', 'Female voice'], ['male', 'Male voice']] as [VoiceKind, string][]).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={voiceKind === k}
                          onClick={() => chooseVoiceKind(k)}
                          className={`min-h-[40px] rounded-xl border px-3 font-semibold ${focusRing} ${
                            voiceKind === k ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Choose a voice</span>
                      <select
                        value={voiceName}
                        onChange={(e) => {
                          setVoiceName(e.target.value);
                          saveVoice(voiceKind, e.target.value, voicePitch, voiceRate);
                        }}
                        className={`min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-100 ${focusRing}`}
                      >
                        <option value="">Phone default</option>
                        {voices.map((v) => {
                          const g = guessVoiceGender(v.name);
                          return (
                            <option key={v.name + v.lang} value={v.name}>
                              {v.name} ({v.lang}){g !== 'unknown' ? `, ${g}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 flex justify-between"><span>Pitch</span><strong>{voicePitch.toFixed(2)}</strong></span>
                        <input type="range" min="0.5" max="1.8" step="0.05" value={voicePitch} aria-label="Voice pitch"
                          onChange={(e) => { const v = Number(e.target.value); setVoicePitch(v); saveVoice(voiceKind, voiceName, v, voiceRate); }}
                          className="w-full accent-emerald-500" />
                      </label>
                      <label className="block">
                        <span className="mb-1 flex justify-between"><span>Speed</span><strong>{voiceRate.toFixed(2)}</strong></span>
                        <input type="range" min="0.6" max="1.4" step="0.05" value={voiceRate} aria-label="Voice speed"
                          onChange={(e) => { const v = Number(e.target.value); setVoiceRate(v); saveVoice(voiceKind, voiceName, voicePitch, v); }}
                          className="w-full accent-emerald-500" />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={testVoice}
                      disabled={!canSpeak}
                      className={`flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-40 ${focusRing}`}
                    >
                      <Volume2 className="h-4 w-4" aria-hidden="true" /> Test this voice
                    </button>
                    <p className="text-xs text-slate-400">
                      The voices come from your phone or computer, and the male and female labels are guesses from each voice's name.
                      If none sounds right, add voices in the system's text-to-speech settings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <button
                type="button"
                onClick={() => setSafetyOpen(!safetyOpen)}
                aria-expanded={safetyOpen}
                className={`flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-semibold text-slate-200 ${focusRing}`}
              >
                <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-300" aria-hidden="true" /> Safety and voice guess</span>
                <span className="text-xs font-semibold text-sky-300">{safetyOpen ? 'Hide' : 'Open'}</span>
              </button>
              {safetyOpen && (
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  {([
                    ['hideRude', 'Hide rude words behind stars (tap to show)'],
                    ['threatAlerts', 'Alert me about possible threats'],
                    ['voiceGuess', 'Guess whether a voice sounds male or female'],
                  ] as ['hideRude' | 'threatAlerts' | 'voiceGuess', string][]).map(([k, label]) => (
                    <label key={k} className="flex min-h-[36px] cursor-pointer items-center gap-3">
                      <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={safety[k]} onChange={(e) => updateSafety({ [k]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Trusted contact name</span>
                      <input value={safety.contactName} onChange={(e) => updateSafety({ contactName: e.target.value })} className={`min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-50 ${focusRing}`} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Their phone number</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={safety.contactPhone}
                        onChange={(e) => updateSafety({ contactPhone: e.target.value })}
                        placeholder="Country code first, like +234..."
                        className={`min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-50 placeholder-slate-500 ${focusRing}`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Emergency number</span>
                      <input type="tel" inputMode="tel" value={safety.emergency} onChange={(e) => updateSafety({ emergency: e.target.value })} className={`min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-50 ${focusRing}`} />
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test the checks</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Motion checks what other people say to you. What you type in the reply box is not checked. Type a sentence here to see what Motion would do with it.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <label htmlFor="check-test" className="sr-only">Sentence to test</label>
                      <input
                        id="check-test"
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') runCheckTest(); }}
                        placeholder="Type a sentence to test"
                        className={`min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-50 placeholder-slate-500 ${focusRing}`}
                      />
                      <button
                        type="button"
                        onClick={runCheckTest}
                        disabled={!testText.trim()}
                        className={`min-h-[44px] rounded-xl bg-sky-500 px-4 font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40 ${focusRing}`}
                      >
                        Test
                      </button>
                    </div>
                    {testResult && <p role="status" className="mt-2 text-sm text-slate-100">{testResult}</p>}
                  </div>
                  {safety.contactPhone && (
                    <a
                      href={smsLink(safety.contactPhone, 'This is a test message from Motion. There is no emergency.')}
                      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 font-semibold text-slate-100 hover:bg-slate-800 ${focusRing}`}
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" /> Open a test message to this contact
                    </a>
                  )}
                  <p className="text-xs leading-relaxed text-slate-400">
                    Motion listens for words only, not tone of voice. It can miss a threat or raise a false alarm, and the male or female
                    label is only a guess from pitch. It never contacts anyone by itself: it opens a message for you to send. It is an aid,
                    not a guarantee of safety. If you are in danger, move toward other people and ask for help.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-300">
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5">Vowels <strong className="text-slate-100">{vowels}</strong></span>
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5">Consonants <strong className="text-slate-100">{consonants}</strong></span>
              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5">
                Confidence <strong className="text-slate-100">{avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : 'Pending...'}</strong>
              </span>
            </div>
          </section>
        )}

        {appMode === 'community' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-10 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <Globe className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mb-2 text-xl font-bold text-sky-300">Motion Social Hub (coming soon)</h2>
            <p className="mx-auto mb-5 max-w-md text-base leading-relaxed text-slate-300">
              A dedicated social space for Deaf, Hard-of-Hearing, and Mute creators to connect, share sign-language video reels, collaborate in creator clubs, and join live sign hangouts.
            </p>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-amber-300">
              <Zap className="h-4 w-4" aria-hidden="true" /> Early access waitlist opening soon
            </span>
          </section>
        )}
      </div>

      {showing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Message for the other person"
          onClick={() => setShowing(null)}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black p-6 text-center"
        >
          <p className="max-w-full break-words font-bold leading-tight text-white" style={{ fontSize: overlayFont(showing) }}>
            {showing}
          </p>
          <p className="mt-10 text-sm text-slate-400">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import * as THREE from 'three';

declare const Vosk: any;

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

export default function TranscriptTest() {
  const [appMode, setAppMode] = useState<'text' | 'dance' | 'avatar' | 'sign' | 'community'>('community');
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

  // Initialize Three.js Avatar Canvas
  useEffect(() => {
    if (appMode !== 'avatar') return;
    let timerId: number;

    const initAvatar = () => {
      if (!avatarContainerRef.current) return;
      const container = avatarContainerRef.current;
      const width = container.clientWidth || 700;
      const height = 260;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0b0f19');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 5);

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

      const headGroup = new THREE.Group();
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), new THREE.MeshStandardMaterial({ color: '#151c2c', roughness: 0.3 }));
      headGroup.add(headMesh);

      const eyeMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', roughness: 0.2 });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), eyeMat);
      leftEye.position.set(-0.4, 0.25, 1.05);
      headGroup.add(leftEye);
      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), eyeMat);
      rightEye.position.set(0.4, 0.25, 1.05);
      headGroup.add(rightEye);

      const teethMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.1 });
      const upperTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.03), teethMat);
      upperTeeth.position.set(0, -0.28, 1.06);
      headGroup.add(upperTeeth);
      upperTeethRef.current = upperTeeth;

      const lowerTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.03), teethMat);
      lowerTeeth.position.set(0, -0.42, 1.06);
      headGroup.add(lowerTeeth);
      lowerTeethRef.current = lowerTeeth;

      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.1), new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.4 }));
      tongue.position.set(0, -0.38, 1.05);
      headGroup.add(tongue);
      tongueRef.current = tongue;

      const visemeGeometries = {
        neutral: new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.28, 0); s.quadraticCurveTo(0, -0.18, 0.28, 0); s.quadraticCurveTo(0, 0.18, -0.28, 0); return s; })()),
        round: new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.absarc(0, 0, 0.18, 0, Math.PI * 2, false); return s; })()),
        stretch: new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.35, 0); s.quadraticCurveTo(0, -0.08, 0.35, 0); s.quadraticCurveTo(0, 0.08, -0.35, 0); return s; })()),
        squeeze: new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.25, 0); s.quadraticCurveTo(0, -0.03, 0.25, 0); s.quadraticCurveTo(0, 0.03, -0.25, 0); return s; })())
      };

      const mouthMesh = new THREE.Mesh(visemeGeometries.neutral, new THREE.MeshBasicMaterial({ color: '#f43f5e', side: THREE.DoubleSide }));
      mouthMesh.position.set(0, -0.35, 1.09);
      headGroup.add(mouthMesh);
      mouthMeshRef.current = mouthMesh;
      scene.add(headGroup);

      const clock = new THREE.Clock();
      const dataArray = new Uint8Array(64);

      const animateHead = () => {
        const dt = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        headGroup.rotation.y = Math.sin(elapsedTime * 0.8) * 0.08;
        headGroup.position.y = Math.sin(elapsedTime * 2) * 0.02;

        let targetScaleY = 1, targetScaleX = 1, targetPosY = -0.35;
        let visemeLabel = 'Resting / Neutral';
        let showTeeth = true, showTongue = true;
        let targetShapeType: keyof typeof visemeGeometries = 'neutral';

        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) sumSquares += dataArray[i] * dataArray[i];
          const rms = Math.sqrt(sumSquares / dataArray.length);

          if (rms > 2.5) {
            const volNorm = Math.min(1, rms / 80);
            let lowSum = 0, highSum = 0;
            for (let i = 1; i < 8; i++) lowSum += dataArray[i];
            for (let i = 12; i < 30; i++) highSum += dataArray[i];

            if (lowSum > highSum * 1.15) {
              targetScaleY = 1.2 + volNorm * 1.3; targetScaleX = 1.0 + volNorm * 0.2; targetPosY = -0.38;
              visemeLabel = 'A / AH (Wide Open)';
            } else if (highSum > lowSum * 1.1) {
              targetScaleY = 0.85 + volNorm * 0.3; targetScaleX = 1.2 + volNorm * 0.4; targetPosY = -0.34;
              showTongue = false; visemeLabel = 'E / I (Horizontal Stretch)';
            } else if (volNorm > 0.35) {
              targetScaleY = 1.1 + volNorm * 0.4; targetScaleX = 0.85; targetPosY = -0.36;
              showTeeth = false; showTongue = false; targetShapeType = 'round'; visemeLabel = 'O / U (Lip Rounding)';
            } else {
              targetScaleY = 0.5; targetScaleX = 0.95; targetPosY = -0.33;
              showTeeth = false; showTongue = false; targetShapeType = 'squeeze'; visemeLabel = 'M / B / P (Squeezed)';
            }
          }
        }

        currentScaleYRef.current = THREE.MathUtils.damp(currentScaleYRef.current, targetScaleY, 14, dt);
        currentScaleXRef.current = THREE.MathUtils.damp(currentScaleXRef.current, targetScaleX, 14, dt);
        currentPosYRef.current = THREE.MathUtils.damp(currentPosYRef.current, targetPosY, 14, dt);
        setCurrentViseme(visemeLabel);

        if (mouthMeshRef.current) {
          mouthMeshRef.current.scale.set(currentScaleXRef.current, currentScaleYRef.current, 1);
          mouthMeshRef.current.position.y = currentPosYRef.current;
          mouthMeshRef.current.geometry = visemeGeometries[targetShapeType];
        }
        if (upperTeethRef.current && lowerTeethRef.current && tongueRef.current) {
          upperTeethRef.current.visible = showTeeth;
          lowerTeethRef.current.visible = showTeeth;
          tongueRef.current.visible = showTongue;
        }

        renderer.render(scene, camera);
        headAnimFrameRef.current = requestAnimationFrame(animateHead);
      };
      animateHead();
    };

    timerId = requestAnimationFrame(initAvatar);
    return () => {
      cancelAnimationFrame(timerId);
      if (headAnimFrameRef.current) cancelAnimationFrame(headAnimFrameRef.current);
    };
  }, [appMode]);

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
        const model = await Vosk.createModel('models/vosk-model-small-en-us-0.15.zip');
        if (!isMounted) return;
        modelRef.current = model;
        const recognizer = new model.KaldiRecognizer(16000);
        recognizerRef.current = recognizer;

        recognizer.on('result', (message: any) => {
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
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newEntry: TranscriptEntry = { id: Math.random().toString(36).substring(2), speaker: `${activeSpeaker} (Local)`, text, timestamp: now };
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
    };
  }, [activeSpeaker]);

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
        if (!isReady || !recognizerRef.current) { alert('Local model is still loading...'); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        streamRef.current = stream;
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => { try { recognizerRef.current.acceptWaveform(e.inputBuffer); } catch (err) {} };
        source.connect(processor);
        processor.connect(audioContext.destination);
        setupAudioAnalysis(audioContext, source);
        setRecording(true);
        setStatus('Recording via Vosk (Offline)...');
      } catch (err) { console.error(err); }
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
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setEntries((prev) => {
              const updated = [...prev, { id: Math.random().toString(36).substring(2), speaker: `${activeSpeaker} (Cloud)`, text, timestamp: now }];
              localStorage.setItem('motion_transcript_entries', JSON.stringify(updated));
              return updated;
            });
          }
        };
        recognizer.startContinuousRecognitionAsync(() => { setRecording(true); setStatus('Recording via Azure AI Speech...'); });
      } catch (err) { console.error(err); }
    }
  };

  const stopRecording = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (metronomeIntervalRef.current) { clearInterval(metronomeIntervalRef.current); metronomeIntervalRef.current = null; }
    if (provider === 'vosk' && processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
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

  const fullText = entries.map(e => e.text).join(' ');
  const vowels = fullText.toLowerCase().match(/[aeiou]/g)?.length || 0;
  const consonants = fullText.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]/g)?.length || 0;

  const downloadTxt = () => {
    const f = entries.map(e => `[${e.timestamp}] ${e.speaker}: ${e.text}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f], { type: 'text/plain' }));
    a.download = `motion-${Date.now()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const downloadJson = () => {
    const d = { timestamp: new Date().toISOString(), entries, analysis: { vowels, consonants, avgConfidence, bpm } };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
    a.download = `motion-${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const shareTranscript = async () => {
    const f = entries.map(e => `[${e.timestamp}] ${e.speaker}: ${e.text}`).join('\n');
    if (navigator.share) { try { await navigator.share({ title: 'Motion Transcript', text: f }); } catch (e) {} }
    else { navigator.clipboard.writeText(f); alert('Copied to clipboard!'); }
  };

  const clearTranscript = () => {
    setEntries([]); localStorage.removeItem('motion_transcript_entries');
    confidenceSumRef.current = 0; confidenceCountRef.current = 0; setAvgConfidence(null); setBpm(null); setCurrentGloss('READY');
  };

  return (
    <div 
      role="main" 
      aria-label="Motion Accessibility Application"
      style={{
        padding: '1.25rem',
        maxWidth: '750px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        minHeight: '100vh'
      }}
    >
      <style>{`
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .mic-recording { animation: pulse 1.5s infinite ease-in-out; color: #ef4444; }
        .panel-fade { animation: fadeIn 0.25s ease-in-out; }
        .motion-btn { transition: all 0.2s ease; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-weight: 700; font-size: 0.95rem; border-radius: 0.375rem; border: 2px solid transparent; min-height: 48px; padding: 0.6rem 1rem; color: #ffffff; }
        .motion-btn:hover:not(:disabled) { filter: brightness(1.2); transform: translateY(-1px); border-color: #38bdf8; }
        .motion-btn:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
        .motion-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Header & Mode Carousel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true" className={recording ? 'mic-recording' : ''}>🎤</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#f8fafc', letterSpacing: '-0.025em' }}>Motion</h2>
        </div>

        {/* Icon + Tooltip Mode Navigation with Keyboard shortcut indicators */}
        <nav aria-label="App Modes" style={{ background: '#131c31', padding: '0.3rem', borderRadius: '0.5rem', display: 'flex', gap: '0.3rem', border: '1px solid #1e293b' }}>
          {[
            { id: 'sign', icon: '🤟', label: 'Sign', shortcut: 'Alt+1' },
            { id: 'avatar', icon: '🤖', label: 'Avatar', shortcut: 'Alt+2' },
            { id: 'dance', icon: '💃', label: 'Dance', shortcut: 'Alt+3' },
            { id: 'text', icon: '📝', label: 'Text', shortcut: 'Alt+4' },
            { id: 'community', icon: '🌐', label: 'Community', badge: 'SOON', shortcut: 'Alt+5' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setAppMode(m.id as any)}
              aria-label={`${m.label} mode. Shortcut: ${m.shortcut}`}
              title={`${m.label} Mode (${m.shortcut})`}
              className="motion-btn"
              style={{
                background: appMode === m.id ? '#0284c7' : 'transparent',
                padding: '0.4rem 0.75rem',
                fontSize: '0.875rem',
                minHeight: '44px'
              }}
            >
              <span aria-hidden="true">{m.icon}</span>
              <span>{m.label}</span>
              {m.badge && <span style={{ fontSize: '0.55rem', background: '#0369a1', padding: '0.1rem 0.25rem', borderRadius: '0.2rem', marginLeft: '0.1rem' }}>{m.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Contextual Settings Bar */}
      {appMode !== 'community' && (
        <div style={{
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#131c31',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '0.875rem', marginRight: '0.5rem' }}>Engine:</span>
              <label style={{ color: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem', marginRight: '0.75rem' }}>
                <input type="radio" name="provider" value="vosk" checked={provider === 'vosk'} onChange={() => setProvider('vosk')} disabled={recording} aria-label="Use Vosk offline engine" /> Vosk (Offline)
              </label>
              <label style={{ color: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" name="provider" value="azure" checked={provider === 'azure'} onChange={() => setProvider('azure')} disabled={recording} aria-label="Use Azure cloud engine" /> Azure (Cloud)
              </label>
            </div>

            {appMode === 'text' && (
              <div>
                <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '0.875rem', marginRight: '0.5rem' }}>Speaker:</span>
                <label style={{ color: '#38bdf8', cursor: 'pointer', fontSize: '0.875rem', marginRight: '0.5rem', fontWeight: '700' }}>
                  <input type="radio" name="speaker" value="Speaker 1" checked={activeSpeaker === 'Speaker 1'} onChange={() => setActiveSpeaker('Speaker 1')} aria-label="Set active speaker to 1" /> 1
                </label>
                <label style={{ color: '#a78bfa', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
                  <input type="radio" name="speaker" value="Speaker 2" checked={activeSpeaker === 'Speaker 2'} onChange={() => setActiveSpeaker('Speaker 2')} aria-label="Set active speaker to 2" /> 2
                </label>
              </div>
            )}
          </div>

          {appMode === 'dance' && (
            <button
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              aria-expanded={showAdvancedControls}
              className="motion-btn"
              style={{
                background: showAdvancedControls ? '#0284c7' : '#1e293b',
                padding: '0.4rem 0.75rem',
                minHeight: '38px',
                fontSize: '0.85rem'
              }}
            >
              {showAdvancedControls ? '▾ Hide Advanced Controls' : '▸ Advanced Controls'}
            </button>
          )}
        </div>
      )}

      {/* Collapsible Advanced Controls Panel */}
      {appMode === 'dance' && showAdvancedControls && (
        <div className="panel-fade" style={{
          background: '#131c31',
          borderRadius: '0.5rem',
          border: '1px solid #0284c7',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#38bdf8' }}>⚙️ Advanced Dance & Haptic Customization</h4>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><input type="checkbox" checked={showBassVisuals} onChange={(e) => setShowBassVisuals(e.target.checked)} /> 🔴 Bass Visuals</label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><input type="checkbox" checked={showMidVisuals} onChange={(e) => setShowMidVisuals(e.target.checked)} /> 🟠 Mid Visuals</label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><input type="checkbox" checked={showTrebleVisuals} onChange={(e) => setShowTrebleVisuals(e.target.checked)} /> 🟢 Treble Visuals</label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><input type="checkbox" checked={hapticsEnabled} onChange={(e) => setHapticsEnabled(e.target.checked)} /> 📳 Haptics</label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><input type="checkbox" checked={metronomeEnabled} onChange={(e) => setMetronomeEnabled(e.target.checked)} /> ⏱️ Metronome</label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>📳 Haptic Intensity</span><strong>{hapticIntensity}%</strong></div>
              <input type="range" min="50" max="200" value={hapticIntensity} onChange={(e) => setHapticIntensity(Number(e.target.value))} aria-label="Haptic intensity slider" style={{ width: '100%', cursor: 'pointer' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}><span>✨ Visual Scale</span><strong>{visualIntensity}%</strong></div>
              <input type="range" min="50" max="200" value={visualIntensity} onChange={(e) => setVisualIntensity(Number(e.target.value))} aria-label="Visual scale brightness slider" style={{ width: '100%', cursor: 'pointer' }} />
            </div>
          </div>
        </div>
      )}

      {/* Screen Reader & Accessible Status Banner */}
      {appMode !== 'community' && (
        <div 
          role="status" 
          aria-live="polite"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            background: recording ? '#450a0a' : isReady ? '#064e3b' : '#451a03',
            color: recording ? '#fca5a5' : isReady ? '#6ee7b7' : '#fcd34d',
            fontWeight: '700',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            border: recording ? '1px solid #ef4444' : isReady ? '1px solid #10b981' : '1px solid #f59e0b'
          }}
        >
          <span aria-hidden="true" style={{
            height: '10px',
            width: '10px',
            borderRadius: '50%',
            backgroundColor: recording ? '#ef4444' : isReady ? '#10b981' : '#f59e0b',
            display: 'inline-block'
          }} className={recording ? 'mic-recording' : ''} />
          <span>{status}</span>
        </div>
      )}

      {/* High-Contrast Action Toolbar */}
      {appMode !== 'community' && (
        <div role="region" aria-label="Recording controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button onClick={startRecording} disabled={(!isReady && provider === 'vosk') || recording} className="motion-btn" style={{ background: recording ? '#334155' : '#0284c7' }} aria-label="Start Recording">
            <span aria-hidden="true">▶</span> Start
          </button>
          <button onClick={stopRecording} disabled={!recording} className="motion-btn" style={{ background: !recording ? '#334155' : '#dc2626' }} aria-label="Stop Recording">
            <span aria-hidden="true">⏹</span> Stop
          </button>
          <button onClick={shareTranscript} disabled={entries.length === 0} className="motion-btn" style={{ background: '#0369a1' }} aria-label="Share Transcript">
            <span aria-hidden="true">🔗</span> Share
          </button>
          <button onClick={downloadTxt} disabled={entries.length === 0} className="motion-btn" style={{ background: '#059669' }} aria-label="Download as Text File">
            <span aria-hidden="true">📥</span> .txt
          </button>
          <button onClick={downloadJson} disabled={entries.length === 0} className="motion-btn" style={{ background: '#7c3aed' }} aria-label="Download as JSON File">
            <span aria-hidden="true">📥</span> .json
          </button>
          <button onClick={clearTranscript} className="motion-btn" style={{ background: '#1e293b', color: '#f8fafc' }} aria-label="Clear Transcript">
            <span aria-hidden="true">🗑️</span> Clear
          </button>
        </div>
      )}

      {/* ACTIVE MODES */}
      {appMode === 'sign' && (
        <div className="panel-fade" style={{ background: '#131c31', borderRadius: '0.5rem', border: '1px solid #1e293b', marginBottom: '1rem', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: '700' }}>🤟 Sign Language Mode: Visual Gesture Translation</span>
            <span aria-label={`Current Gloss: ${currentGloss}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: '800', background: '#78350f', color: '#fcd34d' }}>
              GLOSS: {currentGloss}
            </span>
          </div>
          <div ref={signContainerRef} aria-label="3D Sign Language Render Canvas" tabIndex={0} style={{ width: '100%', height: '260px', background: '#0b0f19' }} />
        </div>
      )}

      {appMode === 'avatar' && (
        <div className="panel-fade" style={{ background: '#131c31', borderRadius: '0.5rem', border: '1px solid #1e293b', marginBottom: '1rem', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '700' }}>🤖 Avatar Mode: Smooth Damped Viseme Morphing</span>
            <span aria-label={`Current Viseme: ${currentViseme}`} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: '800', background: '#065f46', color: '#34d399' }}>
              VISEME: {currentViseme}
            </span>
          </div>
          <div ref={avatarContainerRef} aria-label="3D Avatar Head Render Canvas" tabIndex={0} style={{ width: '100%', height: '260px', background: '#0b0f19' }} />
        </div>
      )}

      {appMode === 'dance' && (
        <div className="panel-fade" style={{ background: '#131c31', borderRadius: '0.5rem', border: '1px solid #1e293b', marginBottom: '1rem', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>💃 Dance Mode: Visual Rhythm & Guidance</span>
            <span aria-label={isBeat ? `Beat detected at ${bpm || '---'} BPM` : 'Rhythm idle'} style={{ padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: '800', background: isBeat ? '#dc2626' : '#1e293b', color: '#fff' }}>
              {isBeat ? `⚡ BEAT (${bpm || '---'} BPM)` : 'RHYTHM IDLE'}
            </span>
          </div>
          <canvas ref={canvasRef} width={700} height={240} aria-label="Dance rhythm and visualizer canvas" tabIndex={0} style={{ width: '100%', height: '240px', display: 'block', background: '#0b0f19' }} />
        </div>
      )}

      {appMode === 'text' && (
        <div className="panel-fade">
          <div 
            role="log" 
            aria-live="polite" 
            aria-label="Live transcript stream log"
            style={{
              height: '260px', overflowY: 'auto', background: '#131c31', color: '#38bdf8', padding: '1rem', borderRadius: '0.5rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.95rem', lineHeight: '1.6',
              border: '1px solid #1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', marginBottom: '1rem'
            }}
          >
            {entries.length === 0 ? (
              <div style={{ color: '#94a3b8' }}>Multi-speaker transcript entries will appear here...</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} style={{ marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', gap: '0.5rem' }}>
                    <span>[{entry.timestamp}]</span>
                    <strong style={{ color: entry.speaker.includes('Speaker 1') ? '#38bdf8' : '#a78bfa' }}>{entry.speaker}</strong>
                  </div>
                  <div style={{ color: '#f8fafc', marginTop: '0.25rem' }}>{entry.text}</div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '1rem', background: '#131c31', borderRadius: '0.5rem', border: '1px solid #1e293b', color: '#e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#38bdf8' }}>📊 Phonetics & Confidence</h4>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>Vowels: <strong>{vowels}</strong> | Consonants: <strong>{consonants}</strong></p>
              <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>Confidence: <strong>{avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : 'Pending...'}</strong></p>
            </div>
          </div>
        </div>
      )}

      {appMode === 'community' && (
        <div className="panel-fade" style={{ background: '#131c31', borderRadius: '0.75rem', border: '1px solid #1e293b', padding: '2.5rem 1.5rem', textAlign: 'center', color: '#f8fafc' }}>
          <span style={{ fontSize: '3rem' }} aria-hidden="true">🌐</span>
          <h3 style={{ margin: '0.75rem 0 0.5rem 0', color: '#38bdf8', fontSize: '1.35rem' }}>Motion Social Hub (Coming Soon)</h3>
          <p style={{ fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
            A dedicated social space for Deaf, Hard-of-Hearing, and Mute creators to connect, share sign-language video reels, collaborate in creator clubs, and join live sign hangouts.
          </p>
          <div style={{ display: 'inline-block', background: '#0b0f19', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #1e293b', fontSize: '0.875rem', color: '#fbbf24', fontWeight: '700' }}>
            🚀 Phase 1 Foundation & Early Access Waitlist Opening Soon
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { Flame, Loader2, Mic, ShieldAlert, Square, Volume2, X } from 'lucide-react';
import { AlarmDetector, LABELS } from './alarmDetector';
import type { AlarmEvent, AlarmKind, Sensitivity } from './alarmDetector';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const PREFS_KEY = 'motion_alarm_prefs';
const AUDIO_KEY = 'motion_audio'; // the microphone choice saved by the Microphone and recordings card
const SAFETY_KEY = 'motion_safety'; // holds the emergency number

type Prefs = { sens: Sensitivity; vibrate: boolean; screen: boolean };
const DEFAULT_PREFS: Prefs = { sens: 'normal', vibrate: true, screen: true };
type Alert = { kind: AlarmKind; label: string; test: boolean };
type Entry = { id: number; time: string; label: string };

const SENS_OPTIONS: { value: Sensitivity; label: string; note: string }[] = [
  { value: 'low', label: 'Fewer false alarms', note: 'Needs a louder, longer sound' },
  { value: 'normal', label: 'Balanced', note: '' },
  { value: 'high', label: 'Catch more', note: 'More false alarms' },
];

function micError(err: any): string {
  const name = (err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone permission was blocked. Allow the microphone for this app in your phone settings, then try again.';
  if (name === 'NotFoundError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'The microphone is being used by another app. Close it and try again.';
  return `Could not start the microphone: ${(err && err.message) || 'unknown error'}`;
}

function emergencyNumber(): string {
  try {
    const raw = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
    if (raw && typeof raw.emergency === 'string' && raw.emergency.trim()) return raw.emergency.trim();
  } catch { /* use the default */ }
  return '112';
}

export default function AlarmWatch() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      return raw && typeof raw === 'object' ? { ...DEFAULT_PREFS, ...raw } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });
  const [on, setOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);
  const [learning, setLearning] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [stillHearing, setStillHearing] = useState(true);
  const [history, setHistory] = useState<Entry[]>([]);
  const [note, setNote] = useState('');
  const [testing, setTesting] = useState('');

  const prefsRef = useRef(prefs);
  const alertRef = useRef<Alert | null>(null);
  const detectorRef = useRef<AlarmDetector | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const lockRef = useRef<any>(null);
  const lastHeardRef = useRef(0);
  const snoozeUntilRef = useRef(0);
  const startedAtRef = useRef(0);
  const idRef = useRef(0);
  const testCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => { prefsRef.current = prefs; if (detectorRef.current) detectorRef.current.setSensitivity(prefs.sens); }, [prefs]);
  useEffect(() => { alertRef.current = alert; }, [alert]);

  const updatePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    if (!next.vibrate && !next.screen) { setNote('At least one way of warning you must stay on.'); return; }
    setNote('');
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const openAlert = (a: Alert) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    idRef.current += 1;
    const id = idRef.current;
    setHistory((h) => [{ id, time: now, label: a.test ? `${a.label} (test)` : a.label }, ...h].slice(0, 5));
    lastHeardRef.current = performance.now();
    setStillHearing(true);
    setAlert(a);
  };

  // Called by the detector while it hears something that matches.
  const heard = (ev: AlarmEvent) => {
    const now = performance.now();
    if (now < snoozeUntilRef.current) return;
    lastHeardRef.current = now;
    const cur = alertRef.current;
    if (!cur) { openAlert({ kind: ev.kind, label: ev.label, test: false }); return; }
    if (ev.kind === 'fire' && cur.kind !== 'fire' && !cur.test) setAlert({ kind: 'fire', label: ev.label, test: false });
  };

  // While the alert is open: vibrate again and again, and say whether the sound is still there.
  useEffect(() => {
    if (!alert) return;
    const buzz = () => { if (prefsRef.current.vibrate) { try { navigator.vibrate?.([600, 200, 600, 200, 600]); } catch { /* not available */ } } };
    buzz();
    const v = window.setInterval(buzz, 2600);
    const s = window.setInterval(() => setStillHearing(performance.now() - lastHeardRef.current < 3500), 1000);
    return () => { window.clearInterval(v); window.clearInterval(s); try { navigator.vibrate?.(0); } catch { /* not available */ } };
  }, [alert]);

  const closeAlert = (notAlarm: boolean) => {
    const a = alertRef.current;
    setAlert(null);
    if (a && a.test) return;
    snoozeUntilRef.current = performance.now() + (notAlarm ? 60000 : 30000);
    if (notAlarm && detectorRef.current) {
      detectorRef.current.lessSensitive();
      setNote('Thanks. Motion is now a little less sensitive until you turn the watch off.');
    }
  };

  const keepAwake = async () => {
    try {
      const wl = (navigator as any).wakeLock;
      if (wl && wl.request) lockRef.current = await wl.request('screen');
    } catch { /* the screen may turn off: nothing to do */ }
  };
  useEffect(() => {
    if (!on) return;
    const again = () => { if (document.visibilityState === 'visible') keepAwake(); };
    document.addEventListener('visibilitychange', again);
    return () => document.removeEventListener('visibilitychange', again);
  }, [on]);

  const stop = () => {
    if (procRef.current) { procRef.current.onaudioprocess = null; procRef.current.disconnect(); procRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    if (lockRef.current) { try { lockRef.current.release(); } catch { /* already released */ } lockRef.current = null; }
    detectorRef.current = null;
    setOn(false);
    setLearning(false);
    setLevel(0);
  };
  useEffect(() => () => {
    stop();
    if (testCtxRef.current) { testCtxRef.current.close().catch(() => {}); testCtxRef.current = null; }
  }, []);

  const start = async () => {
    if (on || starting) return;
    setError('');
    setNote('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('The microphone needs a secure (https) connection. Open the app from its https address.');
      return;
    }
    setStarting(true);
    try {
      let micId = '';
      try { micId = (JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}') || {}).micId || ''; } catch { /* use the default microphone */ }
      // Noise suppression and echo cancellation are off on purpose: they would remove steady tones such as alarms.
      const wanted: MediaTrackConstraints = { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: micId ? { ...wanted, deviceId: { exact: micId } } : wanted });
      } catch (firstErr: any) {
        if (!micId || (firstErr && firstErr.name !== 'OverconstrainedError' && firstErr.name !== 'NotFoundError')) throw firstErr;
        stream = await navigator.mediaDevices.getUserMedia({ audio: wanted });
      }
      streamRef.current = stream;
      let ctx: AudioContext;
      try { ctx = new AudioContext({ sampleRate: 16000 }); } catch { ctx = new AudioContext(); }
      ctxRef.current = ctx;
      const det = new AlarmDetector(ctx.sampleRate, prefsRef.current.sens);
      detectorRef.current = det;
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        const ev = det.push(e.inputBuffer.getChannelData(0));
        if (ev) heard(ev);
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      startedAtRef.current = performance.now();
      setLearning(true);
      setOn(true);
      keepAwake();
    } catch (err: any) {
      stop();
      setError(micError(err));
    } finally {
      setStarting(false);
    }
  };

  // Level bar and "learning the room" note, a few times a second.
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      const d = detectorRef.current;
      if (d) setLevel(Math.max(0, Math.min(1, d.level / 40)));
      setLearning(performance.now() - startedAtRef.current < 6000);
    }, 250);
    return () => window.clearInterval(id);
  }, [on]);

  // Test sounds played through the speaker, so the watch can be checked by holding the phone speaker near its microphone.
  const playTest = (which: 'siren' | 'fire') => {
    if (testCtxRef.current) { testCtxRef.current.close().catch(() => {}); testCtxRef.current = null; }
    const ctx = new AudioContext();
    testCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3600;
    osc.connect(lp);
    lp.connect(gain);
    const t0 = ctx.currentTime + 0.1;
    if (which === 'siren') {
      for (let i = 0; i < 5; i++) { osc.frequency.setValueAtTime(700, t0 + i * 3); osc.frequency.linearRampToValueAtTime(1400, t0 + i * 3 + 1.5); osc.frequency.linearRampToValueAtTime(700, t0 + i * 3 + 3); }
      osc.start(t0); osc.stop(t0 + 15);
    } else {
      osc.type = 'sine';
      osc.frequency.value = 3100;
      const g = ctx.createGain();
      g.gain.value = 0;
      lp.disconnect(); osc.disconnect(); osc.connect(g); g.connect(gain);
      for (let r = 0; r < 3; r++) for (let b = 0; b < 3; b++) { const s = t0 + r * 3.5 + b; g.gain.setValueAtTime(1, s); g.gain.setValueAtTime(0, s + 0.5); }
      osc.start(t0); osc.stop(t0 + 11);
    }
    setTesting(which === 'siren' ? 'Playing a test siren for 15 seconds...' : 'Playing a test smoke alarm for 11 seconds...');
    window.setTimeout(() => setTesting(''), which === 'siren' ? 15500 : 11500);
  };

  const KindIcon = alert && alert.kind === 'fire' ? Flame : alert && alert.kind === 'alarm' ? Volume2 : ShieldAlert;
  const emergency = emergencyNumber();

  return (
    <>
      <section aria-label="Alarm watch" className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <ShieldAlert className="h-5 w-5 text-red-300" aria-hidden="true" /> Alarm watch
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">Warns you about sirens, fire alarms and other alert sounds.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={on ? stop : start}
            disabled={starting}
            className={`flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-60 ${focusRing} ${
              on ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            }`}
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : on ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            {on ? 'Stop watching' : 'Start watching'}
          </button>
        </div>

        {error && <p role="alert" className="mt-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-200">{error}</p>}

        {on && (
          <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-100">
            <p className="font-semibold">{learning ? 'Watching. Learning the room for a few seconds...' : 'Watching for sirens and alarms.'}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-300">Keep Motion open on the screen. Phones stop web apps from listening in the background or when the screen is locked, so Motion keeps the screen on while it watches.</p>
          </div>
        )}
        {note && <p role="status" className="mt-2 text-xs text-sky-200">{note}</p>}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-semibold text-slate-200 ${focusRing}`}
        >
          <span>Settings and test</span>
          <span className="text-xs font-semibold text-sky-300">{open ? 'Hide' : 'Open'}</span>
        </button>
        {open && (
          <div className="mt-2 space-y-3 text-sm text-slate-200">
            <div role="radiogroup" aria-label="Sensitivity" className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sensitivity</span>
              <div className="flex flex-wrap gap-2">
                {SENS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={prefs.sens === o.value}
                    onClick={() => updatePrefs({ sens: o.value })}
                    className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold ${focusRing} ${
                      prefs.sens === o.value ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-300'
                    }`}
                  >
                    {o.label}
                    {o.note && <span className="block text-[11px] font-normal text-slate-400">{o.note}</span>}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex min-h-[36px] cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={prefs.vibrate} onChange={(e) => updatePrefs({ vibrate: e.target.checked })} />
              Vibrate the phone
            </label>
            <label className="flex min-h-[36px] cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={prefs.screen} onChange={(e) => updatePrefs({ screen: e.target.checked })} />
              Show a red warning screen
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Test it</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                The first button only shows the warning. The other two play a sound: start watching, then hold the phone's speaker near its microphone to see whether Motion notices it. Keep the volume moderate.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => openAlert({ kind: 'siren', label: LABELS.siren, test: true })}
                  className={`min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 ${focusRing}`}>
                  Show the warning
                </button>
                <button type="button" onClick={() => playTest('siren')}
                  className={`min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 ${focusRing}`}>
                  Play a test siren
                </button>
                <button type="button" onClick={() => playTest('fire')}
                  className={`min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 ${focusRing}`}>
                  Play a test smoke alarm
                </button>
              </div>
              {testing && <p role="status" className="mt-2 text-xs text-sky-200">{testing}</p>}
            </div>

            {history.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent warnings</h3>
                <ul className="mt-1 space-y-1 text-xs text-slate-300">
                  {history.map((h) => <li key={h.id}>{h.time}: {h.label}</li>)}
                </ul>
              </div>
            )}
            <p className="text-xs leading-relaxed text-slate-400">
              Motion listens for loud, steady or gliding tones. It can miss an alarm, or raise a false alarm for other loud sounds. It is an extra aid, not a replacement for smoke detectors with flashing lights or a bed shaker, or for people who can tell you about an emergency.
            </p>
          </div>
        )}
      </section>

      {alert && (prefs.screen || alert.test) && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Possible emergency sound"
          className="motion-alert fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center text-white"
        >
          <style>{`
            .motion-alert { background: #b91c1c; animation: motion-alert-pulse 1.2s ease-in-out infinite; }
            @keyframes motion-alert-pulse { 0%, 100% { background: #b91c1c; } 50% { background: #7f1d1d; } }
            @media (prefers-reduced-motion: reduce) { .motion-alert { animation: none; background: #b91c1c; } }
          `}</style>
          <KindIcon className="h-20 w-20" aria-hidden="true" />
          <p className="text-4xl font-extrabold leading-tight sm:text-5xl">{alert.label.toUpperCase()}</p>
          {alert.test ? (
            <p className="max-w-md text-lg">This is a test of the warning screen.</p>
          ) : (
            <>
              <p className="max-w-md text-lg">{stillHearing ? 'Motion can still hear it.' : 'The sound has stopped. Stay alert.'}</p>
              <p className="max-w-md text-base">Motion can be wrong. Look around you. If you think there is danger, move to safety and ask for help.</p>
            </>
          )}
          <div className="mt-2 flex w-full max-w-md flex-col gap-3">
            {!alert.test && (
              <a href={`tel:${emergency}`} className={`flex min-h-[56px] items-center justify-center rounded-xl bg-white px-4 text-lg font-bold text-red-800 ${focusRing}`}>
                Call {emergency} (a voice call, ask someone nearby to speak)
              </a>
            )}
            <button type="button" onClick={() => closeAlert(false)} className={`min-h-[56px] rounded-xl border-2 border-white px-4 text-lg font-bold text-white hover:bg-white/10 ${focusRing}`}>
              I am safe. Close this
            </button>
            {!alert.test && (
              <button type="button" onClick={() => closeAlert(true)} className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white underline-offset-2 hover:underline ${focusRing}`}>
                <X className="h-4 w-4" aria-hidden="true" /> This was not an alarm
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

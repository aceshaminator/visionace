import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, X, Mic, Square } from 'lucide-react';
import { ERR_CANCELLED, ERR_DECODE, ERR_SHORT, MODELS, transcribeVoiceNote } from './voiceNote';
import type { ModelKey, VoiceLine } from './voiceNote';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const MODEL_KEY = 'motion_voicenote_model';
const ENGINE_FLAG = 'motion_vn_engine';
const modelFlag = (k: ModelKey) => `motion_vn_model_${k}`;

// Approximate download sizes in MB: the speech model, and the engine that runs it (needed once).
const MODEL_MB: Record<ModelKey, number> = { better: 75, fast: 40 };
const ENGINE_MB = 27;

const AUDIO_KEY = 'motion_audio'; // the microphone choices saved by the Microphone and recordings card
const MAX_RECORD_SECONDS = 180;
type Source = 'voice-note' | 'recording';

// Plain-language reason shown when the microphone cannot start.
function micError(err: any): string {
  const name = (err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone permission was blocked. Allow the microphone for this app in your phone settings, then try again.';
  if (name === 'NotFoundError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'The microphone is being used by another app. Close it and try again.';
  return `Could not start the microphone: ${(err && err.message) || 'unknown error'}`;
}
const clockText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

type Stage = 'idle' | 'reading' | 'loading' | 'download' | 'writing' | 'done' | 'error';

const flagSet = (key: string): boolean => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};
const setFlag = (key: string) => {
  try { localStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
};

// True when the speech model is not on this device yet, so a download is coming.
async function needsDownload(k: ModelKey): Promise<boolean> {
  if (flagSet(modelFlag(k))) return false;
  try {
    // The model files are kept by the browser in this store. If they are already there, no download is needed.
    if ('caches' in window) {
      const cache = await caches.open('transformers-cache');
      const keys = await cache.keys();
      if (keys.some((r) => r.url.includes(MODELS[k].id) && r.url.endsWith('.onnx'))) {
        setFlag(modelFlag(k));
        return false;
      }
    }
  } catch { /* cannot look: treat as not downloaded */ }
  return true;
}

// Mobile data is only detectable in some browsers (Chrome on Android). Returns null when unknown.
function onMobileData(): boolean | null {
  const c = (navigator as any).connection;
  if (!c || typeof c.type !== 'string') return null;
  return c.type === 'cellular';
}

function friendlyError(err: any): string {
  const m = String((err && err.message) || err || '');
  if (m === ERR_DECODE) {
    return 'This file could not be opened as sound. WhatsApp voice notes (.opus), .m4a, .mp3, .wav and videos usually work. Some phones and browsers cannot open .opus: try Chrome, or ask the sender to send it again.';
  }
  if (m === ERR_SHORT) return 'This recording is too short or silent to write out.';
  if (/fetch|network|failed to|load failed|import/i.test(m)) {
    return 'The speech model could not be downloaded. It needs the internet the first time only. Check the connection and try again.';
  }
  return `Something went wrong: ${m}`;
}

export default function VoiceNoteImport(props: { onLines: (lines: VoiceLine[], source?: Source) => void; disabled?: boolean }) {
  const { onLines, disabled } = props;
  const [model, setModel] = useState<ModelKey>(() => {
    try { return localStorage.getItem(MODEL_KEY) === 'fast' ? 'fast' : 'better'; } catch { return 'better'; }
  });
  const [stage, setStage] = useState<Stage>('idle');
  const [percent, setPercent] = useState(0);
  const [part, setPart] = useState({ index: 0, total: 0 });
  const [fileName, setFileName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File | null>(null); // a file waiting for the person to agree to the download
  const [checking, setChecking] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const sharedHandled = useRef(false);
  const sourceRef = useRef<Source>('voice-note');
  const [recordingNow, setRecordingNow] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const busy = stage === 'reading' || stage === 'loading' || stage === 'download' || stage === 'writing';

  useEffect(() => () => { if (cancelRef.current) cancelRef.current(); }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') { r.onstop = null; try { r.stop(); } catch { /* already stopped */ } }
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  // The size of the download for a model: the engine is only counted if it is not on the device yet.
  const downloadMb = (k: ModelKey) => MODEL_MB[k] + (flagSet(ENGINE_FLAG) ? 0 : ENGINE_MB);

  const start = async (file: File, key: ModelKey) => {
    setFileName(file.name);
    setMessage('');
    setCount(0);
    setPercent(0);
    setPart({ index: 0, total: 0 });
    setAudioUrl(URL.createObjectURL(file));
    setStage('reading');
    const job = transcribeVoiceNote(file, MODELS[key].id, (ev) => {
      if (ev.type === 'reading') setStage('reading');
      else if (ev.type === 'loading') setStage('loading');
      else if (ev.type === 'download') { setStage('download'); setPercent(ev.percent); }
      else if (ev.type === 'ready') {
        setFlag(modelFlag(key)); // from now on the model is on this device
        setFlag(ENGINE_FLAG);
        setStage('writing');
      } else if (ev.type === 'part') {
        setStage('writing');
        setPart({ index: ev.index + 1, total: ev.total });
        if (ev.lines.length) onLines(ev.lines, sourceRef.current);
      }
    });
    cancelRef.current = job.cancel;
    try {
      const n = await job.promise;
      setCount(n);
      setStage('done');
    } catch (err: any) {
      if (err && err.message === ERR_CANCELLED) { setStage('idle'); return; }
      setMessage(friendlyError(err));
      setStage('error');
    } finally {
      cancelRef.current = null;
    }
  };

  // A file was chosen: if a download is needed, ask first. Otherwise start straight away.
  const choose = async (file: File, key: ModelKey = model, source: Source = 'voice-note') => {
    if (busy || disabled || checking) return;
    sourceRef.current = source;
    setChecking(true);
    let download = false;
    try { download = await needsDownload(key); } finally { setChecking(false); }
    if (download) {
      setPending(file);
      setStage('idle');
      return;
    }
    setPending(null);
    await start(file, key);
  };

  const chooseModel = (k: ModelKey) => {
    setModel(k);
    try { localStorage.setItem(MODEL_KEY, k); } catch { /* storage unavailable */ }
  };

  // When a voice note is shared into Motion from another app, the app opens with ?shared=voice-note.
  // Pick the file up and treat it like a chosen file (including the download warning).
  useEffect(() => {
    if (sharedHandled.current) return;
    sharedHandled.current = true;
    (async () => {
      try {
        if (new URLSearchParams(window.location.search).get('shared') !== 'voice-note') return;
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
        const cache = await caches.open('motion-shared');
        const res = await cache.match('/shared-file');
        if (!res) return;
        const blob = await res.blob();
        await cache.delete('/shared-file');
        const name = decodeURIComponent(res.headers.get('X-File-Name') || 'shared voice note');
        await choose(new File([blob], name, { type: blob.type }));
      } catch { /* nothing was shared */ }
    })();
  }, []);

  const finishRecordingUi = () => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    setRecordingNow(false);
  };

  const startRecording = async () => {
    if (busy || disabled || checking || recordingNow) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Recording needs a secure (https) connection and a browser that can record. Try Chrome.');
      setStage('error');
      return;
    }
    setPending(null);
    setMessage('');
    setStage('idle');
    try {
      let prefs: any = {};
      try { prefs = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}') || {}; } catch { /* use the defaults */ }
      const wanted: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: !!prefs.noiseSuppression,
        autoGainControl: prefs.autoGain !== false,
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: prefs.micId ? { ...wanted, deviceId: { exact: prefs.micId } } : wanted });
      } catch (firstErr: any) {
        // The chosen microphone is not there any more: use the default one.
        if (!prefs.micId || (firstErr && firstErr.name !== 'OverconstrainedError' && firstErr.name !== 'NotFoundError')) throw firstErr;
        stream = await navigator.mediaDevices.getUserMedia({ audio: wanted });
      }
      micStreamRef.current = stream;
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || type || 'audio/webm' });
        chunksRef.current = [];
        recorderRef.current = null;
        finishRecordingUi();
        if (blob.size < 2000) {
          setMessage('Nothing was recorded. Check the microphone and try again.');
          setStage('error');
          return;
        }
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/[^0-9]/g, '');
        choose(new File([blob], `recording-${stamp}.${ext}`, { type: blob.type }), model, 'recording');
      };
      rec.start(1000);
      setSeconds(0);
      setRecordingNow(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((n) => {
          if (n + 1 >= MAX_RECORD_SECONDS && recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
          return n + 1;
        });
      }, 1000);
    } catch (err: any) {
      finishRecordingUi();
      setMessage(micError(err));
      setStage('error');
    }
  };

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
  };

  const statusText =
    stage === 'reading' ? 'Reading the voice note...'
    : stage === 'loading' ? 'Starting the speech model...'
    : stage === 'download' ? `Downloading the speech model (first time only): ${percent}%`
    : stage === 'writing' ? `Writing it out: part ${part.total ? part.index : 0} of ${part.total || '...'}`
    : stage === 'done' ? (count > 0 ? `Done. ${count} ${count === 1 ? 'line was' : 'lines were'} added to the captions above.` : 'Done, but no speech was found in this recording.')
    : stage === 'error' ? message
    : '';

  const mobile = onMobileData();
  const smallerKey: ModelKey = 'fast';
  const inactive = busy || !!disabled || checking;

  return (
    <section aria-label="Voice notes" className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Voice notes and recordings</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">
        Choose a voice note from WhatsApp or any app, or record someone speaking. Motion writes out what is said and adds it to the captions above. It is more accurate than the live captions, but the words appear after a short wait. Nothing leaves your device.
      </p>

      <div role="radiogroup" aria-label="Accuracy" className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(MODELS) as ModelKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={model === k}
            disabled={busy}
            onClick={() => chooseModel(k)}
            className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold disabled:opacity-50 ${focusRing} ${
              model === k ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-300'
            }`}
          >
            {MODELS[k].label} <span className="font-normal text-slate-400">({MODELS[k].size})</span>
          </button>
        ))}
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); if (!inactive) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) choose(f, model, 'voice-note');
        }}
        className={`mt-3 flex min-h-[64px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center text-base font-bold transition ${
          dragging ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'
        } ${inactive || recordingNow ? 'pointer-events-none opacity-40' : ''}`}
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        {disabled ? 'Stop listening first' : 'Choose a voice note (or drop it here)'}
        <input
          type="file"
          accept="audio/*,video/*,.opus,.ogg,.oga,.m4a,.aac,.mp3,.wav,.mp4,.3gp"
          className="sr-only"
          disabled={inactive || recordingNow}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) choose(f, model, 'voice-note');
            e.target.value = '';
          }}
        />
      </label>

      <div className="mt-3">
        <button
          type="button"
          onClick={recordingNow ? stopRecording : startRecording}
          disabled={!recordingNow && inactive}
          className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
            recordingNow ? 'bg-red-600 text-white hover:bg-red-500' : 'border border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'
          }`}
        >
          {recordingNow ? (
            <>
              <Square className="h-5 w-5" aria-hidden="true" /> Stop and write out ({clockText(seconds)})
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" aria-hidden="true" /> Record, then write out
            </>
          )}
        </button>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {recordingNow
            ? `Recording. Keep the phone close to the person speaking. It stops by itself after ${clockText(MAX_RECORD_SECONDS)}.`
            : 'Hold the phone near the person speaking, record up to 3 minutes, then stop. It does not separate different speakers.'}
        </p>
      </div>

      {pending && !busy && (
        <div role="group" aria-label="One-time download needed" className="mt-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3">
          <h4 className="text-sm font-bold text-amber-200">One-time download needed</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">
            To write out voice notes, Motion must download its speech engine to this device: about {downloadMb(model)} MB, once.
            After that it works without internet.{' '}
            {mobile === true
              ? 'You seem to be on mobile data, which may use up your data bundle or cost money. Wi-Fi is better.'
              : mobile === false
                ? 'You seem to be on Wi-Fi, which is good for a download this size.'
                : 'Use Wi-Fi if you can.'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">Waiting: {pending.name}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { const f = pending; setPending(null); start(f, model); }}
              className={`min-h-[48px] rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 ${focusRing}`}
            >
              Download and continue
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className={`min-h-[48px] rounded-xl border border-slate-600 bg-slate-950 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-800 ${focusRing}`}
            >
              Not now
            </button>
          </div>
          {model !== smallerKey && (
            <button
              type="button"
              onClick={() => { const f = pending; chooseModel(smallerKey); setPending(null); choose(f, smallerKey, sourceRef.current); }}
              className={`mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-sky-300 underline-offset-2 hover:underline ${focusRing}`}
            >
              Use the smaller download instead (about {downloadMb(smallerKey)} MB, less accurate)
            </button>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-3">
        {checking && <p className="text-sm text-slate-300">Checking the speech model...</p>}
        {busy && (
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        )}
        {stage === 'download' && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"
          >
            <div className="h-full bg-sky-400 transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}
        {stage === 'writing' && part.total > 0 && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round((part.index / part.total) * 100)}%` }} />
          </div>
        )}
        {stage === 'done' && <p className="text-sm font-semibold text-emerald-200">{statusText}</p>}
        {stage === 'error' && <p className="rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-200">{statusText}</p>}
      </div>

      {busy && (
        <button
          type="button"
          onClick={() => { if (cancelRef.current) cancelRef.current(); }}
          className={`mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 ${focusRing}`}
        >
          <X className="h-4 w-4" aria-hidden="true" /> Cancel
        </button>
      )}

      {audioUrl && fileName && (
        <div className="mt-3">
          <p className="mb-1 truncate text-xs text-slate-400">{fileName}</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      <details className="mt-3 text-sm text-slate-300">
        <summary className={`cursor-pointer rounded-lg py-1 font-semibold text-sky-300 ${focusRing}`}>How do I get a voice note out of WhatsApp?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
          <li>Press and hold the voice note, open the menu, and choose Share. Pick Files, Drive or Save to device. The wording differs between phones.</li>
          <li>Then tap Choose a voice note above and pick the saved file.</li>
          <li>On many Android phones the notes are also kept in a WhatsApp folder called WhatsApp Voice Notes, inside the Files app.</li>
          <li>Voice notes from Telegram, Messenger, Signal or email work the same way: save the audio, then choose it here.</li>
        </ul>
      </details>
      <p className="mt-2 text-xs text-slate-400">
        Whisper can still mishear names and strong accents, so treat the text as a guide.
      </p>
    </section>
  );
}

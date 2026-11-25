import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { ERR_CANCELLED, ERR_DECODE, ERR_SHORT, MODELS, transcribeVoiceNote } from './voiceNote';
import type { ModelKey, VoiceLine } from './voiceNote';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const MODEL_KEY = 'motion_voicenote_model';

type Stage = 'idle' | 'reading' | 'loading' | 'download' | 'writing' | 'done' | 'error';

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

export default function VoiceNoteImport(props: { onLines: (lines: VoiceLine[]) => void; disabled?: boolean }) {
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
  const cancelRef = useRef<(() => void) | null>(null);

  const busy = stage === 'reading' || stage === 'loading' || stage === 'download' || stage === 'writing';

  useEffect(() => () => { if (cancelRef.current) cancelRef.current(); }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const run = async (file: File) => {
    if (busy || disabled) return;
    setFileName(file.name);
    setMessage('');
    setCount(0);
    setPercent(0);
    setPart({ index: 0, total: 0 });
    setAudioUrl(URL.createObjectURL(file));
    setStage('reading');
    const job = transcribeVoiceNote(file, MODELS[model].id, (ev) => {
      if (ev.type === 'reading') setStage('reading');
      else if (ev.type === 'loading') setStage('loading');
      else if (ev.type === 'download') { setStage('download'); setPercent(ev.percent); }
      else if (ev.type === 'ready') setStage('writing');
      else if (ev.type === 'part') {
        setStage('writing');
        setPart({ index: ev.index + 1, total: ev.total });
        if (ev.lines.length) onLines(ev.lines);
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

  const chooseModel = (k: ModelKey) => {
    setModel(k);
    try { localStorage.setItem(MODEL_KEY, k); } catch { /* storage unavailable */ }
  };

  const statusText =
    stage === 'reading' ? 'Reading the voice note...'
    : stage === 'loading' ? 'Starting the speech model...'
    : stage === 'download' ? `Downloading the speech model (first time only): ${percent}%`
    : stage === 'writing' ? `Writing it out: part ${part.total ? part.index : 0} of ${part.total || '...'}`
    : stage === 'done' ? (count > 0 ? `Done. ${count} ${count === 1 ? 'line was' : 'lines were'} added to the captions above.` : 'Done, but no speech was found in this recording.')
    : stage === 'error' ? message
    : '';

  return (
    <section aria-label="Voice notes" className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Voice notes from WhatsApp or any app</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">
        Choose a voice note. Motion writes out what is said and adds it to the captions above. It reads the file directly, so no microphone is used.
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
        onDragOver={(e) => { e.preventDefault(); if (!busy && !disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) run(f);
        }}
        className={`mt-3 flex min-h-[64px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center text-base font-bold transition ${
          dragging ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-950 text-slate-100 hover:bg-slate-800'
        } ${busy || disabled ? 'pointer-events-none opacity-40' : ''}`}
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        {disabled ? 'Stop listening first' : 'Choose a voice note (or drop it here)'}
        <input
          type="file"
          accept="audio/*,video/*,.opus,.ogg,.oga,.m4a,.aac,.mp3,.wav,.mp4,.3gp"
          className="sr-only"
          disabled={busy || disabled}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) run(f);
            e.target.value = '';
          }}
        />
      </label>

      <div role="status" aria-live="polite" className="mt-3">
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
        The first time, Motion downloads the speech model once ({MODELS[model].size.split(',')[0]}); after that it is kept on the device. Whisper can still mishear names and strong accents, so treat the text as a guide.
      </p>
    </section>
  );
}

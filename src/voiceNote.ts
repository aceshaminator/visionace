// Voice notes: reads an audio or video file, cuts it into pieces at the quietest moments,
// and has Whisper (in a background worker) write out each piece.

export type VoiceLine = { text: string; start: number; end: number };

export type VoiceNoteEvent =
  | { type: 'reading' }
  | { type: 'loading' }
  | { type: 'download'; percent: number }
  | { type: 'ready' }
  | { type: 'part'; index: number; total: number; lines: VoiceLine[] };

export type ModelKey = 'better' | 'fast';
export const MODELS: Record<ModelKey, { id: string; label: string; size: string }> = {
  better: { id: 'Xenova/whisper-base.en', label: 'Better accuracy', size: 'about 75 MB, slower' },
  fast: { id: 'Xenova/whisper-tiny.en', label: 'Faster', size: 'about 40 MB, less accurate' },
};

export const ERR_DECODE = 'DECODE'; // the file could not be opened as sound
export const ERR_SHORT = 'SHORT'; // nothing long enough to write out
export const ERR_CANCELLED = 'cancelled';

const SR = 16000;

// Decodes a file to mono sound at 16 000 samples a second, the rate Whisper needs.
export async function decodeAudio(file: File): Promise<Float32Array> {
  const data = await file.arrayBuffer();
  const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AC({ sampleRate: SR });
  try {
    let buf: AudioBuffer;
    try {
      buf = await ctx.decodeAudioData(data);
    } catch {
      throw new Error(ERR_DECODE);
    }
    const n = buf.length;
    const mono = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < n; i++) mono[i] += ch[i] / buf.numberOfChannels;
    }
    if (buf.sampleRate === SR) return mono;
    // Some browsers ignore the requested rate: resample in a simple way.
    const ratio = buf.sampleRate / SR;
    const outLen = Math.floor(n / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const p = i * ratio;
      const i0 = Math.floor(p);
      const i1 = Math.min(n - 1, i0 + 1);
      out[i] = mono[i0] + (mono[i1] - mono[i0]) * (p - i0);
    }
    return out;
  } finally {
    ctx.close().catch(() => {});
  }
}

// Whisper reads at most 30 seconds at a time. Cut about every 25 seconds, at the quietest 0.1 s nearby,
// so words are not split in half.
export function splitWindows(audio: Float32Array): [number, number][] {
  const TARGET = 25 * SR;
  const SEARCH = 4 * SR;
  const FRAME = SR / 10;
  const out: [number, number][] = [];
  let start = 0;
  while (start < audio.length) {
    const end = start + TARGET;
    if (end >= audio.length) { out.push([start, audio.length]); break; }
    let bestPos = end;
    let bestE = Infinity;
    for (let p = end - SEARCH; p + FRAME <= end; p += FRAME) {
      let e = 0;
      for (let i = p; i < p + FRAME; i++) e += audio[i] * audio[i];
      if (e < bestE) { bestE = e; bestPos = p + (FRAME >> 1); }
    }
    out.push([start, bestPos]);
    start = bestPos;
  }
  return out.filter(([a, b]) => b - a >= SR * 0.4);
}

// Starts writing out a file. Returns the job: `promise` ends with the number of lines written, `cancel` stops it.
export function transcribeVoiceNote(file: File, model: string, onEvent: (e: VoiceNoteEvent) => void) {
  let worker: Worker | null = null;
  let cancelled = false;
  let rejectNow: ((e: Error) => void) | null = null;

  const cancel = () => {
    cancelled = true;
    if (worker) { worker.terminate(); worker = null; }
    if (rejectNow) rejectNow(new Error(ERR_CANCELLED));
  };

  const promise = (async (): Promise<number> => {
    onEvent({ type: 'reading' });
    const audio = await decodeAudio(file);
    if (cancelled) throw new Error(ERR_CANCELLED);
    const windows = splitWindows(audio);
    if (!windows.length) throw new Error(ERR_SHORT);

    return new Promise<number>((resolve, reject) => {
      rejectNow = reject;
      const w = new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' });
      worker = w;
      let count = 0;
      const finish = () => { w.terminate(); if (worker === w) worker = null; };
      w.onmessage = (e: MessageEvent) => {
        const m: any = e.data;
        if (!m) return;
        if (m.type === 'loading') onEvent({ type: 'loading' });
        else if (m.type === 'download') onEvent({ type: 'download', percent: m.percent });
        else if (m.type === 'ready') onEvent({ type: 'ready' });
        else if (m.type === 'part') {
          const lines: VoiceLine[] = Array.isArray(m.chunks) ? m.chunks : [];
          count += lines.length;
          onEvent({ type: 'part', index: m.index, total: m.total, lines });
        } else if (m.type === 'done') { finish(); resolve(count); }
        else if (m.type === 'error') { finish(); reject(new Error(String(m.message))); }
      };
      w.onerror = (ev: ErrorEvent) => { finish(); reject(new Error(ev.message || 'The speech engine could not start.')); };
      w.postMessage({ type: 'transcribe', model, audio, windows }, [audio.buffer as ArrayBuffer]);
    });
  })();

  return { promise, cancel };
}

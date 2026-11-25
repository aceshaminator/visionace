// Runs Whisper (speech to text) away from the screen so the app stays smooth.
// The model is downloaded the first time and kept by the browser for later.
import { pipeline, env } from '@huggingface/transformers';

type Chunk = { text: string; start: number; end: number };

const ctx: any = self;
const SR = 16000;

ctx.onmessage = async (e: MessageEvent) => {
  const msg: any = e.data;
  if (!msg || msg.type !== 'transcribe') return;
  try {
    env.allowLocalModels = false; // the app's own /models folder holds only the Vosk model
    ctx.postMessage({ type: 'loading' });

    const files: Record<string, { loaded: number; total: number }> = {};
    const asr: any = await (pipeline as any)('automatic-speech-recognition', msg.model, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p: any) => {
        if (!p || p.status !== 'progress' || !p.file) return;
        files[p.file] = { loaded: Number(p.loaded) || 0, total: Number(p.total) || 0 };
        let loaded = 0;
        let total = 0;
        for (const k of Object.keys(files)) { loaded += files[k].loaded; total += files[k].total; }
        if (total > 0) ctx.postMessage({ type: 'download', percent: Math.min(100, Math.round((loaded / total) * 100)) });
      },
    });
    ctx.postMessage({ type: 'ready' });

    const audio: Float32Array = msg.audio;
    const windows: [number, number][] = msg.windows;
    for (let i = 0; i < windows.length; i++) {
      const [a, b] = windows[i];
      const out: any = await asr(audio.subarray(a, b), { return_timestamps: true });
      const offset = a / SR;
      const chunks: Chunk[] = [];
      const raw: any[] = Array.isArray(out && out.chunks) ? out.chunks : [];
      for (const c of raw) {
        const text = String((c && c.text) || '').trim();
        if (!text || /^\[?\s*BLANK_AUDIO\s*\]?$/i.test(text)) continue;
        const ts: any = c.timestamp;
        const t0 = Array.isArray(ts) && typeof ts[0] === 'number' ? ts[0] : 0;
        const t1 = Array.isArray(ts) && typeof ts[1] === 'number' ? ts[1] : t0;
        chunks.push({ text, start: offset + t0, end: offset + t1 });
      }
      if (!chunks.length) {
        const text = String((out && out.text) || '').trim();
        if (text && !/^\[?\s*BLANK_AUDIO\s*\]?$/i.test(text)) chunks.push({ text, start: offset, end: b / SR });
      }
      ctx.postMessage({ type: 'part', index: i, total: windows.length, chunks });
    }
    ctx.postMessage({ type: 'done' });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: String((err && err.message) || err || 'unknown error') });
  }
};

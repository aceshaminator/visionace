// Listens for sirens and alarms by looking for loud, pure, sustained tones that sweep (sirens) or beep (alarms).
// Plain maths on sound blocks, no libraries, so it can be tested with made-up sounds.
// It is an aid, not a guarantee: it can miss an alarm or raise a false alarm.

export type AlarmKind = 'siren' | 'fire' | 'alarm';
export type Sensitivity = 'low' | 'normal' | 'high';
export type AlarmEvent = { kind: AlarmKind; label: string };

export const LABELS: Record<AlarmKind, string> = {
  siren: 'Possible siren',
  fire: 'Possible smoke or fire alarm',
  alarm: 'Possible alarm or alert tone',
};

const SENS: Record<Sensitivity, { margin: number; rmin: number; scale: number }> = {
  low: { margin: 16, rmin: 0.55, scale: 1.25 },
  normal: { margin: 11, rmin: 0.48, scale: 1 },
  high: { margin: 7, rmin: 0.4, scale: 0.8 },
};

type Frame = { t: number; f: number; tonal: boolean; wide: boolean; margin: number };
type Seg = { start: number; end: number; meanF: number };

class FFT {
  private cos: Float64Array;
  private sin: Float64Array;
  private rev: Uint32Array;
  constructor(private n: number) {
    this.cos = new Float64Array(n / 2);
    this.sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) { this.cos[i] = Math.cos((2 * Math.PI * i) / n); this.sin[i] = -Math.sin((2 * Math.PI * i) / n); }
    this.rev = new Uint32Array(n);
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b); this.rev[i] = r; }
  }
  transform(re: Float64Array, im: Float64Array) {
    const n = this.n;
    for (let i = 0; i < n; i++) { const j = this.rev[i]; if (j > i) { const a = re[i]; re[i] = re[j]; re[j] = a; const b = im[i]; im[i] = im[j]; im[j] = b; } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half;
          const tr = re[b] * this.cos[k] - im[b] * this.sin[k];
          const ti = re[b] * this.sin[k] + im[b] * this.cos[k];
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
  }
}

export class AlarmDetector {
  private N = 1024;
  private hop = 512;
  private fft = new FFT(1024);
  private win = new Float64Array(1024);
  private re = new Float64Array(1024);
  private im = new Float64Array(1024);
  private acc = new Float32Array(1024 * 8);
  private accLen = 0;
  private frameNo = 0;
  private floorDb = 0;
  private hasFloor = false;
  history: Frame[] = [];
  private kLo: number;
  private kHi: number;
  private sinceEval = 0;
  private cfg = SENS.normal;
  private penalty = 0; // extra margin after the person said "not an alarm"
  level = 0; // how far above the room's usual sound it is right now, in dB

  constructor(private fs: number, sens: Sensitivity = 'normal') {
    for (let i = 0; i < this.N; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this.N - 1));
    this.kLo = Math.ceil((400 * this.N) / fs);
    this.kHi = Math.floor((Math.min(4400, fs / 2 - 100) * this.N) / fs);
    this.setSensitivity(sens);
  }

  setSensitivity(s: Sensitivity) { this.cfg = SENS[s]; }
  lessSensitive() { this.penalty = Math.min(10, this.penalty + 2); }
  reset() { this.history = []; this.accLen = 0; this.hasFloor = false; this.sinceEval = 0; }

  // Feed a block of sound. Returns what is being heard right now, or null.
  push(block: Float32Array): AlarmEvent | null {
    if (this.accLen + block.length > this.acc.length) { this.accLen = 0; } // never grow: drop old sound
    this.acc.set(block, this.accLen);
    this.accLen += block.length;
    let result: AlarmEvent | null = null;
    while (this.accLen >= this.N) {
      this.frame();
      this.acc.copyWithin(0, this.hop, this.accLen);
      this.accLen -= this.hop;
      this.sinceEval++;
      if (this.sinceEval >= 4) { this.sinceEval = 0; const r = this.evaluate(); if (r) result = r; }
    }
    return result;
  }

  private frame() {
    const N = this.N, fs = this.fs;
    let sum = 0;
    for (let i = 0; i < N; i++) { const x = this.acc[i]; this.re[i] = x * this.win[i]; this.im[i] = 0; sum += x * x; }
    const levelDb = 20 * Math.log10(Math.sqrt(sum / N) + 1e-9);
    // The room's usual sound. At the start, assume a fairly quiet room, so that a siren that is already
    // sounding is still noticed. It then follows the room slowly upwards and quickly downwards.
    if (!this.hasFloor) { this.floorDb = Math.min(levelDb, -45); this.hasFloor = true; }
    if (levelDb < this.floorDb) this.floorDb = Math.max(levelDb, -75);
    else this.floorDb += (levelDb - this.floorDb) * (this.frameNo < 300 ? 0.004 : 0.002);
    const margin = levelDb - this.floorDb;
    this.level = margin;

    this.fft.transform(this.re, this.im);
    const kLo = this.kLo, kHi = this.kHi;
    const P = new Float64Array(kHi + 4);
    let total = 0, peak = kLo, pk = 0;
    for (let k = kLo; k <= kHi + 3; k++) {
      const p = this.re[k] * this.re[k] + this.im[k] * this.im[k];
      P[k] = p;
      if (k <= kHi) { total += p; if (p > pk) { pk = p; peak = k; } }
    }
    const t = (this.frameNo * this.hop) / fs;
    this.frameNo++;
    let tonal = false, wide = false, f = 0;
    if (total > 0 && peak > kLo && peak < kHi) {
      const near = (c: number, r = 2) => { let s = 0; for (let k = c - r; k <= c + r; k++) if (k >= kLo && k <= kHi) s += P[k]; return s; };
      let tone = near(peak);
      // Real sirens and alarms have weaker copies of the tone at double and triple the pitch: count them.
      if (peak * 2 <= kHi) tone += near(peak * 2);
      if (peak * 3 <= kHi) tone += near(peak * 3);
      const ratio = tone / total;
      const sorted = Array.from(P.subarray(kLo, kHi + 1)).sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1] + 1e-12;
      const tdb = 10 * Math.log10(pk / median);
      const a = Math.log(P[peak - 1] + 1e-12), b = Math.log(P[peak] + 1e-12), c = Math.log(P[peak + 1] + 1e-12);
      const d = a - 2 * b + c;
      const delta = d === 0 ? 0 : (0.5 * (a - c)) / d;
      f = ((peak + Math.max(-0.5, Math.min(0.5, delta))) * fs) / N;
      const loudEnough = margin >= this.cfg.margin + this.penalty && levelDb > -62;
      tonal = ratio >= this.cfg.rmin && tdb >= 16 && loudEnough;
      // A fast siren (yelp) changes pitch within one analysis window, so its energy is smeared over a wider band.
      if (!tonal && loudEnough && tdb >= 12 && near(peak, 10) / total >= Math.min(0.85, this.cfg.rmin + 0.3)) { tonal = true; wide = true; }
    }
    this.history.push({ t, f, tonal, wide, margin });
    const keep = Math.ceil((9 * fs) / this.hop);
    if (this.history.length > keep) this.history.splice(0, this.history.length - keep);
  }

  // Runs of tonal frames in a frequency band that hold a steady pitch (a beep or a continuous tone).
  private segments(lo: number, hi: number, from: number): Seg[] {
    const segs: Seg[] = [];
    let cur: { start: number; end: number; sum: number; n: number; gap: number } | null = null;
    const dt = this.hop / this.fs;
    for (const fr of this.history) {
      if (fr.t < from) continue;
      const ok = fr.tonal && !fr.wide && fr.f >= lo && fr.f <= hi && (!cur || Math.abs(fr.f - cur.sum / cur.n) < 140);
      if (ok) {
        if (!cur) cur = { start: fr.t, end: fr.t, sum: 0, n: 0, gap: 0 };
        cur.end = fr.t; cur.sum += fr.f; cur.n++; cur.gap = 0;
      } else if (cur) {
        cur.gap++;
        if (cur.gap > 3) { segs.push({ start: cur.start, end: cur.end + dt, meanF: cur.sum / cur.n }); cur = null; }
      }
    }
    if (cur) segs.push({ start: cur.start, end: cur.end + dt, meanF: cur.sum / cur.n });
    return segs;
  }

  private beeps(segs: Seg[], minCount: number, maxSpread: number): boolean {
    const good = segs.filter((s) => s.end - s.start >= 0.12 && s.end - s.start <= 1.3);
    for (let i = 0; i + minCount <= good.length; i++) {
      const run = good.slice(i, i + minCount);
      let ok = true;
      for (let j = 1; j < run.length; j++) {
        const gap = run[j].start - run[j - 1].end;
        if (gap < 0.08 || gap > 1.5) { ok = false; break; }
      }
      if (!ok) continue;
      const fs = run.map((s) => s.meanF);
      if (Math.max(...fs) - Math.min(...fs) <= maxSpread) return true;
    }
    return false;
  }

  private evaluate(): AlarmEvent | null {
    const h = this.history;
    if (h.length < 20) return null;
    const now = h[h.length - 1].t;
    const sc = this.cfg.scale;
    const dt = this.hop / this.fs;

    // Smoke or fire alarm: high pitch (about 2.2 to 4.4 kHz), steady, in beeps or continuous.
    const high = this.segments(2200, 4400, now - 8);
    if (this.beeps(high.filter((s) => s.end > now - 6), Math.max(3, Math.ceil(3 * sc)), 250)) return { kind: 'fire', label: LABELS.fire };
    if (high.some((s) => s.end > now - 1 && s.end - s.start >= 3 * sc)) return { kind: 'fire', label: LABELS.fire };

    // Siren: a loud tone between about 450 and 1900 Hz that keeps gliding (wail, yelp) or alternates between two pitches.
    const loudNeed = this.cfg.margin + this.penalty + 3;
    const w = h.filter((fr) => fr.t >= now - 3.5 * sc);
    if (w.length >= 40) {
      const band = w.filter((fr) => fr.tonal && fr.f >= 450 && fr.f <= 1900);
      if (band.length / w.length >= 0.6 && band.reduce((s, fr) => s + fr.margin, 0) / band.length >= loudNeed) {
        const fsorted = band.map((fr) => fr.f).sort((a, b) => a - b);
        const p10 = fsorted[Math.floor(fsorted.length * 0.1)], p90 = fsorted[Math.floor(fsorted.length * 0.9)];
        let moving = 0, pairs = 0, prev: Frame | null = null;
        for (const fr of band) {
          if (prev && fr.t - prev.t < dt * 2.5) { pairs++; const d = Math.abs(fr.f - prev.f); if (d >= 6 && d <= 260) moving++; }
          prev = fr;
        }
        // A siren glides all the time. A whistled tune or a held note stays on one pitch for a while.
        if (p90 - p10 >= 140 && pairs > 10 && moving / pairs >= 0.45) return { kind: 'siren', label: LABELS.siren };
      }
    }
    const w2 = h.filter((fr) => fr.t >= now - 5 * sc);
    if (w2.length >= 100) {
      const band = w2.filter((fr) => fr.tonal && fr.f >= 450 && fr.f <= 1900);
      if (band.length / w2.length >= 0.6 && band.reduce((s, fr) => s + fr.margin, 0) / band.length >= loudNeed) {
        // Two-pitch siren: two steady pitches, each used a lot, taking turns again and again.
        const bins = new Map<number, number>();
        for (const fr of band) { const b = Math.round(fr.f / 30); bins.set(b, (bins.get(b) || 0) + 1); }
        const near = (b: number) => (bins.get(b - 1) || 0) + (bins.get(b) || 0) + (bins.get(b + 1) || 0);
        const top = Array.from(bins.keys()).sort((a, b) => near(b) - near(a));
        const a = top[0];
        const b = top.find((k) => Math.abs(k - a) * 30 >= 100);
        if (a !== undefined && b !== undefined && near(a) / band.length >= 0.28 && near(b) / band.length >= 0.28) {
          let last = 0, turns = 0;
          for (const fr of band) {
            const ba = Math.round(fr.f / 30);
            const lab = Math.abs(ba - a) <= 1 ? 1 : Math.abs(ba - b) <= 1 ? 2 : 0;
            if (lab && last && lab !== last) turns++;
            if (lab) last = lab;
          }
          if (turns >= 4) return { kind: 'siren', label: LABELS.siren };
        }
      }
    }

    // Other alarms: a steady loud tone for several seconds, or a series of beeps.
    const steady = h.filter((fr) => fr.t >= now - 4.5 * sc);
    if (steady.length >= 100) {
      const tn = steady.filter((fr) => fr.tonal && !fr.wide);
      if (tn.length / steady.length >= 0.85) {
        const mean = tn.reduce((s, fr) => s + fr.f, 0) / tn.length;
        const sd = Math.sqrt(tn.reduce((s, fr) => s + (fr.f - mean) ** 2, 0) / tn.length);
        if (sd <= 45) return { kind: 'alarm', label: LABELS.alarm };
      }
    }
    const lowBeeps = this.segments(450, 2200, now - 8);
    if (this.beeps(lowBeeps.filter((s) => s.end > now - 7), Math.max(5, Math.ceil(5 * sc)), 120)) return { kind: 'alarm', label: LABELS.alarm };
    return null;
  }
}

// A rough guess whether a voice sounds lower or higher, from its pitch. Typical adult men speak around
// 85 to 155 Hz and women around 165 to 255 Hz, but the ranges overlap and children and some adults fall
// in between, so this is only ever shown as a guess.

export function estimatePitch(x: Float32Array, sampleRate: number): number | null {
  const n = x.length;
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.min(Math.floor(sampleRate / 70), n - 2);
  if (maxLag <= minLag + 2 || n < 2 * minLag) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  let power = 0;
  for (let i = 0; i < n; i++) { const v = x[i] - mean; power += v * v; }
  if (power / n < 1e-6) return null; // too quiet to measure

  const r = new Float32Array(maxLag + 2);
  let bestR = 0;
  let bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0, ea = 0, eb = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = x[i] - mean;
      const b = x[i + lag] - mean;
      s += a * b; ea += a * a; eb += b * b;
    }
    const d = Math.sqrt(ea * eb);
    const v = d > 0 ? s / d : 0;
    r[lag] = v;
    if (v > bestR) { bestR = v; bestLag = lag; }
  }
  if (bestR < 0.5) return null; // not a steady voiced sound

  // Prefer the shortest strong peak, so a double-length period is not mistaken for the pitch.
  let chosen = bestLag;
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (r[lag] >= 0.9 * bestR && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) { chosen = lag; break; }
  }
  const y0 = r[chosen - 1], y1 = r[chosen], y2 = r[chosen + 1];
  const d2 = y0 - 2 * y1 + y2;
  const shift = d2 !== 0 ? (0.5 * (y0 - y2)) / d2 : 0;
  return sampleRate / (chosen + shift);
}

export type VoiceGuess = { voice: 'male' | 'female' | 'unclear'; hz: number };

export const MALE_BELOW_HZ = 155;
export const FEMALE_ABOVE_HZ = 185;

// The guess for a whole sentence, from the middle value of many small measurements.
export function guessVoice(pitches: number[]): VoiceGuess | null {
  if (pitches.length < 3) return null;
  const s = [...pitches].sort((a, b) => a - b);
  const hz = s[Math.floor(s.length / 2)];
  const voice = hz < MALE_BELOW_HZ ? 'male' : hz > FEMALE_ABOVE_HZ ? 'female' : 'unclear';
  return { voice, hz: Math.round(hz) };
}

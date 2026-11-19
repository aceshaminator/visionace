// Choosing a spoken voice that matches the person. Browsers do not say whether a voice is male or female,
// so this guesses from the voice's name, and the person can always pick a voice by hand and test it.

export type VoiceKind = 'default' | 'female' | 'male';

const FEMALE = new Set([
  'female', 'woman', 'zira', 'hazel', 'susan', 'heera', 'linda', 'catherine', 'eva', 'helena', 'hedda', 'katja',
  'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'allison', 'ava', 'kate', 'serena', 'sara', 'sarah',
  'joanna', 'salli', 'kimberly', 'kendra', 'ivy', 'emma', 'amy', 'nicole', 'olivia', 'libby', 'sonia', 'natasha',
  'clara', 'mia', 'jenny', 'aria', 'michelle', 'ana', 'abeo', 'ezinne', 'zuri',
]);
const MALE = new Set([
  'male', 'man', 'david', 'mark', 'george', 'james', 'richard', 'daniel', 'alex', 'fred', 'tom', 'rishi', 'oliver',
  'arthur', 'matthew', 'guy', 'ryan', 'davis', 'brian', 'joey', 'justin', 'kevin', 'russell', 'geraint', 'liam',
  'connor', 'christopher', 'eric', 'roger', 'steffan', 'thomas', 'ethan', 'abeo_m', 'chinedu',
]);

export function guessVoiceGender(name: string): 'female' | 'male' | 'unknown' {
  const tokens = name.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (tokens.some((t) => FEMALE.has(t))) return 'female'; // "female" is checked before "male"
  if (tokens.some((t) => MALE.has(t))) return 'male';
  return 'unknown';
}

type VoiceLike = { name: string; lang: string; localService?: boolean };

// The best voice for the wanted kind, preferring the person's own language, then local voices.
export function pickVoice<T extends VoiceLike>(voices: T[], kind: 'female' | 'male', lang: string): T | null {
  if (!voices.length) return null;
  const want = (lang || 'en-US').toLowerCase();
  const base = want.split('-')[0];
  const sameLanguage = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = sameLanguage.length ? sameLanguage : voices;
  const score = (v: T) => {
    let s = 0;
    const g = guessVoiceGender(v.name);
    if (g === kind) s += 10;
    else if (g !== 'unknown') s -= 10;
    if (v.lang.toLowerCase() === want) s += 3;
    if (v.localService) s += 1;
    return s;
  };
  let best = pool[0];
  for (const v of pool) if (score(v) > score(best)) best = v;
  return best;
}

// When the phone has no voice known to match, the pitch is bent a little toward the wanted kind.
export function pitchFor(kind: VoiceKind, voice: VoiceLike | null): number {
  if (kind === 'default') return 1;
  if (voice && guessVoiceGender(voice.name) === kind) return 1;
  return kind === 'female' ? 1.2 : 0.8;
}

// Safety checks on the words that were heard. They look at the TEXT only, not at tone of voice, and speech
// recognition makes mistakes, so they can miss a threat or raise a false alarm. Motion therefore always asks
// the person to confirm, and never contacts anyone by itself.

// ---------- rude words ----------

// A starter list of common English swear words. Add more (including local-language words and any insults you
// want hidden) to EXTRA_RUDE_WORDS.
export const EXTRA_RUDE_WORDS: string[] = [];

const RUDE = new Set([
  'fuck', 'fucks', 'fucked', 'fucking', 'fucker', 'fuckers', 'motherfucker', 'motherfuckers', 'motherfucking',
  'shit', 'shits', 'shitty', 'shithead', 'bullshit', 'bitch', 'bitches', 'bitching', 'bastard', 'bastards',
  'asshole', 'assholes', 'arsehole', 'dickhead', 'wanker', 'bollocks', 'twat', 'piss', 'pissing',
  'damn', 'damned', 'goddamn', 'goddamned', 'crap',
]);

function isRudeWord(word: string): boolean {
  const w = word.toLowerCase().replace(/'/g, '');
  return RUDE.has(w) || EXTRA_RUDE_WORDS.some((x) => x.toLowerCase() === w);
}

export function hasProfanity(text: string): boolean {
  return (text.match(/[A-Za-z']+/g) || []).some(isRudeWord);
}

// "fuck" becomes "f***"; very short words become all stars.
export function maskProfanity(text: string): string {
  return text.replace(/[A-Za-z']+/g, (w) =>
    isRudeWord(w) ? (w.length <= 2 ? '*'.repeat(w.length) : w[0] + '*'.repeat(w.length - 1)) : w,
  );
}

// ---------- threats ----------

export type Threat = { kind: 'violence' | 'stalking' | 'weapon' | 'coercion' | 'abuse'; phrase: string };

const WILL = "(?:will|'ll|shall|am going to|are going to|'m going to|'re going to|im going to|gonna|going to|gon na|wanna|want to|must)";
const NOT_AFTER = '(?!\\s+(?:at|in|to|next|tomorrow|there|home|back|later|on))';

const PATTERNS: { kind: Threat['kind']; re: RegExp }[] = [
  // "I will kill you", "I'm going to hurt you", "we'll beat you up"
  { kind: 'violence', re: new RegExp(`\\b(?:i|we)\\s*${WILL}\\s+(?:really\\s+|just\\s+|definitely\\s+|surely\\s+)?(?:kill|murder|stab|shoot|slap|punch|burn|attack|rape|strangle|choke|destroy|finish|hurt|break|beat)\\s+(?:up\\s+)?(?:you|u|ya|your)\\b${NOT_AFTER}`) },
  // "you're dead", "you will die"
  { kind: 'violence', re: /\byou(?:'re| are| will be|'ll be) dead\b/ },
  { kind: 'violence', re: /\byou(?:'re| are)? (?:going to|gonna|will|'ll) die\b/ },
  { kind: 'violence', re: /\bi want you dead\b/ },
  { kind: 'violence', re: /\bi want (?:your|his|her|their) head\b/ },
  { kind: 'violence', re: /\bi(?:'ll| will|'m going to| am going to| gonna)\s+cut\s+(?:you|your (?:throat|neck|head))\b/ },
  // "I know where you live", "watch your back", "I'll find you"
  { kind: 'stalking', re: /\bi know where you (?:live|stay|work|sleep)\b/ },
  { kind: 'stalking', re: /\bwatch your back\b/ },
  { kind: 'stalking', re: /\bi(?:'m| am) watching you\b/ },
  { kind: 'stalking', re: /\byou(?:'ll| will) (?:regret|pay for)\b/ },
  { kind: 'stalking', re: /\bi(?:'ll| will) make you pay\b/ },
  { kind: 'stalking', re: new RegExp(`\\bi(?:'ll| will|'m going to| am going to| gonna)\\s+(?:find|come for|come after|hunt)\\s+you\\b(?!\\s+(?:a|an|the|some|something|one|it|that|tomorrow|later|at|in|on|there))`) },
  // weapons
  { kind: 'weapon', re: /\bi(?:'ll| will) (?:use|pull|bring) (?:a |the |my )?(?:gun|knife|machete|weapon)\b/ },
  // robbery and forcing
  { kind: 'coercion', re: /\b(?:give|hand)\s+(?:over\s+)?(?:me|us)\s+(?:your|ur|the)\s+(?:money|phone|wallet|bag|purse|laptop|jewelry|jewellery|watch)\b.*\b(?:or|now|quick|fast|before)\b/ },
  { kind: 'coercion', re: /\bor i(?:'ll| will|'m going to| am going to) (?:kill|hurt|shoot|stab|beat|hit|slap)\b/ },
  { kind: 'coercion', re: /\bempty your pockets\b/ },
  { kind: 'coercion', re: /\bdon't (?:scream|move|shout)\b/ },
  // harmful abuse
  { kind: 'abuse', re: /\b(?:kill|hang) yourself\b/ },
  { kind: 'abuse', re: /\bgo (?:and )?die\b/ },
  { kind: 'abuse', re: /\bi hope you die\b/ },
  { kind: 'abuse', re: /\bi wish you (?:were|was) dead\b/ },
  // Nigerian Pidgin: "I go beat you" means "I will beat you"
  { kind: 'violence', re: /\bi go\s+(?:kill|beat|finish|waste|slap|punish|deal with|cut)\s+(?:you|am|una|your (?:neck|head|throat))\b/ },
];

export function detectThreat(text: string): Threat | null {
  const t = text.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  for (const p of PATTERNS) {
    const m = t.match(p.re);
    if (m) return { kind: p.kind, phrase: m[0] };
  }
  return null;
}

// ---------- the message sent to a trusted contact ----------

export function cleanPhone(raw: string): string {
  const s = raw.trim();
  return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, '');
}

export type LocationState = 'idle' | 'searching' | 'found' | 'failed';

export function helpMessage(heard: string, mapLink: string, time: string, state: LocationState = 'found'): string {
  const where = mapLink
    ? `My location: ${mapLink}`
    : state === 'failed'
      ? 'My location could not be found.'
      : 'My location is still being found.';
  const said = heard ? ` Words heard: "${heard}".` : '';
  return `I am deaf. I feel threatened and need help. ${where} Time: ${time}.${said} Please call me or come to me.`;
}

export function smsLink(phone: string, body: string): string {
  return `sms:${cleanPhone(phone)}?&body=${encodeURIComponent(body)}`;
}

export function whatsappLink(phone: string, body: string): string {
  return `https://wa.me/${cleanPhone(phone).replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
}

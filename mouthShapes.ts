// Everything needed to draw and animate a human mouth, with no React in it.
// The mouth is described by a few numbers (how open, how wide, how rounded...) and every picture is
// built from them, so shapes blend smoothly into each other instead of jumping between fixed images.

export type MouthWord = { word: string; start: number; end: number }; // seconds
export type MouthPlay = { id: number; at: number; words: MouthWord[]; speed: number };

export type ToneKey = 'light' | 'tan' | 'brown' | 'deep' | 'darkest';
export type Tone = { label: string; skin: [string, string]; lip: string; lipDark: string };

export const TONES: Record<ToneKey, Tone> = {
  light: { label: 'Light', skin: ['#f3cdb3', '#dca384'], lip: '#c85f64', lipDark: '#8c3a44' },
  tan: { label: 'Tan', skin: ['#e3b08a', '#c68a62'], lip: '#b8524e', lipDark: '#7b3234' },
  brown: { label: 'Brown', skin: ['#bd855c', '#8f5d3d'], lip: '#9a4440', lipDark: '#5d2729' },
  deep: { label: 'Deep', skin: ['#8d5c3d', '#62391f'], lip: '#7a3636', lipDark: '#431a1d' },
  darkest: { label: 'Darkest', skin: ['#62402b', '#3f2314'], lip: '#5a2a2a', lipDark: '#2d1214' },
};
export const TONE_KEYS: ToneKey[] = ['light', 'tan', 'brown', 'deep', 'darkest'];

export type VisemeKey =
  | 'rest' | 'AA' | 'EH' | 'EE' | 'OW' | 'OO' | 'MBP' | 'FV' | 'TH' | 'LTD' | 'SZ' | 'SHCH' | 'KG' | 'R';

export type Params = {
  open: number;       // 0 closed ... 1 wide open
  width: number;      // 1 = neutral, bigger = spread, smaller = narrowed
  round: number;      // 0 flat ... 1 pushed forward in a circle
  press: number;      // 1 = lips pressed together
  upperTeeth: number; // how much of the upper teeth show
  lowerTeeth: number;
  tongue: number;     // 0 low ... 1 raised behind the upper teeth
  tongueOut: number;  // 1 = tongue tip between the teeth
  smile: number;      // lifts the corners
};

const P = (
  open: number, width: number, round: number, press: number,
  upperTeeth: number, lowerTeeth: number, tongue: number, tongueOut: number, smile: number,
): Params => ({ open, width, round, press, upperTeeth, lowerTeeth, tongue, tongueOut, smile });

export const VISEMES: Record<VisemeKey, Params> = {
  rest: P(0.03, 1.0, 0, 0.2, 0, 0, 0.3, 0, 0.12),
  AA: P(1.0, 1.02, 0, 0, 0.85, 0.55, 0.1, 0, 0),
  EH: P(0.55, 1.1, 0, 0, 1, 0.4, 0.35, 0, 0.15),
  EE: P(0.22, 1.32, 0, 0, 1, 0.6, 0.55, 0, 0.5),
  OW: P(0.6, 0.72, 0.75, 0, 0.5, 0.3, 0.2, 0, 0),
  OO: P(0.2, 0.56, 1, 0, 0.15, 0, 0.3, 0, 0),
  MBP: P(0, 0.98, 0, 1, 0, 0, 0, 0, 0),
  FV: P(0.16, 1.0, 0, 0.2, 1, 0, 0.2, 0, 0),
  TH: P(0.22, 1.05, 0, 0, 0.9, 0.4, 0.5, 1, 0.1),
  LTD: P(0.38, 1.02, 0, 0, 0.9, 0.3, 1, 0, 0.1),
  SZ: P(0.1, 1.22, 0, 0, 1, 0.8, 0.5, 0, 0.3),
  SHCH: P(0.3, 0.78, 0.6, 0, 0.7, 0.5, 0.6, 0, 0),
  KG: P(0.4, 1.0, 0, 0, 0.6, 0.3, 0.2, 0, 0.05),
  R: P(0.3, 0.84, 0.4, 0, 0.6, 0.3, 0.6, 0, 0),
};

export const LABELS: Record<VisemeKey, string> = {
  rest: 'Resting',
  AA: 'A / AH (wide open)',
  EH: 'E (half open)',
  EE: 'EE (spread)',
  OW: 'O (rounded)',
  OO: 'OO (small circle)',
  MBP: 'M / B / P (lips closed)',
  FV: 'F / V (teeth on lip)',
  TH: 'TH (tongue tip)',
  LTD: 'L / T / D (tongue up)',
  SZ: 'S / Z (teeth together)',
  SHCH: 'SH / CH (lips pushed)',
  KG: 'K / G',
  R: 'R',
};

// ---------- from words to mouth shapes ----------

const PAIRS: Record<string, VisemeKey> = {
  th: 'TH', sh: 'SHCH', ch: 'SHCH', zh: 'SHCH', ph: 'FV', wh: 'OO', ck: 'KG', ng: 'KG',
  oo: 'OO', ew: 'OO', ue: 'OO', ee: 'EE', ea: 'EE', ie: 'EE', ou: 'OW', ow: 'OW', oa: 'OW', oe: 'OW',
  ai: 'EH', ay: 'EH', ei: 'EH', ey: 'EH', au: 'AA', aw: 'AA',
};
const SINGLES: Record<string, VisemeKey> = {
  a: 'AA', e: 'EH', i: 'EH', o: 'OW', u: 'AA', y: 'EE',
  b: 'MBP', m: 'MBP', p: 'MBP', f: 'FV', v: 'FV',
  l: 'LTD', n: 'LTD', t: 'LTD', d: 'LTD', s: 'SZ', z: 'SZ',
  k: 'KG', g: 'KG', q: 'KG', x: 'KG', r: 'R', w: 'OO', j: 'SHCH',
};

// A simple spelling-based guess at the mouth shapes of an English word.
export function wordToVisemes(raw: string): VisemeKey[] {
  let w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [];
  if (w.length > 3 && /[^aeiouy]e$/.test(w)) w = w.slice(0, -1); // silent final e
  const out: VisemeKey[] = [];
  const push = (v: VisemeKey) => { if (out[out.length - 1] !== v) out.push(v); };
  let i = 0;
  while (i < w.length) {
    const pair = PAIRS[w.slice(i, i + 2)];
    if (pair) { push(pair); i += 2; continue; }
    const ch = w[i];
    if (ch === 'h') { i++; continue; }
    if (ch === 'c') { push(/[eiy]/.test(w[i + 1] || '') ? 'SZ' : 'KG'); i++; continue; }
    const single = SINGLES[ch];
    if (single) push(single);
    i++;
  }
  return out;
}

// Spreads typed or recognised text over a number of seconds, longer words getting more time.
export function wordsFromText(text: string, totalSeconds: number): MouthWord[] {
  const parts = text.split(/\s+/).filter((p) => /[a-z]/i.test(p));
  if (!parts.length) return [];
  const weights = parts.map((p) => Math.max(2, p.replace(/[^a-z]/gi, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return parts.map((word, i) => {
    const dur = (weights[i] / total) * totalSeconds;
    const w = { word, start: t, end: t + dur * 0.92 };
    t += dur;
    return w;
  });
}

export type Key = { t: number; v: VisemeKey };

export function buildKeys(words: MouthWord[]): Key[] {
  if (!words.length) return [];
  const t0 = words[0].start;
  const keys: Key[] = [];
  words.forEach((w, wi) => {
    const syms = wordToVisemes(w.word);
    if (!syms.length) return;
    const s = w.start - t0;
    const e = Math.max(w.end - t0, s + 0.12);
    const step = (e - s) / syms.length;
    syms.forEach((v, i) => keys.push({ t: s + i * step, v }));
    const next = words[wi + 1];
    if (!next || next.start - w.end > 0.25) keys.push({ t: e + 0.02, v: 'rest' });
  });
  return keys;
}

// ---------- drawing ----------
// The picture has three layers. The back and front layers (background, neck, nose, soft shading) are
// drawn once. Only the middle layer (face, jaw, lips, teeth, tongue) changes, 60 times a second.

export type Attrs = Record<string, Record<string, string>>;

const f = (n: number) => n.toFixed(1);
const pt = (x: number, y: number) => `${f(x)},${f(y)}`;

export const VIEW_W = 400;
export const VIEW_H = 420;

// The numbers that change from frame to frame: where every line and shape of the lower face goes.
export function frameAttrs(p: Params): Attrs {
  const Wc = 78 * p.width * (1 - 0.38 * p.round); // half the width of the mouth
  const H = 64 * p.open;                           // height of the opening
  const Hu = 0.14 * H;                             // upper part of the opening
  const Hl = 0.86 * H;                             // lower part: this is the jaw dropping
  const HuK = Hu * 1.34;
  const HlK = Hl * 1.34;
  const c = 2 - p.smile * 9;                       // height of the mouth corners
  const sq = 1 - 0.12 * p.press;                   // pressed lips look thinner
  const tu = (13 + 7 * p.round) * sq;              // upper lip thickness
  const tl = (17 + 8 * p.round) * sq;              // lower lip thickness
  const peak = 1.52 - 0.14 * p.round;              // the two peaks of the upper lip
  const dip = 1.24 + 0.14 * p.round;               // the dip between them
  const J = Hl;                                    // how far the chin follows the lower lip down

  const kx = 0.58 + 0.42 * p.round;                // rounder corners when the lips are pushed forward
  const topFwd = `C ${pt(-Wc * kx, c - HuK)} ${pt(Wc * kx, c - HuK)} ${pt(Wc, c)}`;
  const topRev = `C ${pt(Wc * kx, c - HuK)} ${pt(-Wc * kx, c - HuK)} ${pt(-Wc, c)}`;
  const botRev = `C ${pt(Wc * kx, c + HlK)} ${pt(-Wc * kx, c + HlK)} ${pt(-Wc, c)}`;
  const aperture = `M ${pt(-Wc, c)} ${topFwd} ${botRev} Z`;

  const upper =
    `M ${pt(-Wc, c)} ` +
    `C ${pt(-Wc * 0.78, c - tu * 0.55 - HuK * 0.9)} ${pt(-Wc * 0.42, c - tu * (peak - 0.07) - HuK)} ${pt(-Wc * 0.17, c - tu * peak - HuK)} ` +
    `C ${pt(-Wc * 0.09, c - tu * peak - HuK)} ${pt(-Wc * 0.04, c - tu * (dip - 0.02) - HuK)} ${pt(0, c - tu * dip - HuK)} ` +
    `C ${pt(Wc * 0.04, c - tu * (dip - 0.02) - HuK)} ${pt(Wc * 0.09, c - tu * peak - HuK)} ${pt(Wc * 0.17, c - tu * peak - HuK)} ` +
    `C ${pt(Wc * 0.42, c - tu * (peak - 0.07) - HuK)} ${pt(Wc * 0.78, c - tu * 0.55 - HuK * 0.9)} ${pt(Wc, c)} ` +
    `${topRev} Z`;

  const lower =
    `M ${pt(-Wc, c)} ` +
    `C ${pt(-Wc * 0.72, c + HlK + tl * 1.35)} ${pt(Wc * 0.72, c + HlK + tl * 1.35)} ${pt(Wc, c)} ` +
    `${botRev} Z`;

  const topY = c - HuK * 0.75 - 2;
  const upDrop = p.upperTeeth * (8 + 0.36 * H);
  const loRise = p.lowerTeeth * (6 + 0.24 * H);
  const yb = c + Hl;
  const sepX = [-0.57, -0.285, 0, 0.285, 0.57].map((k) => k * Wc);
  const upSep = upDrop > 2 ? sepX.map((x) => `M ${pt(x, topY)} L ${pt(x, topY + upDrop)}`).join(' ') : 'M 0,0';
  const yCrease = c + Hl + tl * 1.05 + 7;

  // The face outline: the cheeks stay still, the chin and jaw line follow the lower lip down.
  const face =
    `M 66,0 C 48,80 50,170 70,226 ` +
    `C 82,${f(258 + 0.25 * J)} 112,${f(292 + 0.7 * J)} 150,${f(318 + 0.95 * J)} ` +
    `C 170,${f(331 + J)} 185,${f(337 + J)} 200,${f(337 + J)} ` +
    `C 215,${f(337 + J)} 230,${f(331 + J)} 250,${f(318 + 0.95 * J)} ` +
    `C 288,${f(292 + 0.7 * J)} 318,${f(258 + 0.25 * J)} 330,226 ` +
    `C 350,170 352,80 334,0 Z`;

  return {
    face: { d: face },
    faceShade: { d: face },
    chinHi: { cx: '200', cy: f(300 + J), rx: '30', ry: '13' },
    chinShadow: { cx: '200', cy: f(346 + J), rx: '110', ry: '20' },
    upper: { d: upper },
    lower: { d: lower },
    ap: { d: aperture },
    apClip: { d: aperture },
    seam: { d: aperture },
    upTeeth: { x: f(-Wc * 0.86), y: f(topY - 10), width: f(Wc * 1.72), height: f(upDrop + 10) },
    upSep: { d: upSep },
    loTeeth: { x: f(-Wc * 0.78), y: f(yb - loRise), width: f(Wc * 1.56), height: f(loRise + 10) },
    tongue: { cx: '0', cy: f(c + Hl * (0.84 - 0.55 * p.tongue) + 3), rx: f(Wc * 0.52), ry: f(7 + Hl * 0.38) },
    tip: { cx: '0', cy: f(c + Hl * 0.35 + 2), rx: f(Wc * 0.27), ry: f(4 + Hl * 0.1), opacity: f(p.tongueOut) },
    shade: { x: f(-Wc), y: f(c - HuK - 4), width: f(Wc * 2), height: f(16 + HuK) },
    hi: { cx: '0', cy: f(c + Hl + tl * 0.55), rx: f(Wc * 0.3), ry: f(Math.max(2, tl * 0.22)) },
    crease: { d: `M ${pt(-Wc * 0.62, yCrease)} Q ${pt(0, yCrease + 11)} ${pt(Wc * 0.62, yCrease)}` },
    cornerL: { cx: f(-Wc), cy: f(c) },
    cornerR: { cx: f(Wc), cy: f(c) },
  };
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export const BACKDROP = '#0b1220';

// Back layer: the dark backdrop and the neck. Drawn once.
export function bgMarkup(tone: ToneKey): string {
  const t = TONES[tone];
  const neckTop = mix(t.skin[1], '#000000', 0.35);
  const neckBottom = mix(t.skin[1], '#000000', 0.62);
  return `
<defs>
  <linearGradient id="ma-neckG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${neckTop}"/><stop offset="1" stop-color="${neckBottom}"/></linearGradient>
</defs>
<rect width="${VIEW_W}" height="${VIEW_H}" fill="${BACKDROP}"/>
<path d="M 118,280 C 118,350 100,392 62,${VIEW_H} L 338,${VIEW_H} C 300,392 282,350 282,280 Z" fill="url(#ma-neckG)"/>`;
}

// Front layer: nose, folds and soft shading on top of the face. Drawn once; the soft blur is fine here
// because this layer never changes.
export function fgMarkup(tone: ToneKey): string {
  const t = TONES[tone];
  const nostril = mix(t.skin[1], '#000000', 0.78);
  return `
<defs>
  <radialGradient id="ma-noseG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ma-cheekG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="ma-b2" filterUnits="userSpaceOnUse" x="0" y="0" width="${VIEW_W}" height="${VIEW_H}"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="ma-b4" filterUnits="userSpaceOnUse" x="0" y="0" width="${VIEW_W}" height="${VIEW_H}"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
<ellipse cx="108" cy="128" rx="44" ry="56" fill="url(#ma-cheekG)"/>
<ellipse cx="292" cy="128" rx="44" ry="56" fill="url(#ma-cheekG)"/>
<g filter="url(#ma-b4)" fill="none" stroke="#000" stroke-linecap="round" stroke-opacity="0.07" stroke-width="6">
  <path d="M 158,128 C 142,152 130,178 128,206"/>
  <path d="M 242,128 C 258,152 270,178 272,206"/>
</g>
<ellipse cx="200" cy="88" rx="32" ry="22" fill="url(#ma-noseG)"/>
<g filter="url(#ma-b2)">
  <ellipse cx="200" cy="128" rx="56" ry="9" fill="#000" fill-opacity="0.2"/>
  <ellipse cx="180" cy="116" rx="9" ry="5" transform="rotate(-14 180 116)" fill="${nostril}" fill-opacity="0.62"/>
  <ellipse cx="220" cy="116" rx="9" ry="5" transform="rotate(14 220 116)" fill="${nostril}" fill-opacity="0.62"/>
  <path d="M 156,96 C 148,106 150,118 162,124" fill="none" stroke="#000" stroke-opacity="0.1" stroke-width="3" stroke-linecap="round"/>
  <path d="M 244,96 C 252,106 250,118 238,124" fill="none" stroke="#000" stroke-opacity="0.1" stroke-width="3" stroke-linecap="round"/>
  <path d="M 189,134 C 188,152 189,168 191,184" fill="none" stroke="#000" stroke-opacity="0.11" stroke-width="3" stroke-linecap="round"/>
  <path d="M 211,134 C 212,152 211,168 209,184" fill="none" stroke="#000" stroke-opacity="0.11" stroke-width="3" stroke-linecap="round"/>
</g>`;
}

// Middle layer: the part that moves. No blur filters here, they are slow to redraw.
export function dynMarkup(tone: ToneKey, attrs: Attrs): string {
  const t = TONES[tone];
  const a = (id: string) => Object.entries(attrs[id] || {}).map(([k, v]) => `${k}="${v}"`).join(' ');
  const lipLight = mix(t.lip, '#ffcfbf', 0.2);
  const seamColor = mix(t.lipDark, '#000000', 0.35);
  const cornerColor = mix(t.lipDark, '#000000', 0.3);
  return `
<defs>
  <radialGradient id="ma-skinG" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${t.skin[0]}"/><stop offset="1" stop-color="${t.skin[1]}"/></radialGradient>
  <linearGradient id="ma-jawG" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>
  <radialGradient id="ma-chinHiG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="ma-chinShG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="ma-hiG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="ma-upperG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.lip}"/><stop offset="1" stop-color="${t.lipDark}"/></linearGradient>
  <linearGradient id="ma-lowerG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.lip}"/><stop offset="0.6" stop-color="${lipLight}"/><stop offset="1" stop-color="${t.lip}"/></linearGradient>
  <linearGradient id="ma-teethG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dcd5c4"/><stop offset="0.18" stop-color="#f8f4ea"/><stop offset="0.5" stop-color="#fffdf8"/><stop offset="0.82" stop-color="#f8f4ea"/><stop offset="1" stop-color="#dcd5c4"/></linearGradient>
  <radialGradient id="ma-insideG" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#4b161b"/><stop offset="1" stop-color="#1b070a"/></radialGradient>
  <linearGradient id="ma-tongueG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dd8080"/><stop offset="1" stop-color="#b24f50"/></linearGradient>
  <linearGradient id="ma-shadeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0204" stop-opacity="0.5"/><stop offset="1" stop-color="#0b0204" stop-opacity="0"/></linearGradient>
  <clipPath id="ma-clip"><path id="ma-apClip" ${a('apClip')}/></clipPath>
</defs>
<ellipse id="ma-chinShadow" ${a('chinShadow')} fill="url(#ma-chinShG)"/>
<path id="ma-face" ${a('face')} fill="url(#ma-skinG)"/>
<path id="ma-faceShade" ${a('faceShade')} fill="url(#ma-jawG)"/>
<ellipse id="ma-chinHi" ${a('chinHi')} fill="url(#ma-chinHiG)"/>
<g transform="translate(200 208)">
  <path id="ma-crease" ${a('crease')} fill="none" stroke="#000" stroke-opacity="0.09" stroke-width="7" stroke-linecap="round"/>
  <path id="ma-lower" ${a('lower')} fill="url(#ma-lowerG)" stroke="${t.lipDark}" stroke-opacity="0.45" stroke-width="1.2" stroke-linejoin="round"/>
  <path id="ma-upper" ${a('upper')} fill="url(#ma-upperG)" stroke="${t.lipDark}" stroke-opacity="0.45" stroke-width="1.2" stroke-linejoin="round"/>
  <path id="ma-ap" ${a('ap')} fill="url(#ma-insideG)"/>
  <g clip-path="url(#ma-clip)">
    <ellipse id="ma-tongue" ${a('tongue')} fill="url(#ma-tongueG)"/>
    <rect id="ma-loTeeth" ${a('loTeeth')} rx="4" fill="url(#ma-teethG)"/>
    <rect id="ma-upTeeth" ${a('upTeeth')} rx="6" fill="url(#ma-teethG)"/>
    <path id="ma-upSep" ${a('upSep')} fill="none" stroke="#a89f8c" stroke-opacity="0.4" stroke-width="1"/>
    <ellipse id="ma-tip" ${a('tip')} fill="url(#ma-tongueG)"/>
    <rect id="ma-shade" ${a('shade')} fill="url(#ma-shadeG)"/>
  </g>
  <path id="ma-seam" ${a('seam')} fill="none" stroke="${seamColor}" stroke-width="1.7" stroke-linejoin="round" stroke-opacity="0.85"/>
  <ellipse id="ma-hi" ${a('hi')} fill="url(#ma-hiG)"/>
  <circle id="ma-cornerL" ${a('cornerL')} r="3.2" fill="${cornerColor}" fill-opacity="0.55"/>
  <circle id="ma-cornerR" ${a('cornerR')} r="3.2" fill="${cornerColor}" fill-opacity="0.55"/>
</g>`;
}

// A simple hand: a palm, four fingers with three bones each, and a thumb with three bones.
// Everything here is plain maths (no 3D library), so the hand can be drawn and tested anywhere.
//
// Hand coordinates: the wrist is at (0,0,0), +Y points along the fingers, +Z points out of the palm
// (towards the viewer when the palm faces the viewer) and +X points towards the thumb.
// Angles are in degrees.

export type V = [number, number, number];
type M = [V, V, V];

// A pose is a list of numbers so that two poses can be blended smoothly:
//  0-3   index:  bend at the knuckle, bend at the middle joint, bend at the fingertip joint, sideways spread
//  4-7   middle  (same four numbers)
//  8-11  ring    (same four numbers)
//  12-15 pinky   (same four numbers)
//  16-21 thumb:  tilt out to the side, tilt forward, then for each of two joints: bend forward, bend across the palm
//  22-24 whole hand turn: around X, around Y, around Z
//  25-26 whole hand shift: sideways, up
export const POSE_LENGTH = 27;
export type Pose = number[];

export const FINGER_LENGTHS: [number, number, number][] = [
  [0.42, 0.26, 0.2], // index
  [0.46, 0.28, 0.2], // middle
  [0.42, 0.26, 0.2], // ring
  [0.32, 0.2, 0.17], // pinky
];
export const FINGER_BASES: V[] = [
  [0.3, 0.9, 0],
  [0.1, 0.9, 0],
  [-0.1, 0.9, 0],
  [-0.3, 0.9, 0],
];
export const THUMB_BASE: V = [0.42, 0.12, 0.04];
export const THUMB_LENGTHS: [number, number, number] = [0.34, 0.27, 0.21];
export const PALM: V[] = [
  [-0.45, 0, 0],
  [0.45, 0, 0],
  [0.45, 0.9, 0],
  [-0.45, 0.9, 0],
];
export const PIVOT: V = [0, 0.7, 0]; // the hand turns around this point

const rad = (d: number) => (d * Math.PI) / 180;
const mul = (a: M, b: M): M => {
  const r: M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return r;
};
const rx = (d: number): M => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const ry = (d: number): M => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const rz = (d: number): M => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const apply = (m: M, v: V): V => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const along = (R: M, len: number): V => { const d = apply(R, [0, 1, 0]); return [d[0] * len, d[1] * len, d[2] * len]; };

export type HandPoints = {
  fingers: V[][]; // index, middle, ring, pinky: knuckle, first joint, second joint, fingertip
  thumb: V[];     // base, first joint, second joint, tip
  palm: V[];      // four corners
};

export function computeHand(p: Pose): HandPoints {
  const fingers: V[][] = [];
  for (let f = 0; f < 4; f++) {
    const [mcp, pip, dip, spread] = [p[f * 4], p[f * 4 + 1], p[f * 4 + 2], p[f * 4 + 3]];
    let R = mul(rz(-spread), rx(mcp));
    let pos = FINGER_BASES[f];
    const pts: V[] = [pos];
    pos = add(pos, along(R, FINGER_LENGTHS[f][0])); pts.push(pos);
    R = mul(R, rx(pip));
    pos = add(pos, along(R, FINGER_LENGTHS[f][1])); pts.push(pos);
    R = mul(R, rx(dip));
    pos = add(pos, along(R, FINGER_LENGTHS[f][2])); pts.push(pos);
    fingers.push(pts);
  }

  const [a, b, f1, c1, f2, c2] = [p[16], p[17], p[18], p[19], p[20], p[21]];
  let R = mul(rz(-a), rx(b));
  let pos = THUMB_BASE;
  const thumb: V[] = [pos];
  pos = add(pos, along(R, THUMB_LENGTHS[0])); thumb.push(pos);
  R = mul(R, mul(rx(f1), rz(c1)));
  pos = add(pos, along(R, THUMB_LENGTHS[1])); thumb.push(pos);
  R = mul(R, mul(rx(f2), rz(c2)));
  pos = add(pos, along(R, THUMB_LENGTHS[2])); thumb.push(pos);

  // Turn and shift the whole hand.
  const Rh = mul(rx(p[22]), mul(ry(p[23]), rz(p[24])));
  const place = (v: V): V => {
    const t = add(apply(Rh, sub(v, PIVOT)), PIVOT);
    return [t[0] + p[25], t[1] + p[26], t[2]];
  };
  return {
    fingers: fingers.map((fp) => fp.map(place)),
    thumb: thumb.map(place),
    palm: PALM.map(place),
  };
}

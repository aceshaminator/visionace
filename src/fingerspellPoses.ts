// The one-handed manual alphabet (ASL style), as hand poses. A Deaf signer must check every letter.
// Each pose: i, m, r, p = index, middle, ring, pinky as [knuckle bend, middle bend, tip bend, spread];
// t = thumb as [tilt out, tilt forward, joint 1 bend, joint 1 across palm, joint 2 bend, joint 2 across palm];
// o = whole hand turn [around X, around Y, around Z] and d = shift [sideways, up].
import type { Pose } from './handKinematics';

type Fin = [number, number, number, number];
type Thumb = [number, number, number, number, number, number];
type Spec = { i: Fin; m: Fin; r: Fin; p: Fin; t: Thumb; o?: [number, number, number]; d?: [number, number] };

const EXT: Fin = [0, 0, 0, 0];
const FIST: Fin = [85, 100, 55, 0];
const CURVE: Fin = [40, 45, 25, 0];
const THUMB_SIDE: Thumb = [0, 0, 0, 0, 0, 0];

export function specToPose(s: Spec): Pose {
  return [...s.i, ...s.m, ...s.r, ...s.p, ...s.t, ...(s.o || [0, 0, 0]), ...(s.d || [0, 0])];
}

export const LETTERS: Record<string, Spec[]> = {
  A: [{ i: FIST, m: FIST, r: FIST, p: FIST, t: THUMB_SIDE }],
  B: [{ i: EXT, m: EXT, r: EXT, p: EXT, t: [-10, 40, 45, 50, 25, 30] }],
  C: [{ i: CURVE, m: CURVE, r: CURVE, p: CURVE, t: [30, 25, 15, 5, 10, 0], o: [0, -90, 0] }],
  D: [{ i: EXT, m: [70, 80, 40, 0], r: [70, 80, 40, 0], p: [70, 80, 40, 0], t: [-5, 34, 17, 31, 0, 10] }],
  E: [{ i: [75, 100, 40, 0], m: [75, 100, 40, 0], r: [75, 100, 40, 0], p: [75, 100, 40, 0], t: [-10, 40, 40, 50, 20, 30] }],
  F: [{ i: [65, 72, 44, 0], m: EXT, r: EXT, p: EXT, t: [6, 32, 12, 11, 19, 25] }],
  G: [{ i: EXT, m: FIST, r: FIST, p: FIST, t: [15, 20, 5, 0, 0, 0], o: [0, -50, 90] }],
  H: [{ i: EXT, m: EXT, r: FIST, p: FIST, t: [-10, 40, 45, 40, 20, 20], o: [0, -50, 90] }],
  I: [{ i: FIST, m: FIST, r: FIST, p: EXT, t: [-10, 40, 40, 50, 20, 30] }],
  J: [
    { i: FIST, m: FIST, r: FIST, p: EXT, t: [-10, 40, 40, 50, 20, 30] },
    { i: FIST, m: FIST, r: FIST, p: EXT, t: [-10, 40, 40, 50, 20, 30], o: [0, 0, -25], d: [0, -0.15] },
    { i: FIST, m: FIST, r: FIST, p: EXT, t: [-10, 40, 40, 50, 20, 30], o: [40, 0, 25], d: [0.1, -0.35] },
  ],
  K: [{ i: [0, 0, 0, 8], m: [0, 0, 0, -8], r: FIST, p: FIST, t: [20, 40, 30, 20, 10, 5] }],
  L: [{ i: EXT, m: FIST, r: FIST, p: FIST, t: [80, 0, 0, 0, 0, 0] }],
  M: [{ i: [75, 80, 40, 0], m: [75, 80, 40, 0], r: [75, 80, 40, 0], p: FIST, t: [-10, 40, 50, 60, 25, 35] }],
  N: [{ i: [75, 80, 40, 0], m: [75, 80, 40, 0], r: FIST, p: FIST, t: [-10, 40, 50, 55, 25, 35] }],
  O: [{ i: [63, 94, 41, 0], m: [63, 94, 41, 0], r: [63, 94, 41, 0], p: [63, 94, 41, 0], t: [-6, 20, 21, 27, 17, 17] }],
  P: [{ i: [0, 0, 0, 8], m: [0, 0, 0, -8], r: FIST, p: FIST, t: [20, 40, 30, 20, 10, 5], o: [90, 0, 0] }],
  Q: [{ i: EXT, m: FIST, r: FIST, p: FIST, t: [15, 20, 5, 0, 0, 0], o: [90, -50, 0] }],
  R: [{ i: [0, 0, 0, -6], m: [0, 0, 0, 6], r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30] }],
  S: [{ i: FIST, m: FIST, r: FIST, p: FIST, t: [-10, 50, 40, 55, 25, 35] }],
  T: [{ i: FIST, m: FIST, r: FIST, p: FIST, t: [0, 50, 20, 30, 10, 10] }],
  U: [{ i: EXT, m: EXT, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30] }],
  V: [{ i: [0, 0, 0, 14], m: [0, 0, 0, -14], r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30] }],
  W: [{ i: [0, 0, 0, 16], m: EXT, r: [0, 0, 0, -16], p: FIST, t: [-10, 40, 45, 50, 25, 30] }],
  X: [{ i: [10, 90, 25, 0], m: FIST, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30] }],
  Y: [{ i: FIST, m: FIST, r: FIST, p: [0, 0, 0, -10], t: [80, 0, 0, 0, 0, 0] }],
  Z: [
    { i: EXT, m: FIST, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30], d: [-0.35, 0.25] },
    { i: EXT, m: FIST, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30], d: [0.35, 0.25] },
    { i: EXT, m: FIST, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30], d: [-0.35, -0.15] },
    { i: EXT, m: FIST, r: FIST, p: FIST, t: [-10, 40, 45, 50, 25, 30], d: [0.35, -0.15] },
  ],
};

// The relaxed open hand shown before spelling starts.
export const REST: Spec = { i: EXT, m: EXT, r: EXT, p: EXT, t: [35, 10, 0, 0, 0, 0] };

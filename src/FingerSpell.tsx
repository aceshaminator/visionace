import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, RotateCcw, Hand, Copy } from 'lucide-react';
import { TONES } from './mouthShapes';
import { computeHand, POSE_LENGTH } from './handKinematics';
import { LETTERS, REST, specToPose } from './fingerspellPoses';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';
const EDITS_KEY = 'motion_fingerspell_edits';
const SLOW_KEY = 'motion_fs_slow';
const LEFT_KEY = 'motion_fs_left';
const REST_POSE = specToPose(REST);
const ALPHABET = Object.keys(LETTERS);

type Frame = { pose: number[]; arrive: number; leave: number; letter: number };
type Key = { pose: number[]; move: number; hold: number; letter: number };

const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

// What each of the 27 numbers in a pose does, with its limits, for the review sliders.
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
const CONTROLS: { group: string; label: string; index: number; min: number; max: number; step: number }[] = [];
FINGERS.forEach((name, f) => {
  CONTROLS.push({ group: name, label: 'Knuckle bend', index: f * 4, min: 0, max: 100, step: 1 });
  CONTROLS.push({ group: name, label: 'Middle joint bend', index: f * 4 + 1, min: 0, max: 110, step: 1 });
  CONTROLS.push({ group: name, label: 'Tip joint bend', index: f * 4 + 2, min: 0, max: 90, step: 1 });
  CONTROLS.push({ group: name, label: 'Sideways spread', index: f * 4 + 3, min: -25, max: 25, step: 1 });
});
[
  ['Tilt out to the side', 16, -30, 90], ['Tilt forward', 17, -10, 90],
  ['Joint 1 bend forward', 18, -10, 80], ['Joint 1 bend across palm', 19, -10, 80],
  ['Joint 2 bend forward', 20, -10, 70], ['Joint 2 bend across palm', 21, -10, 60],
].forEach(([label, index, min, max]) => CONTROLS.push({ group: 'Thumb', label: label as string, index: index as number, min: min as number, max: max as number, step: 1 }));
[['Turn around X (tip towards you)', 22], ['Turn around Y (thumb towards you)', 23], ['Turn around Z (tilt sideways)', 24]].forEach(([label, index]) =>
  CONTROLS.push({ group: 'Whole hand', label: label as string, index: index as number, min: -120, max: 120, step: 1 }));
[['Shift sideways', 25], ['Shift up', 26]].forEach(([label, index]) =>
  CONTROLS.push({ group: 'Whole hand', label: label as string, index: index as number, min: -0.6, max: 0.6, step: 0.05 }));
const GROUPS = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb', 'Whole hand'];

// The text form used in the poses file, so a reviewer can send corrected numbers back.
function poseText(letter: string, p: number[]): string {
  const r = (a: number[]) => `[${a.map((x) => Math.round(x * 100) / 100).join(', ')}]`;
  return `${letter}: i: ${r(p.slice(0, 4))}, m: ${r(p.slice(4, 8))}, r: ${r(p.slice(8, 12))}, p: ${r(p.slice(12, 16))}, t: ${r(p.slice(16, 22))}, o: ${r(p.slice(22, 25))}, d: ${r(p.slice(25, 27))}`;
}

export default function FingerSpell(props: { latestCaption: string }) {
  const { latestCaption } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const poseRef = useRef<number[]>(REST_POSE.slice());
  const timelineRef = useRef<{ frames: Frame[]; total: number } | null>(null);
  const startRef = useRef(0);
  const leftRef = useRef(false);
  const yawRef = useRef(0);
  const skinRef = useRef('#a86b45');
  const shownIndexRef = useRef(-2);

  const [text, setText] = useState('');
  const [slow, setSlow] = useState<boolean>(() => { try { return localStorage.getItem(SLOW_KEY) !== '0'; } catch { return true; } });
  const [left, setLeft] = useState<boolean>(() => { try { return localStorage.getItem(LEFT_KEY) === '1'; } catch { return false; } });
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [review, setReview] = useState(false);
  const [letter, setLetter] = useState('A');
  const [edits, setEdits] = useState<Record<string, number[]>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(EDITS_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch { return {}; }
  });
  const [copied, setCopied] = useState('');
  const editsRef = useRef(edits);
  useEffect(() => { editsRef.current = edits; }, [edits]);
  useEffect(() => { leftRef.current = left; }, [left]);

  // The key poses of a letter: the edited first pose if a reviewer changed it, otherwise the built-in one.
  const keysOf = (ch: string): number[][] => {
    const base = LETTERS[ch].map(specToPose);
    const e = editsRef.current[ch];
    if (e && e.length === POSE_LENGTH) base[0] = e;
    return base;
  };

  const startTimeline = (keys: Key[]) => {
    const frames: Frame[] = [{ pose: poseRef.current.slice(), arrive: 0, leave: 0, letter: -1 }];
    let t = 0;
    for (const k of keys) {
      const arrive = t + k.move;
      frames.push({ pose: k.pose, arrive, leave: arrive + k.hold, letter: k.letter });
      t = arrive + k.hold;
    }
    timelineRef.current = { frames, total: t };
    startRef.current = performance.now();
    shownIndexRef.current = -2;
    setPlaying(true);
  };

  const spell = (raw: string) => {
    const chars = raw.toUpperCase().split('').filter((c) => c === ' ' || LETTERS[c]).join('').replace(/\s+/g, ' ').trim().slice(0, 40).split('');
    if (!chars.length) return;
    setShown(chars);
    setCurrent(-1);
    const hold = slow ? 1.1 : 0.7;
    const move = slow ? 0.55 : 0.32;
    const keys: Key[] = [];
    let prev = '';
    chars.forEach((ch, idx) => {
      if (ch === ' ') { keys.push({ pose: REST_POSE, move, hold: slow ? 0.6 : 0.35, letter: idx }); prev = ''; return; }
      const poses = keysOf(ch);
      if (ch === prev) {
        // The same letter twice in a row: a small dip so the second one is seen as a new letter.
        keys.push({ pose: poses[0].map((v, i) => (i === 26 ? v - 0.15 : v)), move: 0.14, hold: 0, letter: idx });
      }
      poses.forEach((p, k) => {
        const last = k === poses.length - 1;
        keys.push({ pose: p, move: k === 0 ? (ch === prev ? 0.16 : move) : move * 0.8, hold: last ? hold : 0.08, letter: idx });
      });
      prev = ch;
    });
    keys.push({ pose: REST_POSE, move: 0.5, hold: 0.3, letter: -1 });
    startTimeline(keys);
  };

  const goToPose = (pose: number[]) => startTimeline([{ pose, move: 0.35, hold: 0.1, letter: -1 }]);

  // Review: show the chosen letter and follow the sliders.
  useEffect(() => {
    if (!review) return;
    goToPose(keysOf(letter)[0]);
    setShown([]);
    setCurrent(-1);
  }, [review, letter]);

  const changeValue = (index: number, value: number) => {
    const next = (edits[letter] && edits[letter].length === POSE_LENGTH ? edits[letter] : keysOf(letter)[0]).slice();
    next[index] = value;
    const all = { ...edits, [letter]: next };
    setEdits(all);
    editsRef.current = all;
    try { localStorage.setItem(EDITS_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
    timelineRef.current = null;
    poseRef.current = next;
  };
  const resetLetter = () => {
    const all = { ...edits };
    delete all[letter];
    setEdits(all);
    editsRef.current = all;
    try { localStorage.setItem(EDITS_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
    goToPose(specToPose(LETTERS[letter][0]));
  };
  const copyNumbers = async () => {
    const lines = ALPHABET.filter((c) => edits[c]).map((c) => poseText(c, edits[c]));
    const body = lines.length ? lines.join('\n') : poseText(letter, keysOf(letter)[0]);
    try {
      await navigator.clipboard.writeText(body);
      setCopied(lines.length ? `Copied ${lines.length} changed ${lines.length === 1 ? 'letter' : 'letters'}.` : `Copied ${letter}.`);
    } catch {
      setCopied('Copying is not allowed here. Select the numbers below and copy them by hand.');
    }
  };
  const currentValues = (edits[letter] && edits[letter].length === POSE_LENGTH ? edits[letter] : LETTERS[letter] ? specToPose(LETTERS[letter][0]) : REST_POSE);

  // The 3D hand.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    try {
      const tone = localStorage.getItem('motion_avatar_tone');
      const t = tone && (TONES as any)[tone];
      if (t && t.skin && t.skin[0]) skinRef.current = t.skin[0];
    } catch { /* use the default skin */ }

    const width = container.clientWidth || 360;
    const height = 300;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19');
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 0.85, 4.8);
    camera.lookAt(0, 0.85, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(2, 4, 5);
    scene.add(sun);

    const skin = new THREE.MeshStandardMaterial({ color: skinRef.current, roughness: 0.65, side: THREE.DoubleSide });
    const group = new THREE.Group();
    scene.add(group);
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14);
    const ballGeo = new THREE.SphereGeometry(1, 14, 12);
    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.2);
    const cyls: any[] = [];
    const balls: any[] = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(cylGeo, skin); group.add(m); cyls.push(m); }
    for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(ballGeo, skin); group.add(m); balls.push(m); }
    const palm = new THREE.Mesh(boxGeo, skin);
    group.add(palm);
    const up = new THREE.Vector3(0, 1, 0);
    const va = new THREE.Vector3();
    const vb = new THREE.Vector3();
    const vd = new THREE.Vector3();

    const segment = (m: any, a: number[], b: number[], r: number) => {
      va.set(a[0], a[1], a[2]);
      vb.set(b[0], b[1], b[2]);
      vd.subVectors(vb, va);
      const len = vd.length();
      if (len < 1e-6) { m.visible = false; return; }
      m.visible = true;
      m.position.addVectors(va, vb).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(up, vd.normalize());
      m.scale.set(r, len, r);
    };
    const ball = (m: any, a: number[], r: number) => { m.position.set(a[0], a[1], a[2]); m.scale.set(r, r, r); };

    const draw = (pose: number[]) => {
      const h = computeHand(pose);
      let c = 0;
      let b = 0;
      const radii = [0.085, 0.085, 0.085, 0.072];
      h.fingers.forEach((pts, f) => {
        for (let i = 0; i < 3; i++) segment(cyls[c++], pts[i], pts[i + 1], radii[f] * (1 - 0.1 * i));
        for (let i = 0; i < 4; i++) ball(balls[b++], pts[i], radii[f] * (i === 3 ? 0.78 : 1 - 0.1 * Math.max(0, i - 1)));
      });
      for (let i = 0; i < 3; i++) segment(cyls[c++], h.thumb[i], h.thumb[i + 1], 0.095 * (1 - 0.1 * i));
      for (let i = 0; i < 4; i++) ball(balls[b++], h.thumb[i], 0.095 * (i === 3 ? 0.78 : 1 - 0.08 * i));
      // palm
      const p0 = h.palm[0], p1 = h.palm[1], p3 = h.palm[3];
      const xA = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
      const yA = new THREE.Vector3(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]).normalize();
      const zA = new THREE.Vector3().crossVectors(xA, yA).normalize();
      const mat = new THREE.Matrix4().makeBasis(xA, yA, zA);
      palm.quaternion.setFromRotationMatrix(mat);
      palm.position.set((p0[0] + h.palm[2][0]) / 2, (p0[1] + h.palm[2][1]) / 2, (p0[2] + h.palm[2][2]) / 2);
      // wrist: a short tube below the palm
      const base = new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
      const down = base.clone().addScaledVector(yA, -0.55);
      segment(cyls[c++], [base.x, base.y, base.z], [down.x, down.y, down.z], 0.26);
    };

    let raf = 0;
    const frame = () => {
      const tl = timelineRef.current;
      if (tl) {
        const t = (performance.now() - startRef.current) / 1000;
        const fr = tl.frames;
        let pose = fr[fr.length - 1].pose;
        let idx = -1;
        for (let i = fr.length - 1; i >= 0; i--) { if (fr[i].arrive <= t + 0.05 && fr[i].letter >= 0) { idx = fr[i].letter; break; } }
        if (t < tl.total) {
          for (let i = fr.length - 1; i >= 1; i--) {
            if (t >= fr[i - 1].leave) {
              const span = fr[i].arrive - fr[i - 1].leave;
              pose = t >= fr[i].arrive ? fr[i].pose : mix(fr[i - 1].pose, fr[i].pose, span > 0 ? ease((t - fr[i - 1].leave) / span) : 1);
              break;
            }
          }
        } else {
          timelineRef.current = null;
          setPlaying(false);
        }
        poseRef.current = pose;
        if (idx !== shownIndexRef.current) { shownIndexRef.current = idx; setCurrent(idx); }
      }
      group.scale.x = leftRef.current ? -1 : 1;
      group.rotation.y = yawRef.current;
      group.position.y = -0.15;
      draw(poseRef.current);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    // Drag sideways to turn the hand and look at it from another side. Double tap to turn it back.
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yawRef.current += (e.clientX - lastX) * 0.012 * (leftRef.current ? -1 : 1);
      lastX = e.clientX;
    };
    const onUp = () => { dragging = false; };
    const onDouble = () => { yawRef.current = 0; };
    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('dblclick', onDouble);

    const onResize = () => {
      const w = container.clientWidth || width;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('dblclick', onDouble);
      window.removeEventListener('resize', onResize);
      cylGeo.dispose(); ballGeo.dispose(); boxGeo.dispose(); skin.dispose();
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  const toggleSlow = () => {
    const next = !slow;
    setSlow(next);
    try { localStorage.setItem(SLOW_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
  };
  const toggleLeft = () => {
    const next = !left;
    setLeft(next);
    try { localStorage.setItem(LEFT_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  const lastWords = latestCaption.trim().split(/\s+/).slice(-4).join(' ');

  return (
    <section aria-label="Fingerspelling" className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Hand className="h-5 w-5 text-amber-300" aria-hidden="true" /> Sign: fingerspelling
        </h2>
        <span className="rounded-lg bg-amber-900/60 px-2.5 py-1 text-xs font-extrabold text-amber-200">PROTOTYPE</span>
      </div>

      <div ref={containerRef} aria-label="3D hand that spells letters" className="w-full bg-slate-950" style={{ height: '300px' }} />

      <div className="space-y-3 p-3">
        <p role="note" className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-xs leading-relaxed text-amber-100">
          Prototype: these letter shapes have not been checked by a Deaf signer yet, and some may be wrong. Do not rely on them for real communication. Drag the hand sideways to turn it. Double tap to turn it back.
        </p>

        {shown.length > 0 && (
          <div aria-live="polite">
            <p className="sr-only">Spelling {shown.join('').replace(/ /g, ' space ')}</p>
            <div className="flex flex-wrap items-end gap-1" aria-hidden="true">
              {shown.map((c, i) => (
                <span
                  key={i}
                  className={`flex h-12 min-w-[2.25rem] items-center justify-center rounded-lg border px-1 text-2xl font-extrabold ${
                    i === current ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-400'
                  }`}
                >
                  {c === ' ' ? '' : c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <label htmlFor="spell-text" className="sr-only">Type a word to spell</label>
          <input
            id="spell-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') spell(text); }}
            placeholder="Type a word to spell"
            maxLength={40}
            className={`min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-slate-50 placeholder-slate-500 ${focusRing}`}
          />
          <button
            type="button"
            onClick={() => spell(text)}
            disabled={!text.trim()}
            className={`flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            <Play className="h-4 w-4" aria-hidden="true" /> Spell
          </button>
          <button
            type="button"
            onClick={() => spell(shown.join('') || text)}
            disabled={!shown.length && !text.trim()}
            aria-label="Spell it again"
            className={`flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Again
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setText(lastWords); spell(lastWords); }}
            disabled={!lastWords}
            className={`min-h-[40px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            Spell the last words of the captions
          </button>
          <button type="button" role="switch" aria-checked={slow} onClick={toggleSlow}
            className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold ${focusRing} ${slow ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
            Slow motion: {slow ? 'On' : 'Off'}
          </button>
          <button type="button" role="switch" aria-checked={left} onClick={toggleLeft}
            className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold ${focusRing} ${left ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
            Left hand: {left ? 'On' : 'Off'}
          </button>
        </div>
        <p className="text-xs text-slate-400">Letters only for now: numbers and punctuation are skipped. {playing ? 'Spelling...' : ''}</p>

        <div className="border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setReview(!review)}
            aria-expanded={review}
            className={`flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-semibold text-slate-200 ${focusRing}`}
          >
            <span>Review the letters (for a Deaf signer)</span>
            <span className="text-xs font-semibold text-sky-300">{review ? 'Hide' : 'Open'}</span>
          </button>
          {review && (
            <div className="mt-3 space-y-3 text-sm text-slate-200">
              <p className="text-xs leading-relaxed text-slate-300">
                Pick a letter, then move the sliders until the hand shows the correct sign. Your changes are saved on this device. When you are done, press Copy numbers and send them to the developer.
                J and Z are movements: only their first position can be changed here.
              </p>
              <div role="radiogroup" aria-label="Letter to review" className="flex flex-wrap gap-1">
                {ALPHABET.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={letter === c}
                    onClick={() => setLetter(c)}
                    className={`h-10 w-10 rounded-lg border text-base font-bold ${focusRing} ${
                      letter === c ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : edits[c] ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-slate-700 bg-slate-950 text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {GROUPS.map((g) => (
                <details key={g} className="rounded-xl border border-slate-800 bg-slate-950 p-2" open={g === 'Index' || g === 'Thumb'}>
                  <summary className={`cursor-pointer rounded-lg px-1 py-1 font-semibold text-slate-100 ${focusRing}`}>{g}</summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {CONTROLS.filter((c) => c.group === g).map((c) => (
                      <label key={c.index} className="block text-xs">
                        <span className="mb-1 flex justify-between"><span>{c.label}</span><strong>{Math.round(currentValues[c.index] * 100) / 100}</strong></span>
                        <input
                          type="range"
                          min={c.min}
                          max={c.max}
                          step={c.step}
                          value={currentValues[c.index]}
                          aria-label={`${g} ${c.label}`}
                          onChange={(e) => changeValue(c.index, Number(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                      </label>
                    ))}
                  </div>
                </details>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copyNumbers}
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-500 px-4 font-bold text-slate-950 hover:bg-sky-400 ${focusRing}`}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy numbers
                </button>
                <button type="button" onClick={resetLetter} disabled={!edits[letter]}
                  className={`min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-4 font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-40 ${focusRing}`}>
                  Reset this letter
                </button>
              </div>
              {copied && <p role="status" className="text-xs text-emerald-200">{copied}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BACKDROP, LABELS, VIEW_H, VIEW_W, VISEMES, bgMarkup, buildKeys, dynMarkup, fgMarkup, frameAttrs,
  type Key, type MouthPlay, type Params, type ToneKey, type VisemeKey,
} from './mouthShapes';

type Props = {
  play: MouthPlay | null;            // words to show; a new id starts them
  getLevel?: () => number;           // live loudness 0..1, so the jaw moves a little while sound is heard
  onViseme?: (label: string) => void;
  tone: ToneKey;
};

const layer: React.CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' };

// The lower half of a human face. The jaw drops, the lips curve and the teeth and tongue show as the
// words are said. Only the middle layer is redrawn; the background and shading are drawn once.
export default function MouthAvatar({ play, getLevel, onViseme, tone }: Props) {
  const bgRef = useRef<SVGSVGElement | null>(null);
  const dynRef = useRef<SVGSVGElement | null>(null);
  const fgRef = useRef<SVGSVGElement | null>(null);
  const elsRef = useRef<Record<string, Element | null>>({});
  const getLevelRef = useRef(getLevel);
  const onVisemeRef = useRef(onViseme);
  getLevelRef.current = getLevel;
  onVisemeRef.current = onViseme;
  const playRef = useRef<{ keys: Key[]; start: number; speed: number; end: number } | null>(null);

  const markup = useMemo(
    () => ({ bg: bgMarkup(tone), dyn: dynMarkup(tone, frameAttrs(VISEMES.rest)), fg: fgMarkup(tone) }),
    [tone],
  );

  // The pictures are put on the page here, by hand, and only when they change (a new skin tone).
  // React is not told about their insides, so it can never swap them out while the mouth is moving.
  useLayoutEffect(() => {
    if (bgRef.current) bgRef.current.innerHTML = markup.bg;
    if (fgRef.current) fgRef.current.innerHTML = markup.fg;
    if (dynRef.current) dynRef.current.innerHTML = markup.dyn;
    elsRef.current = {};
  }, [markup]);

  // Start showing new words. Words older than a few seconds are not replayed by surprise.
  useEffect(() => {
    if (!play || !play.words.length || Date.now() - play.at > 4000) return;
    const keys = buildKeys(play.words);
    if (!keys.length) return;
    playRef.current = { keys, start: performance.now(), speed: play.speed || 1, end: keys[keys.length - 1].t + 0.25 };
  }, [play?.id]);

  useEffect(() => {
    const cur: Params = { ...VISEMES.rest };
    const drawn: Params = { ...VISEMES.rest, open: -1 }; // forces the first drawing
    let last = performance.now();
    let raf = 0;
    let lastLabel = '';
    let lastLabelAt = 0;
    let soundOn = false;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let key: VisemeKey = 'rest';
      let playing = false;
      const pl = playRef.current;
      if (pl) {
        const el = ((now - pl.start) / 1000) * pl.speed + 0.04; // look a little ahead so shapes arrive on time
        if (el > pl.end) {
          playRef.current = null;
        } else {
          playing = true;
          for (let i = 0; i < pl.keys.length; i++) {
            if (pl.keys[i].t <= el) key = pl.keys[i].v;
            else break;
          }
        }
      }
      let target: Params = VISEMES[key];
      let label = LABELS[key];

      if (!playing) {
        const level = getLevelRef.current ? getLevelRef.current() : 0;
        // Switches on at a clearly audible level and off only when it is clearly quiet again, so the
        // mouth does not flicker around the edge.
        if (!soundOn && level > 0.12) soundOn = true;
        else if (soundOn && level < 0.05) soundOn = false;
        if (soundOn) {
          // Sound is being heard but the words are not known yet: the jaw follows the loudness a little.
          target = { ...VISEMES.EH, open: 0.06 + level * 0.4, width: 1.04, upperTeeth: 0.7, lowerTeeth: 0.3 };
          label = 'Sound heard, waiting for words';
        }
      } else {
        soundOn = false;
      }

      const k = 1 - Math.exp(-dt / 0.05); // how quickly the mouth moves toward the next shape
      (Object.keys(cur) as (keyof Params)[]).forEach((n) => { cur[n] += (target[n] - cur[n]) * k; });

      // Draw only when something moved enough to see.
      let diff = 0;
      (Object.keys(cur) as (keyof Params)[]).forEach((n) => { diff += Math.abs(cur[n] - drawn[n]); });
      const svg = dynRef.current;
      if (svg && diff > 0.0015) {
        (Object.keys(cur) as (keyof Params)[]).forEach((n) => { drawn[n] = cur[n]; });
        const attrs = frameAttrs(cur);
        const els = elsRef.current;
        for (const id in attrs) {
          let el = els[id];
          if (!el || !el.isConnected) { el = svg.querySelector('#ma-' + id); els[id] = el; } // look again if it left the page
          if (!el) continue;
          const o = attrs[id];
          for (const name in o) el.setAttribute(name, o[name]);
        }
      }

      // Tell the screen the new shape name, but not more than about five times a second.
      if (label !== lastLabel && now - lastLabelAt > 180) {
        lastLabel = label;
        lastLabelAt = now;
        onVisemeRef.current?.(label);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const box = `0 0 ${VIEW_W} ${VIEW_H}`;
  return (
    <div
      style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto', overflow: 'hidden', aspectRatio: `${VIEW_W} / ${VIEW_H}`, background: BACKDROP }}
      role="img"
      aria-label="A human face seen from the nose down. The jaw, lips, teeth and tongue show how the spoken words are formed."
    >
      <svg ref={bgRef} viewBox={box} style={layer} aria-hidden="true" />
      <svg ref={dynRef} viewBox={box} style={layer} aria-hidden="true" />
      <svg ref={fgRef} viewBox={box} style={layer} aria-hidden="true" />
      <div
        style={{ ...layer, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.5) 100%)' }}
      />
    </div>
  );
}

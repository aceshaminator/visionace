import React, { useEffect, useRef, useState } from 'react';

export type PhonemeEntry = { phoneme: string; start: number; end: number; word?: string };

export default function MouthVisualizer({ timeline = [], playTime = 0 }: { timeline?: PhonemeEntry[]; playTime?: number }) {
  const [current, setCurrent] = useState<string>('Neutral');
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // drive current phoneme from playTime
    const tick = () => {
      if (timeline && timeline.length) {
        const t = playTime;
        const found = timeline.find(p => t >= p.start && t <= p.end);
        setCurrent(found ? found.phoneme : 'Neutral');
      } else {
        setCurrent('Neutral');
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [timeline, playTime]);

  const renderShape = () => {
    switch (current) {
      case 'AA': case 'A': return <ellipse cx="100" cy="50" rx="62" ry="40" fill="#ffb6c1" stroke="#222" />;
      case 'OW': case 'O': return <ellipse cx="100" cy="50" rx="36" ry="36" fill="#ffb6c1" stroke="#222" />;
      case 'M': return <rect x="60" y="52" width="100" height="12" rx="6" fill="#ffb6c1" stroke="#222" />;
      case 'EE': case 'E': return <ellipse cx="100" cy="50" rx="70" ry="20" fill="#ffb6c1" stroke="#222" />;
      default: return <ellipse cx="100" cy="50" rx="60" ry="18" fill="#ffb6c1" stroke="#222" />;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="120" viewBox="0 0 220 120" aria-hidden>{renderShape()}</svg>
      <div className="mt-2 text-sm text-zinc-400">
        <div>Viseme: <span className="font-semibold text-white">{current}</span></div>
      </div>
    </div>
  );
}

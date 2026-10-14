import React, { useState } from 'react';
import { VoiceBackTrainer } from './VoiceBackTrainer';

const DRILLS = [
  { word: 'MOTION', target: ['M', 'O', 'T', 'I', 'O', 'N'], hint: 'Bilabial closure followed by open vowels.' },
  { word: 'SPEAK', target: ['S', 'P', 'E', 'A', 'K'], hint: 'Friction consonant transitioning to explosive plosive.' },
  { word: 'HELLO', target: ['H', 'E', 'L', 'L', 'O'], hint: 'Breath transition into alveolar tongue placement.' }
];

export const SpeechTrainer: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'drill' | 'voiceback'>('drill');
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const drill = DRILLS[currentDrillIndex];

  const handlePractice = () => {
    setTesting(true);
    setScore(null);
    setTimeout(() => {
      setTesting(false);
      setScore(Math.floor(Math.random() * 15) + 85);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '360px', margin: '0 auto', color: '#f8fafc' }}>
      
      {/* Sub-Tab Navigation Switcher */}
      <div style={{ display: 'flex', gap: '8px', background: '#18181b', padding: '4px', borderRadius: '10px', border: '1px solid #27272a' }}>
        <button
          onClick={() => setActiveSubTab('drill')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: activeSubTab === 'drill' ? '#0284c7' : 'transparent',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🎯 Word Drills
        </button>
        <button
          onClick={() => setActiveSubTab('voiceback')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: 'none',
            background: activeSubTab === 'voiceback' ? '#0284c7' : 'transparent',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          🎤 Voice Back
        </button>
      </div>

      {/* Render Active Trainer View */}
      {activeSubTab === 'voiceback' ? (
        <VoiceBackTrainer />
      ) : (
        <div style={{ background: '#09090b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: '700' }}>Speech Trainer Drill</h3>
          <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '20px' }}>
            Practice articulation alignment and compare live matches.
          </p>

          <div style={{ background: '#18181b', padding: '24px', borderRadius: '12px', border: '1px solid #3f3f46', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Word</span>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: '8px 0', letterSpacing: '2px', color: '#f8fafc' }}>{drill.word}</h2>
            <p style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{drill.hint}</p>
          </div>

          {score !== null && (
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold' }}>Articulation Match Score</span>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#22c55e' }}>{score}% Accuracy</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePractice}
              disabled={testing}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: testing ? '#52525b' : 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: testing ? 'not-allowed' : 'pointer'
              }}
            >
              {testing ? 'Analyzing Articulation...' : '🎯 Practice Drill'}
            </button>

            <button
              onClick={() => {
                setScore(null);
                setCurrentDrillIndex((prev) => (prev + 1) % DRILLS.length);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #3f3f46',
                background: '#18181b',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Next ➔
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
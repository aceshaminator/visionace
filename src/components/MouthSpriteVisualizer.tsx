import React, { useState } from 'react';

export type VisemeType = 'SILENCE' | 'A_E' | 'O_U' | 'P_B_M' | 'F_V' | 'L_N';

interface VisemeData {
  label: string;
  description: string;
  upperLipPath: string;
  lowerLipPath: string;
  cavityRx: number;
  cavityRy: number;
  teethVisible: boolean;
  upperTeethY: number;
  lowerTeethY: number;
  upperTeethHeight: number;
  lowerTeethHeight: number;
  lipColor: string;
}

const VISEME_ASSETS: Record<VisemeType, VisemeData> = {
  SILENCE: {
    label: 'Resting / Silence',
    description: 'Natural closed lips with a soft, relaxed seal.',
    upperLipPath: 'M 45,96 Q 100,74 155,96 Q 100,105 45,96 Z',
    lowerLipPath: 'M 45,104 Q 100,113 155,104 Q 100,132 45,104 Z',
    cavityRx: 45,
    cavityRy: 4,
    teethVisible: false,
    upperTeethY: 92,
    lowerTeethY: 104,
    upperTeethHeight: 0,
    lowerTeethHeight: 0,
    lipColor: '#e11d48'
  },
  P_B_M: {
    label: 'Bilabial Plosive (P, B, M)',
    description: 'Lips pressed firmly together to build air pressure.',
    upperLipPath: 'M 42,97 Q 100,78 158,97 Q 100,103 42,97 Z',
    lowerLipPath: 'M 42,103 Q 100,109 158,103 Q 100,125 42,103 Z',
    cavityRx: 40,
    cavityRy: 2,
    teethVisible: false,
    upperTeethY: 92,
    lowerTeethY: 104,
    upperTeethHeight: 0,
    lowerTeethHeight: 0,
    lipColor: '#f43f5e'
  },
  A_E: {
    label: 'Open Vowel (A, E)',
    description: 'Wide jaw drop exposing upper and lower teeth cleanly.',
    upperLipPath: 'M 40,70 Q 100,42 160,70 Q 100,86 40,70 Z',
    lowerLipPath: 'M 40,132 Q 100,118 160,132 Q 100,166 40,132 Z',
    cavityRx: 52,
    cavityRy: 32,
    teethVisible: true,
    upperTeethY: 84,
    lowerTeethY: 124,
    upperTeethHeight: 14,
    lowerTeethHeight: 12,
    lipColor: '#fb7185'
  },
  O_U: {
    label: 'Rounded Vowel (O, U)',
    description: 'Lips pursed and rounded forward into a circle.',
    upperLipPath: 'M 62,76 Q 100,48 138,76 Q 100,90 62,76 Z',
    lowerLipPath: 'M 62,124 Q 100,138 138,124 Q 100,152 62,124 Z',
    cavityRx: 28,
    cavityRy: 24,
    teethVisible: true,
    upperTeethY: 88,
    lowerTeethY: 114,
    upperTeethHeight: 10,
    lowerTeethHeight: 8,
    lipColor: '#f43f5e'
  },
  F_V: {
    label: 'Labiodental (F, V)',
    description: 'Upper teeth resting gently against the lower lip.',
    upperLipPath: 'M 45,88 Q 100,68 155,88 Q 100,98 45,88 Z',
    lowerLipPath: 'M 45,98 Q 100,105 155,98 Q 100,126 45,98 Z',
    cavityRx: 45,
    cavityRy: 10,
    teethVisible: true,
    upperTeethY: 90,
    lowerTeethY: 102,
    upperTeethHeight: 12,
    lowerTeethHeight: 4,
    lipColor: '#e11d48'
  },
  L_N: {
    label: 'Alveolar (L, N, T, D)',
    description: 'Moderate opening with tongue placement behind teeth.',
    upperLipPath: 'M 42,78 Q 100,58 158,78 Q 100,92 42,78 Z',
    lowerLipPath: 'M 42,122 Q 100,108 158,122 Q 100,150 42,122 Z',
    cavityRx: 48,
    cavityRy: 22,
    teethVisible: true,
    upperTeethY: 88,
    lowerTeethY: 116,
    upperTeethHeight: 12,
    lowerTeethHeight: 10,
    lipColor: '#f43f5e'
  }
};

export const MouthSpriteVisualizer: React.FC = () => {
  const [activeViseme, setActiveViseme] = useState<VisemeType>('SILENCE');
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);

  const currentData = VISEME_ASSETS[activeViseme];

  const playTestSequence = async () => {
    if (isPlayingSequence) return;
    setIsPlayingSequence(true);

    const sequence: VisemeType[] = ['P_B_M', 'O_U', 'L_N', 'A_E', 'O_U', 'P_B_M', 'SILENCE'];

    for (const viseme of sequence) {
      setActiveViseme(viseme);
      await new Promise((res) => setTimeout(res, 400));
    }

    setIsPlayingSequence(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#09090b',
      padding: '24px',
      borderRadius: '20px',
      border: '1px solid #27272a',
      maxWidth: '360px',
      margin: '0 auto',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
    }}>
      <h3 style={{ color: '#f8fafc', marginBottom: '4px', fontSize: '1.25rem', fontWeight: '700' }}>
        Motion Visual Speech Engine
      </h3>
      <p style={{ color: '#38bdf8', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
        {currentData.label}
      </p>

      {/* Mouth Stage */}
      <div style={{
        width: '280px',
        height: '220px',
        background: 'radial-gradient(circle, #18181b 0%, #09090b 100%)',
        borderRadius: '16px',
        border: '1px solid #3f3f46',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* Inner Oral Cavity */}
          <ellipse
            cx="100"
            cy="104"
            rx={currentData.cavityRx}
            ry={currentData.cavityRy}
            fill="#0d0205"
            style={{ transition: 'all 0.25s ease' }}
          />

          {/* Teeth Layer */}
          {currentData.teethVisible && (
            <g style={{ transition: 'opacity 0.2s ease', opacity: 1 }}>
              {currentData.upperTeethHeight > 0 && (
                <rect
                  x="72"
                  y={currentData.upperTeethY}
                  width="56"
                  height={currentData.upperTeethHeight}
                  rx="3"
                  fill="#f8fafc"
                  style={{ transition: 'all 0.25s ease' }}
                />
              )}
              {currentData.lowerTeethHeight > 0 && (
                <rect
                  x="74"
                  y={currentData.lowerTeethY}
                  width="52"
                  height={currentData.lowerTeethHeight}
                  rx="3"
                  fill="#f1f5f9"
                  style={{ transition: 'all 0.25s ease' }}
                />
              )}
            </g>
          )}

          {/* Upper Lip */}
          <path
            d={currentData.upperLipPath}
            fill={currentData.lipColor}
            style={{ transition: 'd 0.25s ease, fill 0.25s ease', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />

          {/* Lower Lip */}
          <path
            d={currentData.lowerLipPath}
            fill={currentData.lipColor}
            style={{ transition: 'd 0.25s ease, fill 0.25s ease', filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.3))' }}
          />
        </svg>

        {/* Status Indicator */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '12px',
          background: 'rgba(24, 24, 27, 0.85)',
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid #52525b',
          fontSize: '0.65rem',
          color: '#a1a1aa',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPlayingSequence ? '#22c55e' : '#38bdf8', display: 'inline-block' }} />
          {isPlayingSequence ? 'Live Speech Sync' : 'Ready'}
        </div>
      </div>

      {/* Description helper */}
      <p style={{ color: '#a1a1aa', fontSize: '0.75rem', textAlign: 'center', marginTop: '12px', minHeight: '32px' }}>
        {currentData.description}
      </p>

      {/* Selector Buttons */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
        {(['SILENCE', 'A_E', 'O_U', 'P_B_M', 'F_V', 'L_N'] as VisemeType[]).map((v) => (
          <button
            key={v}
            onClick={() => setActiveViseme(v)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: activeViseme === v ? '1px solid #38bdf8' : '1px solid #3f3f46',
              background: activeViseme === v ? '#0284c7' : '#18181b',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: '600',
              transition: 'all 0.15s ease'
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Play Test Speech Button */}
      <button
        onClick={playTestSequence}
        disabled={isPlayingSequence}
        style={{
          marginTop: '16px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: isPlayingSequence ? '#52525b' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: isPlayingSequence ? 'not-allowed' : 'pointer',
          width: '100%',
          fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
        }}
      >
        {isPlayingSequence ? 'Synthesizing Speech...' : '▶ Play Test Speech ("M-O-T-I-O-N")'}
      </button>
    </div>
  );
};
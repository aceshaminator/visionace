import React, { useState } from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium' }) => {
  const [imgError, setImgError] = useState(false);
  const height = size === 'large' ? '48px' : size === 'small' ? '28px' : '36px';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* App Icon */}
      {!imgError ? (
        <img
          src="/icon.png"
          alt="Motion Logo"
          onError={() => setImgError(true)}
          style={{
            height: height,
            width: height,
            objectFit: 'cover',
            borderRadius: '10px'
          }}
        />
      ) : (
        <div style={{
          height: height,
          width: height,
          background: 'linear-gradient(135deg, #38bdf8, #7c3aed)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <span>🗣️</span>
        </div>
      )}

      {/* Brand Title & Subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontWeight: '800',
          fontSize: size === 'small' ? '1.1rem' : '1.35rem',
          background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '0.5px',
          lineHeight: '1.2'
        }}>
          Motion
        </span>
        <span style={{
          fontSize: '0.7rem',
          color: '#a1a1aa',
          fontWeight: '500',
          letterSpacing: '0.2px'
        }}>
          Speech & Rhythm Assistant · by VisionAce
        </span>
      </div>
    </div>
  );
};
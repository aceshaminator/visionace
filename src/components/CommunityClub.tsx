import React from 'react';

const POSTS = [
  { user: 'Alex M.', role: 'Speech Student', text: 'Mastering the F_V labiodental placement finally clicked today using Motion!', time: '2h ago', likes: 14 },
  { user: 'Sarah K.', role: 'Speech Pathologist', text: 'Using the SVG viseme engine with my hard-of-hearing students has been a game-changer.', time: '5h ago', likes: 29 }
];

export const CommunityClub: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px', margin: '0 auto', color: '#f8fafc' }}>
      <div style={{ background: '#09090b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: '700' }}>Community Club</h3>
        <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '16px' }}>
          Share progress and connect with peers and speech specialists.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {POSTS.map((p, idx) => (
            <div key={idx} style={{ background: '#18181b', padding: '12px', borderRadius: '10px', border: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#38bdf8' }}>{p.user}</span>
                <span style={{ fontSize: '0.65rem', color: '#71717a' }}>{p.time}</span>
              </div>
              <span style={{ fontSize: '0.65rem', background: '#27272a', padding: '2px 6px', borderRadius: '4px', color: '#a1a1aa' }}>{p.role}</span>
              <p style={{ fontSize: '0.8rem', color: '#f4f4f5', margin: '8px 0 6px 0' }}>{p.text}</p>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>❤️ {p.likes} Likes</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
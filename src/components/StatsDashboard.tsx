import React from 'react';

export const StatsDashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '360px', margin: '0 auto', color: '#f8fafc' }}>
      <div style={{ background: '#09090b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: '700' }}>Learning Progress & Analytics</h3>
        <p style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '20px' }}>
          Review your daily milestones and articulation accuracy metrics.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#18181b', padding: '14px', borderRadius: '10px', border: '1px solid #3f3f46', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Practice Streak</span>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>7 Days 🔥</div>
          </div>
          <div style={{ background: '#18181b', padding: '14px', borderRadius: '10px', border: '1px solid #3f3f46', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Avg Accuracy</span>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#22c55e', marginTop: '4px' }}>92.4%</div>
          </div>
        </div>

        <div style={{ background: '#18181b', padding: '14px', borderRadius: '10px', border: '1px solid #3f3f46' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#f8fafc', display: 'block', marginBottom: '8px' }}>Viseme Mastery Breakdown</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#a1a1aa' }}>
            <div style={{ display: 'ж', justifyContent: 'space-between' }}><span>P_B_M Plosives</span> <strong style={{ color: '#22c55e' }}>98%</strong></div>
            <div style={{ display: 'ж', justifyContent: 'space-between' }}><span>A_E Vowels</span> <strong style={{ color: '#22c55e' }}>94%</strong></div>
            <div style={{ display: 'ж', justifyContent: 'space-between' }}><span>F_V Labiodentals</span> <strong style={{ color: '#38bdf8' }}>88%</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
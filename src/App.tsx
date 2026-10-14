import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { LanguageSelector } from './components/LanguageSelector';
import { WelcomeModal } from './components/WelcomeModal';
import { MouthSpriteVisualizer } from './components/MouthSpriteVisualizer';
import { HapticBuilder } from './components/HapticBuilder';
import { SpeechTrainer } from './components/SpeechTrainer';
import { CommunityClub } from './components/CommunityClub';
import { StatsDashboard } from './components/StatsDashboard';

export function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userSettings, setUserSettings] = useState({ highVisibility: true, hapticStrength: 90, micEnabled: false });
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState<'articulation' | 'builder' | 'trainer' | 'club' | 'stats'>('articulation');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingBottom: '90px',
      fontSize: userSettings.highVisibility ? '1.05rem' : '1rem'
    }}>
      
      {showOnboarding && (
        <WelcomeModal onContinue={() => setShowOnboarding(false)} />
      )}

      {/* Header with Logo and Language Switcher */}
      <header style={{
        width: '100%',
        maxWidth: '480px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #27272a'
      }}>
        <Logo size="medium" />
        <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
      </header>

      {/* Main Content View */}
      <main style={{ width: '100%', maxWidth: '480px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        {activeTab === 'articulation' && <MouthSpriteVisualizer />}
        {activeTab === 'builder' && <HapticBuilder />}
        {activeTab === 'trainer' && <SpeechTrainer />}
        {activeTab === 'club' && <CommunityClub />}
        {activeTab === 'stats' && <StatsDashboard />}
      </main>

      {/* Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#121216',
        borderTop: '1px solid #27272a',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        zIndex: 100
      }}>
        {[
          { id: 'articulation', label: 'Articulation', icon: '🎤' },
          { id: 'builder', label: 'Builder', icon: '⚡' },
          { id: 'trainer', label: 'Trainer', icon: '🎯' },
          { id: 'club', label: 'Club', icon: '👥' },
          { id: 'stats', label: 'Stats', icon: '📊' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? '#34d399' : '#a1a1aa',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: isActive ? 'bold' : 'normal',
                flex: 1
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>

    </div>
  );
}

export default App;
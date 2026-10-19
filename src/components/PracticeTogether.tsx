import React,{ useState, useEffect, useRef } from 'react';
import { MotionP2PManager, MotionP2PPayload } from './p2pManager';
import { AudioVisemeEngine } from './audioVisemeEngine';
import './PracticeTogether.css';

export const PracticeTogether: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [roomCode] = useState<string>('4829');
  const [currentViseme, setCurrentViseme] = useState<number>(0);
  const [volumeScore, setVolumeScore] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);

  const p2pRef = useRef<MotionP2PManager | null>(null);
  const audioEngineRef = useRef<AudioVisemeEngine | null>(null);

  useEffect(() => {
    // 1. Initialize P2P Manager
    p2pRef.current = new MotionP2PManager(
      (incomingData: MotionP2PPayload) => {
        if (incomingData.type === 'viseme') {
          setCurrentViseme(incomingData.visemeId);
        }
      },
      (connected: boolean) => setIsConnected(connected)
    );

    // 2. Initialize Audio Engine with state binding & trace logging
    audioEngineRef.current = new AudioVisemeEngine((visemeId, volume) => {
      console.log('Viseme Update -> ID:', visemeId, 'Volume:', volume);
      setCurrentViseme(visemeId);
      setVolumeScore(volume);
    });

    return () => {
      p2pRef.current?.disconnectSession();
      audioEngineRef.current?.stopListening();
    };
  }, []);

  const handleToggleMic = async () => {
    if (!audioEngineRef.current) return;

    if (isListening) {
      audioEngineRef.current.stopListening();
      setIsListening(false);
      setCurrentViseme(0);
      setVolumeScore(0);
    } else {
      try {
        await audioEngineRef.current.startListening();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start audio engine:', err);
      }
    }
  };

  const handleEndSession = () => {
    audioEngineRef.current?.stopListening();
    p2pRef.current?.disconnectSession();
    setIsListening(false);
    setCurrentViseme(0);
    setVolumeScore(0);
  };

  return (
    <div className="practice-container" style={{ padding: '20px', color: '#fff', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <header className="practice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-back" onClick={handleEndSession}>← Back</button>
        <h2>PRACTICE TOGETHER</h2>
        <div className="room-badge">
          <span>Room: {roomCode}</span>
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        </div>
      </header>

      {/* Partner Connection Status */}
      <div className="partner-card" style={{ margin: '20px 0', padding: '12px', background: '#161b22', borderRadius: '8px', textAlign: 'center' }}>
        <p className="partner-status">
          {isConnected ? '🟢 Ally Connected' : '🟡 Waiting for peer...'}
        </p>
      </div>

      {/* Viseme Canvas with Reactive Inline Fallback Styling */}
      <div className="viseme-canvas" style={{ textAlign: 'center', padding: '30px', background: '#0d1117', borderRadius: '12px', border: '1px solid #30363d' }}>
        <div 
          className={`viseme-shape shape-${currentViseme}`}
          style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 20px auto',
            borderRadius: '50%',
            background: isListening ? '#238636' : '#30363d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.05s ease-out',
            transform: `scale(${1 + Math.min(0.3, volumeScore / 200)})`
          }}
        >
          <div 
            className="viseme-mouth" 
            style={{ 
              width: '45px',
              height: `${Math.max(10, volumeScore * 0.7)}px`,
              background: '#fff',
              borderRadius: '20px',
              transition: 'height 0.05s ease-out'
            }} 
          />
        </div>
        <h3 style={{ margin: '10px 0' }}>Viseme Shape: {currentViseme}</h3>
        <p style={{ fontSize: '1.2rem', color: '#58a6ff' }}>Microphone Volume: {volumeScore}%</p>
      </div>

      {/* Action Controls */}
      <div className="controls-row" style={{ marginTop: '20px' }}>
        <button 
          type="button"
          className={`btn-mic ${isListening ? 'active' : ''}`} 
          onClick={handleToggleMic}
          style={{ 
            cursor: 'pointer', 
            padding: '15px', 
            fontSize: '1rem', 
            background: isListening ? '#da3633' : '#238636', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          {isListening ? '🔴 Stop Listening' : '🎤 Start Audio Processing'}
        </button>
      </div>

      <button 
        type="button" 
        className="btn-danger" 
        onClick={handleEndSession} 
        style={{ marginTop: '15px', width: '100%', padding: '12px', background: '#21262d', color: '#f85149', border: '1px solid #f85149', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        ✓ End Session & Clear Data
      </button>
    </div>
  );
};
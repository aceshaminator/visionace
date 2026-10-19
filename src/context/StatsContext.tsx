import React, { createContext, useContext, useState, useEffect } from 'react';

type StatsContextType = {
  streak: number;
  accuracy: number;
  level: string;
  incrementStreak: () => void;
  updateAccuracy: (value: number) => void;
  resetStats: () => void;
};

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [streak, setStreak] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [level, setLevel] = useState('Beginner');

  // Load saved stats on mount
  useEffect(() => {
    const savedStreak = localStorage.getItem('streak');
    const savedAccuracy = localStorage.getItem('accuracy');
    const savedLevel = localStorage.getItem('level');

    if (savedStreak) setStreak(Number(savedStreak));
    if (savedAccuracy) setAccuracy(Number(savedAccuracy));
    if (savedLevel) setLevel(savedLevel);
  }, []);

  // Save stats whenever they change
  useEffect(() => {
    localStorage.setItem('streak', String(streak));
    localStorage.setItem('accuracy', String(accuracy));
    localStorage.setItem('level', level);
  }, [streak, accuracy, level]);

  const incrementStreak = () => setStreak(prev => prev + 1);

  const updateAccuracy = (value: number) => {
    setAccuracy(value);
    if (value >= 90) setLevel('Advanced');
    else if (value >= 70) setLevel('Intermediate');
    else setLevel('Beginner');
  };

  const resetStats = () => {
    setStreak(0);
    setAccuracy(0);
    setLevel('Beginner');
    localStorage.removeItem('streak');
    localStorage.removeItem('accuracy');
    localStorage.removeItem('level');
  };

  return (
    <StatsContext.Provider
      value={{ streak, accuracy, level, incrementStreak, updateAccuracy, resetStats }}
    >
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) throw new Error('useStats must be used within StatsProvider');
  return context;
};

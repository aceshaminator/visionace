import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AccessibilityContextType {
  largeText: boolean;
  toggleLargeText: () => void;
  strongHaptics: boolean;
  strongHaptic: boolean;
  setStrongHaptic: (value: boolean) => void;
  toggleStrongHaptics: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [largeText, setLargeText] = useState(false);
  const [strongHaptics, setStrongHaptics] = useState(true);

  const toggleLargeText = () => setLargeText((prev) => !prev);
  const toggleStrongHaptics = () => setStrongHaptics((prev) => !prev);
  const setStrongHaptic = (value: boolean) => setStrongHaptics(value);

  return (
    <AccessibilityContext.Provider
      value={{
        largeText,
        toggleLargeText,
        strongHaptics,
        strongHaptic: strongHaptics,
        setStrongHaptic,
        toggleStrongHaptics,
      }}
    >
      <div className={largeText ? 'text-lg' : 'text-base'}>
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
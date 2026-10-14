import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'fr' | 'ha' | 'ig' | 'yo';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
];

interface TranslationDictionary {
  articulationTab: string;
  builderTab: string;
  trainerTab: string;
  statsTab: string;
  connectMic: string;
  disconnectMic: string;
  saveStorage: string;
  testPattern: string;
  [key: string]: string;
}

const translations: Record<Language, TranslationDictionary> = {
  en: {
    articulationTab: 'Articulation',
    builderTab: 'Builder',
    trainerTab: 'Trainer',
    statsTab: 'Stats',
    connectMic: 'Connect Mic',
    disconnectMic: 'Disconnect Mic',
    saveStorage: 'Save to IndexedDB',
    testPattern: 'Test Haptic Pattern',
  },
  fr: {
    articulationTab: 'Articulation',
    builderTab: 'Générateur',
    trainerTab: 'Entraîneur',
    statsTab: 'Statistiques',
    connectMic: 'Connecter le micro',
    disconnectMic: 'Déconnecter le micro',
    saveStorage: 'Enregistrer dans IndexedDB',
    testPattern: 'Tester le modèle haptique',
  },
  ha: {
    articulationTab: 'Kalaman Fito da Sauti',
    builderTab: 'Mai Kera',
    trainerTab: 'Mai Horarwa',
    statsTab: 'Kididdiga',
    connectMic: 'Haɗa Makirufo',
    disconnectMic: 'Cire Makirufo',
    saveStorage: 'Ajiye a IndexedDB',
    testPattern: 'Gwada Tsarin Haptic',
  },
  ig: {
    articulationTab: 'Nkwupụta Okwu',
    builderTab: 'Onye Nrụpụta',
    trainerTab: 'Onye Ọzụzụ',
    statsTab: 'Ọnụ ọgụgụ',
    connectMic: 'Jikọọ Maịk',
    disconnectMic: 'Kwụpụ Maịk',
    saveStorage: 'Chekwaa na IndexedDB',
    testPattern: 'Nwalee Ụdị Haptic',
  },
  yo: {
    articulationTab: 'Sísọ Gbolohun',
    builderTab: 'Olùṣẹ̀dá',
    trainerTab: 'Olùkọ́ni',
    statsTab: 'Àwọn Àkọọsilẹ',
    connectMic: 'So Maikirofu',
    disconnectMic: 'Yọ Maikirofu kuro',
    saveStorage: 'Fipamọ si IndexedDB',
    testPattern: 'Dan Awoṣe Haptic wo',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const value = {
    language,
    setLanguage,
    t: translations[language] || translations.en,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
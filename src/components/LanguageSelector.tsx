import React from 'react';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English (EN)' },
  { code: 'es', label: 'Español (ES)' },
  { code: 'fr', label: 'Français (FR)' },
  { code: 'de', label: 'Deutsch (DE)' },
  { code: 'zh', label: '中文 (ZH)' }
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <select
        value={currentLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        style={{
          background: '#18181b',
          color: '#f8fafc',
          border: '1px solid #3f3f46',
          borderRadius: '20px',
          padding: '6px 12px',
          fontSize: '0.8rem',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ background: '#18181b', color: '#fff' }}>
            🌐 {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
};
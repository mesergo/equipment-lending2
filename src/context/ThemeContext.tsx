import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'medical-light' | 'hospital-blue' | 'warm-emerald' | 'pure-clean';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  description: string;
  bgClass: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentColor: string;
  accentBg: string;
  accentHover: string;
  badgeBg: string;
  previewColor: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  'medical-light': {
    id: 'medical-light',
    name: 'לבן רפואי נקי (מומלץ)',
    description: 'עיצוב קליני בהיר, רענן ומרגיע עם נגיעות טורקיז וירוק בריאות',
    bgClass: 'bg-slate-50 text-slate-900',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200 shadow-sm hover:shadow-md',
    headerBg: 'bg-white/95 border-slate-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    accentColor: 'text-teal-600',
    accentBg: 'bg-teal-600 text-white hover:bg-teal-700',
    accentHover: 'hover:bg-teal-50',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    previewColor: '#0d9488',
  },
  'hospital-blue': {
    id: 'hospital-blue',
    name: 'תכלת מרכז רפואי',
    description: 'מראה מודרני מבוסס כחול רופאים, תכלת שמיים ולבן צחור',
    bgClass: 'bg-sky-50/50 text-slate-900',
    cardBg: 'bg-white',
    cardBorder: 'border-sky-100 shadow-sm hover:shadow-md',
    headerBg: 'bg-white/95 border-sky-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    accentColor: 'text-blue-600',
    accentBg: 'bg-blue-600 text-white hover:bg-blue-700',
    accentHover: 'hover:bg-blue-50',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    previewColor: '#2563eb',
  },
  'warm-emerald': {
    id: 'warm-emerald',
    name: 'חסד וחמימות קהילתית',
    description: 'גווני שמנת רכים, ירוק עד עדין וזהב חם לתחושת דאגה ורוגע',
    bgClass: 'bg-stone-50 text-stone-900',
    cardBg: 'bg-white',
    cardBorder: 'border-stone-200 shadow-sm hover:shadow-md',
    headerBg: 'bg-white/95 border-stone-200',
    textPrimary: 'text-stone-900',
    textSecondary: 'text-stone-700',
    textMuted: 'text-stone-500',
    accentColor: 'text-emerald-700',
    accentBg: 'bg-emerald-700 text-white hover:bg-emerald-800',
    accentHover: 'hover:bg-emerald-50',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    previewColor: '#047857',
  },
  'pure-clean': {
    id: 'pure-clean',
    name: 'מינימליסטי אלגנטי',
    description: 'קווי עיצוב נקיים, רקע לבן וקונטרסט גבוה וברור',
    bgClass: 'bg-zinc-100/60 text-zinc-900',
    cardBg: 'bg-white',
    cardBorder: 'border-zinc-200 shadow-sm hover:shadow-md',
    headerBg: 'bg-white/95 border-zinc-200',
    textPrimary: 'text-zinc-900',
    textSecondary: 'text-zinc-700',
    textMuted: 'text-zinc-500',
    accentColor: 'text-cyan-700',
    accentBg: 'bg-slate-900 text-white hover:bg-slate-800',
    accentHover: 'hover:bg-zinc-100',
    badgeBg: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    previewColor: '#0f172a',
  },
};

interface ThemeContextType {
  currentTheme: AppTheme;
  theme: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('medical-light');

  const value = {
    currentTheme,
    theme: THEMES[currentTheme],
    setTheme: (t: AppTheme) => setCurrentTheme(t),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

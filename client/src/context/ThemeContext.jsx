import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'dsa-theme';
const LAYOUT_STORAGE_KEY = 'dsa-layout';

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const s = localStorage.getItem(THEME_STORAGE_KEY);
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function readStoredLayout() {
  try {
    const s = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (s === 'classic' || s === 'doodle') return s;
  } catch {
    /* ignore */
  }
  return 'doodle';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);
  const [layout, setLayout] = useState(readStoredLayout);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-layout', layout);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, [theme, layout]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleLayout = useCallback(() => {
    setLayout((l) => (l === 'doodle' ? 'classic' : 'doodle'));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, layout, setLayout, toggleLayout }),
    [layout, theme, toggleLayout, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

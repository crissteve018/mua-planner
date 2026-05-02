import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getSettings, updateSettings as apiUpdateSettings } from '../api/settings';
import { COLORS, COLORS_DARK } from '../constants';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  themeColor: '#7B2D52',
  colorMode: 'light',
  fontSize: 'medium',
  notificationsEnabled: 'false',
  notifyBefore: '60',
  notifyTimes: '1',
  passcodeLock: 'false',
  passcode: '',
  mapsEnabled: 'true',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getSettings();
        if (mounted && res.success) {
          setSettings(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('SettingsContext: failed to load settings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ── compute effective dark mode ───────────── */
  const isDark = useMemo(() => {
    const mode = settings.colorMode || 'light';
    if (mode === 'dark') return true;
    if (mode === 'system') return systemScheme === 'dark';
    return false; // light
  }, [settings.colorMode, systemScheme]);

  /* ── compute theme colors ──────────────────── */
  const theme = useMemo(() => {
    const base = isDark ? { ...COLORS_DARK } : { ...COLORS };
    // Apply dynamic theme color — validate hex to prevent blank/invalid primary
    const raw = settings.themeColor;
    const isValidHex = (c) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c.trim());
    base.primary = isValidHex(raw) ? raw.trim() : '#7B2D52';
    return base;
  }, [isDark, settings.themeColor]);

  const updateSettings = useCallback(async (updates) => {
    // Optimistic update
    const stringified = {};
    for (const [k, v] of Object.entries(updates)) stringified[k] = String(v);
    setSettings(prev => ({ ...prev, ...stringified }));
    try {
      const res = await apiUpdateSettings(stringified);
      if (res.success) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('SettingsContext: failed to save settings:', err);
    }
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, loading, isDark, theme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

/** Returns the active color palette (same shape as COLORS) */
export function useTheme() {
  const { theme } = useSettings();
  return theme;
}

export default SettingsContext;

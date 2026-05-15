import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '../types';
import { makeTokens, Tokens } from '../theme';

const PREFS_KEY = '@runnow_prefs';

const DEFAULT_PREFS: UserPreferences = {
  homeCity: '',
  homeLat: null,
  homeLon: null,
  accentColor: '#F25A1F',
  windThresholdKmh: 15,
  notifyLeadMinutes: 30,
  darkMode: false,
  rainChanceThreshold: 30,
  unitDistance: 'km',
  unitTemp: 'C',
  unitWind: 'km/h',
  notifyOnChange: true,
  quietHoursEnabled: false,
  stravaConnected: false,
  spotifyConnected: false,
  garminConnected: false,
  healthConnectConnected: false,
  stravaAutoImport: true,
};

interface FullPrefs extends UserPreferences {
  weatherApiKey: string;
}

interface PreferencesContextValue {
  prefs: FullPrefs;
  updatePrefs: (patch: Partial<FullPrefs>) => Promise<void>;
  isLoaded: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: { ...DEFAULT_PREFS, weatherApiKey: '' },
  updatePrefs: async () => {},
  isLoaded: false,
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<FullPrefs>({ ...DEFAULT_PREFS, weatherApiKey: '' });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then(raw => {
        if (raw) {
          setPrefs(prev => ({ ...prev, ...JSON.parse(raw) }));
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<FullPrefs>) => {
    const next = await new Promise<FullPrefs>(resolve => {
      setPrefs(prev => {
        const merged = { ...prev, ...patch };
        resolve(merged);
        return merged;
      });
    });
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }, []);

  return (
    <PreferencesContext.Provider value={{ prefs, updatePrefs, isLoaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function useTokens(): Tokens {
  const { prefs } = usePreferences();
  return useMemo(
    () => makeTokens(prefs.accentColor || '#F25A1F', prefs.darkMode),
    [prefs.accentColor, prefs.darkMode]
  );
}

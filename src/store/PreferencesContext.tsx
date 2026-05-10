import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences } from '../types';

const PREFS_KEY = '@runnow_prefs';

const DEFAULT_PREFS: UserPreferences = {
  homeCity: '',
  homeLat: null,
  homeLon: null,
  accentColor: '#2A6FDB',
  windThresholdKmh: 15,
  notifyLeadMinutes: 30,
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
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
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

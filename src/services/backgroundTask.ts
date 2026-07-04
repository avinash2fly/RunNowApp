import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnabledSchedules, insertHistoryEntry } from './database';
import { fetchWeatherForecast } from './weather';
import { sendRunNotification, isInQuietHours } from './notifications';
import { occurrenceWithinWindow } from '../utils/scheduling';
import { UnitTemp, UnitWind } from '../types';

export const BACKGROUND_FETCH_TASK = 'RUNNOW_WEATHER_CHECK';

const PREFS_KEY = '@runnow_prefs';
const LAST_FIRED_KEY = '@runnow_last_fired';

interface StoredPrefs {
  homeLat: number | null;
  homeLon: number | null;
  weatherApiKey: string;
  windThresholdKmh: number;
  rainChanceThreshold?: number;
  notifyLeadMinutes: number;
  quietHoursEnabled?: boolean;
  unitTemp?: UnitTemp;
  unitWind?: UnitWind;
}

async function loadPrefs(): Promise<StoredPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function loadLastFired(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(LAST_FIRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveLastFired(map: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_FIRED_KEY, JSON.stringify(map));
  } catch {
    // best-effort
  }
}

// A schedule fires at most once per (scheduleId, target occurrence). Keyed by
// the occurrence's local calendar date so the same schedule fires again the
// following week.
function occurrenceKey(scheduleId: number, occurrence: Date): string {
  const y = occurrence.getFullYear();
  const m = String(occurrence.getMonth() + 1).padStart(2, '0');
  const d = String(occurrence.getDate()).padStart(2, '0');
  return `${scheduleId}:${y}-${m}-${d}`;
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const prefs = await loadPrefs();

    if (prefs?.homeLat == null || prefs?.homeLon == null || !prefs?.weatherApiKey) {
      console.log('[BackgroundTask] Missing location or API key');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const schedules = await getEnabledSchedules();
    const leadMinutes = prefs.notifyLeadMinutes ?? 30;
    const now = new Date();

    if (prefs.quietHoursEnabled && isInQuietHours(now)) {
      console.log('[BackgroundTask] Quiet hours — skipping notifications');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const due = schedules
      .map(s => ({
        schedule: s,
        occurrence: occurrenceWithinWindow(s.dayOfWeek, s.hour, s.minute, leadMinutes, now),
      }))
      .filter((x): x is { schedule: typeof x.schedule; occurrence: Date } => x.occurrence != null);

    if (!due.length) {
      console.log('[BackgroundTask] No due schedules');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastFired = await loadLastFired();
    const toNotify = due.filter(({ schedule, occurrence }) =>
      !lastFired[occurrenceKey(schedule.id, occurrence)]
    );

    if (!toNotify.length) {
      console.log('[BackgroundTask] All due schedules already fired this window');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const windThreshold = prefs.windThresholdKmh ?? 15;
    const rainThreshold = prefs.rainChanceThreshold ?? 30;
    const units = { temp: prefs.unitTemp ?? 'C', wind: prefs.unitWind ?? 'km/h' } as const;

    let weather;
    try {
      weather = await fetchWeatherForecast(
        prefs.homeLat, prefs.homeLon, prefs.weatherApiKey, windThreshold, rainThreshold
      );
    } catch (fetchErr) {
      console.error('[BackgroundTask] Weather fetch failed, retrying:', fetchErr);
      return BackgroundFetch.BackgroundFetchResult.Failed; // OS will retry
    }

    const windKmh = weather.hourly[0]?.wind_kph;

    for (const { schedule, occurrence } of toNotify) {
      await sendRunNotification(schedule.id, weather.verdict, weather.currentTemp, windKmh, units);

      await insertHistoryEntry({
        scheduleId: schedule.id,
        date: new Date().toISOString(),
        distanceKm: schedule.distanceKm,
        durationSec: 0,
        verdict: weather.verdict,
        completed: false,
      });

      lastFired[occurrenceKey(schedule.id, occurrence)] = now.getTime();
    }

    // Trim entries older than 14 days to keep the map small
    const cutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;
    for (const [k, t] of Object.entries(lastFired)) {
      if (t < cutoff) delete lastFired[k];
    }
    await saveLastFired(lastFired);

    console.log('[BackgroundTask] Notified', toNotify.length, 'schedules');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BackgroundTask] Unexpected error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, // 15 min (OS may enforce longer on iOS)
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  }
}

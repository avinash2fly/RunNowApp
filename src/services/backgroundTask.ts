import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnabledSchedules, insertHistoryEntry } from './database';
import { fetchWeatherForecast } from './weather';
import { sendRunNotification } from './notifications';
import { isWithinWindow } from '../utils/scheduling';

export const BACKGROUND_FETCH_TASK = 'RUNNOW_WEATHER_CHECK';

const PREFS_KEY = '@runnow_prefs';
const LAST_FIRED_KEY = '@runnow_last_fired';

interface StoredPrefs {
  homeLat: number | null;
  homeLon: number | null;
  weatherApiKey: string;
  windThresholdKmh: number;
  notifyLeadMinutes: number;
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

// A schedule fires at most once per (scheduleId, target occurrence). We bucket
// by floor(scheduledAt / day) so the same schedule can fire again the next week.
function occurrenceKey(scheduleId: number, dayOfWeek: number, hour: number, minute: number, now: Date): string {
  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  return `${scheduleId}:${week}:${dayOfWeek}:${hour}:${minute}`;
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

    const due = schedules.filter(s =>
      isWithinWindow(s.dayOfWeek, s.hour, s.minute, leadMinutes, now)
    );

    if (!due.length) {
      console.log('[BackgroundTask] No due schedules');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastFired = await loadLastFired();
    const toNotify = due.filter(s => {
      const key = occurrenceKey(s.id, s.dayOfWeek, s.hour, s.minute, now);
      return !lastFired[key];
    });

    if (!toNotify.length) {
      console.log('[BackgroundTask] All due schedules already fired this window');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const windThreshold = prefs.windThresholdKmh ?? 15;

    let weather;
    try {
      weather = await fetchWeatherForecast(prefs.homeLat, prefs.homeLon, prefs.weatherApiKey, windThreshold);
    } catch (fetchErr) {
      console.error('[BackgroundTask] Weather fetch failed, retrying:', fetchErr);
      return BackgroundFetch.BackgroundFetchResult.Failed; // OS will retry
    }

    const windKmh = weather.hourly[0]?.wind_kph;

    for (const schedule of toNotify) {
      await sendRunNotification(schedule.id, weather.verdict, weather.currentTemp, windKmh);

      await insertHistoryEntry({
        scheduleId: schedule.id,
        date: new Date().toISOString(),
        distanceKm: schedule.distanceKm,
        durationSec: 0,
        verdict: weather.verdict,
        completed: false,
      });

      lastFired[occurrenceKey(schedule.id, schedule.dayOfWeek, schedule.hour, schedule.minute, now)] = now.getTime();
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

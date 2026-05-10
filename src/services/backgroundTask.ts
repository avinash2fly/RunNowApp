import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnabledSchedules, insertHistoryEntry } from './database';
import { fetchWeatherForecast } from './weather';
import { sendRunNotification } from './notifications';

export const BACKGROUND_FETCH_TASK = 'RUNNOW_WEATHER_CHECK';

const PREFS_KEY = '@runnow_prefs';

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

// Returns true if a schedule fires within [now, now + windowMs]
function isWithinWindow(
  dayOfWeek: number,
  hour: number,
  minute: number,
  leadMinutes: number
): boolean {
  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun

  if (todayDow !== dayOfWeek) return false;

  const scheduleMs =
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0).getTime();
  const diff = scheduleMs - now.getTime();
  const windowMs = leadMinutes * 60 * 1000;

  return diff >= 0 && diff <= windowMs;
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const prefs = await loadPrefs();

    if (!prefs?.homeLat || !prefs?.homeLon || !prefs?.weatherApiKey) {
      console.log('[BackgroundTask] Missing location or API key');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const schedules = await getEnabledSchedules();
    const leadMinutes = prefs.notifyLeadMinutes ?? 30;

    const due = schedules.filter(s =>
      isWithinWindow(s.dayOfWeek, s.hour, s.minute, leadMinutes)
    );

    if (!due.length) {
      console.log('[BackgroundTask] No due schedules');
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

    for (const schedule of due) {
      await sendRunNotification(schedule.id, weather.verdict, weather.currentTemp, windKmh);

      await insertHistoryEntry({
        scheduleId: schedule.id,
        date: new Date().toISOString(),
        distanceKm: schedule.distanceKm,
        durationSec: 0,
        verdict: weather.verdict,
        completed: false,
      });
    }

    console.log('[BackgroundTask] Notified', due.length, 'schedules');
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

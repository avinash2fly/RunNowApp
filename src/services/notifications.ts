import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WeatherVerdict } from '../types';

const CHANNEL_ID = 'runnow_weather';

export async function initializeNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Run Weather Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2A6FDB',
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

interface NotificationContent {
  title: string;
  body: string;
}

function buildNotificationContent(verdict: WeatherVerdict, temp?: number | null, windKmh?: number): NotificationContent {
  const tempStr = temp != null ? `${Math.round(temp)}°C` : '';
  const windStr = windKmh != null ? `, ${windKmh} km/h wind` : '';

  switch (verdict) {
    case 'GOOD':
      return {
        title: `Good time to run! ☀️`,
        body: `Weather looks clear for the next 4 hours${tempStr ? ` (${tempStr}${windStr})` : ''}. Lace up!`,
      };
    case 'MARGINAL':
      return {
        title: 'Weather is borderline ⛅',
        body: `Some chance of rain in the next 4 hours${tempStr ? ` (${tempStr}${windStr})` : ''}. Your call.`,
      };
    case 'BAD':
      return {
        title: 'Bad weather — skip today ⛈️',
        body: `Rain or strong winds expected in the next 4 hours${tempStr ? ` (${tempStr}${windStr})` : ''}. Rest up.`,
      };
    default:
      return {
        title: 'RunNow weather check',
        body: 'Could not retrieve weather data. Check manually before heading out.',
      };
  }
}

export async function sendRunNotification(
  scheduleId: number,
  verdict: WeatherVerdict,
  temp?: number | null,
  windKmh?: number
): Promise<void> {
  const content = buildNotificationContent(verdict, temp, windKmh);

  const contentObj: any = {
    title: content.title,
    body: content.body,
    data: { scheduleId, verdict },
  };

  if (Platform.OS === 'android') {
    contentObj.channelId = CHANNEL_ID;
  }

  const trigger: any =
    Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID }
      : null;

  await Notifications.scheduleNotificationAsync({
    content: contentObj,
    trigger,
  });
}

export async function scheduleWeeklyRunNotification(
  scheduleId: number,
  dayOfWeek: number,
  hour: number,
  minute: number,
  leadMinutes: number
): Promise<void> {
  const identifier = `schedule-${scheduleId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  let notifyMinute = minute - leadMinutes;
  let notifyHour = hour;
  let notifyDay = dayOfWeek;

  while (notifyMinute < 0) {
    notifyMinute += 60;
    notifyHour -= 1;
  }
  if (notifyHour < 0) {
    notifyHour += 24;
    notifyDay = (notifyDay - 1 + 7) % 7;
  }

  const contentObj: any = {
    title: 'Upcoming run',
    body: 'Open RunNow to check weather conditions before your run.',
    data: { scheduleId },
  };

  if (Platform.OS === 'android') {
    contentObj.channelId = CHANNEL_ID;
  }

  const trigger: any = {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: notifyDay + 1,
    hour: notifyHour,
    minute: notifyMinute,
  };

  if (Platform.OS === 'android') {
    trigger.channelId = CHANNEL_ID;
  }

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: contentObj,
    trigger,
  });
}

export async function cancelScheduleNotification(scheduleId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`schedule-${scheduleId}`).catch(() => {});
}

export async function cancelScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

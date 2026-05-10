import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PreferencesProvider } from './src/store/PreferencesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeNotifications, requestNotificationPermission, addNotificationResponseListener, sendRunNotification } from './src/services/notifications';
import { registerBackgroundTask } from './src/services/backgroundTask';
import { getScheduleById, insertHistoryEntry } from './src/services/database';
import { fetchWeatherForecast } from './src/services/weather';

export default function App() {
  useEffect(() => {
    const setup = async () => {
      await initializeNotifications();
      await requestNotificationPermission();
      await registerBackgroundTask();
    };

    setup();

    const handleScheduleNotification = async (scheduleId: number) => {
      try {
        const schedule = await getScheduleById(scheduleId);
        if (!schedule) return;

        const raw = await AsyncStorage.getItem('@runnow_prefs');
        const prefs = raw ? JSON.parse(raw) : null;
        if (!prefs?.homeLat || !prefs?.homeLon || !prefs?.weatherApiKey) return;

        const weather = await fetchWeatherForecast(
          prefs.homeLat, prefs.homeLon, prefs.weatherApiKey, prefs.windThresholdKmh
        );

        await sendRunNotification(scheduleId, weather.verdict, weather.currentTemp, weather.hourly[0]?.wind_kph);

        await insertHistoryEntry({
          scheduleId: schedule.id,
          date: new Date().toISOString(),
          distanceKm: schedule.distanceKm,
          durationSec: 0,
          verdict: weather.verdict,
          completed: false,
        });
      } catch (err) {
        console.error('[Notification handler] error:', err);
      }
    };

    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      const id = notification.request.identifier;
      if (id.startsWith('schedule-') && data?.scheduleId) {
        handleScheduleNotification(data.scheduleId as number);
      }
    });

    const responseSub = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      const id = response.notification.request.identifier;
      if (id.startsWith('schedule-') && data?.scheduleId) {
        handleScheduleNotification(data.scheduleId as number);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

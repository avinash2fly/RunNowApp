import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from './src/store/PreferencesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeNotifications, requestNotificationPermission, addNotificationResponseListener } from './src/services/notifications';
import { registerBackgroundTask } from './src/services/backgroundTask';

export default function App() {
  useEffect(() => {
    const setup = async () => {
      await initializeNotifications();
      await requestNotificationPermission();
      await registerBackgroundTask();
    };

    setup();

    const sub = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;
      console.log('[Notification tapped]', data);
    });

    return () => sub.remove();
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

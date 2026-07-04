import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View } from 'react-native';
import { useTokens } from '../store/PreferencesContext';
import { Icon, IconName } from '../components/Icon';
import type { WeatherVerdict } from '../types';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddEditScheduleScreen from '../screens/AddEditScheduleScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import RunReadyScreen from '../screens/RunReadyScreen';
import RunActiveScreen from '../screens/RunActiveScreen';

export type RootStackParamList = {
  Tabs: undefined;
  AddEditSchedule: { scheduleId?: number };
  Connections: undefined;
  RunReady: { scheduleId?: number };
  RunActive: { scheduleId?: number; verdict?: WeatherVerdict };
};

export type TabParamList = {
  Home: undefined;
  Schedule: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function TabIcon({ name, focused, tk }: { name: IconName; focused: boolean; tk: ReturnType<typeof useTokens> }) {
  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 4,
        borderRadius: 16,
        backgroundColor: focused ? tk.accentSoft : 'transparent',
      }}
    >
      <Icon name={name} size={22} color={focused ? tk.onAccentSoft : tk.onSurfaceVar}/>
    </View>
  );
}

function TabNavigator() {
  const tk = useTokens();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tk.onSurface,
        tabBarInactiveTintColor: tk.onSurfaceVar,
        tabBarStyle: {
          backgroundColor: tk.surfaceDim,
          borderTopColor: tk.outline,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} tk={tk}/> }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} tk={tk}/> }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="chart" focused={focused} tk={tk}/> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} tk={tk}/> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="AddEditSchedule"
        component={AddEditScheduleScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Connections" component={ConnectionsScreen} />
      <Stack.Screen
        name="RunReady"
        component={RunReadyScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="RunActive"
        component={RunActiveScreen}
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

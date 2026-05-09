import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { Colors, Spacing } from '../theme';
import { usePreferences } from '../store/PreferencesContext';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddEditScheduleScreen from '../screens/AddEditScheduleScreen';

export type RootStackParamList = {
  Tabs: undefined;
  AddEditSchedule: { scheduleId?: number };
};

export type TabParamList = {
  Home: undefined;
  Schedule: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function TabNavigator() {
  const { prefs } = usePreferences();
  const accent = prefs.accentColor ?? Colors.accent;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: Colors.onSurfaceVar,
        tabBarStyle: {
          backgroundColor: Colors.surface1,
          borderTopColor: Colors.outline,
          paddingBottom: Spacing.xs,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
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
    </Stack.Navigator>
  );
}

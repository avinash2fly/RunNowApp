import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Switch,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { getAllSchedules, deleteSchedule, setScheduleEnabled } from '../services/database';
import { VerdictChip } from '../components/VerdictChip';
import { RunSchedule } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

export default function ScheduleScreen() {
  const navigation = useNavigation<Nav>();
  const { prefs } = usePreferences();
  const [schedules, setSchedules] = useState<RunSchedule[]>([]);
  const accent = prefs.accentColor ?? Colors.accent;

  useFocusEffect(
    useCallback(() => {
      getAllSchedules().then(setSchedules);
    }, [])
  );

  const handleToggle = async (id: number, value: boolean) => {
    await setScheduleEnabled(id, value);
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isEnabled: value } : s));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete schedule?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteSchedule(id);
          setSchedules(prev => prev.filter(s => s.id !== id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: RunSchedule }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AddEditSchedule', { scheduleId: item.id })}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.85}
    >
      <View style={[styles.dateBadge, { backgroundColor: item.isEnabled ? Colors.goSoft : Colors.surface3 }]}>
        <Text style={[styles.dayText, { color: item.isEnabled ? Colors.onGoSoft : Colors.onSurfaceVar }]}>
          {DAY_LABELS[item.dayOfWeek]}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.timeText}>{formatTime(item.hour, item.minute)}</Text>
        <Text style={styles.detailText}>{item.distanceKm} km · {item.runType}</Text>
      </View>
      <Switch
        value={item.isEnabled}
        onValueChange={v => handleToggle(item.id, v)}
        trackColor={{ false: Colors.surface3, true: accent + '66' }}
        thumbColor={item.isEnabled ? accent : Colors.onSurfaceVar}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Schedule</Text>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No schedules yet</Text>
          <Text style={styles.emptyHint}>Tap + Schedule to add your first run</Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={s => String(s.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent }]}
        onPress={() => navigation.navigate('AddEditSchedule', {})}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Schedule</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  topBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { ...Typography.h1, color: Colors.onSurface },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface1, borderRadius: Radius.lg, padding: Spacing.lg,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  dateBadge: {
    width: 48, height: 48, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  dayText: { ...Typography.bodyBold },
  cardBody: { flex: 1 },
  timeText: { ...Typography.h3, color: Colors.onSurface },
  detailText: { ...Typography.small, color: Colors.onSurfaceVar, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.h2, color: Colors.onSurface },
  emptyHint: { ...Typography.body, color: Colors.onSurfaceVar },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    height: 56, borderRadius: Radius.md, paddingHorizontal: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  fabText: { ...Typography.bodyBold, color: Colors.onAccent },
});

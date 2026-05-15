import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTokens } from '../store/PreferencesContext';
import { getAllSchedules, deleteSchedule, setScheduleEnabled } from '../services/database';
import { cancelScheduleNotification, scheduleWeeklyRunNotification } from '../services/notifications';
import { usePreferences } from '../store/PreferencesContext';
import { VerdictChip } from '../components/VerdictChip';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { FAB } from '../components/FAB';
import { SectionTitle } from '../components/SectionTitle';
import { RunSchedule } from '../types';
import { nextRun as computeNextRun } from '../utils/scheduling';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function monthName(m: number): string {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}

export default function ScheduleScreen() {
  const navigation = useNavigation<Nav>();
  const tk = useTokens();
  const { prefs } = usePreferences();
  const [schedules, setSchedules] = useState<RunSchedule[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllSchedules().then(setSchedules);
    }, [])
  );

  const enabled = useMemo(() => schedules.filter(s => s.isEnabled), [schedules]);

  // Build a week strip relative to today.
  const week = useMemo(() => {
    const today = new Date();
    const result: { day: string; date: number; today: boolean; scheduled: boolean; jsDate: Date }[] = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      result.push({
        day: DAY_LABELS[d.getDay()],
        date: d.getDate(),
        today: d.toDateString() === today.toDateString(),
        scheduled: enabled.some(s => s.dayOfWeek === d.getDay()),
        jsDate: d,
      });
    }
    return result;
  }, [enabled]);

  const next = useMemo(() => computeNextRun(enabled), [enabled]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return enabled
      .map(s => {
        const candidate = new Date(now);
        const daysAhead = (s.dayOfWeek - now.getDay() + 7) % 7;
        candidate.setDate(now.getDate() + daysAhead);
        candidate.setHours(s.hour, s.minute, 0, 0);
        if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 7);
        return { schedule: s, when: candidate };
      })
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .filter(x => !next || x.schedule.id !== next.schedule.id);
  }, [enabled, next]);

  const handleToggle = async (id: number, value: boolean) => {
    await setScheduleEnabled(id, value);
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      if (value) {
        const leadMinutes = prefs.notifyLeadMinutes ?? 30;
        await scheduleWeeklyRunNotification(id, schedule.dayOfWeek, schedule.hour, schedule.minute, leadMinutes);
      } else {
        await cancelScheduleNotification(id);
      }
    }
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isEnabled: value } : s));
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete schedule?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await cancelScheduleNotification(id);
          await deleteSchedule(id);
          setSchedules(prev => prev.filter(s => s.id !== id));
        },
      },
    ]);
  };

  const now = new Date();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.month, { color: tk.onSurfaceVar }]}>
            {monthName(now.getMonth()).toUpperCase()} {now.getFullYear()}
          </Text>
          <Text style={[styles.title, { color: tk.onSurface }]}>This week</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('AddEditSchedule', {})}>
          <Icon name="plus" size={22} color={tk.onSurface}/>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Week strip */}
        <View style={styles.weekRow}>
          {week.map((w, i) => {
            const bg = w.today ? tk.accent : tk.surface2;
            const fg = w.today ? tk.onAccent : tk.onSurface;
            const dot = w.scheduled ? (w.today ? tk.onAccent : tk.go) : 'transparent';
            return (
              <View key={i} style={[styles.weekChip, { backgroundColor: bg }]}>
                <Text style={[styles.weekDay, { color: fg, opacity: w.today ? 0.85 : 0.6 }]}>{w.day.toUpperCase()}</Text>
                <Text style={[styles.weekDate, { color: fg }]}>{w.date}</Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }}/>
              </View>
            );
          })}
        </View>

        {/* Next run hero */}
        {next ? (
          <Card tone="accent" padded={false} style={{ overflow: 'hidden' }}>
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.heroLabel, { color: tk.onAccentSoft }]}>
                  {labelForDate(next.time, now).toUpperCase()}
                </Text>
                <VerdictChip verdict="GOOD" size="sm"/>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 }}>
                <Text style={[styles.heroTime, { color: tk.onSurface }]}>
                  {formatTime(next.schedule.hour, next.schedule.minute)}
                </Text>
                <Text style={[styles.heroDist, { color: tk.onAccentSoft }]}>
                  · {next.schedule.distanceKm}K {next.schedule.runType.toLowerCase()}
                </Text>
              </View>
              <Text style={[styles.heroFoot, { color: tk.onAccentSoft }]}>
                Tap to edit · long-press to delete
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddEditSchedule', { scheduleId: next.schedule.id })}
              onLongPress={() => handleDelete(next.schedule.id)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </Card>
        ) : (
          <Card tone="surface2">
            <Text style={[styles.empty, { color: tk.onSurface }]}>No upcoming runs</Text>
            <Text style={[styles.emptySub, { color: tk.onSurfaceVar }]}>
              Tap + to schedule your first run
            </Text>
          </Card>
        )}

        {/* Upcoming list */}
        {upcoming.length > 0 && (
          <>
            <SectionTitle title="Upcoming"/>
            <View style={{ gap: 8 }}>
              {upcoming.map(({ schedule: s, when }) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('AddEditSchedule', { scheduleId: s.id })}
                  onLongPress={() => handleDelete(s.id)}
                >
                  <Card tone="surface1" style={styles.runCard}>
                    <View style={[styles.dateBadge, { backgroundColor: tk.goSoft }]}>
                      <Text style={[styles.dateBadgeDay, { color: tk.onGoSoft }]}>
                        {DAY_LABELS[when.getDay()].toUpperCase()}
                      </Text>
                      <Text style={[styles.dateBadgeNum, { color: tk.onGoSoft }]}>
                        {when.getDate()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.runTitle, { color: tk.onSurface }]} numberOfLines={1}>
                        {formatTime(s.hour, s.minute)} · {s.distanceKm}K {s.runType.toLowerCase()}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Icon name="bell" size={12} color={tk.onSurfaceVar}/>
                        <Text style={{ color: tk.onSurfaceVar, fontSize: 12 }}>
                          {s.isEnabled ? `Notify ${prefs.notifyLeadMinutes ?? 30} min ahead` : 'Notifications off'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggle(s.id, !s.isEnabled)}
                      style={[styles.toggle, {
                        backgroundColor: s.isEnabled ? tk.accent : tk.surface3,
                        justifyContent: s.isEnabled ? 'flex-end' : 'flex-start',
                      }]}
                    >
                      <View style={[styles.toggleDot, { backgroundColor: '#fff' }]}/>
                    </TouchableOpacity>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Disabled schedules */}
        {schedules.some(s => !s.isEnabled) && (
          <>
            <SectionTitle title="Paused"/>
            <View style={{ gap: 8 }}>
              {schedules.filter(s => !s.isEnabled).map(s => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('AddEditSchedule', { scheduleId: s.id })}
                  onLongPress={() => handleDelete(s.id)}
                >
                  <Card tone="surface2" style={styles.runCard}>
                    <View style={[styles.dateBadge, { backgroundColor: tk.surface3 }]}>
                      <Text style={[styles.dateBadgeDay, { color: tk.onSurfaceVar }]}>
                        {DAY_LABELS[s.dayOfWeek].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.runTitle, { color: tk.onSurfaceVar }]}>
                        {formatTime(s.hour, s.minute)} · {s.distanceKm}K {s.runType.toLowerCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggle(s.id, !s.isEnabled)}
                      style={[styles.toggle, {
                        backgroundColor: tk.surface3, justifyContent: 'flex-start',
                      }]}
                    >
                      <View style={[styles.toggleDot, { backgroundColor: '#fff' }]}/>
                    </TouchableOpacity>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <FAB label="Schedule" onPress={() => navigation.navigate('AddEditSchedule', {})}/>
    </SafeAreaView>
  );
}

function labelForDate(timeMs: number, now: Date): string {
  const t = new Date(timeMs);
  if (t.toDateString() === now.toDateString()) return `Today, ${DAY_LABELS[t.getDay()]} ${monthName(t.getMonth()).slice(0, 3)} ${t.getDate()}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (t.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${DAY_LABELS[t.getDay()]}`;
  return `${DAY_LABELS[t.getDay()]} ${t.getDate()}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  month: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 8 },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 14, marginTop: 8 },
  weekChip: {
    flex: 1, paddingVertical: 10, borderRadius: 18,
    alignItems: 'center', gap: 4,
  },
  weekDay: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
  weekDate: { fontSize: 18, fontWeight: '700' },
  heroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroTime: { fontSize: 36, fontWeight: '700', letterSpacing: -1, lineHeight: 38 },
  heroDist: { fontSize: 14, paddingBottom: 4 },
  heroFoot: { fontSize: 12, marginTop: 6, opacity: 0.8 },
  empty: { fontSize: 18, fontWeight: '600' },
  emptySub: { fontSize: 13, marginTop: 4 },
  runCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
  },
  dateBadge: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBadgeDay: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  dateBadgeNum: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  runTitle: { fontSize: 15, fontWeight: '600' },
  toggle: {
    width: 48, height: 28, borderRadius: 14, padding: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  toggleDot: { width: 24, height: 24, borderRadius: 12 },
});

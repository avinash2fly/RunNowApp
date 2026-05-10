import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, Platform, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { getEnabledSchedules } from '../services/database';
import { fetchWeatherForecast, fetchAllHourly, evaluateVerdict, formatTemp } from '../services/weather';
import { sendRunNotification } from '../services/notifications';
import { insertHistoryEntry } from '../services/database';
import { VerdictChip } from '../components/VerdictChip';
import { ForecastBar } from '../components/ForecastBar';
import { WeatherIcon } from '../components/WeatherIcon';
import { Card } from '../components/Card';
import { RunSchedule, HourlyWeather, WeatherVerdict } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function nextRunCountdown(schedules: RunSchedule[]): string {
  if (!schedules.length) return 'No runs scheduled';

  const now = new Date();
  const candidates: number[] = [];

  for (const s of schedules) {
    const candidate = new Date(now);
    const daysAhead = (s.dayOfWeek - now.getDay() + 7) % 7;
    candidate.setDate(now.getDate() + daysAhead);
    candidate.setHours(s.hour, s.minute, 0, 0);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    candidates.push(candidate.getTime());
  }

  const diff = Math.min(...candidates) - now.getTime();
  const totalMin = Math.ceil(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h > 24) {
    const d = Math.floor(h / 24);
    return `Your next run is in ${d} day${d !== 1 ? 's' : ''}`;
  }
  if (h > 0) return `Your run window opens in ${h} hr ${m} min`;
  return `Your run starts in ${m} min`;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { prefs } = usePreferences();
  const [schedules, setSchedules] = useState<RunSchedule[]>([]);
  const [hourly, setHourly] = useState<HourlyWeather[]>([]);
  const [verdict, setVerdict] = useState<WeatherVerdict>('UNKNOWN');
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [allHourly, setAllHourly] = useState<HourlyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const enabled = await getEnabledSchedules();
      setSchedules(enabled);

      const apiKey = prefs.weatherApiKey;
      if (prefs.homeLat && prefs.homeLon && apiKey) {
        try {
          const result = await fetchWeatherForecast(prefs.homeLat, prefs.homeLon, apiKey);
          setHourly(result.hourly);
          setVerdict(result.verdict);
          setCurrentTemp(result.currentTemp);
          const all = await fetchAllHourly(prefs.homeLat, prefs.homeLon, apiKey);
          setAllHourly(all);
        } catch (fetchErr) {
          console.error('[HomeScreen] weather fetch error', fetchErr);
          setHourly([]);
          setVerdict('UNKNOWN');
          setCurrentTemp(null);
          setAllHourly([]);
        }
      }
    } catch (err) {
      console.error('[HomeScreen] load error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [prefs]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const handleCheckNow = async () => {
    if (!prefs.homeLat || !prefs.homeLon || !prefs.weatherApiKey) {
      Alert.alert('Setup needed', 'Set your home location and API key in Settings first.');
      return;
    }
    setChecking(true);
    try {
      const result = await fetchWeatherForecast(
        prefs.homeLat, prefs.homeLon, prefs.weatherApiKey, prefs.windThresholdKmh
      );
      setHourly(result.hourly);
      setVerdict(result.verdict);
      setCurrentTemp(result.currentTemp);
      const schedule = nextRun?.schedule;
      const scheduleId = schedule?.id ?? 0;
      await sendRunNotification(scheduleId, result.verdict, result.currentTemp, result.hourly[0]?.wind_kph);
      if (schedule) {
        await insertHistoryEntry({
          scheduleId: schedule.id,
          date: new Date().toISOString(),
          distanceKm: schedule.distanceKm,
          durationSec: 0,
          verdict: result.verdict,
          completed: false,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Weather check failed. Verify your API key in Settings.');
    } finally {
      setChecking(false);
    }
  };

  const nextRun = useMemo(() => {
    if (!schedules.length) return null;
    const now = new Date();
    let best: { schedule: RunSchedule; time: number } | null = null;
    for (const s of schedules) {
      const candidate = new Date(now);
      const daysAhead = (s.dayOfWeek - now.getDay() + 7) % 7;
      candidate.setDate(now.getDate() + daysAhead);
      candidate.setHours(s.hour, s.minute, 0, 0);
      if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
      if (!best || candidate.getTime() < best.time) {
        best = { schedule: s, time: candidate.getTime() };
      }
    }
    return best;
  }, [schedules]);

  const runIsWithinForecast = nextRun
    ? (nextRun.time - Date.now()) < 2 * 24 * 60 * 60 * 1000
    : false;

  const runWindowHourly = useMemo(() => {
    if (!nextRun || !runIsWithinForecast || !allHourly.length) return [];
    const target = nextRun.schedule.hour;
    const targetDay = nextRun.schedule.dayOfWeek;
    const windowHours: number[] = [];
    for (let offset = -2; offset <= 2; offset++) {
      windowHours.push((target + offset + 24) % 24);
    }
    const forDay = allHourly.filter(h => {
      const d = new Date(h.time_epoch * 1000);
      return windowHours.includes(d.getHours()) && d.getDay() === targetDay;
    });
    const seen = new Set<number>();
    return forDay.filter(h => {
      const hod = new Date(h.time_epoch * 1000).getHours();
      if (seen.has(hod)) return false;
      seen.add(hod);
      return true;
    }).sort((a, b) => {
      const aIdx = windowHours.indexOf(new Date(a.time_epoch * 1000).getHours());
      const bIdx = windowHours.indexOf(new Date(b.time_epoch * 1000).getHours());
      return aIdx - bIdx;
    });
  }, [nextRun, runIsWithinForecast, allHourly]);

  const verdictBg: Record<WeatherVerdict, string> = {
    GOOD: Colors.goSoft, MARGINAL: Colors.waitSoft, BAD: Colors.skipSoft, UNKNOWN: Colors.surface2,
  };
  const verdictText: Record<WeatherVerdict, string> = {
    GOOD: Colors.onGoSoft, MARGINAL: Colors.onWaitSoft, BAD: Colors.onSkipSoft, UNKNOWN: Colors.onSurfaceVar,
  };

  const tipText: Record<WeatherVerdict, string> = {
    GOOD: 'All four hours look great. Perfect conditions ahead — enjoy the run!',
    MARGINAL: 'Some chance of rain but nothing certain. Light layers recommended.',
    BAD: 'Rough conditions for the next 4 hours. Best to rest up today.',
    UNKNOWN: 'Weather data not available. Set your home location in Settings.',
  };

  const tipIcon: Record<WeatherVerdict, string> = {
    GOOD: '✅', MARGINAL: '⚠️', BAD: '🚫', UNKNOWN: '❓',
  };

  const accent = prefs.accentColor ?? Colors.accent;
  const windKmh = hourly[0] ? Math.round(hourly[0].wind_kph) : null;
  const pop = hourly[0] ? hourly[0].chance_of_rain : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.avatar}>🏃</Text>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={[styles.countdown, { color: accent }]}>{nextRunCountdown(schedules)}</Text>

        {/* Verdict hero card */}
        <Card tone="surface1" style={[styles.heroCard, { backgroundColor: verdictBg[verdict] }]}>
          <VerdictChip verdict={verdict} />
          <View style={styles.heroRow}>
            <Text style={[styles.heroTemp, { color: verdictText[verdict] }]}>
              {currentTemp != null ? formatTemp(currentTemp) : '--'}
            </Text>
            <WeatherIcon conditionCode={hourly[0]?.condition?.code} size={56} />
          </View>
          <View style={styles.statsRow}>
            <StatPill label="Wind" value={windKmh != null ? `${windKmh} km/h` : '--'} color={verdictText[verdict]} />
            <StatPill label="Rain" value={pop != null ? `${pop}%` : '--'} color={verdictText[verdict]} />
            {schedules[0] && (
              <StatPill label="Type" value={schedules[0].runType} color={verdictText[verdict]} />
            )}
          </View>
          {schedules[0] && (
            <View style={[styles.runDetailRow, { borderTopColor: 'rgba(0,0,0,0.08)' }]}>
              <Text style={{ fontSize: 16 }}>🏃</Text>
              <Text style={[styles.runDetailText, { color: verdictText[verdict] }]}>
                Today's run · {schedules[0].distanceKm}K {schedules[0].runType}
              </Text>
            </View>
          )}
        </Card>

        {/* Forecast */}
        {hourly.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NEXT 4 HOURS</Text>
            <ForecastBar hourly={hourly} activeIndex={0} />
          </View>
        )}

        {/* Weather around run time */}
        {runWindowHourly.length > 0 && nextRun && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WEATHER AROUND RUN TIME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.runWeatherRow}>
              {runWindowHourly.map(h => {
                const hod = new Date(h.time_epoch * 1000).getHours();
                const label = hod === 0 ? '12 AM' : hod < 12 ? `${hod} AM` : hod === 12 ? '12 PM' : `${hod - 12} PM`;
                const isRunHour = hod === nextRun.schedule.hour;
                const slotVerdict = evaluateVerdict([h], prefs.windThresholdKmh ?? 15);
                const dotColor = slotVerdict === 'GOOD' ? Colors.go : slotVerdict === 'BAD' ? Colors.skip : Colors.wait;
                return (
                  <View key={h.time_epoch} style={[styles.runWeatherCard, isRunHour && { backgroundColor: Colors.accentSoft }]}>
                    <Text style={[styles.runWeatherTime, isRunHour && { color: Colors.onAccentSoft }]}>{label}</Text>
                    <WeatherIcon conditionCode={h.condition?.code} size={22} />
                    <Text style={styles.runWeatherTemp}>{Math.round(h.temp_c)}°</Text>
                    <View style={styles.runWeatherWindRow}>
                      <View style={[styles.runWeatherDot, { backgroundColor: dotColor }]} />
                      <Text style={styles.runWeatherWind}>{Math.round(h.wind_kph)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Tip card */}
        <Card tone="surface2" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Text style={{ fontSize: 20 }}>{tipIcon[verdict]}</Text>
            <Text style={styles.tipText}>{tipText[verdict]}</Text>
          </View>
        </Card>

        {/* Manual weather check + notification */}
        <TouchableOpacity
          style={[styles.checkNowBtn, { borderColor: accent }]}
          onPress={handleCheckNow}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color={accent} size="small" />
            : <Text style={[styles.checkNowText, { color: accent }]}>Check Now</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* FAB */}
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

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  centered: { flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { fontSize: 28 },
  greeting: { ...Typography.h1, color: Colors.onSurface },
  countdown: { ...Typography.body, marginTop: 2 },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTemp: { fontSize: 64, fontWeight: '700', letterSpacing: -2 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  statPill: { gap: 1 },
  statLabel: { ...Typography.micro },
  statValue: { ...Typography.bodyBold },
  runDetailRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.xs,
  },
  runDetailText: { ...Typography.body },
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.label, color: Colors.onSurfaceVar },
  tipCard: {},
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  tipText: { ...Typography.body, color: Colors.onSurface, flex: 1 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    height: 56, borderRadius: Radius.md, paddingHorizontal: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  fabText: { ...Typography.bodyBold, color: Colors.onAccent },
  checkNowBtn: {
    height: 48, borderRadius: Radius.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkNowText: { ...Typography.bodyBold },
  runWeatherRow: { gap: Spacing.sm, paddingHorizontal: 2 },
  runWeatherCard: {
    width: 72, backgroundColor: Colors.surface2, borderRadius: Radius.md,
    alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, gap: 4,
  },
  runWeatherTime: { ...Typography.micro, color: Colors.onSurfaceVar },
  runWeatherTemp: { ...Typography.bodyBold, color: Colors.onSurface },
  runWeatherWindRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  runWeatherDot: { width: 6, height: 6, borderRadius: 3 },
  runWeatherWind: { ...Typography.micro, color: Colors.onSurfaceVar },
});
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { getEnabledSchedules } from '../services/database';
import { fetchWeatherForecast, formatTemp } from '../services/weather';
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
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const enabled = await getEnabledSchedules();
      setSchedules(enabled);

      const apiKey = (prefs as any).weatherApiKey;
      if (prefs.homeLat && prefs.homeLon && apiKey) {
        try {
          const result = await fetchWeatherForecast(prefs.homeLat, prefs.homeLon, apiKey);
          setHourly(result.hourly);
          setVerdict(result.verdict);
          setCurrentTemp(result.currentTemp);
        } catch (fetchErr) {
          console.error('[HomeScreen] weather fetch error', fetchErr);
          setHourly([]);
          setVerdict('UNKNOWN');
          setCurrentTemp(null);
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
          <Text style={styles.bellIcon}>🔔</Text>
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

        {/* Tip card */}
        <Card tone="surface2" style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Text style={{ fontSize: 20 }}>{tipIcon[verdict]}</Text>
            <Text style={styles.tipText}>{tipText[verdict]}</Text>
          </View>
        </Card>
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
  bellIcon: { fontSize: 24 },
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
});

// Extend prefs type inline to include owmApiKey
declare module '../store/PreferencesContext' {
  interface FullPrefs { weatherApiKey: string; }
}

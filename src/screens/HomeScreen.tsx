import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { getEnabledSchedules, insertHistoryEntry } from '../services/database';
import { fetchWeatherForecast, weatherConditionToIcon } from '../services/weather';
import { sendRunNotification } from '../services/notifications';
import { VerdictChip } from '../components/VerdictChip';
import { ForecastBar } from '../components/ForecastBar';
import { Icon, IconName } from '../components/Icon';
import { Card } from '../components/Card';
import { TopBar } from '../components/TopBar';
import { FAB } from '../components/FAB';
import { SectionTitle } from '../components/SectionTitle';
import { HourlyWeather, WeatherVerdict } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { nextRun as computeNextRun, nextRunCountdown } from '../utils/scheduling';

type Nav = StackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatHHMM(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const tk = useTokens();
  const { prefs } = usePreferences();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [hourly, setHourly] = useState<HourlyWeather[]>([]);
  const [verdict, setVerdict] = useState<WeatherVerdict>('UNKNOWN');
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const enabled = await getEnabledSchedules();
      setSchedules(enabled);

      const apiKey = prefs.weatherApiKey;
      if (prefs.homeLat != null && prefs.homeLon != null && apiKey) {
        try {
          const result = await fetchWeatherForecast(
            prefs.homeLat, prefs.homeLon, apiKey, prefs.windThresholdKmh
          );
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

  const nextRun = useMemo(() => computeNextRun(schedules), [schedules]);

  const handleCheckNow = async () => {
    if (prefs.homeLat == null || prefs.homeLon == null || !prefs.weatherApiKey) {
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

  const condition = hourly[0]?.condition;
  const windKmh = hourly[0] ? Math.round(hourly[0].wind_kph) : null;
  const pop = hourly[0] ? hourly[0].chance_of_rain : null;
  const conditionIcon: IconName = weatherConditionToIcon(condition?.code);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: tk.surface }]}>
        <ActivityIndicator color={tk.accent} size="large"/>
      </SafeAreaView>
    );
  }

  const countdownText = nextRunCountdown(schedules);
  const isWindowOpening = countdownText.startsWith('Your run window');
  const isStartsIn = countdownText.startsWith('Your run starts');
  const isNextRun = countdownText.startsWith('Your next');
  let leadText = countdownText;
  let timeHighlight = '';
  if (isWindowOpening) {
    const match = countdownText.match(/in (.+)$/);
    leadText = 'Your run window\nopens in ';
    timeHighlight = match?.[1] ?? '';
  } else if (isStartsIn) {
    const match = countdownText.match(/in (.+)$/);
    leadText = 'Your run starts in ';
    timeHighlight = match?.[1] ?? '';
  } else if (isNextRun) {
    const match = countdownText.match(/in (.+)$/);
    leadText = 'Your next run is in ';
    timeHighlight = match?.[1] ?? '';
  }

  const verdictHeroBg = verdict === 'UNKNOWN' ? tk.surface1 : tk.accentSoft;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar leading="avatar" trailing="bell"/>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tk.accent}/>}
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 4 }}>
          <Text style={[styles.greeting, { color: tk.onSurfaceVar }]}>{getGreeting()}</Text>
          <Text style={[styles.countdown, { color: tk.onSurface }]}>
            {leadText}
            {timeHighlight ? <Text style={{ color: tk.accent }}>{timeHighlight}</Text> : null}
          </Text>
        </View>

        {/* Verdict hero card */}
        <View style={[styles.hero, { backgroundColor: verdictHeroBg }]}>
          <View style={{ padding: 20, paddingBottom: 4 }}>
            <VerdictChip verdict={verdict}/>
            <View style={styles.heroRow}>
              <Text style={[styles.heroTemp, { color: tk.onSurface }]}>
                {currentTemp != null ? `${Math.round(currentTemp)}°` : '--'}
              </Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.heroCondition, { color: tk.onSurface }]} numberOfLines={1}>
                  {condition?.text ?? 'Set up weather'}
                </Text>
                {windKmh != null && (
                  <Text style={[styles.heroSub, { color: tk.onAccentSoft }]} numberOfLines={1}>
                    Feels like {currentTemp != null ? Math.round(currentTemp) : '--'}°
                  </Text>
                )}
              </View>
              <Icon name={conditionIcon} size={56} color={tk.accent}/>
            </View>
            <View style={[styles.statsRow, { borderTopColor: tk.outline }]}>
              <Stat icon="wind" label="WIND"  value={windKmh != null ? `${windKmh} km/h` : '--'}/>
              <Stat icon="drop" label="RAIN"  value={pop != null ? `${pop}%` : '--'}/>
              <Stat icon="bolt" label="VERDICT" value={verdict === 'GOOD' ? 'Go' : verdict === 'MARGINAL' ? 'Wait' : verdict === 'BAD' ? 'Skip' : '—'}/>
            </View>
          </View>

          {/* Inset run row */}
          {nextRun && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AddEditSchedule', { scheduleId: nextRun.schedule.id })}
              style={[styles.runRow, { backgroundColor: tk.surface }]}
            >
              <View style={[styles.runIcon, { backgroundColor: tk.accent }]}>
                <Icon name="run" size={22} color={tk.onAccent}/>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.runTitle, { color: tk.onSurface }]} numberOfLines={1}>
                  {nextRunLabel(nextRun.time)} · {nextRun.schedule.distanceKm}K {nextRun.schedule.runType.toLowerCase()}
                </Text>
                <Text style={[styles.runSub, { color: tk.onSurfaceVar }]} numberOfLines={1}>
                  {formatHHMM(new Date(nextRun.time))}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={tk.onSurfaceVar}/>
            </TouchableOpacity>
          )}
        </View>

        {/* 4-hour forecast */}
        {hourly.length > 0 && (
          <View>
            <SectionTitle title="Next 4 hours"/>
            <ForecastBar hourly={hourly} activeIndex={0}/>
          </View>
        )}

        {/* Tip card */}
        <Card tone="surface1" style={styles.tipCard}>
          <View style={[styles.tipIcon, { backgroundColor: tipBg(verdict, tk) }]}>
            <Icon name={tipIconName(verdict)} size={20} color={tipFg(verdict, tk)}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: tk.onSurface }]}>{tipTitle(verdict)}</Text>
            <Text style={[styles.tipBody, { color: tk.onSurfaceVar }]}>{tipBody(verdict, windKmh)}</Text>
          </View>
        </Card>

        {/* Start run + check buttons */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.startBtn, { backgroundColor: tk.accent }]}
            onPress={() => navigation.navigate('RunReady', { scheduleId: nextRun?.schedule.id })}
          >
            <Icon name="play" size={20} color={tk.onAccent}/>
            <Text style={[styles.startBtnText, { color: tk.onAccent }]}>Start run</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.checkBtn, { borderColor: tk.outlineStrong }]}
            onPress={handleCheckNow}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color={tk.accent} size="small"/>
              : <Text style={[styles.checkBtnText, { color: tk.onSurface }]}>Check now</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FAB label="Schedule" onPress={() => navigation.navigate('AddEditSchedule', {})}/>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const tk = useTokens();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name={icon} size={13} color={tk.onSurfaceVar}/>
        <Text style={{ color: tk.onSurfaceVar, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </View>
      <Text style={{ color: tk.onSurface, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function nextRunLabel(runTimeMs: number, now: Date = new Date()): string {
  const run = new Date(runTimeMs);
  if (run.toDateString() === now.toDateString()) return "Today's run";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (run.toDateString() === tomorrow.toDateString()) return "Tomorrow's run";
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[run.getDay()]}'s run`;
}

function tipTitle(v: WeatherVerdict): string {
  return {
    GOOD: 'All four hours look great',
    MARGINAL: 'Watch the sky',
    BAD: 'Best to rest today',
    UNKNOWN: 'Weather not configured',
  }[v];
}

function tipBody(v: WeatherVerdict, windKmh: number | null): string {
  const wind = windKmh != null ? `wind under ${windKmh + 1} km/h` : 'light winds';
  return {
    GOOD: `No rain, ${wind}. We'll ping you 30 min before your window opens.`,
    MARGINAL: 'Some chance of rain. Pack light layers and a cap, just in case.',
    BAD: 'Rough conditions for the next 4 hours. Try indoor cross-training.',
    UNKNOWN: 'Set your home location and WeatherAPI key in Settings to get forecasts.',
  }[v];
}

function tipBg(v: WeatherVerdict, tk: ReturnType<typeof useTokens>): string {
  return v === 'GOOD' ? tk.goSoft : v === 'MARGINAL' ? tk.waitSoft : v === 'BAD' ? tk.skipSoft : tk.surface2;
}

function tipFg(v: WeatherVerdict, tk: ReturnType<typeof useTokens>): string {
  return v === 'GOOD' ? tk.go : v === 'MARGINAL' ? tk.wait : v === 'BAD' ? tk.skip : tk.onSurfaceVar;
}

function tipIconName(v: WeatherVerdict): IconName {
  return v === 'GOOD' ? 'check' : v === 'MARGINAL' ? 'history' : v === 'BAD' ? 'rain' : 'bell';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },
  greeting: { fontSize: 14, fontWeight: '500', letterSpacing: 0.2 },
  countdown: { fontSize: 28, fontWeight: '700', lineHeight: 32, letterSpacing: -0.6, marginTop: 2 },
  hero: { borderRadius: 24, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  heroTemp: { fontSize: 60, fontWeight: '700', letterSpacing: -2 },
  heroCondition: { fontSize: 15, fontWeight: '600' },
  heroSub: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14,
    borderTopWidth: 1,
  },
  runRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 6, padding: 12, borderRadius: 18,
  },
  runIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  runTitle: { fontSize: 15, fontWeight: '600' },
  runSub: { fontSize: 13, marginTop: 2 },
  tipCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  tipIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '600' },
  tipBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  startBtn: {
    flex: 1.4, height: 48, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  startBtnText: { fontSize: 14, fontWeight: '700' },
  checkBtn: {
    flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBtnText: { fontSize: 14, fontWeight: '600' },
});

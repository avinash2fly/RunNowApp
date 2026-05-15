import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { getEnabledSchedules } from '../services/database';
import { fetchWeatherForecast, weatherConditionToIcon } from '../services/weather';
import { Icon, IconName } from '../components/Icon';
import { Card } from '../components/Card';
import { TopBar } from '../components/TopBar';
import { nextRun as computeNextRun } from '../utils/scheduling';
import { requestLocationPermission, getCurrentPosition } from '../utils/location';
import { RunSchedule, WeatherVerdict } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'RunReady'>;
type RouteType = RouteProp<RootStackParamList, 'RunReady'>;

export default function RunReadyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const tk = useTokens();
  const { prefs } = usePreferences();

  const [schedule, setSchedule] = useState<RunSchedule | null>(null);
  const [tempC, setTempC] = useState<number | null>(null);
  const [wind, setWind] = useState<number | null>(null);
  const [chanceRain, setChanceRain] = useState<number | null>(null);
  const [conditionCode, setConditionCode] = useState<number | undefined>(undefined);
  const [verdict, setVerdict] = useState<WeatherVerdict>('UNKNOWN');
  const [gpsLocked, setGpsLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const enabled = await getEnabledSchedules();
      const next = computeNextRun(enabled);
      if (route.params?.scheduleId) {
        setSchedule(enabled.find(s => s.id === route.params!.scheduleId) ?? next?.schedule ?? null);
      } else {
        setSchedule(next?.schedule ?? null);
      }
    })();
  }, [route.params?.scheduleId]);

  useEffect(() => {
    if (prefs.homeLat == null || prefs.homeLon == null || !prefs.weatherApiKey) return;
    fetchWeatherForecast(prefs.homeLat, prefs.homeLon, prefs.weatherApiKey, prefs.windThresholdKmh)
      .then(r => {
        setTempC(r.currentTemp);
        setWind(r.hourly[0]?.wind_kph ?? null);
        setChanceRain(r.hourly[0]?.chance_of_rain ?? null);
        setConditionCode(r.hourly[0]?.condition?.code);
        setVerdict(r.verdict);
      })
      .catch(() => {});
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted || cancelled) return;
      const pos = await getCurrentPosition();
      if (!cancelled && pos) setGpsLocked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const tempDisplay = tempC != null ? `${Math.round(tempC)}°` : '--';
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (wind != null) parts.push(`${Math.round(wind)} km/h`);
    if (chanceRain != null) parts.push(`${chanceRain}% rain`);
    return parts.join(' · ') || 'Weather not configured';
  }, [wind, chanceRain]);

  const conditionIcon = weatherConditionToIcon(conditionCode);
  const verdictText = verdict === 'GOOD' ? tk.go : verdict === 'BAD' ? tk.skip : tk.wait;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar leading="close" onLead={() => navigation.goBack()}/>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: tk.accent }]}>READY TO RUN?</Text>
          <Text style={[styles.title, { color: tk.onSurface }]}>
            {schedule ? labelFor(schedule) : 'Freestyle run'}
            {'\n'}
            <Text style={{ color: tk.accent }}>
              {schedule ? `${schedule.distanceKm}K ${schedule.runType.toLowerCase()}` : 'Just go'}
            </Text>
          </Text>
        </View>

        {/* GPS lock visual */}
        <View style={[styles.gpsHalo, { backgroundColor: tk.accentSoft }]}>
          <View style={[styles.gpsRing, { borderColor: tk.accent }]}/>
          <View style={[styles.gpsCore, { backgroundColor: tk.accent }]}>
            <Icon name="run" size={48} color={tk.onAccent}/>
          </View>
          <View style={[styles.gpsBadge, {
            backgroundColor: gpsLocked ? tk.goSoft : tk.surface2,
          }]}>
            {!gpsLocked && <ActivityIndicator color={tk.onSurfaceVar} size="small" style={{ marginRight: 4 }}/>}
            {gpsLocked && <View style={[styles.gpsDot, { backgroundColor: tk.go }]}/>}
            <Text style={{
              color: gpsLocked ? tk.go : tk.onSurfaceVar,
              fontSize: 10, fontWeight: '700', letterSpacing: 0.5,
            }}>
              {gpsLocked ? 'GPS LOCKED' : 'ACQUIRING…'}
            </Text>
          </View>
        </View>

        {/* Conditions */}
        <Card tone="surface1" style={{ marginTop: 8 }}>
          <Text style={[styles.eyebrowSmall, { color: tk.onSurfaceVar }]}>
            {verdict === 'GOOD' ? 'NOW · PERFECT WINDOW' :
             verdict === 'MARGINAL' ? 'NOW · MARGINAL' :
             verdict === 'BAD' ? 'NOW · ROUGH OUT THERE' :
             'NOW · WEATHER UNKNOWN'}
          </Text>
          <View style={styles.condRow}>
            <Icon name={conditionIcon} size={32} color={verdictText}/>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={[styles.condTemp, { color: tk.onSurface }]}>{tempDisplay}</Text>
                <Text style={{ color: tk.onSurfaceVar, fontSize: 13 }}>{summary}</Text>
              </View>
              <Text style={{ color: verdictText, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                {verdict === 'GOOD' ? 'Looks great for the next few hours' :
                 verdict === 'MARGINAL' ? 'Could turn — keep an eye on the sky' :
                 verdict === 'BAD' ? 'Consider rescheduling' :
                 'Set up weather in Settings'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Checklist */}
        <View style={{ gap: 8, marginTop: 10 }}>
          <CheckItem icon="location" label={prefs.homeCity || 'Riverside Loop'} on/>
          <CheckItem
            icon="music"
            label={prefs.spotifyConnected ? 'Easy Pace playlist · Spotify' : 'Spotify not connected'}
            on={prefs.spotifyConnected}
          />
          <CheckItem icon="bell" label="Auto-pause when stopped" on/>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: tk.surface }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.replace('RunActive', { scheduleId: schedule?.id })}
          style={[styles.startBtn, { backgroundColor: tk.accent, shadowColor: tk.accent }]}
        >
          <Icon name="play" size={22} color={tk.onAccent}/>
          <Text style={[styles.startBtnText, { color: tk.onAccent }]}>START RUN</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: tk.onSurfaceVar }]}>
          Hold to start a freestyle run instead
        </Text>
      </View>
    </SafeAreaView>
  );
}

function CheckItem({ icon, label, on }: { icon: IconName; label: string; on: boolean }) {
  const tk = useTokens();
  return (
    <View style={[styles.check, { backgroundColor: tk.surface1 }]}>
      <View style={[styles.checkIcon, { backgroundColor: tk.surface2 }]}>
        <Icon name={icon} size={16} color={tk.onSurface}/>
      </View>
      <Text style={{ flex: 1, color: tk.onSurface, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      {on
        ? (
          <View style={[styles.checkDone, { backgroundColor: tk.go }]}>
            <Icon name="check" size={14} color="#fff"/>
          </View>
        )
        : (
          <View style={[styles.checkDone, { backgroundColor: tk.surface3 }]}/>
        )}
    </View>
  );
}

function labelFor(s: RunSchedule): string {
  const ampm = s.hour < 12 ? 'AM' : 'PM';
  const h = s.hour % 12 || 12;
  if (s.hour < 12) return `Morning run · ${h}:${String(s.minute).padStart(2, '0')} ${ampm}`;
  if (s.hour < 17) return `Afternoon run · ${h}:${String(s.minute).padStart(2, '0')} ${ampm}`;
  return `Evening run · ${h}:${String(s.minute).padStart(2, '0')} ${ampm}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 4 },
  heading: { alignItems: 'center', paddingVertical: 8 },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  eyebrowSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 6, lineHeight: 32, textAlign: 'center' },
  gpsHalo: {
    alignSelf: 'center', width: 200, height: 200, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center', marginVertical: 8,
  },
  gpsRing: {
    position: 'absolute', top: 30, left: 30, right: 30, bottom: 30,
    borderRadius: 70, borderWidth: 2, borderStyle: 'dashed', opacity: 0.45,
  },
  gpsCore: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  gpsBadge: {
    position: 'absolute', bottom: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  condTemp: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  check: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, paddingHorizontal: 14, borderRadius: 14,
  },
  checkIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkDone: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    gap: 8,
  },
  startBtn: {
    height: 64, borderRadius: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 8,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  hint: { fontSize: 12, textAlign: 'center' },
});

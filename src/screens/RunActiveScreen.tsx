import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { getScheduleById, insertHistoryEntry } from '../services/database';
import { hexMix } from '../theme';
import { Icon } from '../components/Icon';
import { startTracking, TrackPoint, haversineMeters } from '../utils/location';
import { RunSchedule } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList, 'RunActive'>;
type RouteType = RouteProp<RootStackParamList, 'RunActive'>;

const TICK_MS = 1000;

export default function RunActiveScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const tk = useTokens();
  const { prefs } = usePreferences();

  const startRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef<number>(0);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [locked, setLocked] = useState(false);
  const [schedule, setSchedule] = useState<RunSchedule | null>(null);
  const [paceHistory, setPaceHistory] = useState<number[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [satellites, setSatellites] = useState(0);

  const pointsRef = useRef<TrackPoint[]>([]);
  const lastAcceptedRef = useRef<TrackPoint | null>(null);
  const paceWindowRef = useRef<{ distM: number; time: number }[]>([]);

  useEffect(() => {
    const id = route.params?.scheduleId;
    if (id != null) {
      getScheduleById(id).then(s => setSchedule(s));
    }
  }, [route.params?.scheduleId]);

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedAtRef.current != null) return;
      const now = Date.now();
      const elapsed = Math.floor((now - startRef.current - pausedTotalRef.current) / 1000);
      setElapsedSec(elapsed);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Real GPS tracking
  useEffect(() => {
    const tracker = startTracking((point) => {
      if (pausedAtRef.current != null) return;

      // Filter poor accuracy
      if (point.accuracy != null && point.accuracy > 20) return;

      const prev = lastAcceptedRef.current;
      if (prev) {
        const seg = haversineMeters(prev.latitude, prev.longitude, point.latitude, point.longitude);
        if (seg < 2) return; // jitter filter
        setDistanceM(d => d + seg);

        // Pace sample: min/km for this segment
        const dtSec = (point.timestamp - prev.timestamp) / 1000;
        if (dtSec > 0 && seg > 0) {
          const paceMinKm = (dtSec / 60) / (seg / 1000);
          if (paceMinKm > 2 && paceMinKm < 15) {
            paceWindowRef.current = [...paceWindowRef.current.slice(-23), { distM: seg, time: dtSec }];
            // Rolling average over window
            const w = paceWindowRef.current;
            const totalD = w.reduce((a, s) => a + s.distM, 0);
            const totalT = w.reduce((a, s) => a + s.time, 0);
            const avgPace = totalD > 0 ? (totalT / 60) / (totalD / 1000) : 5.2;
            setPaceHistory(prev => [...prev.slice(-23), avgPace]);
          }
        }
      }
      lastAcceptedRef.current = point;
      pointsRef.current.push(point);
      setSatellites(Math.min(12, pointsRef.current.length > 3 ? Math.floor((point.accuracy ?? 10) < 8 ? 10 : 6) : 4));
    });

    return () => tracker.stop();
  }, []);

  const togglePause = () => {
    if (paused) {
      // resume
      if (pausedAtRef.current != null) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      setPaused(false);
    } else {
      pausedAtRef.current = Date.now();
      setPaused(true);
    }
  };

  const finish = () => {
    if (locked) return;
    Alert.alert('Finish run?', 'This will log the run to your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish', style: 'default', onPress: async () => {
          try {
            await insertHistoryEntry({
              scheduleId: schedule?.id ?? 0,
              date: new Date().toISOString(),
              distanceKm: distanceKm > 0.01 ? Math.round(distanceKm * 100) / 100 : schedule?.distanceKm ?? 0,
              durationSec: elapsedSec,
              verdict: 'GOOD',
              completed: true,
            });
          } catch {}
          navigation.popToTop();
        },
      },
    ]);
  };

  const distanceKm = distanceM / 1000;
  const avgPaceMin = elapsedSec > 0 && distanceKm > 0.01 ? elapsedSec / 60 / distanceKm : 0;
  const paceStr = avgPaceMin > 0 ? formatPace(avgPaceMin) : '—';
  const timer = formatTime(elapsedSec);

  const bgGradient = useMemo(() => ({
    start: tk.accent,
    end: hexMix(tk.accent, '#000000', 0.65),
  }), [tk.accent]);

  // Build pace polyline points (0-100 x, 0-100 y in viewBox)
  const polyPts = useMemo(() => {
    if (paceHistory.length < 2) return '';
    const minP = Math.min(...paceHistory) - 0.2;
    const maxP = Math.max(...paceHistory) + 0.2;
    const range = Math.max(0.4, maxP - minP);
    return paceHistory.map((p, i) => {
      const x = (i / Math.max(1, paceHistory.length - 1)) * 100;
      const y = ((p - minP) / range) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }, [paceHistory]);

  return (
    <View style={[styles.root, { backgroundColor: bgGradient.start }]}>
      <StatusBar barStyle="light-content"/>
      {/* Layered gradient via two overlapping views */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bgGradient.end, opacity: 0.55 }]}/>
      <View style={[styles.glow, { backgroundColor: tk.accent, opacity: 0.4 }]}/>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => navigation.popToTop()}
            disabled={locked}
          >
            <Icon name="chevronL" size={20} color="#fff"/>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.eyebrow}>
              {schedule
                ? `${runLabel(schedule.hour).toUpperCase()} · ${schedule.distanceKm}K ${schedule.runType.toUpperCase()}`
                : 'FREESTYLE RUN'}
            </Text>
            <Text style={styles.subEyebrow}>
              {(prefs.homeCity || 'Riverside Loop')} · {paused ? 'paused' : 'tracking'}
            </Text>
          </View>
          <TouchableOpacity style={styles.glassBtn} disabled={locked}>
            <Icon name="music" size={18} color="#fff"/>
          </TouchableOpacity>
        </View>

        {/* Big timer */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingHorizontal: 24 }}>
          <Text style={styles.eyebrowLg}>TIME</Text>
          <Text style={styles.timer}>{timer}</Text>
          <View style={styles.trackingPill}>
            <View style={[styles.trackingDot, { backgroundColor: paused ? '#FFC371' : '#7FE08C' }]}/>
            <Text style={styles.trackingText}>
              {paused ? 'PAUSED' : `TRACKING · ${satellites} SATELLITES`}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatTile label="DISTANCE" value={distanceKm.toFixed(2)} unit="km"/>
          <StatTile label="PACE" value={paceStr} unit="/km"/>
          <StatTile label="ELAPSED" value={timer} unit=""/>
        </View>

        {/* Pace chart */}
        <View style={styles.paceCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={styles.paceLabel}>PACE · LAST {Math.min(12, paceHistory.length)} MIN</Text>
            <Text style={styles.paceAvg}>AVG {paceStr}</Text>
          </View>
          <Svg width="100%" height={90} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ marginTop: 8 }}>
            <Defs>
              <LinearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#fff" stopOpacity={0.3}/>
                <Stop offset="100%" stopColor="#fff" stopOpacity={0}/>
              </LinearGradient>
            </Defs>
            {polyPts.length > 0 && (
              <>
                <Polyline points={`0,100 ${polyPts} 100,100`} fill="url(#paceFill)" stroke="none"/>
                <Polyline points={polyPts} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
              </>
            )}
            <Line x1="0" y1="50" x2="100" y2="50" stroke="#fff" strokeWidth={0.6} strokeDasharray="2 2" opacity={0.35} vectorEffect="non-scaling-stroke"/>
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={styles.paceX}>0 km</Text>
            <Text style={styles.paceX}>{(distanceKm / 3).toFixed(1)}</Text>
            <Text style={styles.paceX}>{((distanceKm * 2) / 3).toFixed(1)}</Text>
            <Text style={styles.paceX}>{distanceKm.toFixed(1)} km</Text>
          </View>
        </View>

        <View style={{ flex: 1 }}/>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setLocked(l => !l)}
          >
            <Icon name="lock" size={22} color="#fff"/>
            {locked && <View style={styles.lockIndicator}/>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { borderColor: 'rgba(255,255,255,0.3)' }]}
            activeOpacity={0.85}
            onPress={togglePause}
            disabled={locked}
          >
            <Icon name={paused ? 'play' : 'pause'} size={32} color={tk.accent}/>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideBtn}
            onPress={finish}
            onLongPress={finish}
            disabled={locked}
          >
            <Icon name="stop" size={22} color="#fff"/>
          </TouchableOpacity>
        </View>

        {locked && (
          <Text style={styles.lockedHint}>Screen locked — tap lock again to unlock</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
  if (!isFinite(minPerKm) || minPerKm > 30) return '—';
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function runLabel(hour: number): string {
  if (hour < 12) return 'Morning run';
  if (hour < 17) return 'Afternoon run';
  return 'Evening run';
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  glow: {
    position: 'absolute', top: -80, left: -40, width: 280, height: 280, borderRadius: 140,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
  },
  glassBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.4, opacity: 0.85 },
  subEyebrow: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.9, marginTop: 1 },
  eyebrowLg: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7 },
  timer: { color: '#fff', fontSize: 84, fontWeight: '300', letterSpacing: -3, marginTop: 4 },
  trackingPill: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  trackingDot: { width: 6, height: 6, borderRadius: 3 },
  trackingText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 24 },
  statTile: {
    flex: 1, borderRadius: 18, padding: 12,
    alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1, opacity: 0.7 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  statUnit: { color: '#fff', fontSize: 10, opacity: 0.7 },
  paceCard: {
    marginHorizontal: 16, padding: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  paceLabel: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, opacity: 0.75 },
  paceAvg: { color: '#fff', fontSize: 11, fontWeight: '700', opacity: 0.85 },
  paceX: { color: '#fff', fontSize: 9, opacity: 0.6 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  sideBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 6,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 12,
  },
  lockIndicator: {
    position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFC371',
  },
  lockedHint: {
    color: '#fff', fontSize: 11, textAlign: 'center', opacity: 0.7, paddingBottom: 8,
  },
});

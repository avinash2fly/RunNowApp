import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import {
  getHistory, getMonthlyStats, setHistoryCompleted, deleteHistoryEntry, getCompletedDates,
} from '../services/database';
import { distanceFromKm, formatDistance } from '../utils/units';
import { VerdictChip } from '../components/VerdictChip';
import { Card } from '../components/Card';
import { Icon, IconName } from '../components/Icon';
import { TopBar } from '../components/TopBar';
import { SectionTitle } from '../components/SectionTitle';
import { RunHistoryEntry, WeatherVerdict } from '../types';
import { calculateStreak } from '../utils/scheduling';
import { hexMix } from '../theme';

const VERDICT_ICON: Record<WeatherVerdict, IconName> = {
  GOOD: 'sun', MARGINAL: 'cloudSun', BAD: 'rain', UNKNOWN: 'cloud',
};

const PERIODS = ['Week', 'Month', 'Year', 'All'] as const;
type Period = typeof PERIODS[number];

export default function HistoryScreen() {
  const tk = useTokens();
  const { prefs } = usePreferences();
  const unitDist = prefs.unitDistance;
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [monthStats, setMonthStats] = useState({ totalKm: 0, totalRuns: 0, completedRuns: 0 });
  const [streak, setStreak] = useState(0);
  const [period, setPeriod] = useState<Period>('Month');

  const reload = useCallback(async () => {
    const [h, s, completed] = await Promise.all([
      getHistory(500), getMonthlyStats(), getCompletedDates(120),
    ]);
    setHistory(h);
    setMonthStats(s);
    setStreak(calculateStreak(completed));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const handleToggleComplete = async (entry: RunHistoryEntry) => {
    const next = !entry.completed;
    setHistory(prev => prev.map(e => e.id === entry.id ? { ...e, completed: next } : e));
    try {
      await setHistoryCompleted(entry.id, next);
      reload();
    } catch {
      setHistory(prev => prev.map(e => e.id === entry.id ? { ...e, completed: entry.completed } : e));
      Alert.alert('Error', 'Could not update entry.');
    }
  };

  const handleDelete = (entry: RunHistoryEntry) => {
    Alert.alert('Delete entry?', 'This run will be removed from history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteHistoryEntry(entry.id);
          reload();
        },
      },
    ]);
  };

  // Period filtering — drives the stats hero, breakdown, and recent list.
  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === 'Week') {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === 'Month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'Year') return new Date(now.getFullYear(), 0, 1);
    return null; // All
  }, [period]);

  const filtered = useMemo(
    () => (periodStart ? history.filter(h => new Date(h.date) >= periodStart) : history),
    [history, periodStart]
  );

  const stats = useMemo(() => {
    const completed = filtered.filter(h => h.completed);
    return {
      totalKm: completed.reduce((a, h) => a + h.distanceKm, 0),
      totalRuns: filtered.length,
      completedRuns: completed.length,
    };
  }, [filtered]);

  const periodLabel = {
    Week: 'THIS WEEK', Month: 'THIS MONTH', Year: 'THIS YEAR', All: 'ALL TIME',
  }[period];

  const hitRate = stats.totalRuns > 0
    ? Math.round((stats.completedRuns / stats.totalRuns) * 100)
    : 0;

  // 8-week distance trend (for the bar chart)
  const weeklyKm = useMemo(() => {
    const now = new Date();
    const buckets = Array(8).fill(0);
    for (const h of history) {
      if (!h.completed) continue;
      const d = new Date(h.date);
      const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += h.distanceKm;
    }
    return buckets;
  }, [history]);

  const maxKm = Math.max(...weeklyKm, 1);
  const avgKm = weeklyKm.reduce((a, b) => a + b, 0) / 8;

  // Conditions breakdown (GO/WAIT/SKIP counts)
  const breakdown = useMemo(() => {
    const counts = { GOOD: 0, MARGINAL: 0, BAD: 0 };
    for (const h of filtered) {
      if (h.verdict in counts) (counts as any)[h.verdict] += 1;
    }
    const total = counts.GOOD + counts.MARGINAL + counts.BAD || 1;
    return {
      good: Math.round((counts.GOOD / total) * 100),
      wait: Math.round((counts.MARGINAL / total) * 100),
      skip: Math.round((counts.BAD / total) * 100),
    };
  }, [filtered]);

  // 16-week × 7-day heatmap
  const heatmap = useMemo(() => {
    const now = new Date();
    const grid: number[][] = Array.from({ length: 16 }, () => Array(7).fill(0));
    for (const h of history) {
      if (!h.completed) continue;
      const d = new Date(h.date);
      const daysAgo = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      const weeksAgo = Math.floor(daysAgo / 7);
      const dow = d.getDay();
      if (weeksAgo >= 0 && weeksAgo < 16) {
        grid[15 - weeksAgo][dow] = Math.min(4, grid[15 - weeksAgo][dow] + 1);
      }
    }
    return grid;
  }, [history]);

  const heatShades = useMemo(() => [
    tk.surface3,
    tk.accentSoft,
    hexMix(tk.accent, '#FFFFFF', 0.4),
    hexMix(tk.accent, '#FFFFFF', 0.15),
    tk.accent,
  ], [tk]);

  // Personal bests (max distance per bucket where completed)
  const bests = useMemo(() => {
    const bucket = (km: number) => km >= 9.5 ? '10K' : km >= 4.5 ? '5K' : '1K';
    const map: Record<string, RunHistoryEntry | null> = { '1K': null, '5K': null, '10K': null };
    for (const h of history) {
      if (!h.completed || h.durationSec <= 0) continue;
      const b = bucket(h.distanceKm);
      const fastest = map[b];
      if (!fastest || h.durationSec < fastest.durationSec) map[b] = h;
    }
    return map;
  }, [history]);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const shortDate = (iso: string) => {
    const d = new Date(iso);
    return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  };

  const longDate = (iso: string) => {
    const d = new Date(iso);
    return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  };

  const formatTime = (sec: number) => {
    if (!sec) return '--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const monthlyGoalKm = 60;
  const goalPct = Math.min(100, Math.round((monthStats.totalKm / monthlyGoalKm) * 100));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar title="History" trailing="settings"/>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Period switcher */}
        <View style={[styles.periodBar, { backgroundColor: tk.surface2 }]}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodPill, period === p && { backgroundColor: tk.surface }]}
            >
              <Text style={[styles.periodText, {
                color: period === p ? tk.onSurface : tk.onSurfaceVar,
                fontWeight: period === p ? '700' : '500',
              }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats hero */}
        <Card tone="surface1" style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.statsHeader, { color: tk.onSurfaceVar }]}>{periodLabel}</Text>
            {stats.completedRuns > 0 && (
              <View style={[styles.trendChip, { backgroundColor: tk.goSoft }]}>
                <Text style={{ color: tk.go, fontSize: 11, fontWeight: '700' }}>↑ ON TRACK</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 12, alignItems: 'baseline' }}>
            <Metric value={String(Math.round(distanceFromKm(stats.totalKm, unitDist)))} unit={unitDist} label="Distance" color={tk.onSurface}/>
            <Metric value={String(stats.totalRuns)} label="Runs" color={tk.onSurface}/>
            <Metric value={`${hitRate}`} unit="%" label="Hit rate" color={tk.accent}/>
          </View>

          {/* Bar chart */}
          <View style={{ height: 110, marginTop: 18 }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: '40%', borderTopWidth: 1.5, borderColor: tk.outlineStrong, borderStyle: 'dashed' }}/>
            <View style={{ position: 'absolute', right: 0, top: '32%' }}>
              <Text style={[styles.avgLabel, { color: tk.onSurfaceVar, backgroundColor: tk.surface1 }]}>
                AVG {Math.round(distanceFromKm(avgKm, unitDist))}{unitDist}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: '100%' }}>
              {weeklyKm.map((w, i) => {
                const h = (w / maxKm) * 80;
                const isLast = i === weeklyKm.length - 1;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    {isLast && w > 0 && (
                      <Text style={{ color: tk.accent, fontSize: 10, fontWeight: '700' }}>
                        {Math.round(distanceFromKm(w, unitDist))}{unitDist}
                      </Text>
                    )}
                    <View style={{
                      width: '100%', height: `${h}%`, minHeight: 4,
                      backgroundColor: isLast ? tk.accent : tk.surface3,
                      borderRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                    }}/>
                    <Text style={{ color: isLast ? tk.onSurface : tk.onSurfaceVar, fontSize: 10, fontWeight: '600' }}>
                      W{i + 1}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Personal bests */}
        {(bests['1K'] || bests['5K'] || bests['10K']) && (
          <>
            <SectionTitle title="Personal bests"/>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['1K', '5K', '10K'] as const).map(dist => {
                const pb = bests[dist];
                return (
                  <View key={dist} style={[styles.pbCard, { backgroundColor: tk.surface1 }]}>
                    <Text style={{ color: tk.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{dist}</Text>
                    <Text style={{ color: tk.onSurface, fontSize: 20, fontWeight: '700', marginTop: 4, letterSpacing: -0.4 }}>
                      {pb ? formatTime(pb.durationSec) : '--'}
                    </Text>
                    <Text style={{ color: tk.onSurfaceVar, fontSize: 10, marginTop: 2 }}>
                      {pb ? shortDate(pb.date) : 'No data'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Streak callout */}
        {streak > 0 && (
          <Card tone="accent" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
            <View style={[styles.streakIcon, { backgroundColor: tk.accent }]}>
              <Icon name="flame" size={26} color={tk.onAccent}/>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ color: tk.onSurface, fontSize: 22, fontWeight: '700' }}>{streak}</Text>
                <Text style={{ color: tk.onSurface, fontSize: 14, fontWeight: '600' }}>day streak 🔥</Text>
              </View>
              <Text style={{ color: tk.onAccentSoft, fontSize: 12, marginTop: 2 }}>
                Keep showing up.
              </Text>
            </View>
          </Card>
        )}

        {/* Activity heatmap */}
        <SectionTitle title="Activity" trailing="16 weeks"/>
        <Card tone="surface1">
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {heatmap.map((week, i) => (
              <View key={i} style={{ flex: 1, gap: 3 }}>
                {week.map((d, j) => (
                  <View key={j} style={{
                    aspectRatio: 1, borderRadius: 3, backgroundColor: heatShades[d],
                  }}/>
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 10 }}>16w ago</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: tk.onSurfaceVar, fontSize: 10 }}>Less</Text>
              {heatShades.map((c, i) => (
                <View key={i} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }}/>
              ))}
              <Text style={{ color: tk.onSurfaceVar, fontSize: 10 }}>More</Text>
            </View>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 10 }}>Today</Text>
          </View>
        </Card>

        {/* Conditions breakdown */}
        {(breakdown.good + breakdown.wait + breakdown.skip) > 0 && (
          <>
            <SectionTitle title="When you actually ran"/>
            <Card tone="surface1">
              <View style={{ flexDirection: 'row', height: 36, borderRadius: 10, overflow: 'hidden', gap: 4 }}>
                {breakdown.good > 0 && (
                  <View style={{ flex: breakdown.good, backgroundColor: tk.go, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{breakdown.good}%</Text>
                  </View>
                )}
                {breakdown.wait > 0 && (
                  <View style={{ flex: breakdown.wait, backgroundColor: tk.wait, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{breakdown.wait}%</Text>
                  </View>
                )}
                {breakdown.skip > 0 && (
                  <View style={{ flex: breakdown.skip, backgroundColor: tk.skip, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{breakdown.skip}%</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <LegendDot color={tk.go} label="Good"/>
                <LegendDot color={tk.wait} label="Marginal"/>
                <LegendDot color={tk.skip} label="Bad"/>
              </View>
            </Card>
          </>
        )}

        {/* Monthly goal */}
        <SectionTitle title={`${MONTHS[new Date().getMonth()]} goal`}/>
        <Card tone="surface1">
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ color: tk.onSurface, fontSize: 15, fontWeight: '600' }}>Distance</Text>
            <Text style={{ color: tk.onSurface, fontSize: 13, fontWeight: '700' }}>
              <Text style={{ color: tk.accent }}>{Math.round(distanceFromKm(monthStats.totalKm, unitDist))}</Text> / {Math.round(distanceFromKm(monthlyGoalKm, unitDist))} {unitDist}
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: tk.surface3, marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${goalPct}%`, height: '100%', backgroundColor: tk.accent }}/>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 11 }}>{goalPct}% complete</Text>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 11 }}>
              {Math.max(0, Math.round(distanceFromKm(monthlyGoalKm - monthStats.totalKm, unitDist)))} {unitDist} to go
            </Text>
          </View>
        </Card>

        {/* Recent runs */}
        {filtered.length > 0 && (
          <>
            <SectionTitle title="Recent runs"/>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 11, marginTop: -8, marginLeft: 4 }}>
              Tap to mark done · long-press to delete
            </Text>
            <View>
              {filtered.slice(0, 8).map((h, i, arr) => (
                <TouchableOpacity
                  key={h.id}
                  activeOpacity={0.8}
                  onPress={() => handleToggleComplete(h)}
                  onLongPress={() => handleDelete(h)}
                  style={[styles.runRow, {
                    borderBottomColor: tk.outline,
                    borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                  }]}
                >
                  <View style={[styles.runCondIcon, { backgroundColor: tk.surface2 }]}>
                    <Icon
                      name={VERDICT_ICON[h.verdict as WeatherVerdict] ?? 'cloud'}
                      size={22}
                      color={h.verdict === 'GOOD' ? tk.go : h.verdict === 'BAD' ? tk.skip : tk.wait}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: tk.onSurface, fontSize: 14, fontWeight: '600' }}>
                      {formatDistance(h.distanceKm, unitDist)} {h.durationSec > 0 ? `· ${formatTime(h.durationSec)}` : ''}
                    </Text>
                    <Text style={{ color: tk.onSurfaceVar, fontSize: 12, marginTop: 1 }}>
                      {longDate(h.date)}
                    </Text>
                  </View>
                  <View style={[styles.doneBadge, {
                    backgroundColor: h.completed ? tk.goSoft : tk.surface2,
                  }]}>
                    <Text style={{
                      color: h.completed ? tk.onGoSoft : tk.onSurfaceVar,
                      fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
                    }}>
                      {h.completed ? '✓ DONE' : 'PENDING'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
            <Icon name="chart" size={48} color={tk.onSurfaceVar}/>
            <Text style={{ color: tk.onSurface, fontSize: 18, fontWeight: '700' }}>No runs logged yet</Text>
            <Text style={{ color: tk.onSurfaceVar, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
              Your history will appear here once notifications fire.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, unit, label, color }: { value: string; unit?: string; label: string; color: string }) {
  const tk = useTokens();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ color, fontSize: 32, fontWeight: '700', letterSpacing: -0.8 }}>{value}</Text>
        {unit && <Text style={{ color: tk.onSurfaceVar, fontSize: 16, marginLeft: 2 }}>{unit}</Text>}
      </View>
      <Text style={{ color: tk.onSurfaceVar, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const tk = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }}/>
      <Text style={{ color: tk.onSurfaceVar, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 60, gap: 10 },
  periodBar: { flexDirection: 'row', borderRadius: 14, padding: 3, gap: 3, marginBottom: 4 },
  periodPill: { flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center' },
  periodText: { fontSize: 13 },
  statsHeader: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  trendChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  avgLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, paddingHorizontal: 4 },
  pbCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center' },
  streakIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  runRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  runCondIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});

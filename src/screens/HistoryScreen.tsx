import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { getHistory, getMonthlyStats } from '../services/database';
import { VerdictChip } from '../components/VerdictChip';
import { WeatherIcon } from '../components/WeatherIcon';
import { Card } from '../components/Card';
import { RunHistoryEntry, WeatherVerdict } from '../types';

const VERDICT_ICON: Record<WeatherVerdict, string> = {
  GOOD: '☀️', MARGINAL: '⛅', BAD: '⛈️', UNKNOWN: '❓',
};

export default function HistoryScreen() {
  const { prefs } = usePreferences();
  const accent = prefs.accentColor ?? Colors.accent;
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [stats, setStats] = useState({ totalKm: 0, totalRuns: 0, completedRuns: 0 });

  useFocusEffect(
    useCallback(() => {
      Promise.all([getHistory(20), getMonthlyStats()]).then(([h, s]) => {
        setHistory(h);
        setStats(s);
      });
    }, [])
  );

  const hitRate = stats.totalRuns > 0
    ? Math.round((stats.completedRuns / stats.totalRuns) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>History</Text>

        {/* Stats card */}
        <Card tone="surface1" style={styles.statsCard}>
          <Text style={styles.statsHeader}>This month</Text>
          <View style={styles.metricsRow}>
            <Metric label="Distance" value={`${Math.round(stats.totalKm)} km`} accent={accent} highlighted={false} />
            <Metric label="Runs" value={String(stats.totalRuns)} accent={accent} highlighted={false} />
            <Metric label="Hit rate" value={`${hitRate}%`} accent={accent} highlighted />
          </View>
        </Card>

        {/* Streak */}
        {stats.completedRuns >= 4 && (
          <Card tone="accent" style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <View>
                <Text style={[styles.streakTitle, { color: Colors.onAccentSoft }]}>
                  {stats.completedRuns}-run streak
                </Text>
                <Text style={[styles.streakSub, { color: Colors.onAccentSoft }]}>
                  Keep it going!
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Recent runs */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECENT RUNS</Text>
            {history.map(entry => (
              <HistoryRow key={entry.id} entry={entry} accent={accent} />
            ))}
          </View>
        )}

        {history.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyText}>No runs logged yet</Text>
            <Text style={styles.emptyHint}>Your history will appear here once notifications fire</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent, highlighted }: {
  label: string; value: string; accent: string; highlighted: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, highlighted && { color: accent }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HistoryRow({ entry, accent }: { entry: RunHistoryEntry; accent: string }) {
  const icon = VERDICT_ICON[entry.verdict as WeatherVerdict] ?? '❓';
  const d = new Date(entry.date);
  const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.historyRow}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.historyDist}>{entry.distanceKm} km</Text>
        <Text style={styles.historyDate}>{dateStr}</Text>
      </View>
      {entry.completed && (
        <View style={[styles.badge, { backgroundColor: Colors.goSoft }]}>
          <Text style={[styles.badgeText, { color: Colors.onGoSoft }]}>✓ DONE</Text>
        </View>
      )}
      <VerdictChip verdict={entry.verdict as WeatherVerdict} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: { ...Typography.h1, color: Colors.onSurface },
  statsCard: {},
  statsHeader: { ...Typography.label, color: Colors.onSurfaceVar, marginBottom: Spacing.md },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.5 },
  metricLabel: { ...Typography.small, color: Colors.onSurfaceVar },
  streakCard: {},
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  streakTitle: { ...Typography.h3 },
  streakSub: { ...Typography.small, marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.label, color: Colors.onSurfaceVar },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface1, borderRadius: Radius.md, padding: Spacing.md,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }, android: { elevation: 1 } }),
  },
  historyDist: { ...Typography.bodyBold, color: Colors.onSurface },
  historyDate: { ...Typography.small, color: Colors.onSurfaceVar, marginTop: 1 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { ...Typography.micro },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.h2, color: Colors.onSurface },
  emptyHint: { ...Typography.body, color: Colors.onSurfaceVar, textAlign: 'center' },
});

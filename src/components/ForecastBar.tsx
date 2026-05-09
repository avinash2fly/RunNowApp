import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { HourlyWeather } from '../types';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { WeatherIcon } from './WeatherIcon';
import { usePreferences } from '../store/PreferencesContext';
import { evaluateVerdict } from '../services/weather';

interface Props {
  hourly: HourlyWeather[];
  activeIndex?: number;
}

export function ForecastBar({ hourly, activeIndex = 0 }: Props) {
  const { prefs } = usePreferences();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {hourly.slice(0, 4).map((h, i) => {
        const isActive = i === activeIndex;
        const hour = new Date(h.time_epoch * 1000).getHours();
        const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        const conditionCode = h.condition?.code;
        const windKmh = Math.round(h.wind_kph);
        const slotVerdict = evaluateVerdict([h], prefs.windThresholdKmh ?? 15);
        const dotColor = slotVerdict === 'GOOD' ? Colors.go : slotVerdict === 'BAD' ? Colors.skip : Colors.wait;

        return (
          <View key={h.time_epoch} style={[styles.card, isActive && styles.cardActive]}>
            <Text style={styles.timeLabel}>{label}</Text>
            <WeatherIcon conditionCode={conditionCode} size={22} />
            <Text style={styles.temp}>{Math.round(h.temp_c)}°</Text>
            <View style={styles.windRow}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={styles.windText}>{windKmh}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  card: {
    width: 72,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  cardActive: {
    backgroundColor: Colors.accentSoft,
  },
  timeLabel: {
    ...Typography.micro,
    color: Colors.onSurfaceVar,
  },
  temp: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  windText: {
    ...Typography.micro,
    color: Colors.onSurfaceVar,
  },
});

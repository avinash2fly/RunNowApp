import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { HourlyWeather } from '../types';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { evaluateVerdict, weatherConditionToIcon } from '../services/weather';
import { Icon } from './Icon';

interface Props {
  hourly: HourlyWeather[];
  activeIndex?: number;
  compact?: boolean;
}

export function ForecastBar({ hourly, activeIndex = 0, compact = false }: Props) {
  const tk = useTokens();
  const { prefs } = usePreferences();
  const slots = hourly.slice(0, 4);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: compact ? 6 : 8, paddingHorizontal: 2 }}
    >
      {slots.map((h, i) => {
        const isActive = i === activeIndex;
        const date = new Date(h.time_epoch * 1000);
        const hour = date.getHours();
        const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        const slotVerdict = evaluateVerdict([h], prefs.windThresholdKmh ?? 15);
        const verdictColor = slotVerdict === 'GOOD' ? tk.go : slotVerdict === 'BAD' ? tk.skip : tk.wait;
        const iconName = weatherConditionToIcon(h.condition?.code);
        return (
          <View key={h.time_epoch ?? i} style={[
            styles.card,
            { backgroundColor: isActive ? tk.accentSoft : tk.surface2, paddingVertical: compact ? 8 : 12 },
          ]}>
            <Text style={[styles.label, { color: isActive ? tk.onAccentSoft : tk.onSurfaceVar }]}>{label}</Text>
            <Icon name={iconName} size={compact ? 22 : 26} color={isActive ? tk.accent : verdictColor}/>
            <Text style={[styles.temp, { color: isActive ? tk.onAccentSoft : tk.onSurface, fontSize: compact ? 14 : 16 }]}>
              {Math.round(h.temp_c)}°
            </Text>
            <View style={styles.windRow}>
              <Icon name="wind" size={11} color={isActive ? tk.onAccentSoft : tk.onSurfaceVar}/>
              <Text style={[styles.wind, { color: isActive ? tk.onAccentSoft : tk.onSurfaceVar }]}>
                {Math.round(h.wind_kph)}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 80,
    borderRadius: 18,
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, opacity: 0.7 },
  temp: { fontWeight: '700' },
  windRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  wind: { fontSize: 10, opacity: 0.7, fontWeight: '600' },
});

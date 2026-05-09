import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeatherVerdict } from '../types';
import { Colors, Radius, Typography, Spacing } from '../theme';

interface Props {
  verdict: WeatherVerdict;
}

const VERDICT_MAP: Record<WeatherVerdict, { label: string; dot: string; text: string; bg: string }> = {
  GOOD:     { label: 'GO',      dot: Colors.go,   text: Colors.onGoSoft,   bg: Colors.goSoft   },
  MARGINAL: { label: 'WAIT',    dot: Colors.wait,  text: Colors.onWaitSoft, bg: Colors.waitSoft },
  BAD:      { label: 'SKIP',    dot: Colors.skip,  text: Colors.onSkipSoft, bg: Colors.skipSoft },
  UNKNOWN:  { label: 'UNKNOWN', dot: Colors.onSurfaceVar, text: Colors.onSurfaceVar, bg: Colors.surface2 },
};

export function VerdictChip({ verdict }: Props) {
  const v = VERDICT_MAP[verdict];
  return (
    <View style={[styles.chip, { backgroundColor: v.bg }]}>
      <View style={[styles.dot, { backgroundColor: v.dot }]} />
      <Text style={[styles.label, { color: v.text }]}>{v.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...Typography.label,
  },
});

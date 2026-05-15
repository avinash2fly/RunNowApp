import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeatherVerdict } from '../types';
import { useTokens } from '../store/PreferencesContext';

interface Props {
  verdict: WeatherVerdict;
  size?: 'sm' | 'md';
}

export function VerdictChip({ verdict, size = 'md' }: Props) {
  const tk = useTokens();
  const map = {
    GOOD:     { bg: tk.goSoft,   fg: tk.onGoSoft,   label: 'GOOD TO RUN', dot: tk.go   },
    MARGINAL: { bg: tk.waitSoft, fg: tk.onWaitSoft, label: 'WAIT IT OUT', dot: tk.wait },
    BAD:      { bg: tk.skipSoft, fg: tk.onSkipSoft, label: 'SKIP TODAY',  dot: tk.skip },
    UNKNOWN:  { bg: tk.surface2, fg: tk.onSurfaceVar, label: 'UNKNOWN',   dot: tk.onSurfaceVar },
  }[verdict];
  const s = size === 'sm'
    ? { fs: 11, py: 4, px: 8, gap: 4, dot: 6 }
    : { fs: 12, py: 6, px: 10, gap: 6, dot: 8 };
  return (
    <View style={[styles.chip, {
      backgroundColor: map.bg, paddingHorizontal: s.px, paddingVertical: s.py, gap: s.gap,
    }]}>
      <View style={{ width: s.dot, height: s.dot, borderRadius: s.dot / 2, backgroundColor: map.dot }}/>
      <Text style={[styles.label, { color: map.fg, fontSize: s.fs }]}>{map.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});

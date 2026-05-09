import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

type Tone = 'surface1' | 'surface2' | 'surface3' | 'accent';

interface Props {
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const TONE_BG: Record<Tone, string> = {
  surface1: Colors.surface1,
  surface2: Colors.surface2,
  surface3: Colors.surface3,
  accent:   Colors.accentSoft,
};

export function Card({ tone = 'surface1', style, children }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: TONE_BG[tone] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
});

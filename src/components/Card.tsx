import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTokens } from '../store/PreferencesContext';

type Tone = 'surface1' | 'surface2' | 'surface3' | 'accent';

interface Props {
  tone?: Tone;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Card({ tone = 'surface1', padded = true, style, children }: Props) {
  const tk = useTokens();
  const bg =
    tone === 'accent' ? tk.accentSoft :
    tone === 'surface2' ? tk.surface2 :
    tone === 'surface3' ? tk.surface3 :
    tk.surface1;
  return (
    <View style={[
      { backgroundColor: bg, borderRadius: 24, padding: padded ? 18 : 0 },
      style,
    ]}>
      {children}
    </View>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTokens } from '../store/PreferencesContext';

interface Props {
  title: string;
  trailing?: string;
  onTrailingPress?: () => void;
}

export function SectionTitle({ title, trailing, onTrailingPress }: Props) {
  const tk = useTokens();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: tk.onSurface }]}>{title.toUpperCase()}</Text>
      {trailing ? (
        <TouchableOpacity onPress={onTrailingPress} disabled={!onTrailingPress}>
          <Text style={[styles.trailing, { color: tk.accent }]}>{trailing}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginVertical: 12,
    marginHorizontal: 4,
  },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  trailing: { fontSize: 13, fontWeight: '600' },
});

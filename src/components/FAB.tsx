import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTokens } from '../store/PreferencesContext';

interface Props {
  label?: string;
  icon?: IconName;
  extended?: boolean;
  onPress?: () => void;
}

export function FAB({ label, icon = 'plus', extended = true, onPress }: Props) {
  const tk = useTokens();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: tk.accent,
          paddingHorizontal: extended ? 20 : 0,
          width: extended ? undefined : 56,
        },
      ]}
    >
      <Icon name={icon} size={22} color={tk.onAccent}/>
      {extended && label ? <Text style={[styles.label, { color: tk.onAccent }]}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  label: { fontSize: 14, fontWeight: '600' },
});

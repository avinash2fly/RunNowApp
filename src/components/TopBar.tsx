import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTokens } from '../store/PreferencesContext';

interface Props {
  title?: string;
  leading?: IconName | null;
  trailing?: IconName | null;
  onLead?: () => void;
  onTrail?: () => void;
}

export function TopBar({ title = '', leading, trailing, onLead, onTrail }: Props) {
  const tk = useTokens();
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.iconBtn} onPress={onLead} disabled={!leading}>
        {leading ? <Icon name={leading} size={22} color={tk.onSurface}/> : null}
      </TouchableOpacity>
      <Text style={[styles.title, { color: tk.onSurface }]} numberOfLines={1}>{title}</Text>
      <TouchableOpacity style={styles.iconBtn} onPress={onTrail} disabled={!trailing}>
        {trailing ? <Icon name={trailing} size={22} color={tk.onSurface}/> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 4,
    gap: 4,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1, fontSize: 18, fontWeight: '600', letterSpacing: -0.2,
  },
});

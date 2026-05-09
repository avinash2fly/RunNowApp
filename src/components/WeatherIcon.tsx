import React from 'react';
import { Text } from 'react-native';
import { weatherConditionToEmoji } from '../services/weather';

interface Props {
  iconCode?: string; // WeatherAPI condition icon URL (unused, kept for compat)
  conditionCode?: number; // WeatherAPI condition code
  size?: number;
}

export function WeatherIcon({ conditionCode, size = 24 }: Props) {
  const emoji = conditionCode != null ? weatherConditionToEmoji(conditionCode) : '🌤️';
  return (
    <Text style={{ fontSize: size, lineHeight: size + 4 }}>
      {emoji}
    </Text>
  );
}

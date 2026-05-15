import React from 'react';
import { Icon } from './Icon';
import { weatherConditionToIcon } from '../services/weather';

interface Props {
  conditionCode?: number;
  size?: number;
  color?: string;
}

export function WeatherIcon({ conditionCode, size = 24, color = '#000' }: Props) {
  return <Icon name={weatherConditionToIcon(conditionCode)} size={size} color={color}/>;
}

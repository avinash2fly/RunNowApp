import { UnitDistance, UnitTemp, UnitWind } from '../types';

const KM_PER_MI = 1.609344;

export function tempFromC(celsius: number, unit: UnitTemp): number {
  return unit === 'F' ? celsius * 9 / 5 + 32 : celsius;
}

export function formatTemp(celsius: number, unit: UnitTemp): string {
  return `${Math.round(tempFromC(celsius, unit))}°`;
}

export function formatTempWithUnit(celsius: number, unit: UnitTemp): string {
  return `${Math.round(tempFromC(celsius, unit))}°${unit}`;
}

export function windFromKph(kph: number, unit: UnitWind): number {
  if (unit === 'mph') return kph / KM_PER_MI;
  if (unit === 'm/s') return kph / 3.6;
  return kph;
}

export function formatWind(kph: number, unit: UnitWind): string {
  const v = windFromKph(kph, unit);
  // m/s values are small, keep one decimal there
  const rounded = unit === 'm/s' ? Math.round(v * 10) / 10 : Math.round(v);
  return `${rounded} ${unit}`;
}

export function distanceFromKm(km: number, unit: UnitDistance): number {
  return unit === 'mi' ? km / KM_PER_MI : km;
}

export function kmFromDistance(value: number, unit: UnitDistance): number {
  return unit === 'mi' ? value * KM_PER_MI : value;
}

export function formatDistance(km: number, unit: UnitDistance, decimals = 1): string {
  return `${distanceFromKm(km, unit).toFixed(decimals)} ${unit}`;
}

// Compact "5K easy" style label used on run rows.
export function formatRunDistance(km: number, unit: UnitDistance): string {
  if (unit === 'km') return `${trim(km)}K`;
  return `${trim(distanceFromKm(km, unit))} mi`;
}

function trim(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

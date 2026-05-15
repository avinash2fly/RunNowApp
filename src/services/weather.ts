import { HourlyWeather, WeatherVerdict } from '../types';

const BASE_URL = 'https://api.weatherapi.com/v1/forecast.json';

const WIND_THRESHOLD_KPH = 15;
const POP_THRESHOLD = 30; // percent

export interface WeatherResult {
  verdict: WeatherVerdict;
  hourly: HourlyWeather[];
  allHourly: HourlyWeather[];
  currentTemp: number | null;
}

export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  apiKey: string,
  windThresholdKph?: number
): Promise<WeatherResult> {
  const url = `${BASE_URL}?key=${apiKey}&q=${lat},${lon}&days=2&aqi=no&alerts=no`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WeatherAPI error: ${response.status}`);
  }

  const data = await response.json();

  const allHourly: HourlyWeather[] = (data.forecast?.forecastday ?? [])
    .flatMap((day: any) => day.hour);

  const nowEpoch = Math.floor(Date.now() / 1000);
  const upcoming = allHourly.filter((h: HourlyWeather) => h.time_epoch >= nowEpoch - 1800);
  const hourly = upcoming.slice(0, 4);

  const currentTemp = hourly[0]?.temp_c ?? null;

  return {
    verdict: evaluateVerdict(hourly, windThresholdKph),
    hourly,
    allHourly,
    currentTemp,
  };
}

export function evaluateVerdict(hourly: HourlyWeather[], windThresholdKph = WIND_THRESHOLD_KPH): WeatherVerdict {
  if (!hourly.length) return 'UNKNOWN';

  const slots = hourly.slice(0, 4);

  const hasRain = slots.some(h => h.will_it_rain === 1);
  const hasSnow = slots.some(h => h.will_it_snow === 1);
  const hasHighWind = slots.some(h => h.wind_kph > windThresholdKph);
  const hasHighPop = slots.some(h => h.chance_of_rain > POP_THRESHOLD);

  if (hasRain || hasSnow || hasHighWind) return 'BAD';
  if (hasHighPop) return 'MARGINAL';
  return 'GOOD';
}


export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

export function weatherConditionToEmoji(code: number): string {
  if (code === 1000) return '☀️';
  if (code === 1003) return '⛅';
  if (code === 1006 || code === 1009) return '☁️';
  if (code === 1030 || code === 1135 || code === 1147) return '🌫️';
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return '🌧️';
  if ([1072, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252].includes(code)) return '🌦️';
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return '🌨️';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '⛈️';
  return '🌤️';
}

export type WeatherIconName = 'sun' | 'cloudSun' | 'cloud' | 'rain' | 'bolt';

export function weatherConditionToIcon(code?: number): WeatherIconName {
  if (code == null) return 'cloudSun';
  if (code === 1000) return 'sun';
  if (code === 1003) return 'cloudSun';
  if (code === 1006 || code === 1009 || code === 1030 || code === 1135 || code === 1147) return 'cloud';
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246, 1072, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252, 1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return 'rain';
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'bolt';
  return 'cloudSun';
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun … 6=Sat

export interface RunSchedule {
  id: number;
  dayOfWeek: DayOfWeek;
  hour: number;       // 0–23
  minute: number;     // 0–59
  distanceKm: number;
  runType: RunType;
  isEnabled: boolean;
  notifyNoRain: boolean;
  notifyWind: boolean;
  notifyAhead: boolean;
  createdAt: number;
}

export type RunType = 'Easy' | 'Tempo' | 'Long' | 'Recovery' | 'Speed';

export type WeatherVerdict = 'GOOD' | 'MARGINAL' | 'BAD' | 'UNKNOWN';

export interface HourlyWeather {
  time_epoch: number;
  temp_c: number;
  wind_kph: number;
  chance_of_rain: number;  // 0–100
  will_it_rain: number;    // 0 or 1
  will_it_snow: number;    // 0 or 1
  condition: { code: number; text: string; icon: string };
}

export interface UserPreferences {
  homeCity: string;
  homeLat: number | null;
  homeLon: number | null;
  accentColor: string;
  windThresholdKmh: number;
  notifyLeadMinutes: number;
}

export interface RunHistoryEntry {
  id: number;
  scheduleId: number;
  date: string;        // ISO date string
  distanceKm: number;
  durationSec: number;
  verdict: WeatherVerdict;
  completed: boolean;
}

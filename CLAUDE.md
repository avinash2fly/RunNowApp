# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npx expo start       # start dev server (scan QR with Expo Go)
npx expo run:ios     # native iOS build (requires Xcode on macOS)
npx expo run:android # native Android build (requires Android Studio)
npm test             # jest (jest-expo preset); tests live in src/__tests__/
```

There is no configured lint command.

## Architecture

RunNow is an Expo (React Native) app that checks weather before scheduled runs and fires local notifications. It has no backend — all data lives on-device.

### Navigation

`App.tsx` bootstraps permissions and background tasks, then renders:
- **Stack navigator** (root): `Tabs` screen + `AddEditSchedule` modal
- **Tab navigator**: Home, Schedule, History, Settings screens

### Services (`src/services/`)

| File | Role |
|---|---|
| `weather.ts` | Fetches from **WeatherAPI.com** (`/v1/forecast.json`), returns a `WeatherVerdict` (GOOD / MARGINAL / BAD / UNKNOWN) based on the next 4 hours of rain, snow, and wind data |
| `database.ts` | SQLite via `expo-sqlite`; two tables: `run_schedules` and `run_history`; lazy-initializes schema on first open |
| `notifications.ts` | Local notifications via `expo-notifications`; sets up an Android channel; `sendRunNotification` fires immediately (`trigger: null`) |
| `backgroundTask.ts` | Registers a 15-minute background fetch task (`RUNNOW_WEATHER_CHECK`); reads due schedules, fetches weather, sends notifications, and writes history entries |

### State

`PreferencesContext` (`src/store/PreferencesContext.tsx`) is the only global state. It persists to AsyncStorage under the key `@runnow_prefs`. The stored object includes all `UserPreferences` fields plus `owmApiKey` (typed separately as `FullPrefs` to keep the public type clean).

### Verdict logic

`evaluateVerdict` in `weather.ts` looks at up to 4 upcoming hourly slots:
- **BAD** if any slot has `will_it_rain`, `will_it_snow`, or `wind_kph` above threshold
- **MARGINAL** if any slot has `chance_of_rain` above the rain-chance threshold
- **GOOD** otherwise

The wind threshold comes from `prefs.windThresholdKmh` (default 15 km/h) and the rain-chance threshold from `prefs.rainChanceThreshold` (default 30%); both are passed into `evaluateVerdict` by every caller (screens, background task, foreground notification handler).

### Units

All data is stored metric (km, °C, km/h). `src/utils/units.ts` converts for display based on `prefs.unitDistance` / `unitTemp` / `unitWind` — use it for anything user-facing, including notification text.

### Background task constraints

- Android fires every ~15 min as configured.
- iOS manages frequency itself and may deliver far less often; the app must have been used recently for iOS to grant background time.
- The task is defined at module load time via `TaskManager.defineTask` in `backgroundTask.ts` — this file must be imported before `registerBackgroundTask()` is called (done in `App.tsx`).

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npx expo start       # start dev server (scan QR with Expo Go)
npx expo run:ios     # native iOS build (requires Xcode on macOS)
npx expo run:android # native Android build (requires Android Studio)
```

There are no configured lint or test commands.

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
- **MARGINAL** if any slot has `chance_of_rain > 30`
- **GOOD** otherwise

The wind threshold comes from `prefs.windThresholdKmh` (default 15 km/h), passed from the background task into `evaluateVerdict`.

### Background task constraints

- Android fires every ~15 min as configured.
- iOS manages frequency itself and may deliver far less often; the app must have been used recently for iOS to grant background time.
- The task is defined at module load time via `TaskManager.defineTask` in `backgroundTask.ts` — this file must be imported before `registerBackgroundTask()` is called (done in `App.tsx`).

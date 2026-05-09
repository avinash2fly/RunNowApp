# RunNow

A React Native (Expo) app that tells you whether it's a good time to run based on real-time weather conditions. Set your weekly run schedule and RunNow checks the forecast, sends a notification before each run, and gives you a clear GO / MARGINAL / BAD verdict.

## Features

- **Weather verdict** — GO, MARGINAL, or BAD based on rain, snow, and wind for the next 4 hours
- **Run schedules** — set recurring runs by day, time, distance, and type (Easy, Tempo, Long, Recovery, Speed)
- **Background notifications** — get a heads-up before each scheduled run with the current weather verdict
- **Hourly forecast bar** — see temp, wind, and conditions hour by hour
- **Run history** — log completed runs and track past verdicts
- **Customisable thresholds** — set your own wind speed limit for what counts as BAD

## Tech Stack

- [Expo](https://expo.dev) / React Native
- [WeatherAPI](https://www.weatherapi.com) for current weather and forecasts
- SQLite (via `expo-sqlite`) for local schedule and history storage
- Expo Notifications + Background Fetch for background weather checks
- React Navigation (stack + bottom tabs)

## Getting Started

### 1. Get a WeatherAPI key

1. Sign up for free at [weatherapi.com](https://www.weatherapi.com)
2. Copy your API key from the dashboard (1,000,000 calls/month on the free plan)

### 2. Install and run

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on iOS or Android.

### 3. Configure the app

1. Open the **Settings** tab
2. Paste your WeatherAPI key
3. Type your city name and tap **Find** to save your home location
4. Set your wind threshold and notification lead time
5. Tap **Save preferences**

### 4. Add a run schedule

Tap **+ Schedule** on the home screen, pick a day and time, and you're set.

## Production Builds

```bash
npx expo run:ios       # requires Xcode (macOS)
npx expo run:android   # requires Android Studio
```

## Background Notifications

- **Android** — background fetch runs approximately every 15 minutes
- **iOS** — fetch frequency is managed by iOS; keep the app in recent use for more frequent checks

## Project Structure

```
src/
  components/       # VerdictChip, ForecastBar, WeatherIcon, Card
  navigation/       # AppNavigator (stack + tabs)
  screens/          # Home, Schedule, AddEditSchedule, History, Settings
  services/         # weather.ts, database.ts, notifications.ts, backgroundTask.ts
  store/            # PreferencesContext
  theme/            # colors, spacing, typography
  types/            # shared TypeScript interfaces
```

## License

MIT

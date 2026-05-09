# RunNow — Setup Guide

## OpenWeatherMap API Key

RunNow uses the **One Call API 3.0** from OpenWeatherMap (free, 1,000 calls/day).

1. Register at https://openweathermap.org/api and confirm your email.
2. Go to **API Keys** in your account dashboard. Copy the default key or create a new one.
3. Subscribe to **One Call API 3.0** (requires adding a payment method, but stays free under 1,000 calls/day — no charge).
4. Wait ~10 minutes for the key to activate.
5. Open the app → **Settings** tab → paste your key into the **OpenWeatherMap API Key** field.

## Home Location

1. In the **Settings** tab, type your city name into **Home Location**.
2. Tap **Find** — the app geocodes it to lat/lon and saves it on-device.
3. No GPS permission is needed.

## Running in Development

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android).

For a production build:

```bash
npx expo run:android   # requires Android Studio
npx expo run:ios       # requires Xcode (macOS only)
```

## Background Notifications

- **Android**: Background fetch runs every ~15 min. The app checks if any scheduled run is within the lead-time window, fetches weather, and fires a local notification.
- **iOS**: Background fetch frequency is managed by iOS and may be less frequent than the requested 15-minute interval. Ensure the app has been used recently for iOS to grant more frequent background time.

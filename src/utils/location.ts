import * as Location from 'expo-location';

export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition(): Promise<TrackPoint | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
      accuracy: loc.coords.accuracy,
    };
  } catch {
    return null;
  }
}

export function startTracking(
  onPoint: (point: TrackPoint) => void,
): { stop: () => void } {
  let sub: Location.LocationSubscription | null = null;

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 3,
    },
    (loc) => {
      onPoint({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
        accuracy: loc.coords.accuracy,
      });
    },
  ).then((s) => {
    sub = s;
  });

  return {
    stop: () => sub?.remove(),
  };
}

// Haversine distance in meters
export function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Accumulate distance from a stream of points, filtering GPS jitter.
export function accumulateDistance(
  points: TrackPoint[],
  minAccuracyM = 20,
): number {
  let total = 0;
  let prev: TrackPoint | null = null;
  for (const p of points) {
    if (p.accuracy != null && p.accuracy > minAccuracyM) continue;
    if (prev) {
      const d = haversineMeters(prev.latitude, prev.longitude, p.latitude, p.longitude);
      if (d >= 2) total += d;
    }
    prev = p;
  }
  return total;
}

import { RunSchedule } from '../types';

export interface NextRunInfo {
  schedule: RunSchedule;
  time: number; // epoch ms
}

export function nextRun(schedules: RunSchedule[], now: Date = new Date()): NextRunInfo | null {
  let best: NextRunInfo | null = null;
  for (const s of schedules) {
    const candidate = new Date(now);
    const daysAhead = (s.dayOfWeek - now.getDay() + 7) % 7;
    candidate.setDate(now.getDate() + daysAhead);
    candidate.setHours(s.hour, s.minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 7);
    }
    const t = candidate.getTime();
    if (!best || t < best.time) best = { schedule: s, time: t };
  }
  return best;
}

export function nextRunCountdown(schedules: RunSchedule[], now: Date = new Date()): string {
  if (!schedules.length) return 'No runs scheduled';

  const best = nextRun(schedules, now);
  if (!best) return 'No runs scheduled';

  const diff = best.time - now.getTime();
  const totalMin = Math.ceil(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `Your next run is in ${d} day${d !== 1 ? 's' : ''}`;
  }
  if (h > 0) return `Your run window opens in ${h} hr ${m} min`;
  return `Your run starts in ${m} min`;
}

// Returns true if the schedule's next occurrence falls within [now, now + leadMinutes].
// Handles wrap-around near midnight by checking the schedule's next firing across days.
export function isWithinWindow(
  dayOfWeek: number,
  hour: number,
  minute: number,
  leadMinutes: number,
  now: Date = new Date()
): boolean {
  const windowMs = leadMinutes * 60 * 1000;

  // Build the next 8 candidate firings (covers any wrap-around case)
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getDay() !== dayOfWeek) continue;
    const diff = candidate.getTime() - now.getTime();
    if (diff >= 0 && diff <= windowMs) return true;
    if (diff > windowMs) return false; // future occurrences will only be further away
  }
  return false;
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// Counts consecutive days with at least one completed run, ending today or yesterday.
// Returns 0 if there are no completed runs on either of the most recent days.
export function calculateStreak(completedDates: string[], now: Date = new Date()): number {
  if (!completedDates.length) return 0;

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const completedDays = new Set(completedDates.map(iso => dayKey(new Date(iso))));

  const today = dayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  let cursor = new Date(now);
  if (!completedDays.has(today)) {
    if (!completedDays.has(yesterdayKey)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (completedDays.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

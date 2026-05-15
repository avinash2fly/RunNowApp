import {
  isWithinWindow, nextRun, nextRunCountdown, formatTime, calculateStreak,
} from '../utils/scheduling';
import { RunSchedule, DayOfWeek } from '../types';

function mkSchedule(overrides: Partial<RunSchedule> = {}): RunSchedule {
  return {
    id: 1,
    dayOfWeek: 1, // Monday
    hour: 7,
    minute: 0,
    distanceKm: 5,
    runType: 'Easy',
    isEnabled: true,
    notifyNoRain: true,
    notifyWind: true,
    notifyAhead: true,
    createdAt: 0,
    ...overrides,
  };
}

describe('formatTime', () => {
  it('formats AM times', () => {
    expect(formatTime(0, 0)).toBe('12:00 AM');
    expect(formatTime(7, 5)).toBe('7:05 AM');
    expect(formatTime(11, 59)).toBe('11:59 AM');
  });

  it('formats PM times', () => {
    expect(formatTime(12, 0)).toBe('12:00 PM');
    expect(formatTime(13, 30)).toBe('1:30 PM');
    expect(formatTime(23, 45)).toBe('11:45 PM');
  });

  it('zero-pads single-digit minutes', () => {
    expect(formatTime(8, 5)).toBe('8:05 AM');
  });
});

describe('isWithinWindow', () => {
  it('returns true when scheduled within window today', () => {
    // Monday 6:45 AM, run at 7:00 AM Monday, 30 min lead → 15 min until run → in window
    const now = new Date('2026-05-11T06:45:00');
    expect(isWithinWindow(1, 7, 0, 30, now)).toBe(true);
  });

  it('returns false when scheduled outside window', () => {
    // Monday 5:00 AM, run at 7:00 AM Monday, 30 min lead → 2h until run → out of window
    const now = new Date('2026-05-11T05:00:00');
    expect(isWithinWindow(1, 7, 0, 30, now)).toBe(false);
  });

  it('returns false when schedule is in the past today', () => {
    // Monday 8:00 AM, run at 7:00 AM Monday → already passed, next is next Monday
    const now = new Date('2026-05-11T08:00:00');
    expect(isWithinWindow(1, 7, 0, 30, now)).toBe(false);
  });

  it('handles wrap-around near midnight', () => {
    // Mon 23:50, run at 00:15 Tuesday, 30 min lead → 25 min until run → in window
    const now = new Date('2026-05-11T23:50:00');
    expect(isWithinWindow(2, 0, 15, 30, now)).toBe(true);
  });

  it('does not match a different day-of-week', () => {
    // Tuesday 6:45, but schedule is Monday 7:00 → next match is far away
    const now = new Date('2026-05-12T06:45:00');
    expect(isWithinWindow(1, 7, 0, 30, now)).toBe(false);
  });
});

describe('nextRun', () => {
  it('returns null for no schedules', () => {
    expect(nextRun([])).toBeNull();
  });

  it('picks the soonest upcoming run', () => {
    const now = new Date('2026-05-11T08:00:00'); // Monday
    const mon = mkSchedule({ id: 1, dayOfWeek: 1, hour: 7, minute: 0 }); // already passed today
    const tue = mkSchedule({ id: 2, dayOfWeek: 2, hour: 6, minute: 30 });
    const result = nextRun([mon, tue], now);
    expect(result?.schedule.id).toBe(2);
  });

  it('schedules later this week instead of next week', () => {
    const now = new Date('2026-05-11T08:00:00'); // Monday
    const fri = mkSchedule({ id: 5, dayOfWeek: 5, hour: 7, minute: 0 });
    const result = nextRun([fri], now);
    expect(result?.schedule.id).toBe(5);
    // Friday 2026-05-15 at 07:00
    expect(new Date(result!.time).getDay()).toBe(5);
  });

  it('schedules same-day-of-week one week out if already passed', () => {
    const now = new Date('2026-05-11T09:00:00'); // Monday 09:00
    const monEarly = mkSchedule({ dayOfWeek: 1, hour: 7, minute: 0 });
    const result = nextRun([monEarly], now);
    const days = Math.round((result!.time - now.getTime()) / (24 * 60 * 60 * 1000));
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(7);
  });
});

describe('nextRunCountdown', () => {
  it('returns no-schedules message', () => {
    expect(nextRunCountdown([])).toBe('No runs scheduled');
  });

  it('formats minutes-only countdown', () => {
    const now = new Date('2026-05-11T06:35:00'); // Monday
    const s = mkSchedule({ dayOfWeek: 1, hour: 7, minute: 0 });
    expect(nextRunCountdown([s], now)).toMatch(/Your run starts in \d+ min/);
  });

  it('formats hour+minute countdown', () => {
    const now = new Date('2026-05-11T05:00:00');
    const s = mkSchedule({ dayOfWeek: 1, hour: 7, minute: 30 });
    expect(nextRunCountdown([s], now)).toMatch(/Your run window opens in 2 hr 30 min/);
  });

  it('formats day-based countdown', () => {
    const now = new Date('2026-05-11T08:00:00'); // Monday
    const s = mkSchedule({ dayOfWeek: 4, hour: 7, minute: 0 }); // Thursday
    expect(nextRunCountdown([s], now)).toMatch(/Your next run is in \d+ days?/);
  });
});

describe('calculateStreak', () => {
  it('returns 0 when no completions', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 when most recent completion is older than yesterday', () => {
    const now = new Date('2026-05-12T12:00:00');
    expect(calculateStreak(['2026-05-09T07:00:00'], now)).toBe(0);
  });

  it('counts streak ending today', () => {
    const now = new Date('2026-05-12T12:00:00');
    const dates = [
      '2026-05-12T07:00:00',
      '2026-05-11T07:00:00',
      '2026-05-10T07:00:00',
    ];
    expect(calculateStreak(dates, now)).toBe(3);
  });

  it('counts streak ending yesterday', () => {
    const now = new Date('2026-05-12T12:00:00');
    const dates = [
      '2026-05-11T07:00:00',
      '2026-05-10T07:00:00',
    ];
    expect(calculateStreak(dates, now)).toBe(2);
  });

  it('breaks streak on gap', () => {
    const now = new Date('2026-05-12T12:00:00');
    const dates = [
      '2026-05-12T07:00:00',
      '2026-05-11T07:00:00',
      // gap on 5/10
      '2026-05-09T07:00:00',
    ];
    expect(calculateStreak(dates, now)).toBe(2);
  });

  it('dedupes multiple runs on the same day', () => {
    const now = new Date('2026-05-12T12:00:00');
    const dates = [
      '2026-05-12T17:00:00',
      '2026-05-12T07:00:00',
    ];
    expect(calculateStreak(dates, now)).toBe(1);
  });
});

import * as SQLite from 'expo-sqlite';
import { RunSchedule, RunHistoryEntry, DayOfWeek } from '../types';

const DB_NAME = 'runnow.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initSchema(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS run_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayOfWeek INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      distanceKm REAL NOT NULL DEFAULT 5,
      runType TEXT NOT NULL DEFAULT 'Easy',
      isEnabled INTEGER NOT NULL DEFAULT 1,
      notifyNoRain INTEGER NOT NULL DEFAULT 1,
      notifyWind INTEGER NOT NULL DEFAULT 1,
      notifyAhead INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheduleId INTEGER NOT NULL,
      date TEXT NOT NULL,
      distanceKm REAL NOT NULL,
      durationSec INTEGER NOT NULL DEFAULT 0,
      verdict TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);
}

// --- Schedule CRUD ---

export async function getAllSchedules(): Promise<RunSchedule[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>('SELECT * FROM run_schedules ORDER BY dayOfWeek, hour, minute');
  return rows.map(rowToSchedule);
}

export async function getEnabledSchedules(): Promise<RunSchedule[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>('SELECT * FROM run_schedules WHERE isEnabled = 1');
  return rows.map(rowToSchedule);
}

export async function getScheduleById(id: number): Promise<RunSchedule | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<any>('SELECT * FROM run_schedules WHERE id = ?', [id]);
  return row ? rowToSchedule(row) : null;
}

export async function insertSchedule(schedule: Omit<RunSchedule, 'id'>): Promise<RunSchedule> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO run_schedules (dayOfWeek, hour, minute, distanceKm, runType, isEnabled, notifyNoRain, notifyWind, notifyAhead, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      schedule.dayOfWeek,
      schedule.hour,
      schedule.minute,
      schedule.distanceKm,
      schedule.runType,
      schedule.isEnabled ? 1 : 0,
      schedule.notifyNoRain ? 1 : 0,
      schedule.notifyWind ? 1 : 0,
      schedule.notifyAhead ? 1 : 0,
      schedule.createdAt,
    ]
  );
  return { ...schedule, id: result.lastInsertRowId };
}

export async function updateSchedule(schedule: RunSchedule): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE run_schedules SET dayOfWeek=?, hour=?, minute=?, distanceKm=?, runType=?, isEnabled=?, notifyNoRain=?, notifyWind=?, notifyAhead=? WHERE id=?`,
    [
      schedule.dayOfWeek,
      schedule.hour,
      schedule.minute,
      schedule.distanceKm,
      schedule.runType,
      schedule.isEnabled ? 1 : 0,
      schedule.notifyNoRain ? 1 : 0,
      schedule.notifyWind ? 1 : 0,
      schedule.notifyAhead ? 1 : 0,
      schedule.id,
    ]
  );
}

export async function deleteSchedule(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM run_schedules WHERE id = ?', [id]);
}

export async function setScheduleEnabled(id: number, isEnabled: boolean): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE run_schedules SET isEnabled = ? WHERE id = ?', [isEnabled ? 1 : 0, id]);
}

// --- History CRUD ---

export async function getHistory(limit = 50): Promise<RunHistoryEntry[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM run_history ORDER BY date DESC LIMIT ?',
    [limit]
  );
  return rows.map(rowToHistory);
}

export async function insertHistoryEntry(entry: Omit<RunHistoryEntry, 'id'>): Promise<RunHistoryEntry> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO run_history (scheduleId, date, distanceKm, durationSec, verdict, completed) VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.scheduleId, entry.date, entry.distanceKm, entry.durationSec, entry.verdict, entry.completed ? 1 : 0]
  );
  return { ...entry, id: result.lastInsertRowId };
}

export async function getMonthlyStats(): Promise<{ totalKm: number; totalRuns: number; completedRuns: number }> {
  const database = await getDb();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const row = await database.getFirstAsync<any>(
    `SELECT COALESCE(SUM(distanceKm), 0) as totalKm, COUNT(*) as totalRuns, SUM(completed) as completedRuns
     FROM run_history WHERE date >= ?`,
    [monthStart]
  );
  return {
    totalKm: row?.totalKm ?? 0,
    totalRuns: row?.totalRuns ?? 0,
    completedRuns: row?.completedRuns ?? 0,
  };
}

// --- Helpers ---

function rowToSchedule(row: any): RunSchedule {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek as DayOfWeek,
    hour: row.hour,
    minute: row.minute,
    distanceKm: row.distanceKm,
    runType: row.runType,
    isEnabled: row.isEnabled === 1,
    notifyNoRain: row.notifyNoRain === 1,
    notifyWind: row.notifyWind === 1,
    notifyAhead: row.notifyAhead === 1,
    createdAt: row.createdAt,
  };
}

function rowToHistory(row: any): RunHistoryEntry {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    date: row.date,
    distanceKm: row.distanceKm,
    durationSec: row.durationSec,
    verdict: row.verdict,
    completed: row.completed === 1,
  };
}

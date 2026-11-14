import { Session } from '../types';

export type Interval = { start: number; end: number };

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Local YYYY-MM-DD for a timestamp. */
export function dateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Epoch ms for local midnight at the start of a YYYY-MM-DD. */
export function dateKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Next local midnight strictly after the given timestamp. */
function nextMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** The currently-open (ongoing) session, if any. */
export function openSession(sessions: Session[]): Session | null {
  return sessions.find((s) => s.end === null) ?? null;
}

export function isWearing(sessions: Session[]): boolean {
  return openSession(sessions) !== null;
}

/** Resolve a session to a concrete interval, treating an open session as ending now. */
export function sessionInterval(s: Session, now: number): Interval {
  return { start: s.start, end: s.end ?? now };
}

/** Minutes worn per local day, splitting sessions across midnight. */
export function dailyMinutes(sessions: Session[], now: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    const { start, end } = sessionInterval(s, now);
    let cursor = start;
    while (cursor < end) {
      const dayEnd = Math.min(end, nextMidnight(cursor));
      const mins = (dayEnd - cursor) / 60000;
      const key = dateKey(cursor);
      map[key] = (map[key] || 0) + mins;
      cursor = dayEnd;
    }
  }
  return map;
}

/**
 * Effective minutes per day: a manual override fully replaces the tracked total
 * for that day. Used by the calendar and summaries so edits show up everywhere.
 */
export function effectiveDailyMinutes(
  sessions: Session[],
  overrides: Record<string, number>,
  now: number
): Record<string, number> {
  const map = dailyMinutes(sessions, now);
  for (const [key, mins] of Object.entries(overrides)) {
    map[key] = mins;
  }
  return map;
}

/** Sessions overlapping a given local day, sorted by start time. */
export function sessionsOnDay(sessions: Session[], dayKey: string, now: number): Session[] {
  const dayStart = dateKeyToMs(dayKey);
  const dayEnd = dayStart + 86400000;
  return sessions
    .filter((s) => {
      const end = s.end ?? now;
      return s.start < dayEnd && end > dayStart;
    })
    .sort((a, b) => a.start - b.start);
}

/** "7h 32m" style formatting from a minute count. */
export function formatMinutes(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  return `${h}h ${min}m`;
}

/** "1:02:33" style from a millisecond duration. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/** "6:05 PM" from minutes-since-midnight. */
export function formatTimeOfDay(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** "6:05 PM" from a timestamp. */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return formatTimeOfDay(d.getHours() * 60 + d.getMinutes());
}

export function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** Whole days elapsed since the program start (can be negative if start is in the future). */
export function daysSinceStart(startDate: string, now: number): number {
  return Math.floor((now - dateKeyToMs(startDate)) / 86400000);
}

/** Which tray you're on now, derived from start date + tray length. 1-based. */
export function currentTrayNumber(startDate: string, durationDays: number, now: number): number {
  const d = daysSinceStart(startDate, now);
  if (d < 0) return 1;
  return Math.floor(d / durationDays) + 1;
}

/** Which day of the current tray you're on (1-based). */
export function dayInTray(startDate: string, durationDays: number, now: number): number {
  const d = daysSinceStart(startDate, now);
  if (d < 0) return 1;
  return (d % durationDays) + 1;
}

/**
 * Timestamp for the "switch trays" reminder — on the SWITCH day, i.e. the first
 * day of tray n+1 (start + n*durationDays days), at HH:MM.
 */
export function trayReminderTs(
  startDate: string,
  durationDays: number,
  timeHHMM: string,
  n: number
): number {
  const base = dateKeyToMs(startDate) + n * durationDays * 86400000;
  const d = new Date(base);
  const [h, m] = timeHHMM.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

/** The next `count` upcoming switch reminders (so they survive the app being closed). */
export function upcomingTrayReminders(
  startDate: string,
  durationDays: number,
  timeHHMM: string,
  now: number,
  count: number
): { whenMs: number; nextTray: number }[] {
  const start = currentTrayNumber(startDate, durationDays, now);
  const out: { whenMs: number; nextTray: number }[] = [];
  for (let k = start; out.length < count && k < start + count + 50; k++) {
    const ts = trayReminderTs(startDate, durationDays, timeHHMM, k);
    if (ts > now) out.push({ whenMs: ts, nextTray: k + 1 });
  }
  return out;
}

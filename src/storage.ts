import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';
import { dateKey, uid } from './utils/time';

/**
 * Data persistence with versioned migrations.
 *
 * One permanent key holds the data plus a `schemaVersion`. On load, if stored
 * data is older than CURRENT_VERSION, the migration chain upgrades it in place
 * (after backing up the raw data) so history is never thrown away. To change
 * the data shape in the future: bump CURRENT_VERSION and add a migration.
 */
const KEY = 'smileclock';
const BACKUP_KEY = 'smileclock:backup';
const LEGACY_V3_KEY = 'smileclock:v3'; // pre-migration key, == version 3 shape

export const CURRENT_VERSION = 3;

export const defaultState = (): AppState => ({
  sessions: [],
  overrides: {},
  tray: {
    startDate: dateKey(Date.now()),
    durationDays: 14,
  },
  settings: {
    dailyGoalHours: 22,
    reminderEnabled: true,
    reminderThresholdMin: 60,
    traySwitchEnabled: true,
    trayReminderTime: '18:00',
  },
});

/**
 * Each entry upgrades data FROM the previous version TO its key version.
 * e.g. migrations[3] turns version-2 data into version-3 data.
 */
const migrations: Record<number, (d: any) => any> = {
  // v1 (toggle events) -> v2 (wear sessions)
  2: (d) => {
    if (!Array.isArray(d.events)) return d;
    const sorted = [...d.events].sort((a: any, b: any) => a.ts - b.ts);
    const sessions: any[] = [];
    let start: number | null = null;
    for (const e of sorted) {
      if (e.type === 'on') {
        if (start === null) start = e.ts;
      } else if (start !== null) {
        sessions.push({ id: uid(), start, end: e.ts });
        start = null;
      }
    }
    if (start !== null) sessions.push({ id: uid(), start, end: null });
    const { events, ...rest } = d;
    return { ...rest, sessions, overrides: d.overrides ?? {} };
  },
  // v2 (tray had a stored `current` number) -> v3 (tray number is derived)
  3: (d) => {
    const tray = {
      startDate: d.tray?.startDate ?? dateKey(Date.now()),
      durationDays: d.tray?.durationDays ?? 14,
    };
    return { ...d, tray };
  },
};

/** Apply every migration from `fromVersion`+1 up to CURRENT_VERSION. */
export function runMigrations(data: any, fromVersion: number): any {
  let d = data;
  for (let v = fromVersion + 1; v <= CURRENT_VERSION; v++) {
    const fn = migrations[v];
    if (fn) d = fn(d);
  }
  return d;
}

/** Fill in any missing fields so the app never reads a half-shaped object. */
function hydrate(d: any): AppState {
  const base = defaultState();
  return {
    sessions: Array.isArray(d?.sessions) ? d.sessions : base.sessions,
    overrides: d?.overrides && typeof d.overrides === 'object' ? d.overrides : base.overrides,
    tray: { ...base.tray, ...(d?.tray ?? {}) },
    settings: { ...base.settings, ...(d?.settings ?? {}) },
  };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const version = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;
      if (version < CURRENT_VERSION) {
        await AsyncStorage.setItem(BACKUP_KEY, raw); // safety net before upgrading
        const hydrated = hydrate(runMigrations(parsed, version));
        await saveState(hydrated);
        return hydrated;
      }
      return hydrate(parsed);
    }
    // First run on this key: pull forward any data from the old pre-migration key.
    const legacy = await AsyncStorage.getItem(LEGACY_V3_KEY);
    if (legacy) {
      const hydrated = hydrate(JSON.parse(legacy));
      await saveState(hydrated);
      return hydrated;
    }
    return defaultState();
  } catch {
    return defaultState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const payload = { schemaVersion: CURRENT_VERSION, ...state };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // best-effort; ignore write failures
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY, LEGACY_V3_KEY, BACKUP_KEY]);
  } catch {
    // ignore
  }
}

/** Validate + migrate an imported backup payload into a usable AppState. */
export function appStateFromImport(version: number, data: any): AppState {
  const safeVersion = typeof version === 'number' ? version : 1;
  const migrated = safeVersion < CURRENT_VERSION ? runMigrations(data, safeVersion) : data;
  return hydrate(migrated);
}

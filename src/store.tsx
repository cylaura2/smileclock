import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Session, Settings, TrayInfo } from './types';
import { clearState, defaultState, loadState, saveState } from './storage';
import { isWearing as deriveWearing, openSession, uid, upcomingTrayReminders } from './utils/time';
import {
  cancelNudge,
  cancelTraySwitch,
  ensureNotificationPermission,
  scheduleNudge,
  scheduleTraySwitches,
} from './utils/notifications';

type Store = {
  ready: boolean;
  sessions: Session[];
  overrides: Record<string, number>;
  tray: TrayInfo;
  settings: Settings;
  isWearing: boolean;
  openStart: number | null; // start ts of the ongoing session, or null
  toggle: () => void;
  addSession: (start: number, end: number) => void;
  updateSession: (id: string, patch: Partial<Pick<Session, 'start' | 'end'>>) => void;
  deleteSession: (id: string) => void;
  setDayOverride: (dayKey: string, minutes: number | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateTray: (patch: Partial<TrayInfo>) => void;
  importState: (next: AppState) => void;
  resetAll: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [tray, setTray] = useState<TrayInfo>(defaultState().tray);
  const [settings, setSettings] = useState<Settings>(defaultState().settings);

  // Load persisted state once on startup.
  useEffect(() => {
    let alive = true;
    loadState().then((s) => {
      if (!alive) return;
      setSessions(s.sessions);
      setOverrides(s.overrides);
      setTray(s.tray);
      setSettings(s.settings);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist whenever data changes (after initial load).
  useEffect(() => {
    if (!ready) return;
    const state: AppState = { sessions, overrides, tray, settings };
    saveState(state);
  }, [ready, sessions, overrides, tray, settings]);

  const open = useMemo(() => openSession(sessions), [sessions]);
  const isWearing = open !== null;

  // Keep the tray-switch reminders in sync with tray + reminder settings.
  useEffect(() => {
    if (!ready) return;
    if (settings.traySwitchEnabled) {
      ensureNotificationPermission().then((granted) => {
        if (!granted) return;
        const items = upcomingTrayReminders(
          tray.startDate,
          tray.durationDays,
          settings.trayReminderTime,
          Date.now(),
          4
        );
        scheduleTraySwitches(items);
      });
    } else {
      cancelTraySwitch();
    }
  }, [ready, tray.startDate, tray.durationDays, settings.traySwitchEnabled, settings.trayReminderTime]);

  const toggle = useCallback(() => {
    const now = Date.now();
    if (deriveWearing(sessions)) {
      // close the open session
      setSessions((prev) =>
        prev.map((s) => (s.end === null ? { ...s, end: now } : s))
      );
      if (settings.reminderEnabled) scheduleNudge(settings.reminderThresholdMin);
    } else {
      setSessions((prev) => [...prev, { id: uid(), start: now, end: null }]);
      cancelNudge();
    }
  }, [sessions, settings.reminderEnabled, settings.reminderThresholdMin]);

  const addSession = useCallback((start: number, end: number) => {
    setSessions((prev) => [...prev, { id: uid(), start, end }]);
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<Pick<Session, 'start' | 'end'>>) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const setDayOverride = useCallback((dayKey: string, minutes: number | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (minutes === null) delete next[dayKey];
      else next[dayKey] = minutes;
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...patch };
      if (patch.reminderEnabled === true || patch.traySwitchEnabled === true) {
        ensureNotificationPermission();
      }
      if (patch.reminderEnabled === false) cancelNudge();
      return merged;
    });
  }, []);

  const updateTray = useCallback((patch: Partial<TrayInfo>) => {
    setTray((prev) => ({ ...prev, ...patch }));
  }, []);

  const importState = useCallback((next: AppState) => {
    setSessions(next.sessions);
    setOverrides(next.overrides);
    setTray(next.tray);
    setSettings(next.settings);
    cancelNudge();
  }, []);

  const resetAll = useCallback(() => {
    const d = defaultState();
    setSessions(d.sessions);
    setOverrides(d.overrides);
    setTray(d.tray);
    setSettings(d.settings);
    cancelNudge();
    cancelTraySwitch();
    clearState();
  }, []);

  const value: Store = {
    ready,
    sessions,
    overrides,
    tray,
    settings,
    isWearing,
    openStart: open ? open.start : null,
    toggle,
    addSession,
    updateSession,
    deleteSession,
    setDayOverride,
    updateSettings,
    updateTray,
    importState,
    resetAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

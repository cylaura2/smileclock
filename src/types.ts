/** A single wear window. `end === null` means it's still ongoing (in your mouth now). */
export type Session = {
  id: string;
  start: number; // epoch milliseconds
  end: number | null; // epoch milliseconds, or null while ongoing
};

export type TrayInfo = {
  /** YYYY-MM-DD when tray #1 began. The current tray number is derived from this. */
  startDate: string;
  durationDays: number; // how many days per tray
};

export type Settings = {
  dailyGoalHours: number;
  reminderEnabled: boolean;
  reminderThresholdMin: number; // minutes off before we nudge you
  traySwitchEnabled: boolean; // remind to switch trays at end of tray
  trayReminderTime: string; // "HH:MM" 24h, when the switch reminder fires
};

export type AppState = {
  sessions: Session[];
  /** Manual per-day total overrides, in minutes. Keyed by YYYY-MM-DD. */
  overrides: Record<string, number>;
  tray: TrayInfo;
  settings: Settings;
};

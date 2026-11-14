import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Track scheduled notifications by purpose so cancelling one doesn't drop the other.
let nudgeId: string | null = null;
let trayIds: string[] = [];

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (granted && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    return granted;
  } catch {
    return false;
  }
}

/** Schedule a single "put your aligners back in" nudge `minutes` from now. */
export async function scheduleNudge(minutes: number): Promise<void> {
  await cancelNudge();
  try {
    nudgeId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to pop them back in 🦷',
        body: `Your aligners have been out for ${minutes} minutes. Every hour counts toward your goal!`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(minutes * 60)),
        repeats: false,
        channelId: 'reminders',
      },
    });
  } catch {
    nudgeId = null;
  }
}

export async function cancelNudge(): Promise<void> {
  if (!nudgeId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(nudgeId);
  } catch {
    // ignore
  }
  nudgeId = null;
}

/**
 * Schedule the upcoming "switch to your next tray" reminders. Several are
 * scheduled ahead so they still fire if the app isn't opened in between.
 * Re-call any time tray settings change; it replaces the previous set.
 */
export async function scheduleTraySwitches(
  items: { whenMs: number; nextTray: number }[]
): Promise<void> {
  await cancelTraySwitch();
  for (const { whenMs, nextTray } of items) {
    if (whenMs <= Date.now()) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New aligner day! ✨',
          body: `Time to switch to tray ${nextTray}. Swap in your fresh set today.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: whenMs,
          channelId: 'reminders',
        },
      });
      trayIds.push(id);
    } catch {
      // ignore individual failures
    }
  }
}

export async function cancelTraySwitch(): Promise<void> {
  for (const id of trayIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
  trayIds = [];
}

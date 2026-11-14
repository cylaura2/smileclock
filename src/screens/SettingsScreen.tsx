import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Card from '../components/Card';
import Stepper from '../components/Stepper';
import TimeField from '../components/TimeField';
import DateField from '../components/DateField';
import { useStore } from '../store';
import { CURRENT_VERSION, appStateFromImport } from '../storage';
import { buildBackup, exportBackup, importBackup, isValidBackup } from '../utils/backup';
import { colors, radius, spacing } from '../theme';
import {
  currentTrayNumber,
  dayInTray,
  formatTimeOfDay,
  upcomingTrayReminders,
} from '../utils/time';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function toHHMM(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const { sessions, overrides, settings, tray, updateSettings, updateTray, importState, resetAll } =
    useStore();
  const now = Date.now();
  const trayNum = currentTrayNumber(tray.startDate, tray.durationDays, now);
  const dayNum = dayInTray(tray.startDate, tray.durationDays, now);
  const daysLeft = Math.max(1, tray.durationDays - dayNum + 1);

  const nextReminder = upcomingTrayReminders(
    tray.startDate,
    tray.durationDays,
    settings.trayReminderTime,
    now,
    1
  )[0];
  const switchLabel = nextReminder
    ? new Date(nextReminder.whenMs).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const confirmReset = () => {
    Alert.alert(
      'Reset all data?',
      'This permanently erases your wear history, tray progress, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase everything', style: 'destructive', onPress: resetAll },
      ]
    );
  };

  const onExport = async () => {
    const payload = buildBackup(CURRENT_VERSION, { sessions, overrides, tray, settings });
    const res = await exportBackup(payload);
    if (!res.ok) Alert.alert('Export failed', res.message ?? 'Could not create the backup file.');
  };

  const onImport = async () => {
    const file = await importBackup();
    if (file === null) return; // cancelled
    if (!isValidBackup(file)) {
      Alert.alert('Invalid file', "That doesn't look like a SmileClock backup.");
      return;
    }
    const incoming = appStateFromImport(file.schemaVersion, file.data);
    Alert.alert(
      'Restore this backup?',
      `It contains ${incoming.sessions.length} wear session${
        incoming.sessions.length === 1 ? '' : 's'
      }. This replaces everything currently in the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => importState(incoming) },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.section}>Daily goal</Text>
      <Card>
        <Row label="Wear-time goal" hint="Most plans recommend 22 hours per day">
          <Stepper
            value={settings.dailyGoalHours}
            onChange={(v) => updateSettings({ dailyGoalHours: v })}
            step={0.5}
            min={1}
            max={24}
            format={(v) => `${v}h`}
          />
        </Row>
      </Card>

      <Text style={styles.section}>Put-back-in nudge</Text>
      <Card>
        <Row label="Nudge me to put them back in" hint="A notification while your aligners are out">
          <Switch
            value={settings.reminderEnabled}
            onValueChange={(v) => updateSettings({ reminderEnabled: v })}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {settings.reminderEnabled && (
          <>
            <View style={styles.divider} />
            <Row label="Remind after" hint="Time out before the nudge">
              <Stepper
                value={settings.reminderThresholdMin}
                onChange={(v) => updateSettings({ reminderThresholdMin: v })}
                step={5}
                min={5}
                max={180}
                format={(v) => (v >= 60 ? `${(v / 60).toFixed(v % 60 === 0 ? 0 : 1)} hr` : `${v} min`)}
              />
            </Row>
          </>
        )}
      </Card>

      <Text style={styles.section}>Aligner tray</Text>
      <Card>
        <Text style={styles.fieldLabel}>Tray #1 start date</Text>
        <View style={styles.dateWrap}>
          <DateField value={tray.startDate} onChange={(v) => updateTray({ startDate: v })} />
        </View>
        <View style={styles.divider} />
        <Row label="Days per tray">
          <Stepper
            value={tray.durationDays}
            onChange={(v) => updateTray({ durationDays: v })}
            step={1}
            min={1}
            max={60}
            format={(v) => `${v} days`}
          />
        </Row>
        <View style={styles.divider} />
        <View style={styles.trayStatus}>
          <Text style={styles.trayStatusBig}>Tray {trayNum} · Day {dayNum} of {tray.durationDays}</Text>
          <Text style={styles.trayStatusText}>
            {daysLeft} day{daysLeft === 1 ? '' : 's'} until tray {trayNum + 1}
          </Text>
        </View>
      </Card>

      <Text style={styles.section}>Switch-tray reminder</Text>
      <Card>
        <Row label="Remind me to switch trays" hint="Fires on your switch day at this time">
          <Switch
            value={settings.traySwitchEnabled}
            onValueChange={(v) => updateSettings({ traySwitchEnabled: v })}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {settings.traySwitchEnabled && (
          <>
            <View style={styles.divider} />
            <TimeField
              label="Reminder time"
              minutesOfDay={parseHHMM(settings.trayReminderTime)}
              onChange={(v) => updateSettings({ trayReminderTime: toHHMM(v) })}
              minuteStep={5}
            />
            <View style={styles.nextReminder}>
              <Text style={styles.nextReminderText}>
                {switchLabel
                  ? `Next: switch to tray ${nextReminder!.nextTray} on ${switchLabel} at ${formatTimeOfDay(
                      parseHHMM(settings.trayReminderTime)
                    )}`
                  : 'No upcoming reminder'}
              </Text>
            </View>
          </>
        )}
      </Card>

      <Text style={styles.section}>Data &amp; backup</Text>
      <Card>
        <Text style={styles.backupHint}>
          Back up to a file you keep. Restore it after reinstalling or on a new phone — your history
          carries over.
        </Text>
        <View style={styles.backupRow}>
          <Pressable onPress={onExport} style={({ pressed }) => [styles.backupBtn, pressed && styles.pressed]}>
            <Text style={styles.backupBtnText}>⬆️  Export backup</Text>
          </Pressable>
          <Pressable onPress={onImport} style={({ pressed }) => [styles.backupBtn, pressed && styles.pressed]}>
            <Text style={styles.backupBtnText}>⬇️  Import backup</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />
        <Pressable onPress={confirmReset} style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}>
          <Text style={styles.resetText}>Reset all data</Text>
        </Pressable>
      </Card>

      <Text style={styles.footer}>SmileClock · all data stays on your phone</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { flex: 1, paddingRight: spacing.md },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  fieldHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dateWrap: { marginTop: spacing.md },
  trayStatus: { alignItems: 'center' },
  trayStatusBig: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  trayStatusText: { fontSize: 13, color: colors.muted, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  nextReminder: { backgroundColor: colors.primaryTint, borderRadius: radius.md, padding: spacing.md },
  nextReminderText: { color: colors.primaryDark, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  backupHint: { fontSize: 13, color: colors.muted, marginBottom: spacing.md, lineHeight: 18 },
  backupRow: { flexDirection: 'row', gap: spacing.md },
  backupBtn: {
    flex: 1,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backupBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  resetBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  resetText: { color: colors.danger, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.7 },
  footer: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: spacing.xl },
});

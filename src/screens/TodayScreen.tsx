import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import EditSessionModal from '../components/EditSessionModal';
import SwipeableRow from '../components/SwipeableRow';
import { Session } from '../types';
import { useStore } from '../store';
import { colors, radius, spacing } from '../theme';
import {
  currentTrayNumber,
  dayInTray,
  dateKey,
  effectiveDailyMinutes,
  formatClock,
  formatDuration,
  formatMinutes,
  sessionsOnDay,
} from '../utils/time';

export default function TodayScreen() {
  const {
    sessions,
    overrides,
    isWearing,
    openStart,
    settings,
    tray,
    toggle,
    addSession,
    updateSession,
    deleteSession,
  } = useStore();
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState<Session | null>(null);
  const [adding, setAdding] = useState(false);

  // Live tick every second so timers and the ring stay current.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey = dateKey(now);
  const todayMin = useMemo(
    () => effectiveDailyMinutes(sessions, overrides, now)[todayKey] ?? 0,
    [sessions, overrides, now, todayKey]
  );
  const todaySessions = useMemo(() => sessionsOnDay(sessions, todayKey, now), [sessions, todayKey, now]);

  const goalMin = settings.dailyGoalHours * 60;
  const fraction = goalMin > 0 ? todayMin / goalMin : 0;
  const remainingMin = Math.max(0, goalMin - todayMin);

  // Session/out timer.
  const lastEnd = useMemo(() => {
    let max = 0;
    for (const s of sessions) if (s.end !== null && s.end > max) max = s.end;
    return max;
  }, [sessions]);
  const timerMs = isWearing ? (openStart != null ? now - openStart : 0) : lastEnd ? now - lastEnd : 0;
  const ringColor = isWearing ? colors.wearing : colors.primary;
  const trayNum = currentTrayNumber(tray.startDate, tray.durationDays, now);
  const dayNum = dayInTray(tray.startDate, tray.durationDays, now);

  const dateLabel = new Date(now).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.date}>{dateLabel}</Text>

      <Card style={styles.ringCard}>
        <ProgressRing size={232} strokeWidth={20} fraction={fraction} color={ringColor}>
          <Text style={styles.ringTotal}>{formatMinutes(todayMin)}</Text>
          <Text style={styles.ringSub}>of {settings.dailyGoalHours}h goal</Text>
          <View style={[styles.pct, { backgroundColor: isWearing ? colors.wearing : colors.primary }]}>
            <Text style={styles.pctText}>{Math.round(fraction * 100)}%</Text>
          </View>
        </ProgressRing>
        <Text style={styles.remaining}>
          {remainingMin > 0
            ? `${formatMinutes(remainingMin)} left to hit your goal`
            : '🎉 Goal reached for today!'}
        </Text>
      </Card>

      <Card style={[styles.statusCard, { backgroundColor: isWearing ? '#ECFDF5' : colors.outTint }]}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: isWearing ? colors.wearing : colors.out }]} />
          <Text style={[styles.statusLabel, { color: isWearing ? colors.wearing : '#B45309' }]}>
            {isWearing ? 'Wearing aligners' : 'Aligners are out'}
          </Text>
        </View>
        <Text style={styles.timer}>{formatDuration(timerMs)}</Text>
        <Text style={styles.timerSub}>
          {sessions.length === 0 ? 'Tap below to start tracking' : isWearing ? 'this session' : 'out so far'}
        </Text>
      </Card>

      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.toggle,
          { backgroundColor: isWearing ? colors.out : colors.wearing },
          pressed && styles.togglePressed,
        ]}
      >
        <Text style={styles.toggleIcon}>{isWearing ? '🫦' : '🦷'}</Text>
        <Text style={styles.toggleText}>{isWearing ? 'Take them OUT' : 'Put them IN'}</Text>
      </Pressable>

      {/* Today's wear windows */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Today's sessions</Text>
        <Pressable onPress={() => setAdding(true)} hitSlop={8} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <Card style={styles.listCard}>
        {todaySessions.length === 0 ? (
          <Text style={styles.empty}>No sessions yet today. Tap the button above or “+ Add”.</Text>
        ) : (
          todaySessions.map((s, i) => {
            const ongoing = s.end === null;
            const durMin = ((s.end ?? now) - s.start) / 60000;
            return (
              <SwipeableRow
                key={s.id}
                topBorder={i > 0}
                onPress={() => setEditing(s)}
                onDelete={() => deleteSession(s.id)}
              >
                <View style={styles.sessionInner}>
                  <View style={[styles.sessionDot, { backgroundColor: ongoing ? colors.wearing : colors.primary }]} />
                  <Text style={styles.sessionTime}>
                    {formatClock(s.start)} – {ongoing ? 'now' : formatClock(s.end as number)}
                  </Text>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionDur}>{formatMinutes(durMin)}</Text>
                    <Text style={styles.editHint}>edit ›</Text>
                  </View>
                </View>
              </SwipeableRow>
            );
          })
        )}
      </Card>

      <Card style={styles.trayCard}>
        <Text style={styles.trayLabel}>Current aligner</Text>
        <Text style={styles.trayValue}>
          Tray {trayNum} · Day {dayNum} of {tray.durationDays}
        </Text>
      </Card>

      <EditSessionModal
        visible={editing !== null}
        session={editing}
        dayKey={todayKey}
        onClose={() => setEditing(null)}
        onSave={(start, end) => editing && updateSession(editing.id, { start, end })}
        onDelete={() => editing && deleteSession(editing.id)}
      />
      <EditSessionModal
        visible={adding}
        session={null}
        dayKey={todayKey}
        onClose={() => setAdding(false)}
        onSave={(start, end) => addSession(start, end ?? Date.now())}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  date: { fontSize: 16, fontWeight: '600', color: colors.muted, textAlign: 'center', marginBottom: spacing.md },
  ringCard: { alignItems: 'center', marginBottom: spacing.lg },
  ringTotal: { fontSize: 38, fontWeight: '800', color: colors.text },
  ringSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  pct: { marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  pctText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  remaining: { marginTop: spacing.lg, fontSize: 14, color: colors.muted, fontWeight: '500' },
  statusCard: { alignItems: 'center', marginBottom: spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  timer: { fontSize: 34, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  timerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  togglePressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  toggleIcon: { fontSize: 26, marginRight: spacing.sm },
  toggleText: { color: colors.white, fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  listTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primaryTint, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  addBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  listCard: { padding: 0, overflow: 'hidden' },
  empty: { color: colors.faint, fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  sessionInner: { flexDirection: 'row', alignItems: 'center' },
  sessionDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.md },
  sessionTime: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sessionDur: { fontSize: 14, color: colors.muted, fontWeight: '500' },
  editHint: { fontSize: 13, color: colors.faint },
  pressed: { opacity: 0.6 },
  trayCard: { marginTop: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trayLabel: { fontSize: 14, color: colors.muted },
  trayValue: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
});

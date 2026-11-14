import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import TimeField from './TimeField';
import { Session } from '../types';
import { colors, radius, spacing } from '../theme';
import { dateKey, dateKeyToMs, formatMinutes, minutesOfDay } from '../utils/time';

type Props = {
  visible: boolean;
  /** Session to edit, or null to add a new one. */
  session: Session | null;
  /** Day the new session belongs to (YYYY-MM-DD); ignored when editing. */
  dayKey: string;
  onClose: () => void;
  onSave: (start: number, end: number | null) => void;
  onDelete?: () => void;
};

export default function EditSessionModal({ visible, session, dayKey, onClose, onSave, onDelete }: Props) {
  const isEdit = session !== null;
  const baseDay = session ? dateKey(session.start) : dayKey;

  const [startMin, setStartMin] = useState(0);
  const [endMin, setEndMin] = useState(0);
  const [ongoing, setOngoing] = useState(false);

  // Seed fields whenever the modal opens for a (different) session.
  useEffect(() => {
    if (!visible) return;
    if (session) {
      setStartMin(minutesOfDay(session.start));
      setOngoing(session.end === null);
      setEndMin(session.end === null ? minutesOfDay(Date.now()) : minutesOfDay(session.end));
    } else {
      const nowMin = minutesOfDay(Date.now());
      setStartMin(Math.max(0, nowMin - 30));
      setEndMin(nowMin);
      setOngoing(false);
    }
  }, [visible, session]);

  const baseMs = dateKeyToMs(baseDay);
  const startTs = baseMs + startMin * 60000;
  const endTs = useMemo(() => {
    if (ongoing) return null;
    let e = baseMs + endMin * 60000;
    if (e <= startTs) e += 86400000; // wrap to next day (overnight wear)
    return e;
  }, [ongoing, baseMs, endMin, startTs]);

  const overnight = endTs !== null && endTs - startTs > 0 && endMin <= startMin;
  const durationLabel = ongoing
    ? 'In progress'
    : endTs !== null
    ? formatMinutes((endTs - startTs) / 60000)
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{isEdit ? 'Edit session' : 'Add session'}</Text>
          <Text style={styles.day}>
            {new Date(baseMs).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>

          <TimeField label="Put in" minutesOfDay={startMin} onChange={setStartMin} />

          {isEdit && session?.end === null && (
            <View style={styles.ongoingRow}>
              <Text style={styles.ongoingLabel}>Still wearing (no end yet)</Text>
              <Switch value={ongoing} onValueChange={setOngoing} trackColor={{ true: colors.primary }} />
            </View>
          )}

          {!ongoing && (
            <TimeField label="Took out" minutesOfDay={endMin} onChange={setEndMin} />
          )}

          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Duration: <Text style={styles.summaryStrong}>{durationLabel}</Text>
              {overnight ? '  (ends next day)' : ''}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
            onPress={() => {
              onSave(startTs, endTs);
              onClose();
            }}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>

          <View style={styles.footerRow}>
            {isEdit && onDelete ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  day: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: spacing.lg, marginTop: 2 },
  ongoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  ongoingLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  summary: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryText: { fontSize: 14, color: colors.primaryDark, textAlign: 'center' },
  summaryStrong: { fontWeight: '800' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  pressed: { opacity: 0.7 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  cancelText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
});

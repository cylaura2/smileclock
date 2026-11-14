import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Stepper from './Stepper';
import { colors, radius, spacing } from '../theme';
import { dateKeyToMs, formatMinutes } from '../utils/time';

type Props = {
  visible: boolean;
  dayKey: string | null;
  trackedMinutes: number; // computed from sessions
  overrideMinutes: number | undefined; // current manual override, if any
  onClose: () => void;
  onSave: (minutes: number) => void;
  onClear: () => void;
};

export default function DayEditModal({
  visible,
  dayKey,
  trackedMinutes,
  overrideMinutes,
  onClose,
  onSave,
  onClear,
}: Props) {
  const [hours, setHours] = useState(0);
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const seed = Math.round(overrideMinutes ?? trackedMinutes);
    setHours(Math.min(24, Math.floor(seed / 60)));
    setMins(seed % 60);
  }, [visible, dayKey, overrideMinutes, trackedMinutes]);

  if (!dayKey) return null;
  const total = hours * 60 + mins;
  const hasOverride = overrideMinutes !== undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Edit day total</Text>
          <Text style={styles.day}>
            {new Date(dateKeyToMs(dayKey)).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <Text style={styles.tracked}>Tracked from sessions: {formatMinutes(trackedMinutes)}</Text>

          <View style={styles.steppers}>
            <View style={styles.unit}>
              <Text style={styles.unitLabel}>Hours</Text>
              <Stepper value={hours} onChange={setHours} min={0} max={24} />
            </View>
            <View style={styles.unit}>
              <Text style={styles.unitLabel}>Minutes</Text>
              <Stepper value={mins} onChange={setMins} step={5} min={0} max={55} />
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Set total to <Text style={styles.summaryStrong}>{formatMinutes(total)}</Text>
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
            onPress={() => {
              onSave(total);
              onClose();
            }}
          >
            <Text style={styles.saveText}>Save override</Text>
          </Pressable>

          <View style={styles.footerRow}>
            {hasOverride ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  onClear();
                  onClose();
                }}
              >
                <Text style={styles.clearText}>Use tracked time</Text>
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
  day: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 2 },
  tracked: { fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  steppers: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.lg },
  unit: { alignItems: 'center' },
  unitLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
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
  clearText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  cancelText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Stepper from './Stepper';
import { colors, spacing } from '../theme';
import { formatTimeOfDay } from '../utils/time';

type Props = {
  label: string;
  minutesOfDay: number; // 0..1439
  onChange: (next: number) => void;
  minuteStep?: number;
};

/** Edit a time-of-day with hour/minute steppers; shows a 12h preview. */
export default function TimeField({ label, minutesOfDay, onChange, minuteStep = 5 }: Props) {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;

  const setHour = (h: number) => onChange(((h + 24) % 24) * 60 + minute);
  const setMinute = (m: number) => onChange(hour * 60 + ((m + 60) % 60));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.preview}>{formatTimeOfDay(minutesOfDay)}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.unit}>
          <Text style={styles.unitLabel}>Hour</Text>
          <Stepper value={hour} onChange={setHour} min={0} max={23} format={(v) => String(v).padStart(2, '0')} />
        </View>
        <View style={styles.unit}>
          <Text style={styles.unitLabel}>Min</Text>
          <Stepper
            value={minute}
            onChange={setMinute}
            step={minuteStep}
            min={0}
            max={59}
            format={(v) => String(v).padStart(2, '0')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  preview: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  row: { flexDirection: 'row', gap: spacing.xl },
  unit: { alignItems: 'center' },
  unitLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
});

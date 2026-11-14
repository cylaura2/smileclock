import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  label: string;
  minutesOfDay: number;
  onChange: (next: number) => void;
  minuteStep?: number; // ignored on web — the native picker uses 1-minute steps
};

function toHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function parse(s: string): number {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Web/PWA time field: renders a native <input type="time">. On iOS Safari this
 * shows the familiar scrolling wheel picker with 1-minute precision.
 */
export default function TimeField({ label, minutesOfDay, onChange }: Props) {
  const input = React.createElement('input', {
    type: 'time',
    value: toHHMM(minutesOfDay),
    onChange: (e: any) => onChange(parse(e.target.value)),
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: colors.primaryDark,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: '8px 12px',
      background: colors.white,
      fontFamily: 'inherit',
    },
  } as any);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {input}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
});

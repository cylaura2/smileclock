import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { dateKey, dateKeyToMs } from '../utils/time';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  /** Don't allow picking a date after today. */
  maxToday?: boolean;
};

export default function DateField({ value, onChange, maxToday = true }: Props) {
  const todayKey = dateKey(Date.now());
  const isToday = value === todayKey;

  const shift = (days: number) => {
    let next = dateKey(dateKeyToMs(value) + days * 86400000);
    if (maxToday && next > todayKey) next = todayKey;
    onChange(next);
  };

  const label = new Date(dateKeyToMs(value)).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Btn text="‹‹" onPress={() => shift(-7)} />
        <Btn text="‹" onPress={() => shift(-1)} />
        <Text style={styles.date}>{label}</Text>
        <Btn text="›" onPress={() => shift(1)} disabled={maxToday && isToday} />
        <Btn text="››" onPress={() => shift(7)} disabled={maxToday && isToday} />
      </View>
      {!isToday && (
        <Pressable onPress={() => onChange(todayKey)} hitSlop={6} style={styles.todayChip}>
          <Text style={styles.todayText}>Set to today</Text>
        </Pressable>
      )}
    </View>
  );
}

function Btn({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.btnText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  date: { minWidth: 150, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  todayChip: { marginTop: spacing.sm },
  todayText: { color: colors.faint, fontSize: 13, textDecorationLine: 'underline' },
});

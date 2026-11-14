import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
};

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  format = (v) => String(v),
}: Props) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, value <= min && styles.disabled]}
        onPress={dec}
        disabled={value <= min}
        hitSlop={6}
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{format(value)}</Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, value >= max && styles.disabled]}
        onPress={inc}
        disabled={value >= max}
        hitSlop={6}
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  btnText: { fontSize: 22, fontWeight: '600', color: colors.primaryDark, lineHeight: 24 },
  value: { minWidth: 76, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
});

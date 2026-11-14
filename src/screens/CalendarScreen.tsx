import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Card from '../components/Card';
import DayEditModal from '../components/DayEditModal';
import { useStore } from '../store';
import { colors, heatColor, heatTextColor, radius, spacing } from '../theme';
import { dailyMinutes, dateKey, effectiveDailyMinutes, formatMinutes } from '../utils/time';

export default function CalendarScreen() {
  const { sessions, overrides, settings, setDayOverride } = useStore();
  const now = Date.now();
  const goalMin = settings.dailyGoalHours * 60;
  const todayKey = dateKey(now);

  const [selected, setSelected] = useState<string | null>(null);

  const trackedByDay = useMemo(() => dailyMinutes(sessions, now), [sessions, now]);
  const effectiveByDay = useMemo(
    () => effectiveDailyMinutes(sessions, overrides, now),
    [sessions, overrides, now]
  );

  const monthPrefix = todayKey.slice(0, 7);
  const summary = useMemo(() => {
    const entries = Object.entries(effectiveByDay).filter(([k]) => k.startsWith(monthPrefix));
    const days = entries.length;
    const totalMin = entries.reduce((acc, [, m]) => acc + m, 0);
    const metGoal = entries.filter(([, m]) => m >= goalMin).length;
    const avg = days > 0 ? totalMin / days : 0;
    return { days, avg, metGoal };
  }, [effectiveByDay, monthPrefix, goalMin]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Wear history</Text>
      <Text style={styles.subtitle}>Tap any day to edit its total.</Text>

      <Card style={styles.calendarCard}>
        <Calendar
          maxDate={todayKey}
          theme={{
            todayTextColor: colors.primaryDark,
            monthTextColor: colors.text,
            textMonthFontWeight: '700',
            arrowColor: colors.primary,
          }}
          dayComponent={({ date, state }: any) => {
            if (!date) return <View style={styles.dayCell} />;
            const min = effectiveByDay[date.dateString] ?? 0;
            const fraction = goalMin > 0 ? min / goalMin : 0;
            const bg = heatColor(fraction);
            const isToday = date.dateString === todayKey;
            const isFuture = state === 'disabled';
            const hasOverride = overrides[date.dateString] !== undefined;
            const txt = min > 0 ? heatTextColor(fraction) : isFuture ? colors.faint : colors.text;
            return (
              <Pressable
                disabled={isFuture}
                onPress={() => setSelected(date.dateString)}
                style={({ pressed }) => [
                  styles.dayCell,
                  { backgroundColor: bg },
                  isToday && styles.todayCell,
                  pressed && styles.dayPressed,
                ]}
              >
                <Text style={[styles.dayNum, { color: txt }]}>{date.day}</Text>
                {min > 0 && <Text style={[styles.dayHours, { color: txt }]}>{(min / 60).toFixed(1)}h</Text>}
                {hasOverride && <View style={styles.overrideDot} />}
              </Pressable>
            );
          }}
        />
      </Card>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatMinutes(summary.avg)}</Text>
          <Text style={styles.summaryLabel}>avg / day this month</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {summary.metGoal}/{summary.days}
          </Text>
          <Text style={styles.summaryLabel}>days hit goal</Text>
        </Card>
      </View>

      <DayEditModal
        visible={selected !== null}
        dayKey={selected}
        trackedMinutes={selected ? trackedByDay[selected] ?? 0 : 0}
        overrideMinutes={selected ? overrides[selected] : undefined}
        onClose={() => setSelected(null)}
        onSave={(minutes) => selected && setDayOverride(selected, minutes)}
        onClear={() => selected && setDayOverride(selected, null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.md },
  calendarCard: { padding: spacing.sm },
  dayCell: { width: 40, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  todayCell: { borderWidth: 2, borderColor: colors.primaryDark },
  dayPressed: { opacity: 0.5 },
  dayNum: { fontSize: 14, fontWeight: '600' },
  dayHours: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  overrideDot: { position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryDark },
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  summaryLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' },
});

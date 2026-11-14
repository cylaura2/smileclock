export const colors = {
  bg: '#F1F6F8',
  card: '#FFFFFF',
  primary: '#14B8A6', // teal
  primaryDark: '#0F766E',
  primaryTint: '#CCFBF1',
  wearing: '#10B981', // green = in your mouth, good
  out: '#F59E0B', // amber = aligners out
  outTint: '#FEF3C7',
  text: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  track: '#E5EEF0',
  danger: '#EF4444',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

/** Heatmap color for a given compliance fraction (wear / goal). */
export function heatColor(fraction: number): string {
  if (fraction <= 0) return 'transparent';
  if (fraction >= 1) return '#0F766E';
  if (fraction >= 0.9) return '#10B981';
  if (fraction >= 0.75) return '#34D399';
  if (fraction >= 0.5) return '#FCD34D';
  return '#FDBA74';
}

/** Pick readable text color over a heatmap cell. */
export function heatTextColor(fraction: number): string {
  if (fraction <= 0) return colors.faint;
  if (fraction >= 0.75) return '#FFFFFF';
  return '#1F2937';
}

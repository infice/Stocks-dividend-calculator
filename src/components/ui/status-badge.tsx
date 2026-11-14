import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'positive' | 'warning' | 'danger' | 'neutral';
}) {
  const colors = useThemeColors();
  const palette = {
    positive: { foreground: colors.brand, background: colors.brandSoft },
    warning: { foreground: colors.warning, background: colors.warningSoft },
    danger: { foreground: colors.danger, background: colors.dangerSoft },
    neutral: { foreground: colors.textSecondary, background: colors.backgroundSelected },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  label: { fontSize: 12, fontWeight: '800' },
});

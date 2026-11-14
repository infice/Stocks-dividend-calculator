import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

export function MoneyRow({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const colors = useThemeColors();
  const valueColor = tone === 'positive' ? colors.brand : tone === 'negative' ? colors.danger : colors.text;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text> : null}
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700' },
  detail: { fontSize: 12, lineHeight: 17 },
  value: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

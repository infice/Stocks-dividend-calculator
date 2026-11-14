import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function SectionCard({
  children,
  title,
  description,
  trailing,
}: PropsWithChildren<{ title?: string; description?: string; trailing?: ReactNode }>) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      {title || trailing ? (
        <View style={styles.header}>
          <View style={styles.copy}>
            {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
            {description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
            ) : null}
          </View>
          {trailing}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 19 },
});

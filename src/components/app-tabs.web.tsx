import { Link, Slot, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

const tabs = [
  { href: '/', label: 'ภาพรวม', icon: '▥' },
  { href: '/portfolio', label: 'พอร์ต', icon: '▣' },
  { href: '/transactions', label: 'รายการ', icon: '☷' },
] as const;

export default function WebAppTabs() {
  const pathname = usePathname();
  const colors = useThemeColors();

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <View
        accessibilityRole="tablist"
        style={[
          styles.nav,
          { backgroundColor: colors.backgroundElement, borderTopColor: colors.border },
        ]}>
        {tabs.map((tab) => {
          const selected = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.tab}>
              <Text style={[styles.icon, { color: selected ? colors.brand : colors.textSecondary }]}>
                {tab.icon}
              </Text>
              <Text style={[styles.label, { color: selected ? colors.brand : colors.textSecondary }]}>
                {tab.label}
              </Text>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  content: { flex: 1, minHeight: 0 },
  nav: {
    minHeight: 72,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 9,
  },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 21, lineHeight: 24, fontWeight: '700' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});

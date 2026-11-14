import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

type AppScreenProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  showSettings?: boolean;
  showAdd?: boolean;
}>;

export function AppScreen({
  children,
  title,
  eyebrow,
  showSettings = true,
  showAdd = true,
}: AppScreenProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              {eyebrow ? (
                <Text style={[styles.eyebrow, { color: colors.brand }]}>{eyebrow}</Text>
              ) : null}
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
            </View>
            {showSettings ? (
              <Pressable
                accessibilityLabel="เปิดการตั้งค่า"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.iconText, { color: colors.text }]}>⚙</Text>
              </Pressable>
            ) : null}
          </View>
          {children}
          {showAdd ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/add')}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: colors.brand },
                pressed && styles.pressed,
              ]}>
              <Text style={styles.addButtonText}>＋ เพิ่มข้อมูล</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 112 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: Spacing.three,
  },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  iconButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 23 },
  addButton: {
    minHeight: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.four,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});

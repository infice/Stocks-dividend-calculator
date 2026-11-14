import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function DetailScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useThemeColors();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="ย้อนกลับ"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.backgroundElement, borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.backIcon, { color: colors.text }]}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  backButton: { width: 44, height: 44, borderRadius: Radius.medium, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 34, lineHeight: 36, marginTop: -3 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900' },
  spacer: { width: 44 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
  pressed: { opacity: 0.65 },
});

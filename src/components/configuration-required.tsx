import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function ConfigurationRequired() {
  const colors = useThemeColors();
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}><Text style={[styles.title, { color: colors.text }]}>ยังไม่ได้เชื่อม Supabase</Text><Text style={[styles.body, { color: colors.textSecondary }]}>เพิ่ม EXPO_PUBLIC_SUPABASE_URL และ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ในไฟล์ .env.local แล้วเริ่มแอปใหม่</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, justifyContent: 'center', padding: 20 }, card: { maxWidth: 560, width: '100%', alignSelf: 'center', borderWidth: 1, borderRadius: Radius.large, padding: 24, gap: 8 }, title: { fontSize: 22, fontWeight: '900' }, body: { fontSize: 14, lineHeight: 21 } });

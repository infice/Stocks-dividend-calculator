import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/providers/auth-provider';

export function UpdatePasswordScreen() {
  const colors = useThemeColors();
  const { error, isLoading, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const disabled = isLoading || password.length < 8 || password !== confirmation;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.wrap}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>ตั้งรหัสผ่านใหม่</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร แล้วเข้าสู่ระบบด้วยรหัสใหม่ได้ทันที</Text>
          <TextInput
            accessibilityLabel="รหัสผ่านใหม่"
            autoCapitalize="none"
            placeholder="รหัสผ่านใหม่"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <TextInput
            accessibilityLabel="ยืนยันรหัสผ่านใหม่"
            autoCapitalize="none"
            placeholder="ยืนยันรหัสผ่านใหม่"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmation}
            onChangeText={setConfirmation}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          {mismatch ? <Text style={[styles.message, { color: colors.danger }]}>รหัสผ่านทั้งสองช่องไม่ตรงกัน</Text> : null}
          {error ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.danger }]}>{error.message}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => void updatePassword(password)}
            style={({ pressed }) => [styles.primary, { backgroundColor: colors.brand }, (pressed || disabled) && styles.faded]}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>บันทึกรหัสผ่านใหม่</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', borderWidth: 1, borderRadius: Radius.large, padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 21 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: Radius.small, paddingHorizontal: 14, fontSize: 15 },
  message: { fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  faded: { opacity: 0.55 },
});

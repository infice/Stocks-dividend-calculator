import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { AuthButton, AuthFrame, AuthMark } from '@/components/auth-screen';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/providers/auth-provider';

export function AuthCallbackScreen({ initializing = false }: { initializing?: boolean }) {
  const colors = useThemeColors();
  const { callbackStatus, isPasswordRecovery, dismissCallback } = useAuth();
  const loading = initializing || callbackStatus === 'loading';
  const success = callbackStatus === 'success';
  return <AuthFrame>
    <AuthMark />
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
      {loading ? 'กำลังตรวจสอบบัญชี' : success ? isPasswordRecovery ? 'ตั้งรหัสผ่านใหม่ได้แล้ว' : 'ยืนยันอีเมลแล้ว' : 'เปิดลิงก์นี้ไม่ได้'}
    </Text>
    <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.textSecondary }]}>
      {loading ? 'รอสักครู่ เรากำลังเชื่อมต่ออย่างปลอดภัย' : success ? 'บัญชีของคุณพร้อมใช้งานแล้ว' : 'ลิงก์อาจหมดอายุ ถูกใช้แล้ว หรือเปิดจากคนละอุปกรณ์กับที่สมัคร ลองเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน หากยังไม่ได้ยืนยัน ให้ขอลิงก์ใหม่จากหน้าสมัครสมาชิก'}
    </Text>
    {loading ? <ActivityIndicator color={colors.brand} accessibilityLabel="กำลังตรวจสอบบัญชี" /> : <AuthButton label={success ? isPasswordRecovery ? 'ตั้งรหัสผ่านใหม่' : 'เริ่มใช้งาน' : 'กลับไปเข้าสู่ระบบ'} onPress={dismissCallback} />}
  </AuthFrame>;
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 40, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 26, textAlign: 'center' },
});

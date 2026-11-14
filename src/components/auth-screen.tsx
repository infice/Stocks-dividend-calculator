import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/providers/auth-provider';

type Mode = 'sign-in' | 'sign-up' | 'reset' | 'verify';

export function AuthScreen() {
  const colors = useThemeColors();
  const { error, isLoading, signIn, signUp, resendConfirmation, requestPasswordReset, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    if (!resendAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const changeMode = (next: Mode) => {
    clearError(); setNotice(''); setPassword(''); setMode(next);
  };

  const submit = async () => {
    setNotice('');
    try {
      if (mode === 'reset') {
        await requestPasswordReset(email.trim());
        setNotice('หากมีบัญชีนี้ในระบบ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ กรุณาตรวจสอบอีเมล');
      } else if (mode === 'sign-up') {
        await signUp(email.trim(), password);
        setPassword(''); setMode('verify'); setResendAt(Date.now() + 60000);
      } else {
        await signIn(email.trim(), password);
      }
    } catch { /* The provider presents the error while preserving form input. */ }
  };

  const resend = async () => {
    setNotice('');
    try {
      await resendConfirmation(email.trim());
      setResendAt(Date.now() + 60000);
      setNotice('ส่งลิงก์ใหม่แล้ว กรุณาใช้อีเมลฉบับล่าสุด');
    } catch { /* Keep the pending verification screen available for retry. */ }
  };

  const disabled = isLoading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    || (mode !== 'reset' && password.length < (mode === 'sign-up' ? 8 : 1));
  const verifying = mode === 'verify';

  return (
    <AuthFrame>
      <AuthMark />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {verifying ? 'เช็กอีเมลของคุณ' : mode === 'sign-up' ? 'สร้างบัญชีต้นทุน' : mode === 'reset' ? 'ลืมรหัสผ่าน?' : 'เข้าสู่ระบบต้นทุน'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {verifying ? 'เราได้ส่งลิงก์ยืนยันอีเมลไปที่' : mode === 'sign-up' ? 'เริ่มบันทึกการลงทุนของคุณในที่เดียว' : mode === 'reset' ? 'กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่' : 'ยินดีต้อนรับกลับมาดูแลพอร์ตของคุณ'}
        </Text>
        {verifying ? <Text selectable style={[styles.email, { color: colors.text }]}>{email.trim()}</Text> : null}
      </View>

      {verifying ? (
        <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>เปิดอีเมลแล้วกด “ยืนยันอีเมล” เพื่อเริ่มใช้งาน หากไม่พบ ลองตรวจสอบโฟลเดอร์สแปมหรือจดหมายขยะ</Text>
          <AuthButton label="ยืนยันแล้ว ไปเข้าสู่ระบบ" onPress={() => changeMode('sign-in')} disabled={isLoading} />
          <View style={styles.resend}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>ยังไม่ได้รับอีเมล?</Text>
            <AuthLink label={seconds > 0 ? `ส่งอีกครั้งใน ${seconds} วินาที` : 'ส่งอีเมลอีกครั้ง'} onPress={() => void resend()} disabled={isLoading || seconds > 0} />
          </View>
          <AuthLink label="ใช้อีเมลอื่น" onPress={() => changeMode('sign-up')} disabled={isLoading} />
        </>
      ) : (
        <>
          <Field label="อีเมล" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!isLoading} />
          {mode !== 'reset' ? <Field label="รหัสผ่าน" value={password} onChangeText={setPassword} placeholder={mode === 'sign-up' ? 'อย่างน้อย 8 ตัวอักษร' : 'กรอกรหัสผ่านของคุณ'} secureTextEntry autoCapitalize="none" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} editable={!isLoading} onSubmitEditing={() => { if (!disabled) void submit(); }} /> : null}
          {mode === 'sign-up' ? <Text style={[styles.hint, { color: colors.textSecondary }]}>ชื่อแสดงจะใช้ชื่อจากอีเมลของคุณโดยอัตโนมัติ</Text> : null}
          {mode === 'sign-in' ? <AuthLink label="ลืมรหัสผ่าน?" onPress={() => changeMode('reset')} disabled={isLoading} /> : null}
          <AuthButton label={mode === 'sign-up' ? 'สมัครสมาชิก' : mode === 'reset' ? 'ส่งลิงก์ตั้งรหัสผ่าน' : 'เข้าสู่ระบบ'} onPress={() => void submit()} disabled={disabled} loading={isLoading} />
          <View style={styles.resend}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{mode === 'sign-in' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}</Text>
            <AuthLink label={mode === 'sign-in' ? 'สมัครสมาชิก' : 'กลับไปเข้าสู่ระบบ'} onPress={() => changeMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} disabled={isLoading} />
          </View>
        </>
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.danger }]}>{error.message}</Text> : null}
      {error?.code === 'email_not_confirmed' && !verifying ? <AuthLink label="ส่งอีเมลยืนยันอีกครั้ง" onPress={() => { clearError(); setMode('verify'); }} disabled={isLoading} /> : null}
      {notice ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.brand }]}>{notice}</Text> : null}
    </AuthFrame>
  );
}

export function AuthFrame({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundElement }]}>
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.wrap}>
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthMark() {
  const colors = useThemeColors();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mark, { borderColor: colors.border, backgroundColor: colors.background }]}>
    <View style={[styles.envelope, { borderColor: colors.brand }]}><View style={[styles.flap, { borderColor: colors.brand }]} /></View>
  </View>;
}

export function AuthButton({ label, onPress, disabled, loading }: { label: string; onPress(): void; disabled?: boolean; loading?: boolean }) {
  const colors = useThemeColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, { backgroundColor: colors.brand }, (pressed || disabled) && styles.faded]}>
    {loading ? <ActivityIndicator color={colors.backgroundElement} accessibilityLabel="กำลังดำเนินการ" /> : <Text style={[styles.primaryText, { color: colors.backgroundElement }]}>{label}</Text>}
  </Pressable>;
}

export function AuthLink({ label, onPress, disabled }: { label: string; onPress(): void; disabled?: boolean }) {
  const colors = useThemeColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.linkTarget, pressed && styles.faded]}><Text style={[styles.link, { color: disabled ? colors.textSecondary : colors.brand }]}>{label}</Text></Pressable>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput {...props} accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholderTextColor={colors.textSecondary} selectionColor={colors.brand} style={[styles.input, { color: colors.text, borderColor: focused ? colors.brand : colors.border, backgroundColor: colors.backgroundElement }]} /></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: 20 },
  mark: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  envelope: { width: 26, height: 20, borderWidth: 2, borderRadius: 4, overflow: 'hidden', alignItems: 'center' },
  flap: { width: 17, height: 17, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ translateY: -10 }, { rotate: '45deg' }] },
  heading: { gap: 8, alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 40, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 26, textAlign: 'center' }, email: { fontSize: 16, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 24, textAlign: 'center' },
  field: { gap: 6 }, label: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  hint: { fontSize: 13, lineHeight: 22, marginTop: -12 },
  primary: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' }, faded: { opacity: 0.55 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 6 },
  linkTarget: { minHeight: 48, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 4 },
  link: { fontSize: 14, lineHeight: 24, fontWeight: '600', textAlign: 'center' }, message: { fontSize: 14, lineHeight: 24, textAlign: 'center' },
});


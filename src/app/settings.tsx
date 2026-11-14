import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { DetailScreen } from '@/components/ui/detail-screen';
import { SectionCard } from '@/components/ui/section-card';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuth } from '@/providers/auth-provider';
import { useFinancialData } from '@/providers/financial-data-provider';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { user, signOut, isLoading } = useAuth();
  const { snapshotState } = useFinancialData();
  return <DetailScreen title="ตั้งค่า">
    <SectionCard title="บัญชีผู้ใช้"><Row title={user?.email ?? 'ไม่ทราบอีเมล'} detail={`User ID ${user?.id ?? '—'}`} /><Row title="เซสชันและการซิงก์" detail={snapshotState.isStale ? 'ออฟไลน์ · ข้อมูลอาจไม่ล่าสุด' : `ออนไลน์ · ${snapshotState.data?.accounts.filter((account) => account.archived_at === null).length ?? 0} บัญชีที่ใช้งาน`} /></SectionCard>
    <SectionCard title="บัญชีและวิธีต้นทุน">{snapshotState.data?.accounts.length ? snapshotState.data.accounts.map((account) => <Row key={account.id} title={account.display_name} detail={`${account.broker_name} · ${account.base_currency} · ${account.cost_method}${account.archived_at ? ' · เก็บถาวร' : ''}`} onPress={() => router.push({ pathname: '/account-entry', params: { accountId: account.id } })} />) : <Row title="ยังไม่มีบัญชีโบรกเกอร์" detail="เพิ่มได้จากเมนู + เพิ่มข้อมูล" />}</SectionCard>
    <SectionCard title="AI และข้อมูลส่วนตัว"><Row title="ให้ AI อ่านไฟล์ใหม่" detail="ยังไม่เปิดใช้ และไม่มีการส่งไฟล์ออก" trailing={<Switch value={false} disabled trackColor={{ false: colors.border }} />} /><Row title="นำข้อมูลไปพัฒนาโมเดล" detail="ปิดโดยปริยาย" trailing={<Switch value={false} disabled trackColor={{ false: colors.border }} />} /></SectionCard>
    <SectionCard title="ข้อมูลและรายงาน"><Row title="Export PDF / CSV" detail="ยังไม่เปิดใช้จนกว่า snapshot/version จะพร้อม" /><Row title="ลบบัญชีและข้อมูล" detail="ยังไม่เปิดใช้จนกว่านโยบาย retention จะยืนยัน" danger /></SectionCard>
    <Pressable disabled={isLoading} onPress={() => void signOut()} style={[styles.signOut, { borderColor: colors.danger }]}><Text style={{ color: colors.danger, fontWeight: '900' }}>ออกจากระบบ</Text></Pressable>
    <Text style={[styles.version, { color: colors.textSecondary }]}>ต้นทุน · {Constants.expoConfig?.version ?? '—'}</Text>
  </DetailScreen>;
}

function Row({ title, detail, trailing, danger = false, onPress }: { title: string; detail: string; trailing?: React.ReactNode; danger?: boolean; onPress?: () => void }) { const colors = useThemeColors(); const content = <><View style={styles.copy}><Text style={[styles.title, { color: danger ? colors.danger : colors.text }]}>{title}</Text><Text style={[styles.detail, { color: colors.textSecondary }]}>{detail}</Text></View>{trailing}{onPress ? <Text style={{ color: colors.textSecondary }}>›</Text> : null}</>; return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]}>{content}</Pressable> : <View style={[styles.row, { borderBottomColor: colors.border }]}>{content}</View>; }
const styles = StyleSheet.create({ row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 8 }, copy: { flex: 1, gap: 2 }, title: { fontSize: 14, fontWeight: '800' }, detail: { fontSize: 11, lineHeight: 16 }, signOut: { minHeight: 50, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, version: { textAlign: 'center', fontSize: 12 } });

import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';

export default function PortfolioScreen() {
  const colors = useThemeColors();
  const { snapshotState, portfolio, refresh } = useFinancialData();
  const accounts = snapshotState.data?.accounts ?? [];
  const activeAccounts = accounts.filter((account) => account.archived_at === null);

  return <AppScreen title="พอร์ต" eyebrow="ข้อมูลจริงจาก Supabase">
    {snapshotState.status === 'loading' && !snapshotState.data ? <ActivityIndicator color={colors.brand} /> : null}
    {snapshotState.error ? <Pressable onPress={() => void refresh()} style={[styles.notice, { backgroundColor: snapshotState.status === 'offline' ? colors.warningSoft : colors.dangerSoft }]}><Text style={{ color: snapshotState.status === 'offline' ? colors.warning : colors.danger, fontWeight: '800' }}>{snapshotState.error.message} · แตะเพื่อลองใหม่</Text>{snapshotState.isStale ? <Text style={[styles.note, { color: colors.textSecondary }]}>กำลังแสดงข้อมูลล่าสุดที่มี ซึ่งอาจไม่ใช่ revision ปัจจุบัน</Text> : null}</Pressable> : null}

    {!accounts.length ? <SectionCard title="ยังไม่มีบัญชีโบรกเกอร์" description="เพิ่มบัญชีเพื่อเริ่มแยกต้นทุนและธุรกรรม"><Pressable onPress={() => router.push('/account-entry')} style={[styles.primary, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>เพิ่มบัญชีแรก</Text></Pressable></SectionCard> : <SectionCard title="บัญชีโบรกเกอร์" trailing={<StatusBadge label={`${activeAccounts.length} ใช้งาน`} tone="positive" />}>{accounts.map((account) => <View key={account.id} style={[styles.account, { borderBottomColor: colors.border }]}><View style={styles.flex}><Text style={[styles.accountName, { color: colors.text }]}>{account.display_name}</Text><Text style={[styles.note, { color: colors.textSecondary }]}>{account.broker_name} · {account.base_currency} · revision {account.data_revision}</Text></View><StatusBadge label={account.archived_at ? 'เก็บถาวร' : account.cost_method === 'FIFO' ? 'FIFO' : 'เฉลี่ย'} tone={account.archived_at ? 'neutral' : 'positive'} /></View>)}{!activeAccounts.length ? <Pressable onPress={() => router.push('/account-entry')} style={[styles.primary, { backgroundColor: colors.brand }]}><Text style={styles.primaryText}>เพิ่มบัญชีที่ใช้งาน</Text></Pressable> : null}</SectionCard>}

    <View style={styles.metrics}><Metric label="สินทรัพย์ที่ถือ" value={String(portfolio?.positions.length ?? 0)} /><Metric label="รายการขาย" value={String(portfolio?.realized.length ?? 0)} /></View>

    <SectionCard title="หุ้นและ ETF ที่ถือ" description="คำนวณจากรายการ CONFIRMED แยกตามบัญชีและสกุลเงิน">
      {portfolio?.positions.length ? portfolio.positions.map((position) => <View key={`${position.accountId}-${position.assetId}-${position.currency}`} style={[styles.position, { borderBottomColor: colors.border }]}><View style={[styles.symbol, { backgroundColor: colors.backgroundSelected }]}><Text style={[styles.symbolText, { color: colors.brand }]}>{position.symbol.slice(0, 2)}</Text></View><View style={styles.flex}><Text style={[styles.positionTitle, { color: colors.text }]}>{position.symbol}</Text><Text style={[styles.note, { color: colors.textSecondary }]}>{position.name} · {position.accountName}</Text></View><View style={styles.numbers}><Text style={[styles.quantity, { color: colors.text }]}>{position.quantity} หุ้น</Text><Text style={[styles.note, { color: colors.textSecondary }]}>{position.cost} {position.currency}</Text></View></View>) : <Empty text="ยังไม่มีหุ้นคงเหลือจากรายการที่ยืนยันแล้ว" />}
    </SectionCard>

    {portfolio?.issues.length ? <SectionCard title="รายการที่คำนวณไม่ได้" description="ระบบไม่ซ่อนความผิดพลาดของต้นทุน">{portfolio.issues.map((issue) => <Text key={issue.accountId} style={{ color: colors.danger }}>{issue.message}</Text>)}</SectionCard> : null}
  </AppScreen>;

  function Metric({ label, value }: { label: string; value: string }) { return <View style={[styles.metric, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}><Text style={[styles.note, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text></View>; }
  function Empty({ text }: { text: string }) { return <Text style={[styles.empty, { color: colors.textSecondary }]}>{text}</Text>; }
}

const styles = StyleSheet.create({ notice: { borderRadius: Radius.medium, padding: 14, gap: 3 }, note: { fontSize: 11, lineHeight: 16 }, primary: { minHeight: 48, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900' }, account: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, accountName: { fontSize: 14, fontWeight: '900' }, flex: { flex: 1 }, metrics: { flexDirection: 'row', gap: 12 }, metric: { flex: 1, borderWidth: 1, borderRadius: Radius.medium, padding: 16 }, metricValue: { fontSize: 26, fontWeight: '900' }, position: { flexDirection: 'row', alignItems: 'center', minHeight: 70, gap: 12, borderBottomWidth: 1 }, symbol: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, symbolText: { fontSize: 13, fontWeight: '900' }, positionTitle: { fontSize: 15, fontWeight: '900' }, numbers: { alignItems: 'flex-end' }, quantity: { fontSize: 13, fontWeight: '800' }, empty: { textAlign: 'center', paddingVertical: 24, fontSize: 13 } });

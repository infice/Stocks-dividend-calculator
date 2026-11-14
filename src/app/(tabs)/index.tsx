import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { MoneyRow } from '@/components/ui/money-row';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';

export default function OverviewScreen() {
  const colors = useThemeColors();
  const { snapshotState, portfolio, refresh } = useFinancialData();
  const pending = snapshotState.data?.trades.filter((trade) => trade.status !== 'CONFIRMED' && trade.status !== 'CANCELLED') ?? [];

  return <AppScreen title="ภาพรวม" eyebrow={snapshotState.isStale ? 'ข้อมูลอาจไม่ล่าสุด' : 'พอร์ตของฉัน'}>
    {snapshotState.error ? <Pressable onPress={() => void refresh()} style={[styles.notice, { backgroundColor: colors.warningSoft }]}><Text style={{ color: colors.warning, fontWeight: '800' }}>{snapshotState.error.message} · แตะเพื่อลองใหม่</Text></Pressable> : null}
    <Pressable accessibilityRole="button" onPress={() => router.push('/profit-source')} style={({ pressed }) => [styles.hero, { backgroundColor: colors.brand, opacity: pressed ? 0.82 : 1 }]}><View style={styles.heroHeader}><Text style={styles.heroLabel}>กำไร/ขาดทุนที่คำนวณได้</Text><Text style={styles.heroArrow}>›</Text></View>{portfolio?.totalsByCurrency.length ? portfolio.totalsByCurrency.map((total) => <Text key={total.currency} style={styles.heroValue}>{signed(total.realizedPnl)} {total.currency}</Text>) : <Text style={styles.heroValue}>ยังไม่มียอด</Text>}<Text style={styles.heroMeta}>{portfolio?.realized.length ?? 0} รายการขาย · คำนวณจากรายการยืนยันแล้วเท่านั้น</Text><View style={styles.heroFooter}><Text style={styles.heroLink}>ดูที่มาของตัวเลข</Text><Text style={styles.heroPending}>รอตรวจ {pending.length}</Text></View></Pressable>

    <SectionCard title="สรุปตามสกุลเงิน" description="ไม่รวม draft, fee ที่ไม่ทราบ หรือรายการที่คำนวณไม่ได้">
      {portfolio?.totalsByCurrency.length ? portfolio.totalsByCurrency.map((total) => <MoneyRow key={total.currency} label={`กำไร/ขาดทุนสุทธิ ${total.currency}`} value={`${signed(total.realizedPnl)} ${total.currency}`} tone={Number(total.realizedPnl) >= 0 ? 'positive' : 'negative'} />) : <Text style={[styles.empty, { color: colors.textSecondary }]}>เพิ่มและยืนยันรายการซื้อขายเพื่อเริ่มคำนวณ</Text>}
    </SectionCard>

    <SectionCard title="งานที่ต้องตรวจ" trailing={<StatusBadge label={`${pending.length} รายการ`} tone={pending.length ? 'warning' : 'positive'} />}>
      {pending.length ? pending.slice(0, 5).map((trade) => <View key={trade.id} style={styles.task}><View style={[styles.icon, { backgroundColor: colors.warningSoft }]}><Text style={{ color: colors.warning, fontWeight: '900' }}>!</Text></View><View style={styles.flex}><Text style={[styles.taskTitle, { color: colors.text }]}>{trade.status === 'DRAFT' ? 'ฉบับร่าง' : 'รอตรวจ'}</Text><Text style={[styles.taskDetail, { color: colors.textSecondary }]}>{trade.fee_status === 'UNKNOWN' ? 'ยังไม่ทราบค่าธรรมเนียม' : 'ข้อมูลยังไม่ถูกยืนยัน'} · revision {trade.revision}</Text></View></View>) : <Text style={[styles.empty, { color: colors.textSecondary }]}>ไม่มีงานค้าง</Text>}
    </SectionCard>

    {portfolio?.issues.length ? <SectionCard title="การคำนวณต้องแก้ไข" description="ยอดของบัญชีที่มีปัญหาถูกกันออก"><Text style={{ color: colors.danger }}>{portfolio.issues[0].message}</Text></SectionCard> : null}
  </AppScreen>;
}

const signed = (value: string) => Number(value) > 0 ? `+${value}` : value;
const styles = StyleSheet.create({ notice: { borderRadius: Radius.medium, padding: 14 }, hero: { borderRadius: Radius.large, padding: 20, gap: 8 }, heroHeader: { flexDirection: 'row' }, heroLabel: { color: '#D8F5E6', fontSize: 14, fontWeight: '700', flex: 1 }, heroArrow: { color: '#fff', fontSize: 30 }, heroValue: { color: '#fff', fontSize: 29, fontWeight: '900' }, heroMeta: { color: '#D8F5E6', fontSize: 12 }, heroFooter: { flexDirection: 'row', marginTop: 4 }, heroLink: { color: '#fff', fontWeight: '800', textDecorationLine: 'underline', flex: 1 }, heroPending: { color: '#fff', fontWeight: '700' }, empty: { textAlign: 'center', paddingVertical: 18, fontSize: 13 }, task: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, taskTitle: { fontSize: 14, fontWeight: '800' }, taskDetail: { fontSize: 11 } });

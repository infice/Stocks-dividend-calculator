import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DetailScreen } from '@/components/ui/detail-screen';
import { MoneyRow } from '@/components/ui/money-row';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';

export default function ProfitSourceScreen() {
  const colors = useThemeColors();
  const { portfolio, snapshotState } = useFinancialData();
  const trades = useMemo(() => new Map(snapshotState.data?.trades.map((trade) => [trade.id, trade]) ?? []), [snapshotState.data?.trades]);
  const assets = useMemo(() => new Map(snapshotState.data?.assets.map((asset) => [asset.id, asset]) ?? []), [snapshotState.data?.assets]);

  return <DetailScreen title="ที่มาของกำไร">
    <View style={[styles.summary, { backgroundColor: colors.brandSoft }]}><Text style={[styles.summaryLabel, { color: colors.brand }]}>ยอดจากรายการที่คำนวณสำเร็จ</Text>{portfolio?.totalsByCurrency.length ? portfolio.totalsByCurrency.map((total) => <Text key={total.currency} style={[styles.summaryValue, { color: colors.brand }]}>{total.realizedPnl} {total.currency}</Text>) : <Text style={[styles.summaryValue, { color: colors.brand }]}>ยังไม่มียอด</Text>}<Text style={[styles.meta, { color: colors.textSecondary }]}>{portfolio?.realized.length ?? 0} รายการขาย · sync {snapshotState.data ? new Date(snapshotState.data.syncedAt).toLocaleString('th-TH') : '—'}</Text></View>
    <SectionCard title="รายการขาย" description="gross proceeds − fee − matched cost"><StatusBadge label="วิธีตามแต่ละบัญชี" tone="positive" />{portfolio?.realized.length ? portfolio.realized.map((item) => { const trade = trades.get(item.sellTradeId); const asset = assets.get(item.assetId); return <View key={item.sellTradeId} style={[styles.sale, { borderBottomColor: colors.border }]}><View style={styles.header}><Text style={[styles.title, { color: colors.text }]}>{asset?.symbol ?? 'ไม่ทราบ'} · {trade?.executed_at ? new Date(trade.executed_at).toLocaleDateString('th-TH') : ''}</Text><StatusBadge label={item.method === 'FIFO' ? 'FIFO' : 'เฉลี่ย'} tone="neutral" /></View><MoneyRow label="ยอดขายรวม" value={`${item.grossProceeds} ${item.currency}`} /><MoneyRow label="เงินขายสุทธิ" value={`${item.netProceeds} ${item.currency}`} /><MoneyRow label="ต้นทุนที่จับคู่" value={`${item.matchedCost} ${item.currency}`} /><MoneyRow label="กำไร/ขาดทุน" value={`${item.realizedPnl} ${item.currency}`} tone={Number(item.realizedPnl) >= 0 ? 'positive' : 'negative'} /></View>; }) : <Text style={[styles.empty, { color: colors.textSecondary }]}>ยังไม่มีรายการขายที่คำนวณได้</Text>}</SectionCard>
    <View style={[styles.note, { borderColor: colors.border }]}><Text style={[styles.title, { color: colors.text }]}>สถานะหลักฐานยังแยกจากการคำนวณ</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>ยอดนี้คำนวณจากข้อมูลที่กรอกและยืนยันแล้วเท่านั้น ไม่อ้างว่ามีเอกสารหรือกระทบยอดจนกว่าจะเชื่อมหลักฐานจริง</Text></View>
  </DetailScreen>;
}

const styles = StyleSheet.create({ summary: { borderRadius: Radius.large, padding: 20, gap: 5 }, summaryLabel: { fontSize: 14, fontWeight: '800' }, summaryValue: { fontSize: 28, fontWeight: '900' }, meta: { fontSize: 11, lineHeight: 17 }, sale: { gap: 8, borderBottomWidth: 1, paddingBottom: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { flex: 1, fontSize: 14, fontWeight: '800' }, empty: { textAlign: 'center', paddingVertical: 24 }, note: { borderWidth: 1, borderRadius: Radius.medium, padding: 16, gap: 4 } });

import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';
import type { TradeStatus } from '@/types/database';

const filters = ['ALL', 'NEEDS_REVIEW', 'DRAFT'] as const;
type Filter = (typeof filters)[number];
const labels: Record<Filter, string> = { ALL: 'ทั้งหมด', NEEDS_REVIEW: 'รอตรวจ', DRAFT: 'ฉบับร่าง' };

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const { snapshotState, refresh } = useFinancialData();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const assets = useMemo(() => new Map(snapshotState.data?.assets.map((asset) => [asset.id, asset]) ?? []), [snapshotState.data?.assets]);
  const accounts = useMemo(() => new Map(snapshotState.data?.accounts.map((account) => [account.id, account]) ?? []), [snapshotState.data?.accounts]);
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleUpperCase('en-US');
    return (snapshotState.data?.trades ?? []).filter((trade) => {
      if (filter !== 'ALL' && trade.status !== filter) return false;
      if (!normalizedQuery) return true;
      const asset = assets.get(trade.asset_id);
      const account = accounts.get(trade.broker_account_id);
      return [asset?.symbol, asset?.market, asset?.name, account?.display_name, account?.broker_name]
        .some((value) => value?.toLocaleUpperCase('en-US').includes(normalizedQuery));
    });
  }, [accounts, assets, filter, query, snapshotState.data?.trades]);

  return <AppScreen title="รายการ" eyebrow={snapshotState.isStale ? 'ข้อมูลออฟไลน์ · อาจไม่ล่าสุด' : 'ซิงก์จาก Supabase'}>
    {snapshotState.error ? <Pressable onPress={() => void refresh()} style={[styles.notice, { backgroundColor: colors.warningSoft }]}><Text style={{ color: colors.warning, fontWeight: '800' }}>{snapshotState.error.message} · แตะเพื่อลองใหม่</Text></Pressable> : null}
    <TextInput accessibilityLabel="ค้นหารายการ" value={query} onChangeText={setQuery} placeholder="ค้นหาหุ้น ตลาด หรือบัญชี" placeholderTextColor={colors.textSecondary} autoCapitalize="characters" autoCorrect={false} style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement }]} />
    <View accessibilityRole="tablist" style={[styles.filters, { backgroundColor: colors.backgroundSelected }]}>{filters.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, filter === item && { backgroundColor: colors.backgroundElement }]}><Text style={[styles.filterText, { color: filter === item ? colors.text : colors.textSecondary }]}>{labels[item]}</Text></Pressable>)}</View>
    <SectionCard title={filter === 'ALL' ? 'รายการล่าสุด' : labels[filter]} description={`${visible.length} รายการ`}>
      {visible.length ? visible.map((trade) => {
        const asset = assets.get(trade.asset_id);
        const account = accounts.get(trade.broker_account_id);
        const tone = trade.status === 'CONFIRMED' ? 'positive' : trade.status === 'NEEDS_REVIEW' ? 'warning' : trade.status === 'CANCELLED' ? 'danger' : 'neutral';
        return <Pressable accessibilityRole="button" accessibilityLabel={`เปิดรายการ ${asset?.symbol ?? ''}`} key={trade.id} onPress={() => router.push({ pathname: '/trade-entry', params: { tradeId: trade.id } })} style={[styles.transaction, { borderBottomColor: colors.border }]}><View style={[styles.sideIcon, { backgroundColor: trade.side === 'SELL' ? colors.brandSoft : colors.backgroundSelected }]}><Text style={[styles.sideIconText, { color: trade.side === 'SELL' ? colors.brand : colors.text }]}>{trade.side === 'SELL' ? '↗' : '↘'}</Text></View><View style={styles.flex}><View style={styles.titleRow}><Text style={[styles.title, { color: colors.text }]}>{trade.side === 'SELL' ? 'ขาย' : 'ซื้อ'} {asset?.symbol ?? 'ไม่ทราบ'}</Text><StatusBadge label={statusLabel(trade.status)} tone={tone} /></View><Text style={[styles.detail, { color: colors.textSecondary }]}>{trade.quantity ?? '—'} หุ้น × {trade.unit_price ?? '—'} {trade.currency ?? ''}</Text><Text style={[styles.detail, { color: colors.textSecondary }]}>{account?.display_name ?? 'บัญชีไม่ทราบ'} · {trade.executed_at ? new Date(trade.executed_at).toLocaleString('th-TH') : 'ยังไม่มีวันเวลา'} · revision {trade.revision}</Text></View><Text style={[styles.amount, { color: trade.side === 'SELL' ? colors.brand : colors.text }]}>{trade.fee_status === 'UNKNOWN' ? 'fee ?' : `${trade.fee ?? '0'} fee`}</Text></Pressable>;
      }) : <View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>ยังไม่มีรายการ</Text><Text style={[styles.detail, { color: colors.textSecondary }]}>เพิ่มรายการซื้อหรือขายจากปุ่มด้านล่าง</Text></View>}
    </SectionCard>
  </AppScreen>;
}

function statusLabel(status: TradeStatus) { return ({ DRAFT: 'ฉบับร่าง', NEEDS_REVIEW: 'รอตรวจ', CONFIRMED: 'ยืนยันแล้ว', CANCELLED: 'ยกเลิก' } as const)[status]; }

const styles = StyleSheet.create({ notice: { borderRadius: Radius.medium, padding: 14 }, search: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: 14, fontSize: 14 }, filters: { flexDirection: 'row', borderRadius: Radius.medium, padding: 4, gap: 4 }, filter: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, filterText: { fontSize: 13, fontWeight: '800' }, transaction: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, paddingVertical: 10 }, sideIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, sideIconText: { fontSize: 21, fontWeight: '900' }, flex: { flex: 1, gap: 2 }, titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, title: { fontSize: 14, fontWeight: '900' }, detail: { fontSize: 11, lineHeight: 16 }, amount: { fontSize: 11, fontWeight: '900' }, empty: { alignItems: 'center', paddingVertical: 32, gap: 4 }, emptyTitle: { fontSize: 16, fontWeight: '800' } });

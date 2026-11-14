import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { DetailScreen } from '@/components/ui/detail-screen';
import { SectionCard } from '@/components/ui/section-card';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';
import { findOrCreateAsset, mapDataAccessError, saveTrade } from '@/services/financial-repository';
import type { AssetRow, TradeRow, TradeStatus } from '@/types/database';

export default function TradeEntryScreen() {
  const { side, tradeId: tradeIdParam } = useLocalSearchParams<{ side?: string; tradeId?: string }>();
  const { snapshotState } = useFinancialData();
  const tradeToEdit = useMemo(
    () => snapshotState.data?.trades.find((trade) => trade.id === tradeIdParam),
    [snapshotState.data?.trades, tradeIdParam],
  );
  const assetToEdit = useMemo(
    () => snapshotState.data?.assets.find((asset) => asset.id === tradeToEdit?.asset_id),
    [snapshotState.data?.assets, tradeToEdit?.asset_id],
  );

  if (tradeIdParam && !snapshotState.data) {
    return <DetailScreen title="กำลังโหลดรายการ"><ActivityIndicator /></DetailScreen>;
  }
  if (tradeIdParam && (!tradeToEdit || !assetToEdit)) {
    return <DetailScreen title="ไม่พบรายการ"><SectionCard title="รายการนี้ไม่มีอยู่หรือถูกเปลี่ยนแล้ว" description="กลับไปหน้ารายการแล้วโหลดข้อมูลล่าสุดอีกครั้ง" /></DetailScreen>;
  }

  return <TradeEntryForm key={tradeToEdit?.id ?? 'new-trade'} requestedSide={side} tradeToEdit={tradeToEdit} assetToEdit={assetToEdit} />;
}

function TradeEntryForm({ requestedSide, tradeToEdit, assetToEdit }: { requestedSide?: string; tradeToEdit?: TradeRow; assetToEdit?: AssetRow }) {
  const colors = useThemeColors();
  const { snapshotState, refresh } = useFinancialData();
  const accounts = useMemo(
    () => snapshotState.data?.accounts.filter((account) => account.archived_at === null) ?? [],
    [snapshotState.data?.accounts],
  );
  const isEditing = Boolean(tradeToEdit);
  const editingArchivedAccount = Boolean(snapshotState.data?.accounts.find((account) => account.id === tradeToEdit?.broker_account_id)?.archived_at);
  const isSell = tradeToEdit?.side === 'SELL' || (!tradeToEdit && requestedSide === 'SELL');
  const [selectedAccountId, setSelectedAccountId] = useState(tradeToEdit?.broker_account_id ?? accounts[0]?.id ?? '');
  const accountId = selectedAccountId || accounts[0]?.id || '';
  const [market, setMarket] = useState(assetToEdit?.market ?? 'NASDAQ');
  const [symbol, setSymbol] = useState(assetToEdit?.symbol ?? '');
  const [assetName, setAssetName] = useState(assetToEdit?.name ?? '');
  const [quantity, setQuantity] = useState(tradeToEdit?.quantity ?? '');
  const [unitPrice, setUnitPrice] = useState(tradeToEdit?.unit_price ?? '');
  const [fee, setFee] = useState(tradeToEdit?.fee ?? '0');
  const [feeKnown, setFeeKnown] = useState(tradeToEdit ? tradeToEdit.fee_status === 'KNOWN' : true);
  const [currency, setCurrency] = useState(tradeToEdit?.currency ?? accounts[0]?.base_currency ?? 'USD');
  const [executedAt, setExecutedAt] = useState(tradeToEdit?.executed_at ?? new Date().toISOString());
  const [externalReference, setExternalReference] = useState(tradeToEdit?.external_reference ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cancelArmed, setCancelArmed] = useState(false);
  const newTradeId = useRef(randomUUID());
  const tradeRequestId = useRef(randomUUID());
  const assetId = useRef(randomUUID());
  const assetRequestId = useRef(randomUUID());

  const existingAsset = useMemo(() => snapshotState.data?.assets.find((asset) => asset.market === market.trim().toUpperCase() && asset.symbol === symbol.trim().toUpperCase()), [market, snapshotState.data?.assets, symbol]);

  const submit = async (status: TradeStatus) => {
    if (!accountId) { setError('เพิ่มบัญชีโบรกเกอร์ก่อนบันทึกรายการ'); return; }
    if (!market.trim() || !symbol.trim()) { setError('กรอกตลาดและสัญลักษณ์สินทรัพย์'); return; }
    if (status === 'CONFIRMED' && (!isPositive(quantity) || !isNonNegative(unitPrice) || !feeKnown || !isNonNegative(fee) || !isIsoDate(executedAt))) {
      setError('รายการยืนยันต้องมีจำนวน ราคา ค่าธรรมเนียม และวันเวลา ISO ที่ถูกต้อง'); return;
    }
    if (currency.trim().length !== 3) { setError('สกุลเงินต้องเป็นรหัส 3 ตัวอักษร'); return; }

    setSaving(true); setError('');
    try {
      const asset = assetToEdit ?? existingAsset ?? await findOrCreateAsset({ id: assetId.current, idempotencyKey: assetRequestId.current, market, symbol, name: assetName });
      await saveTrade({
        id: tradeToEdit?.id ?? newTradeId.current, expectedRevision: tradeToEdit?.revision ?? 0,
        idempotencyKey: tradeRequestId.current, brokerAccountId: accountId, assetId: asset.id,
        side: isSell ? 'SELL' : 'BUY', status,
        evidenceStatus: status === 'CANCELLED' ? (tradeToEdit?.evidence_status ?? 'NONE') : status === 'CONFIRMED' ? 'CALCULABLE' : 'NONE',
        executedAt: executedAt.trim() || null, quantity: quantity.trim() || null, unitPrice: unitPrice.trim() || null,
        fee: feeKnown ? (fee.trim() || '0') : null, feeStatus: feeKnown ? 'KNOWN' : 'UNKNOWN', currency: currency.trim() || null,
        externalReference: externalReference.trim() || null,
      });
      await refresh();
      router.replace('/transactions');
    } catch (cause) { setError(mapDataAccessError(cause).message); }
    finally { setSaving(false); }
  };

  if (!accounts.length && !isEditing) {
    return <DetailScreen title={`${isSell ? 'ขาย' : 'ซื้อ'}หุ้น / ETF`}><SectionCard title="ต้องมีบัญชีโบรกเกอร์ก่อน" description="รายการซื้อขายต้องผูกกับบัญชีเพื่อไม่ให้ต้นทุนข้ามบัญชี"><Pressable onPress={() => router.push('/account-entry')} style={[styles.button, { backgroundColor: colors.brand }]}><Text style={styles.buttonText}>เพิ่มบัญชีโบรกเกอร์</Text></Pressable></SectionCard></DetailScreen>;
  }

  return <DetailScreen title={`${isEditing ? 'แก้ไข' : ''}${isSell ? 'ขาย' : 'ซื้อ'}หุ้น / ETF`}>
    <SectionCard title="บัญชีโบรกเกอร์" description={isEditing ? 'บัญชีและสินทรัพย์เปลี่ยนไม่ได้หลังสร้างรายการ' : 'เลือกบัญชีที่รายการนี้เกิดขึ้น'}>
      <View style={styles.chips}>{accounts.map((account) => <Pressable key={account.id} disabled={isEditing} onPress={() => { setSelectedAccountId(account.id); setCurrency(account.base_currency); }} style={[styles.chip, { borderColor: accountId === account.id ? colors.brand : colors.border, backgroundColor: accountId === account.id ? colors.brandSoft : colors.background }, isEditing && accountId !== account.id && styles.disabled]}><Text style={{ color: accountId === account.id ? colors.brand : colors.text, fontWeight: '800' }}>{account.display_name}</Text></Pressable>)}</View>
    </SectionCard>
    {editingArchivedAccount ? <Text style={[styles.cancelled, { color: colors.warning, backgroundColor: colors.warningSoft }]}>บัญชีนี้ถูกเก็บถาวร ต้องนำกลับมาใช้งานจากหน้าตั้งค่าก่อนแก้ไขรายการ</Text> : null}
    <SectionCard title="รายละเอียดรายการ" description={isEditing ? `revision ${tradeToEdit?.revision ?? '—'} · ทุกการแก้ไขถูกบันทึกใน audit trail` : 'สินทรัพย์ใหม่จะถูกสร้างในบัญชีของคุณโดยอัตโนมัติ'}>
      <View style={styles.pair}><View style={styles.flex}><Field label="ตลาด" value={market} onChangeText={setMarket} editable={!isEditing} autoCapitalize="characters" /></View><View style={styles.flex}><Field label="หุ้น / ETF" value={symbol} onChangeText={setSymbol} editable={!isEditing} autoCapitalize="characters" /></View></View>
      <Field label="ชื่อสินทรัพย์ (ไม่บังคับ)" value={assetName} onChangeText={setAssetName} editable={!isEditing} />
      <View style={styles.pair}><View style={styles.flex}><Field label="จำนวน" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="ราคาต่อหน่วย" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" /></View></View>
      <View style={styles.toggle}><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>ทราบค่าธรรมเนียม</Text><Text style={[styles.help, { color: colors.textSecondary }]}>หากไม่ทราบจะบันทึกเป็นฉบับร่างเท่านั้น</Text></View><Switch value={feeKnown} onValueChange={setFeeKnown} /></View>
      <View style={styles.pair}><View style={styles.flex}><Field label="ค่าธรรมเนียม" value={fee} onChangeText={setFee} editable={feeKnown} keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="สกุลเงิน" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} /></View></View>
      <Field label="วันและเวลา ISO 8601" value={executedAt} onChangeText={setExecutedAt} autoCapitalize="none" />
      <Field label="เลขอ้างอิงจากโบรกเกอร์ (ไม่บังคับ)" value={externalReference} onChangeText={setExternalReference} autoCapitalize="characters" autoCorrect={false} />
    </SectionCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    {tradeToEdit?.status === 'CANCELLED' ? <Text style={[styles.cancelled, { color: colors.danger, backgroundColor: colors.dangerSoft }]}>รายการนี้ถูกยกเลิกแล้วและเก็บไว้ในประวัติ</Text> : <>
      <View style={styles.actions}><Pressable disabled={saving || editingArchivedAccount} onPress={() => void submit('DRAFT')} style={[styles.secondary, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, editingArchivedAccount && styles.disabled]}><Text style={[styles.secondaryText, { color: colors.text }]}>บันทึกฉบับร่าง</Text></Pressable><Pressable disabled={saving || !feeKnown || editingArchivedAccount} onPress={() => void submit('CONFIRMED')} style={[styles.button, { backgroundColor: colors.brand }, (!feeKnown || saving || editingArchivedAccount) && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ยืนยันรายการ</Text>}</Pressable></View>
      {isEditing ? <Pressable disabled={saving || editingArchivedAccount} onPress={() => cancelArmed ? void submit('CANCELLED') : setCancelArmed(true)} style={[styles.cancelButton, { borderColor: colors.danger }, editingArchivedAccount && styles.disabled]}><Text style={{ color: colors.danger, fontWeight: '900' }}>{cancelArmed ? 'แตะอีกครั้งเพื่อยืนยันการยกเลิก' : 'ยกเลิกรายการนี้'}</Text></Pressable> : null}
    </>}
  </DetailScreen>;
}

const isPositive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
const isNonNegative = (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0;
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { const colors = useThemeColors(); return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: props.editable === false ? colors.backgroundSelected : colors.background }]} /></View>; }

const styles = StyleSheet.create({ field: { gap: 7 }, label: { fontSize: 12, fontWeight: '800' }, help: { fontSize: 11, marginTop: 3 }, input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.small, paddingHorizontal: 13, fontSize: 13 }, pair: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 42, borderWidth: 1, borderRadius: Radius.pill, justifyContent: 'center', paddingHorizontal: 14 }, toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 }, actions: { flexDirection: 'row', gap: 10 }, button: { flex: 1, minHeight: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, buttonText: { color: '#fff', fontWeight: '900', textAlign: 'center' }, secondary: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, secondaryText: { fontWeight: '900', textAlign: 'center' }, cancelButton: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, cancelled: { borderRadius: Radius.medium, padding: 14, fontWeight: '800' }, disabled: { opacity: 0.5 }, error: { fontSize: 12, lineHeight: 18 } });

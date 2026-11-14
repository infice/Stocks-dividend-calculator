import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DetailScreen } from '@/components/ui/detail-screen';
import { SectionCard } from '@/components/ui/section-card';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useFinancialData } from '@/providers/financial-data-provider';
import { mapDataAccessError, saveBrokerAccount } from '@/services/financial-repository';
import type { BrokerAccountRow, CostMethod } from '@/types/database';

export default function AccountEntryScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const { snapshotState } = useFinancialData();
  const account = snapshotState.data?.accounts.find((item) => item.id === accountId);
  if (accountId && !snapshotState.data) {
    return <DetailScreen title="กำลังโหลดบัญชี"><ActivityIndicator /></DetailScreen>;
  }
  if (accountId && !account) {
    return <DetailScreen title="ไม่พบบัญชี"><SectionCard title="บัญชีนี้ไม่มีอยู่หรือถูกเปลี่ยนแล้ว" description="กลับไปหน้าตั้งค่าแล้วโหลดข้อมูลล่าสุดอีกครั้ง" /></DetailScreen>;
  }
  return <AccountEntryForm key={account?.id ?? 'new-account'} account={account} />;
}

function AccountEntryForm({ account }: { account?: BrokerAccountRow }) {
  const colors = useThemeColors();
  const { snapshotState, refresh } = useFinancialData();
  const hasTrades = snapshotState.data?.trades.some((trade) => trade.broker_account_id === account?.id) ?? false;
  const [brokerName, setBrokerName] = useState(account?.broker_name ?? '');
  const [displayName, setDisplayName] = useState(account?.display_name ?? '');
  const [currency, setCurrency] = useState(account?.base_currency ?? 'USD');
  const [costMethod, setCostMethod] = useState<CostMethod>(account?.cost_method ?? 'FIFO');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [archiveArmed, setArchiveArmed] = useState(false);
  const entityId = useRef(randomUUID());
  const idempotencyKey = useRef(randomUUID());

  const submit = async (archived = Boolean(account?.archived_at)) => {
    if (!brokerName.trim() || !displayName.trim() || !/^[A-Za-z]{3}$/.test(currency.trim())) {
      setError('กรอกชื่อโบรกเกอร์ ชื่อบัญชี และสกุลเงิน 3 ตัวอักษรให้ครบ');
      return;
    }
    setSaving(true); setError('');
    try {
      await saveBrokerAccount({
        id: account?.id ?? entityId.current,
        expectedRevision: account?.revision ?? 0,
        idempotencyKey: idempotencyKey.current,
        brokerName,
        displayName,
        baseCurrency: currency,
        costMethod,
        archived,
      });
      await refresh();
      router.back();
    } catch (cause) {
      setError(mapDataAccessError(cause).message);
    } finally { setSaving(false); }
  };

  return <DetailScreen title={account ? 'แก้ไขบัญชีโบรกเกอร์' : 'เพิ่มบัญชีโบรกเกอร์'}>
    <SectionCard title="รายละเอียดบัญชี" description={account ? `revision ${account.revision} · ทุกการแก้ไขถูกบันทึกใน audit trail` : 'ข้อมูลทุกบัญชีแยกต้นทุนและรายการออกจากกัน'}>
      <Field label="โบรกเกอร์" value={brokerName} onChangeText={setBrokerName} placeholder="เช่น Interactive Brokers" />
      <Field label="ชื่อเรียกบัญชี" value={displayName} onChangeText={setDisplayName} placeholder="เช่น บัญชีหลัก" />
      <Field label="สกุลเงินหลัก" value={currency} onChangeText={setCurrency} editable={!hasTrades} autoCapitalize="characters" placeholder="USD" maxLength={3} />
      <Text style={[styles.label, { color: colors.text }]}>วิธีต้นทุน</Text>
      <View style={styles.choices}>{(['FIFO', 'MOVING_AVERAGE'] as const).map((method) => <Pressable key={method} disabled={hasTrades} onPress={() => setCostMethod(method)} style={[styles.choice, { borderColor: costMethod === method ? colors.brand : colors.border, backgroundColor: costMethod === method ? colors.brandSoft : colors.background }, hasTrades && method !== costMethod && styles.disabled]}><Text style={{ color: costMethod === method ? colors.brand : colors.text, fontWeight: '800' }}>{method === 'FIFO' ? 'FIFO' : 'เฉลี่ยเคลื่อนที่'}</Text></Pressable>)}</View>
      {hasTrades ? <Text style={[styles.help, { color: colors.textSecondary }]}>บัญชีที่มีรายการแล้วต้องเปลี่ยนสกุลเงินหรือวิธีต้นทุนผ่านหน้าพรีวิวผลกระทบในรุ่นถัดไป</Text> : null}
    </SectionCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    <Pressable disabled={saving} onPress={() => void submit()} style={[styles.button, { backgroundColor: colors.brand }, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{account ? 'บันทึกการแก้ไข' : 'บันทึกบัญชี'}</Text>}</Pressable>
    {account ? <Pressable disabled={saving} onPress={() => account.archived_at ? void submit(false) : archiveArmed ? void submit(true) : setArchiveArmed(true)} style={[styles.archive, { borderColor: account.archived_at ? colors.brand : colors.danger }]}><Text style={{ color: account.archived_at ? colors.brand : colors.danger, fontWeight: '900' }}>{account.archived_at ? 'นำบัญชีกลับมาใช้งาน' : archiveArmed ? 'แตะอีกครั้งเพื่อยืนยันการเก็บถาวร' : 'เก็บบัญชีนี้เป็นถาวร'}</Text></Pressable> : null}
  </DetailScreen>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { const colors = useThemeColors(); return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></View>; }

const styles = StyleSheet.create({ field: { gap: 7 }, label: { fontSize: 12, fontWeight: '800' }, help: { fontSize: 11, lineHeight: 17 }, input: { minHeight: 48, borderWidth: 1, borderRadius: Radius.small, paddingHorizontal: 13, fontSize: 14 }, choices: { flexDirection: 'row', gap: 10 }, choice: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', padding: 8 }, button: { minHeight: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, archive: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: '900', fontSize: 15 }, error: { fontSize: 12, lineHeight: 18 }, disabled: { opacity: 0.55 } });

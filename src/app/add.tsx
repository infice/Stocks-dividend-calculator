import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DetailScreen } from '@/components/ui/detail-screen';
import { SectionCard } from '@/components/ui/section-card';
import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

const options = [
  { icon: '▤', title: 'บัญชีโบรกเกอร์', detail: 'แยกสกุลเงิน วิธีต้นทุน และข้อมูลแต่ละบัญชี', enabled: true, route: '/account-entry' },
  { icon: '▧', title: 'รูปหรือ PDF', detail: 'อ่านเป็นฉบับร่าง แล้วให้คุณตรวจทุกค่า', enabled: false },
  { icon: '↓', title: 'ซื้อหุ้น / ETF', detail: 'จำนวน ราคา ค่าธรรมเนียม และหลักฐาน', enabled: true, route: '/trade-entry', side: 'BUY' },
  { icon: '↑', title: 'ขายหุ้น / ETF', detail: 'ตรวจจำนวนคงเหลือและต้นทุนก่อนยืนยัน', enabled: true, route: '/trade-entry', side: 'SELL' },
  { icon: '₿', title: 'เงินปันผล / ดอกเบี้ย', detail: 'บันทึกแยกจากกำไรจากการขาย', enabled: false },
  { icon: '⇄', title: 'ฝาก ถอน แลก หรือโอนเงิน', detail: 'เก็บวันรับจริงและไม่บันทึกรายรับซ้ำ', enabled: false },
  { icon: '◫', title: 'เหตุการณ์ปรับจำนวนหุ้น', detail: 'split, transfer หรือเหตุการณ์ที่ต้องตรวจ', enabled: false },
] as const;

export default function AddScreen() {
  const colors = useThemeColors();
  return (
    <DetailScreen title="เพิ่มข้อมูล">
      <Text style={[styles.lead, { color: colors.textSecondary }]}>เลือกประเภทข้อมูล ระบบจะไม่รวมรายการในยอดหลักจนกว่าฟิลด์และหลักฐานที่จำเป็นจะครบ</Text>
      <SectionCard>
        {options.map((option) => {
          const content = (
            <>
              <View style={[styles.icon, { backgroundColor: option.enabled ? colors.brandSoft : colors.backgroundSelected }]}>
                <Text style={[styles.iconText, { color: option.enabled ? colors.brand : colors.textSecondary }]}>{option.icon}</Text>
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: option.enabled ? colors.text : colors.textSecondary }]}>{option.title}</Text>
                  {!option.enabled ? (
                    <View style={[styles.soonBadge, { backgroundColor: colors.backgroundSelected }]}>
                      <Text style={[styles.soonText, { color: colors.textSecondary }]}>เร็ว ๆ นี้</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.detail, { color: colors.textSecondary }]}>{option.detail}</Text>
              </View>
              {option.enabled ? <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text> : null}
            </>
          );

          if (!option.enabled) {
            return (
              <View key={option.title} accessibilityLabel={`${option.title} ยังไม่เปิดใช้`} style={[styles.option, { borderBottomColor: colors.border }]}>
                {content}
              </View>
            );
          }

          return (
            <Pressable
              key={option.title}
              accessibilityRole="button"
              onPress={() => router.push(option.route === '/trade-entry' ? { pathname: '/trade-entry', params: { side: option.side } } : '/account-entry')}
              style={({ pressed }) => [styles.option, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
              {content}
            </Pressable>
          );
        })}
      </SectionCard>
      <View style={[styles.aiNote, { backgroundColor: colors.warningSoft }]}>
        <Text style={[styles.aiTitle, { color: colors.warning }]}>AI ยังไม่เปิดใช้</Text>
        <Text style={[styles.aiDetail, { color: colors.textSecondary }]}>ยังไม่ส่งไฟล์ไปยังผู้ให้บริการภายนอกจนกว่าจะเลือกผู้ให้บริการและผ่านการทดสอบความเป็นส่วนตัว</Text>
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 13, lineHeight: 20 },
  option: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingVertical: 9 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, fontWeight: '900' },
  copy: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  title: { fontSize: 15, fontWeight: '800' },
  detail: { fontSize: 11, lineHeight: 16 },
  chevron: { fontSize: 25 },
  soonBadge: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  soonText: { fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.65 },
  aiNote: { borderRadius: Radius.medium, padding: 16, gap: 4 },
  aiTitle: { fontSize: 14, fontWeight: '900' },
  aiDetail: { fontSize: 12, lineHeight: 18 },
});

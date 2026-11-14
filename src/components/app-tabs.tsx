import { NativeTabs } from 'expo-router/native-tabs';

import { useThemeColors } from '@/hooks/use-theme-colors';

export default function AppTabs() {
  const colors = useThemeColors();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>ภาพรวม</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md={{ default: 'monitoring', selected: 'monitoring' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="portfolio">
        <NativeTabs.Trigger.Label>พอร์ต</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'briefcase', selected: 'briefcase.fill' }}
          md={{ default: 'business_center', selected: 'business_center' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>รายการ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          md={{ default: 'receipt_long', selected: 'receipt_long' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

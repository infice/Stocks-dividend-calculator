import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

const subscribe = (onStoreChange: () => void) => {
  const subscription = Appearance.addChangeListener(onStoreChange);
  return () => subscription.remove();
};

export function useColorScheme() {
  return useSyncExternalStore(subscribe, Appearance.getColorScheme, () => 'light');
}

import { createContext, type PropsWithChildren, useContext } from 'react';

import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

const ThemeColorsContext = createContext<ThemeColors>(Colors.light);

export function ThemeColorsProvider({
  children,
  value,
}: PropsWithChildren<{ value: ThemeColors }>) {
  return <ThemeColorsContext value={value}>{children}</ThemeColorsContext>;
}

export function useThemeColors() {
  return useContext(ThemeColorsContext);
}

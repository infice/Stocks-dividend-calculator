import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthScreen } from '@/components/auth-screen';
import { AuthCallbackScreen } from '@/components/auth-callback-screen';
import { ConfigurationRequired } from '@/components/configuration-required';
import { UpdatePasswordScreen } from '@/components/update-password-screen';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeColorsProvider } from '@/hooks/use-theme-colors';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { FinancialDataProvider } from '@/providers/financial-data-provider';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeColorsProvider value={colors}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AuthProvider><AuthenticatedApp /></AuthProvider>
      </ThemeProvider>
    </ThemeColorsProvider>
  );
}

function AuthenticatedApp() {
  const { isConfigured, isInitializing, isPasswordRecovery, session, callbackStatus } = useAuth();
  if (!isConfigured) return <ConfigurationRequired />;
  if (isInitializing) return <AuthCallbackScreen initializing />;
  if (callbackStatus !== 'idle') return <AuthCallbackScreen />;
  if (!session) return <AuthScreen />;
  if (isPasswordRecovery) return <UpdatePasswordScreen />;
  return (
    <FinancialDataProvider key={session.user.id}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profit-source" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account-entry" />
        <Stack.Screen name="trade-entry" />
      </Stack>
    </FinancialDataProvider>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

const readConfig = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || publishableKey === 'sb_publishable_replace_me') {
    throw new Error('SUPABASE_CONFIG_MISSING');
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('SUPABASE_URL_INVALID');
    }
  } catch {
    throw new Error('SUPABASE_URL_INVALID');
  }

  return { url, publishableKey };
};

export const isSupabaseConfigured = () => {
  try {
    readConfig();
    return true;
  } catch {
    return false;
  }
};

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const { url, publishableKey } = readConfig();
  client = createClient<Database>(url, publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // AuthProvider consumes callbacks on every platform, exactly once.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}

export function registerSupabaseAutoRefresh(supabase = getSupabaseClient()) {
  if (Platform.OS === 'web') return () => undefined;

  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}

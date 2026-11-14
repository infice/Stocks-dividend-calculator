import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured, registerSupabaseAutoRefresh } from '@/lib/supabase';
import { displayNameFromEmail, readAuthCallback } from '@/lib/auth-callback';
import { mapDataAccessError, DataAccessError } from '@/services/financial-mappers';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitializing: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  error: DataAccessError | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  callbackStatus: 'idle' | 'loading' | 'success' | 'error';
  dismissCallback(): void;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  clearError(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function authActionError(error: unknown) {
  const mapped = mapDataAccessError(error);
  const messages: Record<string, string> = {
    email_not_confirmed: 'ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ในอีเมลหรือขอส่งอีกครั้ง',
    invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่',
    over_email_send_rate_limit: 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    over_request_rate_limit: 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
    weak_password: 'รหัสผ่านยังไม่ปลอดภัย กรุณาใช้รหัสผ่านที่ยาวและเดายากขึ้น',
    email_address_invalid: 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    NETWORK_UNAVAILABLE: 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
  };
  return messages[mapped.code]
    ? new DataAccessError(messages[mapped.code], mapped.kind, mapped.code, mapped.retryable)
    : mapped;
}

const getAuthRedirectUrl = () => Platform.OS === 'web'
  ? process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL?.trim() || Linking.createURL('auth/callback')
  : process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || Linking.createURL('auth/callback');

export function AuthProvider({ children }: PropsWithChildren) {
  const isConfigured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isInitializing, setIsInitializing] = useState(isConfigured);
  const [callbackStatus, setCallbackStatus] = useState<AuthContextValue['callbackStatus']>('idle');
  const [error, setError] = useState<DataAccessError | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    let mounted = true;
    const stopAutoRefresh = registerSupabaseAutoRefresh(supabase);
    const handledUrls = new Set<string>();

    const acceptAuthUrl = async (url: string | null) => {
      if (!url || handledUrls.has(url)) return;
      try {
        const callback = readAuthCallback(url, getAuthRedirectUrl());
        if (!callback) return;
        handledUrls.add(url);
        if (mounted) { setCallbackStatus('loading'); setError(null); }
        if (callback.error) throw new Error(callback.error);
        if (callback.code) {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(callback.code);
          if (sessionError) throw sessionError;
        } else if (callback.accessToken && callback.refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: callback.accessToken, refresh_token: callback.refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          throw new Error('ลิงก์นี้ไม่มีข้อมูลยืนยัน กรุณาขอลิงก์ใหม่หรือกลับไปเข้าสู่ระบบ');
        }
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data.user?.email_confirmed_at) throw new Error('ยังไม่พบการยืนยันอีเมล กรุณาขอลิงก์ใหม่');
        if (mounted) {
          if (callback.type === 'recovery') setIsPasswordRecovery(true);
          setCallbackStatus('success');
        }
      } catch (urlError) {
        if (mounted) { setError(mapDataAccessError(urlError)); setCallbackStatus('error'); }
      } finally {
        // Remove one-time credentials from browser history after consumption.
        if (Platform.OS === 'web' && typeof window !== 'undefined' && handledUrls.has(url)) {
          window.history.replaceState(window.history.state, '', new URL(url).pathname);
        }
      }
    };

    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void acceptAuthUrl(url); });

    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError) setError(mapDataAccessError(sessionError));
        setSession(data.session);
        await acceptAuthUrl(await Linking.getInitialURL());
      } catch (initialError) {
        if (mounted) setError(mapDataAccessError(initialError));
      } finally {
        if (mounted) { setIsInitializing(false); setIsLoading(false); }
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
        if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      linkSubscription.remove();
      authListener.subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, [isConfigured]);

  const runAuthAction = async (action: () => Promise<{ error: Error | null }>) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await action();
      if (result.error) throw result.error;
    } catch (actionError) {
      const mapped = authActionError(actionError);
      setError(mapped);
      throw mapped;
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    isInitializing,
    isConfigured,
    isPasswordRecovery,
    error,
    callbackStatus,
    dismissCallback: () => { setCallbackStatus('idle'); setError(null); },
    signIn: (email, password) => runAuthAction(async () => {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      return { error: signInError };
    }),
    signUp: (email, password) => runAuthAction(async () => {
      const { error: signUpError } = await getSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: { display_name: displayNameFromEmail(email) },
        },
      });
      return { error: signUpError };
    }),
    resendConfirmation: (email) => runAuthAction(async () => {
      const { error: resendError } = await getSupabaseClient().auth.resend({
        type: 'signup', email: email.trim(), options: { emailRedirectTo: getAuthRedirectUrl() },
      });
      return { error: resendError };
    }),
    requestPasswordReset: (email) => runAuthAction(async () => {
      const callbackUrl = getAuthRedirectUrl();
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        email,
        { redirectTo: callbackUrl },
      );
      return { error: resetError };
    }),
    updatePassword: (password) => runAuthAction(async () => {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
      if (!updateError) setIsPasswordRecovery(false);
      return { error: updateError };
    }),
    signOut: () => runAuthAction(async () => {
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      return { error: signOutError };
    }),
    clearError: () => setError(null),
  }), [error, isConfigured, isLoading, isInitializing, isPasswordRecovery, session, callbackStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}


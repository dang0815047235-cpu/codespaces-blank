import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface AuthError {
  message: string;
  code?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || '',
            },
          },
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          });
        }
        return { success: true, data };
      } catch (err) {
        const authError: AuthError = {
          message: err instanceof Error ? err.message : 'Failed to register',
          code: err instanceof Error ? (err as any).code : undefined,
        };
        setError(authError);
        return { success: false, error: authError };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            user_metadata: data.user.user_metadata,
          });
        }
        return { success: true, data };
      } catch (err) {
        const authError: AuthError = {
          message: err instanceof Error ? err.message : 'Failed to login',
          code: err instanceof Error ? (err as any).code : undefined,
        };
        setError(authError);
        return { success: false, error: authError };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      return { success: true };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to logout',
      };
      setError(authError);
      return { success: false, error: authError };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Failed to send reset email',
      };
      setError(authError);
      return { success: false, error: authError };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    setUser,
    setError,
  };
};

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { User, AuthContextType, TokenResponse } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = Cookies.get('access_token');
        if (storedToken) {
          setToken(storedToken);
          await fetchCurrentUser();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get<User>('/users/me/');
      setUser(response.data);
      return true;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setToken(null);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      if (!username.trim() || !password.trim()) {
        console.error('Username and password are required');
        return false;
      }

      const response = await api.post<TokenResponse>('/token/', {
        username,
        password,
      });

      const { access, refresh } = response.data;

      Cookies.set('access_token', access, { expires: 7 });
      Cookies.set('refresh_token', refresh, { expires: 30 });

      setToken(access);
      api.getClient().defaults.headers.common.Authorization = `Bearer ${access}`;

      const userFetched = await fetchCurrentUser();

      if (userFetched) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setToken(null);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  const logout = useCallback(() => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
    setToken(null);
    api.getClient().defaults.headers.common.Authorization = '';
    router.push('/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
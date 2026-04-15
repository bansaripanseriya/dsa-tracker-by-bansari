import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (t) => {
    if (!t) {
      setUser(null);
      setProgress(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProgress(data.progress || {});
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession(token);
  }, [token, loadSession]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name: name || undefined });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProgress(null);
  }, []);

  const refreshProgress = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setProgress(data.progress || {});
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      progress,
      loading,
      login,
      register,
      logout,
      refreshProgress,
      setProgress
    }),
    [token, user, progress, loading, login, register, logout, refreshProgress]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

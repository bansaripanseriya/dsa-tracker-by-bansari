import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [avatar, setAvatar] = useState(null);
  /** { byName } — who can find this user in friend search. */
  const [discoverability, setDiscoverability] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async (t) => {
    if (!t) {
      setUser(null);
      setProgress(null);
      setAvatar(null);
      setDiscoverability(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user); // { id, email, name, friendTag }
      setProgress(data.progress || {});
      setAvatar(data.avatar || null);
      setDiscoverability(data.discoverability || { byName: true });
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setProgress(null);
      setAvatar(null);
      setDiscoverability(null);
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
    setAvatar(null);
    setDiscoverability(null);
  }, []);

  /** Change the display name (PUT /auth/profile) and update the session. */
  const updateName = useCallback(async (name) => {
    const { data } = await api.put('/auth/profile', { name });
    setUser(data.user);
    return data.user;
  }, []);

  /** Turn "show me in name search" on or off. */
  const updateDiscoverability = useCallback(async (byName) => {
    const { data } = await api.put('/users/me/discoverability', { byName });
    setDiscoverability(data.discoverability);
    return data.discoverability;
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
      avatar,
      discoverability,
      loading,
      login,
      register,
      logout,
      refreshProgress,
      setProgress,
      setAvatar,
      updateName,
      updateDiscoverability
    }),
    [token, user, progress, avatar, discoverability, loading, login, register, logout, refreshProgress, updateName, updateDiscoverability]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

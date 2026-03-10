import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, post, get, setTokens, clearTokens, getAccessToken } from '../utils/api';

const AuthContext = createContext(null);

const ROLES = {
  ADMIN: { name: 'Cuántico', icon: '🔥', color: '#ffd666' },
  SINAPSIS: { name: 'Sinapsis', icon: '⚡', color: '#a6c6d9' },
  GUEST: { name: 'Sin Conexión', icon: '🪦', color: '#4a6578' },
};

// Derive effective role from backend user data
function deriveRole(userData) {
  if (!userData) return 'GUEST';
  if (userData.role === 'ADMIN') return 'ADMIN';
  if (userData.hasActiveSubscription) return 'SINAPSIS';
  return 'GUEST';
}

function enrichUser(userData) {
  if (!userData) return null;
  const role = deriveRole(userData);
  return { ...userData, role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await get('/auth/me');
      const enriched = enrichUser(res.data);
      setUser(enriched);
      return enriched;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await post('/auth/login', { email, password }, { auth: false });
    setTokens(res.data.accessToken, res.data.refreshToken);
    // After login, fetch full user data to get subscription status
    const meRes = await get('/auth/me');
    const enriched = enrichUser(meRes.data);
    setUser(enriched);
    return enriched;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await post('/auth/register', { name, email, password }, { auth: false });
    setTokens(res.data.accessToken, res.data.refreshToken);
    const enriched = enrichUser({ ...res.data.user, hasActiveSubscription: false });
    setUser(enriched);
    return enriched;
  }, []);

  const logout = useCallback(async () => {
    try { await post('/auth/logout', {}); } catch {}
    clearTokens();
    setUser(null);
  }, []);

  const enterAsGuest = useCallback(() => {
    clearTokens();
    setUser({
      id: 'guest', name: 'Invitado', email: '', role: 'GUEST',
      avatar: '🪦', xp: 0, level: 0, streak: 0,
      hasActiveSubscription: false,
    });
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isSinapsis = user?.role === 'SINAPSIS' || isAdmin;
  const isGuest = user?.role === 'GUEST' || !user;
  const roleInfo = ROLES[user?.role] || ROLES.GUEST;

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, enterAsGuest, fetchUser,
      isAdmin, isSinapsis, isGuest, roleInfo, ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

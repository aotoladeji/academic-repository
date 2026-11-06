import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokens } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore sessions on page load
  useEffect(() => {
    Promise.all([
      tokens.get('staff')
        ? api.get('/staff/me').then(({ data }) => setStaff(data.data)).catch(() => tokens.clear('staff'))
        : null,
      tokens.get('admin')
        ? api.get('/admin/me').then(({ data }) => setAdmin(data.data)).catch(() => tokens.clear('admin'))
        : null,
    ]).finally(() => setReady(true));

    const onExpired = (e) => (e.detail === 'admin' ? setAdmin(null) : setStaff(null));
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const staffLogin = useCallback(async (pf_number, password) => {
    const { data } = await api.post('/staff/login', { pf_number, password });
    tokens.set('staff', data.token);
    setStaff(data.staff);
  }, []);

  const adminLogin = useCallback(async (email, password) => {
    const { data } = await api.post('/admin/login', { email, password });
    tokens.set('admin', data.token);
    setAdmin(data.admin);
  }, []);

  const refreshStaff = useCallback(async () => {
    const { data } = await api.get('/staff/me');
    setStaff(data.data);
  }, []);

  const logout = useCallback(async (kind) => {
    try { await api.post(kind === 'admin' ? '/admin/logout' : '/staff/logout'); } catch { /* token may already be gone */ }
    tokens.clear(kind);
    kind === 'admin' ? setAdmin(null) : setStaff(null);
  }, []);

  const value = useMemo(
    () => ({ staff, admin, ready, staffLogin, adminLogin, refreshStaff, logout }),
    [staff, admin, ready, staffLogin, adminLogin, refreshStaff, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

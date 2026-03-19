import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUserState] = useState(null);
  const [loading, setLoading]   = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUserState(data.user);
    } catch { localStorage.removeItem('token'); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const setUser = (user, token) => {
    localStorage.setItem('token', token);
    setUserState(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

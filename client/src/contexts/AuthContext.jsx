import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tgs_token');
    if (!token) { setLoading(false); return; }
    api.me().then(u => { setUser(u); setLoading(false); }).catch(() => {
      localStorage.removeItem('tgs_token');
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('tgs_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('tgs_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  enterDemoMode: (role?: UserRole) => void;
}

const DEFAULT_ANALYST: User = {
  id: 'shieldxl_analyst_01',
  name: 'Analyst Demo (ShieldXL)',
  email: 'analyst@shieldxl.cyber',
  role: 'ADMIN',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_ANALYST);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshUser = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      // Unrestricted flow: ensure active analyst session is always available
      setUser(DEFAULT_ANALYST);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // If backend is offline or unresponsive, maintain active analyst session
      const savedUser = localStorage.getItem('shieldxl_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setLoading(false);
          return;
        } catch {}
      }
      setUser(DEFAULT_ANALYST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('shieldxl_user', JSON.stringify(userData));
    setUser(userData);
  };

  const enterDemoMode = (role: UserRole = 'ADMIN') => {
    const demoUser: User = {
      id: `shieldxl_${role.toLowerCase()}_01`,
      name: `ShieldXL ${role === 'ADMIN' ? 'Lead Administrator' : role === 'REVIEWER' ? 'Senior Reviewer' : 'Intelligence Analyst'}`,
      email: `${role.toLowerCase()}@shieldxl.cyber`,
      role,
    };
    login(`mock_jwt_token_${role.toLowerCase()}`, demoUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('shieldxl_user');
      setUser(DEFAULT_ANALYST);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

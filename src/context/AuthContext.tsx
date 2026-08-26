import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type UserRole = 'super_admin' | 'org_manager';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  // Set only for role === 'org_manager'. Matches Organization.id in src/data/mockData.ts.
  organizationId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = 'equipment-lending:auth-token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first load, try to restore a previous session from its saved token.
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setUser(data.user);
        setToken(savedToken);
      })
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ההתחברות נכשלה');
        return false;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setUser(data.user);
      setToken(data.token);
      return true;
    } catch {
      setError('לא ניתן להתחבר לשרת ההזדהות. ודאו ששרת ה-API רץ (npm run dev מריץ גם אותו).');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

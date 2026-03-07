import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../api/auth';

const AuthContext = createContext();

const AUTH_KEY = '@mua_planner_auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Verify the user still exists on server
          const res = await getProfile(parsed.email);
          if (res.success) {
            setUser(res.data);
          } else {
            await AsyncStorage.removeItem(AUTH_KEY);
          }
        }
      } catch {
        // Silent fail — user stays logged out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, updateProfile as apiUpdateProfile } from '../api/auth';
import { setApiUserId } from '../api/events';

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
            setApiUserId(res.data.id); // Set userId for API calls
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
    setApiUserId(userData.id); // Set userId for API calls
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setApiUserId(null); // Clear userId from API calls
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const updateUser = useCallback(async (updates) => {
    try {
      const res = await apiUpdateProfile(updates);
      if (res.success) {
        setUser(res.data);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(res.data));
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateUser }}>
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

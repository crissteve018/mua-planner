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
          // Set userId FIRST so API calls work
          setApiUserId(parsed.id);
          
          try {
            // Try to verify the user still exists on server
            const res = await getProfile(parsed.email);
            if (res.success) {
              // Update with fresh data from server
              setUser(res.data);
              await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(res.data));
            } else {
              // Unexpected response - use cached data
              console.log('Unexpected server response, using cached session');
              setUser(parsed);
            }
          } catch (apiErr) {
            // Check if user was deleted from server (404)
            if (apiErr.response?.status === 404 && 
                apiErr.response?.data?.error === 'User not found') {
              console.log('User no longer exists on server, clearing session');
              setApiUserId(null);
              await AsyncStorage.removeItem(AUTH_KEY);
            } else {
              // Network error or server issue - use cached data instead of logging out
              console.log('API error during session restore, using cached data:', apiErr.message);
              setUser(parsed);
            }
          }
        }
      } catch (err) {
        console.log('Session restore failed:', err.message);
        setApiUserId(null);
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
      console.log('Updating profile...');
      const res = await apiUpdateProfile(updates);
      console.log('Profile update response:', res.success ? 'success' : res.error);
      if (res.success) {
        setUser(res.data);
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(res.data));
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error };
    } catch (err) {
      console.error('Error updating profile:', err.message, err.response?.status, err.response?.data);
      return { success: false, error: err.response?.data?.error || err.message };
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

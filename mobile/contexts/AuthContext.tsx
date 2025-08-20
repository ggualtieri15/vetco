import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  type: 'user' | 'veterinarian';
  licenseNumber?: string;
  clinic?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, type: 'user' | 'veterinarian') => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: 'user' | 'veterinarian';
  licenseNumber?: string;
  clinic?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check for existing token on mount
  useEffect(() => {
    checkStoredToken();
  }, []);

  const checkStoredToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('vetco_token');
      if (storedToken) {
        setToken(storedToken);
        await fetchCurrentUser(storedToken);
      }
    } catch (error) {
      console.error('Error checking stored token:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      await SecureStore.deleteItemAsync('vetco_token');
      setToken(null);
    }
  };

  const login = async (email: string, password: string, type: 'user' | 'veterinarian') => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
        type
      });

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      await SecureStore.setItemAsync('vetco_token', newToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, data);

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      await SecureStore.setItemAsync('vetco_token', newToken);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await SecureStore.deleteItemAsync('vetco_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

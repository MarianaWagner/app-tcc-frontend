import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        setToken(storedToken);
        apiClient.setToken(storedToken);
        
        // Verify token and get user data
        try {
          const response = await apiClient.getMe();
          if (response.success) {
            setUser(response.data);
          } else {
            // Token is invalid, clear storage
            await clearAuth();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          await clearAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
    setToken(null);
    apiClient.setToken(null);
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.login({ email, password });
      
      if (response.success) {
        const { user: userData, token: authToken } = response.data;
        
        await AsyncStorage.setItem('auth_token', authToken);
        setUser(userData);
        setToken(authToken);
        apiClient.setToken(authToken);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.register({ name, email, password });
      
      if (response.success) {
        const { user: userData, token: authToken } = response.data;
        
        await AsyncStorage.setItem('auth_token', authToken);
        setUser(userData);
        setToken(authToken);
        apiClient.setToken(authToken);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuth();
    }
  };

  const refreshAuth = async () => {
    if (token) {
      try {
        const response = await apiClient.refreshToken(token);
        if (response.success) {
          const newToken = response.data.token;
          await AsyncStorage.setItem('auth_token', newToken);
          setToken(newToken);
          apiClient.setToken(newToken);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        await clearAuth();
      }
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshAuth,
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

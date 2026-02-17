'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await authAPI.getProfile();
        setUser(res.data.user);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const persistSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, '@');
    const normalizedPassword = String(password || '').trim();

    try {
      const res = await authAPI.login({ email: normalizedEmail, password: normalizedPassword });
      return persistSession(res.data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        const adminRes = await authAPI.adminLogin({ email: normalizedEmail, password: normalizedPassword });
        return persistSession(adminRes.data);
      }
      throw error;
    }
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const loginWithGoogle = async (accessToken) => {
    const res = await authAPI.googleLogin({ accessToken });
    return persistSession(res.data);
  };

  const sendPhoneOtpForLogin = async (phone) => {
    const res = await authAPI.sendPhoneLoginOtp({ phone });
    return res.data;
  };

  const verifyPhoneOtpForLogin = async (phone, otp) => {
    const res = await authAPI.verifyPhoneLoginOtp({ phone, otp });
    return persistSession(res.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      sendPhoneOtpForLogin,
      verifyPhoneOtpForLogin,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

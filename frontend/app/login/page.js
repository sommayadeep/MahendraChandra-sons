'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Script from 'next/script';

const LoginPage = () => {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('password');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const routeAfterLogin = (user) => {
    if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(formData.email, formData.password);
      toast.success('Welcome back!');
      routeAfterLogin(data.user);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      toast.error('Google login is not configured');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      toast.error('Google login SDK not loaded');
      return;
    }

    setLoading(true);
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          toast.error('Google login failed');
          setLoading(false);
          return;
        }

        try {
          const data = await loginWithGoogle(response.access_token);
          toast.success('Logged in with Google');
          routeAfterLogin(data.user);
        } catch (error) {
          toast.error(error.response?.data?.message || 'Google login failed');
        } finally {
          setLoading(false);
        }
      }
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  };

  return (
    <div className="pt-24 pb-20 min-h-screen flex items-center">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="max-w-md mx-auto px-4 sm:px-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 border-2 border-gold-500 flex items-center justify-center">
                <span className="text-gold-500 font-serif font-bold text-2xl">M</span>
              </div>
            </Link>
            <h1 className="font-serif text-3xl text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to your account</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button type="button" onClick={() => setMode('password')} className={`py-2 text-sm border ${mode === 'password' ? 'border-gold-500 text-gold-500' : 'border-gray-700 text-gray-300'}`}>Password</button>
            <button type="button" onClick={() => setMode('google')} className={`py-2 text-sm border ${mode === 'google' ? 'border-gold-500 text-gold-500' : 'border-gray-700 text-gray-300'}`}>Google</button>
          </div>

          {mode === 'password' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}

          {mode === 'google' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Login using your Google account popup.</p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Opening Google...' : 'Continue with Google'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-gold-500 hover:underline">
                Register
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-luxury-charcoal rounded-lg">
            <p className="text-gray-400 text-sm text-center mb-2">Demo Credentials:</p>
            <p className="text-gray-500 text-xs text-center">Admin: admin@mcsons.com / admin123</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;

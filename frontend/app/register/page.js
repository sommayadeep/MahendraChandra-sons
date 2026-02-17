'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpData, setOtpData] = useState({ emailOtp: '', phoneOtp: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (e) => {
    setOtpData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      setRegisteredEmail(data.email || formData.email);
      setOtpStep(true);
      toast.success('Account created. Enter email and phone OTP.');
      if (data?.devOtps) {
        toast.success(`Dev OTPs - Email: ${data.devOtps.emailOtp}, Phone: ${data.devOtps.phoneOtp}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp({
        email: registeredEmail,
        emailOtp: otpData.emailOtp.trim(),
        phoneOtp: otpData.phoneOtp.trim()
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Verification successful');
      router.push('/');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await authAPI.resendOtp({ email: registeredEmail });
      toast.success('OTP resent');
      if (res?.data?.devOtps) {
        toast.success(`Dev OTPs - Email: ${res.data.devOtps.emailOtp}, Phone: ${res.data.devOtps.phoneOtp}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen flex items-center">
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
            <h1 className="font-serif text-3xl text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join us and start shopping</p>
          </div>

          {!otpStep ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Email Address *</label>
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
              <label className="block text-gray-400 text-sm mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="+91xxxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-gray-400 text-sm">
                OTP sent to <span className="text-gold-500">{registeredEmail}</span> and registered phone number.
              </p>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email OTP *</label>
                <input
                  type="text"
                  name="emailOtp"
                  value={otpData.emailOtp}
                  onChange={handleOtpChange}
                  required
                  className="input-field"
                  placeholder="6-digit email OTP"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone OTP *</label>
                <input
                  type="text"
                  name="phoneOtp"
                  value={otpData.phoneOtp}
                  onChange={handleOtpChange}
                  required
                  className="input-field"
                  placeholder="6-digit phone OTP"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                className="w-full bg-luxury-charcoal border border-gray-700 text-white py-3 hover:border-gold-500"
              >
                Resend OTP
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-gold-500 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;

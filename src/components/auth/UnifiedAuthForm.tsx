import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, ArrowRight, AlertCircle, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AnimatedButton from '../ui/AnimatedButton';
import PasswordInput from '../ui/PasswordInput';

type AuthMode = 'login' | 'register';

export default function UnifiedAuthForm() {
  const navigate = useNavigate();

  // Detect referral code or registration mode from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = (urlParams.get('ref') || urlParams.get('referral') || '').trim().toUpperCase();
  const initialModeFromUrl = urlParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<AuthMode>(() => {
    if (refFromUrl || initialModeFromUrl === 'register') {
      return 'register';
    }
    return 'login';
  });

  const [referralCode] = useState<string>(() => {
    const code = refFromUrl || localStorage.getItem('nearby_pending_referral_code') || '';
    if (code) {
      localStorage.setItem('nearby_pending_referral_code', code);
      localStorage.setItem('nearby_auth_redirect', `/vendor/register?ref=${code}`);
    }
    return code;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getPostAuthDestination = () => {
    const pendingRedirect = localStorage.getItem('nearby_auth_redirect');
    if (pendingRedirect) {
      localStorage.removeItem('nearby_auth_redirect');
      return pendingRedirect;
    }
    if (referralCode) {
      return `/vendor/register?ref=${referralCode}`;
    }
    return '/location';
  };

  const formatPhone = (num: string) => {
    const cleaned = num.replace(/\D/g, '').slice(0, 10);
    return cleaned;
  };

  const getPseudoEmail = (num: string) => `${num}@nearbe.app`;

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  // ===== REGISTER FLOW =====
  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const pseudoEmail = getPseudoEmail(mobile);

      // Check if user already exists in customers table
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', mobile)
        .maybeSingle();

      if (existingCustomer) {
        setError('An account with this mobile number already exists. Please sign in.');
        setLoading(false);
        return;
      }

      // Register user with Supabase auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'customer',
            phone_number: mobile,
          },
        },
      });

      if (signUpError) {
        // Handle case where auth user already exists in Supabase
        if (signUpError.message?.toLowerCase().includes('already registered') || signUpError.message?.toLowerCase().includes('already in use')) {
          setError('This mobile number is already registered in Supabase Auth. Please switch to Sign In or delete the user from Supabase Auth > Users.');
          setLoading(false);
          return;
        }
        throw signUpError;
      }

      // Sign in immediately to establish authenticated JWT for RLS policies
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      const activeUser = signInData?.user || signUpData?.user;

      // Insert customer profile record with authenticated session
      if (activeUser) {
        const savedCity = localStorage.getItem('nearby_selected_city') || localStorage.getItem('nearby_user_city');
        const { error: custErr } = await supabase.from('customers').upsert({
          auth_user_id: activeUser.id,
          full_name: fullName.trim(),
          mobile_number: mobile,
          city: savedCity || null,
        });

        if (custErr) {
          console.warn('Customer profile upsert warning:', custErr);
        }
      }

      // Clear any legacy mock entries
      localStorage.removeItem('nearby_mock_session');
      localStorage.removeItem('nearby_mock_users');
      localStorage.setItem('nearby_customer_name', fullName.trim());
      localStorage.setItem('nearby_customer_phone', mobile);
      localStorage.setItem('nearby_user_role', 'customer');

      setTimeout(() => {
        navigate(getPostAuthDestination(), { replace: true });
      }, 300);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN FLOW =====
  const handleLogin = async () => {
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      localStorage.removeItem('nearby_mock_session');
      localStorage.setItem('nearby_customer_phone', mobile);

      try {
        await supabase.auth.signOut();
      } catch {}

      const pseudoEmail = getPseudoEmail(mobile);

      // Attempt Supabase sign in
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      if (signInErr) {
        throw signInErr;
      }

      if (!authData?.user) {
        throw new Error('Login failed. Please check your credentials.');
      }

      // Check for user's profile details across customers and vendors tables
      const { data: customerRecord } = await supabase
        .from('customers')
        .select('full_name')
        .eq('mobile_number', mobile)
        .maybeSingle();

      const { data: vendorRecord } = await supabase
        .from('vendors')
        .select('owner_name, phone_number')
        .eq('phone_number', mobile)
        .maybeSingle();

      const userName =
        customerRecord?.full_name ||
        vendorRecord?.owner_name ||
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.owner_name ||
        'User Account';

      localStorage.setItem('nearby_customer_name', userName);
      localStorage.setItem('nearby_customer_phone', mobile);
      localStorage.setItem('nearby_user_role', 'customer');

      navigate(getPostAuthDestination(), { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      // Offline/Demo network fallback
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        const userId = 'mock-user-' + mobile;
        const mockUser = {
          id: userId,
          email: getPseudoEmail(mobile),
          phone: mobile,
          role: 'authenticated',
          user_metadata: { full_name: 'User Account' },
          created_at: new Date().toISOString(),
        };
        const mockSession = {
          access_token: 'mock-token-' + userId,
          token_type: 'bearer',
          expires_in: 3600,
          user: mockUser,
        };
        localStorage.setItem('nearby_mock_session', JSON.stringify(mockSession));
        localStorage.setItem('nearby_customer_phone', mobile);
        localStorage.setItem('nearby_user_role', 'customer');
        setTimeout(() => {
          navigate(getPostAuthDestination(), { replace: true });
        }, 400);
        return;
      }
      setError(err.message || 'Invalid mobile number or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleCreateAccount();
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Referral Partner Invitation Notice */}
      {referralCode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center gap-3 text-amber-900 shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Gift size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-display font-extrabold leading-tight">
              Merchant Invitation Applied
            </p>
            <p className="text-[10px] text-amber-800/80 mt-0.5 leading-snug">
              Sign up or log in to complete your shop registration with invite code <span className="font-mono font-bold text-amber-950">{referralCode}</span>.
            </p>
          </div>
        </motion.div>
      )}

      {/* Tab Switcher: Sign In vs Create Account */}
      <div className="flex bg-surface p-1 rounded-2xl border border-border-light relative">
        <button
          type="button"
          onClick={() => handleModeChange('login')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-display font-extrabold rounded-xl relative transition-all duration-200 cursor-pointer ${
            mode === 'login' ? 'text-brand' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {mode === 'login' && (
            <motion.div
              layoutId="unifiedAuthTab"
              className="absolute inset-0 bg-white rounded-xl shadow-xs border border-border-light/60"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('register')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-display font-extrabold rounded-xl relative transition-all duration-200 cursor-pointer ${
            mode === 'register' ? 'text-brand' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {mode === 'register' && (
            <motion.div
              layoutId="unifiedAuthTab"
              className="absolute inset-0 bg-white rounded-xl shadow-xs border border-border-light/60"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Create Account</span>
        </button>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs font-body flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name field (Register Mode only) */}
        {mode === 'register' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <label className="block text-xs font-display font-bold text-ink-light">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm font-body bg-surface border-2 border-border-light rounded-xl outline-none focus:border-brand focus:bg-white transition-all text-ink placeholder:text-ink-muted/50"
                required
              />
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            </div>
          </motion.div>
        )}

        {/* 10-Digit Mobile Number field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-display font-bold text-ink-light">
            Mobile Number
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center gap-1 text-ink font-display font-bold text-xs pointer-events-none">
              <Phone size={16} className="text-brand" />
              <span>+91</span>
            </div>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(formatPhone(e.target.value))}
              placeholder="9876543210"
              maxLength={10}
              className="w-full pl-18 pr-4 py-3 text-xs sm:text-sm font-body bg-surface border-2 border-border-light rounded-xl outline-none focus:border-brand focus:bg-white transition-all text-ink tracking-wider font-semibold placeholder:tracking-normal placeholder:font-normal placeholder:text-ink-muted/50"
              required
            />
          </div>
        </div>

        {/* Password field */}
        <PasswordInput
          id="auth-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
          required
        />

        {/* Confirm Password field (Register Mode only) */}
        {mode === 'register' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PasswordInput
              id="auth-confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <AnimatedButton
            type="submit"
            fullWidth
            isLoading={loading}
            className="py-3.5 text-xs sm:text-sm font-display font-extrabold rounded-2xl shadow-brand"
          >
            <span>{mode === 'login' ? 'Sign In to NearBy' : 'Create Free Account'}</span>
            <ArrowRight size={16} />
          </AnimatedButton>
        </div>
      </form>

      {/* Switch Mode Prompt */}
      <div className="text-center pt-1 border-t border-border-light/60">
        <p className="text-xs text-ink-muted font-body">
          {mode === 'login' ? "Don't have an account yet?" : 'Already registered with NearBy?'}
          <button
            type="button"
            onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
            className="ml-1.5 font-display font-bold text-brand hover:underline cursor-pointer"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

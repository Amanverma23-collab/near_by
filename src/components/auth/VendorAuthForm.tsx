import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AnimatedButton from '../ui/AnimatedButton';
import PasswordInput from '../ui/PasswordInput';

type AuthMode = 'login' | 'register';

export default function VendorAuthForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const formatPhone = (num: string) => num.replace(/\D/g, '').slice(0, 10);
  const getPseudoEmail = (num: string) => `${num}@nearbe.app`;

  const isValidEmail = (e: string) =>
    !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const toggleMode = () => {
    resetForm();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  // ===== REGISTER FLOW =====
  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (email && !isValidEmail(email)) {
      setError('Please enter a valid email address');
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
      // Check if mobile number is already registered in mock user store
      const mockUsers = JSON.parse(localStorage.getItem('nearby_mock_users') || '{}');
      const pseudoEmail = getPseudoEmail(mobile);
      if (mockUsers[mobile] || mockUsers[pseudoEmail]) {
        setError('This mobile number is already registered. Please switch to Login mode to log in.');
        setLoading(false);
        return;
      }

      // 1. Check if this number is already registered as a Customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', mobile)
        .maybeSingle();

      if (existingCustomer) {
        setError('This number is already registered as a Customer. Please use a different number, or login via the Customer tab.');
        setLoading(false);
        return;
      }

      // 2. Check if duplicate mobile number exists in vendors table
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('phone_number', mobile)
        .maybeSingle();

      if (existingVendor) {
        setError('This number is already registered, please login instead');
        setLoading(false);
        return;
      }

      // 2. Register user with pseudo-email
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: password,
        options: {
          data: {
            owner_name: fullName.trim(),
            role: 'vendor'
          }
        }
      });

      if (signUpError) throw signUpError;

      const user = signUpData?.user;

      // 3. Insert vendor record
      if (user) {
        await supabase.from('vendors').insert({
          auth_user_id: user.id,
          owner_name: fullName.trim(),
          phone_number: mobile,
          name: 'Pending Shop Registration',
          category: 'pending',
          sub_service: 'pending',
          address: 'Pending Shop Registration',
          opening_hours: 'pending',
          whatsapp_number: mobile,
          latitude: 0,
          longitude: 0,
          is_verified: false
        });
      }

      localStorage.setItem('nearby_vendor_name', fullName.trim());
      localStorage.setItem('nearby_user_role', 'vendor');

      // 4. Sign in to establish active session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      if (signInError) throw signInError;

      setSuccessMsg('Vendor account created! Redirecting to shop details...');
      setTimeout(() => {
        navigate('/vendor/register', { replace: true });
        window.location.reload();
      }, 400);
    } catch (err: any) {
      console.error('Vendor Register Error:', err);
      setError(err.message || 'Failed to create account.');
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
      const pseudoEmail = getPseudoEmail(mobile);

      // Check if this number is registered ONLY as a Customer
      const { data: custRecord } = await supabase
        .from('customers')
        .select('id')
        .eq('mobile_number', mobile)
        .maybeSingle();

      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id, is_verified, name, owner_name')
        .eq('phone_number', mobile)
        .maybeSingle();

      if (custRecord && !existingVendor) {
        setError('This mobile number is registered as a Customer account. Please use the Customer tab to log in.');
        setLoading(false);
        return;
      }

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

      // Preserve registered vendor name
      const vendorName = existingVendor?.owner_name || existingVendor?.name || authData.user.user_metadata?.owner_name || 'Vendor';
      localStorage.setItem('nearby_vendor_name', vendorName);
      localStorage.setItem('nearby_user_role', 'vendor');

      // Redirect based on vendor profile status
      if (existingVendor && existingVendor.name !== 'Pending Shop Registration') {
        if (existingVendor.is_verified) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/vendor/pending', { replace: true });
        }
      } else {
        navigate('/vendor/register', { replace: true });
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Vendor Login Error:', err);
      setError(err.message || 'Invalid credentials.');
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

  // ===== UI =====
  const contentVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } },
  };

  const inputClass =
    'w-full pl-12 pr-4 py-3 text-base font-body bg-surface-card border-2 border-border rounded-[var(--radius-md)] transition-all duration-200 outline-none hover:border-ink-muted focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="p-3 rounded-[var(--radius-md)] bg-error-light text-error text-sm font-body text-center"
          >
            {error}
          </motion.div>
        )}
        {successMsg && !error && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="p-3 rounded-[var(--radius-md)] bg-success-light text-success text-sm font-body text-center"
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleek Horizontal Mode Switcher: Login | Register in 1 Row */}
      <div className="grid grid-cols-2 bg-surface p-1 rounded-xl border border-border-light text-center font-display text-xs font-extrabold mb-2 shadow-inner">
        <button
          type="button"
          onClick={() => { resetForm(); setMode('login'); }}
          className={`py-2.5 rounded-lg transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-white text-brand shadow-xs border border-border-light/80'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => { resetForm(); setMode('register'); }}
          className={`py-2.5 rounded-lg transition-all cursor-pointer ${
            mode === 'register'
              ? 'bg-white text-brand shadow-xs border border-border-light/80'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Register
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'login' ? (
          /* ===== LOGIN FORM ===== */
          <motion.div
            key="login"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            {/* Mobile */}
            <div className="space-y-1.5">
              <label htmlFor="vendor-login-mobile" className="block text-sm font-medium text-ink-light font-body">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-ink-muted">
                  <Phone size={18} />
                  <span className="text-sm font-body font-medium">+91</span>
                  <div className="w-px h-5 bg-border" />
                </div>
                <input
                  id="vendor-login-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(formatPhone(e.target.value))}
                  placeholder="Enter 10-digit number"
                  maxLength={10}
                  className="w-full pl-24 pr-4 py-3 text-base font-body bg-surface-card border-2 border-border rounded-[var(--radius-md)] transition-all duration-200 outline-none hover:border-ink-muted focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]"
                />
              </div>
            </div>

            <PasswordInput
              id="vendor-login-password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg('Forgot password feature coming soon!');
                }}
                className="text-sm text-brand font-medium hover:text-brand-dark transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Action Button */}
            <div className="pt-2">
              <AnimatedButton type="submit" fullWidth size="lg" isLoading={loading}>
                <span>Login</span>
                <ArrowRight size={18} />
              </AnimatedButton>
            </div>
          </motion.div>
        ) : (
          /* ===== REGISTER FORM ===== */
          <motion.div
            key="register"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="vendor-reg-name" className="block text-sm font-medium text-ink-light font-body">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
                  <User size={18} />
                </div>
                <input
                  id="vendor-reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="vendor-reg-email" className="block text-sm font-medium text-ink-light font-body">
                Email <span className="text-ink-muted">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
                  <Mail size={18} />
                </div>
                <input
                  id="vendor-reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <label htmlFor="vendor-reg-mobile" className="block text-sm font-medium text-ink-light font-body">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-ink-muted">
                  <Phone size={18} />
                  <span className="text-sm font-body font-medium">+91</span>
                  <div className="w-px h-5 bg-border" />
                </div>
                <input
                  id="vendor-reg-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(formatPhone(e.target.value))}
                  placeholder="Enter 10-digit number"
                  maxLength={10}
                  className="w-full pl-24 pr-4 py-3 text-base font-body bg-surface-card border-2 border-border rounded-[var(--radius-md)] transition-all duration-200 outline-none hover:border-ink-muted focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]"
                />
              </div>
            </div>

            {/* Password */}
            <PasswordInput
              id="vendor-reg-password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
            />

            {/* Confirm Password */}
            <PasswordInput
              id="vendor-reg-confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            {/* Register Action Button */}
            <div className="pt-2">
              <AnimatedButton type="submit" fullWidth size="lg" isLoading={loading}>
                <span>Register</span>
                <ArrowRight size={18} />
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}


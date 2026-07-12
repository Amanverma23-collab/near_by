import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AnimatedButton from '../ui/AnimatedButton';
import PasswordInput from '../ui/PasswordInput';

type AuthMode = 'login' | 'register';

export default function VendorAuthForm() {
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
      // 1. Check if duplicate mobile number exists in vendors table
      const { data: existingVendor, error: checkError } = await supabase
        .from('vendors')
        .select('id')
        .eq('phone_number', mobile)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVendor) {
        setError('This number is already registered, please login instead');
        setLoading(false);
        return;
      }

      // 2. Register user with pseudo-email
      const pseudoEmail = getPseudoEmail(mobile);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: password,
      });

      if (signUpError) throw signUpError;

      const user = signUpData.user;
      if (!user) throw new Error('User registration failed');

      // 3. Insert vendor record with matching database columns and required defaults
      const { error: insertError } = await supabase.from('vendors').insert({
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

      if (insertError) throw insertError;

      // 4. Sign in to establish active session (if signUp didn't auto-signin)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      if (signInError) throw signInError;

      setSuccessMsg('Account created! Verification pending. Redirecting...');
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
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password: password,
      });

      if (loginError) throw loginError;
    } catch (err: any) {
      console.error('Vendor Login Error:', err);
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
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
                className="text-sm text-brand font-medium hover:text-brand-dark transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login & Register Buttons */}
            <div className="flex flex-col gap-3">
              <AnimatedButton fullWidth size="lg" isLoading={loading} onClick={handleLogin}>
                <span>Login</span>
                <ArrowRight size={20} />
              </AnimatedButton>
              <AnimatedButton
                fullWidth
                size="lg"
                variant="outline"
                type="button"
                onClick={toggleMode}
              >
                <span>Register</span>
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

            {/* Create Account & Login Buttons */}
            <div className="flex flex-col gap-3">
              <AnimatedButton fullWidth size="lg" isLoading={loading} onClick={handleCreateAccount}>
                <span>Create Vendor Account</span>
                <ArrowRight size={20} />
              </AnimatedButton>
              <AnimatedButton
                fullWidth
                size="lg"
                variant="outline"
                type="button"
                onClick={toggleMode}
              >
                <span>Login</span>
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

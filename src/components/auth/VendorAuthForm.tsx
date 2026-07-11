import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Mail, ArrowRight } from 'lucide-react';
import { supabase, DEV_MODE } from '../../lib/supabase';
import AnimatedButton from '../ui/AnimatedButton';
import OtpInput from '../ui/OtpInput';
import PasswordInput from '../ui/PasswordInput';

type AuthMode = 'login' | 'register';
type RegisterStep = 'info' | 'otp' | 'password';

export default function VendorAuthForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const formatPhone = (num: string) => num.replace(/\D/g, '').slice(0, 10);
  const getFullPhone = (num: string) => `+91${num}`;

  const isValidEmail = (e: string) =>
    !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setMobile('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setRegisterStep('info');
    setError(null);
    setSuccessMsg(null);
  };

  const toggleMode = () => {
    resetForm();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  // ===== REGISTER FLOW =====

  const handleSendOtp = async () => {
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

    setError(null);
    setLoading(true);

    try {
      if (DEV_MODE) {
        setRegisterStep('otp');
        setSuccessMsg('Dev mode: Use any 6-digit code (e.g. 123456)');
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: getFullPhone(mobile),
        });
        if (otpError) throw otpError;
        setRegisterStep('otp');
        setSuccessMsg('OTP sent to your mobile number!');
      }
    } catch (err: any) {
      console.error('Vendor Register OTP Error:', err);
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    setOtp(otpValue);
    setError(null);
    setLoading(true);

    try {
      if (DEV_MODE) {
        setRegisterStep('password');
        setSuccessMsg('OTP verified! Now set your password.');
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: getFullPhone(mobile),
          token: otpValue,
          type: 'sms',
        });
        if (verifyError) throw verifyError;
        setRegisterStep('password');
        setSuccessMsg('OTP verified! Now set your password.');
      }
    } catch (err: any) {
      console.error('Vendor Verify OTP Error:', err);
      setError(err.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
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
      if (DEV_MODE) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            phone: getFullPhone(mobile),
            password: password,
          });
        if (signUpError) throw signUpError;

        const userId = signUpData.user?.id;
        if (!userId) throw new Error('User creation failed');

        const { error: insertError } = await supabase.from('vendors').insert({
          auth_user_id: userId,
          full_name: fullName.trim(),
          email: email.trim() || null,
          mobile_number: mobile,
          verification_status: 'pending',
        });
        if (insertError) throw insertError;

        await supabase.auth.signInWithPassword({
          phone: getFullPhone(mobile),
          password: password,
        });
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });
        if (updateError) throw updateError;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const { error: insertError } = await supabase.from('vendors').insert({
          auth_user_id: user.id,
          full_name: fullName.trim(),
          email: email.trim() || null,
          mobile_number: mobile,
          verification_status: 'pending',
        });
        if (insertError) throw insertError;
      }

      setSuccessMsg('Account created! Verification pending. Redirecting...');
    } catch (err: any) {
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
      const { error: loginError } = await supabase.auth.signInWithPassword({
        phone: getFullPhone(mobile),
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
      {/* Login / Register Toggle */}
      <div className="flex items-center justify-center gap-2 text-sm font-body">
        <span className="text-ink-muted">
          {mode === 'login' ? "Don't have an account?" : 'Already registered?'}
        </span>
        <button
          onClick={toggleMode}
          className="font-semibold text-brand hover:text-brand-dark transition-colors"
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </div>

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

            <AnimatedButton fullWidth size="lg" isLoading={loading} onClick={handleLogin}>
              <span>Login</span>
              <ArrowRight size={20} />
            </AnimatedButton>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            <AnimatePresence mode="wait">
              {registerStep === 'info' && (
                <motion.div
                  key="step-info"
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

                  <AnimatedButton fullWidth size="lg" isLoading={loading} onClick={handleSendOtp}>
                    <span>Send OTP</span>
                    <ArrowRight size={20} />
                  </AnimatedButton>
                </motion.div>
              )}

              {registerStep === 'otp' && (
                <motion.div
                  key="step-otp"
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-display font-bold text-ink">Verify Your Number</h3>
                    <p className="text-sm text-ink-muted font-body">
                      Enter the 6-digit code sent to{' '}
                      <span className="font-semibold text-ink">+91 {mobile}</span>
                    </p>
                  </div>
                  <OtpInput onComplete={handleVerifyOtp} disabled={loading} />
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-sm text-brand font-medium hover:text-brand-dark transition-colors disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </div>
                </motion.div>
              )}

              {registerStep === 'password' && (
                <motion.div
                  key="step-password"
                  variants={contentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-5"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-display font-bold text-ink">Set Your Password</h3>
                    <p className="text-sm text-ink-muted font-body">Create a secure password for your account</p>
                  </div>

                  <PasswordInput
                    id="vendor-reg-password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
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

                  <AnimatedButton fullWidth size="lg" isLoading={loading} onClick={handleCreateAccount}>
                    <span>Create Vendor Account</span>
                    <ArrowRight size={20} />
                  </AnimatedButton>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step indicator */}
            {mode === 'register' && (
              <div className="flex justify-center gap-2 pt-2">
                {(['info', 'otp', 'password'] as RegisterStep[]).map((step, i) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      registerStep === step
                        ? 'w-8 bg-brand'
                        : i < ['info', 'otp', 'password'].indexOf(registerStep)
                        ? 'w-4 bg-brand-200'
                        : 'w-4 bg-border'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

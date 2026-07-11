import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import AuthTabs from '../components/auth/AuthTabs';
import CustomerAuthForm from '../components/auth/CustomerAuthForm';
import VendorAuthForm from '../components/auth/VendorAuthForm';
import { useAuth } from '../context/AuthContext';
import BrandLoader from '../components/ui/BrandLoader';

export default function AuthPage() {
  const { session, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');

  if (loading) return <BrandLoader />;
  if (session && role) return <Navigate to="/location" replace />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface flex flex-col"
    >
      {/* Top decorative strip */}
      <div className="h-1.5 bg-gradient-to-r from-brand via-brand-light to-[#FFB347]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-2"
        >
          <h1 className="text-4xl font-extrabold font-display">
            <span className="text-ink">Near</span>
            <span className="text-brand">Be</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-ink-muted font-body mb-8 text-center"
        >
          Your neighbourhood, at your fingertips
        </motion.p>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-md bg-surface-card rounded-[var(--radius-xl)] shadow-card p-6 sm:p-8 border border-border-light"
        >
          <AuthTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'customer' ? (
              <CustomerAuthForm />
            ) : (
              <VendorAuthForm />
            )}
          </AuthTabs>
        </motion.div>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-xs text-ink-muted font-body text-center max-w-sm"
        >
          By continuing, you agree to NearBe's Terms of Service and Privacy Policy
        </motion.p>
      </div>
    </motion.div>
  );
}

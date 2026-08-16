import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import UnifiedAuthForm from '../components/auth/UnifiedAuthForm';
import { useAuth } from '../context/AuthContext';
import BrandLoader from '../components/ui/BrandLoader';

export default function AuthPage() {
  const { session, loading } = useAuth();

  if (loading) return <BrandLoader />;
  if (session) {
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = (urlParams.get('ref') || urlParams.get('referral') || '').trim().toUpperCase();
    const pendingRedirect = localStorage.getItem('nearby_auth_redirect');

    if (refFromUrl) {
      return <Navigate to={`/vendor/register?ref=${refFromUrl}`} replace />;
    }
    if (pendingRedirect) {
      localStorage.removeItem('nearby_auth_redirect');
      return <Navigate to={pendingRedirect} replace />;
    }
    return <Navigate to="/location" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-surface via-surface to-amber-50/20 flex flex-col justify-between font-body relative overflow-hidden"
    >
      {/* Top decorative gradient strip */}
      <div className="h-1.5 bg-gradient-to-r from-brand via-amber-500 to-teal-400" />

      {/* Decorative background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        {/* Logo Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-1 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand to-amber-500 text-white font-display font-extrabold text-xl flex items-center justify-center shadow-brand">
              N
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </h1>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs sm:text-sm text-ink-muted font-body mb-6 text-center max-w-xs"
        >
          Your neighbourhood local services, at your fingertips
        </motion.p>

        {/* Professional Unified Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-card p-6 sm:p-8 border border-border-light relative"
        >
          <UnifiedAuthForm />
        </motion.div>

        {/* Footer & Security Trust Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center space-y-2"
        >
          <p className="text-[11px] text-ink-muted font-body max-w-xs mx-auto">
            By continuing, you agree to NearBy's <span className="underline cursor-pointer">Terms</span> and <span className="underline cursor-pointer">Privacy Policy</span>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink-muted font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>256-bit Encrypted Secure Login</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

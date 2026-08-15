import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBackButton } from '../../hooks/useBackButton';
import { supabase } from '../../lib/supabase';
import VerificationTimer from '../../components/vendor/VerificationTimer';
import DevApproveButton from '../../components/vendor/DevApproveButton';

export default function VendorPendingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // Hardware Back button returns directly to Customer Dashboard instead of Step 2
  useBackButton(() => {
    navigate('/dashboard', { replace: true });
  }, true);

  useEffect(() => {
    if (!user) return;
    const fetchRequestedTimeAndStatus = async () => {
      try {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('verification_requested_at, is_verified, verification_status')
          .eq('auth_user_id', user.id);

        if (vendors && vendors.some(v => v.is_verified || v.verification_status === 'approved')) {
          setIsApproved(true);
          return;
        }

        const validTime = vendors?.find(v => v.verification_requested_at)?.verification_requested_at;
        if (validTime) {
          setRequestedAt(validTime);
        } else {
          setRequestedAt(new Date().toISOString());
        }
      } catch (err) {
        console.error('Error fetching verification time:', err);
        setRequestedAt(new Date().toISOString());
      }
    };

    fetchRequestedTimeAndStatus();
    const interval = setInterval(fetchRequestedTimeAndStatus, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 14
      }
    }
  };

  const ringVariants = {
    animate: {
      scale: [1, 1.08, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const pathVariants = {
    hidden: { pathLength: 0 },
    visible: {
      pathLength: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
        delay: 0.3
      }
    }
  };

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="p-2 -ml-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer flex items-center justify-center"
              title="Back to Customer App"
              aria-label="Back to Customer App"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold font-display">
                <span className="text-ink">Near</span>
                <span className="text-brand">By</span>
              </span>
              <span className="text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                Partner
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer text-xs font-display font-extrabold"
          >
            <Home size={14} className="text-teal-700" />
            <span>Customer App</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {isApproved ? (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 border border-border-light shadow-card space-y-6 w-full"
            >
              {/* Celebrating Shield Badge */}
              <div className="relative w-20 h-20 mx-auto py-2">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-20 h-20 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-lg border border-teal-400 mx-auto"
                >
                  <ShieldCheck size={42} />
                </motion.div>
              </div>

              {/* Heading */}
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-extrabold text-ink">
                  You're Verified! 🎉
                </h2>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Your shop is approved. Choose a subscription plan to go live and start attracting customers nearby.
                </p>
              </div>

              {/* Action Button: NEXT */}
              <div>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(13, 148, 136, 0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/vendor/subscriptions')}
                  className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-2xl border-2 border-amber-400 hover:border-amber-500 shadow-brand text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <span>Next: Choose Subscription Plan</span>
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="bg-white rounded-3xl p-8 border border-border-light shadow-card space-y-6 w-full"
            >
              {/* Animated SVG Checkmark Icon inside Breathing Ring */}
              <motion.div variants={itemVariants} className="py-2">
                <motion.div
                  variants={ringVariants}
                  animate="animate"
                  className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center border border-teal-500/20 mx-auto"
                >
                  <svg
                    className="w-10 h-10 text-teal-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <motion.path
                      variants={pathVariants}
                      initial="hidden"
                      animate="visible"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              </motion.div>

              {/* Heading */}
              <motion.div variants={itemVariants} className="space-y-2">
                <h2 className="text-2xl font-display font-extrabold text-ink">
                  Request Submitted!
                </h2>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Your vendor verification request has been successfully received. Our team is currently reviewing your owner identity details and shop profile.
                </p>
              </motion.div>

              {/* Reusable Countdown Timer Card */}
              <motion.div variants={itemVariants} className="flex justify-center w-full">
                <VerificationTimer requestedAt={requestedAt} />
              </motion.div>

              {/* Info Box */}
              <motion.div variants={itemVariants} className="p-4 bg-surface rounded-2xl border border-border-light text-left">
                <h4 className="text-xs font-display font-extrabold text-ink">
                  Verification in Progress
                </h4>
                <p className="text-[10px] text-ink-muted mt-0.5 leading-relaxed">
                  Verification usually takes less than 2 hours. We will notify you once your shop listing goes live.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🛠️ TEMPORARY DEV UTILITY — Remove once real Admin Dashboard is built. */}
        <DevApproveButton
          userId={user?.id || ''}
          onApproved={() => setIsApproved(true)}
        />
      </main>
    </div>
  );
}

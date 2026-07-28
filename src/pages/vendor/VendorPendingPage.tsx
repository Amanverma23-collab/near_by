import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import VerificationTimer from '../../components/vendor/VerificationTimer';
import DevApproveButton from '../../components/vendor/DevApproveButton';

export default function VendorPendingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requestedAt, setRequestedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchRequestedTime = async () => {
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('verification_requested_at')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data?.verification_requested_at) {
          setRequestedAt(data.verification_requested_at);
        } else {
          // Fallback to now if not set
          setRequestedAt(new Date().toISOString());
        }
      } catch (err) {
        console.error('Error fetching verification time:', err);
        setRequestedAt(new Date().toISOString());
      }
    };
    fetchRequestedTime();
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
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      boxShadow: [
        "0 0 0 0px rgba(13, 148, 136, 0.15)",
        "0 0 0 12px rgba(13, 148, 136, 0.3)",
        "0 0 0 0px rgba(13, 148, 136, 0.15)"
      ],
      transition: {
        duration: 2.5,
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
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <motion.div
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

          {/* Action Button */}
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm cursor-pointer transition-colors border border-accent/10"
            >
              Go to Dashboard
            </button>
          </motion.div>
        </motion.div>

        {/* 🛠️ TEMPORARY DEV UTILITY — Remove once real Admin Dashboard is built. */}
        <DevApproveButton
          userId={user?.id || ''}
          onApproved={() => navigate('/dashboard', { replace: true })}
        />
      </main>
    </div>
  );
}

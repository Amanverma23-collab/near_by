import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function VerificationApprovedModal() {
  const { user, vendorRecord, vendorStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || !vendorRecord) {
      setIsOpen(false);
      return;
    }

    const isApproved = vendorRecord.is_verified || vendorRecord.verification_status === 'approved' || vendorStatus === 'approved';
    const hasActiveSub = Boolean(
      vendorRecord.subscription_status &&
      ['trial', 'active', 'pro'].includes(vendorRecord.subscription_status) &&
      vendorRecord.subscription_expires_at &&
      new Date(vendorRecord.subscription_expires_at) > new Date()
    );

    // If verified, not yet subscribed, and hasn't dismissed modal this session
    if (isApproved && !hasActiveSub) {
      const seenKey = `nearby_verified_modal_seen_${vendorRecord.id || user.id}`;
      const hasSeen = sessionStorage.getItem(seenKey) === 'true';

      // Don't show modal if already on subscription pages or vendor onboarding (State C already shows it there)
      const onSubPage =
        location.pathname.startsWith('/vendor/subscriptions') ||
        location.pathname.startsWith('/vendor/plan') ||
        location.pathname.startsWith('/vendor/dashboard');

      if (!hasSeen && !onSubPage) {
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
    }
  }, [user, vendorRecord, vendorStatus, location.pathname]);

  const handleContinue = () => {
    if (vendorRecord?.id || user?.id) {
      const seenKey = `nearby_verified_modal_seen_${vendorRecord?.id || user?.id}`;
      sessionStorage.setItem(seenKey, 'true');
    }
    setIsOpen(false);
    navigate('/vendor/subscriptions');
  };

  const handleDismiss = () => {
    if (vendorRecord?.id || user?.id) {
      const seenKey = `nearby_verified_modal_seen_${vendorRecord?.id || user?.id}`;
      sessionStorage.setItem(seenKey, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-teal-100 space-y-5"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Animated Shield Checkmark Badge */}
          <div className="relative w-20 h-20 mx-auto pt-2">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-18 h-18 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-teal-400 mx-auto"
            >
              <ShieldCheck size={38} />
            </motion.div>
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h3 className="text-2xl font-display font-extrabold text-ink">
              You're Verified! 🎉
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed px-2">
              Your shop <strong>{vendorRecord?.name || 'profile'}</strong> has been approved. Choose a subscription plan to go live and attract nearby customers.
            </p>
          </div>

          {/* Action Button: Continue */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-2xl shadow-brand text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300/30"
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

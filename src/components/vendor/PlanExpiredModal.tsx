import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';

interface PlanExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  expiredDate?: string | null;
}

export default function PlanExpiredModal({
  isOpen,
  onClose,
  vendorName = 'Merchant',
  expiredDate,
}: PlanExpiredModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formattedDate = expiredDate
    ? new Date(expiredDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'recently';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 z-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Gradient Warning Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-surface-dark transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header Icon & Title */}
          <div className="flex items-start gap-3.5 pr-6 mt-1">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0 shadow-xs">
              <AlertTriangle size={24} className="text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Action Required
              </span>
              <h2 className="text-lg font-display font-black text-ink leading-tight mt-1">
                Subscription Expired
              </h2>
            </div>
          </div>

          {/* Offline Notice Box */}
          <div className="my-4 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-display font-extrabold text-xs">
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
              <span>Your Shop is Currently Offline</span>
            </div>
            <p className="text-[11px] text-rose-950/80 leading-relaxed">
              Your subscription plan ended on <strong className="font-bold text-rose-950">{formattedDate}</strong>. Customers cannot discover your storefront or place calls & WhatsApp orders until renewed.
            </p>
          </div>

          {/* Pro Benefits Quick Checklist */}
          <div className="space-y-2 mb-5">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-ink-muted">
              Renew today to immediately restore:
            </span>
            <div className="space-y-1.5 text-xs text-ink font-medium">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Instant storefront re-activation to local customers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Direct customer calls & WhatsApp leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Verified business badge & top search rank</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate('/vendor/subscriptions');
              }}
              className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Renew Plan Now</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-dark text-ink-muted hover:text-ink font-display font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Stay in Dashboard (Offline Mode)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

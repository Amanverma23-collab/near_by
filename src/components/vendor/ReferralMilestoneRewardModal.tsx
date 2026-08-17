import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, X, Calendar, ShieldCheck } from 'lucide-react';

interface ReferralMilestoneRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  totalReferrals: number;
  freeMonthsEarned: number;
  newExpiryDate?: string | null;
}

export default function ReferralMilestoneRewardModal({
  isOpen,
  onClose,
  vendorName = 'Merchant',
  totalReferrals = 5,
  freeMonthsEarned = 1,
  newExpiryDate,
}: ReferralMilestoneRewardModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs font-body">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-sm bg-surface-card rounded-2xl p-5 shadow-2xl border border-border-light text-left overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header Icon & Title */}
          <div className="flex items-start gap-3.5 pr-8">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shrink-0">
              <CheckCircle2 size={22} className="text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-emerald-700">
                Reward Unlocked
              </span>
              <h2 className="text-lg font-display font-black text-ink leading-tight mt-0.5">
                5 Referrals Completed
              </h2>
            </div>
          </div>

          <p className="text-xs text-ink-muted mt-2.5 leading-relaxed">
            Congratulations! You have successfully referred {totalReferrals} shops and earned <strong className="text-ink font-bold">1 Free Month</strong> of subscription access.
          </p>

          {/* Plan Reward Details Box */}
          <div className="my-4 p-3.5 rounded-xl bg-surface border border-border-light space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <span className="text-ink-muted font-medium">Applied Benefit</span>
              <span className="font-display font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                +30 Days Free
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-ink">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand shrink-0" />
                <span>Verified business profile & pro features active</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-brand shrink-0" />
                <span>
                  {newExpiryDate ? (
                    <>Extended until <strong className="font-semibold text-ink">{new Date(newExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></>
                  ) : (
                    <span>Next billing cycle credited at zero charge</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

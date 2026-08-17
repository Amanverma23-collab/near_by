import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Check, ArrowRight, Award, Zap, ShieldCheck } from 'lucide-react';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm font-body">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-teal-900 via-teal-950 to-brand-dark rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-amber-400/40 overflow-hidden text-center"
        >
          {/* Animated Background Glows */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* Confetti & Sparkles Floating Elements */}
          <div className="absolute top-4 left-6 text-amber-300 animate-bounce">
            <Sparkles size={24} />
          </div>
          <div className="absolute top-8 right-8 text-emerald-300 animate-pulse">
            <Sparkles size={20} />
          </div>

          {/* Badge & Trophy Header */}
          <div className="relative z-10 mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-300">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
            >
              <Gift size={44} className="sm:w-12 sm:h-12" />
            </motion.div>
          </div>

          {/* Heading */}
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-display font-extrabold uppercase tracking-wider border border-amber-400/30">
              <Award size={14} />
              <span>Milestone Achieved!</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight">
              🎉 Congratulations, {vendorName}!
            </h2>
            <p className="text-sm sm:text-base text-teal-100/90 font-medium">
              Aapke <span className="text-amber-300 font-extrabold">{totalReferrals} Referrals</span> successfully poore ho gaye hain!
            </p>
          </div>

          {/* Big Reward Box */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 my-6 p-4 sm:p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-amber-400/40 text-left space-y-3 shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-white text-sm sm:text-base">
                    1 Month Free Subscription Plan
                  </h4>
                  <p className="text-xs text-amber-300/90 font-medium">
                    Reward unlocked automatically
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold font-display">
                +1 Month Free
              </span>
            </div>

            <div className="space-y-2 pt-1 text-xs text-teal-100/90">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Shop profile verified & pro listing activated</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>Next 30 days subscription validity added with zero charges</span>
              </div>
              {newExpiryDate && (
                <div className="flex items-center gap-2 text-amber-200">
                  <Sparkles size={16} className="text-amber-300 shrink-0" />
                  <span>Valid until: <strong className="text-white">{new Date(newExpiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Next Goal Note */}
          <p className="relative z-10 text-xs text-teal-200/80 mb-6">
            💡 Har 5 nayi shops ko refer karne par aapko <span className="text-amber-300 font-bold">+1 Month Free</span> lagatar milta rahega!
          </p>

          {/* Action Button */}
          <div className="relative z-10">
            <button
              onClick={onClose}
              className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-amber-950 font-display font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-amber-300"
            >
              <span>Awesome, Claim & Continue</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

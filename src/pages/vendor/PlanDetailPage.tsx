import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Sparkles, Tag, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { PLANS, validatePromoCode, type PromoResult } from '../../data/plans';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const plan = PLANS.find((p) => p.id === planId) || PLANS[1]; // fallback to monthly pro

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Price calculations
  const originalPrice = plan.price;
  const discountAmount = appliedPromo
    ? Math.round((originalPrice * appliedPromo.discountPercent) / 100)
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setPromoError(null);
    const result = validatePromoCode(promoInput);
    if (result.valid) {
      setAppliedPromo(result);
      setPromoInput('');
    } else {
      setPromoError(result.message);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleActivateTrial = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const subData = {
        auth_user_id: user.id,
        subscription_status: 'trial',
        subscription_expires_at: expiresAt.toISOString(),
      };

      // Update by auth_user_id
      await supabase
        .from('vendors')
        .update(subData)
        .eq('auth_user_id', user.id);

      // Fallback update by phone_number if available
      const userPhone = user.phone || user.user_metadata?.phone_number;
      if (userPhone) {
        const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
        await supabase
          .from('vendors')
          .update(subData)
          .eq('phone_number', cleanPhone);
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Trial activation error:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedPayment = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan.id === 'annual_pro' ? 365 : 30));

      const status = plan.id === 'annual_pro' ? 'pro' : 'active';
      const subData = {
        auth_user_id: user.id,
        subscription_status: status,
        subscription_expires_at: expiresAt.toISOString(),
      };

      // Update by auth_user_id
      await supabase
        .from('vendors')
        .update(subData)
        .eq('auth_user_id', user.id);

      // Fallback update by phone_number if available
      const userPhone = user.phone || user.user_metadata?.phone_number;
      if (userPhone) {
        const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
        await supabase
          .from('vendors')
          .update(subData)
          .eq('phone_number', cleanPhone);
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Payment activation error:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/vendor/subscriptions')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Plans</span>
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
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Title Banner */}
          <motion.div variants={itemVariants} className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand font-display font-extrabold text-[11px] uppercase tracking-wider">
              <Sparkles size={12} />
              Selected Plan
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
              {plan.name} — <span className="capitalize">{plan.duration}</span>
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              {plan.billingCycle}
            </p>
          </motion.div>

          {/* Plan Summary Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-border-light shadow-card space-y-6"
          >
            {/* Price Header */}
            <div className="flex items-baseline justify-between p-4 bg-surface rounded-2xl border border-border-light">
              <div>
                <span className="text-xs font-display font-bold text-ink-muted block uppercase tracking-wider">
                  Billing Amount
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold text-ink font-display">
                  {appliedPromo ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-brand">₹{finalPrice}</span>
                      <span className="text-lg line-through text-ink-muted font-normal">
                        ₹{originalPrice}
                      </span>
                    </div>
                  ) : (
                    plan.displayPrice
                  )}
                </span>
              </div>
              <span className="text-xs font-display font-bold text-brand bg-brand/10 px-3 py-1 rounded-full">
                {plan.billingCycle}
              </span>
            </div>

            {/* Trial Note if Free */}
            {plan.isFree && (
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed">
                <span className="font-bold font-display">Note: </span>
                After your 30-day free trial ends, you'll need to choose a paid plan to stay listed and visible to nearby customers.
              </div>
            )}

            {/* Feature Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                What's Included
              </h3>

              <div className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-brand/10 text-brand mt-0.5 shrink-0">
                      <Check size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-display font-bold text-ink leading-tight">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Promo Code Section (Hide for ₹0 trial) */}
          {!plan.isFree && (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl p-6 border border-border-light shadow-card space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                <Tag size={14} className="text-brand" />
                Have a promo code?
              </div>

              {appliedPromo ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-mono font-bold text-xs rounded-md uppercase tracking-wider">
                      {appliedPromo.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      {appliedPromo.message}
                    </span>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="p-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer"
                    title="Remove code"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleApplyPromo} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 px-4 py-2.5 text-sm font-mono uppercase bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!promoInput.trim()}
                      className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                  <AnimatePresence mode="wait">
                    {promoError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs text-error font-medium px-1"
                      >
                        {promoError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="text-[11px] text-ink-muted px-1">
                    Try using test codes: <code className="font-mono text-brand">WELCOME10</code> (10% off), <code className="font-mono text-brand">NEARBY20</code> (20% off)
                  </p>
                </form>
              )}
            </motion.div>
          )}

          {/* Final Price Summary */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl p-6 border border-border-light shadow-card space-y-3"
          >
            <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider mb-2">
              Payment Summary
            </h3>

            {plan.isFree ? (
              <div className="flex items-center justify-between text-sm font-display font-extrabold text-emerald-700 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                <span>Free Trial Total</span>
                <span>₹0 — No payment required</span>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <span>Plan Price</span>
                  <span>₹{originalPrice}</span>
                </div>

                <AnimatePresence>
                  {appliedPromo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex justify-between text-emerald-600 font-medium"
                    >
                      <span>Promo Discount ({appliedPromo.discountPercent}%)</span>
                      <span>-₹{discountAmount}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <hr className="border-border-light my-2" />

                <div className="flex justify-between items-baseline text-base font-display font-extrabold text-ink">
                  <span>Total Amount</span>
                  <span className="text-2xl text-brand">₹{finalPrice}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div variants={itemVariants} className="pt-2">
            {plan.isFree ? (
              <button
                onClick={handleActivateTrial}
                disabled={loading}
                className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-2xl shadow-brand text-base cursor-pointer transition-colors flex items-center justify-center gap-2 border border-accent/20"
              >
                <span>{loading ? 'Activating Trial…' : 'Start Free Trial'}</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleProceedPayment}
                className="w-full py-4 bg-gradient-to-r from-teal-600 via-brand to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-display font-extrabold rounded-2xl shadow-brand text-base cursor-pointer transition-all flex items-center justify-center gap-2 border border-amber-300/30 group"
              >
                <ShieldCheck size={20} className="text-amber-300" />
                <span>Proceed to Payment — ₹{finalPrice}</span>
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

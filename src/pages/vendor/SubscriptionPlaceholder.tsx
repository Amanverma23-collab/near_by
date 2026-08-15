import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Check, Crown } from 'lucide-react';
import { PLANS } from '../../data/plans';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function SubscriptionPlaceholder() {
  const navigate = useNavigate();
  const { user, vendorRecord } = useAuth();

  const [hasUsedTrial, setHasUsedTrial] = useState<boolean>(() => {
    if (!user) return false;
    const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);
    return (
      Boolean(vendorRecord?.has_used_trial) ||
      Boolean(vendorRecord?.subscription_status) ||
      localStorage.getItem(`nearby_trial_used_${user.id}`) === 'true' ||
      (cleanPhone ? localStorage.getItem(`nearby_trial_used_${cleanPhone}`) === 'true' : false)
    );
  });

  useEffect(() => {
    if (!user) return;
    const checkTrialUsage = async () => {
      const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);
      const localUsed =
        localStorage.getItem(`nearby_trial_used_${user.id}`) === 'true' ||
        (cleanPhone ? localStorage.getItem(`nearby_trial_used_${cleanPhone}`) === 'true' : false);

      if (localUsed || vendorRecord?.has_used_trial || vendorRecord?.subscription_status) {
        setHasUsedTrial(true);
        return;
      }

      try {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('has_used_trial, subscription_status')
          .eq('auth_user_id', user.id);

        if (vendors && vendors.some(v => v.has_used_trial || v.subscription_status)) {
          setHasUsedTrial(true);
          localStorage.setItem(`nearby_trial_used_${user.id}`, 'true');
        }
      } catch (e) {
        console.warn('Error checking trial status:', e);
      }
    };
    checkTrialUsage();
  }, [user, vendorRecord]);

  // If the user already used their free trial, hide the trial plan
  const visiblePlans = hasUsedTrial
    ? PLANS.filter(p => !p.isFree)
    : PLANS;

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3 mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 font-display font-extrabold text-xs tracking-wider uppercase mb-2">
            <Sparkles size={14} className="animate-pulse text-amber-600" />
            {hasUsedTrial ? 'Renew or Upgrade Plan' : 'Choose a Subscription Plan'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-ink tracking-tight">
            {hasUsedTrial ? 'Select Your NearBy Partner Plan' : 'Go Live & Reach Local Customers'}
          </h2>
          <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
            {hasUsedTrial
              ? 'Choose a plan to keep your verified shop live, receive direct customer calls, and boost local leads.'
              : 'Select a plan to activate your verified storefront and start receiving direct customer leads with zero commission.'}
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasUsedTrial ? 'lg:grid-cols-3 max-w-4xl' : 'lg:grid-cols-4'} gap-6 w-full`}>
          {visiblePlans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => navigate(`/vendor/plan/${plan.id}`)}
              className={`bg-white rounded-3xl p-6 border-2 shadow-card relative flex flex-col justify-between overflow-hidden cursor-pointer group transition-shadow hover:shadow-xl ${
                plan.isPopular ? 'border-brand ring-2 ring-brand/15' : 'border-border-light hover:border-brand/40'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-brand text-white text-[10px] font-display font-extrabold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1">
                  <Crown size={10} />
                  Recommended
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-display font-extrabold text-ink">{plan.name}</h4>
                  <p className="text-[11px] text-ink-muted mt-0.5">{plan.billingCycle}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-ink font-display">{plan.displayPrice}</span>
                    <span className="text-xs text-ink-muted font-bold">/ {plan.duration}</span>
                  </div>
                </div>

                <hr className="border-border-light" />

                <ul className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm text-ink-light">
                      <span className="p-0.5 rounded-full bg-brand/10 text-brand mt-0.5 shrink-0">
                        <Check size={12} />
                      </span>
                      <span className="text-xs">{feature.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {plan.isFree ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vendor/plan/${plan.id}`);
                    }}
                    className="w-full py-3 font-display font-extrabold text-sm rounded-[var(--radius-md)] transition-all cursor-pointer text-center border-2 border-brand text-brand hover:bg-brand/5"
                  >
                    Select Free Trial
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vendor/plan/${plan.id}`);
                    }}
                    className="w-full py-3 font-display font-extrabold text-sm rounded-[var(--radius-md)] transition-all cursor-pointer text-center bg-brand hover:bg-brand-dark text-white shadow-brand border border-accent/25"
                  >
                    Activate Subscription
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ShieldCheck, Zap, Crown } from 'lucide-react';
import { getDynamicPlans, fetchRemotePlans, type Plan } from '../../data/plans';
import { useAuth } from '../../context/AuthContext';
import { useBackButton } from '../../hooks/useBackButton';
import { supabase } from '../../lib/supabase';

// Clean, professional feature lists
const PRO_FEATURES = [
  'Verified Blue Badge on storefront',
  'Unlimited direct customer calls & WhatsApp',
  'Top priority local search ranking',
  'Unlimited services & price list showcase',
  'Real-time store visits & interaction analytics',
  'Zero commission on all customer orders',
];

const TRIAL_FEATURES = [
  'Storefront page on NearBy app',
  'Direct customer calls & WhatsApp leads',
  'List up to 5 services with pricing',
  'Basic store visit analytics',
  'Zero commission on all orders',
];

export default function SubscriptionPlaceholder() {
  const navigate = useNavigate();
  const { user, vendorRecord } = useAuth();

  // Back button navigates to Vendor Dashboard
  useBackButton(() => {
    navigate('/vendor/dashboard');
  });

  const [currentPlans, setCurrentPlans] = useState<Plan[]>(() => getDynamicPlans());

  useEffect(() => {
    fetchRemotePlans().then((fetched) => {
      if (fetched && fetched.length > 0) {
        setCurrentPlans(fetched);
      }
    });

    const handlePlansUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCurrentPlans(e.detail);
      } else {
        setCurrentPlans(getDynamicPlans());
      }
    };

    window.addEventListener('nearby_plans_updated', handlePlansUpdate);
    return () => window.removeEventListener('nearby_plans_updated', handlePlansUpdate);
  }, []);

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

  // If user already used trial, filter out trial plan
  const visiblePlans = hasUsedTrial
    ? currentPlans.filter(p => !p.isFree)
    : currentPlans;

  const getFeatures = (plan: Plan) => {
    if (plan.isFree) return TRIAL_FEATURES;
    if (plan.features && plan.features.length > 0) {
      return plan.features.map(f => f.title);
    }
    return PRO_FEATURES;
  };

  const getTag = (plan: Plan) => {
    if (plan.isPopular || plan.id === 'pro-monthly') {
      return {
        label: 'RECOMMENDED',
        bg: 'bg-brand text-white',
        icon: true,
      };
    }
    if (plan.id === 'pro-yearly' || plan.duration?.toLowerCase().includes('year')) {
      return {
        label: 'BEST VALUE',
        bg: 'bg-amber-600 text-white',
        icon: false,
      };
    }
    if (plan.id === 'pro-6month' || plan.duration?.toLowerCase().includes('6 month')) {
      return {
        label: 'SAVE 17%',
        bg: 'bg-blue-600 text-white',
        icon: false,
      };
    }
    if (plan.isFree) {
      return {
        label: 'FREE TRIAL',
        bg: 'bg-slate-700 text-white',
        icon: false,
      };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">NearBy</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
              Partner
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 flex flex-col items-center">
        {/* Title Header */}
        <div className="text-center space-y-2 mb-8 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {hasUsedTrial ? 'Select a Subscription Plan' : 'Go Live on NearBy'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Get your verified shop live, receive direct calls and WhatsApp inquiries from customers in your area with zero commission.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${visiblePlans.length >= 3 ? 'lg:grid-cols-3' : 'max-w-3xl'} gap-5 w-full`}>
          {visiblePlans.map((plan) => {
            const tag = getTag(plan);
            const features = getFeatures(plan);
            const isFeatured = plan.isPopular || plan.id === 'pro-monthly';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-2xl p-6 border relative overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                  isFeatured
                    ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Top-Right Corner Badge like before */}
                {tag && (
                  <div className={`absolute top-0 right-0 ${tag.bg} text-[10px] font-display font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-xs`}>
                    {tag.icon && <Crown size={11} />}
                    <span>{tag.label}</span>
                  </div>
                )}

                {/* Card Top Section */}
                <div className="space-y-4 pt-1">
                  <div className="min-h-[26px]">
                    <h3 className="text-base font-bold text-slate-900">
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {plan.displayPrice}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        / {plan.duration}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {plan.billingCycle}
                    </p>
                  </div>

                  <div className="h-px bg-slate-100 my-3" />

                  {/* Features List */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Included features:
                    </p>
                    <ul className="space-y-2.5">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check size={14} className="text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => navigate(`/vendor/plan/${plan.id}`)}
                    className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center ${
                      isFeatured
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {plan.isFree ? 'Start 30-Day Free Trial' : 'Activate Subscription'}
                  </button>

                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Instant activation • Cancel anytime
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Value Callout Footer */}
        <div className="mt-12 w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Zero Commissions & Direct Contact</h4>
              <p className="text-[11px] text-slate-500">
                Customers call or message your phone number directly. We never take a cut.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-200/60 shrink-0">
            <Zap size={12} />
            <span>100% Direct Leads</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export interface PlanFeature {
  title: string;
  description: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  duration: string;
  billingCycle: string;
  features: PlanFeature[];
  isPopular: boolean;
  isFree: boolean;
}

export const STATIC_PLANS: Plan[] = [
  {
    id: 'starter-trial',
    name: 'Starter Trial',
    price: 0,
    displayPrice: '₹0',
    duration: '30 days',
    billingCycle: '30-day free trial',
    features: [
      {
        title: 'Storefront page on NearBy',
        description: 'Your own shop page visible to all nearby customers searching for your services.',
      },
      {
        title: 'Direct Calls & WhatsApp leads',
        description: 'Customers can call or message you directly — no middleman, no lead fees.',
      },
      {
        title: 'Up to 5 services listed',
        description: 'List up to 5 of your most popular services with prices for customers to browse.',
      },
      {
        title: 'Basic analytics (views)',
        description: 'See how many people viewed your storefront page this week and month.',
      },
    ],
    isPopular: false,
    isFree: true,
  },
  {
    id: 'pro-monthly',
    name: 'NearBy Partner Pro',
    price: 50,
    displayPrice: '₹50',
    duration: 'month',
    billingCycle: 'Monthly billing',
    features: [
      {
        title: 'Verified Badge on profile',
        description: "A trust badge on your storefront so customers know you are a verified, real business.",
      },
      {
        title: 'Unlimited services & price lists',
        description: 'List every service you offer with detailed pricing — no 5-item cap.',
      },
      {
        title: 'Priority local search listing',
        description: 'Your shop appears higher in nearby search results than unverified/free listings.',
      },
      {
        title: 'Premium support',
        description: 'Dedicated support from our team for any account, listing, or billing queries.',
      },
      {
        title: 'Zero commission forever',
        description: 'You keep 100% of every rupee earned — we never take a cut from your sales.',
      },
    ],
    isPopular: true,
    isFree: false,
  },
  {
    id: 'pro-6month',
    name: 'NearBy Partner Pro',
    price: 250,
    displayPrice: '₹250',
    duration: '6 months',
    billingCycle: '6-month billing (save ₹50)',
    features: [
      {
        title: 'Verified Badge on profile',
        description: "A trust badge on your storefront so customers know you are a verified, real business.",
      },
      {
        title: 'Unlimited services & price lists',
        description: 'List every service you offer with detailed pricing — no 5-item cap.',
      },
      {
        title: 'Priority local search listing',
        description: 'Your shop appears higher in nearby search results than unverified/free listings.',
      },
      {
        title: 'Premium support',
        description: 'Dedicated support from our team for any account, listing, or billing queries.',
      },
      {
        title: 'Zero commission forever',
        description: 'You keep 100% of every rupee earned — we never take a cut from your sales.',
      },
    ],
    isPopular: false,
    isFree: false,
  },
  {
    id: 'pro-yearly',
    name: 'NearBy Partner Pro',
    price: 500,
    displayPrice: '₹500',
    duration: 'year',
    billingCycle: 'Annual billing (save ₹100)',
    features: [
      {
        title: 'Verified Badge on profile',
        description: "A trust badge on your storefront so customers know you are a verified, real business.",
      },
      {
        title: 'Unlimited services & price lists',
        description: 'List every service you offer with detailed pricing — no 5-item cap.',
      },
      {
        title: 'Priority local search listing',
        description: 'Your shop appears higher in nearby search results than unverified/free listings.',
      },
      {
        title: 'Premium support',
        description: 'Dedicated support from our team for any account, listing, or billing queries.',
      },
      {
        title: 'Zero commission forever',
        description: 'You keep 100% of every rupee earned — we never take a cut from your sales.',
      },
    ],
    isPopular: false,
    isFree: false,
  },
];

import { supabase } from '../lib/supabase';

export function getDynamicPlans(): Plan[] {
  try {
    const saved = localStorage.getItem('nearby_custom_plans');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading dynamic plans:', e);
  }
  return STATIC_PLANS;
}

// Fetch latest plans from Supabase cloud config or dedicated table
export async function fetchRemotePlans(): Promise<Plan[]> {
  try {
    // 1. Try dedicated table 'subscription_plans'
    const { data: tableData, error: tableErr } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (!tableErr && tableData && tableData.length > 0) {
      const mapped: Plan[] = tableData.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        displayPrice: item.display_price || `₹${item.price}`,
        duration: item.duration,
        billingCycle: item.billing_cycle,
        features: item.features || [],
        isPopular: Boolean(item.is_popular),
        isFree: Boolean(item.is_free),
      }));
      localStorage.setItem('nearby_custom_plans', JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('nearby_plans_updated', { detail: mapped }));
      return mapped;
    }
  } catch (e) {
    // Fall through
  }

  try {
    // 2. Try Supabase system config record '__system_config_plans__'
    const { data: configData, error: configErr } = await supabase
      .from('chat_messages')
      .select('text')
      .eq('id', '__system_config_plans__')
      .maybeSingle();

    if (!configErr && configData?.text) {
      const parsed: Plan[] = JSON.parse(configData.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('nearby_custom_plans', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('nearby_plans_updated', { detail: parsed }));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error fetching remote plans:', e);
  }

  return getDynamicPlans();
}

// Fetch latest referral codes from Supabase cloud config or dedicated table
export async function fetchRemoteReferrals(): Promise<any[]> {
  try {
    // 1. Try dedicated table 'referral_codes'
    const { data: tableData, error: tableErr } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!tableErr && tableData && tableData.length > 0) {
      localStorage.setItem('nearby_custom_referral_codes', JSON.stringify(tableData));
      return tableData;
    }
  } catch (e) {
    // Fall through
  }

  try {
    // 2. Try Supabase system config record '__system_config_referrals__'
    const { data: configData, error: configErr } = await supabase
      .from('chat_messages')
      .select('text')
      .eq('id', '__system_config_referrals__')
      .maybeSingle();

    if (!configErr && configData?.text) {
      const parsed = JSON.parse(configData.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('nearby_custom_referral_codes', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error fetching remote referrals:', e);
  }

  return [];
}

// Automatically sync on initial app load in background
if (typeof window !== 'undefined') {
  fetchRemotePlans();
  fetchRemoteReferrals();

  // Supabase realtime listener for config updates
  try {
    supabase
      .channel('public:system_configs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          if (payload?.new?.id === '__system_config_plans__') {
            fetchRemotePlans();
          } else if (payload?.new?.id === '__system_config_referrals__') {
            fetchRemoteReferrals();
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.warn('Error setting up config realtime subscription:', e);
  }
}

export const PLANS: Plan[] = getDynamicPlans();

export interface PromoResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  message: string;
}

const STATIC_PROMO_CODES: Record<string, number> = {
  'WELCOME10': 10,
  'NEARBY20': 20,
  'LAUNCH50': 50,
};

export function validatePromoCode(code: string, targetPlanId?: string): PromoResult {
  const normalized = code.trim().toUpperCase();

  // 1. Check dynamic referral codes configured by Admin in localStorage
  try {
    const dynamicCodesStr = localStorage.getItem('nearby_custom_referral_codes');
    if (dynamicCodesStr) {
      const dynamicCodes: any[] = JSON.parse(dynamicCodesStr);
      const match = dynamicCodes.find((c) => c.code.toUpperCase() === normalized);

      if (match) {
        if (!match.is_active) {
          return {
            valid: false,
            code: normalized,
            discountPercent: 0,
            message: 'This promo code is currently paused or inactive.',
          };
        }

        if (match.expires_at && new Date(match.expires_at).getTime() < Date.now()) {
          return {
            valid: false,
            code: normalized,
            discountPercent: 0,
            message: 'This promo code has expired.',
          };
        }

        if (match.max_uses && match.times_used >= match.max_uses) {
          return {
            valid: false,
            code: normalized,
            discountPercent: 0,
            message: 'This promo code has reached its maximum usage limit.',
          };
        }

        // Check if restricted to a specific plan
        if (match.plan_id && match.plan_id !== 'all' && targetPlanId && match.plan_id !== targetPlanId) {
          return {
            valid: false,
            code: normalized,
            discountPercent: 0,
            message: `This promo code is only valid for ${match.plan_name || match.plan_id}.`,
          };
        }

        return {
          valid: true,
          code: normalized,
          discountPercent: match.discount_percent || 10,
          message: `${match.discount_percent}% discount applied! (${match.plan_name || 'Valid code'})`,
        };
      }
    }
  } catch (e) {
    console.warn('Error reading dynamic promo codes:', e);
  }

  // 2. Fallback to static codes
  const discount = STATIC_PROMO_CODES[normalized];
  if (discount !== undefined) {
    return {
      valid: true,
      code: normalized,
      discountPercent: discount,
      message: `${discount}% discount applied!`,
    };
  }

  return {
    valid: false,
    code: normalized,
    discountPercent: 0,
    message: 'Invalid or expired promo code',
  };
}


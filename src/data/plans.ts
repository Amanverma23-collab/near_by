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

export const PLANS: Plan[] = [
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

export interface PromoResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  message: string;
}

const PROMO_CODES: Record<string, number> = {
  'WELCOME10': 10,
  'NEARBY20': 20,
  'LAUNCH50': 50,
};

export function validatePromoCode(code: string): PromoResult {
  const normalized = code.trim().toUpperCase();
  const discount = PROMO_CODES[normalized];

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

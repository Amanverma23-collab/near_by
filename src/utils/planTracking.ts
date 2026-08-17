/**
 * NearBe Vendor Plan Tracking & Referral Reward System
 * Handles Plan Types (MONTHLY, HALF_YEARLY, YEARLY, REFERRAL_FREE),
 * Expiry Date Stacking, Dynamic Daily Countdown & Referral Multiples of 5.
 */

export interface VendorPlanDefinition {
  name: string;
  duration: number; // days
  price: number;    // INR
}

export const VENDOR_PLANS: Record<string, VendorPlanDefinition> = {
  MONTHLY: {
    name: "1 Month",
    duration: 30,
    price: 499,
  },
  HALF_YEARLY: {
    name: "6 Month",
    duration: 180,
    price: 2499,
  },
  YEARLY: {
    name: "1 Year",
    duration: 365,
    price: 4499,
  },
  REFERRAL_FREE: {
    name: "Referral Bonus",
    duration: 30,
    price: 0,
  }
};

/**
 * Generates an 8-character unique referral code (e.g., "NB8X2K9P")
 */
export function generateNBReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'NB';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Adds N days to a given date string or Date object
 */
export function addDaysToDate(date: string | Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatPlanDate(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0];
}

export interface PlanStatusMetrics {
  hasPlan: boolean;
  planType: string;
  planName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  daysUsed: number;
  daysLeft: number;
  progressPercent: number;
  isExpiringSoon: boolean;
  referralCode: string;
  referralCount: number;
  referralsToNextBonus: number;
}

/**
 * Computes exact daily countdown and progress metrics for a vendor's plan
 */
export function computeVendorPlanMetrics(
  planType: string = 'MONTHLY',
  startDateStr?: string | null,
  endDateStr?: string | null,
  referralCode: string = 'NB000000',
  referralCount: number = 0
): PlanStatusMetrics {
  const today = new Date();
  
  if (!endDateStr) {
    return {
      hasPlan: false,
      planType,
      planName: VENDOR_PLANS[planType]?.name || 'Standard Plan',
      startDate: formatPlanDate(today),
      endDate: formatPlanDate(today),
      totalDays: 30,
      daysUsed: 0,
      daysLeft: 0,
      progressPercent: 0,
      isExpiringSoon: true,
      referralCode,
      referralCount,
      referralsToNextBonus: 5 - (referralCount % 5),
    };
  }

  const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date(endDateStr).getTime() - 30 * 86400000);
  const endDate = new Date(endDateStr);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / msPerDay));
  const daysUsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / msPerDay));
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / msPerDay));
  const progressPercent = Math.min(100, parseFloat(((daysUsed / totalDays) * 100).toFixed(1)));

  const count = Math.max(0, referralCount);
  const referralsToNextBonus = count % 5 === 0 && count > 0 ? 5 : (5 - (count % 5));

  const planDef = VENDOR_PLANS[planType] || VENDOR_PLANS.MONTHLY;

  return {
    hasPlan: daysLeft > 0,
    planType,
    planName: planDef.name,
    startDate: formatPlanDate(startDate),
    endDate: formatPlanDate(endDate),
    totalDays,
    daysUsed,
    daysLeft,
    progressPercent,
    isExpiringSoon: daysLeft <= 7,
    referralCode,
    referralCount: count,
    referralsToNextBonus,
  };
}

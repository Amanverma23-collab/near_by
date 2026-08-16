import { supabase } from '../lib/supabase';

/**
 * Generates a deterministic, permanent, clean referral code like "AMAN3210" or "RAJU4821".
 * Uses the user's name prefix (4 chars) + the last 4 digits of their mobile number.
 * This guarantees the referral code NEVER changes across reloads or re-renders.
 */
export function generatePermanentReferralCode(
  ownerName?: string,
  phoneNumber?: string,
  userId?: string
): string {
  const cleanName = (ownerName || 'NEAR')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4);

  const prefix = cleanName.length >= 3 ? cleanName.padEnd(4, 'X') : 'SHOP';

  // 1. If mobile number is available, use last 4 digits (e.g. 9876543210 -> 3210)
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length >= 4) {
    return `${prefix}${cleanPhone.slice(-4)}`;
  }

  // 2. If userId is available, derive 4 alphanumeric chars deterministically
  if (userId) {
    const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    if (cleanId.length === 4) {
      return `${prefix}${cleanId}`;
    }
  }

  return `${prefix}7799`;
}

/**
 * Alias for backward compatibility
 */
export const generateBaseReferralCode = generatePermanentReferralCode;

/**
 * Ensures unique and permanent referral code for each user/vendor by checking database and saving to permanent cache.
 */
export async function ensureUniqueReferralCode(
  ownerName?: string,
  phoneNumber?: string,
  userId?: string,
  vendorId?: string
): Promise<string> {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);

  // 1. If this vendor already has a referral code in database, use it directly!
  if (vendorId) {
    try {
      const { data: v } = await supabase
        .from('vendors')
        .select('referral_code')
        .eq('id', vendorId)
        .maybeSingle();

      if (v?.referral_code) {
        if (userId) localStorage.setItem(`nearby_permanent_ref_code_${userId}`, v.referral_code);
        if (cleanPhone) localStorage.setItem(`nearby_permanent_ref_code_${cleanPhone}`, v.referral_code);
        return v.referral_code;
      }
    } catch {}
  }

  // 2. Check local permanent cache
  if (userId) {
    const localCode = localStorage.getItem(`nearby_permanent_ref_code_${userId}`);
    if (localCode) return localCode;
  }
  if (cleanPhone) {
    const localCodePhone = localStorage.getItem(`nearby_permanent_ref_code_${cleanPhone}`);
    if (localCodePhone) return localCodePhone;
  }

  // 3. Generate base code: e.g. AMAN + 3210 -> AMAN3210
  const baseCode = generatePermanentReferralCode(ownerName, phoneNumber, userId);

  // 4. Check if baseCode is free in database
  try {
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('referral_code', baseCode)
      .maybeSingle();

    // If completely free OR already belongs to this vendor
    if (!existingVendor || (vendorId && existingVendor.id === vendorId)) {
      if (userId) localStorage.setItem(`nearby_permanent_ref_code_${userId}`, baseCode);
      if (cleanPhone) localStorage.setItem(`nearby_permanent_ref_code_${cleanPhone}`, baseCode);
      return baseCode;
    }
  } catch (e) {
    console.warn('Error checking unique referral code in db:', e);
  }

  // 5. Collision handling: If AMAN3210 is already taken by another person with same name & phone suffix,
  // append unique suffix (e.g. AMAN3210A, AMAN3210B...)
  const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'X', '1', '2', '3', '4', '5'];
  for (const suffix of suffixes) {
    const candidate = `${baseCode}${suffix}`;

    try {
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('referral_code', candidate)
        .maybeSingle();

      if (!data || (vendorId && data.id === vendorId)) {
        if (userId) localStorage.setItem(`nearby_permanent_ref_code_${userId}`, candidate);
        if (cleanPhone) localStorage.setItem(`nearby_permanent_ref_code_${cleanPhone}`, candidate);
        return candidate;
      }
    } catch {
      return candidate;
    }
  }

  const fallback = `${baseCode}${Math.floor(10 + Math.random() * 90)}`;
  if (userId) localStorage.setItem(`nearby_permanent_ref_code_${userId}`, fallback);
  if (cleanPhone) localStorage.setItem(`nearby_permanent_ref_code_${cleanPhone}`, fallback);
  return fallback;
}

/**
 * Extends the referring vendor's subscription by exactly 1 month.
 * If active, adds 1 month onto current expiry; if expired/none, adds 1 month from today.
 */
export async function grantFreeMonth(vendorId: string): Promise<{ success: boolean; newExpiry?: string }> {
  try {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('id, phone_number, subscription_expires_at, subscription_status')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) {
      console.warn('Could not fetch vendor for free month reward:', error);
      return { success: false };
    }

    const now = new Date();
    const currentExpiry = vendor.subscription_expires_at ? new Date(vendor.subscription_expires_at) : now;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    const activeStatus = vendor.subscription_status && vendor.subscription_status !== 'expired' 
      ? vendor.subscription_status 
      : 'pro';

    await supabase
      .from('vendors')
      .update({
        subscription_expires_at: newExpiry.toISOString(),
        subscription_status: activeStatus,
        is_verified: true,
        last_referral_reward_at: new Date().toISOString(),
      })
      .eq('id', vendorId);

    // Sync localStorage cache for immediate offline/client UI rehydration
    const subObj = JSON.stringify({
      status: activeStatus,
      expiresAt: newExpiry.toISOString(),
    });
    localStorage.setItem(`nearby_subscription_${vendor.id}`, subObj);
    if (vendor.phone_number) {
      const cleanPhone = vendor.phone_number.replace(/\D/g, '').slice(-10);
      localStorage.setItem(`nearby_subscription_${cleanPhone}`, subObj);
    }

    window.dispatchEvent(new Event('nearby_vendor_updated'));
    return { success: true, newExpiry: newExpiry.toISOString() };
  } catch (err) {
    console.error('Error granting free month:', err);
    return { success: false };
  }
}

/**
 * Processes referral logic when a new vendor completes shop registration.
 * Idempotent: Only executes once per referred vendor.
 */
export async function processReferralReward(newVendor: {
  id: string;
  referral_code?: string;
  referred_by_code?: string | null;
  referral_counted?: boolean;
}): Promise<{ processed: boolean; referrerId?: string; freeMonthGranted?: boolean }> {
  if (!newVendor.referred_by_code || newVendor.referral_counted) {
    return { processed: false };
  }

  const cleanReferredCode = newVendor.referred_by_code.trim().toUpperCase();

  // Edge case 1: Prevent self-referral
  if (newVendor.referral_code && cleanReferredCode === newVendor.referral_code.trim().toUpperCase()) {
    console.log('Self-referral ignored.');
    return { processed: false };
  }

  try {
    // Find the referring vendor by referral_code
    const { data: referrer, error: referrerError } = await supabase
      .from('vendors')
      .select('id, auth_user_id, referral_code, successful_referral_count, subscription_expires_at, subscription_status')
      .eq('referral_code', cleanReferredCode)
      .maybeSingle();

    if (referrerError || !referrer || referrer.id === newVendor.id) {
      // Unknown referral code or self ID: silently ignore
      return { processed: false };
    }

    const currentCount = Number(referrer.successful_referral_count || 0);
    const newCount = currentCount + 1;

    // 1. Update the referrer's successful referral count
    await supabase
      .from('vendors')
      .update({ successful_referral_count: newCount })
      .eq('id', referrer.id);

    // 2. Mark this specific referral as counted to prevent double-counting
    await supabase
      .from('vendors')
      .update({ referral_counted: true })
      .eq('id', newVendor.id);

    let freeMonthGranted = false;

    // 3. Check if new count is a multiple of 5 (5, 10, 15, 20...)
    if (newCount % 5 === 0) {
      const rewardResult = await grantFreeMonth(referrer.id);
      freeMonthGranted = rewardResult.success;
    }

    return { processed: true, referrerId: referrer.id, freeMonthGranted };
  } catch (err) {
    console.error('Error processing referral reward:', err);
    return { processed: false };
  }
}

/**
 * Calculates current referral cycle metrics for UI presentation.
 */
export function calculateReferralProgress(successfulCount: number = 0) {
  const count = Math.max(0, successfulCount);
  const currentCycleProgress = count % 5;
  const neededForNext = currentCycleProgress === 0 && count > 0 ? 5 : (5 - currentCycleProgress);
  const totalFreeMonthsEarned = Math.floor(count / 5);
  const progressPercent = Math.round((currentCycleProgress / 5) * 100);

  return {
    totalCount: count,
    currentCycleProgress,
    neededForNext,
    totalFreeMonthsEarned,
    progressPercent,
  };
}

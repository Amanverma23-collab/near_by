import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Eye,
  PhoneCall,
  MessageCircle,
  Star,
  Edit3,
  ListPlus,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Share2,
  AlertTriangle,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Camera,
  ArrowLeft,
  Home,
  Gift,
  Award,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AnimatedCountUp from '../ui/AnimatedCountUp';
import ShopTimingModal from './ShopTimingModal';
import VendorReviewsModal from './VendorReviewsModal';
import ShopPhotosModal from './ShopPhotosModal';
import { getEffectiveShopStatus } from '../../utils/shopTiming';
import { calculateReferralProgress, ensureUniqueReferralCode, generatePermanentReferralCode, getVendorCandidateCodes } from '../../utils/referral';

interface VendorShopDashboardProps {
  vendor: any;
  onRefreshVendor?: () => void;
}

export default function VendorShopDashboard({ vendor, onRefreshVendor }: VendorShopDashboardProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEditNotice, setShowEditNotice] = useState<string | null>(null);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [isReferredModalOpen, setIsReferredModalOpen] = useState(false);

  // Compute live effective status
  const effectiveStatus = getEffectiveShopStatus(vendor);

  // Calculate subscription status details
  const isTrial = vendor?.subscription_status === 'trial';
  const rawExpiresAt = vendor?.subscription_expires_at;

  let daysRemaining = 30;
  let formattedExpiry = '30 days remaining';
  let isExpiringSoon = false;

  if (rawExpiresAt) {
    const expiresDate = new Date(rawExpiresAt);
    const now = new Date();
    const diffTime = expiresDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    if (isTrial) {
      formattedExpiry = `${daysRemaining} days remaining`;
    } else {
      formattedExpiry = `Active until ${expiresDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`;
    }

    if (daysRemaining <= 5) {
      isExpiringSoon = true;
    }
  }

  // Real stats computation directly from vendor database record & live interactions
  const cleanPhone = (vendor?.phone_number || '').replace(/\D/g, '').slice(-10);
  const localViews = Math.max(
    Number(localStorage.getItem(`nearby_views_${vendor?.id}`) || 0),
    cleanPhone ? Number(localStorage.getItem(`nearby_views_${cleanPhone}`) || 0) : 0
  );
  const localCalls = Math.max(
    Number(localStorage.getItem(`nearby_calls_${vendor?.id}`) || 0),
    cleanPhone ? Number(localStorage.getItem(`nearby_calls_${cleanPhone}`) || 0) : 0
  );
  const localWa = Math.max(
    Number(localStorage.getItem(`nearby_wa_${vendor?.id}`) || 0),
    cleanPhone ? Number(localStorage.getItem(`nearby_wa_${cleanPhone}`) || 0) : 0
  );

  const allVendorReviews: any[] = Array.isArray(vendor?.reviews) ? vendor.reviews : [];
  const realReviewCount = allVendorReviews.length;

  let realRating = 0.0;
  if (realReviewCount > 0) {
    const sum = allVendorReviews.reduce((acc: number, r: any) => acc + Number(r.rating || 5), 0);
    realRating = Math.round((sum / realReviewCount) * 10) / 10;
  } else if (vendor?.rating && Number(vendor.rating) > 0 && Number(vendor?.review_count || 0) > 0) {
    realRating = Number(vendor.rating);
  }

  const stats = {
    views: Number(vendor?.profile_views || vendor?.views_count || localViews || 0),
    callClicks: Number(vendor?.call_clicks || vendor?.calls_count || localCalls || 0),
    whatsappClicks: Number(vendor?.whatsapp_clicks || vendor?.whatsapp_count || localWa || 0),
    rating: realReviewCount > 0 ? realRating : (vendor?.rating && Number(vendor?.review_count || 0) > 0 ? Number(vendor.rating) : 0.0),
    reviewCount: realReviewCount || Number(vendor?.review_count || 0),
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Permanent, deterministic referral code (stays constant per user/mobile)
  const [vendorReferralCode, setVendorReferralCode] = useState<string>(() => {
    return (
      vendor?.referral_code ||
      (vendor?.auth_user_id ? localStorage.getItem(`nearby_permanent_ref_code_${vendor.auth_user_id}`) : null) ||
      (cleanPhone ? localStorage.getItem(`nearby_permanent_ref_code_${cleanPhone}`) : null) ||
      generatePermanentReferralCode(vendor?.owner_name || vendor?.name, vendor?.phone_number, vendor?.auth_user_id)
    );
  });

  // Ensure persistent referral code in database & localStorage
  useEffect(() => {
    if (vendor?.id) {
      if (!vendor.referral_code) {
        ensureUniqueReferralCode(vendor.owner_name || vendor.name, vendor.phone_number, vendor.auth_user_id, vendor.id).then(async (code) => {
          setVendorReferralCode(code);
          await supabase.from('vendors').update({ referral_code: code }).eq('id', vendor.id);
        });
      } else {
        setVendorReferralCode(vendor.referral_code);
        if (vendor.auth_user_id) localStorage.setItem(`nearby_permanent_ref_code_${vendor.auth_user_id}`, vendor.referral_code);
        if (cleanPhone) localStorage.setItem(`nearby_permanent_ref_code_${cleanPhone}`, vendor.referral_code);
      }
    }
  }, [vendor?.id, vendor?.referral_code, vendor?.phone_number]);

  // Live query all shops referred by this vendor
  const [liveReferralCount, setLiveReferralCount] = useState<number>(() => Number(vendor?.successful_referral_count || 0));
  const [referredVendorsList, setReferredVendorsList] = useState<any[]>([]);

  useEffect(() => {
    async function loadReferralStats() {
      const code = vendorReferralCode || vendor?.referral_code;
      if (!code && !vendor?.id) return;

      try {
        let vRowData: any = null;

        // 1. Fetch latest vendor row for exact count
        if (vendor?.id) {
          const { data: vRow } = await supabase
            .from('vendors')
            .select('successful_referral_count')
            .eq('id', vendor.id)
            .maybeSingle();

          vRowData = vRow;
        }

        // 2. Build candidate codes (case-insensitive + alternate candidate codes)
        const candidateCodes = getVendorCandidateCodes({
          id: vendor?.id,
          name: vendor?.name,
          owner_name: vendor?.owner_name,
          phone_number: vendor?.phone_number,
          referral_code: code,
        });

        const allCodesSet = new Set<string>();
        candidateCodes.forEach((c) => {
          if (c) {
            allCodesSet.add(c.trim());
            allCodesSet.add(c.trim().toUpperCase());
            allCodesSet.add(c.trim().toLowerCase());
          }
        });
        if (code) {
          allCodesSet.add(code.trim());
          allCodesSet.add(code.trim().toUpperCase());
          allCodesSet.add(code.trim().toLowerCase());
        }

        const codesList = Array.from(allCodesSet);

        // 3. Fetch all shops using any of these referral codes
        let matchingShops: any[] = [];
        if (codesList.length > 0) {
          const { data: directList, error: directErr } = await supabase
            .from('vendors')
            .select('id, name, owner_name, is_verified, subscription_status, referral_counted, created_at, referred_by_code')
            .in('referred_by_code', codesList)
            .order('created_at', { ascending: false });

          if (directErr) console.warn('Direct referral fetch notice:', directErr);
          if (directList) {
            matchingShops = directList;
          }
        }

        // 4. Broad scan fallback for any case/spacing/format variations
        try {
          const { data: allWithRef, error: allErr } = await supabase
            .from('vendors')
            .select('id, name, owner_name, is_verified, subscription_status, referral_counted, created_at, referred_by_code')
            .not('referred_by_code', 'is', null);

          if (allErr) console.warn('All with ref notice:', allErr);
          if (allWithRef) {
            const upperCodes = new Set(Array.from(allCodesSet).map((c) => c.toUpperCase()));
            const extraMatches = allWithRef.filter((v) => {
              if (!v.referred_by_code) return false;
              return upperCodes.has(v.referred_by_code.trim().toUpperCase());
            });

            extraMatches.forEach((shop) => {
              if (!matchingShops.some((m) => m.id === shop.id)) {
                matchingShops.push(shop);
              }
            });
          }
        } catch {}

        // Deduplicate & sort newest first
        const uniqueReferred = Array.from(
          new Map(matchingShops.map((item) => [item.id, item])).values()
        ).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        setReferredVendorsList(uniqueReferred);

        // Always keep the count and the list in 100% exact sync
        const realCount = uniqueReferred.length;
        setLiveReferralCount(realCount);

        // Auto-sync database counter with real referred rows
        if (vendor?.id && typeof vRowData?.successful_referral_count === 'number' && vRowData.successful_referral_count !== realCount) {
          await supabase.from('vendors').update({ successful_referral_count: realCount }).eq('id', vendor.id);
        }
      } catch (err) {
        console.warn('Error fetching live referral stats:', err);
      }
    }

    loadReferralStats();
  }, [vendor?.id, vendorReferralCode, vendor?.referral_code, vendor?.name, vendor?.owner_name, vendor?.phone_number]);

  const referralMetrics = calculateReferralProgress(liveReferralCount);
  const referralLink = `${window.location.origin}/vendor/register?ref=${vendorReferralCode || ''}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      if (vendorReferralCode) {
        await navigator.clipboard.writeText(vendorReferralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  // Section entrance animation variants
  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    show: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: custom * 0.1 },
    }),
  };

  const shopImage = vendor?.shop_images?.[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800';

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-16">
      {/* ────────────────── TOP NAVBAR ────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-border-light shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col justify-center">
            <span className="text-xl sm:text-2xl font-extrabold font-display leading-none tracking-tight">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[8px] sm:text-[9px] font-display font-extrabold text-brand uppercase tracking-widest mt-0.5 leading-none">
              Business
            </span>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-2">
            {/* Switch to Customer App Icon Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer shadow-xs"
              title="Customer App"
            >
              <Home size={18} className="text-teal-700" />
            </motion.button>

            {/* Profile Menu Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-light bg-surface hover:bg-surface-card transition-colors cursor-pointer text-xs font-display font-bold text-ink"
              >
                <div className="w-6 h-6 rounded-full bg-brand/15 text-brand flex items-center justify-center font-bold text-xs">
                  {vendor?.owner_name?.[0]?.toUpperCase() || 'V'}
                </div>
                <span className="hidden sm:inline">{vendor?.owner_name || 'Vendor Profile'}</span>
                <Menu size={16} className="text-ink-muted" />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-border-light shadow-card p-2 z-50 space-y-1"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-display font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Home size={15} className="text-teal-700" />
                      <span>Customer App</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-display font-bold text-ink hover:bg-surface rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <User size={15} className="text-brand" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-display font-bold text-ink hover:bg-surface rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Settings size={15} className="text-brand" />
                      <span>Settings</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ────────────────── MAIN CONTENT ────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">

        {/* SECTION 1: SHOP STATUS HERO CARD */}
        <motion.section
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="relative rounded-3xl overflow-hidden shadow-card border border-border-light min-h-[200px] sm:min-h-[240px] flex flex-col justify-between"
        >
          {/* Background Image - Bright, Vibrant, High Visibility */}
          <div className="absolute inset-0 z-0">
            <img
              src={shopImage}
              alt={vendor?.name || 'Shop'}
              className="w-full h-full object-cover"
            />
            {/* Soft bottom vignette gradient for crisp shop name readability without dimming the photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
          </div>

          {/* Top Bar inside Hero: LIVE Badge & Category Tag */}
          <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-emerald-500/30 border border-emerald-400/50 backdrop-blur-md shrink-0 shadow-xs">
              {/* Pulsing Dot */}
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDuration: '2s' }} />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-display font-extrabold text-emerald-200 uppercase tracking-wider">
                LIVE ON NEARBY
              </span>
            </div>

            {/* Category tag */}
            <span className="text-[10px] sm:text-[11px] font-display font-bold px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 capitalize truncate max-w-[130px] sm:max-w-none shadow-xs">
              {vendor?.category || 'General Merchant'}
            </span>
          </div>

          {/* Bottom-Left Corner: Shop Name inside a styled Box */}
          <div className="relative z-10 p-3.5 sm:p-5">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-black/65 backdrop-blur-md border border-white/25 shadow-lg max-w-full">
              <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-display font-extrabold text-white tracking-tight truncate capitalize">
                {vendor?.name || 'Your Business Name'}
              </h1>
            </div>
          </div>
        </motion.section>

        {/* SECTION 1.5: SUBSCRIPTION & STARTER FREE TRIAL STATUS (Below Photo) */}
        <motion.div
          custom={0.2}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-border-light shadow-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-display font-extrabold text-ink truncate">
                  {isTrial ? 'Starter Free Trial' : 'NearBy Partner Pro'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-ink-muted truncate font-medium">
                {formattedExpiry}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/vendor/subscriptions')}
            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-display font-extrabold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
          >
            <span>Manage Plan</span>
            <ChevronRight size={14} />
          </button>
        </motion.div>

        {/* Expiration Warning Banner */}
        {isExpiringSoon && (
          <motion.div
            custom={0.3}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="bg-amber-500 text-amber-950 px-4 sm:px-6 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3 text-xs font-display font-bold"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-amber-950" />
              <span>Your subscription plan expires soon — renew to stay live and visible to local customers.</span>
            </div>
            <button
              onClick={() => navigate('/vendor/subscriptions')}
              className="px-3 py-1 bg-amber-950 text-amber-200 hover:bg-black rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer shrink-0"
            >
              Renew Now
            </button>
          </motion.div>
        )}

        {/* SHOP ADDRESS CARD (Underneath Hero Image) */}
        {(vendor?.address || vendor?.city) && (
          <motion.div
            custom={0.5}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-border-light shadow-xs text-xs font-body text-ink"
          >
            <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0 shadow-2xs">
              <MapPin size={14} className="text-rose-500" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider font-display font-extrabold text-ink-muted block leading-none mb-0.5">
                Shop Location
              </span>
              <p className="font-medium text-ink truncate leading-tight">
                {vendor?.address || vendor?.city}
              </p>
            </div>
          </motion.div>
        )}

        {/* SECTION 2: QUICK STATS ROW */}
        <motion.section
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <h2 className="text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider pl-1">
            Performance Overview (This Month)
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Profile Views */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border-light shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-ink-muted">Profile Views</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Eye size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-ink">
                <AnimatedCountUp end={stats.views} />
              </div>
              <span className="text-[10px] text-teal-600 font-bold">Live customer views</span>
            </div>

            {/* Call Clicks */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border-light shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-ink-muted">Call Clicks</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <PhoneCall size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-ink">
                <AnimatedCountUp end={stats.callClicks} />
              </div>
              <span className="text-[10px] text-teal-600 font-bold">Direct customer calls</span>
            </div>

            {/* WhatsApp Clicks */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border-light shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-ink-muted">WhatsApp Leads</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <MessageCircle size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-ink">
                <AnimatedCountUp end={stats.whatsappClicks} />
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Direct chat inquiries</span>
            </div>

            {/* Rating */}
            <motion.div
              whileHover={{ y: -4, borderColor: 'var(--color-brand)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsReviewsModalOpen(true)}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-border-light shadow-card space-y-2 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-ink-muted group-hover:text-brand transition-colors">
                  Shop Rating
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-ink flex items-center gap-1.5">
                {stats.reviewCount > 0 ? (
                  <>
                    <span>{stats.rating.toFixed(1)}</span>
                    <span className="text-xs font-bold text-amber-500">★</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl text-ink font-extrabold">New</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                      0.0 ★
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-ink-muted font-bold pt-0.5">
                <span>{stats.reviewCount > 0 ? `Based on ${stats.reviewCount} reviews` : 'No reviews yet'}</span>
                <span className="text-brand font-extrabold group-hover:underline">View All &rarr;</span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 3: MANAGE YOUR SHOP */}
        <motion.section
          custom={2}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <h2 className="text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider pl-1">
            Manage Your Shop
          </h2>

          <div className="bg-white rounded-3xl border border-border-light shadow-card divide-y divide-border-light/60 overflow-hidden">

            {/* Shop Photos & Gallery */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => setIsPhotosModalOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-extrabold text-ink">Shop Photos & Gallery</h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-display font-extrabold text-[10px]">
                      {Array.isArray(vendor?.shop_images) && vendor.shop_images.length > 0 ? `${vendor.shop_images.length} Photos` : 'Multiple Photos'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">Upload & manage multiple photos shown to customers</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>

            {/* Edit Shop Details */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/vendor/register?mode=edit')}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-extrabold text-ink">Edit Shop Details</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Update shop name, address, photos & location pin</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>

            {/* Shop Timing & Hours */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => setIsTimingModalOpen(true)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-extrabold text-ink">Shop Timing & Hours</h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full ${
                        effectiveStatus.isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${effectiveStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>{effectiveStatus.statusLabel}</span>
                      {effectiveStatus.isManual && <span className="font-mono text-[8px] px-1 bg-amber-200 text-amber-900 rounded">M</span>}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {effectiveStatus.displayText} ({effectiveStatus.modeText})
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>

            {/* Manage Services & Pricing */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/vendor/services')}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <ListPlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-extrabold text-ink">Manage Services & Pricing</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Add, edit, or adjust prices for your service catalog</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>

            {/* View Public Listing */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate(`/vendor/${vendor?.id || 'v1'}`)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-extrabold text-ink">View Public Listing</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Preview how nearby customers see your storefront page</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>

            {/* Subscription & Billing */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/vendor/subscriptions')}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-display font-extrabold text-ink">Subscription & Billing</h3>
                  <p className="text-xs text-ink-muted mt-0.5">View active plan, renewal date & upgrade options</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted shrink-0" />
            </motion.div>
          </div>

          <AnimatePresence>
            {showEditNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-surface border border-border-light rounded-xl text-xs text-ink-muted text-center font-medium"
              >
                {showEditNotice}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* SECTION 4: REFERRAL PROMPT CARD */}
        <motion.section
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="bg-gradient-to-br from-teal-900 via-brand-dark to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden space-y-6"
        >
          {/* Decorative Sparkle */}
          <div className="absolute top-4 right-4 text-teal-300/20 pointer-events-none">
            <Sparkles size={80} />
          </div>

          <div className="relative z-10 space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-display font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 uppercase tracking-wider border border-amber-300/30 inline-flex items-center gap-1.5">
                <Gift size={12} />
                <span>Vendor Referral Program</span>
              </span>
              {referralMetrics.totalFreeMonthsEarned > 0 && (
                <span className="text-[10px] font-display font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                  <Award size={12} />
                  <span>{referralMetrics.totalFreeMonthsEarned} Month{referralMetrics.totalFreeMonthsEarned > 1 ? 's' : ''} Free Earned!</span>
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Refer 5 vendors, get 1 month free 🎉
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
              Share your referral code or link with fellow local merchants. When a shop completes registration with your code, you earn progress. For every 5 shops, you get 1 free month of subscription automatically added!
            </p>
          </div>

          {/* Real Referral Stats Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            {/* Code Box */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">
                Your Referral Code
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-base font-mono font-extrabold text-amber-300 tracking-wider">
                  {vendorReferralCode || 'GENERATING...'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Copy Referral Code"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Total Referrals (Clickable) */}
            <div
              onClick={() => setIsReferredModalOpen(true)}
              className="bg-black/30 hover:bg-black/45 border border-white/10 hover:border-amber-400/40 rounded-2xl p-3 flex flex-col justify-between cursor-pointer active:scale-98 transition-all group select-none shadow-xs"
              title="Click to view referred shops list"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">
                  Shops Referred
                </span>
                <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  View <ChevronRight size={11} />
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-display font-black text-white group-hover:text-amber-300 transition-colors">
                  {referralMetrics.totalCount}
                </span>
                <span className="text-[11px] text-teal-200">shops</span>
              </div>
            </div>

            {/* Next Reward Target */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">
                Next Free Month In
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-display font-black text-amber-300">
                  {referralMetrics.neededForNext}
                </span>
                <span className="text-[11px] text-teal-200">more shop{referralMetrics.neededForNext > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar with Real Cycle Progress */}
          <div className="relative z-10 space-y-1.5 max-w-md">
            <div className="flex justify-between text-xs font-display font-bold text-teal-200">
              <span>Current Cycle Progress</span>
              <span>{referralMetrics.currentCycleProgress} / 5 Referrals</span>
            </div>
            <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${referralMetrics.progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 pt-1 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-amber-300"
            >
              {copiedLink ? (
                <>
                  <Check size={16} className="text-amber-950" />
                  <span>Referral Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span>Share Referral Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyCode}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-white/15"
            >
              {copiedCode ? (
                <>
                  <Check size={15} className="text-emerald-300" />
                  <span>Code Copied: {vendorReferralCode}</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Copy Code: {vendorReferralCode || '...'}</span>
                </>
              )}
            </button>
          </div>
        </motion.section>

      </main>

      {/* Shop Timing Modal */}
      <ShopTimingModal
        vendor={vendor}
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
        onUpdated={() => {
          if (onRefreshVendor) onRefreshVendor();
        }}
      />

      {/* Customer Reviews Modal (Google Style) */}
      <VendorReviewsModal
        vendorId={vendor?.id}
        vendorName={vendor?.name || 'Your Shop'}
        vendorReviews={allVendorReviews}
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
      />

      {/* Shop Photos & Gallery Modal */}
      <ShopPhotosModal
        vendor={vendor}
        isOpen={isPhotosModalOpen}
        onClose={() => setIsPhotosModalOpen(false)}
        onPhotosUpdated={() => {
          if (onRefreshVendor) onRefreshVendor();
        }}
      />

      {/* REFERRED SHOPS POPUP MODAL */}
      <AnimatePresence>
        {isReferredModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs font-body"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-md bg-surface-card rounded-3xl p-6 shadow-2xl border border-border-light max-h-[85vh] flex flex-col overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border-light">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                    <Gift size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-extrabold text-ink">
                      Referred Shops ({referredVendorsList.length})
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Registered with code <span className="font-mono font-bold text-brand">{vendorReferralCode || vendor?.referral_code}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReferredModalOpen(false)}
                  className="p-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary Banner */}
              <div className="my-4 p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between text-xs">
                <div>
                  <p className="text-teal-900 font-display font-extrabold">Current Reward Progress</p>
                  <p className="text-teal-700 text-[11px]">
                    {referralMetrics.currentCycleProgress} / 5 shops ({referralMetrics.neededForNext} more needed for next free month)
                  </p>
                </div>
                <span className="px-3 py-1 bg-teal-600 text-white rounded-full font-display font-extrabold text-xs shrink-0">
                  {referralMetrics.totalCount} Shops
                </span>
              </div>

              {/* Scrollable List of Referred Shops */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {referredVendorsList.length > 0 ? (
                  referredVendorsList.map((shop, idx) => (
                    <div
                      key={shop.id || idx}
                      className="p-3.5 rounded-2xl bg-surface border border-border-light flex items-center justify-between gap-3 shadow-2xs hover:border-brand/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-sm font-display shrink-0">
                          {shop.name ? shop.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-ink text-sm truncate">
                            {shop.name || 'Unnamed Shop'}
                          </p>
                          <p className="text-xs text-ink-muted truncate">
                            Owner: {shop.owner_name || 'Merchant'}
                          </p>
                          {shop.created_at && (
                            <p className="text-[10px] text-ink-muted/80">
                              Joined: {new Date(shop.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {shop.referral_counted || shop.is_verified ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                            <Check size={12} strokeWidth={3} className="text-emerald-600" />
                            <span>Counted (+1)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-ink-muted text-xs">
                    <Gift size={36} className="mx-auto text-ink-muted/40 mb-2" />
                    <p className="font-bold text-ink">No shops referred yet</p>
                    <p className="mt-1">Share your referral link to earn 1 free month for every 5 shops!</p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Copy/Share Link */}
              <div className="pt-4 mt-2 border-t border-border-light flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-display font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>{copiedLink ? 'Link Copied!' : 'Share Referral Link'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AnimatedCountUp from '../ui/AnimatedCountUp';
import ShopTimingModal from './ShopTimingModal';
import VendorReviewsModal from './VendorReviewsModal';
import { getEffectiveShopStatus } from '../../utils/shopTiming';

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

  // Placeholder stats object reading from database or defaults
  const stats = {
    views: 142,
    callClicks: 38,
    whatsappClicks: 51,
    rating: 4.8,
    reviewCount: 12,
  };

  const handleCopyReferral = () => {
    const referralUrl = `https://nearbe.app/join?ref=${vendor?.phone_number || 'NEARBY50'}`;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-display">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[10px] sm:text-xs font-display font-extrabold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
              Business
            </span>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Chats Icon Button */}
            <button
              onClick={() => navigate('/chats')}
              className="p-2 rounded-full border border-border-light bg-surface hover:bg-brand/10 hover:text-brand transition-colors cursor-pointer text-ink-muted"
              title="Customer Chats"
            >
              <MessageCircle size={18} />
            </button>

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
                        navigate('/chats');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-display font-bold text-ink hover:bg-surface rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <MessageCircle size={15} className="text-brand" />
                      <span>Customer Chats</span>
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
                    <hr className="border-border-light my-1" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-display font-bold text-error hover:bg-error-light/50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
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
          className="relative rounded-3xl overflow-hidden shadow-card border border-border-light bg-black min-h-[220px] sm:aspect-[6/3] flex flex-col justify-between"
        >
          {/* Background Image with Scrim */}
          <div className="absolute inset-0 z-0">
            <img
              src={shopImage}
              alt={vendor?.name || 'Shop'}
              className="w-full h-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
          </div>

          <div className="relative z-10 p-4 sm:p-8 flex flex-col justify-between h-full text-white space-y-3 sm:space-y-4">
            {/* Top Bar inside Hero: LIVE Badge & Category Tag */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-teal-500/25 border border-teal-400/40 backdrop-blur-md shrink-0">
                {/* Pulsing Dot */}
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" style={{ animationDuration: '2s' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-teal-400" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-display font-extrabold text-teal-200 uppercase tracking-wider">
                  LIVE ON NEARBE
                </span>
              </div>

              {/* Category tag */}
              <span className="text-[10px] sm:text-[11px] font-display font-bold px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 capitalize truncate max-w-[130px] sm:max-w-none">
                {vendor?.category || 'General Merchant'}
              </span>
            </div>

            {/* Shop Details */}
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight drop-shadow-md truncate">
                {vendor?.name || 'Your Business Name'}
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-200 truncate">
                📍 {vendor?.address || 'Bangalore'}
              </p>
            </div>

            {/* Subscription Line */}
            <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
              <div className="flex items-center gap-1.5 text-teal-200 font-display font-medium min-w-0">
                <Sparkles size={13} className="text-amber-300 shrink-0" />
                <span className="truncate">
                  {isTrial ? 'Starter Free Trial' : 'NearBy Partner Pro'} —{' '}
                  <strong className="text-white font-bold">{formattedExpiry}</strong>
                </span>
              </div>

              <button
                onClick={() => navigate('/vendor/subscriptions')}
                className="text-[11px] sm:text-xs font-display font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer shrink-0"
              >
                Manage Subscription &rarr;
              </button>
            </div>
          </div>

          {/* Expiration Warning Banner */}
          {isExpiringSoon && (
            <div className="bg-amber-500 text-amber-950 px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-display font-bold">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>Your subscription plan expires soon — renew to stay live and visible to local customers.</span>
              </div>
              <button
                onClick={() => navigate('/vendor/subscriptions')}
                className="px-3 py-1 bg-amber-950 text-amber-200 hover:bg-black rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer shrink-0"
              >
                Renew Now
              </button>
            </div>
          )}
        </motion.section>

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
              <span className="text-[10px] text-emerald-600 font-bold">↑ +24% vs last week</span>
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
              <div className="text-2xl sm:text-3xl font-extrabold font-display text-ink flex items-center gap-1">
                <span>{stats.rating}</span>
                <span className="text-xs font-bold text-amber-500">★</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-ink-muted font-bold pt-0.5">
                <span>Based on {stats.reviewCount} reviews</span>
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
            {/* Customer Chats & Inquiries */}
            <motion.div
              whileHover={{ backgroundColor: 'var(--color-surface)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/chats')}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors bg-brand/5"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand/15 text-brand rounded-2xl border border-brand/20">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-extrabold text-ink">Customer Chats & Inquiries</h3>
                    <span className="px-2 py-0.5 rounded-full bg-brand text-white font-display font-extrabold text-[10px]">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">View & reply to customer messages, voice notes & locations</p>
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
                    {effectiveStatus.openingTimeFormatted} – {effectiveStatus.closingTimeFormatted} ({effectiveStatus.modeText})
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
          className="bg-gradient-to-br from-teal-900 via-brand-dark to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden space-y-5"
        >
          {/* Decorative Sparkle */}
          <div className="absolute top-4 right-4 text-teal-300/30">
            <Sparkles size={64} />
          </div>

          <div className="relative z-10 space-y-2 max-w-xl">
            <span className="text-[10px] font-display font-extrabold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 uppercase tracking-wider border border-amber-300/30 inline-block">
              Vendor Referral Program
            </span>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Refer 5 vendors, get 1 month free 🎉
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
              Share your referral link with other local merchants in your area. When 5 vendors complete shop verification, you get 30 days of Partner Pro subscription absolutely free!
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative z-10 space-y-1.5 max-w-md">
            <div className="flex justify-between text-xs font-display font-bold text-teal-200">
              <span>Referral Progress</span>
              <span>0 / 5 Referrals</span>
            </div>
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full w-0 transition-all duration-500" />
            </div>
          </div>

          {/* Copy Share Link Button */}
          <div className="relative z-10 pt-1">
            <button
              onClick={handleCopyReferral}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-amber-300"
            >
              {copied ? (
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
        vendorName={vendor?.name || 'Your Shop'}
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
      />
    </div>
  );
}

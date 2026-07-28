import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  ArrowRight,
  Clock,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BrandLoader from '../ui/BrandLoader';
import VerificationTimer from './VerificationTimer';
import DevApproveButton from './DevApproveButton';
import VendorShopDashboard from './VendorShopDashboard';

import VerifiedBadgeIcon from './icons/VerifiedBadgeIcon';
import DirectCallIcon from './icons/DirectCallIcon';
import AffordablePriceIcon from './icons/AffordablePriceIcon';
import FreeTrialIcon from './icons/FreeTrialIcon';

const categoryNames: Record<string, string> = {
  'vehicle-emergency': 'Vehicle & Emergency',
  'home-maintenance': 'Home Maintenance',
  'healthcare-wellness': 'Healthcare & Wellness',
  'daily-needs': 'Daily Needs & Hospitality',
  'education-student': 'Education & Student Stay',
};

const ConfettiLite = () => {
  const particles = Array.from({ length: 18 });
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {particles.map((_, i) => {
        const angle = (i * 360) / particles.length;
        const distance = 50 + Math.random() * 60;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;
        const color = ['#0D9488', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'][i % 5];
        return (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x,
              y,
              scale: 0.1,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
};

export default function VendorOnboardingDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showStickyBtn, setShowStickyBtn] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchVendorStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (data) {
        setVendor(data);
      }
    } catch (err) {
      console.error('Error fetching vendor status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorStatus();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const heroElement = document.getElementById('vendor-hero');
      if (heroElement) {
        const rect = heroElement.getBoundingClientRect();
        // Show sticky button when bottom of hero has scrolled past the top of viewport
        setShowStickyBtn(rect.bottom < 60);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const benefits = [
    {
      title: "Verified Badge",
      description: "Build instant trust with customers",
      icon: VerifiedBadgeIcon,
    },
    {
      title: "Direct Calls & WhatsApp",
      description: "Zero commission on any leads",
      icon: DirectCallIcon,
    },
    {
      title: "Just ₹50/month",
      description: "Affordable for every business size",
      icon: AffordablePriceIcon,
    },
    {
      title: "30-Day Free Trial",
      description: "Try it before you pay anything",
      icon: FreeTrialIcon,
    }
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.16,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 15 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const }
    }
  };

  if (loading) {
    return <BrandLoader />;
  }

  // STATE D: Subscribed / Active Live Dashboard
  if (vendor && (vendor.subscription_status === 'trial' || vendor.subscription_status === 'active' || vendor.subscription_status === 'pro')) {
    return <VendorShopDashboard vendor={vendor} onRefreshVendor={fetchVendorStatus} />;
  }

  // STATE B: Verification Pending
  if (vendor && vendor.verification_status === 'pending') {
    const displayCategory = categoryNames[vendor.category] || vendor.category || 'N/A';
    const shopFrontImage = vendor.shop_images?.[0] || 'https://picsum.photos/seed/shop/300/200';

    return (
      <div className="vendor-mode min-h-screen bg-surface pb-16 flex flex-col font-body">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold font-display">
                <span className="text-ink">Near</span>
                <span className="text-brand">By</span>
              </span>
              <span className="text-[10px] sm:text-xs font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                Business
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer border border-border px-3.5 py-1.5 rounded-full hover:bg-surface transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-border-light shadow-card p-6 sm:p-8 space-y-6"
          >
            {/* Status Banner */}
            <div className="bg-teal-50/50 border border-teal-100/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                <div className="p-2.5 bg-teal-100/60 text-teal-600 rounded-xl">
                  <Clock size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-extrabold text-teal-950">
                    Verification Pending
                  </h3>
                  <p className="text-xs text-teal-700/80 mt-0.5">
                    Your request is under review.
                  </p>
                </div>
              </div>
              
              <div className="w-full sm:w-auto flex justify-center">
                <VerificationTimer requestedAt={vendor.verification_requested_at} />
              </div>
            </div>

            <hr className="border-border-light" />

            {/* Submitted Shop Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-ink/75 font-display font-extrabold text-xs uppercase tracking-wider">
                <Info size={14} className="text-brand" />
                Submitted Shop Details
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-surface/50 border border-border-light/60 rounded-2xl">
                <img
                  src={shopFrontImage}
                  alt={vendor.name}
                  className="w-28 h-28 object-cover rounded-xl border border-border-light shadow-sm bg-surface-card"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/shop/300/200';
                  }}
                />
                <div className="text-center sm:text-left flex-1 space-y-2">
                  <div>
                    <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                      {displayCategory}
                    </span>
                  </div>
                  <h4 className="text-lg font-display font-extrabold text-ink leading-tight">
                    {vendor.name}
                  </h4>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {vendor.address}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Owner: <span className="font-semibold text-ink-light">{vendor.owner_name}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface rounded-xl border border-border-light text-left text-xs text-ink-muted leading-relaxed">
              We are verifying your storefront and identity details. No further actions are required at this stage. You will gain full access to your business dashboard once approved.
            </div>
          </motion.div>

          {/* 🛠️ TEMPORARY DEV UTILITY — Remove once real Admin Dashboard is built. */}
          <DevApproveButton
            userId={user?.id || ''}
            onApproved={async () => {
              // Re-fetch vendor data so the dashboard re-renders as State C
              const { data } = await supabase
                .from('vendors')
                .select('*')
                .eq('auth_user_id', user!.id)
                .maybeSingle();
              if (data) setVendor(data);
            }}
          />
        </main>
      </div>
    );
  }

  // STATE C: Verified / Approved
  if (vendor && vendor.verification_status === 'approved') {
    const displayCategory = categoryNames[vendor.category] || vendor.category || 'N/A';
    const shopFrontImage = vendor.shop_images?.[0] || 'https://picsum.photos/seed/shop/300/200';

    return (
      <div className="vendor-mode min-h-screen bg-surface pb-16 flex flex-col font-body relative overflow-hidden">
        {/* Confetti Lite Effect */}
        <ConfettiLite />

        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold font-display">
                <span className="text-ink">Near</span>
                <span className="text-brand">By</span>
              </span>
              <span className="text-[10px] sm:text-xs font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                Business
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer border border-border px-3.5 py-1.5 rounded-full hover:bg-surface transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 18 }}
            className="bg-white rounded-3xl border border-border-light shadow-card p-6 sm:p-8 space-y-8 text-center"
          >
            {/* Celebrating checkmark Icon with Pulse and scale effect */}
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-20 h-20 bg-teal-500 text-white rounded-full flex items-center justify-center shadow-lg border border-teal-400"
              >
                <ShieldCheck size={42} />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-teal-500/30"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* Heading & Subtext */}
            <div className="space-y-3">
              <h2 className="text-3xl font-display font-extrabold text-ink">
                You're Verified! 🎉
              </h2>
              <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
                Your shop is approved. Choose a subscription plan to go live and start attracting customers nearby.
              </p>
            </div>

            <hr className="border-border-light" />

            {/* Shop summary card */}
            <div className="space-y-4 text-left">
              <div className="text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider pl-1">
                Approved Shop Listing Details
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-teal-50/20 border border-teal-500/10 rounded-2xl">
                <img
                  src={shopFrontImage}
                  alt={vendor.name}
                  className="w-24 h-24 object-cover rounded-xl border border-border-light shadow-sm bg-surface-card"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/shop/300/200';
                  }}
                />
                <div className="text-center sm:text-left flex-1 space-y-1.5">
                  <div>
                    <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                      {displayCategory}
                    </span>
                  </div>
                  <h4 className="text-base font-display font-extrabold text-ink leading-tight">
                    {vendor.name}
                  </h4>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {vendor.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(13, 148, 136, 0.25)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/vendor/subscriptions')}
                className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] border-2 border-amber-400 hover:border-amber-500 shadow-[0_4px_14px_rgba(245,158,11,0.12)] text-sm cursor-pointer transition-all duration-300"
              >
                Continue to Subscription Plans
              </motion.button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  const handleRegisterClick = () => {
    navigate('/vendor/register');
  };

  return (
    <div className="vendor-mode min-h-screen bg-surface pb-16 flex flex-col font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-display">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[10px] sm:text-xs font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
              Business
            </span>
          </div>
          <button
            onClick={signOut}
            className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer border border-border px-3.5 py-1.5 rounded-full hover:bg-surface transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col items-center">
        
        {/* Hero Section */}
        <section id="vendor-hero" className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 mb-12 sm:mb-16">
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-ink leading-tight">
                Grow Your Business <br className="hidden sm:inline" />
                with <span className="text-brand">NearBy</span>
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-ink-light font-body mt-4 max-w-lg leading-relaxed"
            >
              Reach thousands of nearby customers looking for your services — instantly. Set up your digital storefront and start getting direct leads.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 hidden md:block"
            >
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(13, 148, 136, 0.25)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegisterClick}
                className="px-8 py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer border border-accent/20 transition-all duration-300"
              >
                <span>Register Your Shop</span>
                <ArrowRight size={16} />
              </motion.button>
              <span className="text-xs text-ink-muted font-body mt-2 block pl-2">
                Verification usually takes under 2 hours
              </span>
            </motion.div>
          </div>

          {/* Radar Shop Animation */}
          <div className="flex-1 flex justify-center relative select-none">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              
              {/* Expanding Concentric Wave Rings */}
              {[0, 1, 2, 3].map((index) => (
                <motion.div
                  key={index}
                  className="absolute rounded-full border-2 border-brand/20 pointer-events-none"
                  initial={{ width: 60, height: 60, opacity: 0.8 }}
                  animate={{
                    width: [60, 260],
                    height: [60, 260],
                    opacity: [0.8, 0]
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    delay: index * 0.875,
                    ease: "easeOut"
                  }}
                />
              ))}

              {/* Central Shop Badge */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    "0 10px 25px -5px rgba(13, 148, 136, 0.3)",
                    "0 15px 30px -5px rgba(13, 148, 136, 0.5)",
                    "0 10px 25px -5px rgba(13, 148, 136, 0.3)"
                  ]
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center border-2 border-brand-light"
              >
                <Store size={38} className="text-white" />
              </motion.div>

              {/* Customer 1 (Top Left) */}
              <motion.div
                style={{ top: '10%', left: '10%' }}
                className="absolute z-20 w-10 h-10 rounded-full bg-surface-card border border-border-light flex items-center justify-center shadow-md"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-brand-glow"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.7, 0.2]
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    delay: 0.8,
                    ease: "easeInOut"
                  }}
                />
                <User size={18} className="text-brand relative z-10" />
              </motion.div>

              {/* Customer 2 (Right Middle) */}
              <motion.div
                style={{ top: '35%', right: '5%' }}
                className="absolute z-20 w-10 h-10 rounded-full bg-surface-card border border-border-light flex items-center justify-center shadow-md"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-brand-glow"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.7, 0.2]
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    delay: 1.6,
                    ease: "easeInOut"
                  }}
                />
                <User size={18} className="text-brand relative z-10" />
              </motion.div>

              {/* Customer 3 (Bottom Left) */}
              <motion.div
                style={{ bottom: '15%', left: '20%' }}
                className="absolute z-20 w-10 h-10 rounded-full bg-surface-card border border-border-light flex items-center justify-center shadow-md"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-brand-glow"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.2, 0.7, 0.2]
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    delay: 2.4,
                    ease: "easeInOut"
                  }}
                />
                <User size={18} className="text-brand relative z-10" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Mobile Inline CTA */}
        <div className="w-full mb-12 block md:hidden">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleRegisterClick}
            className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-base flex items-center justify-center gap-2 cursor-pointer border border-accent/20"
          >
            <span>Register Your Shop</span>
            <ArrowRight size={18} />
          </motion.button>
          <span className="text-xs text-ink-muted text-center font-body mt-2 block">
            Verification usually takes under 2 hours
          </span>
        </div>

        {/* Benefits Grid */}
        <section className="w-full mt-4">
          <h3 className="text-lg font-display font-extrabold text-ink mb-6 text-center md:text-left">
            Why partner with NearBy?
          </h3>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {benefits.map((benefit, idx) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  whileHover={{ y: -6, boxShadow: "0 15px 35px rgba(13, 148, 136, 0.08)" }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="bg-white rounded-[20px] p-6 border border-border-light shadow-card flex flex-col justify-between transition-shadow duration-300 min-h-[220px]"
                >
                  <motion.div 
                    variants={iconVariants}
                    className="w-full py-6 bg-surface/30 rounded-2xl flex items-center justify-center mb-5 border border-border-light/40"
                  >
                    <IconComponent isHovered={hoveredIdx === idx} />
                  </motion.div>
                  
                  <div className="flex-1 flex flex-col justify-end text-center sm:text-left">
                    <motion.h4 
                      variants={textVariants} 
                      className="text-sm sm:text-base font-display font-extrabold text-ink leading-tight"
                    >
                      {benefit.title}
                    </motion.h4>
                    <motion.p 
                      variants={textVariants} 
                      className="text-xs sm:text-sm text-ink-muted font-body mt-1.5 leading-relaxed"
                    >
                      {benefit.description}
                    </motion.p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

      </main>

      {/* Mobile Sticky CTA Bar */}
      <AnimatePresence>
        {showStickyBtn && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-border-light p-4 z-50 flex flex-col gap-1.5 sm:hidden shadow-elevated"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleRegisterClick}
              className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm flex items-center justify-center gap-2 border border-accent/25"
            >
              <span>Register Your Shop</span>
              <ArrowRight size={16} />
            </motion.button>
            <span className="text-[10px] text-ink-muted text-center font-body">
              Verification usually takes under 2 hours
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

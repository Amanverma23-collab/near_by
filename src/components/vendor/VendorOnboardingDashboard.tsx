import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import VerifiedBadgeIcon from './icons/VerifiedBadgeIcon';
import DirectCallIcon from './icons/DirectCallIcon';
import AffordablePriceIcon from './icons/AffordablePriceIcon';
import FreeTrialIcon from './icons/FreeTrialIcon';

export default function VendorOnboardingDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showStickyBtn, setShowStickyBtn] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

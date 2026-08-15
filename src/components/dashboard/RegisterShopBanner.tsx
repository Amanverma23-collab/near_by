import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, Sparkles, ArrowRight, ShieldCheck, Clock, CheckCircle2, PhoneCall } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterShopBanner() {
  const navigate = useNavigate();
  const { hasShop, vendorStatus, vendorRecord } = useAuth();

  const handleAction = () => {
    const isSubmitted = localStorage.getItem('nearby_vendor_registration_submitted') === 'true';
    if (vendorStatus === 'approved') {
      navigate('/vendor/dashboard');
    } else if (vendorStatus === 'pending' || isSubmitted) {
      navigate('/vendor/pending');
    } else {
      navigate('/vendor/register');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mx-4 my-6 select-none"
    >
      <div className="relative rounded-3xl overflow-hidden shadow-card border border-teal-800/20 bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 p-6 sm:p-7 text-white">
        {/* Glow backdrop decorative spots */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-lg">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-display font-extrabold uppercase tracking-wider backdrop-blur-xs">
              {vendorStatus === 'approved' ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>Partner Vendor</span>
                </>
              ) : vendorStatus === 'pending' ? (
                <>
                  <Clock size={13} className="text-amber-400" />
                  <span>Verification in Progress</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-300" />
                  <span>Grow Your Business</span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight leading-snug">
              {vendorStatus === 'approved'
                ? `Manage ${vendorRecord?.name || 'Your Shop'} on NearBy`
                : vendorStatus === 'pending'
                ? 'Your Shop Registration is Under Review'
                : 'Do you own a shop or offer local services?'}
            </h3>

            {/* Description */}
            <p className="text-xs sm:text-sm text-teal-100/80 font-body leading-relaxed">
              {vendorStatus === 'approved'
                ? 'Check customer visits, update your services, and respond to local inquiries from your Vendor Dashboard.'
                : vendorStatus === 'pending'
                ? 'Your shop verification is being processed by our team. Check status and updates anytime.'
                : 'Register your shop on NearBy with 0% commission and connect with local customers through direct WhatsApp & calls.'}
            </p>

            {/* Feature Bullets (for new vendors) */}
            {vendorStatus === 'unregistered' && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-teal-200 font-display font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  0% Commission
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Direct Customer Calls
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Instant Activation
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="shrink-0 pt-1 sm:pt-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleAction}
              className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                vendorStatus === 'approved'
                  ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-teal-900/50'
                  : vendorStatus === 'pending'
                  ? 'bg-amber-400 hover:bg-amber-300 text-teal-950 shadow-amber-900/50'
                  : 'bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-teal-950 shadow-amber-900/40'
              }`}
            >
              <Store size={17} />
              <span>
                {vendorStatus === 'approved'
                  ? 'Go to Vendor Dashboard'
                  : vendorStatus === 'pending'
                  ? 'Check Verification Status'
                  : 'Register Your Shop / दुकान जोड़ें'}
              </span>
              <ArrowRight size={15} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

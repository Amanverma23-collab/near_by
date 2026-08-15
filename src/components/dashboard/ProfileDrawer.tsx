import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, Settings, LogOut, ChevronRight, Store, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useBackButton } from '../../hooks/useBackButton';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { signOut, user, role, hasShop, vendorStatus, vendorRecord } = useAuth();
  const { clearLocation } = useLocation();
  const navigate = useNavigate();

  const customerName = localStorage.getItem('nearby_customer_name') || user?.user_metadata?.full_name || 'User Account';
  const cleanPhone = (user?.phone || localStorage.getItem('nearby_customer_phone') || '').replace(/\D/g, '').slice(-10);

  useBackButton(onClose, isOpen);

  const handleLogout = async () => {
    await signOut();
    clearLocation();
    onClose();
    navigate('/', { replace: true });
  };

  const handleVendorAction = () => {
    onClose();
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop to close on outside click */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
          />

          {/* Compact Dropdown Box under burger icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-14 right-4 z-50 w-64 bg-white rounded-2xl p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.16)] border border-border-light font-body"
          >
            {/* Header User Info */}
            <div className="p-2 pb-2.5 mb-1.5 border-b border-border-light/70 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-brand-50 text-brand font-display font-extrabold text-xs flex items-center justify-center border border-brand/20 shrink-0">
                {(customerName || 'U')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-display font-extrabold text-ink truncate">
                  {customerName}
                </p>
                <p className="text-[10px] text-ink-muted">
                  {cleanPhone ? `+91 ${cleanPhone}` : 'NearBy User'}
                </p>
              </div>
            </div>

            {/* Shop Registration / Vendor Dashboard Highlight Card */}
            <div className="mb-1.5">
              <button
                onClick={handleVendorAction}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer ${
                  vendorStatus === 'approved'
                    ? 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                    : vendorStatus === 'pending'
                    ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                    : 'bg-gradient-to-r from-teal-800 to-teal-900 text-white hover:opacity-95 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${vendorStatus === 'approved' ? 'bg-teal-200/60' : vendorStatus === 'pending' ? 'bg-amber-200/60' : 'bg-white/20'}`}>
                    <Store size={14} className={vendorStatus === 'approved' ? 'text-teal-700' : vendorStatus === 'pending' ? 'text-amber-800' : 'text-amber-300'} />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">
                      {vendorStatus === 'approved'
                        ? 'Vendor Dashboard'
                        : vendorStatus === 'pending'
                        ? 'Shop Review Pending'
                        : 'Register Your Shop'}
                    </span>
                    <span className={`text-[9px] font-normal block ${vendorStatus === 'unregistered' ? 'text-teal-200' : 'opacity-80'}`}>
                      {vendorStatus === 'approved'
                        ? 'Manage shop & stats'
                        : vendorStatus === 'pending'
                        ? 'Check verification'
                        : 'Sell with 0% commission'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="opacity-70" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  navigate('/profile');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-display font-bold text-ink hover:bg-brand-50 hover:text-brand transition-colors cursor-pointer"
              >
                <UserCircle size={16} className="text-ink-muted" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-display font-bold text-ink hover:bg-brand-50 hover:text-brand transition-colors cursor-pointer"
              >
                <Settings size={16} className="text-ink-muted" />
                <span>Settings</span>
              </button>
            </div>

            {/* Logout */}
            <div className="mt-1 pt-1 border-t border-border-light/70">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-display font-bold text-error hover:bg-error-light transition-colors cursor-pointer"
              >
                <LogOut size={16} className="text-error" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

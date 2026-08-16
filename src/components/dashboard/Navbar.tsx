import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileDrawer from './ProfileDrawer';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { vendorStatus } = useAuth();

  const handleShopClick = () => {
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
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-40 backdrop-blur-nav bg-surface-card/80 border-b border-border-light"
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-extrabold font-display text-ink">
              Near
            </span>
            <span className="text-xl font-extrabold font-display text-brand">
              By
            </span>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Shop Registration / Vendor Dashboard Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleShopClick}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 transition-all border cursor-pointer shadow-xs ${
                vendorStatus === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : vendorStatus === 'pending'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-brand/10 hover:bg-brand/20 text-brand border-brand/20'
              }`}
              title={vendorStatus === 'approved' ? 'My Shop Dashboard' : vendorStatus === 'pending' ? 'Shop Verification Under Review' : 'Register Your Shop'}
              aria-label="Shop status"
            >
              <Store size={18} className={vendorStatus === 'approved' ? 'text-emerald-700' : vendorStatus === 'pending' ? 'text-amber-700' : 'text-brand'} />
              <span className="text-xs font-display font-extrabold">
                {vendorStatus === 'approved' ? 'My Shop' : vendorStatus === 'pending' ? 'Under Review' : 'Register Shop'}
              </span>
            </motion.button>

            {/* Menu */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-[var(--radius-md)] hover:bg-brand-50 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={22} className="text-ink" />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}



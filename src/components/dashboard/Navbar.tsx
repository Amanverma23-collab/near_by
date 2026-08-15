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
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand flex items-center gap-1.5 transition-all border border-brand/20 cursor-pointer shadow-xs"
              title="Register Your Shop"
              aria-label="Register Your Shop"
            >
              <Store size={20} className="text-brand" />
              <span className="hidden sm:inline text-xs font-display font-extrabold">
                {vendorStatus === 'approved' ? 'My Shop' : 'Register Shop'}
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



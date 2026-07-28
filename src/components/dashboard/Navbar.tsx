import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import ProfileDrawer from './ProfileDrawer';

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

          {/* Menu */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-[var(--radius-md)] hover:bg-brand-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} className="text-ink" />
          </motion.button>
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


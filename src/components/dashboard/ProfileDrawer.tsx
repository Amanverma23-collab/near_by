import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { signOut, user, role } = useAuth();
  const { clearLocation } = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    clearLocation();
    onClose();
    navigate('/', { replace: true });
  };

  const menuItems = [
    {
      icon: UserCircle,
      label: 'Profile',
      onClick: () => {
        navigate('/profile');
        onClose();
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        navigate('/settings');
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-surface-card shadow-elevated flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border-light">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-ink">Menu</h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-[var(--radius-sm)] hover:bg-border-light transition-colors"
                >
                  <X size={20} className="text-ink-muted" />
                </motion.button>
              </div>

              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                  <span className="text-lg font-display font-bold text-brand">
                    {user?.phone?.slice(-2) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-display font-semibold text-ink">
                    {user?.phone || 'User'}
                  </p>
                  <p className="text-xs text-ink-muted font-body capitalize">
                    {role || 'Member'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-4 space-y-1">
              {menuItems.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-brand-50 transition-colors group"
                >
                  <item.icon
                    size={20}
                    className="text-ink-muted group-hover:text-brand transition-colors"
                  />
                  <span className="flex-1 text-left text-base font-body font-medium text-ink">
                    {item.label}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-ink-muted group-hover:text-brand transition-colors"
                  />
                </motion.button>
              ))}
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-border-light">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-error-light transition-colors group"
              >
                <LogOut
                  size={20}
                  className="text-ink-muted group-hover:text-error transition-colors"
                />
                <span className="text-base font-body font-medium text-ink group-hover:text-error transition-colors">
                  Logout
                </span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

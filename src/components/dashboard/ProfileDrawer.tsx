import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useBackButton } from '../../hooks/useBackButton';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { signOut, user, role } = useAuth();
  const { clearLocation } = useLocation();
  const navigate = useNavigate();

  useBackButton(onClose, isOpen);

  const handleLogout = async () => {
    await signOut();
    clearLocation();
    onClose();
    navigate('/', { replace: true });
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
            className="absolute top-14 right-4 z-50 w-56 bg-white rounded-2xl p-2 shadow-[0_12px_36px_rgba(0,0,0,0.16)] border border-border-light font-body"
          >
            {/* Header User Info */}
            <div className="p-2 pb-2.5 mb-1 border-b border-border-light/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand font-display font-extrabold text-xs flex items-center justify-center border border-brand/20 shrink-0">
                {user?.phone?.slice(-2) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-display font-extrabold text-ink truncate">
                  {user?.phone || 'User Account'}
                </p>
                <p className="text-[10px] text-ink-muted capitalize">
                  {role || 'Customer'}
                </p>
              </div>
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

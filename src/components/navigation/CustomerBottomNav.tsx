import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Heart, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useLanguage();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleChatState = (e: any) => {
      setIsChatOpen(!!e.detail?.isOpen);
    };
    window.addEventListener('chatModalStateChange', handleChatState);
    return () => {
      window.removeEventListener('chatModalStateChange', handleChatState);
    };
  }, []);

  // Only display for customer users
  if (role !== 'customer') return null;

  // Hide when chat box is open
  if (isChatOpen) return null;

  // Paths where bottom nav should be hidden
  const hiddenPaths = ['/', '/location', '/vendor/register', '/vendor/pending', '/vendor/subscriptions'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const tabs = [
    {
      id: 'home',
      label: t('home'),
      icon: Home,
      path: '/dashboard',
    },
    {
      id: 'search',
      label: t('search'),
      icon: Search,
      path: '/search',
    },
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      path: '/chats',
    },
    {
      id: 'saved',
      label: t('saved'),
      icon: Heart,
      path: '/favorites',
    },
    {
      id: 'profile',
      label: t('profile'),
      icon: User,
      path: '/profile',
    },
  ];

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none font-body">
      {/* Light Theme Floating Navbar Island */}
      <nav className="pointer-events-auto w-full max-w-[420px] bg-white text-ink rounded-full p-2.5 px-3 shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-gray-200/80 relative flex items-center justify-between select-none">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/dashboard' && location.pathname === '/');

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="relative flex-1 h-14 flex flex-col items-center justify-end cursor-pointer group"
            >
              {isActive && (
                <>
                  {/* Light Active Outline Card Slot */}
                  <motion.div
                    layoutId="lightActiveTabOutline"
                    className="absolute inset-0 rounded-[22px] border-2 border-brand bg-brand/10 shadow-xs"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />

                  {/* Popped-Out Floating Active Badge (White Border against White Navbar) */}
                  <motion.div
                    layoutId="lightActiveTabCircle"
                    className="absolute -top-4 w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center border-4 border-white shadow-md z-20"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    <IconComponent size={19} className={tab.id === 'saved' ? 'fill-white' : ''} />
                  </motion.div>
                </>
              )}

              {/* Icon for Inactive Tab */}
              {!isActive && (
                <div className="text-gray-400 group-hover:text-ink transition-colors mb-1">
                  <IconComponent size={20} />
                </div>
              )}

              {/* Text Label */}
              <span
                className={`text-[11px] font-display font-extrabold mb-1.5 transition-colors z-10 ${
                  isActive ? 'text-brand' : 'text-gray-400 group-hover:text-ink'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

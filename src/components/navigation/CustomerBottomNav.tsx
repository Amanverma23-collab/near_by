import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, Heart, User } from 'lucide-react';
import { Keyboard } from '@capacitor/keyboard';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function CustomerBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useLanguage();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const initialHeight = window.innerHeight;

    // 1. Native Capacitor Keyboard Plugin Listeners
    let showListener: any;
    let hideListener: any;

    try {
      showListener = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
      hideListener = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
    } catch (e) {
      console.warn('Capacitor Keyboard listener fallback to web events:', e);
    }

    // 2. DOM Focus / Blur capture listeners
    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleBlur = () => {
      // Small delay to allow activeElement update
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            !active.isContentEditable)
        ) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    // 3. Window Resize & Visual Viewport Height Tracking
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const visualHeight = window.visualViewport?.height || currentHeight;
      if (currentHeight < initialHeight * 0.8 || visualHeight < initialHeight * 0.8) {
        setIsKeyboardOpen(true);
      } else {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            !active.isContentEditable)
        ) {
          setIsKeyboardOpen(false);
        }
      }
    };

    // 4. Custom Window Event Listeners
    const handleCustomHide = () => setIsKeyboardOpen(true);
    const handleCustomShow = () => setIsKeyboardOpen(false);

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('nearby_hide_nav', handleCustomHide);
    window.addEventListener('nearby_show_nav', handleCustomShow);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      showListener?.remove?.();
      hideListener?.remove?.();
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('nearby_hide_nav', handleCustomHide);
      window.removeEventListener('nearby_show_nav', handleCustomShow);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Only display for customer users
  if (role !== 'customer') return null;

  // Hide when soft keyboard is visible
  if (isKeyboardOpen) return null;

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
      <nav className="pointer-events-auto w-full max-w-[360px] bg-white text-ink rounded-full p-2.5 px-3 shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-gray-200/80 relative flex items-center justify-between select-none">
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

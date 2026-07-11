import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AuthTabsProps {
  activeTab: 'customer' | 'vendor';
  onTabChange: (tab: 'customer' | 'vendor') => void;
  children: ReactNode;
}

export default function AuthTabs({
  activeTab,
  onTabChange,
  children,
}: AuthTabsProps) {
  const tabs = [
    { id: 'customer' as const, label: 'Customer' },
    { id: 'vendor' as const, label: 'Vendor' },
  ];

  return (
    <div className="w-full">
      {/* Pill Tab Switcher */}
      <div className="relative flex bg-border-light rounded-[var(--radius-pill)] p-1 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative z-10 flex-1 py-3 px-6 text-base font-display font-semibold
              rounded-[var(--radius-pill)] transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-ink-muted hover:text-ink-light'
              }
            `}
          >
            {tab.label}
          </button>
        ))}

        {/* Animated sliding indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-[var(--radius-pill)] bg-brand shadow-brand"
          layoutId="auth-tab-indicator"
          style={{
            width: 'calc(50% - 4px)',
          }}
          animate={{
            x: activeTab === 'customer' ? 0 : 'calc(100% + 8px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 30,
          }}
        />
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: activeTab === 'customer' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: activeTab === 'customer' ? 20 : -20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

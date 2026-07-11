import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-surface"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-nav bg-surface-card/80 border-b border-border-light">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-border-light transition-colors"
          >
            <ArrowLeft size={20} className="text-ink" />
          </motion.button>
          <h1 className="text-lg font-display font-bold text-ink">Profile</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <UserCircle size={48} className="text-brand" />
          </div>
          <h2 className="text-xl font-display font-bold text-ink">
            {user?.phone || 'User'}
          </h2>
          <p className="text-sm text-ink-muted font-body capitalize">
            {role || 'Member'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-card rounded-[var(--radius-lg)] border border-border-light p-6 text-center"
        >
          <p className="text-sm text-ink-muted font-body">
            Full profile management coming in a future update.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

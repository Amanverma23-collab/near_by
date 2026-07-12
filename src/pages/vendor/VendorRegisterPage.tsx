import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function VendorRegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-surface rounded-full transition-colors cursor-pointer text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-display">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[10px] sm:text-xs font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
              Business
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-md w-full bg-surface-card rounded-[24px] p-8 border border-border-light shadow-card"
        >
          <h2 className="text-2xl font-display font-extrabold text-ink mb-2">
            Registration Step 1
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            Welcome to the business registration wizard. In the next steps, you will set up your shop profile, select your service category, and enter business hours.
          </p>

          <div className="h-2 bg-border-light rounded-full overflow-hidden mb-8">
            <div className="w-1/3 h-full bg-brand rounded-full" />
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm transition-all duration-300 border border-accent/20 cursor-pointer"
          >
            Go Back
          </button>
        </motion.div>
      </main>
    </div>
  );
}

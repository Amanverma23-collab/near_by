import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';

export default function VendorPendingPage() {
  const navigate = useNavigate();

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-display">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
              Partner
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="bg-white rounded-3xl p-8 border border-border-light shadow-card space-y-6"
        >
          <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-extrabold text-ink">
              Request Submitted!
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Your vendor verification request has been successfully received. Our team is currently reviewing your owner identity details and shop profile.
            </p>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border-light flex items-center gap-3 text-left">
            <Clock className="text-brand shrink-0" size={20} />
            <div>
              <h4 className="text-xs font-display font-extrabold text-ink">
                Verification in Progress
              </h4>
              <p className="text-[10px] text-ink-muted mt-0.5">
                Verification usually takes less than 2 hours. We will notify you once your shop listing goes live.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm cursor-pointer transition-colors border border-accent/10"
          >
            Go to Onboarding Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Check, RefreshCw, Power, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getEffectiveShopStatus, formatTime12H } from '../../utils/shopTiming';

interface ShopTimingModalProps {
  vendor: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

// Generate time options in 30-min intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const valHours = hours < 10 ? `0${hours}` : `${hours}`;
  const value = `${valHours}:${minutes}`;
  const label = formatTime12H(value);
  return { value, label };
});

export default function ShopTimingModal({
  vendor,
  isOpen,
  onClose,
  onUpdated,
}: ShopTimingModalProps) {
  const [openingTime, setOpeningTime] = useState<string>(vendor?.opening_time || '08:00');
  const [closingTime, setClosingTime] = useState<string>(vendor?.closing_time || '21:00');
  const [manualStatus, setManualStatus] = useState<'auto' | 'manual_open' | 'manual_closed'>(
    vendor?.manual_status || 'auto'
  );
  const [manualSetAt, setManualSetAt] = useState<string | null>(
    vendor?.manual_status_set_at || null
  );
  const [savingHours, setSavingHours] = useState(false);
  const [togglingManual, setTogglingManual] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Evaluate current status live
  const status = getEffectiveShopStatus({
    ...vendor,
    opening_time: openingTime,
    closing_time: closingTime,
    manual_status: manualStatus,
    manual_status_set_at: manualSetAt,
  });

  const currentManualStatus = manualStatus;

  // Save Scheduled Hours
  const handleSaveHours = async () => {
    setSavingHours(true);
    setSuccessMsg(null);
    try {
      await supabase
        .from('vendors')
        .update({
          opening_time: openingTime,
          closing_time: closingTime,
          opening_hours: `${formatTime12H(openingTime)} - ${formatTime12H(closingTime)}`,
        })
        .eq('id', vendor.id);

      setSuccessMsg('Operating hours updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error saving operating hours:', err);
    } finally {
      setSavingHours(false);
    }
  };

  // Toggle Manual Status Override ('manual_open' | 'manual_closed' | 'auto')
  const handleSetManualStatus = async (newStatus: 'manual_open' | 'manual_closed' | 'auto') => {
    const nowIso = newStatus === 'auto' ? null : new Date().toISOString();
    setManualStatus(newStatus);
    setManualSetAt(nowIso);
    setTogglingManual(true);
    setSuccessMsg(null);
    try {
      await supabase
        .from('vendors')
        .update({
          manual_status: newStatus,
          manual_status_set_at: nowIso,
        })
        .eq('id', vendor.id);

      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error setting manual status:', err);
    } finally {
      setTogglingManual(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-border-light shadow-card space-y-6 relative max-h-[90vh] overflow-y-auto font-body"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-ink-muted hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand font-display font-extrabold text-[11px] uppercase tracking-wider">
              <Clock size={12} />
              Shop Timing & Status
            </div>
            <h2 className="text-2xl font-display font-extrabold text-ink">
              Operating Hours & Override
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Configure your daily shop hours and manually override your open/closed status when needed.
            </p>
          </div>

          <hr className="border-border-light" />

          {/* Success Notification */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
              >
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ────────────────── SECTION 1: SCHEDULED HOURS ────────────────── */}
          <div className="space-y-4">
            <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider">
              Scheduled Hours
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Opening Time Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-display font-bold text-ink-light">
                  Opening Time
                </label>
                <div className="relative">
                  <select
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-display font-bold text-ink bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all cursor-pointer appearance-none"
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={`open-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Closing Time Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-display font-bold text-ink-light">
                  Closing Time
                </label>
                <div className="relative">
                  <select
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-display font-bold text-ink bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all cursor-pointer appearance-none"
                  >
                    {TIME_OPTIONS.map((opt) => (
                      <option key={`close-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Your shop will automatically show as Open/Closed based on these hours, unless you manually override it below.
            </p>

            <button
              onClick={handleSaveHours}
              disabled={savingHours}
              className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingHours ? 'Saving…' : 'Save Scheduled Hours'}
            </button>
          </div>

          <hr className="border-border-light" />

          {/* ────────────────── SECTION 2: MANUAL OVERRIDE TOGGLE ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                Manual Status Override
              </h3>
              {status.isManual && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                  Manual Active
                </span>
              )}
            </div>

            {/* Segmented Control Toggle */}
            <div className="p-1.5 bg-surface border-2 border-border-light rounded-2xl grid grid-cols-2 gap-1 relative">
              <button
                type="button"
                onClick={() => handleSetManualStatus(currentManualStatus === 'manual_open' ? 'auto' : 'manual_open')}
                disabled={togglingManual}
                className={`py-3 px-4 rounded-xl font-display font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentManualStatus === 'manual_open'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
                <span>Open Now</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetManualStatus(currentManualStatus === 'manual_closed' ? 'auto' : 'manual_closed')}
                disabled={togglingManual}
                className={`py-3 px-4 rounded-xl font-display font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  currentManualStatus === 'manual_closed'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-white" />
                <span>Close Now</span>
              </button>
            </div>

            {/* Live Effective Status Banner */}
            <div className="p-4 bg-surface rounded-2xl border border-border-light space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-ink-muted">
                  Currently Showing to Customers:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-extrabold ${
                    status.isOpen
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span>{status.modeText}</span>
                  {status.isManual && <span className="font-mono text-[9px] px-1 bg-amber-200 text-amber-900 rounded font-bold">M</span>}
                </span>
              </div>

              {status.isManual && (
                <div className="space-y-2 pt-2 border-t border-border-light/60">
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    💡 Manual override active — will automatically return to your scheduled hours at {status.closingTimeFormatted}.
                  </p>
                  <button
                    onClick={() => handleSetManualStatus('auto')}
                    disabled={togglingManual}
                    className="text-xs font-display font-bold text-brand hover:text-brand-dark underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Reset to Automatic Schedule</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-3 bg-surface hover:bg-surface-card border border-border-light text-ink font-display font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

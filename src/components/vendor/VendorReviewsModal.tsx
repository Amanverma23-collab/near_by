import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Flag, Check, AlertCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBackButton } from '../../hooks/useBackButton';

export interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  created_at: string;
  isReported?: boolean;
}

interface VendorReviewsModalProps {
  vendorId?: string;
  vendorName?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Sample Google-style reviews data with timestamps
const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    reviewerName: 'Rahul Sharma',
    rating: 5,
    comment: 'Awesome service! Dinesh ji was very polite and fixed my tyre puncture in under 10 minutes. Very fair pricing.',
    created_at: '2026-07-27T19:30:00Z',
  },
  {
    id: 'rev-2',
    reviewerName: 'Priya Verma',
    rating: 5,
    comment: 'Super fast response on WhatsApp. Arrived at my location within 15 minutes. Highly recommended for emergency repairs!',
    created_at: '2026-07-26T14:15:00Z',
  },
  {
    id: 'rev-3',
    reviewerName: 'Amit Patel',
    rating: 4,
    comment: 'Good experience. Clean shop and original spare parts. Price was reasonable.',
    created_at: '2026-07-24T11:45:00Z',
  },
  {
    id: 'rev-4',
    reviewerName: 'Vikram Singh',
    rating: 5,
    comment: 'Honest person, did not charge extra even though it was late evening. Will definitely visit again.',
    created_at: '2026-07-22T21:10:00Z',
  },
  {
    id: 'rev-5',
    reviewerName: 'Sneha Kulkarni',
    rating: 4,
    comment: 'Prompt and helpful behavior. Located right next to metro pillar.',
    created_at: '2026-07-20T16:05:00Z',
  },
];

export default function VendorReviewsModal({
  vendorName = 'Your Shop',
  isOpen,
  onClose,
}: VendorReviewsModalProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS);
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);
  const [reportReason, setReportReason] = useState<string>('Fake or Spam Review');
  const [reportSubmittedMsg, setReportSubmittedMsg] = useState<string | null>(null);

  useBackButton(onClose, isOpen);

  if (!isOpen) return null;

  // Calculate statistics
  const totalReviews = reviews.length;
  const avgRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (totalReviews || 1)
  ).toFixed(1);

  // Distribution counts (5★ down to 1★)
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.floor(r.rating) === star).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { star, count, percentage };
  });

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReview) return;

    // Mark as reported locally
    setReviews((prev) =>
      prev.map((r) => (r.id === reportingReview.id ? { ...r, isReported: true } : r))
    );

    setReportSubmittedMsg(`Review by "${reportingReview.reviewerName}" has been reported to NearBe Moderation Team.`);
    setReportingReview(null);
    setTimeout(() => setReportSubmittedMsg(null), 4000);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-body">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-border-light shadow-card space-y-6 relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-light">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Star size={20} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-ink leading-tight">
                  Customer Reviews
                </h2>
                <p className="text-xs text-ink-muted">
                  {vendorName} • Google-style ratings
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-ink-muted hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {reportSubmittedMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
              >
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{reportSubmittedMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto pr-1 space-y-6 flex-1">

            {/* ────────────────── OVERALL RATING & DISTRIBUTION (Google Style) ────────────────── */}
            <div className="p-5 bg-surface rounded-2xl border border-border-light flex flex-col sm:flex-row items-center gap-6">
              {/* Left Score */}
              <div className="text-center sm:text-left shrink-0">
                <div className="text-4xl font-extrabold font-display text-ink tracking-tight">
                  {avgRating}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1 my-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={
                        star <= Math.round(Number(avgRating))
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-gray-300'
                      }
                    />
                  ))}
                </div>
                <span className="text-xs text-ink-muted font-medium">
                  Based on {totalReviews} reviews
                </span>
              </div>

              {/* Right Bars */}
              <div className="flex-1 w-full space-y-1.5">
                {distribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-2 text-xs font-body">
                    <span className="w-3 font-bold text-ink-muted text-right">{star}</span>
                    <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-[11px] text-ink-muted text-right font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notice regarding Owner permissions */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Shop Owner Policy:</strong> Reviews cannot be deleted by shop owners to ensure transparency. You may report suspicious or inappropriate reviews to our moderation team.
              </span>
            </div>

            {/* ────────────────── REVIEWS LIST ────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                All Customer Reviews ({totalReviews})
              </h3>

              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-white rounded-2xl border border-border-light shadow-xs space-y-2.5 relative"
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar Pill */}
                        <div className="w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-display font-bold text-sm">
                          {rev.reviewerName[0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-display font-extrabold text-ink leading-tight">
                            {rev.reviewerName}
                          </h4>
                          <span className="text-[10px] text-ink-muted font-mono">
                            📅 {formatDate(rev.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Report Action Button (Vendor Only Action) */}
                      {rev.isReported ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                          🚩 Reported
                        </span>
                      ) : (
                        <button
                          onClick={() => setReportingReview(rev)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-display font-bold text-ink-muted hover:text-error hover:bg-error-light/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-error/20"
                          title="Report this review"
                        >
                          <Flag size={13} />
                          <span>Report</span>
                        </button>
                      )}
                    </div>

                    {/* Star rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          className={
                            s <= rev.rating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>

                    {/* Comment text */}
                    <p className="text-xs text-ink-light leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Close */}
          <div className="pt-2 border-t border-border-light">
            <button
              onClick={onClose}
              className="w-full py-3 bg-surface hover:bg-surface-card border border-border-light text-ink font-display font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close Reviews
            </button>
          </div>

          {/* ────────────────── REPORT REVIEW DIALOG OVERLAY ────────────────── */}
          <AnimatePresence>
            {reportingReview && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <motion.form
                  onSubmit={handleReportSubmit}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl max-w-sm w-full p-6 border border-border-light shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-error font-display font-extrabold text-sm">
                      <Flag size={18} />
                      <span>Report Review</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportingReview(null)}
                      className="text-ink-muted hover:text-ink p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Select a reason for reporting the review by <strong>{reportingReview.reviewerName}</strong>:
                  </p>

                  <div className="space-y-2">
                    {[
                      'Fake or Spam Review',
                      'Inappropriate or Abusive Language',
                      'Not Relevant to My Business',
                      'Competitor Conflict of Interest',
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-display font-bold cursor-pointer transition-colors ${
                          reportReason === reason
                            ? 'border-brand bg-brand/5 text-ink'
                            : 'border-border-light text-ink-muted hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                          className="accent-brand"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setReportingReview(null)}
                      className="flex-1 py-2.5 bg-surface text-ink font-display font-extrabold text-xs rounded-xl border border-border-light"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-error hover:bg-error/90 text-white font-display font-extrabold text-xs rounded-xl shadow-sm"
                    >
                      Submit Report
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

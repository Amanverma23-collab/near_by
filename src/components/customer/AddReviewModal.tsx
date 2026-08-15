import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Camera, Check, AlertCircle, Sparkles, Trash2, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBackButton } from '../../hooks/useBackButton';
import type { SavedReview } from '../../utils/reviewStorage';

interface AddReviewModalProps {
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (review: { reviewerName: string; rating: number; comment?: string; photoUrl?: string }) => void;
  existingReview?: SavedReview | null;
  onDeleteExistingReview?: () => Promise<void>;
}

const RATING_SENTIMENTS: Record<number, { label: string; emoji: string; color: string }> = {
  5: { label: 'Outstanding! Loved the service', emoji: '🌟', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  4: { label: 'Very Good experience', emoji: '😊', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  3: { label: 'Average / Satisfactory', emoji: '😐', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  2: { label: 'Below Expectations', emoji: '🙁', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  1: { label: 'Terrible / Needs Improvement', emoji: '⚠️', color: 'text-rose-600 bg-rose-50 border-rose-200' },
};

export default function AddReviewModal({
  vendorName,
  isOpen,
  onClose,
  onSubmitReview,
  existingReview,
  onDeleteExistingReview,
}: AddReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState(user?.user_metadata?.full_name || 'Customer');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useBackButton(onClose, isOpen);

  if (!isOpen) return null;

  // Handle Photo File Upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;

    if (rating === 0) {
      setErrorMsg('Please select a star rating (1 to 5 stars is required).');
      return;
    }

    setErrorMsg(null);
    setSubmitted(true);

    setTimeout(() => {
      onSubmitReview({
        reviewerName: reviewerName.trim() || 'Verified Customer',
        rating,
        comment: comment.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });

      setRating(0);
      setComment('');
      setPhotoUrl(null);
      setSubmitted(false);
      onClose();
    }, 600);
  };

  const currentActiveRating = hoverRating || rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-body">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 border border-border-light shadow-elevated space-y-5 relative max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-lg font-display font-extrabold text-ink leading-tight">
                  Rate & Review Shop
                </h2>
                <p className="text-xs text-ink-muted">
                  {vendorName} • Google Reviews
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* If user already reviewed, show requirement to delete previous rating first */}
          {existingReview ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-display font-extrabold text-xs">
                  <Info size={16} className="text-amber-700 shrink-0" />
                  <span>You have already rated this shop</span>
                </div>
                <p className="text-xs text-ink-light leading-relaxed">
                  A user can only submit 1 rating per shop. To change your rating or submit a new review, please delete your previous rating first.
                </p>
              </div>

              {/* Previous Review Summary */}
              <div className="p-4 bg-surface border border-border-light rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-display font-bold text-ink-muted uppercase">Your Current Rating</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= existingReview.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                      />
                    ))}
                    <span className="text-xs font-bold text-ink ml-1">{existingReview.rating}★</span>
                  </div>
                </div>
                {existingReview.comment && (
                  <p className="text-xs text-ink-light italic">"{existingReview.comment}"</p>
                )}
              </div>

              {/* Action: Delete Previous Rating & Re-rate */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    if (onDeleteExistingReview) {
                      await onDeleteExistingReview();
                    }
                    setIsDeleting(false);
                  }}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-display font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  <span>{isDeleting ? 'Deleting Rating...' : 'Delete Previous Rating & Rate Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-ink-muted hover:text-ink font-display font-bold text-xs cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-12 text-center space-y-3"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
                <Check size={32} />
              </div>
              <h3 className="text-lg font-display font-extrabold text-ink">Review Published!</h3>
              <p className="text-xs text-ink-muted">Thank you for helping local customers nearby.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* 1. MANDATORY STAR RATING (Interactive & Animated) */}
              <div className="space-y-2 text-center bg-gradient-to-b from-surface to-white p-4 sm:p-5 rounded-2xl border border-border-light shadow-xs">
                <label className="block text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                  Tap to Rate <span className="text-error font-extrabold">* Required</span>
                </label>

                <div className="flex items-center justify-center gap-2.5 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= currentActiveRating;
                    return (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.3, rotate: 6 }}
                        whileTap={{ scale: 0.85 }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => {
                          setRating(star);
                          setErrorMsg(null);
                        }}
                        className="p-1 cursor-pointer focus:outline-none"
                      >
                        <Star
                          size={34}
                          className={`transition-all duration-200 ${
                            isFilled
                              ? 'text-amber-500 fill-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)]'
                              : 'text-gray-300 hover:text-amber-300'
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Sentiment pill badge */}
                <div className="h-7 flex items-center justify-center">
                  {currentActiveRating > 0 ? (
                    <motion.span
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-extrabold border ${RATING_SENTIMENTS[currentActiveRating].color}`}
                    >
                      <span>{RATING_SENTIMENTS[currentActiveRating].emoji}</span>
                      <span>{RATING_SENTIMENTS[currentActiveRating].label}</span>
                    </motion.span>
                  ) : (
                    <span className="text-xs text-ink-muted font-body">Tap 1 to 5 stars above</span>
                  )}
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <label className="block text-xs font-display font-bold text-ink-light">
                  Your Name
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 text-xs font-body bg-surface border border-border-light rounded-xl outline-none focus:border-brand"
                />
              </div>

              {/* 2. OPTIONAL COMMENT */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-display font-bold text-ink-light">
                    Write Details / Experience
                  </label>
                  <span className="text-[10px] text-ink-muted font-bold">(Optional)</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="What did you like about the service or shop?"
                  className="w-full px-3.5 py-2.5 text-xs font-body bg-surface border border-border-light rounded-xl outline-none focus:border-brand resize-none"
                />
              </div>

              {/* 3. OPTIONAL PHOTO UPLOAD */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-display font-bold text-ink-light">
                    Attach Service Photo
                  </label>
                  <span className="text-[10px] text-ink-muted font-bold">(Optional)</span>
                </div>

                {photoUrl ? (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border-light group shadow-xs">
                    <img src={photoUrl} alt="Review attachment" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 bg-surface border border-dashed border-border-light rounded-2xl hover:border-brand transition-colors cursor-pointer text-xs font-display font-bold text-ink-muted hover:text-brand">
                    <Camera size={16} />
                    <span>Upload Service Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Action */}
              <div className="flex gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-surface text-ink font-display font-extrabold text-xs rounded-xl border border-border-light cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitted}
                  className="flex-1 py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-brand cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{submitted ? 'Publishing...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

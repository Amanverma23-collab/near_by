import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Trash2,
  StarOff,
  Store,
  Calendar,
  MessageSquare,
  Check,
} from 'lucide-react';
import { getAllUserReviews, deleteReview, type SavedReview } from '../utils/reviewStorage';
import { useLanguage } from '../context/LanguageContext';

/* ──────── Star Rendering ──────── */
function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={size}
        className={
          i <= rating
            ? 'text-amber-500 fill-amber-500'
            : 'text-amber-200 fill-amber-200'
        }
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

/* ──────── Format date ──────── */
function formatReviewDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function MyRatingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setReviews(getAllUserReviews());
  }, []);

  const handleDelete = (review: SavedReview) => {
    setDeletingId(review.id);
    setTimeout(() => {
      deleteReview(review.vendorId, review.id);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      setDeletingId(null);
      setToast(t('rating_deleted'));
      setTimeout(() => setToast(null), 3000);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-surface font-body pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t('back')}</span>
          </button>

          <h1 className="text-lg font-display font-extrabold text-ink">
            {t('my_ratings')}
          </h1>

          <span className="text-xs font-display font-extrabold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {reviews.length} {t('ratings_given')}
          </span>
        </div>
      </header>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <Check size={14} className="text-emerald-600" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {reviews.length === 0 ? (
          /* ──── Empty State ──── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 border border-border-light text-center space-y-4 shadow-xs mt-6"
          >
            <div className="p-4 bg-amber-50 text-amber-500 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <StarOff size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-ink">
                {t('no_ratings_yet')}
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
                Jab aap kisi shop ko rate karenge, woh rating yahaan dikhegi. Aap kisi bhi vendor ki detail page pe jaake "Rate & Review" button se rating de sakte hain.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <Store size={16} />
              <span>Explore Nearby Vendors</span>
            </button>
          </motion.div>
        ) : (
          /* ──── Rating Cards List ──── */
          <div className="space-y-3">
            <AnimatePresence>
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: deletingId === review.id ? 0.4 : 1,
                    y: 0,
                    scale: deletingId === review.id ? 0.96 : 1,
                  }}
                  exit={{ opacity: 0, x: -60, height: 0 }}
                  className="bg-white rounded-2xl p-4 border border-border-light shadow-xs space-y-3 relative overflow-hidden"
                >
                  {/* Top Row: Vendor Name + Delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Vendor Name */}
                      <div
                        onClick={() => navigate(`/vendor/${review.vendorId}`)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Store size={14} className="text-brand shrink-0" />
                          <h3 className="text-sm font-display font-extrabold text-ink truncate leading-tight hover:text-brand transition-colors">
                            {review.vendorName || 'Unknown Shop'}
                          </h3>
                        </div>
                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.rating} size={16} />
                        <span className="text-xs font-display font-extrabold text-amber-700">
                          {review.rating}.0
                        </span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(review)}
                      disabled={deletingId === review.id}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      title={t('delete_rating')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Comment (if any) */}
                  {review.comment && (
                    <div className="flex items-start gap-2 pl-1">
                      <MessageSquare size={12} className="text-ink-muted shrink-0 mt-0.5" />
                      <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">
                        "{review.comment}"
                      </p>
                    </div>
                  )}

                  {/* Photo (if any) */}
                  {review.photoUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-border-light">
                      <img
                        src={review.photoUrl}
                        alt="Review photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Bottom: Date */}
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-muted font-bold pt-1 border-t border-border-light/60">
                    <Calendar size={11} className="text-ink-light" />
                    <span>{formatReviewDate(review.created_at)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

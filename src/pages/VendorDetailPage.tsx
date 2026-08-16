import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Star, BadgeCheck, Phone, Clock,
  ChevronLeft, ChevronRight, Navigation, ExternalLink, MessageSquare, Plus, Check, Trash2,
} from 'lucide-react';
import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { getEffectiveShopStatus } from '../utils/shopTiming';
import { fetchCombinedVendors, trackVendorCall, trackVendorWhatsApp, trackVendorView } from '../utils/vendorSync';
import AddReviewModal from '../components/customer/AddReviewModal';
import { getSavedReviews, saveNewReview, deleteReview } from '../utils/reviewStorage';
import { useAuth } from '../context/AuthContext';
import SaveHeartButton from '../components/ui/SaveHeartButton';
import ChatBoxModal from '../components/chat/ChatBoxModal';
import { getOrCreateConversation } from '../utils/chatStorage';
import type { ChatConversation } from '../utils/chatStorage';
import BrandLoader from '../components/ui/BrandLoader';

/* ──────────────────── WhatsApp SVG Icon ──────────────────── */
const WhatsAppIcon = ({ size = 16, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.456h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/* ──────────────────── Star Rendering ──────────────────── */
function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<Star key={i} size={size} className="text-amber-500 fill-amber-500" />);
    } else if (i - 0.5 <= rating) {
      stars.push(
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="text-amber-200 fill-amber-200 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={size} className="text-amber-500 fill-amber-500" />
          </span>
        </span>
      );
    } else {
      stars.push(<Star key={i} size={size} className="text-amber-200 fill-amber-200" />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

/* ──────────────────── Section Fade-In Wrapper ──────────────────── */
function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  VENDOR DETAIL PAGE                                           */
/* ════════════════════════════════════════════════════════════════ */
export default function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();

  const [allVendors, setAllVendors] = useState<Vendor[]>(dummyVendors);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCombinedVendors()
      .then((vendors) => {
        setAllVendors(vendors);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading vendors:', err);
        setLoading(false);
      });

    if (vendorId) {
      getSavedReviews(vendorId).then((revs) => {
        setCustomReviews(revs);
      });
    }
  }, [vendorId]);

  const vendor = allVendors.find((v) => v.id === vendorId) || dummyVendors.find((v) => v.id === vendorId);
  const effectiveStatus = getEffectiveShopStatus(vendor || {});

  const { user } = useAuth();
  const currentPhone = (
    localStorage.getItem('nearby_customer_phone') ||
    user?.phone ||
    user?.user_metadata?.phone_number ||
    ''
  ).replace(/\D/g, '').slice(-10);
  const currentName = (
    localStorage.getItem('nearby_customer_name') ||
    user?.user_metadata?.full_name ||
    ''
  ).trim().toLowerCase();

  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [customReviews, setCustomReviews] = useState<any[]>([]);
  const [reviewToast, setReviewToast] = useState<string | null>(null);

  const [activeChatConv, setActiveChatConv] = useState<ChatConversation | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const viewTrackedRef = useRef<string | null>(null);

  const handleDeleteUserReview = async (reviewId: string) => {
    if (!vendor) return;
    const targetVendorId = vendor.id || vendorId || 'v1';
    await deleteReview(targetVendorId, reviewId);
    setCustomReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setReviewToast('Your previous rating has been deleted. You can now submit a new rating.');
    setTimeout(() => setReviewToast(null), 4000);
  };

  const handleStartChat = () => {
    if (!vendor) return;
    const conv = getOrCreateConversation({
      vendorId: vendor.id || vendorId || 'v-1',
      vendorName: vendor.name,
      vendorShopPhoto: vendor.shopImages?.[0],
      vendorSubService: vendor.subService,
    });
    setActiveChatConv(conv);
    setIsChatModalOpen(true);
  };

  useEffect(() => {
    if (vendorId) {
      getSavedReviews(vendorId).then((saved) => {
        setCustomReviews(saved);
      });

      // Track real profile view exactly 1 time per page visit (in DB & localStorage)
      if (viewTrackedRef.current !== vendorId) {
        viewTrackedRef.current = vendorId;
        trackVendorView(vendor?.id || vendorId, vendor?.phoneNumber);
      }
    }
  }, [vendorId]);

  const handleCallClick = () => {
    trackVendorCall(vendor?.id || vendorId, vendor?.phoneNumber);
  };

  const handleWhatsAppClick = () => {
    trackVendorWhatsApp(vendor?.id || vendorId, vendor?.whatsappNumber || vendor?.phoneNumber);
  };

  /* ── Gallery state ── */
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  /* Auto-advance gallery */
  useEffect(() => {
    if (!vendor) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % vendor.shopImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [vendor]);

  /* ── Touch swipe handlers ── */
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    if (!vendor) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrentSlide((prev) => (prev + 1) % vendor.shopImages.length);
      else setCurrentSlide((prev) => (prev - 1 + vendor.shopImages.length) % vendor.shopImages.length);
    }
  };

  const scrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const waMsg = encodeURIComponent('Hi, I found your business on NearBy and would like to inquire about your services.');

  /* ── Loading Guard ── */
  if (loading && !vendor) {
    return <BrandLoader />;
  }

  /* ── 404 ── */
  if (!vendor) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold text-ink mb-2">Vendor not found</h2>
          <p className="text-sm text-ink-muted font-body mb-6">This vendor may have been removed.</p>
          <button onClick={() => navigate(-1)} className="text-brand font-display font-bold text-sm cursor-pointer">← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen bg-surface pb-24 sm:pb-6"
    >
      {/* ═══════════ A — IMAGE GALLERY ═══════════ */}
      <div
        className="relative w-full aspect-[3/2] sm:aspect-[2/1] bg-ink/5 overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={vendor.shopImages[currentSlide]}
            alt={`${vendor.name} photo ${currentSlide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Back button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </motion.button>

        {/* Heart Save / Verified badge overlay */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {vendor.isVerified && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-pill)] bg-white/90 backdrop-blur-sm shadow-sm">
              <BadgeCheck size={14} className="text-brand" />
              <span className="text-[10px] font-display font-bold text-brand">Verified</span>
            </div>
          )}
          <SaveHeartButton vendorId={vendor.id || vendorId || ''} size={18} className="bg-white/90 backdrop-blur-sm shadow-sm p-2" />
        </div>

        {/* Prev / Next arrows (desktop) */}
        {vendor.shopImages.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + vendor.shopImages.length) % vendor.shopImages.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer hidden sm:flex"
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % vendor.shopImages.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer hidden sm:flex"
              aria-label="Next image"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {vendor.shopImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {vendor.shopImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  i === currentSlide ? 'bg-white w-5' : 'bg-white/50'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ Content ═══════════ */}
      <div className="max-w-md mx-auto px-4">

        {/* ═══════════ B — SHOP INFO HEADER ═══════════ */}
        <FadeInSection delay={0.05} className="mt-5 mb-5">
          {/* Name + badge + Save/Like Heart Button */}
          <div className="flex justify-between items-start gap-3 mb-1">
            <div className="flex items-start gap-1.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-display font-extrabold text-ink leading-tight">
                {vendor.name}
              </h1>
              {vendor.isVerified && (
                <BadgeCheck size={20} className="text-brand shrink-0 mt-0.5" />
              )}
            </div>

            <SaveHeartButton
              vendorId={vendor.id || vendorId || ''}
              size={20}
              className="p-2 bg-white border border-border-light shadow-xs shrink-0"
            />
          </div>

          {/* Owner */}
          <p className="text-xs text-ink-muted font-body mb-3">
            Owned by <span className="font-semibold text-ink-light">{vendor.ownerName}</span>
          </p>

          {/* SubService pill */}
          <span className="inline-block px-2.5 py-0.5 bg-surface text-ink-muted border border-border-light rounded-[var(--radius-pill)] text-[9px] font-display font-semibold uppercase tracking-wider mb-3">
            {vendor.subService}
          </span>

          {/* Rating row — tappable */}
          <button
            onClick={scrollToReviews}
            className="flex items-center gap-2 mb-3 cursor-pointer group"
          >
            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-[#FFFBEB] border border-[#FEF3C7] rounded-[var(--radius-sm)]">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-xs font-display font-bold text-amber-800">
                {vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'}
              </span>
            </div>
            <span className="text-xs text-ink-muted font-body group-hover:text-brand transition-colors">
              {vendor.reviewCount > 0 ? `(${vendor.reviewCount} reviews)` : '(No reviews yet)'}
            </span>
          </button>

          {/* Distance + open/closed */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-body">
            <div className="flex items-center gap-1">
              <MapPin size={12} className="text-brand" />
              <span className="text-ink-muted">{vendor.distanceKm.toFixed(1)} km away</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-ink-muted/80" />
              <div className={`w-1.5 h-1.5 rounded-full ${effectiveStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              <span className={effectiveStatus.isOpen ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                {effectiveStatus.isOpen ? 'Open Now' : 'Closed'}
              </span>
              {effectiveStatus.isManual && (
                <span className="font-mono text-[9px] px-1 bg-amber-100 text-amber-900 rounded font-bold">Manual</span>
              )}
              <span className="text-ink-muted">• {effectiveStatus.openingTimeFormatted} – {effectiveStatus.closingTimeFormatted}</span>
            </div>
          </div>
        </FadeInSection>

        {/* ═══════════ C — ACTION BUTTONS ═══════════ */}
        <FadeInSection delay={0.12} className="mb-6">
          <div className="grid grid-cols-4 gap-2">
            {/* Call */}
            <a
              href={`tel:${vendor.phoneNumber}`}
              onClick={handleCallClick}
              className="flex items-center justify-center gap-1 bg-brand hover:bg-brand-dark text-white py-3 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors shadow-sm shadow-brand/10 cursor-pointer"
            >
              <Phone size={14} />
              <span>Call</span>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/91${vendor.whatsappNumber}?text=${waMsg}`}
              onClick={handleWhatsAppClick}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 border border-[#25D366]/40 hover:bg-[#25D366]/5 text-[#128C7E] py-3 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer"
            >
              <WhatsAppIcon size={14} className="text-[#25D366]" />
              <span>WhatsApp</span>
            </a>

            {/* In-App Direct Chat */}
            <button
              onClick={handleStartChat}
              className="flex items-center justify-center gap-1 border border-brand/40 bg-brand/5 hover:bg-brand/10 text-brand py-3 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer shadow-xs"
            >
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>

            {/* View on Map */}
            <a
              href={`https://www.google.com/maps?q=${vendor.latitude},${vendor.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 border border-border-light hover:border-brand/30 hover:text-brand text-ink-muted py-3 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer"
            >
              <Navigation size={14} />
              <span>Map</span>
            </a>
          </div>
        </FadeInSection>

        {/* ═══════════ D — LOCATION SECTION ═══════════ */}
        <FadeInSection delay={0.18} className="mb-6">
          <div className="bg-surface-card rounded-[var(--radius-lg)] border border-border-light shadow-sm overflow-hidden">
            {/* Embedded Map */}
            <div className="w-full aspect-[16/9] bg-border">
              <iframe
                title="Vendor location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${vendor.longitude - 0.005},${vendor.latitude - 0.003},${vendor.longitude + 0.005},${vendor.latitude + 0.003}&layer=mapnik&marker=${vendor.latitude},${vendor.longitude}`}
              />
            </div>
            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin size={14} className="text-brand shrink-0 mt-0.5" />
                <p className="text-xs text-ink-light font-body leading-relaxed">{vendor.address}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-[10px] font-display font-bold text-brand hover:underline cursor-pointer"
              >
                Directions <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </FadeInSection>

        {/* ═══════════ E — SERVICES & PRICING ═══════════ */}
        <FadeInSection delay={0.24} className="mb-6">
          <h3 className="text-sm font-display font-extrabold text-ink mb-3">Services Offered</h3>
          <div className="bg-surface-card rounded-[var(--radius-lg)] border border-border-light shadow-sm overflow-hidden divide-y divide-border-light/60">
            {vendor.servicesOffered.map((svc, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-xs font-body text-ink">{svc.name}</span>
                {svc.price ? (
                  <span className="text-xs font-display font-bold text-ink shrink-0">{svc.price}</span>
                ) : (
                  <span className="text-[10px] font-body italic text-ink-muted shrink-0">Contact for price</span>
                )}
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* ═══════════ F — REVIEWS SECTION (GOOGLE REVIEWS STYLE) ═══════════ */}
        {(() => {
          const allReviewsList = customReviews;
          const totalReviewCount = allReviewsList.length;
          const avgRatingScore = (
            allReviewsList.reduce((acc, r) => acc + Number(r.rating || 5), 0) / (totalReviewCount || 1)
          ).toFixed(1);

          // Find if the logged in customer has already submitted a review
          const existingUserReview = allReviewsList.find((r) => {
            if (!r) return false;
            const rPhone = (r.reviewerPhone || '').replace(/\D/g, '').slice(-10);
            if (currentPhone && rPhone && currentPhone === rPhone) return true;
            if (currentName && r.reviewerName && currentName === r.reviewerName.trim().toLowerCase()) return true;
            return false;
          });

          // 5-Star distribution calculations
          const distribution = [5, 4, 3, 2, 1].map((star) => {
            const count = allReviewsList.filter((r) => Math.floor(r.rating) === star).length;
            const pct = totalReviewCount > 0 ? (count / allReviewsList.length) * 100 : 0;
            return { star, count, pct };
          });

          return (
            <FadeInSection delay={0.30} className="mb-8">
              <div ref={reviewsSectionRef} className="scroll-mt-20 space-y-4">
                {/* Header title & write button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-display font-extrabold text-ink leading-tight">
                      Customer Reviews & Ratings
                    </h3>
                    <p className="text-[11px] text-ink-muted">
                      Verified ratings from customers nearby
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsAddReviewOpen(true)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 font-display font-extrabold text-xs rounded-xl shadow-sm cursor-pointer transition-all ${
                      existingUserReview
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                        : 'bg-brand hover:bg-brand-dark text-white shadow-brand'
                    }`}
                  >
                    {existingUserReview ? (
                      <>
                        <Star size={14} className="fill-white" />
                        <span>Your Rating ({existingUserReview.rating}★)</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Rate & Review</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Review Toast Success */}
                <AnimatePresence>
                  {reviewToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
                    >
                      <Check size={16} className="text-emerald-600 shrink-0" />
                      <span>{reviewToast}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── GOOGLE REVIEWS BREAKDOWN CARD ── */}
                <div className="bg-white rounded-3xl p-5 border border-border-light shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Left Score */}
                    <div className="text-center sm:text-left shrink-0">
                      <div className="text-5xl font-extrabold font-display text-ink tracking-tight">
                        {totalReviewCount > 0 ? avgRatingScore : '0.0'}
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-1 my-1.5">
                        <RatingStars rating={totalReviewCount > 0 ? Number(avgRatingScore) : 0} size={18} />
                      </div>
                      <span className="text-xs text-ink-muted font-display font-bold">
                        {totalReviewCount > 0 ? `${totalReviewCount} verified ratings` : 'No ratings yet'}
                      </span>
                    </div>

                    {/* Right Star Breakdown Bars */}
                    <div className="flex-1 w-full space-y-1.5">
                      {distribution.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2.5 text-xs">
                          <span className="w-3 font-bold text-ink-muted text-right font-mono">{star}</span>
                          <Star size={12} className="text-amber-500 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full bg-amber-400 rounded-full"
                            />
                          </div>
                          <span className="w-5 text-[11px] text-ink-muted text-right font-mono font-bold">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── INDIVIDUAL REVIEW CARDS ── */}
                <div className="space-y-3 pt-1">
                  {allReviewsList.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-border-light shadow-card text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                        <Star size={24} className="fill-amber-400 text-amber-400" />
                      </div>
                      <h4 className="text-sm font-display font-extrabold text-ink">No Reviews Yet</h4>
                      <p className="text-xs text-ink-muted max-w-xs mx-auto">
                        Be the first customer to rate and review this shop!
                      </p>
                      <button
                        onClick={() => setIsAddReviewOpen(true)}
                        className="px-4 py-2 bg-brand text-white text-xs font-display font-extrabold rounded-xl shadow-brand hover:bg-brand-dark transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Write First Review</span>
                      </button>
                    </div>
                  ) : (
                    allReviewsList.map((review, idx) => {
                      const isMyReview = existingUserReview && review.id === existingUserReview.id;
                      const avatarColor = [
                        'bg-teal-500 text-white',
                        'bg-amber-500 text-white',
                        'bg-emerald-500 text-white',
                        'bg-rose-500 text-white',
                        'bg-indigo-500 text-white',
                      ][idx % 5];

                      return (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs space-y-3 relative ${
                            isMyReview ? 'border-amber-300 ring-2 ring-amber-100' : 'border-border-light'
                          }`}
                        >
                          {/* Header: User Avatar & Name */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${avatarColor} font-display font-bold text-sm flex items-center justify-center shadow-xs`}>
                                {(review.reviewerName || 'C')[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-sm font-display font-extrabold text-ink leading-tight">
                                    {review.reviewerName}
                                  </h4>
                                  {isMyReview ? (
                                    <span className="px-2 py-0.2 bg-amber-50 text-amber-800 text-[9px] font-display font-extrabold rounded-full border border-amber-200 uppercase tracking-wider">
                                      Your Rating
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.2 bg-teal-50 text-teal-700 text-[9px] font-display font-extrabold rounded-full border border-teal-100 uppercase tracking-wider">
                                      Verified Customer
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-ink-muted font-body">
                                  📅 {review.created_at ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (review.daysAgo === 0 ? 'Today' : review.daysAgo === 1 ? 'Yesterday' : `${review.daysAgo || 1} days ago`)}
                                </span>
                              </div>
                            </div>

                            {/* Delete Rating Button if it's the current user's review */}
                            {isMyReview && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUserReview(review.id)}
                                className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-display font-bold cursor-pointer"
                                title="Delete rating to submit a new one"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>

                          {/* Rating Stars */}
                          <div className="flex items-center gap-1">
                            <RatingStars rating={review.rating} size={14} />
                          </div>

                          {/* Comment text */}
                          {review.comment && (
                            <p className="text-xs text-ink-light font-body leading-relaxed">
                              "{review.comment}"
                            </p>
                          )}

                          {/* Review Photo Attachment */}
                          {review.photoUrl && (
                            <div className="pt-1">
                              <div className="w-28 h-28 rounded-2xl overflow-hidden border border-border-light shadow-xs hover:opacity-90 transition-opacity">
                                <img src={review.photoUrl} alt="Customer review" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Add Review Modal */}
                <AddReviewModal
                  vendorName={vendor.name}
                  isOpen={isAddReviewOpen}
                  existingReview={existingUserReview}
                  onDeleteExistingReview={async () => {
                    if (existingUserReview) {
                      await handleDeleteUserReview(existingUserReview.id);
                    }
                  }}
                  onClose={() => setIsAddReviewOpen(false)}
                  onSubmitReview={async (newRev) => {
                    const savedItem = await saveNewReview(vendor.id || vendorId || 'v1', {
                      reviewerName: newRev.reviewerName,
                      rating: newRev.rating,
                      comment: newRev.comment,
                      photoUrl: newRev.photoUrl,
                      vendorName: vendor.name,
                    });

                    setCustomReviews((prev) => [savedItem, ...prev]);
                    setReviewToast('Thank you! Your rating and review has been published.');
                    setTimeout(() => setReviewToast(null), 4000);
                  }}
                />
              </div>
            </FadeInSection>
          );
        })()}
      </div>

      {/* ═══════════ G — STICKY BOTTOM BAR (mobile) ═══════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-surface-card/95 backdrop-blur-nav border-t border-border-light px-4 py-2.5">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <a
            href={`tel:${vendor.phoneNumber}`}
            onClick={handleCallClick}
            className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors shadow-sm shadow-brand/10 cursor-pointer"
          >
            <Phone size={15} />
            <span>Call</span>
          </a>

          <a
            href={`https://wa.me/91${vendor.whatsappNumber}?text=${waMsg}`}
            onClick={handleWhatsAppClick}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 border border-[#25D366]/40 hover:bg-[#25D366]/5 text-[#128C7E] py-2.5 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer"
          >
            <WhatsAppIcon size={15} className="text-[#25D366]" />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={handleStartChat}
            className="flex items-center justify-center gap-1.5 border border-brand/40 bg-brand/10 text-brand py-2.5 rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer shadow-xs"
          >
            <MessageSquare size={15} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Chat Box Modal */}
      <ChatBoxModal
        conversation={activeChatConv}
        currentUserRole="customer"
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </motion.div>
  );
}

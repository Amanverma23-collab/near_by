import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation as useRouterLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, BadgeCheck, Phone, AlertCircle, Clock, SlidersHorizontal } from 'lucide-react';
import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { getEffectiveShopStatus } from '../utils/shopTiming';
import { fetchCombinedVendors, trackVendorCall, trackVendorWhatsApp } from '../utils/vendorSync';
import { formatDistance, RADIUS_OPTIONS, filterNearbyVendors } from '../utils/haversine';
import { formatDurationMin } from '../utils/roadDistance';
import SaveHeartButton from '../components/ui/SaveHeartButton';
import { useLocation as useAppLocation } from '../context/LocationContext';

const categoryNames: Record<string, string> = {
  'vehicle-emergency': 'Vehicle & Emergency Support',
  'home-maintenance': 'Home Maintenance',
  'healthcare-wellness': 'Healthcare & Wellness',
  'daily-needs': 'Daily Needs & Hospitality',
  'education-student': 'Education & Student Stay',
};

const WhatsAppIcon = ({ size = 16, className = "" }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.456h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function SkeletonCard() {
  return (
    <div className="bg-surface-card rounded-[var(--radius-lg)] p-4 border border-border-light shadow-sm animate-pulse mb-4">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-border rounded w-2/3" />
          <div className="h-3.5 bg-border rounded w-1/4" />
        </div>
        <div className="h-5 w-10 bg-border rounded" />
      </div>
      <div className="h-4 bg-border rounded w-1/2 mb-5" />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="h-10 bg-border rounded" />
        <div className="h-10 bg-border rounded" />
      </div>
    </div>
  );
}

const DEFAULT_CATEGORY_SUB_SERVICES: Record<string, string[]> = {
  'vehicle-emergency': ['Mechanic', 'Towing', 'Puncture Repair', 'Fuel Delivery'],
  'home-maintenance': ['Electrician', 'Plumber', 'AC Repair', 'Carpenter', 'Cleaning', 'Hardware Shop'],
  'healthcare-wellness': ['Doctors', 'Clinics', 'Pharmacy', 'Lab Tests', 'Salon'],
  'daily-needs': ['Grocery/Kirana', 'Hotel', 'Cafe', 'Restaurant', 'Laundry', 'Clothing Shop'],
  'education-student': ['Coaching/Academy', 'Library', 'Mess', 'Hostel/PG', 'Book Store', 'Cyber Cafe'],
};

const isVendorMatch = (vendor: Vendor, filter: string): boolean => {
  if (!filter || filter === 'All') return true;

  const f = filter.toLowerCase().trim();
  const vs = (vendor.subService || '').toLowerCase();
  const vn = (vendor.name || '').toLowerCase();
  const vServices = Array.isArray(vendor.servicesOffered)
    ? vendor.servicesOffered.map((s) => s.name.toLowerCase()).join(' ')
    : '';

  // Direct substring check
  if (vs.includes(f) || f.includes(vs)) return true;
  if (vn.includes(f) || vServices.includes(f)) return true;

  // Keyword / Synonym mapping
  const synonymMap: Record<string, string[]> = {
    'doctors': ['doctor', 'dr', 'physician', 'hospital'],
    'doctor': ['doctor', 'doctors', 'dr', 'physician', 'hospital'],
    'clinics': ['clinic', 'clinics', 'dispensary'],
    'clinic': ['clinic', 'clinics', 'dispensary'],
    'grocery/kirana': ['grocery', 'kirana', 'store', 'kirana store', 'general store', 'kirana/grocery'],
    'kirana store': ['grocery', 'kirana', 'grocery/kirana', 'general store'],
    'cafe': ['cafe', 'coffee', 'tea', 'bistro'],
    'restaurant': ['restaurant', 'food', 'dining', 'hotel'],
    'hotel': ['hotel', 'stay', 'rooms', 'lodge'],
    'laundry': ['laundry', 'dry clean', 'ironing', 'dhobi'],
    'clothing shop': ['cloth', 'clothing', 'garment', 'fashion', 'wear'],
    'coaching/academy': ['coaching', 'academy', 'tuition', 'classes', 'institute', 'coaching / academy'],
    'coaching / academy': ['coaching', 'academy', 'tuition', 'classes', 'institute', 'coaching/academy'],
    'mess': ['mess', 'tiffin', 'tiffin / mess', 'canteen'],
    'tiffin / mess': ['mess', 'tiffin', 'tiffin / mess', 'canteen'],
    'hostel/pg': ['hostel', 'pg', 'paying guest', 'stay', 'hostel / pg', 'pg / hostel'],
    'hostel / pg': ['hostel', 'pg', 'paying guest', 'stay', 'hostel / pg', 'pg / hostel'],
    'puncture repair': ['puncture', 'puncher', 'tyre', 'tire'],
    'mechanic': ['mechanic', 'repair', 'garage', 'auto', 'motor', 'autoworks'],
    'towing': ['tow', 'towing', 'crane'],
    'fuel delivery': ['fuel', 'petrol', 'diesel'],
    'electrician': ['electric', 'electrical', 'wiring'],
    'plumber': ['plumb', 'plumbing', 'pipe', 'leak'],
    'ac repair': ['ac', 'air conditioner', 'cooling'],
    'carpenter': ['carpenter', 'furniture', 'wood'],
    'cleaning': ['clean', 'cleaning', 'housekeeping'],
    'hardware shop': ['hardware', 'sanitary', 'tools', 'paints'],
    'pharmacy': ['pharmacy', 'chemist', 'medical', 'medicine'],
    'lab tests': ['lab', 'diagnostic', 'pathology', 'blood test'],
    'salon': ['salon', 'saloon', 'parlour', 'parlor', 'barber', 'hair'],
    'library': ['library', 'reading', 'study'],
    'book store': ['book', 'stationery', 'stationary', 'stationery / book'],
    'cyber cafe': ['cyber', 'internet', 'online', 'e-mitra', 'emitra'],
  };

  const synonyms = synonymMap[f] || [f];
  return synonyms.some((syn) => vs.includes(syn) || vn.includes(syn) || vServices.includes(syn));
};

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string; }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { location: userLocation } = useAppLocation();
  const [selectedFilter, setSelectedFilter] = useState(() => {
    return (routerLocation.state as { initialFilter?: string })?.initialFilter || 'All';
  });
  const [selectedRadius, setSelectedRadius] = useState<number | null>(5); // Default 5 km
  const [isLoading, setIsLoading] = useState(true);
  const [allVendors, setAllVendors] = useState<Vendor[]>(dummyVendors);

  const categoryName = categoryNames[slug || ''] || 'Services';

  // Filter vendors by category first
  const categoryVendors = allVendors.filter((v) => v.category === slug);
  const totalVerifiedCount = categoryVendors.filter((v) => v.isVerified).length;

  // Build complete filter options: All + Predefined Sub-Services for this section + Any custom vendor sub-services
  const defaultSubServices = (slug && DEFAULT_CATEGORY_SUB_SERVICES[slug]) || [];
  const vendorSubServices: string[] = [];
  categoryVendors.forEach((v) => {
    if (v.subService) {
      v.subService.split(',').forEach((s) => {
        const trimmed = s.trim();
        if (trimmed && !vendorSubServices.includes(trimmed) && !defaultSubServices.includes(trimmed)) {
          vendorSubServices.push(trimmed);
        }
      });
    }
  });

  const filterOptions = ['All', ...defaultSubServices, ...vendorSubServices];

  // Filter vendors based on selected sub-service chip and radius filter
  const filteredVendors = categoryVendors
    .filter((v) => isVendorMatch(v, selectedFilter))
    .filter((v) => (selectedRadius !== null ? v.distanceKm <= selectedRadius : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  useEffect(() => {
    setIsLoading(true);
    if (routerLocation.state && (routerLocation.state as any).initialFilter) {
      setSelectedFilter((routerLocation.state as any).initialFilter);
    } else {
      setSelectedFilter('All');
    }

    const loadVendors = (activeCoords?: { latitude?: number | null; longitude?: number | null } | null) => {
      const coords =
        activeCoords && activeCoords.latitude && activeCoords.longitude
          ? { latitude: activeCoords.latitude, longitude: activeCoords.longitude }
          : userLocation && userLocation.latitude && userLocation.longitude
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
          : null;

      fetchCombinedVendors(coords).then((vendors) => {
        setAllVendors(vendors);
        setIsLoading(false);
      });
    };

    loadVendors();

    const handleGpsUpdate = (e: any) => {
      if (e.detail?.latitude && e.detail?.longitude) {
        loadVendors(e.detail);
      }
    };

    window.addEventListener('nearby_gps_updated', handleGpsUpdate);
    return () => window.removeEventListener('nearby_gps_updated', handleGpsUpdate);
  }, [slug, routerLocation.state, userLocation]);

  // Motion Variants
  const listContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-surface pb-32 sm:pb-16"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 backdrop-blur-nav bg-surface-card/85 border-b border-border-light">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-[var(--radius-sm)] hover:bg-border-light transition-colors cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} className="text-ink" />
          </motion.button>
          <div className="flex-1 text-left">
            <h1 className="text-md sm:text-lg font-display font-extrabold text-ink leading-tight">
              {categoryName}
            </h1>
            <p className="text-[10px] sm:text-xs text-ink-muted font-body mt-0.5">
              {totalVerifiedCount} verified {totalVerifiedCount === 1 ? 'vendor' : 'vendors'} near you
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 py-4 flex flex-col space-y-3">
        {/* Horizontal scrollable sub-service filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 select-none">
          {filterOptions.map((opt) => {
            const isActive = opt === selectedFilter;
            return (
              <button
                key={opt}
                onClick={() => setSelectedFilter(opt)}
                className={`shrink-0 px-3.5 py-1.5 rounded-[var(--radius-pill)] text-xs font-display font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand border-brand text-white shadow-sm'
                    : 'bg-surface-card border-border-light text-ink-muted hover:border-brand/35 hover:text-brand'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Radius Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface-card p-2 rounded-xl border border-border-light shadow-2xs overflow-x-auto scrollbar-none select-none">
          <span className="text-[10px] font-display font-extrabold text-ink-muted uppercase tracking-wider pl-1 shrink-0">
            Radius:
          </span>
          {RADIUS_OPTIONS.map((r) => {
            const isSelected = selectedRadius === r.radiusKm;
            return (
              <button
                key={r.label}
                onClick={() => setSelectedRadius(isSelected ? null : r.radiusKm)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-2xs'
                    : 'bg-surface text-ink-muted border-border-light hover:border-brand/40 hover:text-brand'
                }`}
              >
                {r.label}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedRadius(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold transition-all shrink-0 cursor-pointer border ${
              selectedRadius === null
                ? 'bg-brand text-white border-brand shadow-2xs'
                : 'bg-surface text-ink-muted border-border-light hover:border-brand/40 hover:text-brand'
            }`}
          >
            All
          </button>
        </div>

        {/* Vendors list state handling */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mt-2"
            >
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </motion.div>
          ) : filteredVendors.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 px-4 bg-surface-card rounded-[var(--radius-xl)] border border-border-light text-center shadow-sm mt-2"
            >
              <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                <AlertCircle size={28} className="text-brand" />
              </div>
              <h3 className="text-base font-display font-bold text-ink mb-1">
                {selectedRadius
                  ? `No vendors found within ${RADIUS_OPTIONS.find((r) => r.radiusKm === selectedRadius)?.label || selectedRadius + ' km'}`
                  : 'No vendors here yet'}
              </h3>
              <p className="text-xs text-ink-muted font-body max-w-[260px] mb-3">
                {selectedRadius
                  ? 'Try expanding your discovery radius to find vendors a bit further away.'
                  : `There are no ${selectedFilter} providers listed in this category right now.`}
              </p>
              {selectedRadius && (
                <button
                  onClick={() => setSelectedRadius(null)}
                  className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Show All Distances
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="vendors-list"
              variants={listContainerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4 mt-1"
            >
              {filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  variants={cardVariants}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                  className="bg-surface-card rounded-[var(--radius-lg)] p-4 border border-border-light shadow-sm flex flex-col text-left transition-all cursor-pointer space-y-2.5"
                >
                  {/* Top line: Name + verified badge + rating */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-sm sm:text-base font-display font-extrabold text-ink truncate leading-snug">
                        {vendor.name}
                      </h2>
                      {vendor.isVerified && (
                        <BadgeCheck
                          size={18}
                          className="text-brand fill-brand-light/10 shrink-0"
                        />
                      )}
                    </div>

                    {/* Rating Pill */}
                    <div className="flex items-center gap-0.5 px-2 py-0.5 bg-[#FFFBEB] border border-[#FEF3C7] rounded-[var(--radius-sm)] shrink-0">
                      <Star size={11} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-display font-bold text-amber-800">
                        {vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'}
                      </span>
                    </div>
                  </div>

                  {/* SubService Pill, Location & Save Heart Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block px-2 py-0.5 bg-surface text-ink-muted border border-border-light rounded-[var(--radius-pill)] text-[9px] font-display font-semibold uppercase tracking-wider">
                        {vendor.subService}
                      </span>

                      <div className="flex items-center gap-1 text-[11px] text-ink-muted font-body">
                        <MapPin size={12} className="text-brand shrink-0" />
                        <span className="font-semibold text-ink">
                          {formatDistance(vendor.distanceKm)} away
                          {(vendor as any).roadDurationMin ? (
                            <span className="text-ink-muted font-normal ml-1">
                              · 🚗 {formatDurationMin((vendor as any).roadDurationMin)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>

                    {/* Save / Like Heart Button */}
                    <SaveHeartButton vendorId={vendor.id} size={16} className="p-1.5" />
                  </div>

                  {/* Operational Status & Hours */}
                    {(() => {
                      const status = getEffectiveShopStatus(vendor);
                      return (
                        <div className="flex items-center gap-1.5 text-[11px] font-body border-t border-border-light/60 pt-2.5">
                          <Clock size={12} className="text-ink-muted/80" />
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={status.isOpen ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                              {status.isOpen ? 'Open Now' : 'Closed'}
                            </span>
                            {status.isManual && (
                              <span className="font-mono text-[9px] px-1 bg-amber-100 text-amber-900 rounded font-bold">Manual</span>
                            )}
                          </div>
                          <span className="text-ink-muted">• {status.openingTimeFormatted} – {status.closingTimeFormatted}</span>
                        </div>
                      );
                    })()}

                    {/* Generous thumb-sized call / whatsapp action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Call CTA */}
                      <a
                        href={`tel:${vendor.phoneNumber}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          trackVendorCall(vendor.id, vendor.phoneNumber);
                        }}
                        className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-display font-bold transition-colors shadow-sm shadow-brand/10 cursor-pointer"
                      >
                        <Phone size={14} className="fill-white/10" />
                        <span>Call</span>
                      </a>

                      <a
                        href={`https://wa.me/91${vendor.whatsappNumber}?text=${encodeURIComponent(
                          'Hi, I found your business on NearBy and would like to inquire about your services.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          trackVendorWhatsApp(vendor.id, vendor.whatsappNumber);
                        }}
                        className="flex items-center justify-center gap-2 border border-[#25D366]/40 hover:bg-[#25D366]/5 text-[#128C7E] py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-display font-bold transition-colors cursor-pointer"
                      >
                        <WhatsAppIcon size={14} className="text-[#25D366]" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

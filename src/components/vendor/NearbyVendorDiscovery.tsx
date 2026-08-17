import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  BadgeCheck,
  Phone,
  Compass,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  formatDistance,
  filterNearbyVendors,
  getUserLocation,
  RADIUS_OPTIONS,
  type RadiusOption,
  type GeolocationErrorState,
} from '../../utils/haversine';
import { fetchCombinedVendors, trackVendorCall, trackVendorWhatsApp } from '../../utils/vendorSync';
import { type Vendor } from '../../data/dummyVendors';
import SaveHeartButton from '../ui/SaveHeartButton';
import { getEffectiveShopStatus } from '../../utils/shopTiming';

const WhatsAppIcon = ({ size = 15, className = '' }: { size?: number; className?: string }) => (
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

interface NearbyVendorDiscoveryProps {
  initialRadiusKm?: number;
  categoryFilter?: string;
  className?: string;
  onVendorSelect?: (vendor: Vendor) => void;
}

export default function NearbyVendorDiscovery({
  initialRadiusKm = 5,
  categoryFilter,
  className = '',
  onVendorSelect,
}: NearbyVendorDiscoveryProps) {
  const navigate = useNavigate();

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<GeolocationErrorState | null>(null);

  // Filter state
  const [selectedRadius, setSelectedRadius] = useState<number>(initialRadiusKm);
  const [rawVendors, setRawVendors] = useState<Vendor[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Acquire user location with high accuracy
  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await getUserLocation(10000);
      setUserLocation({
        latitude: position.latitude,
        longitude: position.longitude,
      });
      setLocationLoading(false);
    } catch (err: any) {
      console.warn('Location retrieval notice:', err);
      setLocationError(err as GeolocationErrorState);
      setLocationLoading(false);
    }
  }, []);

  // Fetch raw vendor dataset
  useEffect(() => {
    fetchLocation();

    fetchCombinedVendors()
      .then((vendors) => {
        setRawVendors(vendors);
        setDataLoading(false);
      })
      .catch((e) => {
        console.error('Failed to load vendors:', e);
        setDataLoading(false);
      });
  }, [fetchLocation]);

  // Compute nearby vendors whenever userLocation, rawVendors, or selectedRadius change
  const nearbyVendors = React.useMemo(() => {
    if (!userLocation) return [];

    let pool = rawVendors;
    if (categoryFilter && categoryFilter !== 'All') {
      pool = pool.filter((v) => v.category === categoryFilter || v.subService === categoryFilter);
    }

    return filterNearbyVendors(
      userLocation.latitude,
      userLocation.longitude,
      pool,
      selectedRadius
    );
  }, [userLocation, rawVendors, selectedRadius, categoryFilter]);

  // Selected radius label helper
  const currentRadiusLabel =
    RADIUS_OPTIONS.find((r) => r.radiusKm === selectedRadius)?.label || `${selectedRadius} km`;

  return (
    <div className={`space-y-4 font-body ${className}`}>
      {/* RADIUS FILTER CONTROLS */}
      <div className="bg-surface-card rounded-2xl p-4 border border-border-light shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
              <Compass size={16} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider">
                Discovery Radius
              </h3>
              <p className="text-[11px] text-ink-muted">
                Showing results within <span className="font-bold text-brand">{currentRadiusLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/5 px-2.5 py-1 rounded-full border border-brand/15">
            <SlidersHorizontal size={12} />
            <span>{nearbyVendors.length} found</span>
          </div>
        </div>

        {/* Radius Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          {RADIUS_OPTIONS.map((opt: RadiusOption) => {
            const isSelected = selectedRadius === opt.radiusKm;
            return (
              <button
                key={opt.label}
                onClick={() => setSelectedRadius(opt.radiusKm)}
                className={`flex-1 min-w-[62px] py-2 px-2.5 rounded-xl text-xs font-display font-bold transition-all text-center cursor-pointer border ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20 scale-[1.02]'
                    : 'bg-surface border-border-light text-ink hover:border-brand/40 hover:text-brand'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* STATE 1: LOCATION LOADING */}
      <AnimatePresence mode="wait">
        {locationLoading && (
          <motion.div
            key="location-loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center justify-center py-12 px-4 bg-surface-card rounded-2xl border border-border-light text-center shadow-xs space-y-3"
          >
            <div className="w-12 h-12 rounded-full border-3 border-brand/20 border-t-brand animate-spin" />
            <div className="space-y-1">
              <h4 className="text-sm font-display font-bold text-ink">
                Fetching your location...
              </h4>
              <p className="text-xs text-ink-muted max-w-xs">
                Scanning GPS coordinates with high accuracy to locate nearest verified shops.
              </p>
            </div>
          </motion.div>
        )}

        {/* STATE 2: LOCATION ERROR / ACCESS DENIED */}
        {!locationLoading && locationError && (
          <motion.div
            key="location-error"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center justify-center py-10 px-5 bg-surface-card rounded-2xl border border-amber-200/80 text-center shadow-xs space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <MapPin size={28} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-display font-bold text-ink">
                📍 Location access required to find vendors near you.
              </h4>
              <p className="text-xs text-ink-muted">
                {locationError.message || 'Please enable GPS permissions in your browser or device settings to discover local services.'}
              </p>
            </div>
            <button
              onClick={fetchLocation}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-display font-bold transition-all shadow-sm shadow-brand/20 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry Location Access</span>
            </button>
          </motion.div>
        )}

        {/* STATE 3: NO VENDORS FOUND IN RADIUS */}
        {!locationLoading && !locationError && !dataLoading && nearbyVendors.length === 0 && (
          <motion.div
            key="empty-vendors"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col items-center justify-center py-12 px-5 bg-surface-card rounded-2xl border border-border-light text-center shadow-xs space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-sm font-display font-bold text-ink">
                No vendors found within {currentRadiusLabel}.
              </h4>
              <p className="text-xs text-ink-muted">
                Try increasing the discovery radius to find vendors a little further away.
              </p>
            </div>
            {selectedRadius < 10 && (
              <button
                onClick={() => setSelectedRadius(10)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand rounded-xl text-xs font-display font-bold border border-brand/20 transition-all cursor-pointer"
              >
                <span>Expand to 10 km Radius</span>
                <ChevronRight size={14} />
              </button>
            )}
          </motion.div>
        )}

        {/* STATE 4: VENDOR LIST RESULTS */}
        {!locationLoading && !locationError && nearbyVendors.length > 0 && (
          <motion.div
            key="vendors-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {nearbyVendors.map((vendor) => {
              // Calculate distance percentage relative to selected radius for progress bar
              const rawDistance = vendor.distanceKm ?? 0;
              const distanceRatio = Math.min(Math.max(rawDistance / selectedRadius, 0.05), 1);
              const progressPercentage = (distanceRatio * 100).toFixed(1);
              const status = getEffectiveShopStatus(vendor);

              return (
                <motion.div
                  key={vendor.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (onVendorSelect) {
                      onVendorSelect(vendor);
                    } else {
                      navigate(`/vendor/${vendor.id}`);
                    }
                  }}
                  className="bg-surface-card rounded-2xl p-4 border border-border-light shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  {/* Top: Vendor Name, Verified badge, Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-display font-bold text-ink truncate leading-snug">
                          {vendor.name}
                        </h4>
                        {vendor.isVerified && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold shrink-0">
                            <BadgeCheck size={12} className="text-emerald-600" />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>

                      {/* Category Badge & Address */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-ink-muted">
                        <span className="inline-block px-2 py-0.5 bg-surface text-ink-muted border border-border-light rounded-full text-[10px] font-display font-semibold uppercase tracking-wider">
                          {vendor.category || vendor.subService || 'Local Service'}
                        </span>
                        {vendor.address && (
                          <span className="text-[11px] text-ink-muted truncate max-w-[170px]">
                            {vendor.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating Pill + Heart Bookmark */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span className="text-[11px] font-display font-bold text-amber-800">
                          {vendor.rating && vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'}
                        </span>
                      </div>
                      <SaveHeartButton vendorId={vendor.id} size={15} className="p-1" />
                    </div>
                  </div>

                  {/* Operational status & timing */}
                  <div className="flex items-center justify-between text-[11px] text-ink-muted border-t border-border-light/60 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                      <span className={status.isOpen ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                        {status.isOpen ? 'Open Now' : 'Closed'}
                      </span>
                      <span className="text-ink-muted">• {status.openingTimeFormatted} – {status.closingTimeFormatted}</span>
                    </div>

                    {/* 📍 Distance (Formatted via formatDistance) */}
                    <div className="flex items-center gap-1 text-xs font-display font-extrabold text-brand shrink-0">
                      <MapPin size={13} className="text-brand" />
                      <span>{formatDistance(vendor.distanceKm)}</span>
                    </div>
                  </div>

                  {/* CTA Buttons: Call & WhatsApp */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`tel:${vendor.phoneNumber || '9876543210'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        trackVendorCall(vendor.id, vendor.phoneNumber);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white py-2 rounded-xl text-xs font-display font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Phone size={13} />
                      <span>Call Now</span>
                    </a>

                    <a
                      href={`https://wa.me/91${(vendor.whatsappNumber || vendor.phoneNumber || '9876543210').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                        `Hi ${vendor.name}, I found your listing on NearBe and would like to inquire about your services.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackVendorWhatsApp(vendor.id, vendor.whatsappNumber || vendor.phoneNumber);
                      }}
                      className="flex items-center justify-center gap-1.5 border border-[#25D366]/40 hover:bg-[#25D366]/5 text-[#128C7E] py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer"
                    >
                      <WhatsAppIcon size={13} className="text-[#25D366]" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

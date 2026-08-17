import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Search,
  Loader2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  detectBrowserLocation,
  geocodeManualInput,
  type DetectedUserLocation,
  type GeolocationErrorState,
} from '../../utils/browserGeolocation';
import { findClosestIndianCity } from '../../utils/nativeGeolocation';
import { useLocation } from '../../context/LocationContext';

interface DetectLocationCardProps {
  onSuccess?: (location: DetectedUserLocation) => void;
  className?: string;
}

export default function DetectLocationCard({ onSuccess, className = '' }: DetectLocationCardProps) {
  const { setLocation, setCityManually } = useLocation();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [detectedLocation, setDetectedLocation] = useState<DetectedUserLocation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>('');
  const [isGeocodingManual, setIsGeocodingManual] = useState<boolean>(false);

  /**
   * Handle Location Detection via Browser Geolocation API
   */
  const handleDetectLocation = () => {
    setStatus('loading');
    setErrorMessage('');
    setShowManualInput(false);

    detectBrowserLocation(
      async (locationData) => {
        // Resolve closest city name for the coordinates
        let cityName = findClosestIndianCity(locationData.lat, locationData.lon).city;

        // Optional quick reverse-geocoding for exact locality
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.lat}&lon=${locationData.lon}&zoom=10`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (resp.ok) {
            const data = await resp.json();
            const resolvedCity =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              cityName;
            if (resolvedCity) cityName = resolvedCity;
          }
        } catch {}

        const finalLocation: DetectedUserLocation = {
          ...locationData,
          city: cityName,
        };

        setDetectedLocation(finalLocation);
        setStatus('success');

        // Update Location Context
        setLocation({
          city: cityName,
          latitude: finalLocation.lat,
          longitude: finalLocation.lon,
          isManual: false,
        });

        localStorage.removeItem('nearby_manual_location_selected');

        if (onSuccess) {
          onSuccess(finalLocation);
        }
      },
      (errorState: GeolocationErrorState) => {
        setStatus('error');
        setErrorMessage(errorState.message);
      }
    );
  };

  /**
   * Handle Manual City / Pincode Search
   */
  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualQuery.trim() || isGeocodingManual) return;

    setIsGeocodingManual(true);
    setErrorMessage('');

    try {
      const geoResult = await geocodeManualInput(manualQuery);
      const cityName = geoResult.city || manualQuery.trim();

      setDetectedLocation({
        ...geoResult,
        city: cityName,
      });
      setStatus('success');
      setShowManualInput(false);

      setCityManually(cityName, {
        latitude: geoResult.lat,
        longitude: geoResult.lon,
      });

      if (onSuccess) {
        onSuccess({
          ...geoResult,
          city: cityName,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Location not found. Try a different search.');
    } finally {
      setIsGeocodingManual(false);
    }
  };

  return (
    <div className={`space-y-3 font-body ${className}`}>
      {/* 1. DEFAULT / LOADING BUTTON */}
      {status !== 'success' && (
        <button
          id="detectBtn"
          onClick={handleDetectLocation}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-brand hover:bg-brand-dark active:scale-[0.99] text-white rounded-2xl font-display font-bold text-xs sm:text-sm shadow-md shadow-brand/20 transition-all cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed select-none"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin text-white" />
              <span>Fetching your location...</span>
            </>
          ) : (
            <>
              <MapPin size={16} className="text-white" />
              <span>📍 Detect My Location</span>
            </>
          )}
        </button>
      )}

      {/* 2. SUCCESS STATE */}
      <AnimatePresence>
        {status === 'success' && detectedLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="font-display font-extrabold text-xs sm:text-sm text-emerald-900">
                  ✅ Location detected
                </span>
              </div>
              <button
                onClick={handleDetectLocation}
                className="text-[11px] font-display font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCw size={11} />
                <span>Re-detect</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-display font-extrabold shadow-2xs">
                📍 {detectedLocation.city || 'Current Area'}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Accuracy: ~{Math.round(detectedLocation.accuracy)} meters
              </span>
            </div>

            <p className="text-[10px] text-emerald-600/90 font-mono pt-0.5">
              Coordinates: {detectedLocation.lat.toFixed(4)}, {detectedLocation.lon.toFixed(4)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ERROR STATE */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <p className="font-display font-bold text-rose-950">❌ {errorMessage}</p>
              </div>
            </div>

            {/* Error Action Buttons: Try Again & Enter Manually */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDetectLocation}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-display font-bold transition-colors cursor-pointer shadow-xs"
              >
                <RotateCw size={12} />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => setShowManualInput((prev) => !prev)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-rose-100/60 text-rose-800 border border-rose-300 rounded-xl text-xs font-display font-bold transition-colors cursor-pointer"
              >
                <Search size={12} />
                <span>Enter Manually</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MANUAL INPUT FORM (FALLBACK) */}
      <AnimatePresence>
        {showManualInput && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleManualSearch}
            className="pt-2 space-y-2 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Enter city, town, or pincode (e.g. Sikar, 332001)..."
                  className="w-full px-3.5 py-2.5 bg-surface border border-border-light focus:border-brand rounded-xl text-xs outline-none transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!manualQuery.trim() || isGeocodingManual}
                className="px-4 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-display font-bold transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {isGeocodingManual ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Search size={13} />
                )}
                <span>Search</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

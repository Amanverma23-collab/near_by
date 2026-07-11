import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, ChevronDown, LocateFixed } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import CitySelector from '../location/CitySelector';

export default function HeroSection() {
  const { location, setCityManually } = useLocation();
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const handleCitySelect = (city: string) => {
    setCityManually(city);
    setCityModalOpen(false);
  };

  const handleRedetect = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await resp.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state_district ||
              'Unknown';
            setCityManually(city);
          } catch {
            setCityManually('Unknown');
          }
          setCityModalOpen(false);
        },
        () => {
          // If denied, keep modal open for manual entry
        }
      );
    }
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('button')) {
            document.getElementById('category-grid')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        className="w-auto aspect-[16/9] relative overflow-hidden rounded-[var(--radius-xl)] mx-4 mt-4 mb-6 shadow-sm border border-border-light bg-surface-card select-none cursor-pointer"
      >
        {/* Full Banner Image */}
        <img
          src="/hero-image.png"
          className="w-full h-full object-cover pointer-events-none"
          alt="NearBe Local Services banner"
        />

        {/* Absolute interactive overlay elements */}
        <div className="absolute inset-0 z-10 p-4 sm:p-6 md:p-8 pointer-events-none flex justify-end items-start">
          {/* Top-Right Location Selector */}
          <div className="pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCityModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-brand-50 text-brand rounded-[var(--radius-pill)] transition-colors text-xs font-display font-semibold cursor-pointer border border-brand/20 shadow-md group"
            >
              <MapPin size={12} className="text-brand fill-brand/10 group-hover:scale-110 transition-transform" />
              <span>📍 {location?.city || 'Set Location'}</span>
              <ChevronDown size={12} className="text-brand/80 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* City Change Modal */}
      <AnimatePresence>
        {cityModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCityModalOpen(false)}
              className="absolute inset-0 bg-ink/40"
            />

            {/* Modal */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-surface-card rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-6 pb-8 shadow-elevated"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6 sm:hidden" />

              <h3 className="text-lg font-display font-bold text-ink mb-1">
                Change Location
              </h3>
              <p className="text-sm text-ink-muted font-body mb-6">
                Update your city to see relevant services
              </p>

              {/* Re-detect button */}
              <button
                onClick={handleRedetect}
                className="w-full flex items-center gap-3 p-3 mb-4 rounded-[var(--radius-md)] border border-brand/20 bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                  <LocateFixed size={20} className="text-brand" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-display font-semibold text-ink">
                    Detect my location
                  </p>
                  <p className="text-xs text-ink-muted font-body">
                    Using GPS
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-ink-muted font-body uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <CitySelector onSelect={handleCitySelect} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

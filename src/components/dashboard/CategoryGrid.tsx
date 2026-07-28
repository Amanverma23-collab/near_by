import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Truck,
  Disc,
  Fuel,
  Zap,
  Droplet,
  Wind,
  Hammer,
  Sparkles,
  Store,
  Stethoscope,
  Activity,
  Pill,
  Microscope,
  Scissors,
  ShoppingBag,
  Bed,
  Coffee,
  Utensils,
  Shirt,
  GraduationCap,
  BookOpen,
  Home,
  MapPin,
  ChevronDown,
  LocateFixed,
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { useLanguage } from '../../context/LanguageContext';
import CitySelector from '../location/CitySelector';

interface ServiceInfo {
  label: string;
  dbValue: string;
  icon: any;
  imageUrl: string;
}

interface SectionInfo {
  title: string;
  slug: string;
  gradient: string;
  shadowColor: string;
  color: string;
  services: ServiceInfo[];
}

const serviceSections: SectionInfo[] = [
  {
    title: 'Vehicle & Emergency',
    slug: 'vehicle-emergency',
    gradient: 'from-[#FF6B35] to-[#F7931E]',
    shadowColor: 'rgba(255, 107, 53, 0.25)',
    color: '#FF6B35',
    services: [
      { label: 'Mechanic', dbValue: 'Mechanic', icon: Wrench, imageUrl: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=400&q=80' },
      { label: 'Towing', dbValue: 'Towing', icon: Truck, imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80' },
      { label: 'Puncture Repair', dbValue: 'Puncture Repair', icon: Disc, imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80' },
      { label: 'Fuel Delivery', dbValue: 'Fuel Delivery', icon: Fuel, imageUrl: 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    title: 'Home Maintenance',
    slug: 'home-maintenance',
    gradient: 'from-[#0C9D61] to-[#2ECC71]',
    shadowColor: 'rgba(12, 157, 97, 0.25)',
    color: '#0C9D61',
    services: [
      { label: 'Electrician', dbValue: 'Electrician', icon: Zap, imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80' },
      { label: 'Plumber', dbValue: 'Plumber', icon: Droplet, imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
      { label: 'AC Repair', dbValue: 'AC Repair', icon: Wind, imageUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80' },
      { label: 'Carpenter', dbValue: 'Carpenter', icon: Hammer, imageUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80' },
      { label: 'Cleaning', dbValue: 'Cleaning', icon: Sparkles, imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80' },
      { label: 'Hardware Shop', dbValue: 'Hardware Shop', icon: Store, imageUrl: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    title: 'Healthcare & Wellness',
    slug: 'healthcare-wellness',
    gradient: 'from-[#E74C3C] to-[#FF6B6B]',
    shadowColor: 'rgba(231, 76, 60, 0.25)',
    color: '#E74C3C',
    services: [
      { label: 'Doctors', dbValue: 'Doctor', icon: Stethoscope, imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80' },
      { label: 'Clinics', dbValue: 'Clinic', icon: Activity, imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80' },
      { label: 'Pharmacy', dbValue: 'Pharmacy', icon: Pill, imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=400&q=80' },
      { label: 'Lab Tests', dbValue: 'Diagnostic Lab', icon: Microscope, imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80' },
      { label: 'Salon', dbValue: 'Salon', icon: Scissors, imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    title: 'Daily Needs & Hospitality',
    slug: 'daily-needs',
    gradient: 'from-[#8B5CF6] to-[#A78BFA]',
    shadowColor: 'rgba(139, 92, 246, 0.25)',
    color: '#8B5CF6',
    services: [
      { label: 'Grocery/Kirana', dbValue: 'Kirana Store', icon: ShoppingBag, imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' },
      { label: 'Hotel', dbValue: 'Hotel', icon: Bed, imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80' },
      { label: 'Cafe', dbValue: 'Cafe', icon: Coffee, imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80' },
      { label: 'Restaurant', dbValue: 'Restaurant', icon: Utensils, imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80' },
      { label: 'Clothing Shop', dbValue: 'Clothing Shop', icon: Shirt, imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    title: 'Education & Student Stay',
    slug: 'education-student',
    gradient: 'from-[#1E40AF] to-[#3B82F6]',
    shadowColor: 'rgba(30, 64, 175, 0.25)',
    color: '#1E40AF',
    services: [
      { label: 'Coaching/Academy', dbValue: 'Coaching / Academy', icon: GraduationCap, imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80' },
      { label: 'Library', dbValue: 'Library', icon: BookOpen, imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80' },
      { label: 'Mess', dbValue: 'Mess', icon: Utensils, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
      { label: 'Hostel/PG', dbValue: 'Hostel / PG', icon: Home, imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80' },
    ]
  }
];

interface ServiceTileProps {
  categorySlug: string;
  service: ServiceInfo;
  gradient: string;
  shadowColor: string;
  categoryColor: string;
}

function ServiceTile({ categorySlug, service, gradient, shadowColor, categoryColor }: ServiceTileProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClick = () => {
    navigate(`/category/${categorySlug}`, {
      state: { initialFilter: service.dbValue }
    });
  };

  return (
    <motion.div 
      onClick={handleClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col w-[135px] sm:w-[150px] shrink-0 cursor-pointer select-none group"
    >
      {/* Clean Image Card */}
      <div 
        className="w-full h-[95px] sm:h-[105px] rounded-[16px] overflow-hidden relative border border-border-light/80 shadow-xs group-hover:shadow-md transition-all duration-300 bg-surface-card"
        style={{ 
          borderColor: `${categoryColor}25`,
        }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${service.imageUrl})` }}
        />
      </div>
      
      {/* Service Name Label Below Card */}
      <div className="flex items-center gap-1.5 mt-2 px-0.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: categoryColor }} />
        <span className="text-[11px] sm:text-xs font-display font-extrabold text-ink leading-tight truncate group-hover:text-brand transition-colors">
          {t(service.label)}
        </span>
      </div>
    </motion.div>
  );
}

const sectionVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15
    }
  }
};

export default function CategoryGrid() {
  const navigate = useNavigate();
  const { location, setCityManually } = useLocation();
  const { t } = useLanguage();
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
          // Keep modal open for manual entry
        }
      );
    }
  };

  return (
    <>
      <section id="category-grid" className="px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-5 gap-3"
        >
          <div className="min-w-0">
            <h2 className="text-lg font-display font-bold text-ink truncate">
              {t('what_do_you_need')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-body mt-0.5 truncate">
              {t('tap_category')}
            </p>
          </div>

          {/* Location button next to the header on mobile view only */}
          <div className="flex sm:hidden shrink-0">
            <button
              onClick={() => setCityModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-brand-50 text-brand rounded-[var(--radius-pill)] transition-all text-[11px] font-display font-bold border border-brand/20 shadow-sm shrink-0 cursor-pointer"
            >
              <MapPin size={11} className="text-brand shrink-0" />
              <span className="truncate max-w-[80px]">{location?.city || t('set_location')}</span>
              <ChevronDown size={11} className="text-brand/80 shrink-0" />
            </button>
          </div>
        </motion.div>

        <div className="space-y-4 sm:space-y-6 mt-4">
          {serviceSections.map((section) => (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="border-b border-border-light/50 pb-4 sm:pb-6 last:border-0 last:pb-0"
              key={section.slug}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-display font-extrabold text-ink">
                  {t(section.slug)}
                </h3>
                <button 
                  onClick={() => navigate(`/category/${section.slug}`)}
                  className="text-[11px] font-display font-bold text-brand hover:underline cursor-pointer"
                >
                  {t('see_all')}
                </button>
              </div>

              {/* Scrollable Row / Grid Container */}
              <div className="flex overflow-x-auto gap-4 pb-3 px-1 scrollbar-none sm:grid sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 sm:gap-6 sm:pb-0">
                {section.services.map((service) => (
                  <ServiceTile
                    key={service.label}
                    categorySlug={section.slug}
                    service={service}
                    gradient={section.gradient}
                    shadowColor={section.shadowColor}
                    categoryColor={section.color}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

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

            {/* Modal Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-full sm:max-w-md bg-surface rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-6 shadow-elevated z-10 border border-border-light max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-display font-extrabold text-ink">Change City</h3>
                  <p className="text-xs text-ink-muted font-body mt-0.5">Select or search for your city</p>
                </div>
                <button
                  onClick={() => setCityModalOpen(false)}
                  className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* GPS Auto-detect */}
              <button
                onClick={handleRedetect}
                className="w-full mb-6 flex items-center justify-center gap-2 py-3 bg-brand-50 hover:bg-brand-100 text-brand rounded-[var(--radius-md)] text-xs font-display font-bold transition-colors cursor-pointer"
              >
                <LocateFixed size={14} />
                <span>Detect My Location</span>
              </button>

              <div className="border-t border-border-light pt-6">
                <CitySelector onSelect={handleCitySelect} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


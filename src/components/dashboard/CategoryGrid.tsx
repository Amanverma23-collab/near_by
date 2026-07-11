import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Home,
  Heart,
  ShoppingBag,
  Wrench,
  Stethoscope,
  Coffee,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  MapPin,
  ChevronDown,
  LocateFixed,
} from 'lucide-react';
import type { ServiceCategory } from '../../types';
import { useLocation } from '../../context/LocationContext';
import CitySelector from '../location/CitySelector';
import vehicleEmergencyImg from '../../assets/images/vehicle-emergency.png';

const categories: (ServiceCategory & { shadowColor: string })[] = [
  {
    id: '1',
    slug: 'vehicle-emergency',
    title: 'Vehicle & Emergency',
    description: 'Mechanic, Towing, Puncture, Fuel',
    icon: 'car',
    gradient: 'from-[#FF6B35] to-[#F7931E]',
    shadowColor: 'rgba(255, 107, 53, 0.4)',
    subServices: ['Mechanic', 'Towing', 'Puncture Repair', 'Fuel Delivery'],
  },
  {
    id: '2',
    slug: 'home-maintenance',
    title: 'Home Maintenance',
    description: 'Electrician, Plumber, AC, Hardware',
    icon: 'home',
    gradient: 'from-[#0C9D61] to-[#2ECC71]',
    shadowColor: 'rgba(12, 157, 97, 0.4)',
    subServices: ['Electrician', 'Plumber', 'AC Repair', 'Carpenter', 'Cleaning', 'Hardware Shop'],
  },
  {
    id: '3',
    slug: 'healthcare-wellness',
    title: 'Healthcare & Wellness',
    description: 'Doctors, Clinics, Pharmacy, Salon',
    icon: 'heart',
    gradient: 'from-[#E74C3C] to-[#FF6B6B]',
    shadowColor: 'rgba(231, 76, 60, 0.4)',
    subServices: ['Doctors', 'Clinics', 'Pharmacy', 'Diagnostics', 'Salon'],
  },
  {
    id: '4',
    slug: 'daily-needs',
    title: 'Daily Needs & Hospitality',
    description: 'Grocery, Hotel, Cafe, Clothing',
    icon: 'shopping',
    gradient: 'from-[#8B5CF6] to-[#A78BFA]',
    shadowColor: 'rgba(139, 92, 246, 0.4)',
    subServices: ['Kirana Store', 'Restaurant', 'Hotel', 'Cafe', 'Clothing Shop', 'Grocery Store'],
  },
  {
    id: '5',
    slug: 'education-student',
    title: 'Education & Student Stay',
    description: 'Coaching, Library, Mess, Hostel',
    icon: 'education',
    gradient: 'from-[#1E40AF] to-[#3B82F6]',
    shadowColor: 'rgba(30, 64, 175, 0.4)',
    subServices: ['Coaching / Academy', 'Library', 'Mess', 'Hostel / PG'],
  },
];

const iconMap: Record<string, [any, any]> = {
  car: [Car, AlertTriangle],
  home: [Home, Wrench],
  heart: [Heart, Stethoscope],
  shopping: [ShoppingBag, Coffee],
  education: [GraduationCap, BookOpen],
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    y: -4,
    boxShadow: '0 12px 40px rgba(26, 26, 46, 0.15)',
  },
  tap: {
    scale: 0.97
  }
};

const badgeVariants = {
  hover: {
    scale: 1.1,
    rotate: 4,
    transition: { type: 'spring' as const, stiffness: 300, damping: 15 }
  },
  tap: {
    scale: 0.95
  }
};

interface CategoryCustomIconProps {
  slug: string;
}

function CategoryCustomIcon({ slug }: CategoryCustomIconProps) {
  if (slug === 'vehicle-emergency') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Car body */}
        <path 
          d="M19 13H5C3.34 13 2 14.34 2 16V18C2 18.55 2.45 19 3 19H4C4 17.9 4.9 17 6 17C7.1 17 8 17.9 8 19H16C16 17.9 16.9 17 18 17C19.1 17 20 17.9 20 19H21C21.55 19 22 18.55 22 18V16C22 14.34 20.66 13 19 13Z" 
          fill="white" 
        />
        <path 
          d="M5.5 12.5L7.8 7.3C8.3 6.2 9.4 5.5 10.6 5.5H13.4C14.6 5.5 15.7 6.2 16.2 7.3L18.5 12.5H5.5Z" 
          fill="white" 
        />
        {/* Windshield inner accent - Light Orange */}
        <path 
          d="M7.8 7.5L6.2 11.5H17.8L16.2 7.5C15.9 6.8 15.2 6.3 14.4 6.3H9.6C8.8 6.3 8.1 6.8 7.8 7.5Z" 
          fill="#FFEBE0" 
          opacity="0.85"
        />
        {/* Headlights */}
        <circle cx="4.5" cy="15.5" r="0.75" fill="#FFEBE0" />
        <circle cx="19.5" cy="15.5" r="0.75" fill="#FFEBE0" />
        {/* Wheels */}
        <circle cx="6" cy="19" r="2.2" fill="white" />
        <circle cx="6" cy="19" r="0.8" fill="#FF6B35" />
        <circle cx="18" cy="19" r="2.2" fill="white" />
        <circle cx="18" cy="19" r="0.8" fill="#FF6B35" />
      </svg>
    );
  }

  if (slug === 'home-maintenance') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Roof */}
        <path 
          d="M2.5 11.5L11.2 3.8C11.6 3.4 12.4 3.4 12.8 3.8L21.5 11.5L19.8 12.8L12 5.9L4.2 12.8L2.5 11.5Z" 
          fill="white" 
        />
        {/* Walls */}
        <path 
          d="M5 11.5V19.5C5 20.33 5.67 21 6.5 21H17.5C18.33 21 19 20.33 19 19.5V11.5H5Z" 
          fill="white" 
        />
        {/* Window - Light Green */}
        <rect x="7.5" y="13" width="3.5" height="3.5" rx="0.5" fill="#E6FAF0" opacity="0.9" />
        <rect x="13" y="13" width="3.5" height="3.5" rx="0.5" fill="#E6FAF0" opacity="0.9" />
        {/* Door - Light Green */}
        <path d="M10 18H14V21H10V18Z" fill="#E6FAF0" opacity="0.9" />
      </svg>
    );
  }

  if (slug === 'healthcare-wellness') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Heart Outer Body */}
        <path 
          d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.03L12 21.35Z" 
          fill="white" 
        />
        {/* Medical Cross Accent - Light Pink */}
        <path 
          d="M10.5 8.5H13.5V11H16V13.5H13.5V16H10.5V13.5H8V11H10.5V8.5Z" 
          fill="#FFEBEB" 
          opacity="0.9"
        />
      </svg>
    );
  }

  if (slug === 'daily-needs') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Basket Handles */}
        <path 
          d="M9 10C9 6.5 10.3 4 12 4C13.7 4 15 6.5 15 10" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
        {/* Basket Body */}
        <path 
          d="M19 10H5C3.9 10 3 10.9 3 12V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V12C21 10.9 20.1 10 19 10Z" 
          fill="white" 
        />
        {/* Inside/Detail Pattern - Light Purple */}
        <rect x="6" y="12" width="12" height="2" rx="0.5" fill="#F3EFFF" opacity="0.9" />
        <rect x="6" y="15" width="12" height="2" rx="0.5" fill="#F3EFFF" opacity="0.9" />
      </svg>
    );
  }

  if (slug === 'education-student') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Graduation cap */}
        <path
          d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3Z"
          fill="white"
        />
        {/* Tassel accent - Light Blue */}
        <path
          d="M12 3L1 9L12 15L21 10.09V9L12 3Z"
          fill="white"
        />
        <path
          d="M7 12.5V17L12 19.5L17 17V12.5L12 15L7 12.5Z"
          fill="#DBEAFE"
          opacity="0.9"
        />
      </svg>
    );
  }

  return null;
}

export default function CategoryGrid() {
  const navigate = useNavigate();
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
              What do you need?
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted font-body mt-0.5 truncate">
              Tap a category to find services
            </p>
          </div>

          {/* Location button next to the header on mobile view only */}
          <div className="flex sm:hidden shrink-0">
            <button
              onClick={() => setCityModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-brand-50 text-brand rounded-[var(--radius-pill)] transition-all text-[11px] font-display font-bold border border-brand/20 shadow-sm shrink-0 cursor-pointer"
            >
              <MapPin size={11} className="text-brand shrink-0" />
              <span className="truncate max-w-[80px]">{location?.city || 'Set Location'}</span>
              <ChevronDown size={11} className="text-brand/80 shrink-0" />
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 [&>*:last-child:nth-child(odd)]:col-span-2 [&>*:last-child:nth-child(odd)]:sm:col-span-1 sm:grid-cols-3"
        >
          {categories.map((category) => {
            const [, SecondaryIcon] = iconMap[category.icon] || [
              null,
              Wrench,
            ];
            const isVehicleEmergency = category.slug === 'vehicle-emergency';

            return (
              <motion.button
                key={category.id}
                variants={cardVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate(`/category/${category.slug}`)}
                className="relative overflow-hidden bg-surface-card rounded-[var(--radius-lg)] p-5 text-left border border-border-light shadow-card transition-shadow group flex flex-col justify-between min-h-[160px]"
              >
                {isVehicleEmergency ? (
                  <>
                    {/* Background image covering the card, offset to right */}
                    <div 
                      className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                      style={{ 
                        backgroundImage: `url(${vehicleEmergencyImg})`,
                        backgroundPosition: 'right -10px center'
                      }}
                    />
                    {/* Gradient overlay to make text highly readable */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/30" />
                    
                    {/* Card Content */}
                    <div className="relative z-10 flex flex-col h-full justify-between w-full">
                      <div>
                        <h3 className="text-sm font-display font-extrabold text-ink mb-1 leading-tight">
                          {category.title}
                        </h3>
                        <p className="text-xs text-ink-muted font-body leading-relaxed max-w-[70%]">
                          {category.description}
                        </p>
                      </div>
                      
                      {/* Sub-services pills */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {category.subServices.slice(0, 3).map((service) => (
                          <span
                            key={service}
                            className="px-2 py-0.5 text-[9px] font-body font-bold bg-white/95 rounded-[var(--radius-pill)] text-[#FF6B35] border border-[#FF6B35]/20 shadow-sm"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Background gradient accent */}
                    <div
                      className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${category.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
                    />

                    {/* Icons */}
                    <div className="relative flex items-center gap-2 mb-4">
                      <motion.div
                        variants={badgeVariants}
                        style={{
                          boxShadow: `0 6px 18px -2px ${category.shadowColor}`,
                        }}
                        className={`w-11 h-11 rounded-[var(--radius-md)] bg-gradient-to-br ${category.gradient} flex items-center justify-center`}
                      >
                        <CategoryCustomIcon slug={category.slug} />
                      </motion.div>
                      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface border border-border-light flex items-center justify-center -ml-3 relative z-10">
                        <SecondaryIcon size={14} className="text-ink-muted" />
                      </div>
                    </div>

                    {/* Text */}
                    <h3 className="text-sm font-display font-bold text-ink mb-1 leading-tight">
                      {category.title}
                    </h3>
                    <p className="text-xs text-ink-muted font-body leading-relaxed">
                      {category.description}
                    </p>

                    {/* Sub-services pills */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {category.subServices.slice(0, 3).map((service) => (
                        <span
                          key={service}
                          className="px-2 py-0.5 text-[10px] font-body font-medium bg-surface rounded-[var(--radius-pill)] text-ink-muted border border-border-light"
                        >
                          {service}
                        </span>
                      ))}
                      {category.subServices.length > 3 && (
                        <span className="px-2 py-0.5 text-[10px] font-body font-medium text-brand">
                          +{category.subServices.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </motion.button>
            );
          })}
        </motion.div>
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


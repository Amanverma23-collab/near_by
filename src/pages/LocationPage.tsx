import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import LocationPin from '../components/location/LocationPin';
import CitySelector from '../components/location/CitySelector';
import DetectLocationCard from '../components/location/DetectLocationCard';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import BrandLoader from '../components/ui/BrandLoader';

export default function LocationPage() {
  const { session, role, loading: authLoading } = useAuth();
  const { locationSet, setCityManually, loading: locLoading } = useLocation();
  const navigate = useNavigate();

  if (authLoading || locLoading) return <BrandLoader />;
  if (!session || !role) return <Navigate to="/" replace />;
  if (locationSet) return <Navigate to="/dashboard" replace />;

  const handleCitySelect = (city: string, coords?: { latitude: number; longitude: number }) => {
    setCityManually(city, coords);
    navigate('/dashboard', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Animated Location Pin */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="mb-6"
        >
          <LocationPin />
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-display font-extrabold text-ink mb-2"
        >
          Enable location to find
          <br />
          <span className="text-brand">services near you</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-ink-muted font-body mb-6 max-w-xs"
        >
          We use your GPS to show you the closest verified technicians, repairs, and shops
        </motion.p>

        {/* Detect Location Component with complete Geolocation flow & UI states */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full text-left mb-5"
        >
          <DetectLocationCard
            onSuccess={() => {
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, 900);
            }}
          />
        </motion.div>

        {/* Manual City Selector */}
        <div className="w-full space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-ink-muted font-body uppercase tracking-wider">
              or select city
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <CitySelector onSelect={handleCitySelect} />
        </div>
      </div>
    </motion.div>
  );
}

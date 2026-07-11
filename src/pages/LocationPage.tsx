import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import LocationPin from '../components/location/LocationPin';
import CitySelector from '../components/location/CitySelector';
import AnimatedButton from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import BrandLoader from '../components/ui/BrandLoader';

export default function LocationPage() {
  const { session, role, loading: authLoading } = useAuth();
  const { locationSet, setLocation, setCityManually, loading: locLoading } =
    useLocation();
  const navigate = useNavigate();

  const [detecting, setDetecting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading || locLoading) return <BrandLoader />;
  if (!session || !role) return <Navigate to="/" replace />;
  if (locationSet) return <Navigate to="/dashboard" replace />;

  const handleEnableLocation = async () => {
    setDetecting(true);
    setError(null);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser');
      setDenied(true);
      setDetecting(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      const { latitude, longitude } = position.coords;

      // Reverse geocode with Nominatim
      let city = 'Unknown';
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
        );
        const data = await resp.json();
        city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.state_district ||
          data.address?.state ||
          'Unknown';
      } catch {
        // Geocoding failed — use Unknown, user can change later
      }

      setLocation({ city, latitude, longitude });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err.code === 1) {
        // Permission denied
        setDenied(true);
      } else {
        setError('Unable to detect your location. Please enter it manually.');
        setDenied(true);
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setCityManually(city);
    navigate('/dashboard', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Animated Location Pin */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="mb-8"
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
          className="text-sm text-ink-muted font-body mb-8 max-w-xs"
        >
          We use your location to show you the best local service providers in your area
        </motion.p>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-3 mb-4 rounded-[var(--radius-md)] bg-error-light text-error text-sm font-body text-center"
          >
            {error}
          </motion.div>
        )}

        {!denied ? (
          /* Enable Location Button */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <AnimatedButton
              fullWidth
              size="lg"
              isLoading={detecting}
              onClick={handleEnableLocation}
            >
              <MapPin size={20} />
              <span>Enable Location</span>
            </AnimatedButton>
          </motion.div>
        ) : (
          /* Manual City Fallback */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-ink-muted font-body uppercase tracking-wider">
                Enter your city manually
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <CitySelector onSelect={handleCitySelect} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

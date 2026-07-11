import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { LocationData } from '../types';
import { DEFAULT_CITY } from '../lib/supabase';

interface LocationContextType {
  location: LocationData | null;
  locationSet: boolean;
  loading: boolean;
  setLocation: (data: LocationData) => void;
  setCityManually: (city: string) => void;
  clearLocation: () => void;
}

const STORAGE_KEY = 'nearby_location';

const LocationContext = createContext<LocationContextType>({
  location: null,
  locationSet: false,
  loading: true,
  setLocation: () => {},
  setCityManually: () => {},
  clearLocation: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LocationData;
        setLocationState(parsed);
      }
    } catch {
      // Ignore parse errors
    }
    setLoading(false);
  }, []);

  const setLocation = (data: LocationData) => {
    setLocationState(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const setCityManually = (city: string) => {
    const data: LocationData = {
      city: city || DEFAULT_CITY,
      latitude: null,
      longitude: null,
    };
    setLocation(data);
  };

  const clearLocation = () => {
    setLocationState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        locationSet: location !== null,
        loading,
        setLocation,
        setCityManually,
        clearLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

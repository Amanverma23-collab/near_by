import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { LocationData } from '../types';
import { supabase, DEFAULT_CITY } from '../lib/supabase';

interface LocationContextType {
  location: LocationData | null;
  locationSet: boolean;
  loading: boolean;
  setLocation: (data: LocationData) => void;
  setCityManually: (city: string, coords?: { latitude: number; longitude: number }) => void;
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

import { getCurrentLocation, startWatchingLocation } from '../utils/nativeGeolocation';
import { INDIAN_CITY_COORDINATES } from '../components/location/CitySelector';

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Load from localStorage on mount
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

    const isManualSelected = localStorage.getItem('nearby_manual_location_selected') === 'true';

    // 2. Silently acquire fresh live device GPS coordinates ONLY if user hasn't explicitly chosen a manual location
    if (!isManualSelected) {
      getCurrentLocation()
        .then((coords) => {
          if (localStorage.getItem('nearby_manual_location_selected') === 'true') return;
          setLocationState((prev) => {
            const updated: LocationData = {
              city: prev?.city || DEFAULT_CITY,
              latitude: coords.latitude,
              longitude: coords.longitude,
              isManual: false,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
            } catch {}
            return updated;
          });
        })
        .catch((e) => {
          console.warn('Silent live GPS acquisition notice:', e);
        });
    }

    // 3. Watch for live device movement continuously (ignored if manual location is active)
    const cleanupWatcher = startWatchingLocation((coords) => {
      const isManual = localStorage.getItem('nearby_manual_location_selected') === 'true';
      if (isManual) return; // Preserve user's manually chosen location

      setLocationState((prev) => {
        const updated: LocationData = {
          city: prev?.city || DEFAULT_CITY,
          latitude: coords.latitude,
          longitude: coords.longitude,
          isManual: false,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
        } catch {}
        return updated;
      });
    });

    return () => {
      cleanupWatcher();
    };
  }, []);

  const setLocation = (data: LocationData) => {
    setLocationState(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (data.city && data.city !== 'Unknown') {
      localStorage.setItem('nearby_selected_city', data.city);
    }

    // Sync to Supabase customers table
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await supabase.from('customers').update({
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
          }).eq('auth_user_id', authData.user.id);
        }
      } catch (err) {
        console.warn('Could not sync customer location to Supabase:', err);
      }
    })();
  };

  const setCityManually = (city: string, coords?: { latitude: number; longitude: number }) => {
    const resolvedCoords =
      coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
        ? coords
        : (city && INDIAN_CITY_COORDINATES[city]) || { latitude: 27.6094, longitude: 75.1398 };

    const data: LocationData = {
      city: city || DEFAULT_CITY,
      latitude: resolvedCoords.latitude,
      longitude: resolvedCoords.longitude,
      isManual: true,
    };

    localStorage.setItem('nearby_manual_location_selected', 'true');
    localStorage.setItem('nearby_current_gps', JSON.stringify(resolvedCoords));
    window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: resolvedCoords }));
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

import { Geolocation } from '@capacitor/geolocation';
import { INDIAN_CITY_COORDINATES } from '../components/location/CitySelector';
import { getDistance } from './haversine';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface DetectedLocationResult extends LocationCoordinates {
  city: string;
}

/**
 * Finds the closest known Indian city from the given latitude and longitude.
 */
export function findClosestIndianCity(lat: number, lon: number): { city: string; distanceKm: number } {
  let closestCity = 'Sikar';
  let minDistance = Infinity;

  for (const [cityName, coords] of Object.entries(INDIAN_CITY_COORDINATES)) {
    const dist = getDistance(lat, lon, coords.latitude, coords.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = cityName;
    }
  }

  return { city: closestCity, distanceKm: minDistance };
}

/**
 * Get current device live GPS location with highest accuracy.
 * Freshly captures device coordinates and updates local storage.
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0, // Never use stale cache
    });

    const coords: LocationCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    try {
      localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
      window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: coords }));
    } catch {}

    return coords;
  } catch (err) {
    console.warn('Capacitor Geolocation notice, trying browser navigator.geolocation:', err);

    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: LocationCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          try {
            localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
            window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: coords }));
          } catch {}
          resolve(coords);
        },
        (error) => {
          let msg = 'Unable to access your device location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission denied. Please allow location access in your browser or device settings.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out. Please try again.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }
}

/**
 * Detects device location, determines city name (via reverse geocoding or closest Indian hub),
 * and returns coordinates + resolved city name.
 */
export async function detectUserGPSLocation(): Promise<DetectedLocationResult> {
  const coords = await getCurrentLocation();
  const { latitude, longitude } = coords;

  const closest = findClosestIndianCity(latitude, longitude);
  let detectedCity = closest.distanceKm <= 45 ? closest.city : 'Current Location';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
    );
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      const name =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.suburb ||
        data.address?.state_district;
      if (name) {
        detectedCity = name;
      }
    }
  } catch {
    // Reverse geocoding network/timeout fallback - already set to closest city
  }

  return { city: detectedCity, latitude, longitude };
}

/**
 * Starts continuous live GPS watch to track user's real-time movements.
 */
export function startWatchingLocation(
  onUpdate: (coords: LocationCoordinates) => void
): () => void {
  let watchId: string | number | null = null;
  let isCancelled = false;

  (async () => {
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position, err) => {
          if (isCancelled || err || !position) return;
          const coords: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          try {
            localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
            window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: coords }));
          } catch {}
          onUpdate(coords);
        }
      );
      watchId = id;
    } catch {
      // Browser fallback for watching position
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const navId = navigator.geolocation.watchPosition(
          (pos) => {
            if (isCancelled) return;
            const coords: LocationCoordinates = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            try {
              localStorage.setItem('nearby_current_gps', JSON.stringify(coords));
              window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: coords }));
            } catch {}
            onUpdate(coords);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        watchId = navId;
      }
    }
  })();

  return () => {
    isCancelled = true;
    if (watchId !== null) {
      if (typeof watchId === 'string') {
        Geolocation.clearWatch({ id: watchId }).catch(() => {});
      } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    }
  };
}

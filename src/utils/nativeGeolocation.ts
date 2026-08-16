import { Geolocation } from '@capacitor/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
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
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }
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

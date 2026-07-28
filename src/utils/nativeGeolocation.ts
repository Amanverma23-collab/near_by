import { Geolocation } from '@capacitor/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Get current location using Capacitor Geolocation plugin with browser fallback
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (err) {
    console.warn('Capacitor Geolocation error, falling back to navigator.geolocation:', err);
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}

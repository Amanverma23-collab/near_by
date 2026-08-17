/**
 * Browser Geolocation API utility for NearBe Hyperlocal App
 */

export interface DetectedUserLocation {
  lat: number;
  lon: number;
  accuracy: number; // in meters
  city?: string;
}

export type GeolocationErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN_ERROR';

export interface GeolocationErrorState {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * Standard Geolocation Options matching production mobile/web best practices:
 * - enableHighAccuracy: true (prioritize GPS over cellular/IP)
 * - timeout: 10000 (10s max wait)
 * - maximumAge: 60000 (1 min cached location to save battery & improve responsiveness)
 */
export const GEOLOCATION_CONFIG: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

/**
 * Translate GeolocationPositionError to user-friendly messages
 */
export function parseGeolocationError(error: GeolocationPositionError): GeolocationErrorState {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'PERMISSION_DENIED',
        message: 'Location access denied. Please allow location in browser settings.',
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'Location unavailable. Check GPS or Wi-Fi.',
      };
    case error.TIMEOUT:
      return {
        code: 'TIMEOUT',
        message: 'Location request timed out. Try again.',
      };
    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong. Try again.',
      };
  }
}

/**
 * Core Browser Geolocation detection function
 */
export function detectBrowserLocation(
  onSuccess: (location: DetectedUserLocation) => void,
  onError: (errorState: GeolocationErrorState) => void,
  options: PositionOptions = GEOLOCATION_CONFIG
) {
  if (!('geolocation' in navigator)) {
    onError({
      code: 'POSITION_UNAVAILABLE',
      message: 'Your browser does not support location detection.',
    });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const detected: DetectedUserLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      onSuccess(detected);
    },
    (error) => {
      const errorState = parseGeolocationError(error);
      onError(errorState);
    },
    options
  );
}

/**
 * Geocode manual city or pincode input using OpenStreetMap Nominatim API
 */
export async function geocodeManualInput(query: string): Promise<DetectedUserLocation> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NearBe-Hyperlocal-App',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to reach geocoding service. Please try again.');
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    const item = data[0];
    return {
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      accuracy: 1000, // approximate 1km
      city: item.display_name.split(',')[0] || query,
    };
  }

  throw new Error('Location not found. Try a different city or pincode.');
}

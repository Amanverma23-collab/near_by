/**
 * Haversine-based distance calculation and filtering system for NearBe
 */

export interface BaseVendor {
  id: string;
  name: string;
  category?: string;
  subService?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  rating?: number;
  isVerified?: boolean;
  distanceKm?: number | null;
  [key: string]: any;
}

export interface RadiusOption {
  label: string;
  radiusKm: number;
}

export const RADIUS_OPTIONS: RadiusOption[] = [
  { label: '500 m', radiusKm: 0.5 },
  { label: '1 km', radiusKm: 1 },
  { label: '3 km', radiusKm: 3 },
  { label: '5 km', radiusKm: 5 },
  { label: '10 km', radiusKm: 10 },
];

/**
 * 1. CORE FUNCTION: Haversine distance between two GPS coordinates in kilometers.
 * Earth radius R = 6371 km
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  return distanceKm;
}

export const calculateHaversineDistanceKm = getDistance;

/**
 * 2. DISTANCE DISPLAY HELPER
 * If < 1 km -> returns meters (e.g. 0.35 km -> "350 m")
 * Else -> returns km to 1 decimal place (e.g. 2.7 km -> "2.7 km")
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return '--';
  }
  if (km < 1) {
    return Math.round(km * 1000) + ' m';
  }
  return km.toFixed(1) + ' km';
}

/**
 * Helper to safely extract lat/lon from vendor object supporting both {lat, lon} and {latitude, longitude}
 */
export function getVendorCoordinates(vendor: BaseVendor): { lat: number; lon: number } | null {
  const lat = typeof vendor.lat === 'number' ? vendor.lat : vendor.latitude;
  const lon = typeof vendor.lon === 'number' ? vendor.lon : vendor.longitude;

  if (typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon)) {
    return { lat, lon };
  }
  return null;
}

/**
 * PERFORMANCE OPTIMIZATION: Bounding Box Pre-filtering
 * For large datasets (1000+ vendors): pre-filter using bounding box before running trigonometry
 */
export function getBoundingBox(userLat: number, userLon: number, radiusKm: number) {
  const latDelta = radiusKm / 111; // 1 degree lat ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

  return {
    minLat: userLat - latDelta,
    maxLat: userLat + latDelta,
    minLon: userLon - lonDelta,
    maxLon: userLon + lonDelta,
  };
}

/**
 * 3. FILTER FUNCTION
 * Calculates distance, filters vendors within radiusKm, and sorts nearest first.
 * Automatically applies bounding box pre-filtering for large arrays.
 */
export function filterNearbyVendors<T extends BaseVendor>(
  userLat: number,
  userLon: number,
  vendors: T[],
  radiusKm: number = 5,
  useBoundingBox: boolean = true
): (T & { distanceKm: number })[] {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    return [];
  }

  let candidateVendors = vendors;

  // Pre-filter with bounding box if list is large
  if (useBoundingBox && vendors.length > 50) {
    const box = getBoundingBox(userLat, userLon, radiusKm);
    candidateVendors = vendors.filter((v) => {
      const coords = getVendorCoordinates(v);
      if (!coords) return false;
      return (
        coords.lat >= box.minLat &&
        coords.lat <= box.maxLat &&
        coords.lon >= box.minLon &&
        coords.lon <= box.maxLon
      );
    });
  }

  return candidateVendors
    .map((vendor) => {
      const coords = getVendorCoordinates(vendor);
      const dist = coords ? getDistance(userLat, userLon, coords.lat, coords.lon) : Infinity;
      return {
        ...vendor,
        distanceKm: dist,
      };
    })
    .filter((vendor) => vendor.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm); // Nearest first
}

export interface GeolocationPositionResult {
  latitude: number;
  longitude: number;
}

export type GeolocationErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';

export interface GeolocationErrorState {
  code: GeolocationErrorCode;
  message: string;
}

/**
 * 4. USER LOCATION HELPER
 * Resolves current user position using browser Geolocation API with high accuracy
 */
export function getUserLocation(
  timeoutMs: number = 10000
): Promise<GeolocationPositionResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported on this device/browser.',
      } as GeolocationErrorState);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let code: GeolocationErrorCode = 'POSITION_UNAVAILABLE';
        let message = 'Unable to retrieve location.';

        if (error.code === error.PERMISSION_DENIED) {
          code = 'PERMISSION_DENIED';
          message = 'Location access denied. Please enable location.';
        } else if (error.code === error.TIMEOUT) {
          code = 'TIMEOUT';
          message = 'Location request timed out. Please try again.';
        }

        reject({ code, message } as GeolocationErrorState);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}

/**
 * 5. BACKEND / SQL QUERY BUILDER
 * Generates SQL for database-level Haversine calculation
 */
export function buildHaversineSqlQuery(tableName: string = 'vendors'): string {
  return `
SELECT *, 
  (6371 * acos(
    cos(radians(?)) * cos(radians(lat)) *
    cos(radians(lon) - radians(?)) +
    sin(radians(?)) * sin(radians(lat))
  )) AS distance
FROM ${tableName}
HAVING distance <= ?
ORDER BY distance ASC;
`.trim();
}

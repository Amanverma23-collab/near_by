/**
 * Haversine-based distance calculation and filtering system in JavaScript for "NearBe"
 */

/**
 * 1. CORE FUNCTION
 * Calculates great-circle distance between two points on Earth using Haversine formula.
 * @param {number} lat1 - User Latitude in degrees
 * @param {number} lon1 - User Longitude in degrees
 * @param {number} lat2 - Vendor Latitude in degrees
 * @param {number} lon2 - Vendor Longitude in degrees
 * @returns {number} Distance in kilometers
 */
export function getDistance(lat1, lon1, lat2, lon2) {
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

/**
 * 2. DISTANCE DISPLAY HELPER
 * Formats distance in meters if < 1 km, otherwise in km rounded to 1 decimal.
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance (e.g. "350 m", "2.7 km")
 */
export function formatDistance(km) {
  if (km === null || km === undefined || isNaN(km)) {
    return '--';
  }
  if (km < 1) {
    return Math.round(km * 1000) + ' m'; // show meters if < 1km
  }
  return km.toFixed(1) + ' km';
}

/**
 * RADIUS FILTER OPTIONS
 */
export const RADIUS_OPTIONS = [
  { label: '500 m', radiusKm: 0.5 },
  { label: '1 km', radiusKm: 1 },
  { label: '3 km', radiusKm: 3 },
  { label: '5 km', radiusKm: 5 }, // default
  { label: '10 km', radiusKm: 10 },
];

/**
 * Helper to get lat/lon from vendor object supporting both {lat, lon} and {latitude, longitude}
 */
export function getVendorCoordinates(vendor) {
  const lat = typeof vendor.lat === 'number' ? vendor.lat : vendor.latitude;
  const lon = typeof vendor.lon === 'number' ? vendor.lon : vendor.longitude;
  if (typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon)) {
    return { lat, lon };
  }
  return null;
}

/**
 * PERFORMANCE OPTIMIZATION: Bounding Box Pre-filter
 * @param {number} userLat
 * @param {number} userLon
 * @param {number} radiusKm
 */
export function getBoundingBox(userLat, userLon, radiusKm) {
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
 * Maps vendors with runtime distanceKm, filters within radiusKm, sorts nearest first.
 * @param {number} userLat - User Latitude
 * @param {number} userLon - User Longitude
 * @param {Array} vendors - Array of vendor objects
 * @param {number} radiusKm - Filter radius in km (default: 5)
 * @param {boolean} useBoundingBox - Whether to use bounding box pre-filter
 * @returns {Array} Filtered and sorted vendor objects
 */
export function filterNearbyVendors(userLat, userLon, vendors, radiusKm = 5, useBoundingBox = true) {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    return [];
  }

  // Pre-filter with bounding box for large datasets (1000+ vendors)
  let candidateVendors = vendors;
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
      const distanceKm = coords ? getDistance(userLat, userLon, coords.lat, coords.lon) : Infinity;

      return {
        ...vendor,
        distanceKm,
      };
    })
    .filter((vendor) => vendor.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm); // nearest first
}

/**
 * 4. USER LOCATION VIA BROWSER GEOLOCATION API (Promise-based)
 * @param {number} timeoutMs
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getUserLocation(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported on this device/browser.',
      });
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
        let code = 'POSITION_UNAVAILABLE';
        let message = 'Location access required to find vendors near you.';

        if (error.code === error.PERMISSION_DENIED) {
          code = 'PERMISSION_DENIED';
          message = 'Location access denied. Please enable location.';
        } else if (error.code === error.TIMEOUT) {
          code = 'TIMEOUT';
          message = 'Location request timed out. Please retry.';
        }

        reject({ code, message, originalError: error });
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
 * USER LOCATION VIA BROWSER GEOLOCATION API (Callback-based)
 * @param {Function} onSuccess - Callback (coords: {latitude, longitude})
 * @param {Function} onError - Callback (errorMessage: string)
 * @param {Object} options - Geolocation options
 */
export function requestUserLocation(
  onSuccess,
  onError,
  options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) onError('Geolocation is not supported on this device.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      if (onSuccess) onSuccess({ latitude: userLat, longitude: userLon });
    },
    (error) => {
      let message = 'Location access required to find vendors near you.';
      if (error.code === error.PERMISSION_DENIED) {
        message = 'Location access denied. Please enable location.';
      } else if (error.code === error.TIMEOUT) {
        message = 'Location request timed out. Please retry.';
      }
      if (onError) onError(message, error);
    },
    options
  );
}

/**
 * 5. BACKEND / SQL QUERY BUILDER
 * Generates SQL for database-level Haversine calculation
 */
export function buildHaversineSqlQuery(tableName = 'vendors') {
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

export default {
  getDistance,
  formatDistance,
  filterNearbyVendors,
  getBoundingBox,
  getUserLocation,
  requestUserLocation,
  buildHaversineSqlQuery,
  RADIUS_OPTIONS,
};

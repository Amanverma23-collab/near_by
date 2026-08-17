/**
 * Pure JavaScript Geolocation Implementation for NearBe
 */

// State variable
let userLocation = null; // { lat, lon, accuracy, city }

/**
 * Detect user location using Browser Geolocation API
 */
export function detectLocation(onSuccessCallback, onErrorCallback) {
  // Check if browser supports geolocation
  if (!navigator.geolocation) {
    const errorMsg = "Your browser does not support location detection.";
    if (onErrorCallback) onErrorCallback(errorMsg);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy // in meters
      };
      if (onSuccessCallback) onSuccessCallback(userLocation);
    },
    (error) => {
      let message = "Something went wrong. Try again.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = "Location access denied. Please allow location in browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          message = "Location unavailable. Check GPS or Wi-Fi.";
          break;
        case error.TIMEOUT:
          message = "Location request timed out. Try again.";
          break;
        default:
          message = "Something went wrong. Try again.";
      }
      if (onErrorCallback) onErrorCallback(message, error);
    },
    {
      enableHighAccuracy: true,  // Prefer GPS
      timeout: 10000,            // 10 sec max wait
      maximumAge: 60000          // 1 min cached location accept karo
    }
  );
}

export const detectBrowserLocation = detectLocation;

/**
 * Manual location search using OpenStreetMap Nominatim API
 */
export async function geocodeManualInput(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'NearBe-App'
    }
  });
  const data = await res.json();

  if (data.length > 0) {
    userLocation = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      accuracy: 1000 // approximate
    };
    return userLocation;
  } else {
    throw new Error("Location not found. Try a different search.");
  }
}

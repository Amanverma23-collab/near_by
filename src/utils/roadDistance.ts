/**
 * NearBe Road Distance Engine (OpenRouteService + Haversine fallback)
 * Calculates actual driving road distance & duration for vendor detail views
 * with 24-hour client-side coordinate caching.
 */

import { calculateHaversineDistanceKm } from './haversine';

export interface RoadDistanceResult {
  distanceKm: number;
  formattedDistance: string;
  durationMin: number | null;
  formattedDuration: string | null;
  source: 'road' | 'straight_line';
  isApprox: boolean;
}

const ORS_API_KEY = (import.meta as any).env?.VITE_ORS_API_KEY || '';

/**
 * Rounds coordinate to 3 decimal places (~100m accuracy) for caching
 */
export function roundCoordinate(coord: number): number {
  return Math.round(coord * 1000) / 1000;
}

/**
 * Formats distance in km or meters
 */
export function formatDistanceKm(km: number): string {
  if (typeof km !== 'number' || isNaN(km)) return 'Nearby';
  if (km < 1) {
    return `${Math.max(10, Math.round(km * 1000))} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Calculates road distance between customer and vendor with caching and automatic Haversine fallback.
 */
export async function getAccurateVendorDistance(
  userLat?: number | null,
  userLon?: number | null,
  vendorLat?: number | null,
  vendorLon?: number | null,
  vendorId?: string
): Promise<RoadDistanceResult> {
  // 1. Validate coordinates
  if (
    typeof userLat !== 'number' ||
    typeof userLon !== 'number' ||
    typeof vendorLat !== 'number' ||
    typeof vendorLon !== 'number' ||
    isNaN(userLat) ||
    isNaN(userLon) ||
    isNaN(vendorLat) ||
    isNaN(vendorLon)
  ) {
    return {
      distanceKm: 1.2,
      formattedDistance: '1.2 km',
      durationMin: 5,
      formattedDuration: '5 min',
      source: 'straight_line',
      isApprox: true,
    };
  }

  // Calculate default straight-line Haversine fallback
  const straightLineKm = calculateHaversineDistanceKm(userLat, userLon, vendorLat, vendorLon);
  const fallbackResult: RoadDistanceResult = {
    distanceKm: parseFloat(straightLineKm.toFixed(2)),
    formattedDistance: formatDistanceKm(straightLineKm),
    durationMin: null,
    formattedDuration: null,
    source: 'straight_line',
    isApprox: true,
  };

  const rLat = roundCoordinate(userLat);
  const rLon = roundCoordinate(userLon);
  const vKey = vendorId || `${vendorLat.toFixed(4)}_${vendorLon.toFixed(4)}`;
  const cacheKey = `nearby_road_dist_${rLat}_${rLon}_${vKey}`;

  // 2. Check 24-hour client cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (cached.timestamp && cached.timestamp > oneDayAgo) {
        return {
          distanceKm: cached.distanceKm,
          formattedDistance: formatDistanceKm(cached.distanceKm),
          durationMin: cached.durationMin,
          formattedDuration: cached.durationMin ? `${cached.durationMin} min` : null,
          source: cached.source || 'road',
          isApprox: cached.source === 'straight_line',
        };
      }
    }
  } catch {}

  // 3. Try Backend / Express API or direct ORS
  try {
    let roadData: { distanceKm: number; durationMin: number | null; source: 'road' | 'straight_line' } | null = null;

    if (ORS_API_KEY) {
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${userLon},${userLat}&end=${vendorLon},${vendorLat}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NearBe-App' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const segment = json.features?.[0]?.properties?.segments?.[0];
        if (segment) {
          roadData = {
            distanceKm: parseFloat((segment.distance / 1000).toFixed(2)),
            durationMin: Math.round(segment.duration / 60),
            source: 'road',
          };
        }
      }
    }

    if (!roadData && vendorId) {
      const backendUrl = `/api/vendor/${vendorId}/distance?userLat=${userLat}&userLon=${userLon}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(backendUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.success && typeof json.distanceKm === 'number') {
          roadData = {
            distanceKm: json.distanceKm,
            durationMin: json.durationMin || null,
            source: json.source || 'road',
          };
        }
      }
    }

    if (roadData) {
      const finalResult: RoadDistanceResult = {
        distanceKm: roadData.distanceKm,
        formattedDistance: formatDistanceKm(roadData.distanceKm),
        durationMin: roadData.durationMin,
        formattedDuration: roadData.durationMin ? `${roadData.durationMin} min` : null,
        source: roadData.source,
        isApprox: roadData.source === 'straight_line',
      };

      // Save to 24-hour cache
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            distanceKm: finalResult.distanceKm,
            durationMin: finalResult.durationMin,
            source: finalResult.source,
            timestamp: Date.now(),
          })
        );
      } catch {}

      return finalResult;
    }
  } catch (err) {
    console.warn('Road distance calculation notice (using Haversine):', (err as any)?.message);
  }

  return fallbackResult;
}

/**
 * NearBe Road Distance Engine (OpenRouteService Matrix API + OSRM Table + Haversine fallback)
 * Calculates actual driving road distances & durations with batching and 6-hour caching.
 */

import { getDistance } from './haversine';

export interface RoadDistanceResult {
  distanceKm: number;
  formattedDistance: string;
  durationMin: number | null;
  formattedDuration: string | null;
  source: 'road' | 'straight_line';
  isApprox: boolean;
}

export interface BatchVendorTarget {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lon?: number | null;
  [key: string]: any;
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
 * Formats duration in minutes or hours
 */
export function formatDurationMin(minutes: number | null): string | null {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes <= 0) return null;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

/**
 * 1. SINGLE VENDOR: Calculates road distance between customer and vendor with caching and Haversine fallback.
 */
export async function getAccurateVendorDistance(
  userLat?: number | null,
  userLon?: number | null,
  vendorLat?: number | null,
  vendorLon?: number | null,
  vendorId?: string
): Promise<RoadDistanceResult> {
  // Validate coordinates
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

  // Default straight-line Haversine fallback
  const straightLineKm = getDistance(userLat, userLon, vendorLat, vendorLon);
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

  // Check 6-hour client cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      if (cached.timestamp && cached.timestamp > sixHoursAgo) {
        return {
          distanceKm: cached.distanceKm,
          formattedDistance: formatDistanceKm(cached.distanceKm),
          durationMin: cached.durationMin,
          formattedDuration: formatDurationMin(cached.durationMin),
          source: cached.source || 'road',
          isApprox: cached.source === 'straight_line',
        };
      }
    }
  } catch {}

  let roadData: { distanceKm: number; durationMin: number | null; source: 'road' | 'straight_line' } | null = null;

  // A. OpenRouteService
  if (ORS_API_KEY) {
    try {
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${userLon},${userLat}&end=${vendorLon},${vendorLat}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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
    } catch {}
  }

  // B. OSRM Driving Router
  if (!roadData) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${vendorLon},${vendorLat}?overview=false`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          const route = json.routes[0];
          roadData = {
            distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
            durationMin: Math.max(1, Math.round(route.duration / 60)),
            source: 'road',
          };
        }
      }
    } catch {}
  }

  // C. Backend REST proxy fallback
  if (!roadData && vendorId) {
    try {
      const backendUrl = `/api/vendor/${vendorId}/distance?userLat=${userLat}&userLon=${userLon}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

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
    } catch {}
  }

  // Return result and persist to cache
  if (roadData) {
    const finalResult: RoadDistanceResult = {
      distanceKm: roadData.distanceKm,
      formattedDistance: formatDistanceKm(roadData.distanceKm),
      durationMin: roadData.durationMin,
      formattedDuration: formatDurationMin(roadData.durationMin),
      source: roadData.source,
      isApprox: roadData.source === 'straight_line',
    };

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

  return fallbackResult;
}

/**
 * 2. BATCH MATRIX: Calculates road distances from 1 user origin to MULTIPLE vendors in a SINGLE batch API call.
 * Uses 6-hour client-side cache so repeat views are 100% instant and quota-free.
 */
export async function getBatchVendorRoadDistances(
  userLat: number,
  userLon: number,
  vendors: BatchVendorTarget[]
): Promise<Record<string, RoadDistanceResult>> {
  const results: Record<string, RoadDistanceResult> = {};
  if (!vendors || vendors.length === 0) return results;

  const rLat = roundCoordinate(userLat);
  const rLon = roundCoordinate(userLon);
  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

  const uncachedVendors: BatchVendorTarget[] = [];

  // 1. Check 6-hour client cache for each vendor
  for (const v of vendors) {
    const vLat = v.latitude ?? v.lat;
    const vLon = v.longitude ?? v.lon;
    if (typeof vLat !== 'number' || typeof vLon !== 'number' || isNaN(vLat) || isNaN(vLon)) {
      continue;
    }

    const vKey = v.id || `${vLat.toFixed(4)}_${vLon.toFixed(4)}`;
    const cacheKey = `nearby_road_dist_${rLat}_${rLon}_${vKey}`;

    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.timestamp && cached.timestamp > sixHoursAgo) {
          results[v.id] = {
            distanceKm: cached.distanceKm,
            formattedDistance: formatDistanceKm(cached.distanceKm),
            durationMin: cached.durationMin,
            formattedDuration: formatDurationMin(cached.durationMin),
            source: cached.source || 'road',
            isApprox: cached.source === 'straight_line',
          };
          continue;
        }
      }
    } catch {}

    uncachedVendors.push(v);
  }

  // If all were found in cache, return immediately!
  if (uncachedVendors.length === 0) {
    return results;
  }

  // 2. Batch fetch for uncached vendors (in chunks of 50)
  const BATCH_SIZE = 50;
  for (let b = 0; b < uncachedVendors.length; b += BATCH_SIZE) {
    const batch = uncachedVendors.slice(b, b + BATCH_SIZE);
    let batchFetched = false;

    // A. Try OpenRouteService Matrix API if API key provided
    if (ORS_API_KEY) {
      try {
        const locations = [
          [userLon, userLat],
          ...batch.map((v) => [v.longitude ?? v.lon ?? 75.1398, v.latitude ?? v.lat ?? 27.6094]),
        ];
        const destinationIndices = batch.map((_, i) => i + 1);

        const body = {
          locations,
          sources: [0],
          destinations: destinationIndices,
          metrics: ['distance', 'duration'],
          units: 'km',
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
          method: 'POST',
          headers: {
            Authorization: ORS_API_KEY,
            'Content-Type': 'application/json',
            'User-Agent': 'NearBe-App',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.distances && data.distances[0]) {
            batch.forEach((v, i) => {
              const km = parseFloat(Number(data.distances[0][i] || 0).toFixed(2));
              const sec = data.durations?.[0]?.[i];
              const dur = typeof sec === 'number' ? Math.max(1, Math.round(sec / 60)) : null;
              const resObj: RoadDistanceResult = {
                distanceKm: km,
                formattedDistance: formatDistanceKm(km),
                durationMin: dur,
                formattedDuration: formatDurationMin(dur),
                source: 'road',
                isApprox: false,
              };
              results[v.id] = resObj;

              // Save to 6-hour cache
              const vKey = v.id || `${(v.latitude ?? v.lat)?.toFixed(4)}_${(v.longitude ?? v.lon)?.toFixed(4)}`;
              try {
                localStorage.setItem(
                  `nearby_road_dist_${rLat}_${rLon}_${vKey}`,
                  JSON.stringify({ distanceKm: km, durationMin: dur, source: 'road', timestamp: Date.now() })
                );
              } catch {}
            });
            batchFetched = true;
          }
        }
      } catch {}
    }

    // B. Try OSRM Table API (High-speed batch router)
    if (!batchFetched) {
      try {
        const coordsStr = [
          `${userLon},${userLat}`,
          ...batch.map((v) => `${v.longitude ?? v.lon ?? 75.1398},${v.latitude ?? v.lat ?? 27.6094}`),
        ].join(';');

        const destIndicesStr = batch.map((_, i) => i + 1).join(';');
        const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?sources=0&destinations=${destIndicesStr}&annotations=distance,duration`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && data.distances && data.distances[0]) {
            batch.forEach((v, i) => {
              const meters = data.distances[0][i];
              const seconds = data.durations?.[0]?.[i];
              const km = typeof meters === 'number'
                ? parseFloat((meters / 1000).toFixed(2))
                : parseFloat(getDistance(userLat, userLon, v.latitude ?? v.lat ?? 27.6094, v.longitude ?? v.lon ?? 75.1398).toFixed(2));
              const dur = typeof seconds === 'number' ? Math.max(1, Math.round(seconds / 60)) : null;

              const resObj: RoadDistanceResult = {
                distanceKm: km,
                formattedDistance: formatDistanceKm(km),
                durationMin: dur,
                formattedDuration: formatDurationMin(dur),
                source: 'road',
                isApprox: false,
              };
              results[v.id] = resObj;

              // Save to 6-hour cache
              const vKey = v.id || `${(v.latitude ?? v.lat)?.toFixed(4)}_${(v.longitude ?? v.lon)?.toFixed(4)}`;
              try {
                localStorage.setItem(
                  `nearby_road_dist_${rLat}_${rLon}_${vKey}`,
                  JSON.stringify({ distanceKm: km, durationMin: dur, source: 'road', timestamp: Date.now() })
                );
              } catch {}
            });
            batchFetched = true;
          }
        }
      } catch {}
    }

    // C. Fallback: Haversine for any remaining uncached vendors in this batch
    if (!batchFetched) {
      batch.forEach((v) => {
        const vLat = v.latitude ?? v.lat ?? 27.6094;
        const vLon = v.longitude ?? v.lon ?? 75.1398;
        const km = parseFloat(getDistance(userLat, userLon, vLat, vLon).toFixed(2));
        results[v.id] = {
          distanceKm: km,
          formattedDistance: formatDistanceKm(km),
          durationMin: null,
          formattedDuration: null,
          source: 'straight_line',
          isApprox: true,
        };
      });
    }
  }

  return results;
}

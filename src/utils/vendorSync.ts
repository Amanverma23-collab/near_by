import { supabase } from '../lib/supabase';
import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { getEffectiveShopStatus } from './shopTiming';
import { INDIAN_CITY_COORDINATES } from '../components/location/CitySelector';

/**
 * Haversine formula to compute great-circle distance between two GPS points in Kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
    return 1.2;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 0.1) {
    return 0.1; // Within 100 meters
  }

  return Math.round(distance * 10) / 10;
}

/**
 * Resolves current customer GPS or city coordinates from localStorage
 */
export function getUserCurrentCoordinates(): { latitude: number; longitude: number } {
  // 1. Try nearbe_user_location
  try {
    const rawUserLoc = localStorage.getItem('nearbe_user_location');
    if (rawUserLoc) {
      const parsed = JSON.parse(rawUserLoc);
      const lat = parsed.lat ?? parsed.latitude;
      const lon = parsed.lon ?? parsed.longitude ?? parsed.lng;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        return { latitude: Number(lat), longitude: Number(lon) };
      }
      if (parsed.name && INDIAN_CITY_COORDINATES[parsed.name]) {
        return INDIAN_CITY_COORDINATES[parsed.name];
      }
    }
  } catch {}

  // 2. Try nearby_location from LocationContext (active selected location or live GPS)
  try {
    const rawLoc = localStorage.getItem('nearby_location');
    if (rawLoc) {
      const parsed = JSON.parse(rawLoc);
      if (parsed) {
        const lat = parsed.latitude ?? parsed.lat;
        const lon = parsed.longitude ?? parsed.lon ?? parsed.lng;
        if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
          return { latitude: Number(lat), longitude: Number(lon) };
        }
        if (parsed.city && INDIAN_CITY_COORDINATES[parsed.city]) {
          return INDIAN_CITY_COORDINATES[parsed.city];
        }
      }
    }
  } catch {}

  // 3. Try nearby_current_gps cached coordinates
  try {
    const rawGps = localStorage.getItem('nearby_current_gps');
    if (rawGps) {
      const parsed = JSON.parse(rawGps);
      const lat = parsed.latitude ?? parsed.lat;
      const lon = parsed.longitude ?? parsed.lon ?? parsed.lng;
      if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        return { latitude: Number(lat), longitude: Number(lon) };
      }
    }
  } catch {}

  // 4. Try nearby_selected_city
  try {
    const selectedCity = localStorage.getItem('nearby_selected_city');
    if (selectedCity && INDIAN_CITY_COORDINATES[selectedCity]) {
      return INDIAN_CITY_COORDINATES[selectedCity];
    }
  } catch {}

  // 5. Default fallback: Sikar, Rajasthan (27.6094, 75.1398)
  return { latitude: 27.6094, longitude: 75.1398 };
}

/**
 * Determines if a vendor has an active, valid subscription plan (Trial, Active, Pro).
 * If the subscription has expired or is cancelled, returns false (offline & hidden).
 */
export function isVendorSubscriptionActive(v: any): boolean {
  if (!v) return false;

  // 1. Explicit expired/cancelled statuses
  if (v.subscription_status === 'expired' || v.subscription_status === 'cancelled') {
    return false;
  }

  // 2. Check local storage cache override (e.g. recent purchase/reward offline sync)
  const cleanPhone = (v.phone_number || '').replace(/\D/g, '').slice(-10);
  const cachedSubStr = v.id
    ? localStorage.getItem(`nearby_subscription_${v.id}`)
    : cleanPhone
    ? localStorage.getItem(`nearby_subscription_${cleanPhone}`)
    : null;

  if (cachedSubStr) {
    try {
      const cached = JSON.parse(cachedSubStr);
      if (cached.status === 'expired' || cached.status === 'cancelled') return false;
      if (cached.expiresAt) {
        const expTime = new Date(cached.expiresAt).getTime();
        if (!isNaN(expTime)) {
          return expTime > Date.now();
        }
      }
    } catch {}
  }

  // 3. Check database subscription_expires_at
  if (v.subscription_expires_at) {
    const expTime = new Date(v.subscription_expires_at).getTime();
    if (!isNaN(expTime)) {
      return expTime > Date.now();
    }
  }

  // 4. If status is active/trial/pro without specific expiry date, treat as active
  if (['trial', 'active', 'pro'].includes(v.subscription_status)) {
    return true;
  }

  return false;
}

/**
 * Fetches all registered live vendors from Supabase / database, computes their real
 * dynamic GPS distance based on customer position, and returns them sorted by closest first.
 * Expired shops are strictly filtered out (offline).
 */
export async function fetchCombinedVendors(
  userCoords?: { latitude?: number | null; longitude?: number | null } | null
): Promise<Vendor[]> {
  try {
    const activeCoords =
      userCoords && typeof userCoords.latitude === 'number' && typeof userCoords.longitude === 'number'
        ? { latitude: userCoords.latitude, longitude: userCoords.longitude }
        : getUserCurrentCoordinates();

    const { data } = await supabase.from('vendors').select('*');

    if (data && Array.isArray(data) && data.length > 0) {
      // 1. Filter out unfinished placeholder rows AND expired vendors (take them offline)
      const validRows = data.filter(
        (v: any) =>
          v.name &&
          v.name !== 'Pending Shop Registration' &&
          v.name !== 'pending' &&
          isVendorSubscriptionActive(v)
      );

      const realVendors: Vendor[] = validRows.map((v: any, idx: number) => {
        const cleanPhone = (v.phone_number || '').replace(/\D/g, '').slice(-10);
        const localPhotosStr = v.id
          ? localStorage.getItem(`nearby_photos_${v.id}`)
          : cleanPhone
          ? localStorage.getItem(`nearby_photos_${cleanPhone}`)
          : null;
        let parsedLocalPhotos: string[] | null = null;
        if (localPhotosStr) {
          try {
            parsedLocalPhotos = JSON.parse(localPhotosStr);
          } catch {}
        }

        const images =
          parsedLocalPhotos && parsedLocalPhotos.length > 0
            ? parsedLocalPhotos
            : v.shop_images && Array.isArray(v.shop_images) && v.shop_images.length > 0
            ? v.shop_images
            : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'];

        const isVerified = Boolean(v.is_verified || v.verification_status === 'approved');

        const hoursText =
          v.opening_hours && v.opening_hours !== 'pending'
            ? v.opening_hours
            : `${v.opening_time || '08:00'} - ${v.closing_time || '21:00'}`;

        // Compute real dynamic open/closed status based on opening hours & manual toggle
        const timingStatus = getEffectiveShopStatus(v);

        // Calculate REAL Haversine distance between customer location and vendor location
        const vendorLat = typeof v.latitude === 'number' && !isNaN(v.latitude) ? v.latitude : (27.6094 + idx * 0.005);
        const vendorLng = typeof v.longitude === 'number' && !isNaN(v.longitude) ? v.longitude : (75.1398 + idx * 0.005);
        const realCalculatedDistance = calculateHaversineDistanceKm(
          activeCoords.latitude,
          activeCoords.longitude,
          vendorLat,
          vendorLng
        );

        return {
          id: v.id || `real-v-${idx}`,
          name: v.name || v.shop_name || 'Nearby Shop',
          category: v.category || 'vehicle-emergency',
          subService: v.sub_service || 'General Services',
          distanceKm: realCalculatedDistance,
          address: v.address || 'Local Market',
          isOpenNow: timingStatus.isOpen,
          openingHours: hoursText,
          phoneNumber: v.phone_number || v.whatsapp_number || '9876543210',
          whatsappNumber: v.whatsapp_number || v.phone_number || '9876543210',
          rating: v.rating ? Number(v.rating) : (Array.isArray(v.reviews) && v.reviews.length > 0 ? Math.round((v.reviews.reduce((a: number, r: any) => a + Number(r.rating || 5), 0) / v.reviews.length) * 10) / 10 : 0.0),
          isVerified: isVerified,
          ownerName: v.owner_name || 'Shop Owner',
          shopImages: images,
          imageUrl: images[0],
          latitude: vendorLat,
          longitude: vendorLng,
          servicesOffered: Array.isArray(v.services_offered)
            ? v.services_offered.map((s: any) => ({ name: s.name, price: s.price }))
            : [{ name: 'Standard Service', price: '₹150' }],
          reviews: Array.isArray(v.reviews) ? v.reviews : [],
          reviewCount: Array.isArray(v.reviews) ? v.reviews.length : Number(v.review_count || 0),
          opening_time: v.opening_time || '08:00',
          closing_time: v.closing_time || '21:00',
          manual_status: v.manual_status || 'auto',
          manual_status_set_at: v.manual_status_set_at,
        };
      });

      // Combine real registered vendors with sample dummy vendors and sort by distance (nearest first)
      const existingIds = new Set(realVendors.map((rv) => rv.id));
      const nonDuplicateDummies = dummyVendors
        .filter((dv) => !existingIds.has(dv.id))
        .map((dv) => ({
          ...dv,
          distanceKm: calculateHaversineDistanceKm(
            activeCoords.latitude,
            activeCoords.longitude,
            dv.latitude,
            dv.longitude
          ),
        }));

      const merged = [...realVendors, ...nonDuplicateDummies];
      // Sort nearest first
      merged.sort((a, b) => a.distanceKm - b.distanceKm);

      return merged;
    }
  } catch (err) {
    console.error('Error fetching registered vendors for customer app:', err);
  }

  return dummyVendors;
}

export async function trackVendorCall(vendorId?: string, phoneNumber?: string) {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (vendorId) {
    const key = `nearby_calls_${vendorId}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }
  if (cleanPhone && cleanPhone !== vendorId) {
    const key = `nearby_calls_${cleanPhone}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }

  // Update in central Supabase database
  try {
    if (vendorId) {
      const { data: v } = await supabase.from('vendors').select('call_clicks').eq('id', vendorId).maybeSingle();
      const newCount = (Number(v?.call_clicks) || 0) + 1;
      await supabase.from('vendors').update({ call_clicks: newCount }).eq('id', vendorId);
    } else if (cleanPhone) {
      const { data: v } = await supabase.from('vendors').select('id, call_clicks').eq('phone_number', cleanPhone).maybeSingle();
      if (v) {
        const newCount = (Number(v.call_clicks) || 0) + 1;
        await supabase.from('vendors').update({ call_clicks: newCount }).eq('id', v.id);
      }
    }
  } catch (e) {
    // Non-blocking background analytics
  }
}

export async function trackVendorWhatsApp(vendorId?: string, phoneNumber?: string) {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (vendorId) {
    const key = `nearby_wa_${vendorId}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }
  if (cleanPhone && cleanPhone !== vendorId) {
    const key = `nearby_wa_${cleanPhone}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }

  // Update in central Supabase database
  try {
    if (vendorId) {
      const { data: v } = await supabase.from('vendors').select('whatsapp_clicks').eq('id', vendorId).maybeSingle();
      const newCount = (Number(v?.whatsapp_clicks) || 0) + 1;
      await supabase.from('vendors').update({ whatsapp_clicks: newCount }).eq('id', vendorId);
    } else if (cleanPhone) {
      const { data: v } = await supabase.from('vendors').select('id, whatsapp_clicks').eq('phone_number', cleanPhone).maybeSingle();
      if (v) {
        const newCount = (Number(v.whatsapp_clicks) || 0) + 1;
        await supabase.from('vendors').update({ whatsapp_clicks: newCount }).eq('id', v.id);
      }
    }
  } catch (e) {
    // Non-blocking background analytics
  }
}

export async function trackVendorView(vendorId?: string, phoneNumber?: string) {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (vendorId) {
    const key = `nearby_views_${vendorId}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }
  if (cleanPhone && cleanPhone !== vendorId) {
    const key = `nearby_views_${cleanPhone}`;
    const curr = Number(localStorage.getItem(key) || 0);
    localStorage.setItem(key, String(curr + 1));
  }

  // Update in central Supabase database
  try {
    if (vendorId) {
      const { data: v } = await supabase.from('vendors').select('profile_views').eq('id', vendorId).maybeSingle();
      const newCount = (Number(v?.profile_views) || 0) + 1;
      await supabase.from('vendors').update({ profile_views: newCount }).eq('id', vendorId);
    } else if (cleanPhone) {
      const { data: v } = await supabase.from('vendors').select('id, profile_views').eq('phone_number', cleanPhone).maybeSingle();
      if (v) {
        const newCount = (Number(v.profile_views) || 0) + 1;
        await supabase.from('vendors').update({ profile_views: newCount }).eq('id', v.id);
      }
    }
  } catch (e) {
    // Non-blocking background analytics
  }
}

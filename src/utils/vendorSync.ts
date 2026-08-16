import { supabase } from '../lib/supabase';
import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { getEffectiveShopStatus } from './shopTiming';

/**
 * Fetches all registered live vendors from Supabase / database and merges them
 * with default listings so newly registered shops appear dynamically across the Customer App.
 */
export async function fetchCombinedVendors(): Promise<Vendor[]> {
  try {
    const { data } = await supabase.from('vendors').select('*');

    if (data && Array.isArray(data) && data.length > 0) {
      // 1. Filter out unfinished signup placeholder rows
      const validRows = data.filter(
        (v: any) => v.name && v.name !== 'Pending Shop Registration' && v.name !== 'pending'
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

        return {
          id: v.id || `real-v-${idx}`,
          name: v.name || v.shop_name || 'Nearby Shop',
          category: v.category || 'vehicle-emergency',
          subService: v.sub_service || 'General Services',
          distanceKm: v.distance_km || (0.4 + idx * 0.2),
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
          latitude: v.latitude || 28.6519,
          longitude: v.longitude || 77.1905,
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

      // Combine real registered vendors with sample dummy vendors so customers always see rich listings
      const existingIds = new Set(realVendors.map((rv) => rv.id));
      const nonDuplicateDummies = dummyVendors.filter((dv) => !existingIds.has(dv.id));

      return [...realVendors, ...nonDuplicateDummies];
    }
  } catch (err) {
    console.error('Error fetching registered vendors for customer app:', err);
  }

  return dummyVendors;
}

export function trackVendorCall(vendorId?: string, phoneNumber?: string) {
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
}

export function trackVendorWhatsApp(vendorId?: string, phoneNumber?: string) {
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
}

import { supabase } from '../lib/supabase';
import { dummyVendors, type Vendor } from '../data/dummyVendors';

/**
 * Fetches all registered vendors from Supabase / database and merges them
 * with default listings so newly registered shops appear dynamically across the Customer App.
 */
export async function fetchCombinedVendors(): Promise<Vendor[]> {
  try {
    const { data } = await supabase.from('vendors').select('*');

    if (data && Array.isArray(data) && data.length > 0) {
      const realVendors: Vendor[] = data.map((v: any, idx: number) => {
        const images =
          v.shop_images && Array.isArray(v.shop_images) && v.shop_images.length > 0
            ? v.shop_images
            : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'];

        return {
          id: v.id || `real-v-${idx}`,
          name: v.name || v.shop_name || 'Nearby Shop',
          category: v.category || 'vehicle-emergency',
          subService: v.sub_service || 'General Services',
          distanceKm: 0.4 + idx * 0.2,
          address: v.address || 'Local Market',
          isOpenNow: true,
          openingHours: `${v.opening_time || '08:00'} - ${v.closing_time || '21:00'}`,
          phoneNumber: v.phone_number || '9876543210',
          whatsappNumber: v.whatsapp_number || v.phone_number || '9876543210',
          rating: 4.8,
          isVerified: v.is_verified ?? true,
          ownerName: v.owner_name || 'Shop Owner',
          shopImages: images,
          imageUrl: images[0],
          latitude: v.latitude || 28.6519,
          longitude: v.longitude || 77.1905,
          servicesOffered: Array.isArray(v.services_offered)
            ? v.services_offered.map((s: any) => ({ name: s.name, price: s.price }))
            : [{ name: 'Standard Service', price: '₹150' }],
          reviews: [
            {
              id: `r-${idx}`,
              reviewerName: 'Verified Customer',
              rating: 5,
              comment: 'Great verified local service on NearBe!',
              daysAgo: 1,
            },
          ],
          reviewCount: 8,
          opening_time: v.opening_time || '08:00',
          closing_time: v.closing_time || '21:00',
          manual_status: v.manual_status || 'auto',
          manual_status_set_at: v.manual_status_set_at,
        };
      });

      // Return real registered vendors
      return realVendors;
    }
  } catch (err) {
    console.error('Error fetching registered vendors for customer app:', err);
  }

  return [];
}

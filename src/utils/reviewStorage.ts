import { supabase } from '../lib/supabase';

export interface SavedReview {
  id: string;
  vendorId: string;
  vendorName?: string;
  reviewerName: string;
  reviewerPhone?: string;
  rating: number;
  comment?: string;
  photoUrl?: string;
  daysAgo: number;
  created_at: string;
}

/**
 * Clean up legacy localStorage review entries if any exist
 */
function purgeLegacyLocalStorageReviews(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nearby_reviews_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Notice purging legacy localStorage reviews:', err);
  }
}

/**
 * Gets customer reviews for a given vendor directly from Supabase DB (0% localStorage)
 */
export async function getSavedReviews(vendorId: string): Promise<SavedReview[]> {
  if (!vendorId) return [];
  purgeLegacyLocalStorageReviews();

  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('reviews')
      .or(`id.eq.${vendorId},phone_number.eq.${vendorId}`)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getSavedReviews error:', error);
      return [];
    }

    if (data && Array.isArray(data.reviews)) {
      const map = new Map<string, SavedReview>();
      data.reviews.forEach((r: any) => {
        if (r && (r.id || r.created_at)) {
          const item: SavedReview = {
            id: r.id || `rev-${r.created_at}`,
            vendorId,
            vendorName: r.vendorName,
            reviewerName: r.reviewerName || r.reviewer_name || 'Customer',
            reviewerPhone: r.reviewerPhone,
            rating: Number(r.rating || 5),
            comment: r.comment || '',
            photoUrl: r.photoUrl,
            daysAgo: r.daysAgo || 0,
            created_at: r.created_at || new Date().toISOString(),
          };
          map.set(item.id, item);
        }
      });
      return Array.from(map.values());
    }
  } catch (err) {
    console.error('Error reading vendor reviews from Supabase DB:', err);
  }
  return [];
}

/**
 * Persists a new customer review directly into Supabase DB (0% localStorage)
 */
export async function saveNewReview(
  vendorId: string,
  reviewData: { reviewerName: string; rating: number; comment?: string; photoUrl?: string; vendorName?: string }
): Promise<SavedReview> {
  purgeLegacyLocalStorageReviews();

  const currentPhone =
    localStorage.getItem('nearby_customer_phone') ||
    localStorage.getItem('nearby_vendor_phone') ||
    undefined;

  const uniqueReviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newReviewItem: SavedReview = {
    id: uniqueReviewId,
    vendorId,
    vendorName: reviewData.vendorName,
    reviewerName: reviewData.reviewerName,
    reviewerPhone: currentPhone,
    rating: reviewData.rating,
    comment: reviewData.comment,
    photoUrl: reviewData.photoUrl,
    daysAgo: 0,
    created_at: new Date().toISOString(),
  };

  if (vendorId) {
    try {
      const { data: vendorRow } = await supabase
        .from('vendors')
        .select('id, reviews')
        .or(`id.eq.${vendorId}${reviewData.vendorName ? `,name.eq.${reviewData.vendorName}` : ''}`)
        .maybeSingle();

      let dbReviews: SavedReview[] = [];
      if (vendorRow && Array.isArray(vendorRow.reviews)) {
        dbReviews = vendorRow.reviews;
      }

      const mergedDbReviews = [newReviewItem, ...dbReviews.filter((r: any) => r.id !== newReviewItem.id)];
      const avgRating =
        mergedDbReviews.length > 0
          ? Math.round((mergedDbReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / mergedDbReviews.length) * 10) / 10
          : 5.0;

      await supabase
        .from('vendors')
        .update({
          reviews: mergedDbReviews,
          review_count: mergedDbReviews.length,
          rating: avgRating,
        })
        .or(`id.eq.${vendorId}${reviewData.vendorName ? `,name.eq.${reviewData.vendorName}` : ''}`);
    } catch (e) {
      console.error('Error saving review to Supabase DB:', e);
    }
  }

  return newReviewItem;
}

/**
 * Gets ALL reviews created by the currently logged-in user directly from Supabase DB (0% localStorage)
 */
export async function getAllUserReviews(): Promise<SavedReview[]> {
  purgeLegacyLocalStorageReviews();

  const currentPhone = (
    localStorage.getItem('nearby_customer_phone') ||
    localStorage.getItem('nearby_vendor_phone') ||
    ''
  ).replace(/\D/g, '').slice(-10);

  if (!currentPhone) return [];

  try {
    const { data: vendors } = await supabase.from('vendors').select('id, name, reviews');
    if (!vendors || !Array.isArray(vendors)) return [];

    const reviewsMap = new Map<string, SavedReview>();

    vendors.forEach((v: any) => {
      if (Array.isArray(v.reviews)) {
        v.reviews.forEach((r: any) => {
          if (r) {
            const rPhone = (r.reviewerPhone || '').replace(/\D/g, '').slice(-10);
            if (rPhone && rPhone === currentPhone) {
              const item: SavedReview = {
                id: r.id || `rev-${r.created_at}`,
                vendorId: v.id,
                vendorName: v.name || r.vendorName,
                reviewerName: r.reviewerName || 'Customer',
                reviewerPhone: r.reviewerPhone,
                rating: Number(r.rating || 5),
                comment: r.comment || '',
                photoUrl: r.photoUrl,
                daysAgo: r.daysAgo || 0,
                created_at: r.created_at || new Date().toISOString(),
              };
              reviewsMap.set(item.id, item);
            }
          }
        });
      }
    });

    const allReviews = Array.from(reviewsMap.values());
    allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return allReviews;
  } catch (err) {
    console.error('Error reading user reviews from Supabase DB:', err);
    return [];
  }
}

/**
 * Deletes a SPECIFIC review by reviewId directly from Supabase DB (0% localStorage)
 */
export async function deleteReview(vendorId: string, reviewId: string): Promise<boolean> {
  if (!reviewId) return false;
  purgeLegacyLocalStorageReviews();

  try {
    const { data: vendorRow } = await supabase
      .from('vendors')
      .select('id, reviews')
      .or(`id.eq.${vendorId},phone_number.eq.${vendorId}`)
      .maybeSingle();

    if (vendorRow && Array.isArray(vendorRow.reviews)) {
      const dbUpdated = vendorRow.reviews.filter((r: any) => r.id !== reviewId);
      const avgRating =
        dbUpdated.length > 0
          ? Math.round((dbUpdated.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / dbUpdated.length) * 10) / 10
          : 5.0;

      await supabase
        .from('vendors')
        .update({
          reviews: dbUpdated,
          review_count: dbUpdated.length,
          rating: avgRating,
        })
        .eq('id', vendorRow.id);
    }
    return true;
  } catch (err) {
    console.error('Error deleting review from Supabase DB:', err);
    return false;
  }
}

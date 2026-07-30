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
 * Gets persistently saved customer reviews for a given vendor from localStorage/storage
 */
export function getSavedReviews(vendorId: string): SavedReview[] {
  if (!vendorId) return [];
  try {
    const raw = localStorage.getItem(`nearby_reviews_${vendorId}`);
    if (raw) {
      const parsed: SavedReview[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Deduplicate by review unique primary key 'id'
        const map = new Map<string, SavedReview>();
        parsed.forEach((r) => {
          if (r && r.id) map.set(r.id, r);
        });
        return Array.from(map.values());
      }
    }
  } catch (err) {
    console.error('Error reading saved reviews from localStorage:', err);
  }
  return [];
}

/**
 * Persists a new customer review into localStorage & Supabase so it remains and syncs to shop owner
 */
export function saveNewReview(
  vendorId: string,
  reviewData: { reviewerName: string; rating: number; comment?: string; photoUrl?: string; vendorName?: string }
): SavedReview {
  const existing = getSavedReviews(vendorId);
  const currentPhone = localStorage.getItem('nearby_customer_phone') || undefined;

  // Generate unique review primary ID with high entropy timestamp + random string
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

  // Deduplicate before saving
  const filteredExisting = existing.filter((r) => r.id !== uniqueReviewId);
  const updated = [newReviewItem, ...filteredExisting];

  try {
    // Only save to single canonical key by vendorId (avoiding duplicate vendorName key bloat)
    localStorage.setItem(`nearby_reviews_${vendorId}`, JSON.stringify(updated));

    // Also clean up any legacy vendorName keys if present to prevent ghost duplicates
    if (reviewData.vendorName && reviewData.vendorName !== vendorId) {
      localStorage.removeItem(`nearby_reviews_${reviewData.vendorName}`);
    }
  } catch (err) {
    console.error('Error saving new review to localStorage:', err);
  }

  // Async update to Supabase vendors table
  if (vendorId) {
    (async () => {
      try {
        // Fetch existing vendor row from Supabase to merge reviews cleanly without wiping other reviews
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('id, reviews')
          .or(`id.eq.${vendorId}${reviewData.vendorName ? `,name.eq.${reviewData.vendorName}` : ''}`)
          .maybeSingle();

        let dbReviews: SavedReview[] = [];
        if (vendorRow && Array.isArray(vendorRow.reviews)) {
          dbReviews = vendorRow.reviews;
        }

        // Filter out any duplicate with same ID, then prepend new item
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
        console.warn('Supabase review sync notice:', e);
      }
    })();
  }

  return newReviewItem;
}

/**
 * Gets ALL reviews the current user has given across ALL vendors
 * Returns deduplicated reviews by review unique primary key 'id' and strictly filtered by current user's phone number
 */
export function getAllUserReviews(): SavedReview[] {
  const currentPhone = (
    localStorage.getItem('nearby_customer_phone') ||
    localStorage.getItem('nearby_vendor_phone') ||
    ''
  ).replace(/\D/g, '').slice(-10);

  const reviewsMap = new Map<string, SavedReview>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Scan canonical nearby_reviews_ keys
      if (key && key.startsWith('nearby_reviews_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const list: SavedReview[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((r) => {
                if (r && r.id) {
                  // Filter strictly by current user's phone number if logged in
                  if (currentPhone) {
                    const rPhone = (r.reviewerPhone || '').replace(/\D/g, '').slice(-10);
                    if (rPhone && rPhone !== currentPhone) {
                      return; // Skip review from a different user's account
                    }
                  }
                  reviewsMap.set(r.id, r);
                }
              });
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Error reading all user reviews from localStorage:', err);
  }

  const allReviews = Array.from(reviewsMap.values());
  // Sort by created_at descending (newest first)
  allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return allReviews;
}

/**
 * Deletes a SPECIFIC review by reviewId from BOTH local storage AND Supabase DB
 * Filters strictly by unique review primary key `r.id === reviewId` so OTHER reviews remain untouched!
 */
export async function deleteReview(vendorId: string, reviewId: string): Promise<boolean> {
  if (!reviewId) return false;

  try {
    // 1. Delete from LocalStorage
    const existing = getSavedReviews(vendorId);
    const updated = existing.filter((r) => r.id !== reviewId);
    if (updated.length === 0) {
      localStorage.removeItem(`nearby_reviews_${vendorId}`);
    } else {
      localStorage.setItem(`nearby_reviews_${vendorId}`, JSON.stringify(updated));
    }

    // Also clear any legacy keys if they exist in localStorage containing this reviewId
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nearby_reviews_')) {
        const raw = localStorage.getItem(key);
        if (raw && raw.includes(reviewId)) {
          try {
            const parsed: SavedReview[] = JSON.parse(raw);
            const filtered = parsed.filter((r) => r.id !== reviewId);
            if (filtered.length === 0) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          } catch {}
        }
      }
    }

    // 2. Persist deletion to Supabase Database by updating vendor reviews JSONB array
    if (vendorId) {
      try {
        const { data: vendorRow } = await supabase
          .from('vendors')
          .select('id, reviews')
          .or(`id.eq.${vendorId},phone_number.eq.${vendorId}`)
          .maybeSingle();

        if (vendorRow && Array.isArray(vendorRow.reviews)) {
          // Strictly filter out ONLY the specific review targeted by unique primary key `id`
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
      } catch (e) {
        console.warn('Supabase DB delete review notice:', e);
      }
    }

    return true;
  } catch (err) {
    console.error('Error deleting review:', err);
    return false;
  }
}

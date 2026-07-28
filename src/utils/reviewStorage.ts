export interface SavedReview {
  id: string;
  vendorId: string;
  vendorName?: string;
  reviewerName: string;
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
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading saved reviews from localStorage:', err);
  }
  return [];
}

/**
 * Persists a new customer review into localStorage so it remains after page refresh
 */
export function saveNewReview(
  vendorId: string,
  reviewData: { reviewerName: string; rating: number; comment?: string; photoUrl?: string; vendorName?: string }
): SavedReview {
  const existing = getSavedReviews(vendorId);

  const newReviewItem: SavedReview = {
    id: `rev-saved-${Date.now()}`,
    vendorId,
    vendorName: reviewData.vendorName,
    reviewerName: reviewData.reviewerName,
    rating: reviewData.rating,
    comment: reviewData.comment,
    photoUrl: reviewData.photoUrl,
    daysAgo: 0,
    created_at: new Date().toISOString(),
  };

  const updated = [newReviewItem, ...existing];

  try {
    localStorage.setItem(`nearby_reviews_${vendorId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving new review to localStorage:', err);
  }

  return newReviewItem;
}

/**
 * Gets ALL reviews the current user has given across ALL vendors
 * Scans all localStorage keys matching the nearby_reviews_ prefix
 */
export function getAllUserReviews(): SavedReview[] {
  const allReviews: SavedReview[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nearby_reviews_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const reviews: SavedReview[] = JSON.parse(raw);
          allReviews.push(...reviews);
        }
      }
    }
  } catch (err) {
    console.error('Error reading all user reviews from localStorage:', err);
  }
  // Sort by created_at descending (newest first)
  allReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return allReviews;
}

/**
 * Deletes a specific review by vendorId and reviewId from localStorage
 */
export function deleteReview(vendorId: string, reviewId: string): boolean {
  try {
    const existing = getSavedReviews(vendorId);
    const updated = existing.filter((r) => r.id !== reviewId);
    if (updated.length === existing.length) return false; // not found
    if (updated.length === 0) {
      localStorage.removeItem(`nearby_reviews_${vendorId}`);
    } else {
      localStorage.setItem(`nearby_reviews_${vendorId}`, JSON.stringify(updated));
    }
    return true;
  } catch (err) {
    console.error('Error deleting review from localStorage:', err);
    return false;
  }
}

import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { fetchCombinedVendors } from './vendorSync';

const STORAGE_KEY = 'nearby_saved_vendor_ids';

// Default initial saved vendor IDs if none exist yet
const DEFAULT_SAVED_IDS: string[] = [];

/**
 * Gets all saved vendor IDs from localStorage
 */
export function getSavedVendorIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading saved vendor IDs:', err);
  }
  return DEFAULT_SAVED_IDS;
}

/**
 * Checks if a specific vendor is saved/liked
 */
export function isVendorSaved(vendorId: string): boolean {
  if (!vendorId) return false;
  const savedIds = getSavedVendorIds();
  return savedIds.includes(vendorId);
}

/**
 * Toggles a vendor's saved/liked status in localStorage
 * Returns true if now saved, false if unsaved
 */
export function toggleSaveVendor(vendorId: string): boolean {
  if (!vendorId) return false;
  const current = getSavedVendorIds();
  const index = current.indexOf(vendorId);
  let updated: string[];

  if (index >= 0) {
    updated = current.filter((id) => id !== vendorId);
  } else {
    updated = [vendorId, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event so reactive components update immediately
    window.dispatchEvent(new Event('nearby_favorites_changed'));
  } catch (err) {
    console.error('Error saving vendor favorites:', err);
  }

  return updated.includes(vendorId);
}

/**
 * Returns total count of saved vendors
 */
export function getSavedVendorsCount(): number {
  return getSavedVendorIds().length;
}

/**
 * Async helper to get all full Vendor objects that are saved
 */
export async function getSavedVendorsList(): Promise<Vendor[]> {
  const savedIds = getSavedVendorIds();
  const allVendors = await fetchCombinedVendors();
  return allVendors.filter((v) => savedIds.includes(v.id));
}

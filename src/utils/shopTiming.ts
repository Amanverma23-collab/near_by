import { supabase } from '../lib/supabase';

export interface ShopTimingData {
  id?: string;
  opening_time?: string | null; // '08:00'
  closing_time?: string | null; // '21:00'
  manual_status?: 'auto' | 'manual_open' | 'manual_closed' | null;
  manual_status_set_at?: string | null;
  [key: string]: any;
}

export interface EffectiveShopStatus {
  isOpen: boolean;
  statusLabel: 'Open' | 'Closed';
  isManual: boolean;
  modeText: string; // e.g. "Open (Manual)" | "Closed (Scheduled)"
  detailNote?: string;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
}

/**
 * Format 24h time string ('08:00', '21:30') into clean 12h format ('8:00 AM', '9:30 PM')
 */
export function formatTime12H(time24?: string | null): string {
  if (!time24) return 'N/A';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return time24;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes '12'

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Parses time string 'HH:MM' into total minutes from midnight (0 to 1439)
 */
function parseTimeToMinutes(timeStr?: string | null, defaultMinutes: number = 0): number {
  if (!timeStr) return defaultMinutes;
  const parts = timeStr.split(':');
  if (parts.length < 2) return defaultMinutes;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

/**
 * Computes current effective Open/Closed status for any vendor based on:
 * 1. Scheduled opening_time and closing_time
 * 2. Active manual_status override
 * 3. Expiration of manual override once closing_time is reached
 */
export function getEffectiveShopStatus(
  vendor: ShopTimingData,
  now: Date = new Date()
): EffectiveShopStatus {
  const openingTime24 = vendor?.opening_time || '08:00';
  const closingTime24 = vendor?.closing_time || '21:00';

  const openMinutes = parseTimeToMinutes(openingTime24, 8 * 60); // 8:00 AM
  const closeMinutes = parseTimeToMinutes(closingTime24, 21 * 60); // 9:00 PM
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Evaluate if current time falls within scheduled hours
  let isWithinSchedule = false;
  if (openMinutes < closeMinutes) {
    // Normal same-day schedule (e.g. 08:00 to 21:00)
    isWithinSchedule = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight schedule (e.g. 22:00 to 04:00)
    isWithinSchedule = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const manualStatus = vendor?.manual_status || 'auto';
  const openingTimeFormatted = formatTime12H(openingTime24);
  const closingTimeFormatted = formatTime12H(closingTime24);

  let isOverrideExpired = false;

  if (manualStatus !== 'auto') {
    if (vendor?.manual_status_set_at) {
      const setAtDate = new Date(vendor.manual_status_set_at);

      // Check if set_at was on a previous calendar day
      const isPreviousDay =
        now.getFullYear() > setAtDate.getFullYear() ||
        now.getMonth() > setAtDate.getMonth() ||
        now.getDate() > setAtDate.getDate();

      if (isPreviousDay) {
        // If it's a new day, override has expired once morning opening or closing passed
        isOverrideExpired = true;
      } else {
        // Same calendar day:
        // Construct today's closing time Date object
        const closeH = Math.floor(closeMinutes / 60);
        const closeM = closeMinutes % 60;
        const todayClosingDate = new Date(now);
        todayClosingDate.setHours(closeH, closeM, 0, 0);

        // Override expires ONLY if:
        // 1. Override was set BEFORE today's closing time
        // 2. AND current time has now crossed today's closing time
        if (setAtDate.getTime() < todayClosingDate.getTime() && now.getTime() >= todayClosingDate.getTime()) {
          isOverrideExpired = true;
        }
      }
    } else {
      // If manual_status_set_at is not recorded, evaluate simple schedule boundary
      if (openMinutes < closeMinutes) {
        if (currentMinutes >= closeMinutes || currentMinutes < openMinutes) {
          isOverrideExpired = true;
        }
      }
    }
  }

  // Opportunistically update DB to revert to 'auto' if expired
  if (isOverrideExpired && vendor?.id && manualStatus !== 'auto') {
    supabase
      .from('vendors')
      .update({
        manual_status: 'auto',
      })
      .eq('id', vendor.id)
      .then(({ error }) => {
        if (error) console.error('Failed to auto-revert manual status:', error);
      });
  }

  // Effective status calculation
  let finalIsOpen = isWithinSchedule;
  let isManual = false;
  let modeText = isWithinSchedule ? 'Open (Scheduled)' : 'Closed (Scheduled)';
  let detailNote = `Schedule: ${openingTimeFormatted} – ${closingTimeFormatted}`;

  if (!isOverrideExpired && (manualStatus === 'manual_open' || manualStatus === 'manual_closed')) {
    isManual = true;
    finalIsOpen = manualStatus === 'manual_open';
    modeText = finalIsOpen ? 'Open (Manual)' : 'Closed (Manual)';
    detailNote = `Manual override active — will return to schedule at ${closingTimeFormatted}`;
  }

  return {
    isOpen: finalIsOpen,
    statusLabel: finalIsOpen ? 'Open' : 'Closed',
    isManual,
    modeText,
    detailNote,
    openingTimeFormatted,
    closingTimeFormatted,
  };
}

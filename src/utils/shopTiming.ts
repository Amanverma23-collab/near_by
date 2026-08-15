import { supabase } from '../lib/supabase';

export interface ShopTimingData {
  id?: string;
  opening_time?: string | null; // '08:00'
  closing_time?: string | null; // '21:00'
  opening_hours?: string | null; // '9:00 AM - 9:00 PM (Closed on Sunday)'
  manual_status?: 'auto' | 'manual_open' | 'manual_closed' | null;
  manual_status_set_at?: string | null;
  [key: string]: any;
}

export interface EffectiveShopStatus {
  isOpen: boolean;
  statusLabel: 'Open' | 'Closed';
  isManual: boolean;
  modeText: string; // e.g. "Open (Manual)" | "Closed (Scheduled)" | "Closed (Weekly Off)"
  detailNote?: string;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
  displayText: string;
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
 * Convert 12h time string ('9:00 AM', '09:00 PM') into 24h format ('09:00', '21:00')
 */
export function parse12HTo24H(time12?: string | null): string {
  if (!time12) return '09:00';
  const clean = time12.trim().toUpperCase();
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '09:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hStr}:${minutes}`;
}

/**
 * Parses full opening_hours string e.g. "9:00 AM - 9:00 PM (Closed on Sunday)"
 */
export function parseOpeningHours(openingHours?: string | null) {
  if (!openingHours || openingHours === 'pending') {
    return {
      openingTime24: '09:00',
      closingTime24: '21:00',
      closedDays: ['Sunday'],
      isOpen24H: false,
      displayText: '9:00 AM – 9:00 PM (Closed on Sunday)',
    };
  }

  const is24H = openingHours.toLowerCase().includes('24 hour') || openingHours.toLowerCase().includes('open 24');

  // Extract closed days
  const closedDays: string[] = [];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  daysOfWeek.forEach((day) => {
    if (new RegExp(`Closed on [^)]*\\b${day}\\b`, 'i').test(openingHours)) {
      closedDays.push(day);
    }
  });

  // Extract open and close times
  let open24 = '09:00';
  let close24 = '21:00';

  if (!is24H) {
    const timeMatch = openingHours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (timeMatch) {
      open24 = parse12HTo24H(timeMatch[1]);
      close24 = parse12HTo24H(timeMatch[2]);
    }
  }

  return {
    openingTime24: open24,
    closingTime24: close24,
    closedDays,
    isOpen24H: is24H,
    displayText: openingHours,
  };
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
 * 1. Registered opening_hours / scheduled time
 * 2. Weekly off day status
 * 3. Active manual_status override
 */
export function getEffectiveShopStatus(
  vendor: ShopTimingData,
  now: Date = new Date()
): EffectiveShopStatus {
  // Parse timing configuration from vendor object
  const parsed = parseOpeningHours(vendor?.opening_hours);

  const openingTime24 = vendor?.opening_time || parsed.openingTime24;
  const closingTime24 = vendor?.closing_time || parsed.closingTime24;
  const isOpen24H = parsed.isOpen24H;
  const closedDays = parsed.closedDays;

  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const isWeeklyOff = closedDays.includes(currentDayName);

  const openMinutes = parseTimeToMinutes(openingTime24, 9 * 60); // 9:00 AM
  const closeMinutes = parseTimeToMinutes(closingTime24, 21 * 60); // 9:00 PM
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Evaluate if current time falls within scheduled hours
  let isWithinSchedule = false;
  let scheduleReason = 'Closed (Scheduled)';

  if (isWeeklyOff) {
    isWithinSchedule = false;
    scheduleReason = `Closed (Weekly Off - ${currentDayName})`;
  } else if (isOpen24H) {
    isWithinSchedule = true;
    scheduleReason = 'Open (24 Hours)';
  } else if (openMinutes < closeMinutes) {
    // Normal same-day schedule (e.g. 09:00 to 21:00)
    isWithinSchedule = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    scheduleReason = isWithinSchedule ? 'Open (Scheduled)' : 'Closed (Scheduled)';
  } else {
    // Overnight schedule (e.g. 22:00 to 04:00)
    isWithinSchedule = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    scheduleReason = isWithinSchedule ? 'Open (Scheduled)' : 'Closed (Scheduled)';
  }

  const manualStatus = vendor?.manual_status || 'auto';
  const openingTimeFormatted = formatTime12H(openingTime24);
  const closingTimeFormatted = formatTime12H(closingTime24);

  let isOverrideExpired = false;

  if (manualStatus !== 'auto') {
    if (vendor?.manual_status_set_at) {
      const setAtDate = new Date(vendor.manual_status_set_at);

      const isPreviousDay =
        now.getFullYear() > setAtDate.getFullYear() ||
        now.getMonth() > setAtDate.getMonth() ||
        now.getDate() > setAtDate.getDate();

      if (isPreviousDay) {
        isOverrideExpired = true;
      } else {
        const closeH = Math.floor(closeMinutes / 60);
        const closeM = closeMinutes % 60;
        const todayClosingDate = new Date(now);
        todayClosingDate.setHours(closeH, closeM, 0, 0);

        if (setAtDate.getTime() < todayClosingDate.getTime() && now.getTime() >= todayClosingDate.getTime()) {
          isOverrideExpired = true;
        }
      }
    } else {
      if (openMinutes < closeMinutes) {
        if (currentMinutes >= closeMinutes || currentMinutes < openMinutes) {
          isOverrideExpired = true;
        }
      }
    }
  }

  // Effective status calculation
  let finalIsOpen = isWithinSchedule;
  let isManual = false;
  let modeText = scheduleReason;
  let detailNote = `Schedule: ${openingTimeFormatted} – ${closingTimeFormatted}`;

  if (!isOverrideExpired && (manualStatus === 'manual_open' || manualStatus === 'manual_closed')) {
    isManual = true;
    finalIsOpen = manualStatus === 'manual_open';
    modeText = finalIsOpen ? 'Open (Manual)' : 'Closed (Manual)';
    detailNote = `Manual override active — will return to schedule at ${closingTimeFormatted}`;
  }

  const displayText = vendor?.opening_hours || `${openingTimeFormatted} – ${closingTimeFormatted}`;

  return {
    isOpen: finalIsOpen,
    statusLabel: finalIsOpen ? 'Open' : 'Closed',
    isManual,
    modeText,
    detailNote,
    openingTimeFormatted,
    closingTimeFormatted,
    displayText,
  };
}

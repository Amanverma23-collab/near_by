const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// PLAN TYPES DEFINITION
// ==========================================
const PLANS = {
  MONTHLY: {
    name: "1 Month",
    duration: 30,       // days
    price: 499,         // INR
  },
  HALF_YEARLY: {
    name: "6 Month",
    duration: 180,
    price: 2499,
  },
  YEARLY: {
    name: "1 Year",
    duration: 365,
    price: 4499,
  },
  REFERRAL_FREE: {
    name: "Referral Bonus",
    duration: 30,
    price: 0,           // free
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generates an 8-character unique referral code (e.g., "NB8X2K9P")
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'NB'; // NearBe prefix
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Adds N days to a given date string or Date object
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

/**
 * Formats date to YYYY-MM-DD string
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Internal function to award a free month to a vendor.
 * Extends current active plan's end date by +30 days, or creates a new 30-day plan from today.
 */
async function awardFreeMonth(vendorId) {
  // Check existing active plan
  const [existing] = await db.query(
    `SELECT * FROM vendor_plans 
     WHERE vendor_id = ? AND status = 'active'
     ORDER BY end_date DESC LIMIT 1`,
    [vendorId]
  );

  let startDate, endDate;

  if (existing.length > 0) {
    startDate = existing[0].end_date;
    endDate = addDays(startDate, 30);
  } else {
    startDate = new Date();
    endDate = addDays(startDate, 30);
  }

  await db.query(
    `INSERT INTO vendor_plans 
     (vendor_id, plan_type, start_date, end_date, duration_days, price_paid)
     VALUES (?, 'REFERRAL_FREE', ?, ?, 30, 0)`,
    [vendorId, formatDate(startDate), formatDate(endDate)]
  );

  console.log(`[Referral Bonus] Free month awarded to vendor ${vendorId}. Valid until: ${formatDate(endDate)}`);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

/**
 * Mock/Helper notification dispatcher for expiry warnings
 */
function sendExpiryWarning(email, name, daysLeft) {
  console.log(`[Notification Alert] Sent ${daysLeft}-day expiry reminder to ${name} (${email})`);
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Get available plan list
app.get('/api/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

/**
 * 1. Vendor Signup (with referral code support)
 * POST /api/vendor/signup
 * Body: { name, email, phone, referred_by? }
 */
app.post('/api/vendor/signup', async (req, res) => {
  try {
    const { name, email, phone, referred_by } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and Email are required.' });
    }

    // Generate unique referral code (e.g. "NB8X2K9P")
    let referral_code = generateReferralCode();
    
    // Check collision safety
    const [existingCode] = await db.query(
      `SELECT id FROM vendors WHERE referral_code = ?`, [referral_code]
    );
    if (existingCode && existingCode.length > 0) {
      referral_code = generateReferralCode();
    }

    // Insert new vendor
    const [result] = await db.query(
      `INSERT INTO vendors (name, email, phone, referral_code, referred_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone || null, referral_code, referred_by ? referred_by.trim().toUpperCase() : null]
    );
    const newVendorId = result.insertId;

    let freeMonthAwarded = false;

    // Handle referral tracking
    if (referred_by) {
      const cleanRefCode = referred_by.trim().toUpperCase();
      const [referrer] = await db.query(
        `SELECT * FROM vendors WHERE referral_code = ?`, [cleanRefCode]
      );

      if (referrer && referrer.length > 0) {
        const referrerId = referrer[0].id;

        // Log referral
        await db.query(
          `INSERT INTO referrals (referrer_id, referred_id, referral_code)
           VALUES (?, ?, ?)`,
          [referrerId, newVendorId, cleanRefCode]
        );

        // Increment referrer's lifetime referral count
        await db.query(
          `UPDATE vendors SET referral_count = referral_count + 1 
           WHERE id = ?`, [referrerId]
        );

        // Check if referral_count is multiple of 5 → award free month
        const [updated] = await db.query(
          `SELECT referral_count FROM vendors WHERE id = ?`, [referrerId]
        );
        const count = updated[0].referral_count;

        if (count % 5 === 0) {
          await awardFreeMonth(referrerId);
          freeMonthAwarded = true;

          // Mark referral as bonus awarded
          await db.query(
            `UPDATE referrals SET bonus_awarded = TRUE 
             WHERE referrer_id = ? 
             ORDER BY created_at DESC LIMIT 1`,
            [referrerId]
          );
        }
      }
    }

    res.json({
      success: true,
      vendorId: newVendorId,
      referral_code,
      referred_by: referred_by || null,
      freeMonthAwardedToReferrer: freeMonthAwarded
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Purchase Plan
 * POST /api/vendor/purchase-plan
 * Body: { vendor_id, plan_type }
 */
app.post('/api/vendor/purchase-plan', async (req, res) => {
  try {
    const { vendor_id, plan_type } = req.body;

    if (!vendor_id || !plan_type) {
      return res.status(400).json({ success: false, error: 'vendor_id and plan_type are required.' });
    }

    const plan = PLANS[plan_type];
    if (!plan) {
      return res.status(400).json({ success: false, error: `Invalid plan_type: ${plan_type}` });
    }

    // Check existing active plan
    const [existing] = await db.query(
      `SELECT * FROM vendor_plans 
       WHERE vendor_id = ? AND status = 'active'
       ORDER BY end_date DESC LIMIT 1`,
      [vendor_id]
    );

    let startDate, endDate;

    if (existing && existing.length > 0) {
      // Extend from current plan's end date (stacking)
      startDate = existing[0].end_date;
      endDate = addDays(startDate, plan.duration);
    } else {
      // Fresh plan from today
      startDate = new Date();
      endDate = addDays(startDate, plan.duration);
    }

    await db.query(
      `INSERT INTO vendor_plans 
       (vendor_id, plan_type, start_date, end_date, duration_days, price_paid)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vendor_id, plan_type, 
       formatDate(startDate), formatDate(endDate), 
       plan.duration, plan.price]
    );

    res.json({ 
      success: true, 
      plan_type,
      plan_name: plan.name,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      duration_days: plan.duration,
      price_paid: plan.price
    });
  } catch (err) {
    console.error('Purchase plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Get Vendor Plan Status
 * GET /api/vendor/plan-status/:vendor_id
 */
app.get('/api/vendor/plan-status/:vendor_id', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const today = new Date();

    // Get active plan
    const [plans] = await db.query(
      `SELECT * FROM vendor_plans 
       WHERE vendor_id = ? AND status = 'active'
       ORDER BY end_date DESC LIMIT 1`,
      [vendor_id]
    );

    // Referral info
    const [vendors] = await db.query(
      `SELECT referral_code, referral_count FROM vendors WHERE id = ?`,
      [vendor_id]
    );

    const referralCode = vendors && vendors.length > 0 ? vendors[0].referral_code : 'NB000000';
    const referralCount = vendors && vendors.length > 0 ? Number(vendors[0].referral_count || 0) : 0;
    const referralsToNextBonus = referralCount % 5 === 0 && referralCount > 0 ? 5 : (5 - (referralCount % 5));

    if (!plans || plans.length === 0) {
      return res.json({ 
        hasPlan: false,
        message: "No active plan. Purchase a plan to list your business.",
        referral_code: referralCode,
        referral_count: referralCount,
        referrals_to_next_bonus: referralsToNextBonus
      });
    }

    const plan = plans[0];
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = plan.duration_days;
    const daysUsed = Math.max(0, Math.floor((today - startDate) / msPerDay));
    const daysLeft = Math.max(0, Math.ceil((endDate - today) / msPerDay));
    const progressPercent = Math.min(100, 
      parseFloat(((daysUsed / totalDays) * 100).toFixed(1))
    );

    res.json({
      hasPlan: true,
      plan_type: plan.plan_type,
      start_date: formatDate(plan.start_date),
      end_date: formatDate(plan.end_date),
      total_days: totalDays,
      days_used: daysUsed,
      days_left: daysLeft,
      progress_percent: progressPercent,
      is_expiring_soon: daysLeft <= 7,   // 7 days or fewer remaining
      referral_code: referralCode,
      referral_count: referralCount,
      referrals_to_next_bonus: referralsToNextBonus
    });
  } catch (err) {
    console.error('Plan status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// OPENROUTESERVICE ROAD DISTANCE ENGINE
// ==========================================

let dailyORSCalls = 0;
const MAX_DAILY_CALLS = 1900;
const ORS_API_KEY = process.env.ORS_API_KEY || '';

/**
 * Straight-line Haversine fallback distance
 */
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function roundCoord(coord) {
  return Math.round(Number(coord) * 1000) / 1000;
}

/**
 * OpenRouteService road distance with 5-second timeout and Haversine fallback
 */
async function getRoadDistance(lat1, lon1, lat2, lon2) {
  if (!ORS_API_KEY || dailyORSCalls >= MAX_DAILY_CALLS) {
    const straightLineKm = getHaversineDistance(lat1, lon1, lat2, lon2);
    return {
      distanceKm: parseFloat(straightLineKm.toFixed(2)),
      durationMin: null,
      source: 'straight_line',
    };
  }

  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${lon1},${lat1}&end=${lon2},${lat2}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    dailyORSCalls++;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NearBe-App' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`ORS API returned ${res.status}`);

    const data = await res.json();
    const segment = data.features?.[0]?.properties?.segments?.[0];
    if (!segment) throw new Error('No route segment returned from ORS');

    const distanceMeters = segment.distance;
    const durationSeconds = segment.duration;

    return {
      distanceKm: parseFloat((distanceMeters / 1000).toFixed(2)),
      durationMin: Math.round(durationSeconds / 60),
      source: 'road',
    };
  } catch (error) {
    console.warn('[ORS Road Distance Fallback]:', error.message);
    const straightLineKm = getHaversineDistance(lat1, lon1, lat2, lon2);
    return {
      distanceKm: parseFloat(straightLineKm.toFixed(2)),
      durationMin: null,
      source: 'straight_line',
    };
  }
}

/**
 * Cached road distance to protect daily quota (1-day TTL, ~100m coordinate clustering)
 */
async function getRoadDistanceCached(userLat, userLon, vendorId, vLat, vLon) {
  const rLat = roundCoord(userLat);
  const rLon = roundCoord(userLon);

  try {
    const [cached] = await db.query(
      `SELECT * FROM distance_cache 
       WHERE user_lat = ? AND user_lon = ? AND vendor_id = ?
       AND created_at > NOW() - INTERVAL 1 DAY`,
      [rLat, rLon, String(vendorId)]
    );

    if (cached && cached.length > 0) {
      return {
        distanceKm: Number(cached[0].distance_km),
        durationMin: cached[0].duration_min ? Number(cached[0].duration_min) : null,
        source: cached[0].source,
      };
    }
  } catch (err) {
    // Continue to API fetch if cache table not initialized
  }

  const result = await getRoadDistance(userLat, userLon, vLat, vLon);

  try {
    await db.query(
      `INSERT INTO distance_cache 
       (user_lat, user_lon, vendor_id, distance_km, duration_min, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         distance_km = ?, duration_min = ?, source = ?, created_at = NOW()`,
      [
        rLat,
        rLon,
        String(vendorId),
        result.distanceKm,
        result.durationMin,
        result.source,
        result.distanceKm,
        result.durationMin,
        result.source,
      ]
    );
  } catch (err) {
    // Continue cleanly
  }

  return result;
}

/**
 * 4. Get Accurate Vendor Road Distance (Single Vendor)
 * GET /api/vendor/:id/distance?userLat=27.6094&userLon=75.1397
 */
app.get('/api/vendor/:id/distance', async (req, res) => {
  try {
    const { id } = req.params;
    const { userLat, userLon } = req.query;

    if (!userLat || !userLon) {
      return res.status(400).json({ error: 'userLat and userLon query params are required' });
    }

    const uLat = parseFloat(userLat);
    const uLon = parseFloat(userLon);

    let vLat = 27.6094;
    let vLon = 75.1398;

    const [vendors] = await db.query(
      `SELECT id, latitude, longitude FROM vendors WHERE id = ?`,
      [id]
    );

    if (vendors && vendors.length > 0) {
      if (vendors[0].latitude && vendors[0].longitude) {
        vLat = parseFloat(vendors[0].latitude);
        vLon = parseFloat(vendors[0].longitude);
      }
    }

    const result = await getRoadDistanceCached(uLat, uLon, id, vLat, vLon);

    res.json({
      success: true,
      vendorId: id,
      distanceKm: result.distanceKm,
      durationMin: result.durationMin,
      source: result.source, // 'road' or 'straight_line'
    });
  } catch (err) {
    console.error('Distance calculation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// BATCH MATRIX ROAD DISTANCES (ORS MATRIX API + OSRM TABLE)
// ==========================================================

async function getCachedDistance(userLat, userLon, vendorId) {
  const rLat = roundCoord(userLat);
  const rLon = roundCoord(userLon);

  try {
    const [cached] = await db.query(
      `SELECT distance_km, duration_min, source FROM distance_cache 
       WHERE user_lat = ? AND user_lon = ? AND vendor_id = ?
       AND created_at > NOW() - INTERVAL 6 HOUR`,
      [rLat, rLon, String(vendorId)]
    );

    return cached && cached.length > 0
      ? {
          distanceKm: Number(cached[0].distance_km),
          durationMin: cached[0].duration_min ? Number(cached[0].duration_min) : null,
          source: cached[0].source,
        }
      : null;
  } catch (e) {
    return null;
  }
}

async function saveCachedDistance(userLat, userLon, vendorId, result) {
  const rLat = roundCoord(userLat);
  const rLon = roundCoord(userLon);

  try {
    await db.query(
      `INSERT INTO distance_cache 
       (user_lat, user_lon, vendor_id, distance_km, duration_min, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         distance_km = ?, duration_min = ?, source = ?, created_at = NOW()`,
      [
        rLat,
        rLon,
        String(vendorId),
        result.distanceKm,
        result.durationMin,
        result.source,
        result.distanceKm,
        result.durationMin,
        result.source,
      ]
    );
  } catch (e) {}
}

/**
 * Calculates road distances from 1 user origin to multiple vendors in a SINGLE API call.
 */
async function getBatchRoadDistances(userLat, userLon, vendors) {
  if (!vendors || vendors.length === 0) return [];

  // A. Try OpenRouteService Matrix API if API key configured
  if (ORS_API_KEY && dailyORSCalls < MAX_DAILY_CALLS) {
    try {
      const locations = [
        [userLon, userLat],
        ...vendors.map((v) => [v.lon || v.longitude || 75.1398, v.lat || v.latitude || 27.6094]),
      ];
      const destinationIndices = vendors.map((_, i) => i + 1);

      const body = {
        locations: locations,
        sources: [0],
        destinations: destinationIndices,
        metrics: ['distance', 'duration'],
        units: 'km',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      dailyORSCalls++;
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
          return vendors.map((vendor, i) => ({
            vendorId: vendor.id,
            distanceKm: parseFloat(Number(data.distances[0][i] || 0).toFixed(2)),
            durationMin: data.durations?.[0]?.[i] ? Math.round(Number(data.durations[0][i]) / 60) : null,
            source: 'road',
          }));
        }
      }
    } catch (err) {
      console.warn('ORS Matrix API notice:', err.message);
    }
  }

  // B. Try OSRM Table API (High-speed batch router, zero API key required)
  try {
    const coordsStr = [
      `${userLon},${userLat}`,
      ...vendors.map((v) => `${v.lon || v.longitude || 75.1398},${v.lat || v.latitude || 27.6094}`),
    ].join(';');

    const destIndicesStr = vendors.map((_, i) => i + 1).join(';');
    const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?sources=0&destinations=${destIndicesStr}&annotations=distance,duration`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.distances && data.distances[0]) {
        return vendors.map((vendor, i) => {
          const meters = data.distances[0][i];
          const seconds = data.durations?.[0]?.[i];
          const km = typeof meters === 'number' ? meters / 1000 : getHaversineDistance(userLat, userLon, vendor.lat || vendor.latitude || 27.6094, vendor.lon || vendor.longitude || 75.1398);
          return {
            vendorId: vendor.id,
            distanceKm: parseFloat(Number(km).toFixed(2)),
            durationMin: typeof seconds === 'number' ? Math.max(1, Math.round(seconds / 60)) : null,
            source: 'road',
          };
        });
      }
    }
  } catch (err) {
    console.warn('OSRM Table API notice:', err.message);
  }

  // C. Fallback: Haversine for all vendors
  return vendors.map((vendor) => {
    const vLat = vendor.lat || vendor.latitude || 27.6094;
    const vLon = vendor.lon || vendor.longitude || 75.1398;
    return {
      vendorId: vendor.id,
      distanceKm: parseFloat(getHaversineDistance(userLat, userLon, vLat, vLon).toFixed(2)),
      durationMin: null,
      source: 'straight_line',
    };
  });
}

/**
 * Splits large vendor lists into safe chunks of 50 locations
 */
async function getBatchRoadDistancesSafe(userLat, userLon, vendors) {
  const BATCH_SIZE = 50;
  let allResults = [];

  for (let i = 0; i < vendors.length; i += BATCH_SIZE) {
    const batch = vendors.slice(i, i + BATCH_SIZE);
    const results = await getBatchRoadDistances(userLat, userLon, batch);
    allResults = allResults.concat(results);
  }

  return allResults;
}

/**
 * 5. GET /api/vendors/nearby?userLat=27.6094&userLon=75.1397&radiusKm=10
 * Returns vendors within radiusKm with accurate road distances calculated via Matrix API.
 */
app.get('/api/vendors/nearby', async (req, res) => {
  try {
    const { userLat, userLon, radiusKm = 10 } = req.query;

    if (!userLat || !userLon) {
      return res.status(400).json({ error: 'userLat and userLon query params are required' });
    }

    const uLat = parseFloat(userLat);
    const uLon = parseFloat(userLon);
    const maxRadius = parseFloat(radiusKm);

    // Step 1: Get all vendors from DB
    const [allVendors] = await db.query(`SELECT * FROM vendors`);

    // Step 2: Quick Haversine pre-filter (buffer: 1.5x of radius)
    const roughlyNearby = (allVendors || []).filter((v) => {
      const vLat = v.lat || v.latitude || 27.6094;
      const vLon = v.lon || v.longitude || 75.1398;
      const roughKm = getHaversineDistance(uLat, uLon, vLat, vLon);
      return roughKm <= maxRadius * 1.5;
    });

    if (roughlyNearby.length === 0) {
      return res.json({ vendors: [] });
    }

    // Step 3: Check 6-hour cache first
    const uncachedVendors = [];
    const cachedResults = [];

    for (const vendor of roughlyNearby) {
      const cached = await getCachedDistance(uLat, uLon, vendor.id);
      if (cached) {
        cachedResults.push({ ...vendor, ...cached });
      } else {
        uncachedVendors.push(vendor);
      }
    }

    // Step 4: Batch-fetch road distance for only uncached vendors
    let freshResults = [];
    if (uncachedVendors.length > 0) {
      const batchCalcs = await getBatchRoadDistancesSafe(uLat, uLon, uncachedVendors);

      // Save fresh results to cache
      for (const result of batchCalcs) {
        await saveCachedDistance(uLat, uLon, result.vendorId, result);
      }

      // Merge distance data back into vendor objects
      freshResults = batchCalcs.map((r) => {
        const vendor = uncachedVendors.find((v) => v.id === r.vendorId);
        return { ...vendor, ...r };
      });
    }

    // Step 5: Combine, filter by actual radius, sort by distance
    const combined = [...cachedResults, ...freshResults]
      .filter((v) => v.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      count: combined.length,
      vendors: combined,
    });
  } catch (err) {
    console.error('Nearby vendors matrix calculation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CRON JOBS (AUTO-EXPIRY, EXPIRY WARNINGS & ORS COUNTER RESET)
// ==========================================

// Reset ORS daily quota counter at midnight
cron.schedule('0 0 * * *', () => {
  dailyORSCalls = 0;
  console.log('[ORS Quota] Reset daily call counter.');
});

// 1. Auto-Expire Cron Job - Runs every day at midnight (12:00 AM)
cron.schedule('0 0 * * *', async () => {
  try {
    const [result] = await db.query(
      `UPDATE vendor_plans 
       SET status = 'expired'
       WHERE end_date < CURDATE() 
       AND status = 'active'`
    );
    console.log(`[Auto-Expire Cron] Expired ${result.affectedRows || 0} plans.`);
  } catch (err) {
    console.warn('[Auto-Expire Cron Warn]:', err.message);
  }
});

// 2. Expiry Warning Cron Job - Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  try {
    const [vendors] = await db.query(
      `SELECT v.email, v.name, vp.end_date,
              DATEDIFF(vp.end_date, CURDATE()) AS days_left
       FROM vendor_plans vp
       JOIN vendors v ON v.id = vp.vendor_id
       WHERE vp.status = 'active'
       AND DATEDIFF(vp.end_date, CURDATE()) = 7`
    );

    if (vendors && vendors.length > 0) {
      vendors.forEach(vendor => {
        sendExpiryWarning(vendor.email, vendor.name, vendor.days_left);
      });
    }
  } catch (err) {
    console.warn('[Expiry Warning Cron Warn]:', err.message);
  }
});

// Start listening if not in test/import mode
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`NearBe Vendor Plan Tracking Server running on http://localhost:${PORT}`);
  });
}

module.exports = { app, PLANS, generateReferralCode, addDays, formatDate, awardFreeMonth };

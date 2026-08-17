const mysql = require('mysql2/promise');
require('dotenv').config();

// In-memory fallback mock engine if MySQL server is not connected locally
class MemoryDb {
  constructor() {
    this.vendors = [];
    this.vendor_plans = [];
    this.referrals = [];
    this.nextVendorId = 1;
    this.nextPlanId = 1;
    this.nextReferralId = 1;
  }

  async query(sql, params = []) {
    const s = sql.trim().toUpperCase();

    // 1. INSERT INTO vendors
    if (s.startsWith('INSERT INTO VENDORS')) {
      const [name, email, phone, referral_code, referred_by] = params;
      const vendor = {
        id: this.nextVendorId++,
        name,
        email,
        phone,
        referral_code,
        referred_by: referred_by || null,
        referral_count: 0,
        latitude: 27.6094 + (this.nextVendorId * 0.003),
        longitude: 75.1398 + (this.nextVendorId * 0.003),
        lat: 27.6094 + (this.nextVendorId * 0.003),
        lon: 75.1398 + (this.nextVendorId * 0.003),
        created_at: new Date()
      };
      this.vendors.push(vendor);
      return [{ insertId: vendor.id, affectedRows: 1 }];
    }

    // 2. SELECT * FROM vendors
    if (s.startsWith('SELECT * FROM VENDORS') && !s.includes('WHERE')) {
      return [this.vendors];
    }

    // 3. SELECT * FROM vendors WHERE referral_code = ?
    if (s.includes('FROM VENDORS WHERE REFERRAL_CODE = ?')) {
      const code = params[0];
      const match = this.vendors.filter(v => v.referral_code === code);
      return [match];
    }

    // 4. SELECT referral_code, referral_count FROM vendors WHERE id = ?
    if (s.includes('FROM VENDORS WHERE ID = ?')) {
      const id = Number(params[0]);
      const match = this.vendors.filter(v => v.id === id);
      return [match];
    }

    // 4. UPDATE vendors SET referral_count = referral_count + 1 WHERE id = ?
    if (s.includes('UPDATE VENDORS SET REFERRAL_COUNT = REFERRAL_COUNT + 1')) {
      const id = Number(params[0]);
      const v = this.vendors.find(item => item.id === id);
      if (v) v.referral_count += 1;
      return [{ affectedRows: v ? 1 : 0 }];
    }

    // 5. INSERT INTO referrals
    if (s.startsWith('INSERT INTO REFERRALS')) {
      const [referrer_id, referred_id, referral_code] = params;
      const ref = {
        id: this.nextReferralId++,
        referrer_id: Number(referrer_id),
        referred_id: Number(referred_id),
        referral_code,
        bonus_awarded: false,
        created_at: new Date()
      };
      this.referrals.push(ref);
      return [{ insertId: ref.id, affectedRows: 1 }];
    }

    // 6. UPDATE referrals SET bonus_awarded = TRUE WHERE referrer_id = ?
    if (s.includes('UPDATE REFERRALS SET BONUS_AWARDED = TRUE')) {
      const referrerId = Number(params[0]);
      const last = this.referrals.filter(r => r.referrer_id === referrerId).pop();
      if (last) last.bonus_awarded = true;
      return [{ affectedRows: last ? 1 : 0 }];
    }

    // 7. SELECT * FROM vendor_plans WHERE vendor_id = ? AND status = 'active'
    if (s.includes('FROM VENDOR_PLANS') && s.includes("STATUS = 'ACTIVE'")) {
      const vendorId = Number(params[0]);
      const today = new Date().toISOString().split('T')[0];
      const activePlans = this.vendor_plans
        .filter(p => p.vendor_id === vendorId && p.status === 'active' && p.end_date >= today)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
      return [activePlans];
    }

    // 8. INSERT INTO vendor_plans
    if (s.startsWith('INSERT INTO VENDOR_PLANS')) {
      const [vendor_id, plan_type, start_date, end_date, duration_days, price_paid] = params;
      const plan = {
        id: this.nextPlanId++,
        vendor_id: Number(vendor_id),
        plan_type,
        start_date,
        end_date,
        duration_days: Number(duration_days),
        price_paid: Number(price_paid || 0),
        status: 'active',
        created_at: new Date()
      };
      this.vendor_plans.push(plan);
      return [{ insertId: plan.id, affectedRows: 1 }];
    }

    // 9. UPDATE vendor_plans SET status = 'expired'
    if (s.includes("UPDATE VENDOR_PLANS SET STATUS = 'EXPIRED'")) {
      const today = new Date().toISOString().split('T')[0];
      let affected = 0;
      this.vendor_plans.forEach(p => {
        if (p.status === 'active' && p.end_date < today) {
          p.status = 'expired';
          affected++;
        }
      });
      return [{ affectedRows: affected }];
    }

    // 10. SELECT * FROM distance_cache
    if (s.includes('FROM DISTANCE_CACHE')) {
      const [rLat, rLon, vendorId] = params;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const match = (this.distance_cache || []).filter(c => 
        Number(c.user_lat) === Number(rLat) && 
        Number(c.user_lon) === Number(rLon) && 
        String(c.vendor_id) === String(vendorId) &&
        new Date(c.created_at).getTime() > oneDayAgo
      );
      return [match];
    }

    // 11. INSERT / UPSERT distance_cache
    if (s.startsWith('INSERT INTO DISTANCE_CACHE')) {
      if (!this.distance_cache) this.distance_cache = [];
      const [user_lat, user_lon, vendor_id, distance_km, duration_min, source] = params;
      const existingIdx = this.distance_cache.findIndex(c => 
        Number(c.user_lat) === Number(user_lat) && 
        Number(c.user_lon) === Number(user_lon) && 
        String(c.vendor_id) === String(vendor_id)
      );
      const record = {
        id: this.nextPlanId++,
        user_lat: Number(user_lat),
        user_lon: Number(user_lon),
        vendor_id: String(vendor_id),
        distance_km: Number(distance_km),
        duration_min: duration_min ? Number(duration_min) : null,
        source,
        created_at: new Date()
      };
      if (existingIdx >= 0) {
        this.distance_cache[existingIdx] = record;
      } else {
        this.distance_cache.push(record);
      }
      return [{ affectedRows: 1 }];
    }

    return [[]];
  }
}

let pool;
const useMemoryFallback = process.env.USE_MEMORY_DB === 'true' || !process.env.DB_HOST;

if (!useMemoryFallback) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nearbe_db',
      port: Number(process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  } catch (err) {
    console.warn('MySQL pool initialization fallback to MemoryDb:', err.message);
    pool = new MemoryDb();
  }
} else {
  pool = new MemoryDb();
}

module.exports = pool;

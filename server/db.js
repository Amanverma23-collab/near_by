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
        created_at: new Date()
      };
      this.vendors.push(vendor);
      return [{ insertId: vendor.id, affectedRows: 1 }];
    }

    // 2. SELECT * FROM vendors WHERE referral_code = ?
    if (s.includes('FROM VENDORS WHERE REFERRAL_CODE = ?')) {
      const code = params[0];
      const match = this.vendors.filter(v => v.referral_code === code);
      return [match];
    }

    // 3. SELECT referral_code, referral_count FROM vendors WHERE id = ?
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

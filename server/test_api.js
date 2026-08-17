const { app, generateReferralCode, addDays, formatDate, awardFreeMonth } = require('./server');
const http = require('http');

// Simple test runner for Node.js Express server
async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING NEARBE VENDOR PLAN TRACKING API TEST SUITE');
  console.log('====================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  async function api(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method,
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  try {
    // 1. Test Referral Code Generator
    console.log('1. Testing generateReferralCode()...');
    const code = generateReferralCode();
    console.log(`   Generated: ${code} (Length: ${code.length}, Starts with NB: ${code.startsWith('NB')})`);
    if (!code.startsWith('NB') || code.length !== 8) throw new Error('Invalid code format');
    console.log('   ✅ Passed!\n');

    // 2. Test Vendor 1 Signup
    console.log('2. Testing POST /api/vendor/signup (Main Vendor)...');
    const res1 = await api('/api/vendor/signup', 'POST', {
      name: 'Aman Sharma',
      email: 'aman@nearbe.in',
      phone: '9876543210'
    });
    console.log('   Response:', res1.body);
    const mainVendorId = res1.body.vendorId;
    const mainVendorCode = res1.body.referral_code;
    if (!res1.body.success || !mainVendorCode) throw new Error('Vendor 1 signup failed');
    console.log('   ✅ Passed!\n');

    // 3. Test Purchase Monthly Plan
    console.log('3. Testing POST /api/vendor/purchase-plan (MONTHLY 30 Days)...');
    const resPlan = await api('/api/vendor/purchase-plan', 'POST', {
      vendor_id: mainVendorId,
      plan_type: 'MONTHLY'
    });
    console.log('   Response:', resPlan.body);
    if (!resPlan.body.success || resPlan.body.duration_days !== 30) throw new Error('Plan purchase failed');
    console.log('   ✅ Passed!\n');

    // 4. Test 5 Referral Signups
    console.log('4. Testing 5 Merchant Signups using referral code:', mainVendorCode);
    for (let i = 1; i <= 5; i++) {
      const refRes = await api('/api/vendor/signup', 'POST', {
        name: `Referred Merchant ${i}`,
        email: `merchant${i}@nearbe.in`,
        phone: `980000000${i}`,
        referred_by: mainVendorCode
      });
      console.log(`   Merchant ${i} signed up -> Bonus awarded to referrer: ${refRes.body.freeMonthAwardedToReferrer}`);
      if (i === 5 && !refRes.body.freeMonthAwardedToReferrer) {
        throw new Error('5th referral did not award free month bonus!');
      }
    }
    console.log('   ✅ 5 Referrals Completed & 1 Month Free Automatically Awarded!\n');

    // 5. Test Get Plan Status
    console.log('5. Testing GET /api/vendor/plan-status/:vendor_id...');
    const resStatus = await api(`/api/vendor/plan-status/${mainVendorId}`);
    console.log('   Plan Status Response:', resStatus.body);
    if (!resStatus.body.hasPlan || resStatus.body.referral_count !== 5) {
      throw new Error('Plan status count mismatch');
    }
    console.log(`   Days Left: ${resStatus.body.days_left} (Original 30 days + 30 days referral free month = ~60 days)`);
    console.log('   ✅ Passed!\n');

    // 6. Test Get Accurate Road Distance
    console.log('6. Testing GET /api/vendor/:id/distance (Road Distance + Haversine Fallback)...');
    const resDist = await api(`/api/vendor/${mainVendorId}/distance?userLat=27.6094&userLon=75.1397`);
    console.log('   Distance Response:', resDist.body);
    if (!resDist.body.success || typeof resDist.body.distanceKm !== 'number') {
      throw new Error('Distance calculation endpoint failed');
    }
    console.log(`   Distance: ${resDist.body.distanceKm} km (Source: ${resDist.body.source})`);
    console.log('   ✅ Passed!\n');

    console.log('====================================================');
    console.log('🎉 ALL BACKEND API, REFERRAL & DISTANCE TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
  }
}

runTests();

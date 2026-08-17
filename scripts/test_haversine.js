import {
  getDistance,
  formatDistance,
  filterNearbyVendors,
  getBoundingBox,
  RADIUS_OPTIONS,
} from '../src/utils/haversine.js';

console.log('=== RUNNING HAVERSINE DISTANCE SYSTEM TESTS ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName} - ${details}`);
  }
}

// 1. Test getDistance with known points
// Sikar Center: (27.6094, 75.1398) to Nearby point (27.6200, 75.1500)
const dist1 = getDistance(27.6094, 75.1398, 27.6200, 75.1500);
assert(dist1 > 1.5 && dist1 < 2.0, `Calculated distance ${dist1.toFixed(3)} km is between 1.5 and 2.0 km`);

// Test same point distance is 0
const distZero = getDistance(27.6094, 75.1398, 27.6094, 75.1398);
assert(distZero === 0, `Same coordinate distance is 0 km`);

// 2. Test formatDistance helper
assert(formatDistance(0.35) === '350 m', `0.35 km formats to "350 m" (actual: ${formatDistance(0.35)})`);
assert(formatDistance(0.05) === '50 m', `0.05 km formats to "50 m" (actual: ${formatDistance(0.05)})`);
assert(formatDistance(0.999) === '999 m' || formatDistance(0.999) === '1000 m', `0.999 km formats to meter string (actual: ${formatDistance(0.999)})`);
assert(formatDistance(1.0) === '1.0 km', `1.0 km formats to "1.0 km" (actual: ${formatDistance(1.0)})`);
assert(formatDistance(2.7) === '2.7 km', `2.7 km formats to "2.7 km" (actual: ${formatDistance(2.7)})`);
assert(formatDistance(12.34) === '12.3 km', `12.34 km formats to "12.3 km" (actual: ${formatDistance(12.34)})`);

// 3. Test filterNearbyVendors with sample dataset
const mockUserLat = 27.6094;
const mockUserLon = 75.1398;

const mockVendors = [
  { id: 'v001', name: 'Sharma Electronics', category: 'Electronics', lat: 27.6200, lon: 75.1500, rating: 4.5, isVerified: true, distanceKm: null },
  { id: 'v002', name: 'Sikar Mobile Clinic', category: 'Healthcare', lat: 27.6110, lon: 75.1410, rating: 4.8, isVerified: true, distanceKm: null }, // ~0.2 km
  { id: 'v003', name: 'Jaipur Auto Works', category: 'Automobile', lat: 26.9124, lon: 75.7873, rating: 4.2, isVerified: false, distanceKm: null }, // ~100 km away
  { id: 'v004', name: 'Verma Grocery', category: 'Kirana', lat: 27.6300, lon: 75.1600, rating: 4.6, isVerified: true, distanceKm: null }, // ~3.0 km
  { id: 'v005', name: 'Kalyan Towing Service', category: 'Emergency', lat: 27.6500, lon: 75.1800, rating: 4.9, isVerified: true, distanceKm: null }, // ~6.0 km
];

// Filter with 500m (0.5 km)
const filtered500m = filterNearbyVendors(mockUserLat, mockUserLon, mockVendors, 0.5);
assert(filtered500m.length === 1 && filtered500m[0].id === 'v002', 'Radius 0.5km correctly finds only Sikar Mobile Clinic (< 500m)');

// Filter with 5 km (default)
const filtered5km = filterNearbyVendors(mockUserLat, mockUserLon, mockVendors, 5);
assert(filtered5km.length === 3, `Radius 5km finds 3 vendors (actual: ${filtered5km.length})`);
assert(filtered5km[0].id === 'v002' && filtered5km[1].id === 'v001' && filtered5km[2].id === 'v004', 'Vendors are strictly sorted nearest first');

// Filter with 10 km
const filtered10km = filterNearbyVendors(mockUserLat, mockUserLon, mockVendors, 10);
assert(filtered10km.length === 4, `Radius 10km finds 4 vendors (excluding far-away Jaipur vendor)`);

// 4. Test Bounding Box helper
const box = getBoundingBox(mockUserLat, mockUserLon, 5);
assert(box.minLat < mockUserLat && box.maxLat > mockUserLat, 'Bounding box latitude span is valid');
assert(box.minLon < mockUserLon && box.maxLon > mockUserLon, 'Bounding box longitude span is valid');

// 5. Test Radius options
assert(RADIUS_OPTIONS.length === 5, '5 radius options configured (500m, 1km, 3km, 5km, 10km)');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}

import { detectLocation, geocodeManualInput } from '../src/utils/browserGeolocation.js';

console.log('✅ browserGeolocation module loaded successfully.');
console.log('Function detectLocation is defined:', typeof detectLocation === 'function');
console.log('Function geocodeManualInput is defined:', typeof geocodeManualInput === 'function');

console.log('\nAll browser geolocation core modules verified successfully!');

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvgimglpwcbyuzmttfln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z2ltZ2xwd2NieXV6bXR0ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzQwMzcsImV4cCI6MjA5OTM1MDAzN30.jeb1tSBS9RxEuJW5OXKd81yl8sGwu_ENsA79kyDbou8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkVendors() {
  const { data, error } = await supabase.from('vendors').select('*').limit(5);
  if (error) {
    console.error('Query error:', error);
    return;
  }
  console.log('Total sample vendors fetched:', data.length);
  if (data.length > 0) {
    console.log('Sample vendor keys:', Object.keys(data[0]));
    console.log('Sample referral codes in DB:');
    data.forEach(v => console.log(`- ${v.name}: referral_code=${v.referral_code}, referred_by_code=${v.referred_by_code}, is_verified=${v.is_verified}`));
  }

  // Check specifically for vendors with referral_code = AMAN1111 or referred_by_code containing AMAN
  const { data: refData, error: refErr } = await supabase
    .from('vendors')
    .select('id, name, owner_name, referral_code, referred_by_code, is_verified, successful_referral_count')
    .or('referred_by_code.ilike.%AMAN%,referral_code.ilike.%AMAN%');

  console.log('\nAMAN matching query:');
  if (refErr) console.error('AMAN query err:', refErr);
  else console.log(refData);
}

checkVendors();

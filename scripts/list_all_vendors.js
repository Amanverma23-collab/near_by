import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvgimglpwcbyuzmttfln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z2ltZ2xwd2NieXV6bXR0ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzQwMzcsImV4cCI6MjA5OTM1MDAzN30.jeb1tSBS9RxEuJW5OXKd81yl8sGwu_ENsA79kyDbou8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAll() {
  const { data, error } = await supabase.from('vendors').select('id, name, owner_name, referral_code, referred_by_code, is_verified, created_at');
  if (error) console.error(error);
  else {
    console.log(`Total vendors in DB: ${data.length}`);
    data.forEach((v, i) => console.log(`${i+1}. [${v.name}] owner: ${v.owner_name} | ref_code: ${v.referral_code} | referred_by: ${v.referred_by_code} | verified: ${v.is_verified}`));
  }
}

listAll();

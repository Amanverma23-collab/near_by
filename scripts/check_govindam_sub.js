import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvgimglpwcbyuzmttfln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z2ltZ2xwd2NieXV6bXR0ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzQwMzcsImV4cCI6MjA5OTM1MDAzN30.jeb1tSBS9RxEuJW5OXKd81yl8sGwu_ENsA79kyDbou8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkGovindam() {
  const { data } = await supabase.from('vendors').select('id, name, subscription_status, subscription_expires_at, referral_code').eq('id', 'c361784b-8253-4f21-b344-08cd79e7c9ce').single();
  console.log('Govindam vendor:', data);
}

checkGovindam();

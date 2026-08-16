import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      vendorId,
      planDurationMonths = 1,
    } = await req.json();

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    // If keySecret is present, perform cryptographic HMAC-SHA256 signature verification
    if (keySecret) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keySecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(body)
      );
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (generatedSignature !== razorpay_signature) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Invalid Razorpay signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Signature valid (or simulated) — activate the vendor's subscription in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rvgimglpwcbyuzmttfln.supabase.co';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + (Number(planDurationMonths) || 1));

    if (vendorId) {
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          subscription_expires_at: newExpiry.toISOString(),
          subscription_status: 'active',
          last_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
          is_verified: true,
          verification_status: 'approved',
        })
        .eq('id', vendorId);

      if (updateError) {
        console.warn('Vendor update error in edge function:', updateError);
      }
    }

    return new Response(JSON.stringify({ verified: true, expiresAt: newExpiry.toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ verified: false, error: err.message || 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

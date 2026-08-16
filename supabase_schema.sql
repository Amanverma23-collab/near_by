-- NearBe Database Schema for Supabase
-- Place this SQL in the Supabase SQL Editor to initialize your database tables.

-- ==========================================
-- 1. CUSTOMERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    city TEXT DEFAULT 'Bangalore',
    avatar_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Customers
CREATE POLICY "Allow public read access to customer profiles"
    ON public.customers FOR SELECT
    USING (true);

CREATE POLICY "Allow users to insert their own customer profile"
    ON public.customers FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Allow users to update their own customer profile"
    ON public.customers FOR UPDATE
    USING (auth.uid() = auth_user_id);


-- ==========================================
-- 2. VENDORS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    category TEXT NOT NULL,          -- e.g. 'vehicle-emergency', 'home-maintenance', 'education-student'
    sub_service TEXT NOT NULL,       -- e.g. 'Mechanic', 'Electrician', 'Library'
    distance_km DOUBLE PRECISION DEFAULT 0.0,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Bangalore',
    is_open_now BOOLEAN DEFAULT true,
    opening_hours TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    rating NUMERIC(2,1) DEFAULT 5.0,
    is_verified BOOLEAN DEFAULT false,
    shop_images TEXT[] DEFAULT '{}',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    services_offered JSONB DEFAULT '[]', -- JSON array of {name, price}
    reviews JSONB DEFAULT '[]',          -- JSON array of {id, reviewerName, rating, comment, daysAgo}
    review_count INTEGER DEFAULT 0,
    verification_requested_at TIMESTAMP WITH TIME ZONE,
    verification_status TEXT DEFAULT NULL CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    subscription_status TEXT DEFAULT NULL,
    subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    referral_code TEXT UNIQUE,
    referred_by_code TEXT,
    referral_counted BOOLEAN DEFAULT false,
    successful_referral_count INTEGER DEFAULT 0,
    last_referral_reward_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- In-App Customer <-> Vendor Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    text TEXT,
    photo_url TEXT,
    location JSONB,
    audio_url TEXT,
    audio_duration_sec INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read BOOLEAN DEFAULT false,
    vendor_name TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    vendor_sub_service TEXT,
    vendor_shop_photo TEXT
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to chat_messages"
ON public.chat_messages FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Supabase Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Enable RLS for vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Vendors
CREATE POLICY "Allow public read access to all vendors"
    ON public.vendors FOR SELECT
    USING (true);

CREATE POLICY "Allow vendors to manage their own business details"
    ON public.vendors FOR ALL
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow update access to vendors for approval"
    ON public.vendors FOR UPDATE
    USING (true)
    WITH CHECK (true);


-- ==========================================
-- 3. SEED DUMMY DATA FOR TESTING
-- ==========================================

-- Insert a few sample vendors to test the listing immediately:
INSERT INTO public.vendors (
    name, owner_name, category, sub_service, distance_km, address, city, 
    opening_hours, phone_number, whatsapp_number, rating, is_verified, 
    shop_images, latitude, longitude, services_offered, reviews, review_count
) VALUES 
(
    'Sharma Auto Repair & Mechanic', 
    'Rajesh Sharma', 
    'vehicle-emergency', 
    'Mechanic', 
    0.8, 
    'Gali No. 3, Jat Colony, Sector 15', 
    'Bangalore',
    '9:00 AM - 8:00 PM', 
    '9876543210', 
    '9876543210', 
    4.6, 
    true, 
    ARRAY['https://picsum.photos/seed/ve2a/600/400', 'https://picsum.photos/seed/ve2b/600/400'], 
    28.6292, 
    77.2172,
    '[{"name": "Engine Repair", "price": "₹500 onwards"}, {"name": "Oil Change", "price": "₹350"}]'::jsonb,
    '[{"id": "r1", "reviewerName": "Suresh P.", "rating": 5, "comment": "Best mechanic in the area.", "daysAgo": 1}]'::jsonb,
    87
),
(
    'Gupta Electricals & Repairs', 
    'Rajesh Gupta', 
    'home-maintenance', 
    'Electrician', 
    0.6, 
    'Shop 14, Central Market, Sector 4', 
    'Bangalore',
    '9:00 AM - 8:00 PM', 
    '9811122233', 
    '9811122233', 
    4.7, 
    true, 
    ARRAY['https://picsum.photos/seed/hm1a/600/400'], 
    28.6340, 
    77.2190,
    '[{"name": "Wiring Repair", "price": "₹200 onwards"}, {"name": "Ceiling Fan Installation", "price": "₹350"}]'::jsonb,
    '[{"id": "r1", "reviewerName": "Sunita D.", "rating": 5, "comment": "Very professional.", "daysAgo": 1}]'::jsonb,
    93
),
(
    'Sharma Coaching Academy', 
    'Prof. R.K. Sharma', 
    'education-student', 
    'Coaching / Academy', 
    0.5, 
    '2nd Floor, Agarwal Complex, Sector 8', 
    'Bangalore',
    '7:00 AM - 9:00 PM', 
    '9911001100', 
    '9911001100', 
    4.7, 
    true, 
    ARRAY['https://picsum.photos/seed/es1a/600/400'], 
    28.6370, 
    77.2120,
    '[{"name": "NDA Foundation Batch", "price": "₹3000 / month"}, {"name": "Doubt Session", "price": "₹200 / session"}]'::jsonb,
    '[{"id": "r1", "reviewerName": "Aman S.", "rating": 5, "comment": "Sharma sir explains concepts clearly.", "daysAgo": 2}]'::jsonb,
    134
);

-- Storage Configuration for Verification Photos
drop policy if exists "Vendors can upload their own verification photos" on storage.objects;
drop policy if exists "Vendors can view their own verification photos" on storage.objects;

insert into storage.buckets (id, name, public)
values ('vendor-verification-photos', 'vendor-verification-photos', false)
on conflict (id) do nothing;

create policy "Vendors can upload their own verification photos"
on storage.objects for insert
with check (
  bucket_id = 'vendor-verification-photos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Vendors can view their own verification photos"
on storage.objects for select
using (
  bucket_id = 'vendor-verification-photos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- 4. SUBSCRIPTION PLANS & REFERRAL CODES SCHEMA
-- ==========================================

-- Alter vendors table to ensure subscription columns exist
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    display_price TEXT NOT NULL,
    duration TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    features JSONB DEFAULT '[]',
    is_popular BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to subscription_plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Allow all to modify subscription_plans" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);

-- Table: referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    plan_id TEXT DEFAULT 'all',
    plan_name TEXT,
    discount_percent INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER DEFAULT 100,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to referral_codes" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Allow all to modify referral_codes" ON public.referral_codes FOR ALL USING (true) WITH CHECK (true);


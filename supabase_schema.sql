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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Vendors
CREATE POLICY "Allow public read access to all vendors"
    ON public.vendors FOR SELECT
    USING (true);

CREATE POLICY "Allow vendors to manage their own business details"
    ON public.vendors FOR ALL
    USING (auth.uid() = auth_user_id);


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

-- ==========================================================
-- NearBe Vendor Plan & Referral Tracking Database Schema (MySQL)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS nearbe_db;
USE nearbe_db;

-- 1. Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(100) UNIQUE NOT NULL,
  phone           VARCHAR(15),
  referral_code   VARCHAR(10) UNIQUE NOT NULL,  -- auto-generated at signup (e.g., NB8X2K9P)
  referred_by     VARCHAR(10) DEFAULT NULL,      -- referral code used at signup
  referral_count  INT DEFAULT 0,                 -- lifetime count of merchants referred
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_referral_code (referral_code),
  INDEX idx_referred_by (referred_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Plans table
CREATE TABLE IF NOT EXISTS vendor_plans (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id       INT NOT NULL,
  plan_type       ENUM('MONTHLY', 'HALF_YEARLY', 'YEARLY', 'REFERRAL_FREE') NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  duration_days   INT NOT NULL,
  price_paid      DECIMAL(10,2) DEFAULT 0.00,
  status          ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendor_status (vendor_id, status),
  INDEX idx_end_date (end_date),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id     INT NOT NULL,                  -- vendor who referred
  referred_id     INT NOT NULL,                  -- new vendor who joined
  referral_code   VARCHAR(10) NOT NULL,          -- referral code used
  bonus_awarded   BOOLEAN DEFAULT FALSE,         -- free month awarded flag
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_referrer (referrer_id),
  INDEX idx_referred (referred_id),
  FOREIGN KEY (referrer_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Distance cache table (OpenRouteService Road Distances)
CREATE TABLE IF NOT EXISTS distance_cache (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_lat      DECIMAL(10,7) NOT NULL,
  user_lon      DECIMAL(10,7) NOT NULL,
  vendor_id     VARCHAR(64) NOT NULL,
  distance_km   DECIMAL(6,2) NOT NULL,
  duration_min  INT DEFAULT NULL,
  source        VARCHAR(20) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_lookup (user_lat, user_lon, vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


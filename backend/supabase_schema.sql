-- ============================================================
-- Street Info Hub — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 2. Core damage_reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS damage_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Location (both raw floats for easy querying + PostGIS column)
    location        GEOGRAPHY(POINT, 4326),
    latitude        FLOAT NOT NULL,
    longitude       FLOAT NOT NULL,
    address_text    TEXT,
    state           TEXT,
    city            TEXT,

    -- Image
    image_url       TEXT NOT NULL,
    image_path      TEXT NOT NULL,

    -- AI results
    damage_types    TEXT[] NOT NULL DEFAULT '{}',
    severity        TEXT NOT NULL DEFAULT 'minor'
                    CHECK (severity IN ('minor', 'moderate', 'severe')),
    ai_confidence   FLOAT NOT NULL DEFAULT 0,
    bbox_data       JSONB,

    -- User-provided
    description     TEXT,
    reported_by_ip  TEXT,   -- hashed

    -- Lifecycle
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'verified', 'resolved', 'rejected')),
    resolved_at     TIMESTAMPTZ,
    admin_notes     TEXT
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_damage_location  ON damage_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_damage_state     ON damage_reports (state);
CREATE INDEX IF NOT EXISTS idx_damage_severity  ON damage_reports (severity);
CREATE INDEX IF NOT EXISTS idx_damage_status    ON damage_reports (status);
CREATE INDEX IF NOT EXISTS idx_damage_created   ON damage_reports (created_at DESC);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_damage_updated_at
  BEFORE UPDATE ON damage_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-populate location geography from lat/lng ─────────────
CREATE OR REPLACE FUNCTION set_location_from_coords()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON damage_reports
  FOR EACH ROW EXECUTE FUNCTION set_location_from_coords();

-- ============================================================
-- 3. RPC functions (callable via Supabase client)
-- ============================================================

-- Reports within N metres of a route line (WKT)
CREATE OR REPLACE FUNCTION reports_near_route(route_wkt TEXT, buffer_m FLOAT DEFAULT 500)
RETURNS TABLE (
  id UUID, latitude FLOAT, longitude FLOAT,
  damage_types TEXT[], severity TEXT, ai_confidence FLOAT, created_at TIMESTAMPTZ
) LANGUAGE SQL AS $$
  SELECT id, latitude, longitude, damage_types, severity, ai_confidence, created_at
  FROM damage_reports
  WHERE
    status = 'verified'
    AND ST_DWithin(
      location,
      ST_GeographyFromText(route_wkt),
      buffer_m
    );
$$;

-- Stats grouped by state
CREATE OR REPLACE FUNCTION stats_by_state()
RETURNS TABLE (state TEXT, count BIGINT) LANGUAGE SQL AS $$
  SELECT
    COALESCE(state, 'Unknown') AS state,
    COUNT(*) AS count
  FROM damage_reports
  WHERE status IN ('verified', 'resolved')
  GROUP BY state
  ORDER BY count DESC
  LIMIT 30;
$$;

-- Stats grouped by damage type (unnests the array column)
CREATE OR REPLACE FUNCTION stats_by_damage_type()
RETURNS TABLE (damage_type TEXT, count BIGINT) LANGUAGE SQL AS $$
  SELECT
    unnested AS damage_type,
    COUNT(*) AS count
  FROM damage_reports, unnest(damage_types) AS unnested
  WHERE status IN ('verified', 'resolved')
  GROUP BY unnested
  ORDER BY count DESC;
$$;

-- ============================================================
-- 4. Row Level Security (RLS)
-- ============================================================
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Public can read verified/resolved reports
CREATE POLICY "Public read verified reports"
  ON damage_reports FOR SELECT
  USING (status IN ('verified', 'resolved'));

-- Service role (backend) can do everything
CREATE POLICY "Service role full access"
  ON damage_reports
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. Storage bucket setup
-- Run separately in Supabase Dashboard → Storage → New Bucket
-- ============================================================
-- Bucket name: road-images
-- Public: YES (so image URLs are publicly accessible)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Storage policy (allow public read):
-- CREATE POLICY "Public read road images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'road-images');
--
-- CREATE POLICY "Service role upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'road-images' AND auth.role() = 'service_role');

-- ============================================================
-- 6. Seed data (optional — for testing the map)
-- ============================================================
INSERT INTO damage_reports
  (latitude, longitude, address_text, state, city, image_url, image_path, damage_types, severity, ai_confidence, status)
VALUES
  (18.5204, 73.8567, 'Swargate, Pune, Maharashtra', 'Maharashtra', 'Pune',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/1.jpg',
   ARRAY['pothole'], 'severe', 0.91, 'verified'),
  (19.0760, 72.8777, 'Dadar, Mumbai, Maharashtra', 'Maharashtra', 'Mumbai',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/2.jpg',
   ARRAY['alligator_crack'], 'moderate', 0.78, 'verified'),
  (28.6139, 77.2090, 'Connaught Place, New Delhi', 'Delhi', 'New Delhi',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/3.jpg',
   ARRAY['longitudinal_crack', 'pothole'], 'severe', 0.85, 'verified'),
  (13.0827, 80.2707, 'T Nagar, Chennai, Tamil Nadu', 'Tamil Nadu', 'Chennai',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/4.jpg',
   ARRAY['transverse_crack'], 'minor', 0.65, 'verified'),
  (22.5726, 88.3639, 'Park Street, Kolkata, West Bengal', 'West Bengal', 'Kolkata',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/5.jpg',
   ARRAY['rutting'], 'moderate', 0.72, 'verified'),
  (17.3850, 78.4867, 'HITEC City, Hyderabad, Telangana', 'Telangana', 'Hyderabad',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/6.jpg',
   ARRAY['pothole', 'edge_break'], 'severe', 0.88, 'verified'),
  (26.9124, 75.7873, 'MI Road, Jaipur, Rajasthan', 'Rajasthan', 'Jaipur',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/7.jpg',
   ARRAY['alligator_crack'], 'moderate', 0.77, 'verified'),
  (23.0225, 72.5714, 'CG Road, Ahmedabad, Gujarat', 'Gujarat', 'Ahmedabad',
   'https://placehold.co/640x480/1a1a2e/e6edf3?text=Road+Damage', 'seed/8.jpg',
   ARRAY['longitudinal_crack'], 'minor', 0.61, 'verified');

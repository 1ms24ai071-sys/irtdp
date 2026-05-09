-- Migration: Add Dispatch and Location Tracking Tables
-- Date: 2024
-- Description: Adds dispatch management and officer location tracking capabilities

-- 1. Dispatch Records Table
-- Records which officer is assigned to which incident and tracks dispatch status
CREATE TABLE IF NOT EXISTS dispatch_records (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  -- Status workflow: assigned -> en_route -> on_scene -> completed
  -- OR: assigned -> cancelled
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_dispatch_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispatch_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_dispatch_incident ON dispatch_records(incident_id);
CREATE INDEX idx_dispatch_officer ON dispatch_records(officer_id);
CREATE INDEX idx_dispatch_status ON dispatch_records(status);
CREATE INDEX idx_dispatch_created ON dispatch_records(assigned_at DESC);
CREATE INDEX idx_dispatch_active ON dispatch_records(status, is_deleted);

-- 2. Officer Location History Table (Optional but recommended for full tracking)
-- Stores historical location updates for audit trails and analytics
CREATE TABLE IF NOT EXISTS officer_location_history (
  id UUID PRIMARY KEY,
  officer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(8, 2), -- GPS accuracy in meters (optional)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_location_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_officer_location_history ON officer_location_history(officer_id, created_at DESC);
CREATE INDEX idx_officer_location_date ON officer_location_history(created_at DESC);

-- Add location history retention policy comment
-- COMMENT ON TABLE officer_location_history IS 'Stores real-time location updates. 
-- Consider archiving/purging after 90 days for performance.';

-- 3. Update existing tables to support dispatch workflow

-- The users table already has:
-- - officer_status (available, en_route, on_scene, off_duty)
-- - last_location_lat, last_location_lng
-- - updated_at

-- If these columns don't exist, add them:
ALTER TABLE users ADD COLUMN IF NOT EXISTS officer_status VARCHAR(50) DEFAULT 'off_duty';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_lat DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_lng DECIMAL(11, 8);

-- Create index for officer queries
CREATE INDEX IF NOT EXISTS idx_users_officer_status ON users(role, officer_status);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(last_location_lat, last_location_lng) WHERE last_location_lat IS NOT NULL;

-- 4. Sample data for dispatch workflow testing (optional)
-- Uncomment to insert test data
/*
-- Create dispatch tracking for a test incident
INSERT INTO dispatch_records (id, incident_id, officer_id, status, assigned_at)
SELECT 
  gen_random_uuid(),
  i.id,
  u.id,
  'assigned',
  NOW()
FROM incidents i
JOIN users u ON u.role = 'police' AND u.officer_status = 'available'
WHERE i.status IN ('reported', 'verified')
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- IRTDP Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'reporter',
  display_name  VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  officer_status VARCHAR(30) DEFAULT 'off_duty', -- available, en_route, on_scene, off_duty
  last_location_lat DOUBLE PRECISION,
  last_location_lng DOUBLE PRECISION,
  is_deleted    BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(100),
  severity    VARCHAR(20) DEFAULT 'low',
  status      VARCHAR(30) DEFAULT 'reported',
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  location    geometry(Point, 4326),
  address     TEXT,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  risk_score  VARCHAR(10) DEFAULT 'low',
  cluster_id  INTEGER,
  is_deleted  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created  ON incidents(created_at DESC);

CREATE TABLE IF NOT EXISTS media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  type         VARCHAR(20) NOT NULL,
  mime_type    VARCHAR(100),
  size_bytes   BIGINT,
  duration_s   FLOAT,
  width        INTEGER,
  height       INTEGER,
  status       VARCHAR(30) DEFAULT 'uploaded',
  metadata     JSONB DEFAULT '{}',
  exif_removed BOOLEAN DEFAULT FALSE,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_processing (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id         UUID UNIQUE NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  thumbnail_url    TEXT,
  transcript       TEXT,
  keywords         TEXT[],
  moderation_flags JSONB DEFAULT '[]',
  risk_score       VARCHAR(10) DEFAULT 'low',
  processed_at     TIMESTAMPTZ DEFAULT NOW(),
  processing_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS hotspots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id     INTEGER UNIQUE NOT NULL,
  centroid_lat   DOUBLE PRECISION NOT NULL,
  centroid_lng   DOUBLE PRECISION NOT NULL,
  incident_count INTEGER DEFAULT 0,
  severity_score FLOAT DEFAULT 0,
  is_deleted     BOOLEAN DEFAULT FALSE,
  computed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      VARCHAR(100) NOT NULL,
  type      VARCHAR(50) NOT NULL,
  status    VARCHAR(30) DEFAULT 'available',
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  distance_km FLOAT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address  INET,
  user_agent  TEXT,
  details     JSONB DEFAULT '{}',
  is_deleted  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255),
  message    TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  metadata   JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  status     VARCHAR(30) DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

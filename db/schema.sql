CREATE TABLE IF NOT EXISTS monitors (
  id text PRIMARY KEY,
  name text NOT NULL,
  project text NOT NULL DEFAULT 'PhilGEPS',
  url text,
  enabled boolean NOT NULL DEFAULT true,
  interval_seconds integer NOT NULL DEFAULT 60 CHECK (interval_seconds >= 60),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','up','down')),
  failures integer NOT NULL DEFAULT 0,
  successes integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  last_checked_at timestamptz,
  last_http_status integer,
  last_latency_ms integer,
  last_error text,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  monitor_id text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  http_status integer,
  latency_ms integer NOT NULL,
  error text,
  UNIQUE(monitor_id,scheduled_at)
);
CREATE INDEX IF NOT EXISTS checks_monitor_time ON checks(monitor_id,checked_at DESC);
CREATE TABLE IF NOT EXISTS incidents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  monitor_id text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  reason text NOT NULL,
  resolution text
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_incident ON incidents(monitor_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS incidents_time ON incidents(started_at DESC);
CREATE TABLE IF NOT EXISTS deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id bigint REFERENCES incidents(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('discord','email')),
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','canceled')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_key,channel)
);
CREATE INDEX IF NOT EXISTS deliveries_due ON deliveries(next_attempt_at) WHERE status='pending';
CREATE TABLE IF NOT EXISTS app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  alerts_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO app_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS worker_health (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  heartbeat_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS status_pages (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS status_page_monitors (
  status_page_id uuid NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  monitor_id text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  display_order integer NOT NULL CHECK(display_order >= 0),
  PRIMARY KEY(status_page_id,monitor_id),
  UNIQUE(status_page_id,display_order)
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash text PRIMARY KEY,
  credential_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notification_settings (
  channel text PRIMARY KEY CHECK (channel IN ('discord','email')),
  encrypted_config text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

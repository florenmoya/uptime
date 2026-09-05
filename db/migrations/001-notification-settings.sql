CREATE TABLE IF NOT EXISTS notification_settings (
  channel text PRIMARY KEY CHECK (channel IN ('discord','email')),
  encrypted_config text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_channel_check;
ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_channel_check CHECK(channel IN ('discord','email','overview'));
CREATE TABLE IF NOT EXISTS overview_message (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  message_id text,
  webhook_hash text,
  creation_pending boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);
INSERT INTO overview_message(id) VALUES(true) ON CONFLICT DO NOTHING;

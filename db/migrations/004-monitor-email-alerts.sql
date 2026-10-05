BEGIN;

-- Initialize the owner's selection once; rerunning must preserve later toggles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='monitors' AND column_name='email_alerts_enabled'
  ) THEN
    ALTER TABLE monitors ADD COLUMN email_alerts_enabled boolean NOT NULL DEFAULT false;
    UPDATE monitors SET email_alerts_enabled=true
    WHERE lower(trim(name)) IN ('philgeps.gov.ph','emarket.philgeps.gov.ph','emarket-svc.philgeps.gov.ph','fact prod');
  END IF;
END $$;

UPDATE deliveries d SET status='canceled',last_error='Email alerts disabled for this monitor'
FROM incidents i JOIN monitors m ON m.id=i.monitor_id
WHERE d.incident_id=i.id AND d.channel='email' AND d.status='pending'
  AND NOT m.email_alerts_enabled
  AND d.payload->>'kind' IS DISTINCT FROM 'test' AND d.payload->>'isTest' IS DISTINCT FROM 'true';

COMMIT;

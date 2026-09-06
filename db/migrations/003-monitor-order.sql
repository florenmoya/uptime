ALTER TABLE monitors ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 2147483647 CHECK (display_order >= 0);

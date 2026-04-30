-- Profile: rename legacy WhatsApp column to a general external URL; add booking URL and pricing list.
-- Safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN whatsapp TO external_contact_url;
  END IF;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_url text;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pricing_items jsonb NOT NULL DEFAULT '[]'::jsonb;

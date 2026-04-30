-- Leads CRM table + profile action/lead-capture fields.
-- Safe to run repeatedly.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_button_label text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_capture_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS leads (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_card_code text,
  name text NOT NULL,
  phone text,
  email text,
  message text,
  service_interest text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_profile_id_idx ON leads(profile_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

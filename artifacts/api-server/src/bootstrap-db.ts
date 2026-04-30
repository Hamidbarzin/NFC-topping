import pg from "pg";

/**
 * Temporary startup DDL for empty Postgres (e.g. Render) without migrations.
 * Uses a dedicated `pg.Client` (not the pooled Proxy from @workspace/db) so
 * `CREATE TABLE` always runs with a correct connection.
 * Mirrors `lib/db/src/schema/*.ts` (serial ids).
 */
const CREATE_PROFILES = `
CREATE TABLE IF NOT EXISTS profiles (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  business_name text NOT NULL,
  job_title text,
  short_bio text,
  business_description text,
  category text,
  phone text,
  external_contact_url text,
  instagram text,
  address text,
  order_url text,
  booking_url text,
  custom_button_label text,
  lead_capture_enabled boolean NOT NULL DEFAULT true,
  profile_photo_url text,
  logo_url text,
  banner_url text,
  resume_url text,
  banner_color text NOT NULL DEFAULT '#1a1a2e',
  is_active boolean NOT NULL DEFAULT true,
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  plan text NOT NULL DEFAULT 'basic',
  credit_balance numeric(12,2) NOT NULL DEFAULT 0,
  credit_awarded_at timestamptz,
  credit_expires_at timestamptz,
  credit_note text,
  expires_at timestamptz,
  owner_email text,
  owner_name text,
  pricing_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings_access_token text UNIQUE,
  settings_access_expires_at timestamptz,
  settings_access_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_NFC_CARDS = `
CREATE TABLE IF NOT EXISTS nfc_cards (
  id serial PRIMARY KEY,
  card_code text NOT NULL UNIQUE,
  profile_id integer REFERENCES profiles(id) ON DELETE SET NULL,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);
`;

/**
 * Must match `lib/db/src/schema/nfc_cards.ts` and `migrations/0002_nfc_cards_ops_and_settings.sql`.
 * Render/production only runs this bootstrap (not ad-hoc migration runs); without these ALTERs,
 * GET /api/admin/nfc-cards fails with undefined_column when Drizzle selects is_completed, etc.
 */
const ENSURE_NFC_CARDS_COLUMNS = `
ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;
ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS is_written boolean NOT NULL DEFAULT false;
ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS settings_token text;
CREATE UNIQUE INDEX IF NOT EXISTS nfc_cards_settings_token_uidx
  ON nfc_cards (settings_token)
  WHERE settings_token IS NOT NULL;
`;

/** Backfill: already-activated + claimed profiles → card marked completed (idempotent). */
const NFC_CARDS_BACKFILL_COMPLETED = `
UPDATE nfc_cards nc
SET is_completed = true
FROM profiles p
WHERE nc.profile_id = p.id
  AND p.is_claimed = true
  AND nc.activated_at IS NOT NULL
  AND nc.is_completed = false;
`;

const CREATE_ANALYTICS = `
CREATE TABLE IF NOT EXISTS analytics (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tapped_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  country text
);
`;


const CREATE_LEADS = `
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
`;

const CREATE_CREDIT_TRANSACTIONS = `
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const ENSURE_PROFILE_COLUMNS = `
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS short_bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_balance numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_awarded_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_note text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activation_gift_amount numeric(12,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings_access_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings_access_created_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_settings_access_token_unique_idx ON profiles(settings_access_token);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_deliveries integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_clients integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating numeric(4, 2);
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_button_label text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_capture_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pricing_items jsonb NOT NULL DEFAULT '[]'::jsonb;
`;

export async function bootstrapDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.log(
      "Skipping database bootstrap (DATABASE_URL not set — tables will not be auto-created).",
    );
    return;
  }

  console.log("Bootstrapping database tables...");
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query(CREATE_PROFILES);
    await client.query(ENSURE_PROFILE_COLUMNS);
    await client.query(CREATE_NFC_CARDS);
    await client.query(ENSURE_NFC_CARDS_COLUMNS);
    await client.query(NFC_CARDS_BACKFILL_COMPLETED);
    await client.query(CREATE_ANALYTICS);
    await client.query(CREATE_LEADS);
    await client.query(CREATE_CREDIT_TRANSACTIONS);
    console.log("Database bootstrap completed");
  } catch (err) {
    console.error("Database bootstrap failed:", err);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

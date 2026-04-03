-- Dev-only test user for UI login testing.
-- Password: TempUI2026!
-- Email: ui-test@local.dev
-- Username: uitest
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/seed-ui-test-user.sql
--
-- Use the same email and password on the /login page.

BEGIN;

-- If the email already exists, overwrites password and fields (fixes "invalid password" after a prior signup).
INSERT INTO users (name, business_name, phone, email, username, password_hash, is_admin)
VALUES (
  'Test UI User',
  'Test Business',
  '+10000000000',
  'ui-test@local.dev',
  'uitest',
  '$2b$10$t/iFAtj1eCHhP8kXSlLZjugk3gXL0ZvrT05HsheJnQ1B7pstlM37K',
  false
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  business_name = EXCLUDED.business_name,
  phone = EXCLUDED.phone,
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  is_admin = EXCLUDED.is_admin;

WITH u AS (
  SELECT id FROM users WHERE email = 'ui-test@local.dev' LIMIT 1
)
INSERT INTO profiles (user_id, bio)
SELECT u.id, 'Dev-only test account for UI.'
FROM u
ON CONFLICT (user_id) DO NOTHING;

WITH u AS (
  SELECT id FROM users WHERE email = 'ui-test@local.dev' LIMIT 1
)
INSERT INTO credits (user_id, total, used)
SELECT u.id, 40, 0
FROM u
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- Demo NFC card rows for local testing (register / activate flow).
-- Run after schema exists:  npx pnpm@latest --filter @workspace/db run push
--
--   psql "$DATABASE_URL" -f scripts/seed-demo-cards.sql
--
-- Then use e.g. C1001 on /register or /activate/C1001.

INSERT INTO cards (card_code, status)
VALUES
  ('C1001', 'new'),
  ('C1002', 'new'),
  ('C1003', 'new'),
  ('C1004', 'new'),
  ('C1005', 'new')
ON CONFLICT (card_code) DO NOTHING;

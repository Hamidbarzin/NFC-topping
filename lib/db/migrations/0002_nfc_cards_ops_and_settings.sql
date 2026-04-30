-- NFC card operations + settings token (idempotent)

ALTER TABLE "nfc_cards" ADD COLUMN IF NOT EXISTS "is_completed" boolean NOT NULL DEFAULT false;
ALTER TABLE "nfc_cards" ADD COLUMN IF NOT EXISTS "is_written" boolean NOT NULL DEFAULT false;
ALTER TABLE "nfc_cards" ADD COLUMN IF NOT EXISTS "admin_note" text;
ALTER TABLE "nfc_cards" ADD COLUMN IF NOT EXISTS "settings_token" text;

CREATE UNIQUE INDEX IF NOT EXISTS "nfc_cards_settings_token_uidx"
  ON "nfc_cards" ("settings_token")
  WHERE "settings_token" IS NOT NULL;

UPDATE "nfc_cards" nc
SET "is_completed" = true
FROM "profiles" p
WHERE nc."profile_id" = p."id"
  AND p."is_claimed" = true
  AND nc."activated_at" IS NOT NULL;

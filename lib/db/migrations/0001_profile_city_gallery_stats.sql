-- NFC public profile: city, gallery, display stats
-- Apply after backup. Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "city" text;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gallery_urls" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "total_deliveries" integer NOT NULL DEFAULT 0;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "total_clients" integer NOT NULL DEFAULT 0;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "rating" numeric(4, 2);

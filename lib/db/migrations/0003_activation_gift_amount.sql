-- Preset activation gift (nullable). NULL = use system default on first activation; 0 = no gift; >0 = that amount.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "activation_gift_amount" numeric(12, 2);

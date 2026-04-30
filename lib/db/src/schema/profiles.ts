import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Public pricing row (stored in profiles.pricing_items JSONB). */
export const pricingItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  price: z.string().min(1).max(64),
  currency: z.string().min(1).max(16),
  billingType: z
    .enum(["one-time", "hourly", "daily", "monthly", "custom"])
    .nullable()
    .optional(),
  note: z.string().max(500).nullable().optional(),
  buttonLabel: z.string().max(80).nullable().optional(),
  linkUrl: z.string().max(2048).nullable().optional(),
});

export type PricingItem = z.infer<typeof pricingItemSchema>;

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  jobTitle: text("job_title"),
  shortBio: text("short_bio"),
  businessDescription: text("business_description"),
  category: text("category"),
  phone: text("phone"),
  /** General contact / booking URL (replaces legacy WhatsApp-only field). */
  externalContactUrl: text("external_contact_url"),
  instagram: text("instagram"),
  address: text("address"),
  city: text("city"),
  orderUrl: text("order_url"),
  /** Primary booking or online profile link (Calendly, website booking page, etc.). */
  bookingUrl: text("booking_url"),
  /** Custom button label for primary action (defaults to "Book Online" on UI). */
  customButtonLabel: text("custom_button_label"),
  /** Enable/disable public lead capture form for this profile. */
  leadCaptureEnabled: boolean("lead_capture_enabled").notNull().default(true),
  profilePhotoUrl: text("profile_photo_url"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  resumeUrl: text("resume_url"),
  bannerColor: text("banner_color").notNull().default("#1a1a2e"),
  /** Public gallery image URLs (stored as JSON array). */
  galleryUrls: jsonb("gallery_urls")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  /** Service/package pricing rows for the public profile. */
  pricingItems: jsonb("pricing_items")
    .$type<PricingItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  totalClients: integer("total_clients").notNull().default(0),
  /** Average rating, e.g. 4.85 — optional display stat. */
  rating: numeric("rating", { precision: 4, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  isClaimed: boolean("is_claimed").notNull().default(false),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  plan: text("plan").notNull().default("basic"),
  creditBalance: numeric("credit_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  creditAwardedAt: timestamp("credit_awarded_at", { withTimezone: true }),
  creditExpiresAt: timestamp("credit_expires_at", { withTimezone: true }),
  creditNote: text("credit_note"),
  /**
   * Before first activation: optional welcome credit override.
   * NULL = system default on activation; 0 = no welcome credit; positive = that amount (CAD).
   */
  activationGiftAmount: numeric("activation_gift_amount", { precision: 12, scale: 2 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ownerEmail: text("owner_email"),
  ownerName: text("owner_name"),
  settingsAccessToken: text("settings_access_token").unique(),
  settingsAccessExpiresAt: timestamp("settings_access_expires_at", {
    withTimezone: true,
  }),
  settingsAccessCreatedAt: timestamp("settings_access_created_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;

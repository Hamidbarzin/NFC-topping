import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { pricingItemSchema } from "@workspace/db/schema";
import { normalizeOptionalUrl } from "../lib/url-normalize";
import { normalizePricingItems } from "../lib/profile-serialize";

const router: IRouter = Router();

/**
 * NFC CLIENT ACCESS FLOW
 *
 * Database reality:
 * - nfc_cards has:
 *   id, card_code, profile_id, is_suspended, created_at, activated_at,
 *   is_completed, is_written, admin_note, settings_token
 *
 * - profiles has:
 *   is_active, is_claimed, settings_access_token, settings_access_created_at,
 *   settings_access_expires_at, business_name, owner_name, phone, media fields, etc.
 *
 * Correct flow:
 * 1. Raw card scan: /api/client-access/claim/c1043
 * 2. If card is not completed -> /settings/c1043?token=PRIVATE_SETTINGS_TOKEN
 * 3. Customer fills form and saves
 * 4. Save marks nfc_cards.is_completed = true and profiles.is_claimed = true
 * 5. Future scans -> /u/nfc-c1043
 */

const TokenParamsSchema = z.object({
  token: z.string().trim().min(16).max(256),
});

const CardCodeParamsSchema = z.object({
  cardCode: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

const optionalText = z.union([z.string(), z.null()]).optional();
const optionalColor = z.union([z.string().regex(/^#([0-9a-fA-F]{6})$/), z.null()]).optional();

const ClientAccessUpdateBodySchema = z.object({
  businessName: z.string().trim().min(1).optional(),
  ownerName: optionalText,
  jobTitle: optionalText,
  phone: optionalText,
  /** @deprecated use externalContactUrl — stored in external_contact_url */
  whatsapp: optionalText,
  externalContactUrl: optionalText,
  bookingUrl: optionalText,
  customButtonLabel: optionalText,
  leadCaptureEnabled: z.boolean().optional(),
  ownerEmail: optionalText,
  address: optionalText,
  city: optionalText,
  orderUrl: optionalText,
  instagram: optionalText,
  shortBio: optionalText,
  businessDescription: optionalText,
  profilePhotoUrl: optionalText,
  logoUrl: optionalText,
  bannerUrl: optionalText,
  bannerColor: optionalColor,
  galleryUrls: z.array(z.string()).optional(),
  pricingItems: z.array(pricingItemSchema).optional(),
  totalDeliveries: z.union([z.number(), z.string(), z.null()]).optional(),
  totalClients: z.union([z.number(), z.string(), z.null()]).optional(),
  rating: z.union([z.number(), z.string(), z.null()]).optional(),
});

function getRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  if (Array.isArray(result)) {
    return result as T[];
  }
  return [];
}

function sendError(res: Response, status: number, error: string, detail?: unknown): void {
  const body: Record<string, unknown> = { error };
  if (detail !== undefined) {
    body.detail = detail instanceof Error ? detail.message : String(detail);
  }
  res.status(status).json(body);
}

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function cleanInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function cleanRating(value: unknown, fallback: unknown): number | null {
  if (value === undefined) {
    if (fallback === null || fallback === undefined || fallback === "") return null;
    const oldValue = Number(fallback);
    return Number.isFinite(oldValue) ? Math.max(0, Math.min(5, oldValue)) : null;
  }

  if (value === null || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5, n));
}

function resolveNextContactUrl(
  data: {
    externalContactUrl?: string | null;
    whatsapp?: string | null;
  },
  existing: string | null,
): string | null {
  if (data.externalContactUrl !== undefined) {
    const t = cleanText(data.externalContactUrl);
    return t ? normalizeOptionalUrl(t) : null;
  }
  if (data.whatsapp !== undefined) {
    const t = cleanText(data.whatsapp);
    return t ? normalizeOptionalUrl(t) : null;
  }
  return existing;
}

function resolveNextBookingUrl(
  data: { bookingUrl?: string | null },
  existing: string | null,
): string | null {
  if (data.bookingUrl === undefined) return existing;
  const t = cleanText(data.bookingUrl);
  return t ? normalizeOptionalUrl(t) : null;
}

/**
 * GET /client-access/claim/:cardCode
 *
 * NFC card URL should be:
 * http://nfc-lab.toppingcourier.ca/api/client-access/claim/c1043
 */
router.get(
  "/client-access/claim/:cardCode",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = CardCodeParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      sendError(res, 400, "invalid_card_code");
      return;
    }

    const { cardCode } = parsed.data;

    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

      await db.execute(sql`
        INSERT INTO nfc_cards (
          card_code,
          is_suspended,
          is_completed,
          is_written,
          created_at
        )
        VALUES (
          ${cardCode},
          false,
          false,
          false,
          NOW()
        )
        ON CONFLICT (card_code) DO NOTHING
      `);

      const cardResult = await db.execute(sql`
        SELECT
          id,
          card_code,
          profile_id,
          is_suspended,
          is_completed,
          is_written,
          settings_token
        FROM nfc_cards
        WHERE card_code = ${cardCode}
        LIMIT 1
      `);

      const cardRows = getRows<{
        id: number;
        card_code: string;
        profile_id: number | null;
        is_suspended: boolean;
        is_completed: boolean;
        is_written: boolean;
        settings_token: string | null;
      }>(cardResult);

      if (!cardRows.length) {
        sendError(res, 404, "card_not_found");
        return;
      }

      const card = cardRows[0];

      if (card.is_suspended) {
        sendError(res, 403, "card_suspended");
        return;
      }

      const slug = `nfc-${cardCode}`;

      if (!card.profile_id) {
        await db.execute(sql`
          INSERT INTO profiles (
            slug,
            business_name,
            owner_name,
            short_bio,
            business_description,
            banner_color,
            plan,
            is_active,
            is_claimed,
            settings_access_token,
            settings_access_created_at,
            created_at,
            updated_at
          )
          VALUES (
            ${slug},
            ${`New NFC Profile ${cardCode}`},
            'New Client',
            'Ready to be customized.',
            ${`Auto-created for NFC card ${cardCode}.`},
            '#1a1a2e',
            'basic',
            true,
            false,
            encode(gen_random_bytes(32), 'hex'),
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO NOTHING
        `);

        await db.execute(sql`
          UPDATE nfc_cards
          SET profile_id = (
            SELECT id
            FROM profiles
            WHERE slug = ${slug}
            LIMIT 1
          )
          WHERE card_code = ${cardCode}
            AND profile_id IS NULL
        `);
      }

      await db.execute(sql`
        UPDATE nfc_cards
        SET settings_token = COALESCE(
          NULLIF(settings_token, ''),
          encode(gen_random_bytes(32), 'hex')
        )
        WHERE card_code = ${cardCode}
      `);

      const setupResult = await db.execute(sql`
        UPDATE profiles p
        SET
          settings_access_token = COALESCE(
            NULLIF(p.settings_access_token, ''),
            encode(gen_random_bytes(32), 'hex')
          ),
          settings_access_created_at = COALESCE(
            p.settings_access_created_at,
            NOW()
          ),
          updated_at = NOW()
        FROM nfc_cards c
        WHERE p.id = c.profile_id
          AND c.card_code = ${cardCode}
        RETURNING
          p.id AS profile_id,
          p.slug,
          p.settings_access_token,
          c.is_completed
      `);

      const setupRows = getRows<{
        profile_id: number;
        slug: string;
        settings_access_token: string;
        is_completed: boolean;
      }>(setupResult);

      if (!setupRows.length || !setupRows[0].slug || !setupRows[0].settings_access_token) {
        sendError(res, 500, "profile_setup_missing");
        return;
      }

      const publicSlug = setupRows[0].slug;
      const privateSettingsToken = setupRows[0].settings_access_token;
      const isCompleted = setupRows[0].is_completed === true;

      if (!isCompleted) {
        res.redirect(302, `/settings/${cardCode}?token=${privateSettingsToken}`);
        return;
      }

      res.redirect(302, `/u/${publicSlug}`);
    } catch (error) {
      console.error("[NFC] claim error | card=%s | err=%o", cardCode, error);
      sendError(res, 500, "internal_server_error", error);
    }
  }
);

/**
 * GET /client-access/:token
 *
 * Used by customer setup form to load private editable profile data.
 */
router.get(
  "/client-access/:token",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = TokenParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      sendError(res, 404, "invalid_token");
      return;
    }

    const { token } = parsed.data;

    try {
      const result = await db.execute(sql`
        SELECT
          p.id,
          p.slug,
          p.business_name,
          p.owner_name,
          p.job_title,
          p.phone,
          p.external_contact_url,
          p.booking_url,
          p.custom_button_label,
          p.lead_capture_enabled,
          p.pricing_items,
          p.owner_email,
          p.address,
          p.city,
          p.order_url,
          p.instagram,
          p.short_bio,
          p.business_description,
          p.profile_photo_url,
          p.logo_url,
          p.banner_url,
          p.banner_color,
          p.gallery_urls,
          p.total_deliveries,
          p.total_clients,
          p.rating,
          p.is_active,
          p.is_claimed,
          p.settings_access_expires_at
        FROM profiles p
        WHERE p.settings_access_token = ${token}
        LIMIT 1
      `);

      const rows = getRows<any>(result);

      if (!rows.length) {
        sendError(res, 404, "invalid_token");
        return;
      }

      const profile = rows[0];

      if (
        profile.settings_access_expires_at &&
        new Date(profile.settings_access_expires_at).getTime() < Date.now()
      ) {
        sendError(res, 403, "token_expired");
        return;
      }

      res.status(200).json({
        id: profile.id,
        slug: profile.slug,
        businessName: profile.business_name,
        ownerName: profile.owner_name,
        jobTitle: profile.job_title,
        phone: profile.phone,
        externalContactUrl: profile.external_contact_url,
        bookingUrl: profile.booking_url,
        customButtonLabel: profile.custom_button_label,
        leadCaptureEnabled: profile.lead_capture_enabled !== false,
        pricingItems: normalizePricingItems(profile.pricing_items),
        ownerEmail: profile.owner_email,
        address: profile.address,
        city: profile.city,
        orderUrl: profile.order_url,
        instagram: profile.instagram,
        shortBio: profile.short_bio,
        businessDescription: profile.business_description,
        profilePhotoUrl: profile.profile_photo_url,
        logoUrl: profile.logo_url,
        bannerUrl: profile.banner_url,
        bannerColor: profile.banner_color,
        galleryUrls: profile.gallery_urls ?? [],
        totalDeliveries: profile.total_deliveries ?? 0,
        totalClients: profile.total_clients ?? 0,
        rating: profile.rating === null || profile.rating === undefined ? null : Number(profile.rating),
        isActive: profile.is_active,
        isClaimed: profile.is_claimed,
      });
    } catch (error) {
      console.error("[NFC] client-access GET error | token=%s | err=%o", token, error);
      sendError(res, 500, "internal_server_error", error);
    }
  }
);

/**
 * PATCH /client-access/:token
 *
 * Customer saves setup form.
 * This updates profile and marks related NFC card as completed.
 */
router.patch(
  "/client-access/:token",
  async (req: Request, res: Response): Promise<void> => {
    const parsedParams = TokenParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
      sendError(res, 404, "invalid_token");
      return;
    }

    const parsedBody = ClientAccessUpdateBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
      sendError(res, 400, "invalid_body", parsedBody.error.message);
      return;
    }

    const { token } = parsedParams.data;
    const data = parsedBody.data;

    try {
      const existingResult = await db.execute(sql`
        SELECT
          id,
          business_name,
          owner_name,
          job_title,
          phone,
          external_contact_url,
          booking_url,
          custom_button_label,
          lead_capture_enabled,
          pricing_items,
          owner_email,
          address,
          city,
          order_url,
          instagram,
          short_bio,
          business_description,
          profile_photo_url,
          logo_url,
          banner_url,
          banner_color,
          gallery_urls,
          total_deliveries,
          total_clients,
          rating,
          settings_access_expires_at
        FROM profiles
        WHERE settings_access_token = ${token}
        LIMIT 1
      `);

      const existingRows = getRows<any>(existingResult);

      if (!existingRows.length) {
        sendError(res, 404, "invalid_token");
        return;
      }

      const existing = existingRows[0];

      if (
        existing.settings_access_expires_at &&
        new Date(existing.settings_access_expires_at).getTime() < Date.now()
      ) {
        sendError(res, 403, "token_expired");
        return;
      }

      const businessName =
        data.businessName !== undefined
          ? data.businessName.trim()
          : existing.business_name;

      const galleryJson =
        data.galleryUrls !== undefined
          ? JSON.stringify(data.galleryUrls)
          : JSON.stringify(existing.gallery_urls ?? []);

      const nextContactUrl = resolveNextContactUrl(data, existing.external_contact_url ?? null);
      const nextBookingUrl = resolveNextBookingUrl(data, existing.booking_url ?? null);
      const pricingJson =
        data.pricingItems !== undefined
          ? JSON.stringify(normalizePricingItems(data.pricingItems))
          : JSON.stringify(normalizePricingItems(existing.pricing_items));

      const updatedResult = await db.execute(sql`
        UPDATE profiles
        SET
          business_name = ${businessName},
          owner_name = ${data.ownerName !== undefined ? cleanText(data.ownerName) : existing.owner_name},
          job_title = ${data.jobTitle !== undefined ? cleanText(data.jobTitle) : existing.job_title},
          phone = ${data.phone !== undefined ? cleanText(data.phone) : existing.phone},
          external_contact_url = ${nextContactUrl},
          booking_url = ${nextBookingUrl},
          custom_button_label = ${data.customButtonLabel !== undefined ? cleanText(data.customButtonLabel) : existing.custom_button_label},
          lead_capture_enabled = ${data.leadCaptureEnabled !== undefined ? data.leadCaptureEnabled : existing.lead_capture_enabled},
          pricing_items = ${pricingJson}::jsonb,
          owner_email = ${data.ownerEmail !== undefined ? cleanText(data.ownerEmail) : existing.owner_email},
          address = ${data.address !== undefined ? cleanText(data.address) : existing.address},
          city = ${data.city !== undefined ? cleanText(data.city) : existing.city},
          order_url = ${data.orderUrl !== undefined ? cleanText(data.orderUrl) : existing.order_url},
          instagram = ${data.instagram !== undefined ? cleanText(data.instagram) : existing.instagram},
          short_bio = ${data.shortBio !== undefined ? cleanText(data.shortBio) : existing.short_bio},
          business_description = ${data.businessDescription !== undefined ? cleanText(data.businessDescription) : existing.business_description},
          profile_photo_url = ${data.profilePhotoUrl !== undefined ? cleanText(data.profilePhotoUrl) : existing.profile_photo_url},
          logo_url = ${data.logoUrl !== undefined ? cleanText(data.logoUrl) : existing.logo_url},
          banner_url = ${data.bannerUrl !== undefined ? cleanText(data.bannerUrl) : existing.banner_url},
          banner_color = ${data.bannerColor !== undefined ? cleanText(data.bannerColor) ?? "#1a1a2e" : existing.banner_color},
          gallery_urls = ${galleryJson}::jsonb,
          total_deliveries = ${cleanInt(data.totalDeliveries, existing.total_deliveries ?? 0)},
          total_clients = ${cleanInt(data.totalClients, existing.total_clients ?? 0)},
          rating = ${cleanRating(data.rating, existing.rating)},
          is_claimed = true,
          claimed_at = COALESCE(claimed_at, NOW()),
          updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING
          id,
          slug,
          business_name,
          owner_name,
          job_title,
          phone,
          external_contact_url,
          booking_url,
          custom_button_label,
          lead_capture_enabled,
          pricing_items,
          owner_email,
          address,
          city,
          order_url,
          instagram,
          short_bio,
          business_description,
          profile_photo_url,
          logo_url,
          banner_url,
          banner_color,
          gallery_urls,
          total_deliveries,
          total_clients,
          rating,
          is_active,
          is_claimed
      `);

      const updatedRows = getRows<any>(updatedResult);

      if (!updatedRows.length) {
        sendError(res, 500, "profile_update_failed");
        return;
      }

      const updated = updatedRows[0];

      await db.execute(sql`
        UPDATE nfc_cards
        SET
          is_completed = true,
          activated_at = COALESCE(activated_at, NOW())
        WHERE profile_id = ${existing.id}
      `);

      res.status(200).json({
        ok: true,
        publicUrl: `/u/${updated.slug}`,
        profile: {
          id: updated.id,
          slug: updated.slug,
          businessName: updated.business_name,
          ownerName: updated.owner_name,
          jobTitle: updated.job_title,
          phone: updated.phone,
          externalContactUrl: updated.external_contact_url,
          bookingUrl: updated.booking_url,
          customButtonLabel: updated.custom_button_label,
          leadCaptureEnabled: updated.lead_capture_enabled !== false,
          pricingItems: normalizePricingItems(updated.pricing_items),
          ownerEmail: updated.owner_email,
          address: updated.address,
          city: updated.city,
          orderUrl: updated.order_url,
          instagram: updated.instagram,
          shortBio: updated.short_bio,
          businessDescription: updated.business_description,
          profilePhotoUrl: updated.profile_photo_url,
          logoUrl: updated.logo_url,
          bannerUrl: updated.banner_url,
          bannerColor: updated.banner_color,
          galleryUrls: updated.gallery_urls ?? [],
          totalDeliveries: updated.total_deliveries ?? 0,
          totalClients: updated.total_clients ?? 0,
          rating: updated.rating === null || updated.rating === undefined ? null : Number(updated.rating),
          isActive: updated.is_active,
          isClaimed: updated.is_claimed,
        },
      });
    } catch (error) {
      console.error("[NFC] client-access PATCH error | token=%s | err=%o", token, error);
      sendError(res, 500, "internal_server_error", error);
    }
  }
);

export default router;

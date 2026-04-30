import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, nfcCardsTable, profilesTable } from "@workspace/db";
import { pricingItemSchema } from "@workspace/db/schema";
import { normalizeCardCode } from "../lib/slug";
import { normalizeOptionalUrl } from "../lib/url-normalize";
import { normalizePricingItems } from "../lib/profile-serialize";

const router: IRouter = Router();

const CardParamsSchema = z.object({
  cardCode: z.string().min(1).max(128),
});

const TokenQuerySchema = z.object({
  token: z.string().min(16).max(256),
});

const optStr = z.union([z.string(), z.null()]);

const SettingsCardPatchSchema = z.object({
  businessName: z.string().min(1).optional(),
  ownerName: optStr.optional(),
  jobTitle: optStr.optional(),
  phone: optStr.optional(),
  /** @deprecated use externalContactUrl */
  whatsapp: optStr.optional(),
  externalContactUrl: optStr.optional(),
  bookingUrl: optStr.optional(),
  customButtonLabel: optStr.optional(),
  leadCaptureEnabled: z.boolean().optional(),
  ownerEmail: optStr.optional(),
  address: optStr.optional(),
  city: optStr.optional(),
  orderUrl: optStr.optional(),
  instagram: optStr.optional(),
  category: optStr.optional(),
  shortBio: optStr.optional(),
  businessDescription: optStr.optional(),
  profilePhotoUrl: optStr.optional(),
  logoUrl: optStr.optional(),
  bannerUrl: optStr.optional(),
  bannerColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  galleryUrls: z.array(z.string()).optional(),
  pricingItems: z.array(pricingItemSchema).optional(),
  totalDeliveries: z.number().int().min(0).optional(),
  totalClients: z.number().int().min(0).optional(),
  rating: z.union([z.number().min(0).max(5), z.null()]).optional(),
});

async function authorizeCardSettings(cardCodeRaw: string, tokenRaw: string) {
  const cardCode = normalizeCardCode(cardCodeRaw);
  const token = tokenRaw.trim();
  if (!cardCode || !token) {
    return { error: "invalid" as const };
  }

  const [card] = await db
    .select()
    .from(nfcCardsTable)
    .where(eq(nfcCardsTable.cardCode, cardCode))
    .limit(1);

  if (!card?.profileId) {
    return { error: "invalid" as const };
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, card.profileId))
    .limit(1);

  if (!profile) {
    return { error: "invalid" as const };
  }

  // Profile token + expiry is the single source of truth for settings authorization.
  if (profile.settingsAccessToken == null || profile.settingsAccessToken !== token) {
    return { error: "invalid" as const };
  }
  if (!profile.settingsAccessExpiresAt) {
    return { error: "expired" as const };
  }
  if (profile.settingsAccessExpiresAt.getTime() < Date.now()) {
    return { error: "expired" as const };
  }

  return { card, profile };
}

router.get("/settings/card/:cardCode", async (req, res): Promise<void> => {
  const p = CardParamsSchema.safeParse(req.params);
  const q = TokenQuerySchema.safeParse(req.query);
  if (!p.success || !q.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const auth = await authorizeCardSettings(p.data.cardCode, q.data.token);
  if (auth.error === "invalid") {
    res.status(404).json({ error: "invalid_token" });
    return;
  }
  if (auth.error === "expired") {
    res.status(403).json({ error: "token_expired" });
    return;
  }

  const { profile } = auth;
  res.status(200).json({
    id: profile.id,
    slug: profile.slug,
    businessName: profile.businessName,
    ownerName: profile.ownerName,
    jobTitle: profile.jobTitle,
    phone: profile.phone,
    externalContactUrl: profile.externalContactUrl,
    bookingUrl: profile.bookingUrl,
    customButtonLabel: profile.customButtonLabel,
    leadCaptureEnabled: profile.leadCaptureEnabled !== false,
    pricingItems: normalizePricingItems(profile.pricingItems),
    ownerEmail: profile.ownerEmail,
    address: profile.address,
    orderUrl: profile.orderUrl,
    instagram: profile.instagram,
    category: profile.category,
    shortBio: profile.shortBio,
    businessDescription: profile.businessDescription,
    profilePhotoUrl: profile.profilePhotoUrl,
    logoUrl: profile.logoUrl,
    bannerUrl: profile.bannerUrl,
    city: profile.city,
    galleryUrls: profile.galleryUrls,
    totalDeliveries: profile.totalDeliveries,
    totalClients: profile.totalClients,
    rating: profile.rating != null ? Number(profile.rating) : null,
    bannerColor: profile.bannerColor,
  });
});

router.patch("/settings/card/:cardCode", async (req, res): Promise<void> => {
  const p = CardParamsSchema.safeParse(req.params);
  const q = TokenQuerySchema.safeParse(req.query);
  if (!p.success || !q.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const body = SettingsCardPatchSchema.safeParse(req.body);
  if (!body.success) {
    const first = body.error.issues[0];
    res.status(400).json({
      error: "validation_error",
      message: first ? `${first.path.join(".")}: ${first.message}` : "Invalid body",
    });
    return;
  }

  const auth = await authorizeCardSettings(p.data.cardCode, q.data.token);
  if (auth.error === "invalid") {
    res.status(404).json({ error: "invalid_token" });
    return;
  }
  if (auth.error === "expired") {
    res.status(403).json({ error: "token_expired" });
    return;
  }

  const { profile } = auth;
  const payload = body.data;
  const updateData: Record<string, unknown> = {};
  if (payload.businessName !== undefined) updateData.businessName = payload.businessName.trim();
  if (payload.ownerName !== undefined) updateData.ownerName = payload.ownerName || null;
  if (payload.jobTitle !== undefined) updateData.jobTitle = payload.jobTitle || null;
  if (payload.phone !== undefined) updateData.phone = payload.phone || null;
  if (payload.externalContactUrl !== undefined) {
    const t = payload.externalContactUrl?.trim();
    updateData.externalContactUrl = t ? normalizeOptionalUrl(t) : null;
  } else if (payload.whatsapp !== undefined) {
    const t = payload.whatsapp?.trim();
    updateData.externalContactUrl = t ? normalizeOptionalUrl(t) : null;
  }
  if (payload.bookingUrl !== undefined) {
    const t = payload.bookingUrl?.trim();
    updateData.bookingUrl = t ? normalizeOptionalUrl(t) : null;
  }
  if (payload.customButtonLabel !== undefined)
    updateData.customButtonLabel = payload.customButtonLabel || null;
  if (payload.leadCaptureEnabled !== undefined)
    updateData.leadCaptureEnabled = payload.leadCaptureEnabled;
  if (payload.ownerEmail !== undefined) updateData.ownerEmail = payload.ownerEmail || null;
  if (payload.address !== undefined) updateData.address = payload.address || null;
  if (payload.orderUrl !== undefined) updateData.orderUrl = payload.orderUrl || null;
  if (payload.instagram !== undefined) updateData.instagram = payload.instagram || null;
  if (payload.category !== undefined) updateData.category = payload.category || null;
  if (payload.shortBio !== undefined) updateData.shortBio = payload.shortBio || null;
  if (payload.businessDescription !== undefined)
    updateData.businessDescription = payload.businessDescription || null;
  if (payload.profilePhotoUrl !== undefined)
    updateData.profilePhotoUrl = payload.profilePhotoUrl || null;
  if (payload.logoUrl !== undefined) updateData.logoUrl = payload.logoUrl || null;
  if (payload.bannerUrl !== undefined) updateData.bannerUrl = payload.bannerUrl || null;
  if (payload.city !== undefined) updateData.city = payload.city || null;
  if (payload.bannerColor !== undefined) updateData.bannerColor = payload.bannerColor;
  if (payload.galleryUrls !== undefined) updateData.galleryUrls = payload.galleryUrls;
  if (payload.totalDeliveries !== undefined)
    updateData.totalDeliveries = payload.totalDeliveries;
  if (payload.totalClients !== undefined) updateData.totalClients = payload.totalClients;
  if (payload.rating !== undefined)
    updateData.rating =
      payload.rating === null || payload.rating === undefined
        ? null
        : String(payload.rating);
  if (payload.pricingItems !== undefined) {
    updateData.pricingItems = normalizePricingItems(payload.pricingItems);
  }

  const [updated] = await db
    .update(profilesTable)
    .set(updateData)
    .where(eq(profilesTable.id, profile.id))
    .returning({
      id: profilesTable.id,
      slug: profilesTable.slug,
      businessName: profilesTable.businessName,
      ownerName: profilesTable.ownerName,
      jobTitle: profilesTable.jobTitle,
      phone: profilesTable.phone,
      externalContactUrl: profilesTable.externalContactUrl,
      bookingUrl: profilesTable.bookingUrl,
      customButtonLabel: profilesTable.customButtonLabel,
      leadCaptureEnabled: profilesTable.leadCaptureEnabled,
      pricingItems: profilesTable.pricingItems,
      ownerEmail: profilesTable.ownerEmail,
      address: profilesTable.address,
      orderUrl: profilesTable.orderUrl,
      instagram: profilesTable.instagram,
      category: profilesTable.category,
      shortBio: profilesTable.shortBio,
      businessDescription: profilesTable.businessDescription,
      profilePhotoUrl: profilesTable.profilePhotoUrl,
      logoUrl: profilesTable.logoUrl,
      bannerUrl: profilesTable.bannerUrl,
      city: profilesTable.city,
      galleryUrls: profilesTable.galleryUrls,
      totalDeliveries: profilesTable.totalDeliveries,
      totalClients: profilesTable.totalClients,
      rating: profilesTable.rating,
      bannerColor: profilesTable.bannerColor,
    });

  if (!updated) {
    res.status(404).json({ error: "profile_not_found" });
    return;
  }

  res.status(200).json(updated);
});

export default router;

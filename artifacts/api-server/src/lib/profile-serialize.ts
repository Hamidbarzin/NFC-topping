import type { Profile } from "@workspace/db";
import { pricingItemSchema, type PricingItem } from "@workspace/db/schema";

/** Normalize JSONB / legacy values to a clean URL list. */
export function normalizeGalleryUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
  }
  return [];
}

/** Normalize stored pricing JSON to valid items only. */
export function normalizePricingItems(raw: unknown): PricingItem[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: PricingItem[] = [];
  for (const item of raw) {
    const parsed = pricingItemSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function ratingToNumber(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function serializeProfileForClient(
  row: Profile,
  tapCount: number,
  mode: "public" | "admin" = "admin",
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    jobTitle: row.jobTitle ?? null,
    shortBio: row.shortBio ?? null,
    businessDescription: row.businessDescription ?? null,
    category: row.category ?? null,
    phone: row.phone ?? null,
    externalContactUrl: row.externalContactUrl ?? null,
    instagram: row.instagram ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    orderUrl: row.orderUrl ?? null,
    bookingUrl: row.bookingUrl ?? null,
    customButtonLabel: row.customButtonLabel ?? null,
    leadCaptureEnabled: row.leadCaptureEnabled ?? true,
    pricingItems: normalizePricingItems(row.pricingItems),
    profilePhotoUrl: row.profilePhotoUrl ?? null,
    logoUrl: row.logoUrl ?? null,
    bannerUrl: row.bannerUrl ?? null,
    resumeUrl: row.resumeUrl ?? null,
    bannerColor: row.bannerColor,
    galleryUrls: normalizeGalleryUrls(row.galleryUrls),
    totalDeliveries: row.totalDeliveries ?? 0,
    totalClients: row.totalClients ?? 0,
    rating: ratingToNumber(row.rating),
    isActive: row.isActive,
    isClaimed: row.isClaimed,
    plan: row.plan,
    creditBalance: row.creditBalance ?? null,
    creditAwardedAt: row.creditAwardedAt
      ? row.creditAwardedAt.toISOString()
      : null,
    creditExpiresAt: row.creditExpiresAt
      ? row.creditExpiresAt.toISOString()
      : null,
    creditNote: row.creditNote ?? null,
    ...(mode === "admin"
      ? {
          activationGiftAmount:
            row.activationGiftAmount != null
              ? String(row.activationGiftAmount)
              : null,
        }
      : {}),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    ownerEmail: row.ownerEmail ?? null,
    ownerName: row.ownerName ?? null,
    claimedAt: row.claimedAt ? row.claimedAt.toISOString() : null,
    tapCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  if (mode === "admin") {
    base.settingsAccessToken = row.settingsAccessToken ?? null;
    base.settingsAccessExpiresAt = row.settingsAccessExpiresAt
      ? row.settingsAccessExpiresAt.toISOString()
      : null;
    base.settingsAccessCreatedAt = row.settingsAccessCreatedAt
      ? row.settingsAccessCreatedAt.toISOString()
      : null;
  }

  return base;
}

import { Router, type IRouter } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  profilesTable,
  nfcCardsTable,
  analyticsTable,
  creditTransactionsTable,
} from "@workspace/db";
import { pricingItemSchema } from "@workspace/db/schema";
import { sendJsonError } from "../lib/errors";
import { normalizeCardCode } from "../lib/slug";
import { sendAdminActivationEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { resolveWelcomeCreditForActivation } from "../lib/credits";
import { normalizeOptionalUrl } from "../lib/url-normalize";
import { normalizePricingItems } from "../lib/profile-serialize";

const router: IRouter = Router();

const ActivateBodySchema = z.object({
  /** Optional; defaults to business name for owner display */
  full_name: z.string().optional().default(""),
  business_name: z.string().min(1, "business_name is required"),
  phone: z.string().min(3, "phone is required"),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  website: z.string().optional(),
  /** @deprecated use external_contact_url */
  whatsapp: z.string().optional(),
  external_contact_url: z.string().optional(),
  booking_url: z.string().optional(),
  custom_button_label: z.string().optional(),
  lead_capture_enabled: z.boolean().optional(),
  pricing_items: z.array(pricingItemSchema).optional(),
  instagram: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  job_title: z.string().optional(),
  profile_photo_url: z.string().optional(),
  banner_url: z.string().optional(),
  business_description: z.string().optional(),
  short_bio: z.string().optional(),
  password: z.string().optional(),
  logo_url: z.string().optional(),
  banner_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "banner_color must be a 6-digit hex color like #1a1a2e")
    .optional(),
});

function settingsAccessExpiry(from: Date): Date {
  const e = new Date(from);
  e.setDate(e.getDate() + 90);
  return e;
}

function slugifyBase(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 2 ? s : "profile";
}

function resolvePayload(resolved: {
  state: "new" | "active" | "suspended";
  slug: string | null;
}) {
  return {
    ...resolved,
    requiresSetup: resolved.state === "new",
  };
}

function resolveStateFromProfile(
  profile: typeof profilesTable.$inferSelect,
): {
  state: "new" | "active" | "suspended";
  slug: string | null;
} {
  if (!profile.isActive) {
    return { state: "suspended", slug: profile.slug };
  }
  if (profile.expiresAt && new Date(profile.expiresAt) < new Date()) {
    return { state: "suspended", slug: profile.slug };
  }
  if (!profile.isClaimed) {
    return { state: "new", slug: profile.slug };
  }
  return { state: "active", slug: profile.slug };
}

function welcomeCreditExpiry(from: Date): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + 30);
  return expires;
}

async function uniqueSlugInTx(
  tx: {
    select: typeof db.select;
    insert: typeof db.insert;
    update: typeof db.update;
    delete: typeof db.delete;
  },
  businessName: string,
): Promise<string> {
  const base = slugifyBase(businessName.trim() || "profile");
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const existing = await tx
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.slug, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function ensureNfcCardActivationRecordInTx(
  tx: {
    insert: typeof db.insert;
  },
  input: {
    cardCode: string;
    profileId: number;
    activatedAt: Date;
    settingsToken: string;
  },
): Promise<void> {
  const rows = await tx
    .insert(nfcCardsTable)
    .values({
      cardCode: input.cardCode,
      profileId: input.profileId,
      activatedAt: input.activatedAt,
      isCompleted: true,
      settingsToken: input.settingsToken,
    })
    .onConflictDoUpdate({
      target: nfcCardsTable.cardCode,
      set: {
        profileId: input.profileId,
        activatedAt: input.activatedAt,
        isCompleted: true,
        settingsToken: input.settingsToken,
      },
    })
    .returning({ id: nfcCardsTable.id });

  if (rows.length === 0) {
    throw new Error("nfc_card_activation_upsert_failed");
  }
}

router.get("/cards/:cardCode/resolve", async (req, res): Promise<void> => {
  const code = normalizeCardCode(req.params.cardCode ?? "");
  if (!code) {
    sendJsonError(res, 400, "cardCode is required");
    return;
  }

  logger.debug({ normalizedCode: code }, "cards resolve: normalized cardCode");

  // Primary: lower(trim(slug)) = normalizedCode
  const [profileBySlug] = await db
    .select()
    .from(profilesTable)
    .where(sql`lower(trim(${profilesTable.slug})) = ${code}`)
    .limit(1);

  logger.debug(
    {
      normalizedCode: code,
      profileBySlug: profileBySlug
        ? { id: profileBySlug.id, slug: profileBySlug.slug }
        : null,
    },
    "cards resolve: profile lookup (lower(trim(slug)) = normalizedCode)",
  );

  if (profileBySlug) {
    res.json(resolvePayload(resolveStateFromProfile(profileBySlug)));
    return;
  }

  // Fallback: physical NFC row in nfc_cards by card_code (may point to a profile by FK)
  const [card] = await db
    .select()
    .from(nfcCardsTable)
    .where(eq(nfcCardsTable.cardCode, code))
    .limit(1);

  logger.debug(
    {
      normalizedCode: code,
      nfcCard: card
        ? {
            id: card.id,
            cardCode: card.cardCode,
            profileId: card.profileId,
          }
        : null,
    },
    "cards resolve: nfc_cards fallback lookup",
  );

  if (!card) {
    logger.info(
      {
        normalizedCode: code,
        profileBySlug: null,
        nfcCard: null,
      },
      "cards resolve: 404 (no profile and no nfc_cards row)",
    );
    sendJsonError(res, 404, "Card not found");
    return;
  }

  if (card.isSuspended) {
    res.json(resolvePayload({ state: "suspended" as const, slug: null }));
    return;
  }

  if (card.profileId == null) {
    res.json(resolvePayload({ state: "new" as const, slug: null }));
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, card.profileId))
    .limit(1);

  if (!profile) {
    res.json(resolvePayload({ state: "new" as const, slug: null }));
    return;
  }

  res.json(resolvePayload(resolveStateFromProfile(profile)));
});

router.post("/cards/:cardCode/activate", async (req, res): Promise<void> => {
  const code = normalizeCardCode(req.params.cardCode ?? "");
  if (!code) {
    sendJsonError(res, 400, "cardCode is required");
    return;
  }

  const parsed = ActivateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendJsonError(res, 400, "Invalid activation payload", {
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten(),
    });
    return;
  }

  const b = parsed.data;
  const email = b.email?.trim() || "";
  const website = b.website?.trim() || "";
  const externalContactUrl =
    normalizeOptionalUrl(
      (b.external_contact_url?.trim() || b.whatsapp?.trim() || "") || undefined,
    ) || null;
  const bookingUrl =
    normalizeOptionalUrl(b.booking_url?.trim() || undefined) || null;
  const pricingItems = normalizePricingItems(b.pricing_items ?? []);
  const customButtonLabel = b.custom_button_label?.trim() || null;
  const leadCaptureEnabled = b.lead_capture_enabled ?? true;
  const instagram = b.instagram?.trim() || "";
  const address = b.address?.trim() || "";
  const city = b.city?.trim() || "";
  const category = b.category?.trim() || "";
  const jobTitle = b.job_title?.trim() || "";
  const profilePhotoUrl = b.profile_photo_url?.trim() || "";
  const bannerUrl = b.banner_url?.trim() || "";
  const businessDescription = b.business_description?.trim() || "";
  const shortBio = b.short_bio?.trim() || "";
  const ownerName = b.full_name.trim() || b.business_name;
  const bannerColor = b.banner_color ?? "#1a1a2e";

  try {
    const [profileBySlug] = await db
      .select()
      .from(profilesTable)
      .where(sql`lower(trim(${profilesTable.slug})) = ${code}`)
      .limit(1);

    if (profileBySlug) {
      if (profileBySlug.isClaimed) {
        sendJsonError(res, 409, "Card already activated");
        return;
      }
      if (!profileBySlug.isActive) {
        sendJsonError(res, 403, "Card is inactive");
        return;
      }
      if (
        profileBySlug.expiresAt &&
        new Date(profileBySlug.expiresAt) < new Date()
      ) {
        sendJsonError(res, 403, "Card has expired");
        return;
      }

      const now = new Date();
      const settingsToken = randomBytes(32).toString("hex");
      const settingsExp = settingsAccessExpiry(now);

      const [updated] = await db.transaction(async (tx) => {
        const shouldAwardWelcomeCredit = profileBySlug.creditAwardedAt == null;
        const welcome = shouldAwardWelcomeCredit
          ? resolveWelcomeCreditForActivation(profileBySlug)
          : null;
        const expiresAt = welcomeCreditExpiry(now);

        const [activated] = await tx
          .update(profilesTable)
          .set({
            businessName: b.business_name,
            ownerName,
            ownerEmail: email || null,
            phone: b.phone,
            externalContactUrl,
            bookingUrl,
            pricingItems,
            customButtonLabel,
            leadCaptureEnabled,
            jobTitle: jobTitle || null,
            instagram: instagram || null,
            address: address || null,
            city: city || null,
            orderUrl: website || null,
            profilePhotoUrl: profilePhotoUrl || null,
            bannerUrl: bannerUrl || null,
            businessDescription: businessDescription || null,
            category: category || null,
            shortBio: shortBio || null,
            logoUrl: b.logo_url?.trim() ?? profileBySlug.logoUrl,
            bannerColor,
            settingsAccessToken: settingsToken,
            settingsAccessCreatedAt: now,
            settingsAccessExpiresAt: settingsExp,
            isClaimed: true,
            claimedAt: now,
            isActive: true,
            ...(welcome
              ? {
                  creditBalance: welcome.amount,
                  creditAwardedAt: now,
                  creditExpiresAt: expiresAt,
                  creditNote: welcome.reason,
                  activationGiftAmount: null,
                }
              : shouldAwardWelcomeCredit
                ? { activationGiftAmount: null }
                : {}),
          })
          .where(eq(profilesTable.id, profileBySlug.id))
          .returning();

        if (!activated) {
          throw new Error("activation_failed");
        }

        if (welcome) {
          await tx.insert(creditTransactionsTable).values({
            id: randomUUID(),
            profileId: activated.id,
            type: "credit",
            amount: welcome.amount,
            balanceAfter: welcome.amount,
            reason: welcome.reason,
          });
        }

        await ensureNfcCardActivationRecordInTx(tx, {
          cardCode: code,
          profileId: activated.id,
          activatedAt: now,
          settingsToken,
        });

        return [activated];
      });

      if (!updated) {
        sendJsonError(res, 500, "Activation failed");
        return;
      }

      logger.info(
        { cardCode: code, slug: updated.slug },
        "Profile activated by cardCode/slug (no nfc_cards row required)",
      );

      void sendAdminActivationEmail({
        cardCode: code,
        fullName: ownerName,
        businessName: b.business_name,
        phone: b.phone,
        email,
        website,
        instagram,
        address,
        activatedAtIso: now.toISOString(),
      });

      res.status(201).json({
        success: true,
        slug: updated.slug,
        publicUrl: `/u/${updated.slug}`,
        settingsUrl: `/settings/${encodeURIComponent(code)}?token=${settingsToken}`,
      });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [card] = await tx
        .select()
        .from(nfcCardsTable)
        .where(eq(nfcCardsTable.cardCode, code))
        .limit(1);

      if (!card) {
        return { type: "not_found" as const };
      }

      if (card.isSuspended) {
        return { type: "suspended" as const };
      }

      const now = new Date();

      if (card.profileId == null) {
        const slug = await uniqueSlugInTx(tx, b.business_name);
        const welcomeExpiresAt = welcomeCreditExpiry(now);
        const settingsToken = randomBytes(32).toString("hex");
        const settingsExp = settingsAccessExpiry(now);
        const welcomeNew = resolveWelcomeCreditForActivation({
          activationGiftAmount: null,
        });
        if (!welcomeNew) {
          throw new Error("welcome_credit_resolve_failed");
        }

        const [created] = await tx
          .insert(profilesTable)
          .values({
            slug,
            businessName: b.business_name,
            ownerName,
            ownerEmail: email || null,
            phone: b.phone,
            externalContactUrl,
            bookingUrl,
            pricingItems,
            customButtonLabel,
            leadCaptureEnabled,
            jobTitle: jobTitle || null,
            category: category || null,
            shortBio: shortBio || null,
            businessDescription: businessDescription || null,
            orderUrl: website || null,
            instagram: instagram || null,
            address: address || null,
            city: city || null,
            profilePhotoUrl: profilePhotoUrl || null,
            bannerUrl: bannerUrl || null,
            logoUrl: b.logo_url?.trim() || null,
            bannerColor,
            settingsAccessToken: settingsToken,
            settingsAccessCreatedAt: now,
            settingsAccessExpiresAt: settingsExp,
            isActive: true,
            isClaimed: true,
            claimedAt: now,
            plan: "basic",
            creditBalance: welcomeNew.amount,
            creditAwardedAt: now,
            creditExpiresAt: welcomeExpiresAt,
            creditNote: welcomeNew.reason,
          })
          .returning();

        await tx.insert(creditTransactionsTable).values({
          id: randomUUID(),
          profileId: created.id,
          type: "credit",
          amount: welcomeNew.amount,
          balanceAfter: welcomeNew.amount,
          reason: welcomeNew.reason,
        });

        await tx
          .update(nfcCardsTable)
          .set({
            profileId: created.id,
            activatedAt: now,
            isCompleted: true,
            settingsToken,
          })
          .where(eq(nfcCardsTable.id, card.id));

        return {
          type: "ok" as const,
          slug: created.slug,
          activatedAt: now.toISOString(),
          settingsToken,
        };
      }

      const [profile] = await tx
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.id, card.profileId))
        .limit(1);

      if (!profile) {
        return { type: "not_found" as const };
      }

      if (profile.isClaimed) {
        return { type: "already_claimed" as const };
      }

      if (!profile.isActive) {
        return { type: "inactive" as const };
      }

      if (profile.expiresAt && new Date(profile.expiresAt) < now) {
        return { type: "expired" as const };
      }

      const shouldAwardWelcomeCredit = profile.creditAwardedAt == null;
      const welcome = shouldAwardWelcomeCredit
        ? resolveWelcomeCreditForActivation(profile)
        : null;
      const welcomeExpiresAt = welcomeCreditExpiry(now);
      const settingsToken = randomBytes(32).toString("hex");
      const settingsExp = settingsAccessExpiry(now);

      const [updated] = await tx
        .update(profilesTable)
        .set({
          businessName: b.business_name,
          ownerName,
          ownerEmail: email || null,
          phone: b.phone,
          externalContactUrl,
          bookingUrl,
          pricingItems,
          customButtonLabel,
          leadCaptureEnabled,
          jobTitle: jobTitle || null,
          category: category || null,
          shortBio: shortBio || null,
          businessDescription: businessDescription || null,
          orderUrl: website || null,
          instagram: instagram || null,
          address: address || null,
          city: city || null,
          profilePhotoUrl: profilePhotoUrl || null,
          bannerUrl: bannerUrl || null,
          logoUrl: b.logo_url?.trim() ?? profile.logoUrl,
          bannerColor,
          settingsAccessToken: settingsToken,
          settingsAccessCreatedAt: now,
          settingsAccessExpiresAt: settingsExp,
          isClaimed: true,
          claimedAt: now,
          ...(welcome
            ? {
                creditBalance: welcome.amount,
                creditAwardedAt: now,
                creditExpiresAt: welcomeExpiresAt,
                creditNote: welcome.reason,
                activationGiftAmount: null,
              }
            : shouldAwardWelcomeCredit
              ? { activationGiftAmount: null }
              : {}),
        })
        .where(eq(profilesTable.id, profile.id))
        .returning();

      if (updated && welcome) {
        await tx.insert(creditTransactionsTable).values({
          id: randomUUID(),
          profileId: updated.id,
          type: "credit",
          amount: welcome.amount,
          balanceAfter: welcome.amount,
          reason: welcome.reason,
        });
      }

      await tx
        .update(nfcCardsTable)
        .set({
          activatedAt: now,
          isCompleted: true,
          settingsToken,
        })
        .where(eq(nfcCardsTable.id, card.id));

      return {
        type: "ok" as const,
        slug: updated.slug,
        activatedAt: now.toISOString(),
        settingsToken,
      };
    });

    if (result.type === "not_found") {
      sendJsonError(res, 404, "Card not found");
      return;
    }
    if (result.type === "suspended") {
      sendJsonError(res, 403, "Card is suspended");
      return;
    }
    if (result.type === "already_claimed") {
      sendJsonError(res, 409, "Card already activated");
      return;
    }
    if (result.type === "inactive") {
      sendJsonError(res, 403, "Card is inactive");
      return;
    }
    if (result.type === "expired") {
      sendJsonError(res, 403, "Card has expired");
      return;
    }

    logger.info(
      { cardCode: code, slug: result.slug },
      "NFC card activation completed",
    );

    void sendAdminActivationEmail({
      cardCode: code,
      fullName: ownerName,
      businessName: b.business_name,
      phone: b.phone,
      email,
      website,
      instagram,
      address,
      activatedAtIso: result.activatedAt,
    });

    res.status(201).json({
      success: true,
      slug: result.slug,
      publicUrl: `/u/${result.slug}`,
      settingsUrl: `/settings/${encodeURIComponent(code)}?token=${result.settingsToken}`,
    });
  } catch (err) {
    logger.error({ err, cardCode: code }, "Activation transaction failed");
    sendJsonError(res, 500, "Activation failed");
  }
});

router.post("/cards/:cardCode/tap", async (req, res): Promise<void> => {
  const code = normalizeCardCode(req.params.cardCode ?? "");
  if (!code) {
    sendJsonError(res, 400, "cardCode is required");
    return;
  }

  const [profileBySlug] = await db
    .select({
      id: profilesTable.id,
      isClaimed: profilesTable.isClaimed,
      isActive: profilesTable.isActive,
      expiresAt: profilesTable.expiresAt,
    })
    .from(profilesTable)
    .where(sql`lower(trim(${profilesTable.slug})) = ${code}`)
    .limit(1);

  if (profileBySlug) {
    if (!profileBySlug.isClaimed) {
      sendJsonError(res, 404, "Profile not ready for taps");
      return;
    }
    if (
      !profileBySlug.isActive ||
      (profileBySlug.expiresAt && new Date(profileBySlug.expiresAt) < new Date())
    ) {
      sendJsonError(res, 403, "Profile is inactive");
      return;
    }

    const userAgent = req.headers["user-agent"] ?? null;
    const [tap] = await db
      .insert(analyticsTable)
      .values({
        profileId: profileBySlug.id,
        userAgent,
        country: null,
      })
      .returning();

    res.status(201).json({
      ...tap,
      tappedAt: tap.tappedAt.toISOString(),
    });
    return;
  }

  const [card] = await db
    .select()
    .from(nfcCardsTable)
    .where(eq(nfcCardsTable.cardCode, code))
    .limit(1);

  if (!card?.profileId) {
    sendJsonError(res, 404, "Profile not ready for taps");
    return;
  }
  if (card.isSuspended) {
    sendJsonError(res, 403, "Card is suspended");
    return;
  }

  const [profile] = await db
    .select({
      id: profilesTable.id,
      isClaimed: profilesTable.isClaimed,
      isActive: profilesTable.isActive,
      expiresAt: profilesTable.expiresAt,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, card.profileId))
    .limit(1);

  if (!profile?.isClaimed) {
    sendJsonError(res, 404, "Profile not ready for taps");
    return;
  }
  if (
    !profile.isActive ||
    (profile.expiresAt && new Date(profile.expiresAt) < new Date())
  ) {
    sendJsonError(res, 403, "Profile is inactive");
    return;
  }

  const userAgent = req.headers["user-agent"] ?? null;

  const [tap] = await db
    .insert(analyticsTable)
    .values({
      profileId: profile.id,
      userAgent,
      country: null,
    })
    .returning();

  res.status(201).json({
    ...tap,
    tappedAt: tap.tappedAt.toISOString(),
  });
});

export default router;

import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq, ilike, and, or, count, sql, desc } from "drizzle-orm";
import {
  db,
  profilesTable,
  analyticsTable,
  creditTransactionsTable,
} from "@workspace/db";
import {
  CreateProfileBody,
  UpdateProfileBody,
  UpdateProfileParams,
  DeleteProfileParams,
  ToggleProfileActiveParams,
  GetProfileBySlugParams,
  ListProfilesQueryParams,
  ListProfilesResponse,
  GetProfileAnalyticsParams,
  GetProfileAnalyticsQueryParams,
  RecordTapParams,
  GetProfileCreditLedgerParams,
  GetProfileCreditLedgerResponse,
  AdjustProfileCreditParams,
  AdjustProfileCreditBody,
} from "@workspace/api-zod";
import type { Profile } from "@workspace/db";
import { sendAdminActivationEmail } from "../lib/email";
import { serializeProfileForClient } from "../lib/profile-serialize";
import { resolveWelcomeCreditForActivation } from "../lib/credits";
import { normalizeOptionalUrl } from "../lib/url-normalize";
import { normalizePricingItems } from "../lib/profile-serialize";

const router: IRouter = Router();

function welcomeCreditExpiry(from: Date): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + 30);
  return expires;
}

router.get("/profiles", async (req, res): Promise<void> => {
  const query = ListProfilesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, plan, isActive } = query.data;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(profilesTable.businessName, `%${search}%`),
        ilike(profilesTable.ownerName, `%${search}%`),
        ilike(profilesTable.slug, `%${search}%`),
        ilike(profilesTable.phone, `%${search}%`),
        ilike(profilesTable.jobTitle, `%${search}%`),
      ),
    );
  }
  if (plan) {
    conditions.push(eq(profilesTable.plan, plan));
  }
  if (isActive !== undefined) {
    conditions.push(eq(profilesTable.isActive, isActive));
  }

  const profiles = await db
    .select({
      id: profilesTable.id,
      slug: profilesTable.slug,
      businessName: profilesTable.businessName,
      jobTitle: profilesTable.jobTitle,
      shortBio: profilesTable.shortBio,
      businessDescription: profilesTable.businessDescription,
      category: profilesTable.category,
      phone: profilesTable.phone,
      externalContactUrl: profilesTable.externalContactUrl,
      instagram: profilesTable.instagram,
      address: profilesTable.address,
      city: profilesTable.city,
      orderUrl: profilesTable.orderUrl,
      bookingUrl: profilesTable.bookingUrl,
      customButtonLabel: profilesTable.customButtonLabel,
      leadCaptureEnabled: profilesTable.leadCaptureEnabled,
      pricingItems: profilesTable.pricingItems,
      profilePhotoUrl: profilesTable.profilePhotoUrl,
      logoUrl: profilesTable.logoUrl,
      bannerUrl: profilesTable.bannerUrl,
      resumeUrl: profilesTable.resumeUrl,
      bannerColor: profilesTable.bannerColor,
      galleryUrls: profilesTable.galleryUrls,
      totalDeliveries: profilesTable.totalDeliveries,
      totalClients: profilesTable.totalClients,
      rating: profilesTable.rating,
      isActive: profilesTable.isActive,
      isClaimed: profilesTable.isClaimed,
      claimedAt: profilesTable.claimedAt,
      plan: profilesTable.plan,
      creditBalance: profilesTable.creditBalance,
      creditAwardedAt: profilesTable.creditAwardedAt,
      creditExpiresAt: profilesTable.creditExpiresAt,
      creditNote: profilesTable.creditNote,
      activationGiftAmount: profilesTable.activationGiftAmount,
      settingsAccessToken: profilesTable.settingsAccessToken,
      settingsAccessExpiresAt: profilesTable.settingsAccessExpiresAt,
      settingsAccessCreatedAt: profilesTable.settingsAccessCreatedAt,
      expiresAt: profilesTable.expiresAt,
      ownerEmail: profilesTable.ownerEmail,
      ownerName: profilesTable.ownerName,
      createdAt: profilesTable.createdAt,
      updatedAt: profilesTable.updatedAt,
      tapCount: count(analyticsTable.id),
    })
    .from(profilesTable)
    .leftJoin(analyticsTable, eq(analyticsTable.profileId, profilesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(profilesTable.id)
    .orderBy(profilesTable.createdAt);

  const formatted = profiles.map((p) => {
    const taps = Number(p.tapCount);
    const { tapCount: _tc, ...row } = p;
    return serializeProfileForClient(row as Profile, taps, "admin");
  });

  res.json(ListProfilesResponse.parse(formatted));
});

router.post("/profiles", async (req, res): Promise<void> => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.slug, parsed.data.slug));

  if (existing.length > 0) {
    res.status(409).json({ error: "Slug already taken" });
    return;
  }

  const [profile] = await db
    .insert(profilesTable)
    .values({
      slug: parsed.data.slug,
      businessName: parsed.data.businessName,
      jobTitle: parsed.data.jobTitle ?? null,
      shortBio: parsed.data.shortBio ?? null,
      businessDescription: parsed.data.businessDescription ?? null,
      category: parsed.data.category ?? null,
      phone: parsed.data.phone ?? null,
      externalContactUrl: parsed.data.externalContactUrl ?? null,
      instagram: parsed.data.instagram ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      orderUrl: parsed.data.orderUrl ?? null,
      bookingUrl: parsed.data.bookingUrl ?? null,
      customButtonLabel: parsed.data.customButtonLabel ?? null,
      leadCaptureEnabled: parsed.data.leadCaptureEnabled ?? true,
      pricingItems: parsed.data.pricingItems ?? [],
      profilePhotoUrl: parsed.data.profilePhotoUrl ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
      bannerUrl: parsed.data.bannerUrl ?? null,
      resumeUrl:
        typeof req.body?.resumeUrl === "string" ? req.body.resumeUrl : null,
      bannerColor: parsed.data.bannerColor ?? "#1a1a2e",
      galleryUrls: parsed.data.galleryUrls ?? [],
      totalDeliveries: parsed.data.totalDeliveries ?? 0,
      totalClients: parsed.data.totalClients ?? 0,
      rating:
        parsed.data.rating != null ? String(parsed.data.rating) : null,
      plan: parsed.data.plan ?? "basic",
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      ownerEmail: parsed.data.ownerEmail ?? null,
      ownerName: parsed.data.ownerName ?? null,
      ...(parsed.data.activationGiftAmount !== undefined
        ? {
            activationGiftAmount:
              parsed.data.activationGiftAmount === null
                ? null
                : (() => {
                    const n = Number(parsed.data.activationGiftAmount);
                    return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : null;
                  })(),
          }
        : {}),
    })
    .returning();

  res
    .status(201)
    .json(serializeProfileForClient(profile, 0, "admin"));
});

router.get("/profiles/:id/analytics", async (req, res): Promise<void> => {
  const params = GetProfileAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const queryParams = GetProfileAnalyticsQueryParams.safeParse(req.query);
  const days = queryParams.success ? (queryParams.data.days ?? 30) : 30;

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const taps = await db
    .select()
    .from(analyticsTable)
    .where(
      and(
        eq(analyticsTable.profileId, params.data.id),
        sql`${analyticsTable.tappedAt} >= ${cutoff}`,
      ),
    )
    .orderBy(analyticsTable.tappedAt);

  const tapsByDayMap = new Map<string, number>();
  for (const tap of taps) {
    const date = tap.tappedAt.toISOString().slice(0, 10);
    tapsByDayMap.set(date, (tapsByDayMap.get(date) ?? 0) + 1);
  }

  const tapsByDay = Array.from(tapsByDayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const totalRows = await db
    .select({ c: count() })
    .from(analyticsTable)
    .where(eq(analyticsTable.profileId, params.data.id));

  const recentTaps = taps.slice(-20).map((t) => ({
    ...t,
    tappedAt: t.tappedAt.toISOString(),
  }));

  res.json({
    totalTaps: Number(totalRows[0]?.c ?? 0),
    tapsByDay,
    recentTaps,
  });
});

router.get("/profiles/:id/credit-ledger", async (req, res): Promise<void> => {
  const params = GetProfileCreditLedgerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const txs = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.profileId, params.data.id))
    .orderBy(desc(creditTransactionsTable.createdAt));

  let totalCredited = 0;
  let totalDebited = 0;
  for (const t of txs) {
    const a = Number(t.amount);
    if (t.type === "credit") totalCredited += a;
    else totalDebited += a;
  }

  const payload = {
    transactions: txs.map((t) => ({
      id: t.id,
      profileId: t.profileId,
      type: t.type,
      amount: String(t.amount),
      balanceAfter: String(t.balanceAfter),
      reason: t.reason,
      createdAt: t.createdAt.toISOString(),
    })),
    totalCredited: totalCredited.toFixed(2),
    totalDebited: totalDebited.toFixed(2),
  };

  res.json(GetProfileCreditLedgerResponse.parse(payload));
});

router.get("/profiles/:slug", async (req, res): Promise<void> => {
  const params = GetProfileBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db
    .select({
      id: profilesTable.id,
      slug: profilesTable.slug,
      businessName: profilesTable.businessName,
      jobTitle: profilesTable.jobTitle,
      shortBio: profilesTable.shortBio,
      businessDescription: profilesTable.businessDescription,
      category: profilesTable.category,
      phone: profilesTable.phone,
      externalContactUrl: profilesTable.externalContactUrl,
      instagram: profilesTable.instagram,
      address: profilesTable.address,
      city: profilesTable.city,
      orderUrl: profilesTable.orderUrl,
      bookingUrl: profilesTable.bookingUrl,
      customButtonLabel: profilesTable.customButtonLabel,
      leadCaptureEnabled: profilesTable.leadCaptureEnabled,
      pricingItems: profilesTable.pricingItems,
      profilePhotoUrl: profilesTable.profilePhotoUrl,
      logoUrl: profilesTable.logoUrl,
      bannerUrl: profilesTable.bannerUrl,
      resumeUrl: profilesTable.resumeUrl,
      bannerColor: profilesTable.bannerColor,
      galleryUrls: profilesTable.galleryUrls,
      totalDeliveries: profilesTable.totalDeliveries,
      totalClients: profilesTable.totalClients,
      rating: profilesTable.rating,
      isActive: profilesTable.isActive,
      isClaimed: profilesTable.isClaimed,
      claimedAt: profilesTable.claimedAt,
      plan: profilesTable.plan,
      creditBalance: profilesTable.creditBalance,
      creditAwardedAt: profilesTable.creditAwardedAt,
      creditExpiresAt: profilesTable.creditExpiresAt,
      creditNote: profilesTable.creditNote,
      activationGiftAmount: profilesTable.activationGiftAmount,
      expiresAt: profilesTable.expiresAt,
      ownerEmail: profilesTable.ownerEmail,
      ownerName: profilesTable.ownerName,
      createdAt: profilesTable.createdAt,
      updatedAt: profilesTable.updatedAt,
      tapCount: count(analyticsTable.id),
    })
    .from(profilesTable)
    .leftJoin(analyticsTable, eq(analyticsTable.profileId, profilesTable.id))
    .where(eq(profilesTable.slug, params.data.slug))
    .groupBy(profilesTable.id);

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (!profile.isActive) {
    res.status(403).json({ error: "Card is inactive" });
    return;
  }

  if (profile.expiresAt && new Date(profile.expiresAt) < new Date()) {
    res.status(403).json({ error: "Card has expired" });
    return;
  }

  const taps = Number(profile.tapCount);
  const { tapCount: _tc, ...row } = profile;
  res.json(serializeProfileForClient(row as Profile, taps, "public"));
});

router.post("/profiles/:slug/activate", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const {
    businessName,
    ownerName,
    ownerEmail,
    jobTitle,
    shortBio,
    businessDescription,
    phone,
    whatsapp,
    externalContactUrl,
    bookingUrl,
    customButtonLabel,
    leadCaptureEnabled,
    pricingItems,
    instagram,
    address,
    orderUrl,
    category,
    bannerColor,
    profilePhotoUrl,
    bannerUrl,
    logoUrl,
    resumeUrl,
  } = req.body;

  if (!businessName || !ownerName || !phone) {
    res.status(400).json({ error: "businessName, ownerName, and phone are required" });
    return;
  }

  const [profile] = await db
    .select({
      id: profilesTable.id,
      isClaimed: profilesTable.isClaimed,
      isActive: profilesTable.isActive,
      creditAwardedAt: profilesTable.creditAwardedAt,
      activationGiftAmount: profilesTable.activationGiftAmount,
    })
    .from(profilesTable)
    .where(eq(profilesTable.slug, slug));

  if (!profile) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  if (!profile.isActive) {
    res.status(403).json({ error: "Card is inactive" });
    return;
  }

  if (profile.isClaimed) {
    res.status(409).json({ error: "Card already activated" });
    return;
  }

  const claimedAt = new Date();
  const shouldAwardWelcomeCredit = profile.creditAwardedAt == null;
  const welcome = shouldAwardWelcomeCredit
    ? resolveWelcomeCreditForActivation(profile)
    : null;
  const creditExpiresAt = welcomeCreditExpiry(claimedAt);

  const [updated] = await db
    .update(profilesTable)
    .set({
      businessName,
      ownerName,
      ownerEmail: ownerEmail ?? null,
      phone,
      externalContactUrl:
        normalizeOptionalUrl(
          typeof externalContactUrl === "string" ? externalContactUrl : undefined,
        ) ??
        normalizeOptionalUrl(typeof whatsapp === "string" ? whatsapp : undefined),
      bookingUrl: normalizeOptionalUrl(
        typeof bookingUrl === "string" ? bookingUrl : undefined,
      ),
      customButtonLabel:
        typeof customButtonLabel === "string" ? customButtonLabel.trim() || null : null,
      leadCaptureEnabled:
        typeof leadCaptureEnabled === "boolean" ? leadCaptureEnabled : true,
      pricingItems: Array.isArray(pricingItems)
        ? normalizePricingItems(pricingItems)
        : [],
      jobTitle: jobTitle ?? null,
      shortBio: shortBio ?? null,
      businessDescription: businessDescription ?? null,
      instagram: instagram ?? null,
      address: address ?? null,
      orderUrl: typeof orderUrl === "string" ? orderUrl : null,
      category: category ?? null,
      profilePhotoUrl: typeof profilePhotoUrl === "string" ? profilePhotoUrl : null,
      bannerUrl: typeof bannerUrl === "string" ? bannerUrl : null,
      logoUrl: typeof logoUrl === "string" ? logoUrl : null,
      resumeUrl: typeof resumeUrl === "string" ? resumeUrl : null,
      bannerColor: bannerColor ?? "#1a1a2e",
      isClaimed: true,
      claimedAt,
      ...(welcome
        ? {
            creditBalance: welcome.amount,
            creditAwardedAt: claimedAt,
            creditExpiresAt,
            creditNote: welcome.reason,
            activationGiftAmount: null,
          }
        : shouldAwardWelcomeCredit
          ? { activationGiftAmount: null }
          : {}),
    })
    .where(eq(profilesTable.id, profile.id))
    .returning();

  if (welcome) {
    await db.insert(creditTransactionsTable).values({
      id: randomUUID(),
      profileId: updated.id,
      type: "credit",
      amount: welcome.amount,
      balanceAfter: welcome.amount,
      reason: welcome.reason,
    });
  }

  void sendAdminActivationEmail({
    cardCode: slug,
    fullName: ownerName,
    businessName,
    phone,
    email: typeof ownerEmail === "string" ? ownerEmail : "",
    website: typeof orderUrl === "string" ? orderUrl : "",
    instagram: typeof instagram === "string" ? instagram : "",
    address: typeof address === "string" ? address : "",
    activatedAtIso: claimedAt.toISOString(),
  });

  res.status(200).json({
    ...updated,
    isClaimed: updated.isClaimed,
    claimedAt: updated.claimedAt ? updated.claimedAt.toISOString() : null,
    creditAwardedAt: updated.creditAwardedAt
      ? updated.creditAwardedAt.toISOString()
      : null,
    creditExpiresAt: updated.creditExpiresAt
      ? updated.creditExpiresAt.toISOString()
      : null,
    expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.patch("/profiles/:id", async (req, res): Promise<void> => {
  const params = UpdateProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.activationGiftAmount !== undefined) {
    const [cur] = await db
      .select({ isClaimed: profilesTable.isClaimed })
      .from(profilesTable)
      .where(eq(profilesTable.id, params.data.id));
    if (!cur) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    if (cur.isClaimed) {
      res.status(400).json({
        error:
          "activationGiftAmount can only be set before the customer activates the card.",
      });
      return;
    }
  }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.businessName !== undefined) updateData.businessName = d.businessName;
  if (d.jobTitle !== undefined) updateData.jobTitle = d.jobTitle;
  if (d.shortBio !== undefined) updateData.shortBio = d.shortBio;
  if (d.businessDescription !== undefined)
    updateData.businessDescription = d.businessDescription;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.externalContactUrl !== undefined) {
    updateData.externalContactUrl =
      d.externalContactUrl === null || d.externalContactUrl === ""
        ? null
        : normalizeOptionalUrl(d.externalContactUrl);
  }
  if (d.bookingUrl !== undefined) {
    updateData.bookingUrl =
      d.bookingUrl === null || d.bookingUrl === ""
        ? null
        : normalizeOptionalUrl(d.bookingUrl);
  }
  if (d.pricingItems !== undefined) {
    updateData.pricingItems = normalizePricingItems(d.pricingItems);
  }
  if (d.customButtonLabel !== undefined)
    updateData.customButtonLabel = d.customButtonLabel || null;
  if (d.leadCaptureEnabled !== undefined)
    updateData.leadCaptureEnabled = d.leadCaptureEnabled;
  if (d.instagram !== undefined) updateData.instagram = d.instagram;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.city !== undefined) updateData.city = d.city;
  if (d.orderUrl !== undefined) updateData.orderUrl = d.orderUrl;
  if (d.profilePhotoUrl !== undefined)
    updateData.profilePhotoUrl = d.profilePhotoUrl || null;
  if (d.logoUrl !== undefined) updateData.logoUrl = d.logoUrl || null;
  if (d.bannerUrl !== undefined) updateData.bannerUrl = d.bannerUrl || null;
  if (typeof req.body?.resumeUrl === "string")
    updateData.resumeUrl = req.body.resumeUrl;
  if (req.body?.resumeUrl === null || req.body?.resumeUrl === "")
    updateData.resumeUrl = null;
  if (d.bannerColor !== undefined) updateData.bannerColor = d.bannerColor;
  if (d.galleryUrls !== undefined) updateData.galleryUrls = d.galleryUrls;
  if (d.totalDeliveries !== undefined)
    updateData.totalDeliveries = d.totalDeliveries;
  if (d.totalClients !== undefined) updateData.totalClients = d.totalClients;
  if (d.rating !== undefined)
    updateData.rating =
      d.rating === null || d.rating === undefined ? null : String(d.rating);
  if (d.isActive !== undefined) updateData.isActive = d.isActive;
  if (d.plan !== undefined) updateData.plan = d.plan;
  if (d.expiresAt !== undefined)
    updateData.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.ownerEmail !== undefined) updateData.ownerEmail = d.ownerEmail;
  if (d.ownerName !== undefined) updateData.ownerName = d.ownerName;
  if (d.activationGiftAmount !== undefined) {
    if (d.activationGiftAmount === null) {
      updateData.activationGiftAmount = null;
    } else {
      const n = Number(d.activationGiftAmount);
      if (!Number.isFinite(n) || n < 0) {
        res.status(400).json({
          error: "activationGiftAmount must be a non-negative number or null",
        });
        return;
      }
      updateData.activationGiftAmount = n.toFixed(2);
    }
  }

  const [updated] = await db
    .update(profilesTable)
    .set(updateData)
    .where(eq(profilesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const tapRows = await db
    .select({ c: count() })
    .from(analyticsTable)
    .where(eq(analyticsTable.profileId, updated.id));

  res.json(
    serializeProfileForClient(
      updated,
      Number(tapRows[0]?.c ?? 0),
      "admin",
    ),
  );
});

router.post("/profiles/:id/credit-adjust", async (req, res): Promise<void> => {
  const params = AdjustProfileCreditParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdjustProfileCreditBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const amountNumber = body.data.amount;
  if (!Number.isFinite(amountNumber) || amountNumber === 0) {
    res.status(400).json({ error: "amount must be a non-zero number" });
    return;
  }

  const [profile] = await db
    .select({
      id: profilesTable.id,
      creditBalance: profilesTable.creditBalance,
      creditExpiresAt: profilesTable.creditExpiresAt,
    })
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const now = new Date();
  const currentBalance = Number(profile.creditBalance ?? 0);
  const effectiveBalance =
    profile.creditExpiresAt && new Date(profile.creditExpiresAt) < now
      ? 0
      : currentBalance;
  const nextBalance = Number((effectiveBalance + amountNumber).toFixed(2));

  if (nextBalance < 0) {
    res.status(400).json({ error: "insufficient credit balance" });
    return;
  }

  const shouldSetExpiryFromPayload = body.data.creditExpiresAt !== undefined;
  const nextCreditExpiresAt = shouldSetExpiryFromPayload
    ? body.data.creditExpiresAt
      ? new Date(body.data.creditExpiresAt)
      : null
    : profile.creditExpiresAt;

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(profilesTable)
      .set({
        creditBalance: nextBalance.toFixed(2),
        creditExpiresAt: nextCreditExpiresAt,
        creditNote:
          body.data.reason ??
          (amountNumber > 0
            ? "Admin credit adjustment"
            : "Admin debit adjustment"),
      })
      .where(eq(profilesTable.id, profile.id))
      .returning();

    await tx.insert(creditTransactionsTable).values({
      id: randomUUID(),
      profileId: row.id,
      type: amountNumber > 0 ? "credit" : "debit",
      amount: Math.abs(amountNumber).toFixed(2),
      balanceAfter: nextBalance.toFixed(2),
      reason:
        body.data.reason ??
        (amountNumber > 0
          ? "Admin credit adjustment"
          : "Admin debit adjustment"),
    });

    return [row];
  });

  const tapRows = await db
    .select({ c: count() })
    .from(analyticsTable)
    .where(eq(analyticsTable.profileId, updated.id));

  res.status(200).json(
    serializeProfileForClient(
      updated,
      Number(tapRows[0]?.c ?? 0),
      "admin",
    ),
  );
});

router.delete("/profiles/:id", async (req, res): Promise<void> => {
  const params = DeleteProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(profilesTable)
    .where(eq(profilesTable.id, params.data.id))
    .returning({ id: profilesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/profiles/:id/toggle-active", async (req, res): Promise<void> => {
  const params = ToggleProfileActiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [current] = await db
    .select({ isActive: profilesTable.isActive })
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.id));

  if (!current) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [updated] = await db
    .update(profilesTable)
    .set({ isActive: !current.isActive })
    .where(eq(profilesTable.id, params.data.id))
    .returning();

  const tapRows = await db
    .select({ c: count() })
    .from(analyticsTable)
    .where(eq(analyticsTable.profileId, updated.id));

  res.json(
    serializeProfileForClient(
      updated,
      Number(tapRows[0]?.c ?? 0),
      "admin",
    ),
  );
});

router.post("/profiles/:slug/tap", async (req, res): Promise<void> => {
  const params = RecordTapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.slug, params.data.slug));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
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

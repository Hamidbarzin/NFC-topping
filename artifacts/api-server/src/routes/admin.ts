import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { eq, count, sql, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, profilesTable, analyticsTable, nfcCardsTable, leadsTable } from "@workspace/db";
import { GetRecentTapsQueryParams } from "@workspace/api-zod";
import { sendJsonError } from "../lib/errors";
import { normalizeCardCode } from "../lib/slug";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CreateNfcCardBodySchema = z.object({
  cardCode: z.string().min(3).max(128).optional(),
  profileId: z.number().int().positive().optional(),
  adminNote: z.string().max(2000).optional(),
  isWritten: z.boolean().optional(),
});

const PatchNfcCardBodySchema = z.object({
  isWritten: z.boolean().optional(),
  adminNote: z.union([z.string().max(2000), z.null()]).optional(),
  isSuspended: z.boolean().optional(),
});

const NfcCardIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const AdminProfileParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

function deriveCardStatus(card: {
  isSuspended: boolean;
  isCompleted: boolean;
  profileIsActive: boolean | null;
}): "active" | "inactive" | "suspended" {
  if (card.isSuspended) return "suspended";
  if (!card.isCompleted) return "inactive";
  if (card.profileIsActive === false) return "inactive";
  return "active";
}

async function generateNextCardCode(): Promise<string> {
  const [row] = await db
    .select({
      next: sql<number>`COALESCE(MAX(NULLIF(regexp_replace(${nfcCardsTable.cardCode}, '[^0-9]', '', 'g'), '')::int), 1000) + 1`,
    })
    .from(nfcCardsTable);
  const next = Math.max(1001, Number(row?.next ?? 1001));
  return `c${next}`;
}

router.get("/admin/nfc-cards", async (req, res): Promise<void> => {
  const baseUrlRaw =
    process.env.PUBLIC_APP_URL?.trim() ||
    `${req.protocol}://${req.get("host") ?? ""}`;
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  try {
    const rows = await db
      .select({
        id: nfcCardsTable.id,
        cardCode: nfcCardsTable.cardCode,
        profileId: nfcCardsTable.profileId,
        isCompleted: nfcCardsTable.isCompleted,
        isWritten: nfcCardsTable.isWritten,
        isSuspended: nfcCardsTable.isSuspended,
        adminNote: nfcCardsTable.adminNote,
        settingsToken: nfcCardsTable.settingsToken,
        activatedAt: nfcCardsTable.activatedAt,
        createdAt: nfcCardsTable.createdAt,
        profileSlug: profilesTable.slug,
        profileBusinessName: profilesTable.businessName,
        profileIsActive: profilesTable.isActive,
      })
      .from(nfcCardsTable)
      .leftJoin(profilesTable, eq(profilesTable.id, nfcCardsTable.profileId))
      .orderBy(desc(nfcCardsTable.createdAt));

    logger.info({ rowCount: rows.length }, "admin nfc-cards list ok");

    res.status(200).json(
      rows.map((r) => {
        const status = deriveCardStatus({
          isSuspended: r.isSuspended,
          isCompleted: r.isCompleted,
          profileIsActive: r.profileIsActive,
        });
        const nfcUrl = `${baseUrl}/c/${encodeURIComponent(r.cardCode)}`;
        const setupUrl = `${baseUrl}/setup/${encodeURIComponent(r.cardCode)}`;
        const publicUrl =
          r.isCompleted && r.profileSlug
            ? `${baseUrl}/u/${encodeURIComponent(r.profileSlug)}`
            : null;
        const settingsUrl =
          r.settingsToken != null
            ? `${baseUrl}/settings/${encodeURIComponent(r.cardCode)}?token=${r.settingsToken}`
            : null;

        return {
          id: r.id,
          code: r.cardCode,
          profileId: r.profileId,
          slug: r.profileSlug,
          businessName: r.profileBusinessName,
          isCompleted: r.isCompleted,
          isWritten: r.isWritten,
          status,
          adminNote: r.adminNote,
          createdAt: r.createdAt.toISOString(),
          activatedAt: r.activatedAt?.toISOString() ?? null,
          nfcUrl,
          setupUrl,
          publicUrl,
          settingsUrl,
        };
      }),
    );
  } catch (err: unknown) {
    const pgCode =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : undefined;
    const pgMessage =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    logger.error(
      { err, pgCode, pgMessage, route: "GET /api/admin/nfc-cards" },
      "admin nfc-cards list query failed",
    );
    const expose =
      process.env.EXPOSE_ADMIN_DB_ERRORS === "1" || process.env.NODE_ENV !== "production";
    res.status(500).json({
      error: "nfc_cards_list_failed",
      code: pgCode ?? "UNKNOWN",
      ...(expose
        ? { message: pgMessage }
        : {
            message:
              "Database query failed. Check server logs. Set EXPOSE_ADMIN_DB_ERRORS=1 to include PostgreSQL text in this response (debug only).",
          }),
    });
  }
});

router.post("/admin/nfc-cards", async (req, res): Promise<void> => {
  const parsed = CreateNfcCardBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendJsonError(res, 400, "Invalid request body", {
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const profileId = parsed.data.profileId;
    const requestedCode = parsed.data.cardCode
      ? normalizeCardCode(parsed.data.cardCode)
      : "";

    if (parsed.data.cardCode && !requestedCode) {
      sendJsonError(res, 400, "Invalid cardCode");
      return;
    }

    if (profileId != null) {
      const [p] = await db
        .select({ id: profilesTable.id })
        .from(profilesTable)
        .where(eq(profilesTable.id, profileId))
        .limit(1);
      if (!p) {
        sendJsonError(res, 404, "Profile not found");
        return;
      }
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const cardCode = requestedCode || (await generateNextCardCode());
      try {
        const [created] = await db
          .insert(nfcCardsTable)
          .values({
            cardCode,
            profileId: profileId ?? null,
            isSuspended: false,
            isWritten: parsed.data.isWritten ?? false,
            adminNote: parsed.data.adminNote?.trim() || null,
          })
          .returning();

        logger.info({ cardCode, id: created.id }, "NFC card record created");

        res.status(201).json({
          id: created.id,
          cardCode: created.cardCode,
          profileId: created.profileId,
          isSuspended: created.isSuspended,
          isCompleted: created.isCompleted,
          isWritten: created.isWritten,
          adminNote: created.adminNote,
          createdAt: created.createdAt.toISOString(),
        });
        return;
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "23505" && !requestedCode) {
          lastError = err;
          continue;
        }
        if (code === "23505") {
          sendJsonError(res, 409, "cardCode already exists");
          return;
        }
        throw err;
      }
    }

    logger.error({ err: lastError }, "Failed to generate unique card code");
    sendJsonError(res, 500, "Could not generate unique card code");
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "23505") {
      sendJsonError(res, 409, "cardCode already exists");
      return;
    }
    const pgMessage =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    logger.error({ err, pgCode: code, pgMessage }, "Failed to create NFC card");
    const expose =
      process.env.EXPOSE_ADMIN_DB_ERRORS === "1" || process.env.NODE_ENV !== "production";
    sendJsonError(
      res,
      500,
      expose
        ? `Could not create NFC card: ${pgMessage}`
        : "Could not create NFC card",
      { code: code || "UNKNOWN" },
    );
  }
});

router.get("/admin/stats", async (req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [profileAgg] = await db
    .select({
      totalCards: sql<number>`count(*)`,
      activeCards: sql<number>`count(*) FILTER (WHERE ${profilesTable.isActive} = true)`,
      inactiveCards: sql<number>`count(*) FILTER (WHERE ${profilesTable.isActive} = false)`,
      basicCount: sql<number>`count(*) FILTER (WHERE ${profilesTable.plan} = 'basic')`,
      proCount: sql<number>`count(*) FILTER (WHERE ${profilesTable.plan} = 'pro')`,
      businessCount: sql<number>`count(*) FILTER (WHERE ${profilesTable.plan} = 'business')`,
      expiringThisWeek: sql<number>`count(*) FILTER (WHERE ${profilesTable.expiresAt} IS NOT NULL AND ${profilesTable.expiresAt} <= ${sevenDaysFromNow} AND ${profilesTable.expiresAt} >= NOW())`,
    })
    .from(profilesTable);

  const [tapAgg] = await db
    .select({
      totalTaps: sql<number>`count(*)`,
      tapsLast30Days: sql<number>`count(*) FILTER (WHERE ${analyticsTable.tappedAt} >= ${thirtyDaysAgo})`,
    })
    .from(analyticsTable);

  const [leadAgg] = await db
    .select({
      totalLeads: sql<number>`count(*)`,
      leadsLast30Days: sql<number>`count(*) FILTER (WHERE ${leadsTable.createdAt} >= ${thirtyDaysAgo})`,
    })
    .from(leadsTable);

  res.json({
    totalCards: Number(profileAgg?.totalCards ?? 0),
    activeCards: Number(profileAgg?.activeCards ?? 0),
    inactiveCards: Number(profileAgg?.inactiveCards ?? 0),
    totalTaps: Number(tapAgg?.totalTaps ?? 0),
    tapsLast30Days: Number(tapAgg?.tapsLast30Days ?? 0),
    totalLeads: Number(leadAgg?.totalLeads ?? 0),
    leadsLast30Days: Number(leadAgg?.leadsLast30Days ?? 0),
    byPlan: {
      basic: Number(profileAgg?.basicCount ?? 0),
      pro: Number(profileAgg?.proCount ?? 0),
      business: Number(profileAgg?.businessCount ?? 0),
    },
    expiringThisWeek: Number(profileAgg?.expiringThisWeek ?? 0),
  });
});

router.get("/admin/recent-taps", async (req, res): Promise<void> => {
  const query = GetRecentTapsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 20) : 20;

  const taps = await db
    .select({
      id: analyticsTable.id,
      profileId: analyticsTable.profileId,
      tappedAt: analyticsTable.tappedAt,
      userAgent: analyticsTable.userAgent,
      country: analyticsTable.country,
      profileSlug: profilesTable.slug,
      businessName: profilesTable.businessName,
    })
    .from(analyticsTable)
    .innerJoin(profilesTable, eq(profilesTable.id, analyticsTable.profileId))
    .orderBy(sql`${analyticsTable.tappedAt} DESC`)
    .limit(limit);

  res.json(
    taps.map((t) => ({
      ...t,
      tappedAt: t.tappedAt.toISOString(),
    }))
  );
});

router.get("/admin/expiring-soon", async (req, res): Promise<void> => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const profiles = await db
    .select({
      id: profilesTable.id,
      slug: profilesTable.slug,
      businessName: profilesTable.businessName,
      category: profilesTable.category,
      phone: profilesTable.phone,
      externalContactUrl: profilesTable.externalContactUrl,
      instagram: profilesTable.instagram,
      address: profilesTable.address,
      orderUrl: profilesTable.orderUrl,
      logoUrl: profilesTable.logoUrl,
      bannerColor: profilesTable.bannerColor,
      isActive: profilesTable.isActive,
      plan: profilesTable.plan,
      expiresAt: profilesTable.expiresAt,
      ownerEmail: profilesTable.ownerEmail,
      ownerName: profilesTable.ownerName,
      createdAt: profilesTable.createdAt,
      tapCount: count(analyticsTable.id),
    })
    .from(profilesTable)
    .leftJoin(analyticsTable, eq(analyticsTable.profileId, profilesTable.id))
    .where(
      and(
        sql`${profilesTable.expiresAt} IS NOT NULL`,
        sql`${profilesTable.expiresAt} <= ${sevenDaysFromNow}`,
        sql`${profilesTable.expiresAt} >= NOW()`
      )
    )
    .groupBy(profilesTable.id)
    .orderBy(profilesTable.expiresAt);

  res.json(
    profiles.map((p) => ({
      ...p,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      tapCount: Number(p.tapCount),
    }))
  );
});

router.patch("/admin/nfc-cards/:id", async (req, res): Promise<void> => {
  const params = NfcCardIdParamsSchema.safeParse(req.params);
  const body = PatchNfcCardBodySchema.safeParse(req.body);
  if (!params.success) {
    sendJsonError(res, 400, "Invalid card id", {
      code: "VALIDATION_ERROR",
      details: params.error.flatten(),
    });
    return;
  }
  if (!body.success) {
    sendJsonError(res, 400, "Invalid request body", {
      code: "VALIDATION_ERROR",
      details: body.error.flatten(),
    });
    return;
  }

  const patch: Partial<typeof nfcCardsTable.$inferInsert> = {};
  if (body.data.isWritten !== undefined) patch.isWritten = body.data.isWritten;
  if (body.data.isSuspended !== undefined) patch.isSuspended = body.data.isSuspended;
  if (body.data.adminNote !== undefined) {
    patch.adminNote =
      body.data.adminNote === null ? null : body.data.adminNote.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    sendJsonError(res, 400, "No fields to update");
    return;
  }

  const [updated] = await db
    .update(nfcCardsTable)
    .set(patch)
    .where(eq(nfcCardsTable.id, params.data.id))
    .returning();

  if (!updated) {
    sendJsonError(res, 404, "NFC card not found");
    return;
  }

  res.status(200).json({
    id: updated.id,
    cardCode: updated.cardCode,
    profileId: updated.profileId,
    isSuspended: updated.isSuspended,
    isCompleted: updated.isCompleted,
    isWritten: updated.isWritten,
    adminNote: updated.adminNote,
    activatedAt: updated.activatedAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.post("/admin/profiles/:id/generate-settings-link", async (req, res): Promise<void> => {
  const params = AdminProfileParamsSchema.safeParse(req.params);
  if (!params.success) {
    sendJsonError(res, 400, "Invalid profile id");
    return;
  }

  const profileId = params.data.id;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  const baseUrlRaw =
    process.env.PUBLIC_APP_URL?.trim() ||
    `${req.protocol}://${req.get("host") ?? ""}`;
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = randomBytes(32).toString("hex");
    try {
      const updated = await db.transaction(async (tx) => {
        const [profileUpdated] = await tx
          .update(profilesTable)
          .set({
            settingsAccessToken: token,
            settingsAccessCreatedAt: now,
            settingsAccessExpiresAt: expiresAt,
          })
          .where(eq(profilesTable.id, profileId))
          .returning({ id: profilesTable.id });
        if (!profileUpdated) return null;

        await tx
          .update(nfcCardsTable)
          .set({
            settingsToken: token,
          })
          .where(eq(nfcCardsTable.profileId, profileId));

        return profileUpdated;
      });

      if (!updated) {
        sendJsonError(res, 404, "Profile not found");
        return;
      }

      res.status(200).json({
        success: true,
        settingsUrl: `${baseUrl}/client-access/${token}`,
        expiresAt: expiresAt.toISOString(),
      });
      return;
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "23505") {
        continue;
      }
      logger.error({ err, profileId }, "Failed to generate customer settings link");
      sendJsonError(res, 500, "Could not generate settings link");
      return;
    }
  }

  sendJsonError(res, 500, "Could not generate unique settings link token");
});

export default router;

import { Router, type IRouter } from "express";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import { db, leadsTable, profilesTable } from "@workspace/db";

const router: IRouter = Router();

const LeadStatusSchema = z.enum(["new", "contacted", "won", "lost"]);

const SubmitLeadBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  message: z.string().trim().max(4000).optional().nullable(),
  serviceInterest: z.string().trim().max(255).optional().nullable(),
  sourceCardCode: z.string().trim().max(128).optional().nullable(),
});

const ListLeadsQuerySchema = z.object({
  profileId: z.coerce.number().int().positive().optional(),
  status: LeadStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const PatchLeadParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const PatchLeadBodySchema = z.object({
  status: LeadStatusSchema.optional(),
  notes: z.string().max(5000).nullable().optional(),
});

router.post("/profiles/:slug/leads", async (req, res): Promise<void> => {
  const slug = String(req.params.slug ?? "").trim();
  if (!slug) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const body = SubmitLeadBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const payload = body.data;
  if (!payload.phone?.trim() && !payload.email?.trim()) {
    res.status(400).json({ error: "Phone or email is required" });
    return;
  }

  const [profile] = await db
    .select({ id: profilesTable.id, isActive: profilesTable.isActive, leadCaptureEnabled: profilesTable.leadCaptureEnabled })
    .from(profilesTable)
    .where(eq(profilesTable.slug, slug));

  if (!profile || !profile.isActive) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (profile.leadCaptureEnabled === false) {
    res.status(403).json({ error: "Lead capture disabled" });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      profileId: profile.id,
      sourceCardCode: payload.sourceCardCode?.trim() || null,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      message: payload.message?.trim() || null,
      serviceInterest: payload.serviceInterest?.trim() || null,
      status: "new",
      notes: null,
    })
    .returning();

  res.status(201).json({
    id: lead.id,
    profileId: lead.profileId,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
  });
});

router.get("/admin/leads", async (req, res): Promise<void> => {
  const q = ListLeadsQuerySchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { profileId, status, search, limit } = q.data;

  const where = and(
    profileId ? eq(leadsTable.profileId, profileId) : undefined,
    status ? eq(leadsTable.status, status) : undefined,
    search
      ? ilike(leadsTable.name, `%${search}%`)
      : undefined,
  );

  const rows = await db
    .select({
      id: leadsTable.id,
      profileId: leadsTable.profileId,
      sourceCardCode: leadsTable.sourceCardCode,
      name: leadsTable.name,
      phone: leadsTable.phone,
      email: leadsTable.email,
      message: leadsTable.message,
      serviceInterest: leadsTable.serviceInterest,
      status: leadsTable.status,
      notes: leadsTable.notes,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
      profileSlug: profilesTable.slug,
      businessName: profilesTable.businessName,
    })
    .from(leadsTable)
    .innerJoin(profilesTable, eq(profilesTable.id, leadsTable.profileId))
    .where(where)
    .orderBy(desc(leadsTable.createdAt))
    .limit(limit);

  const totalRow = await db.select({ c: count() }).from(leadsTable);

  res.json({
    total: Number(totalRow[0]?.c ?? 0),
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
});

router.patch("/admin/leads/:id", async (req, res): Promise<void> => {
  const p = PatchLeadParamsSchema.safeParse(req.params);
  const b = PatchLeadBodySchema.safeParse(req.body);
  if (!p.success || !b.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (b.data.status !== undefined) patch.status = b.data.status;
  if (b.data.notes !== undefined) patch.notes = b.data.notes || null;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(leadsTable)
    .set(patch)
    .where(eq(leadsTable.id, p.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json({
    id: updated.id,
    status: updated.status,
    notes: updated.notes,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;

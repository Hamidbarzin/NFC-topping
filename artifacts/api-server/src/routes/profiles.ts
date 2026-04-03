import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, creditsTable } from "@workspace/db";
import { GetPublicProfileParams, UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/:username", async (req, res): Promise<void> => {
  const params = GetPublicProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, params.data.username));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));

  res.json({
    name: user.name,
    businessName: user.businessName,
    phone: user.phone,
    email: user.email,
    username: user.username,
    website: profile?.website ?? null,
    instagram: profile?.instagram ?? null,
    whatsapp: profile?.whatsapp ?? null,
    bio: profile?.bio ?? null,
    logo: profile?.logo ?? null,
  });
});

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({
    id: profile.id,
    userId: profile.userId,
    website: profile.website,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp,
    bio: profile.bio,
    logo: profile.logo,
    updatedAt: profile.updatedAt.toISOString(),
  });
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { name, businessName, phone, website, instagram, whatsapp, bio, logo } = body.data;

  if (name || businessName || phone) {
    await db.update(usersTable)
      .set({
        ...(name ? { name } : {}),
        ...(businessName ? { businessName } : {}),
        ...(phone ? { phone } : {}),
      })
      .where(eq(usersTable.id, userId));
  }

  const [updatedProfile] = await db.update(profilesTable)
    .set({
      ...(website !== undefined ? { website } : {}),
      ...(instagram !== undefined ? { instagram } : {}),
      ...(whatsapp !== undefined ? { whatsapp } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(logo !== undefined ? { logo } : {}),
    })
    .where(eq(profilesTable.userId, userId))
    .returning();

  if (!updatedProfile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({
    id: updatedProfile.id,
    userId: updatedProfile.userId,
    website: updatedProfile.website,
    instagram: updatedProfile.instagram,
    whatsapp: updatedProfile.whatsapp,
    bio: updatedProfile.bio,
    logo: updatedProfile.logo,
    updatedAt: updatedProfile.updatedAt.toISOString(),
  });
});

export default router;

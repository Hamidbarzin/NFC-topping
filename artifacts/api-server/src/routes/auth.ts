import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, creditsTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { generateToken, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { email, password } = body.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, user.id));
  const [credit] = await db.select().from(creditsTable).where(eq(creditsTable.userId, user.id));

  const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      businessName: user.businessName,
      phone: user.phone,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      profile: profile ? {
        id: profile.id,
        userId: profile.userId,
        website: profile.website,
        instagram: profile.instagram,
        whatsapp: profile.whatsapp,
        bio: profile.bio,
        logo: profile.logo,
        updatedAt: profile.updatedAt.toISOString(),
      } : null,
      credits: credit ? {
        id: credit.id,
        userId: credit.userId,
        total: credit.total,
        used: credit.used,
        available: credit.total - credit.used,
      } : null,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const [credit] = await db.select().from(creditsTable).where(eq(creditsTable.userId, userId));

  res.json({
    id: user.id,
    name: user.name,
    businessName: user.businessName,
    phone: user.phone,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    profile: profile ? {
      id: profile.id,
      userId: profile.userId,
      website: profile.website,
      instagram: profile.instagram,
      whatsapp: profile.whatsapp,
      bio: profile.bio,
      logo: profile.logo,
      updatedAt: profile.updatedAt.toISOString(),
    } : null,
    credits: credit ? {
      id: credit.id,
      userId: credit.userId,
      total: credit.total,
      used: credit.used,
      available: credit.total - credit.used,
    } : null,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

export default router;

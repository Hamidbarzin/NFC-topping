import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, cardsTable, usersTable, profilesTable, creditsTable } from "@workspace/db";
import { GetCardParams, ActivateCardBody, ActivateCardParams } from "@workspace/api-zod";
import { generateToken } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/cards/:code", async (req, res): Promise<void> => {
  const params = GetCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.cardCode, params.data.code));

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json({
    id: card.id,
    cardCode: card.cardCode,
    status: card.status,
    userId: card.userId,
    createdAt: card.createdAt.toISOString(),
  });
});

router.post("/cards/:code/activate", async (req, res): Promise<void> => {
  const params = ActivateCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ActivateCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.cardCode, params.data.code));

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  if (card.status === "active") {
    res.status(400).json({ error: "Card is already activated" });
    return;
  }

  const { name, businessName, phone, email, password, username } = body.data;

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [existingUsername] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    name,
    businessName,
    phone,
    email,
    username,
    passwordHash,
    isAdmin: false,
  }).returning();

  const [profile] = await db.insert(profilesTable).values({
    userId: user.id,
  }).returning();

  const [credit] = await db.insert(creditsTable).values({
    userId: user.id,
    total: 40,
    used: 0,
  }).returning();

  await db.update(cardsTable)
    .set({ status: "active", userId: user.id })
    .where(eq(cardsTable.id, card.id));

  const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });

  res.status(201).json({
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
      profile: {
        id: profile.id,
        userId: profile.userId,
        website: profile.website,
        instagram: profile.instagram,
        whatsapp: profile.whatsapp,
        bio: profile.bio,
        logo: profile.logo,
        updatedAt: profile.updatedAt.toISOString(),
      },
      credits: {
        id: credit.id,
        userId: credit.userId,
        total: credit.total,
        used: credit.used,
        available: credit.total - credit.used,
      },
    },
  });
});

export default router;

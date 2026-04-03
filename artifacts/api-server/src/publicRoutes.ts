import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, cardsTable, usersTable, profilesTable, creditsTable } from "@workspace/db";
import { ActivateCardBody, GetCardParams } from "@workspace/api-zod";
import { generateToken } from "./middlewares/auth";

const router = Router();

// MVP public routes:
// - GET /card/:code -> redirect to activation or public profile
// - POST /register -> activate card (create user/profile, bind to card) then redirect

router.get("/card/:code", async (req, res): Promise<void> => {
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
    res.status(404).send("Card not found");
    return;
  }

  // Not registered yet -> activate page
  if (card.userId === null) {
    res.redirect(302, `/activate/${card.cardCode}`);
    return;
  }

  // Registered -> public profile page
  const [user] = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, card.userId));

  if (!user) {
    // Data inconsistency: user removed but card still references userId.
    res.redirect(302, `/activate/${card.cardCode}`);
    return;
  }

  res.redirect(302, `/u/${user.username}`);
});

router.post("/register", async (req, res): Promise<void> => {
  const rawCode = req.body?.code;
  if (typeof rawCode !== "string" || rawCode.trim().length === 0) {
    res.status(400).json({ error: "Missing/invalid code" });
    return;
  }
  const code = rawCode.trim();

  const body = ActivateCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.cardCode, code));

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  if (card.status === "active" && card.userId !== null) {
    const [existingUser] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, card.userId));

    const redirectTo = existingUser?.username
      ? `/u/${existingUser.username}`
      : `/activate/${card.cardCode}`;

    if (req.accepts(["html", "json"]) === "html") {
      res.redirect(302, redirectTo);
      return;
    }

    res.status(200).json({ redirectTo });
    return;
  }

  const { name, businessName, phone, email, password, username } = body.data;

  // Basic uniqueness validation (matches existing activation logic)
  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      businessName,
      phone,
      email,
      username,
      passwordHash,
      isAdmin: false,
    })
    .returning();

  await db.insert(profilesTable).values({ userId: user.id }).returning();

  const [credit] = await db
    .insert(creditsTable)
    .values({
      userId: user.id,
      total: 40,
      used: 0,
    })
    .returning();

  await db
    .update(cardsTable)
    .set({ status: "active", userId: user.id })
    .where(eq(cardsTable.id, card.id));

  const token = generateToken({ userId: user.id, isAdmin: user.isAdmin });

  const redirectTo = `/u/${user.username}`;

  if (req.accepts(["html", "json"]) === "html") {
    res.redirect(302, redirectTo);
    return;
  }

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
      credits: {
        id: credit.id,
        userId: credit.userId,
        total: credit.total,
        used: credit.used,
        available: credit.total - credit.used,
      },
    },
    redirectTo,
  });
});

export default router;


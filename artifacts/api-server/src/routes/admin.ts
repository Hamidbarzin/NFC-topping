import { Router, type IRouter } from "express";
import { eq, count, sum } from "drizzle-orm";
import { db, usersTable, cardsTable, creditsTable } from "@workspace/db";
import { AdminCreateCardBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  const credits = await db.select().from(creditsTable);
  const creditMap = new Map(credits.map(c => [c.userId, c]));

  const result = users.map(user => {
    const credit = creditMap.get(user.id);
    return {
      id: user.id,
      name: user.name,
      businessName: user.businessName,
      email: user.email,
      username: user.username,
      phone: user.phone,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      totalCredit: credit?.total ?? 0,
      usedCredit: credit?.used ?? 0,
    };
  });

  res.json(result);
});

router.get("/admin/cards", requireAdmin, async (req, res): Promise<void> => {
  const cards = await db.select().from(cardsTable).orderBy(cardsTable.createdAt);

  const result = cards.map(card => ({
    id: card.id,
    cardCode: card.cardCode,
    status: card.status,
    userId: card.userId,
    createdAt: card.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/admin/cards", requireAdmin, async (req, res): Promise<void> => {
  const body = AdminCreateCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(cardsTable).where(eq(cardsTable.cardCode, body.data.cardCode));
  if (existing) {
    res.status(400).json({ error: "Card code already exists" });
    return;
  }

  const [card] = await db.insert(cardsTable).values({
    cardCode: body.data.cardCode,
    status: "new",
  }).returning();

  res.status(201).json({
    id: card.id,
    cardCode: card.cardCode,
    status: card.status,
    userId: card.userId,
    createdAt: card.createdAt.toISOString(),
  });
});

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [userCountResult] = await db.select({ count: count() }).from(usersTable);
  const [cardCountResult] = await db.select({ count: count() }).from(cardsTable);

  const cards = await db.select().from(cardsTable);
  const activeCards = cards.filter(c => c.status === "active").length;
  const newCards = cards.filter(c => c.status === "new").length;

  const credits = await db.select().from(creditsTable);
  const totalCreditsIssued = credits.reduce((sum, c) => sum + c.total, 0);

  res.json({
    totalUsers: userCountResult.count,
    totalCards: cardCountResult.count,
    activeCards,
    newCards,
    totalCreditsIssued,
  });
});

export default router;

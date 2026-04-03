import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, creditsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/credits", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [credit] = await db.select().from(creditsTable).where(eq(creditsTable.userId, userId));

  if (!credit) {
    res.status(404).json({ error: "Credits not found" });
    return;
  }

  res.json({
    id: credit.id,
    userId: credit.userId,
    total: credit.total,
    used: credit.used,
    available: credit.total - credit.used,
  });
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { sendJsonError } from "../lib/errors";

const router: IRouter = Router();

router.get("/public/profiles/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug?.trim();
  if (!slug) {
    sendJsonError(res, 400, "slug is required");
    return;
  }

  const [profile] = await db
    .select({
      slug: profilesTable.slug,
      businessName: profilesTable.businessName,
      category: profilesTable.category,
      phone: profilesTable.phone,
      externalContactUrl: profilesTable.externalContactUrl,
      bookingUrl: profilesTable.bookingUrl,
      instagram: profilesTable.instagram,
      address: profilesTable.address,
      orderUrl: profilesTable.orderUrl,
      logoUrl: profilesTable.logoUrl,
      bannerColor: profilesTable.bannerColor,
      ownerName: profilesTable.ownerName,
      ownerEmail: profilesTable.ownerEmail,
      isActive: profilesTable.isActive,
      isClaimed: profilesTable.isClaimed,
      expiresAt: profilesTable.expiresAt,
    })
    .from(profilesTable)
    .where(eq(profilesTable.slug, slug))
    .limit(1);

  if (!profile) {
    sendJsonError(res, 404, "Profile not found");
    return;
  }

  if (!profile.isActive || !profile.isClaimed) {
    sendJsonError(res, 404, "Profile not found");
    return;
  }

  if (profile.expiresAt && new Date(profile.expiresAt) < new Date()) {
    sendJsonError(res, 404, "Profile not found");
    return;
  }

  res.json({
    slug: profile.slug,
    businessName: profile.businessName,
    category: profile.category,
    phone: profile.phone,
    externalContactUrl: profile.externalContactUrl,
    bookingUrl: profile.bookingUrl,
    instagram: profile.instagram,
    address: profile.address,
    website: profile.orderUrl,
    logoUrl: profile.logoUrl,
    bannerColor: profile.bannerColor,
    ownerName: profile.ownerName,
    ownerEmail: profile.ownerEmail,
  });
});

export default router;

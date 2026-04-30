import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const analyticsTable = pgTable("analytics", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  tappedAt: timestamp("tapped_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  userAgent: text("user_agent"),
  country: text("country"),
});

export const insertAnalyticsSchema = createInsertSchema(analyticsTable).omit({
  id: true,
  tappedAt: true,
});
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analyticsTable.$inferSelect;

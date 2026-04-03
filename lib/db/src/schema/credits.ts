import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const creditsTable = pgTable("credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  total: integer("total").notNull().default(40),
  used: integer("used").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCreditSchema = createInsertSchema(creditsTable).omit({ id: true, updatedAt: true });
export type InsertCredit = z.infer<typeof insertCreditSchema>;
export type Credit = typeof creditsTable.$inferSelect;

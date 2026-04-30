import {
  pgTable,
  text,
  serial,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const nfcCardsTable = pgTable("nfc_cards", {
  id: serial("id").primaryKey(),
  cardCode: text("card_code").notNull().unique(),
  profileId: integer("profile_id").references(() => profilesTable.id, {
    onDelete: "set null",
  }),
  isCompleted: boolean("is_completed").notNull().default(false),
  isWritten: boolean("is_written").notNull().default(false),
  adminNote: text("admin_note"),
  settingsToken: text("settings_token").unique(),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
});

export const insertNfcCardSchema = createInsertSchema(nfcCardsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNfcCard = z.infer<typeof insertNfcCardSchema>;
export type NfcCard = typeof nfcCardsTable.$inferSelect;

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

export const leadStatusEnum = z.enum(["new", "contacted", "won", "lost"]);
export type LeadStatus = z.infer<typeof leadStatusEnum>;

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  sourceCardCode: text("source_card_code"),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  message: text("message"),
  serviceInterest: text("service_interest"),
  status: text("status").$type<LeadStatus>().notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

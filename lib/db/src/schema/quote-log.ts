import { pgTable, text, real, doublePrecision, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const quoteLogTable = pgTable("quote_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobName: text("job_name").notNull(),
  jobAddress: text("job_address"),
  destLat: doublePrecision("dest_lat").notNull(),
  destLng: doublePrecision("dest_lng").notNull(),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  isIntercompany: text("is_intercompany").notNull().default("N"),
  pitId: uuid("pit_id").notNull(),
  pitNameSnapshot: text("pit_name_snapshot").notNull(),
  loads: integer("loads").notNull(),
  hourlyRateType: text("hourly_rate_type").notNull(),
  marginType: text("margin_type").notNull(),
  pricePerLoad: real("price_per_load").notNull(),
  grandTotal: real("grand_total").notNull(),
  status: text("status").notNull().default("quoted"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type QuoteLogRow = typeof quoteLogTable.$inferSelect;
export type NewQuoteLog = typeof quoteLogTable.$inferInsert;

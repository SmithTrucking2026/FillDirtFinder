import { pgTable, text, real, doublePrecision, timestamp, uuid } from "drizzle-orm/pg-core";

export const pitsTable = pgTable("pits", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  materialType: text("material_type").notNull(),
  pricePerLoad: real("price_per_load").notNull(),
  smithPrice: real("smith_price"),
  notes: text("notes"),
  countyTaxRate: real("county_tax_rate").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PitRow = typeof pitsTable.$inferSelect;
export type NewPit = typeof pitsTable.$inferInsert;

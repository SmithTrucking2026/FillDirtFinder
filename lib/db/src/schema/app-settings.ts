import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: text("id").primaryKey(),
  massGradeRate: real("mass_grade_rate").notNull(),
  regularRate: real("regular_rate").notNull(),
  hourlyRate: real("hourly_rate").notNull().default(100),
  externalMargin: real("external_margin").notNull(),
  intercoMargin: real("interco_margin").notNull(),
  avgSpeedMph: real("avg_speed_mph").notNull(),
  loadBufferMinutes: real("load_buffer_minutes").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppSettingsRow = typeof appSettingsTable.$inferSelect;

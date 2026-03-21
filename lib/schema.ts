import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plushies = sqliteTable("plushies", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  birthday: text().notNull(), // ISO date string: YYYY-MM-DD
  origin: text(),
  notes: text(),
  photoPath: text("photo_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Plushie = typeof plushies.$inferSelect;
export type NewPlushie = typeof plushies.$inferInsert;

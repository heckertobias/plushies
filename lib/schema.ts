import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: int().primaryKey({ autoIncrement: true }),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: text("created_at").notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

/** Generic key-value store for small pieces of app state (e.g. scheduler bookkeeping). */
export const appState = sqliteTable("app_state", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export type AppState = typeof appState.$inferSelect;

export const plushies = sqliteTable("plushies", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  birthday: text().notNull(), // ISO date string: YYYY-MM-DD
  origin: text(),
  notes: text(),
  photoPath: text("photo_path"),
  originalPhotoPath: text("original_photo_path"),
  tags: text(), // JSON array of strings
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type Plushie = typeof plushies.$inferSelect;
export type NewPlushie = typeof plushies.$inferInsert;

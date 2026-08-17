import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Physical QR checkpoints installed in AB-4. Managed from the admin dashboard. */
export const qrPoints = pgTable("qr_points", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  floor: text("floor").notNull(), // floor id, e.g. "ab4-1"
  node: text("node").notNull(), // navigation graph node id
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** One row per navigation session start — powers usage analytics. */
export const scanEvents = pgTable("scan_events", {
  id: serial("id").primaryKey(),
  qrCode: text("qr_code").notNull(),
  destId: text("dest_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QrPointRow = typeof qrPoints.$inferSelect;
export type NewQrPoint = typeof qrPoints.$inferInsert;

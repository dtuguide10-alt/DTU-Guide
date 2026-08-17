import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { qrPoints, scanEvents } from "@/lib/db/schema";

export type QrPointDTO = { code: string; name: string; floor: string; node: string };

function assertAdmin(password: string) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected || password !== expected) {
    throw new Error("Unauthorized");
  }
}

/** Public: all checkpoints (used by the app + admin). */
export const getQrPoints = createServerFn({ method: "GET" }).handler(async (): Promise<QrPointDTO[]> => {
  const db = await getDb();
  const rows = await db.select().from(qrPoints).orderBy(qrPoints.code);
  return rows.map((r) => ({ code: r.code, name: r.name, floor: r.floor, node: r.node }));
});

const upsertSchema = z.object({
  password: z.string(),
  original: z.string().optional(), // existing code when editing
  code: z.string().min(1),
  name: z.string().min(1),
  floor: z.string().min(1),
  node: z.string().min(1),
});

/** Admin: create or update a checkpoint. */
export const saveQrPoint = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof upsertSchema>) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const db = await getDb();
    const values = { code: data.code, name: data.name, floor: data.floor, node: data.node, updatedAt: new Date() };
    if (data.original && data.original !== data.code) {
      await db.update(qrPoints).set(values).where(eq(qrPoints.code, data.original));
    } else {
      await db
        .insert(qrPoints)
        .values(values)
        .onConflictDoUpdate({ target: qrPoints.code, set: values });
    }
    return { ok: true };
  });

const deleteSchema = z.object({ password: z.string(), code: z.string() });

/** Admin: delete a checkpoint. */
export const deleteQrPoint = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof deleteSchema>) => deleteSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const db = await getDb();
    await db.delete(qrPoints).where(eq(qrPoints.code, data.code));
    return { ok: true };
  });

const checkSchema = z.object({ password: z.string() });

/** Admin: verify the password (for the login gate). */
export const checkAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof checkSchema>) => checkSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    return { ok: true };
  });

const scanSchema = z.object({ qrCode: z.string(), destId: z.string().optional() });

/** Log a navigation session start (fire-and-forget analytics). */
export const logScan = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof scanSchema>) => scanSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await getDb();
    await db.insert(scanEvents).values({ qrCode: data.qrCode, destId: data.destId ?? null });
    return { ok: true };
  });

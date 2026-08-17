import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazily-created, server-only database client (Neon over HTTP — works on Vercel
 * serverless and locally). The driver is imported dynamically and nothing runs
 * at module load, so this file is safe even if it is ever pulled into a client
 * bundle. Only call `getDb()` from server functions / route loaders.
 */
let client: NeonHttpDatabase<typeof schema> | null = null;

export async function getDb() {
  if (client) return client;
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env (see README).");
  const [{ drizzle }, { neon }] = await Promise.all([
    import("drizzle-orm/neon-http"),
    import("@neondatabase/serverless"),
  ]);
  client = drizzle(neon(url), { schema });
  return client;
}

export { schema };

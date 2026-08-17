import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Server-only database client (Neon over HTTP — works on Vercel serverless and
 * locally). Never import this from client components; only from server
 * functions / route loaders.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env (see README).");
}

export const db = drizzle(neon(connectionString), { schema });
export { schema };

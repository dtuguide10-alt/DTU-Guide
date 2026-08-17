/**
 * Seeds the qr_points table from the bundled checkpoint list.
 * Run with:  bun run db:seed
 */
import { db } from "./index";
import { qrPoints } from "./schema";
import { QR_POINTS } from "../nav/qr";

const rows = QR_POINTS.map((q) => ({
  code: q.code,
  name: q.name,
  floor: q.floor,
  node: q.node,
}));

await db.delete(qrPoints);
await db.insert(qrPoints).values(rows);

console.log(`✓ Seeded ${rows.length} QR checkpoints into the database.`);
process.exit(0);

import dotenv from "dotenv";
import { createPool } from "./connect";

dotenv.config({ path: ".env.local" });
dotenv.config();

/** CP1 の肝: 「DSQL に繋がって読めるか」を実機で証明する。 */
async function main() {
  console.log("Connecting to Aurora DSQL...");
  console.log("  PGHOST    :", process.env.PGHOST || "(missing)");
  console.log("  AWS_REGION:", process.env.AWS_REGION || "(missing)");

  const pool = createPool();
  const client = await pool.connect();
  try {
    const ping = await client.query("SELECT 1 AS ok, now() AS server_time");
    console.log("OK - DSQL connection succeeded:", ping.rows[0]);

    for (const t of ["products", "inventory", "orders"]) {
      try {
        const c = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
        console.log(`  ${t}: ${c.rows[0].n} rows`);
      } catch {
        console.log(`  ${t}: (table not found - run db:migrate first)`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAILED - DSQL connection error:", e?.message || e);
  process.exit(1);
});

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createPool } from "./connect";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * DSQL 向けマイグレーション実行。
 * - db/migrations/*.sql を名前順に適用。
 * - DSQL は 1 トランザクション 1 DDL のため、空行で区切った文を 1 つずつ BEGIN/COMMIT で流す。
 * - migrations テーブルで適用済みを記録し、再実行を防ぐ。
 */
async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id integer PRIMARY KEY,
        name text NOT NULL,
        executed_at bigint
      )
    `);

    const dir = path.join(process.cwd(), "db", "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const done = await client.query(
        "SELECT name FROM migrations WHERE name = $1",
        [file],
      );
      if (done.rows.length > 0) continue;

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      const statements = sql
        .split("\n\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.query("BEGIN");
          await client.query(statement);
          await client.query("COMMIT");
        } catch (err: unknown) {
          await client.query("ROLLBACK");
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("already exists")) {
            console.log("  skip (already exists)");
          } else {
            throw err;
          }
        }
      }

      const next = await client.query(
        "SELECT COALESCE(MAX(id), 0) + 1 AS id FROM migrations",
      );
      await client.query(
        "INSERT INTO migrations (id, name, executed_at) VALUES ($1, $2, $3)",
        [next.rows[0].id, file, Date.now()],
      );
    }

    console.log("Migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

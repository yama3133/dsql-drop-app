import fs from "fs";
import path from "path";
import { ENDPOINTS, makePool } from "./mr";

// マルチリージョンクラスタにスキーマを適用し、商品1件を投入する。
// 1論理DBなのでどちらの拠点から流しても両拠点に反映される。
const STOCK = Number(process.env.MR_STOCK || 1);

async function main() {
  const pool = await makePool(ENDPOINTS.tokyo);
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "db", "migrations", "0001_init.sql"),
      "utf8",
    );
    const statements = sql
      .split("\n\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const st of statements) {
      try {
        await client.query("BEGIN");
        await client.query(st);
        await client.query("COMMIT");
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists")) {
          console.log("  skip (already exists)");
        } else {
          throw e;
        }
      }
    }

    // seed (再実行可)
    await client.query("BEGIN");
    await client.query("DELETE FROM orders");
    await client.query("DELETE FROM inventory");
    await client.query("DELETE FROM products");
    await client.query("COMMIT");

    const p = await client.query(
      "INSERT INTO products (name, drop_name) VALUES ($1, $2) RETURNING id",
      ["Limited Sneaker — Pair #001 (multi-region)", "Global Midnight Drop"],
    );
    const productId = p.rows[0].id as string;
    await client.query("INSERT INTO inventory (product_id, stock) VALUES ($1, $2)", [
      productId,
      STOCK,
    ]);

    console.log(`マルチリージョンDBにスキーマ適用＋seed完了。productId=${productId} stock=${STOCK}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

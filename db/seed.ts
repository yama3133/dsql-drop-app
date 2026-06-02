import dotenv from "dotenv";
import { createPool } from "./connect";

dotenv.config({ path: ".env.local" });
dotenv.config();

// CP1 は在庫 1。CP5 の負荷テストでは SEED_STOCK=100 などで上書きする。
const STOCK = Number(process.env.SEED_STOCK || 1);

async function main() {
  const pool = createPool();
  const client = await pool.connect();
  try {
    // 再実行できるよう既存データをクリア (テーブルは小さい)。
    await client.query("BEGIN");
    await client.query("DELETE FROM orders");
    await client.query("DELETE FROM inventory");
    await client.query("DELETE FROM products");
    await client.query("COMMIT");

    const product = await client.query(
      "INSERT INTO products (name, drop_name) VALUES ($1, $2) RETURNING id",
      ["Limited Sneaker — Pair #001", "Midnight Drop"],
    );
    const productId = product.rows[0].id as string;

    await client.query(
      "INSERT INTO inventory (product_id, stock) VALUES ($1, $2)",
      [productId, STOCK],
    );

    console.log(`Seeded product ${productId} with stock ${STOCK}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

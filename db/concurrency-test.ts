import dotenv from "dotenv";
import { createPool } from "./connect";

dotenv.config({ path: ".env.local" });
dotenv.config();

// 在庫を TEST_STOCK にリセットし、CONCURRENCY 本の購入を同時に API へ投げて、
// 「売り越しゼロ（成功数 = min(同時数, 在庫)・最終在庫はマイナスにならない）」を検証する。
const BASE = process.env.BASE_URL || "http://localhost:3000";
const STOCK = Number(process.env.TEST_STOCK || 1);
const CONCURRENCY = Number(process.env.TEST_CONCURRENCY || 2);

type PurchaseBody = { status?: string; orderId?: string; attempts?: number; error?: string };

async function main() {
  const pool = createPool();
  try {
    // --- 在庫リセット & productId 取得 ---
    let productId: string;
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("DELETE FROM orders");
      await c.query("UPDATE inventory SET stock = $1", [STOCK]);
      await c.query("COMMIT");
      productId = (await c.query("SELECT product_id FROM inventory LIMIT 1")).rows[0]
        .product_id;
    } finally {
      c.release();
    }

    console.log(
      `在庫を ${STOCK} にリセット。${CONCURRENCY} 本の購入を ${BASE}/api/purchase へ同時発火...`,
    );

    // --- 同時購入 ---
    const t0 = Date.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        fetch(`${BASE}/api/purchase`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, userRef: `buyer-${i}` }),
        })
          .then(async (res) => ({ http: res.status, body: (await res.json()) as PurchaseBody }))
          .catch((e) => ({ http: 0, body: { error: String(e) } as PurchaseBody })),
      ),
    );
    const ms = Date.now() - t0;

    let confirmed = 0;
    let soldOut = 0;
    let errored = 0;
    results.forEach((r, i) => {
      if (r.body.status === "confirmed") confirmed++;
      else if (r.body.status === "sold_out") soldOut++;
      else errored++;
      console.log(`  #${i}: HTTP ${r.http} ${JSON.stringify(r.body)}`);
    });

    // --- 最終在庫 ---
    let finalStock: number;
    let orderCount: number;
    const c2 = await pool.connect();
    try {
      finalStock = (await c2.query("SELECT stock FROM inventory LIMIT 1")).rows[0].stock;
      orderCount = (await c2.query("SELECT count(*)::int AS n FROM orders")).rows[0].n;
    } finally {
      c2.release();
    }

    console.log("---");
    console.log(`confirmed=${confirmed}  sold_out=${soldOut}  errored=${errored}  (${ms}ms)`);
    console.log(`最終在庫=${finalStock}  注文数=${orderCount}`);

    const expectedConfirmed = Math.min(CONCURRENCY, STOCK);
    const ok =
      confirmed === expectedConfirmed &&
      finalStock === STOCK - expectedConfirmed &&
      finalStock >= 0 &&
      orderCount === expectedConfirmed &&
      errored === 0;

    console.log(
      ok
        ? `PASS: 売り越しゼロ。成功 ${confirmed} 件 = 在庫 ${STOCK}、最終在庫 ${finalStock}。`
        : `FAIL: 期待(成功${expectedConfirmed}/在庫${STOCK - expectedConfirmed})と不一致。`,
    );
    if (!ok) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

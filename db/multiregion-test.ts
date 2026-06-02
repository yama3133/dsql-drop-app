import { ENDPOINTS, makePool, purchaseOnPool } from "./mr";

// 在庫を MR_STOCK にリセットし、東京とソウルの「別エンドポイント」から
// 各 MR_PER_REGION 本ずつを同時購入。マルチリージョン強整合で売り越さない
// （成功数 = min(同時数, 在庫)、両拠点から見た最終在庫が一致）ことを検証する。
const STOCK = Number(process.env.MR_STOCK || 1);
const PER_REGION = Number(process.env.MR_PER_REGION || 1);

type Outcome = {
  ep: string;
  status: "confirmed" | "sold_out" | "error";
  attempts: number;
  err?: string;
};

async function main() {
  const tokyo = await makePool(ENDPOINTS.tokyo);
  const seoul = await makePool(ENDPOINTS.seoul);
  try {
    // 在庫リセット（東京から。1論理DBなのでソウルにも反映）
    {
      const c = await tokyo.connect();
      try {
        await c.query("BEGIN");
        await c.query("DELETE FROM orders");
        await c.query("UPDATE inventory SET stock = $1", [STOCK]);
        await c.query("COMMIT");
      } finally {
        c.release();
      }
    }
    const productId = (await tokyo.query("SELECT product_id FROM inventory LIMIT 1")).rows[0]
      .product_id as string;

    const total = PER_REGION * 2;
    console.log(
      `在庫 ${STOCK}。東京/ソウルの別エンドポイントから各 ${PER_REGION} 本ずつ、計 ${total} 本を同時購入...`,
    );

    const mk = (pool: typeof tokyo, ep: string, region: string, i: number): Promise<Outcome> =>
      purchaseOnPool(pool, productId, `${ep}-${i}`, region)
        .then((r) => ({ ep, status: r.status, attempts: r.attempts }))
        .catch((e) => ({ ep, status: "error" as const, attempts: 0, err: String(e?.message || e) }));

    const t0 = Date.now();
    const results = await Promise.all([
      ...Array.from({ length: PER_REGION }, (_, i) => mk(tokyo, "Tokyo", "ap-northeast-1", i)),
      ...Array.from({ length: PER_REGION }, (_, i) => mk(seoul, "Seoul", "ap-northeast-2", i)),
    ]);
    const ms = Date.now() - t0;

    let confirmed = 0;
    let soldOut = 0;
    let errored = 0;
    const winners: string[] = [];
    for (const r of results) {
      if (r.status === "confirmed") {
        confirmed++;
        winners.push(r.ep);
      } else if (r.status === "sold_out") soldOut++;
      else {
        errored++;
        console.log(`  ERROR(${r.ep}): ${r.err}`);
      }
    }

    console.log(`  Tokyo: ${results.filter((r) => r.ep === "Tokyo").map((r) => r.status).join(", ")}`);
    console.log(`  Seoul: ${results.filter((r) => r.ep === "Seoul").map((r) => r.status).join(", ")}`);

    // 強整合の確認: 両拠点から最終在庫を読む
    const finalTokyo = (await tokyo.query("SELECT stock FROM inventory LIMIT 1")).rows[0].stock;
    const finalSeoul = (await seoul.query("SELECT stock FROM inventory LIMIT 1")).rows[0].stock;
    const orderCount = (await tokyo.query("SELECT count(*)::int AS n FROM orders")).rows[0].n;

    console.log("---");
    console.log(`confirmed=${confirmed}  sold_out=${soldOut}  errored=${errored}  (${ms}ms)`);
    console.log(`勝者拠点: ${winners.join(", ") || "なし"}`);
    console.log(`最終在庫  東京視点=${finalTokyo}  ソウル視点=${finalSeoul}  注文数=${orderCount}`);

    const expected = Math.min(total, STOCK);
    const ok =
      confirmed === expected &&
      finalTokyo === STOCK - expected &&
      finalTokyo >= 0 &&
      finalTokyo === finalSeoul &&
      orderCount === expected &&
      errored === 0;

    console.log(
      ok
        ? `PASS: 2拠点同時でも売り越しゼロ。成功 ${confirmed} = 在庫 ${STOCK}、両拠点で在庫一致 (${finalTokyo})。`
        : `FAIL: 期待(成功${expected}/在庫${STOCK - expected}/両拠点一致)と不一致。`,
    );
    if (!ok) process.exitCode = 1;
  } finally {
    await tokyo.end();
    await seoul.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { withConnection } from "./db";

// DSQL の OCC 競合を表す SQLSTATE / DSQL 固有コード。これらはリトライ対象。
const OCC_CODES = new Set(["40001", "OC000", "OC001"]);

function isOccConflict(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code !== undefined && OCC_CODES.has(code);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type PurchaseResult =
  | { status: "confirmed"; orderId: string; attempts: number }
  | { status: "sold_out"; attempts: number };

/**
 * 在庫チェック＋減算＋注文作成を 1 トランザクションで実行する。
 *
 * DSQL は楽観的同時実行制御 (OCC) で、競合はコミット時に弾かれる (SQLSTATE 40001 / OC000 / OC001)。
 * その場合は指数バックオフ＋ジッタで数回リトライする。リトライ時は最新スナップショットを読むため、
 * 既に売り切れていれば WHERE stock > 0 が 0 件になり sold_out を返す = 売り越さない。
 *
 * 在庫 0 による sold_out は競合ではなく確定状態なのでリトライしない。
 */
export async function purchase(
  productId: string,
  userRef: string,
  region: string | null,
  maxAttempts = 6,
): Promise<PurchaseResult> {
  let attempt = 0;

  for (;;) {
    attempt++;
    try {
      return await withConnection(async (client) => {
        await client.query("BEGIN");
        try {
          const upd = await client.query(
            "UPDATE inventory SET stock = stock - 1 WHERE product_id = $1 AND stock > 0",
            [productId],
          );
          if (upd.rowCount === 0) {
            await client.query("ROLLBACK");
            return { status: "sold_out", attempts: attempt } as const;
          }
          const order = await client.query(
            `INSERT INTO orders (product_id, user_ref, status, region)
             VALUES ($1, $2, 'confirmed', $3) RETURNING id`,
            [productId, userRef, region],
          );
          // 競合はこの COMMIT で 40001 として顕在化する。
          await client.query("COMMIT");
          return {
            status: "confirmed",
            orderId: order.rows[0].id as string,
            attempts: attempt,
          } as const;
        } catch (e) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // コミット失敗後の ROLLBACK は no-op になりうる。無視。
          }
          throw e;
        }
      });
    } catch (e) {
      if (isOccConflict(e) && attempt < maxAttempts) {
        // 指数バックオフ + ジッタ: 10,20,40,... ms (上限 500ms) の半分 + 乱数。
        const base = Math.min(2 ** (attempt - 1) * 10, 500);
        await sleep(base / 2 + Math.random() * (base / 2));
        continue;
      }
      throw e;
    }
  }
}

import { NextResponse } from "next/server";
import { getMrPool } from "@/lib/mr-pools";
import { purchaseOnPool } from "@/db/mr";

export const dynamic = "force-dynamic";

// 負荷テスト(CP5)専用: region を指定して、対応する MR クラスタ(東京/ソウル)へ購入を投げる。
// ローカル AWS 資格情報を使うためローカル専用。

function regionCode(r: "tokyo" | "seoul") {
  return r === "seoul" ? "ap-northeast-2" : "ap-northeast-1";
}

export async function GET() {
  const pool = await getMrPool("tokyo");
  const r = await pool.query(
    `SELECT p.id, p.name, i.stock
     FROM products p JOIN inventory i ON i.product_id = p.id
     ORDER BY p.created_at LIMIT 1`,
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: "no product" }, { status: 404 });
  }
  return NextResponse.json(r.rows[0]);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const productId = typeof body.productId === "string" ? body.productId : undefined;
  const region: "tokyo" | "seoul" = body.region === "seoul" ? "seoul" : "tokyo";

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const pool = await getMrPool(region);
  const result = await purchaseOnPool(pool, productId, `k6-${region}`, regionCode(region));

  if (result.status === "sold_out") {
    return NextResponse.json(
      { status: "sold_out", region, attempts: result.attempts },
      { status: 409 },
    );
  }
  return NextResponse.json({ status: "confirmed", region, attempts: result.attempts });
}

import { NextResponse } from "next/server";
import { purchase } from "@/lib/purchase";

export const dynamic = "force-dynamic";

/**
 * 購入処理。OCC 競合のリトライは lib/purchase.ts の purchase() が担う。
 * 在庫 0 のときは売り切れ (409)。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const productId = typeof body.productId === "string" ? body.productId : undefined;
  const userRef =
    typeof body.userRef === "string"
      ? body.userRef
      : `anon-${Math.random().toString(36).slice(2, 8)}`;
  const region = process.env.AWS_REGION || null;

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const result = await purchase(productId, userRef, region);

  if (result.status === "sold_out") {
    return NextResponse.json(
      { status: "sold_out", attempts: result.attempts },
      { status: 409 },
    );
  }
  return NextResponse.json({
    status: "confirmed",
    orderId: result.orderId,
    region,
    attempts: result.attempts,
  });
}

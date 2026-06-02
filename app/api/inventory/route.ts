import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 現在のドロップ商品と在庫数を返す。 */
export async function GET() {
  const result = await query(
    `SELECT p.id, p.name, p.drop_name AS "dropName", i.stock
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     ORDER BY p.created_at
     LIMIT 1`,
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "no product seeded" }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}

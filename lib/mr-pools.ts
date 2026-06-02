import type { Pool } from "pg";
import { ENDPOINTS, makePool } from "../db/mr";

// ローカル負荷テスト専用: 東京/ソウルの MR クラスタへの遅延生成シングルトンプール。
// ローカル AWS 資格情報 (aws login) で接続するため、Vercel 本番デプロイでは機能しない。
// 本番デプロイの購入は /api/purchase (Vercel OIDC・単一リージョン) を使う。
const pools: Partial<Record<"tokyo" | "seoul", Promise<Pool>>> = {};

export function getMrPool(region: "tokyo" | "seoul"): Promise<Pool> {
  if (!pools[region]) {
    pools[region] = makePool(ENDPOINTS[region]);
  }
  return pools[region]!;
}

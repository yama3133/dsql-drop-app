import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Pool } from "pg";

// マルチリージョン peered クラスタの2エンドポイント（1つの論理DBを共有・強整合）。
// witness は大阪(ap-northeast-3, エンドポイント無し)。
export type Endpoint = { label: string; region: string; host: string };

export const ENDPOINTS: { tokyo: Endpoint; seoul: Endpoint } = {
  tokyo: {
    label: "Tokyo",
    region: "ap-northeast-1",
    host: "vjt2cfbgv52ppgsg4gty434dfm.dsql.ap-northeast-1.on.aws",
  },
  seoul: {
    label: "Seoul",
    region: "ap-northeast-2",
    host: "ant2cfbia7vmhdpue6ll7s7f5a.dsql.ap-northeast-2.on.aws",
  },
};

/**
 * Vercel OIDC ではなく、ローカルの AWS 資格情報(`aws login`)で DSQL に接続する。
 * DsqlSigner が認証トークンを生成し、pg のパスワードとして使う。
 */
export async function makePool(ep: Endpoint): Promise<Pool> {
  // expiresIn を長めに取り、負荷テスト中(数分)にトークンが失効しないようにする。
  const signer = new DsqlSigner({ hostname: ep.host, region: ep.region, expiresIn: 3600 });
  const token = await signer.getDbConnectAdminAuthToken();
  return new Pool({
    host: ep.host,
    port: 5432,
    user: "admin",
    database: "postgres",
    password: token,
    ssl: { rejectUnauthorized: true },
    max: 20,
  });
}

const OCC_CODES = new Set(["40001", "OC000", "OC001"]);
const isOcc = (e: unknown) => {
  const c = (e as { code?: string } | null)?.code;
  return !!c && OCC_CODES.has(c);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type BuyResult = {
  status: "confirmed" | "sold_out";
  attempts: number;
  region: string;
};

/** 指定プール(=拠点)に対して、OCCリトライ付きで購入する。 */
export async function purchaseOnPool(
  pool: Pool,
  productId: string,
  userRef: string,
  region: string,
  maxAttempts = 40,
): Promise<BuyResult> {
  let attempt = 0;
  for (;;) {
    attempt++;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const upd = await client.query(
        "UPDATE inventory SET stock = stock - 1 WHERE product_id = $1 AND stock > 0",
        [productId],
      );
      if (upd.rowCount === 0) {
        await client.query("ROLLBACK");
        return { status: "sold_out", attempts: attempt, region };
      }
      await client.query(
        "INSERT INTO orders (product_id, user_ref, status, region) VALUES ($1, $2, 'confirmed', $3)",
        [productId, userRef, region],
      );
      await client.query("COMMIT");
      return { status: "confirmed", attempts: attempt, region };
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* コミット失敗後の ROLLBACK は no-op。無視。 */
      }
      if (!(isOcc(e) && attempt < maxAttempts)) throw e;
      // 単一ホット行への高競合に耐えるよう、頻繁な再試行＋ジッタ(上限300ms)。
      const base = Math.min(2 ** (attempt - 1) * 5, 300);
      await sleep(base / 2 + Math.random() * (base / 2));
    } finally {
      client.release();
    }
  }
}

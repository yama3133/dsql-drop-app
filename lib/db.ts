import { attachDatabasePool } from "@vercel/functions";
import type { ClientBase } from "pg";
import { createPool } from "../db/connect";

// プールは初回利用時に遅延生成する。
// (ビルド時のページデータ収集では環境変数が無いため、ここで生成すると
//  AuroraDSQLPool が "Host is required" で落ちる。実リクエスト時のみ生成する。)
let pool: ReturnType<typeof createPool> | undefined;

function getPool() {
  if (!pool) {
    pool = createPool();
    attachDatabasePool(pool);
  }
  return pool;
}

/** 単発クエリ。 */
export async function query(sql: string, params: unknown[] = []) {
  return getPool().query(sql, params);
}

/** 複数クエリを 1 トランザクションで実行したいとき (在庫チェック＋減算など)。 */
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

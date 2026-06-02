import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

/**
 * Aurora DSQL への接続プールを生成する。
 *
 * 認証フロー: Vercel の OIDC フェデレーション → AWS IAM ロール (AWS_ROLE_ARN) を assume
 *            → DSQL の認証トークンを接続のたびに自動生成。
 * 手動トークンは一切扱わない。環境変数はすべて Vercel が注入する
 * (PGHOST / AWS_REGION / PGUSER / PGDATABASE / PGPORT / AWS_ROLE_ARN)。
 */
export function createPool() {
  return new AuroraDSQLPool({
    host: process.env.PGHOST!,
    region: process.env.AWS_REGION!,
    user: process.env.PGUSER || "admin",
    database: process.env.PGDATABASE || "postgres",
    port: Number(process.env.PGPORT || 5432),
    customCredentialsProvider: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION! },
    }),
  });
}

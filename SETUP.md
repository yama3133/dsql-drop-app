# DSQL Drop App — セットアップ手順

「限定ドロップEC（絶対に売り越さない）」。DB は Amazon Aurora DSQL（マルチリージョン強整合）。

## 1. Vercel で Aurora DSQL を用意（ダッシュボード操作）

1. https://vercel.com で、このプロジェクトを作成（または後で import）
2. プロジェクト → **Storage** タブ → Marketplace → **AWS** → **Aurora DSQL** を Install
   - ⚠️ **Aurora PostgreSQL と取り違えない**こと（名前が似ている）
3. プロジェクトに **Connect** → 次の環境変数が自動注入される:
   `PGHOST` / `AWS_REGION` / `PGUSER` / `PGDATABASE` / `PGPORT` / `AWS_ROLE_ARN`
   - 手動トークンは作らない。認証は Vercel の OIDC フェデレーション任せ。

## 2. ローカルに接続情報を取得

```bash
vercel login                 # ブラウザ認証
vercel link                  # このディレクトリを Vercel プロジェクトに紐付け
vercel env pull .env.local   # 環境変数 + 開発用 OIDC トークンを取得
```

- `.env.local` には `VERCEL_OIDC_TOKEN` も入る。これでローカルからも DSQL に接続できる。
- このトークンは数時間で失効する。繋がらなくなったら `vercel env pull .env.local` を再実行。

## 3. スキーマ適用・初期データ・接続確認

```bash
npm run db:test      # DSQL に繋がるか（SELECT 1）。テーブルはまだ無くてOK
npm run db:migrate   # products / inventory / orders を作成
npm run db:seed      # 商品1件・在庫1 を投入
npm run db:test      # 各テーブルの件数を確認（inventory: 1 rows など）
```

## 4. 動作確認（在庫 1 → 0）

```bash
npm run dev
# 別ターミナルで:
curl http://localhost:3000/api/inventory
# → {"id":"...","name":"...","stock":1}

curl -X POST http://localhost:3000/api/purchase \
  -H 'content-type: application/json' \
  -d '{"productId":"<上の id>"}'
# → {"status":"confirmed", ...}

curl http://localhost:3000/api/inventory
# → stock が 0 に。もう一度 purchase すると {"status":"sold_out"}（409）
```

完了条件: ブラウザ/curl で在庫が見え、購入で stock が 1→0 になる。

---

## メモ（DSQL 固有の制約。実装で守っている点）

- FK 非対応 → 張らない。整合はアプリ側。
- SERIAL/シーケンス非対応 → ID は `gen_random_uuid()`。
- 1 トランザクション = DDL 1 文。マイグレーションは空行区切りで 1 文ずつ実行。
- 分離レベルは Repeatable Read 固定 + OCC。書き込み競合はコミット時に弾かれる
  → **購入処理の OCC リトライは CP2 で実装**。

-- Aurora DSQL: 1 トランザクション = DDL 1 文。文どうしは空行で区切る (migrate.ts が分割実行する)。
-- FK は非対応のため張らない。整合はアプリ側で取る。ID は gen_random_uuid() のサーバ側デフォルト。
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  drop_name text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  stock integer NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_ref text NOT NULL,
  status text NOT NULL,
  region text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX ASYNC IF NOT EXISTS inventory_product_idx ON inventory (product_id);

CREATE INDEX ASYNC IF NOT EXISTS orders_product_idx ON orders (product_id);

import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

// CP5 負荷テスト: 在庫100 に対し数千リクエストを東京/ソウルの2リージョンへ同時に流し、
// 「ちょうど100件だけ confirmed、それ以上は売れていない(=売り越しゼロ)」を集計で示す。
//
// 事前に在庫を100にしておく:  MR_STOCK=100 npm run db:mr-setup
// 実行例:                     k6 run loadtest/drop.js
//   環境変数: BASE_URL(既定 http://localhost:3000) / VUS(既定50) / ITER(既定2000)

const confirmed = new Counter("purchase_confirmed");
const soldout = new Counter("purchase_soldout");
const errors = new Counter("purchase_errors");

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    drop: {
      executor: "shared-iterations",
      vus: Number(__ENV.VUS || 50),
      iterations: Number(__ENV.ITER || 2000),
      maxDuration: "10m",
    },
  },
};

export function setup() {
  const res = http.get(`${BASE}/api/drop`);
  const product = res.json();
  return { productId: product.id, startStock: product.stock };
}

export default function (data) {
  // VU/イテレーションごとに東京/ソウルへ振り分け（2拠点同時に殺到させる）
  const region = (__VU + __ITER) % 2 === 0 ? "tokyo" : "seoul";
  const res = http.post(
    `${BASE}/api/drop`,
    JSON.stringify({ productId: data.productId, region }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (res.status === 200) confirmed.add(1);
  else if (res.status === 409) soldout.add(1);
  else errors.add(1);

  check(res, {
    "status is 200 or 409 (no server error)": (r) => r.status === 200 || r.status === 409,
  });
}

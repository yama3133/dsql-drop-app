/* DROPZERO アーキテクチャ図。/architecture で表示し、スクリーンショットして提出用PNGにする。 */

function Pipe() {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-1 text-acid">
      <span className="text-2xl leading-none">→</span>
    </div>
  );
}

function Stage({
  tag,
  title,
  lines,
  className = "",
}: {
  tag: string;
  title: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div
      className={`flex-1 rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {tag}
      </div>
      <div className="mb-2 text-base font-semibold tracking-tight text-zinc-100">{title}</div>
      <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function RegionNode({
  city,
  region,
  role,
  active,
}: {
  city: string;
  region: string;
  role: string;
  active: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{
        borderColor: active ? "rgba(197,255,54,0.4)" : "rgba(255,255,255,0.12)",
        background: active ? "rgba(197,255,54,0.07)" : "rgba(255,255,255,0.02)",
        borderStyle: active ? "solid" : "dashed",
      }}
    >
      <div className="text-sm font-semibold text-zinc-100">{city}</div>
      <div className="font-mono text-[11px] text-zinc-500">{region}</div>
      <div
        className="mt-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: active ? "var(--color-acid)" : "#71717a" }}
      >
        {role}
      </div>
    </div>
  );
}

function TableCard({
  name,
  columns,
  note,
}: {
  name: string;
  columns: { col: string; hot?: boolean }[];
  note?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-2 font-mono text-sm font-semibold text-acid">{name}</div>
      <ul className="space-y-1 font-mono text-[11px] leading-relaxed">
        {columns.map((c) => (
          <li
            key={c.col}
            className={c.hot ? "rounded bg-acid/15 px-1 text-acid" : "text-zinc-400"}
          >
            {c.col}
          </li>
        ))}
      </ul>
      {note ? <div className="mt-2 text-[10px] leading-tight text-zinc-500">{note}</div> : null}
    </div>
  );
}

export default function Architecture() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-[#07070b] px-10 py-10">
      {/* title */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold tracking-[0.25em] text-zinc-400">
          <span className="text-acid">▲</span> DROPZERO
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          Architecture — globally consistent drops that never oversell
        </h1>
      </div>

      {/* main pipeline */}
      <div className="flex w-full max-w-6xl items-stretch gap-1">
        <Stage
          tag="Clients"
          title="🌐 Buyers worldwide"
          lines={["Limited drop, huge concurrent demand", "8 languages incl. RTL (Arabic)"]}
        />
        <Pipe />
        <Stage
          tag="Frontend · Vercel"
          title="Next.js 16 (v0-style UI)"
          lines={[
            "App Router · real-time stock UI",
            "API routes: /api/inventory, /api/purchase",
            "Deployed on Vercel",
          ]}
        />
        <Pipe />
        <Stage
          tag="Auth · no static secrets"
          title="Vercel OIDC → AWS IAM"
          lines={[
            "OIDC federation identifies the project",
            "Assume AWS IAM role (STS)",
            "Generate DSQL auth token per connection",
          ]}
        />
      </div>

      {/* arrow down to DB */}
      <div className="text-2xl leading-none text-acid">↓</div>

      {/* Aurora DSQL multi-region */}
      <div className="w-full max-w-6xl rounded-3xl border border-acid/25 bg-acid/[0.04] p-6">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-acid">
          Database · Amazon Aurora DSQL
        </div>
        <div className="mb-4 text-lg font-semibold tracking-tight text-zinc-50">
          Serverless distributed SQL · multi-Region · active-active · strongly consistent
        </div>

        <div className="flex items-center justify-center gap-4">
          <RegionNode city="Tokyo" region="ap-northeast-1" role="Active peer" active />
          <span className="text-xl text-acid">⇄</span>
          <RegionNode city="Seoul" region="ap-northeast-2" role="Active peer" active />
          <span className="px-2 text-zinc-600">+</span>
          <RegionNode city="Osaka" region="ap-northeast-3" role="Witness (quorum)" active={false} />
        </div>

        <div className="mt-4 text-center text-xs text-zinc-400">
          Single logical database · two regional endpoints · synchronous commit quorum · stock row
          never goes negative
        </div>
      </div>

      {/* data model */}
      <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Data model · in Aurora DSQL
        </div>
        <div className="mb-4 text-lg font-semibold tracking-tight text-zinc-50">
          Deliberate, DSQL-native schema
        </div>
        <div className="flex items-start gap-3">
          <TableCard
            name="products"
            columns={[{ col: "id · uuid PK" }, { col: "name" }, { col: "drop_name" }]}
          />
          <span className="self-center text-lg text-zinc-600">→</span>
          <TableCard
            name="inventory"
            columns={[
              { col: "id · uuid PK" },
              { col: "product_id" },
              { col: "stock  ← single row", hot: true },
            ]}
            note="every buyer races for this one row"
          />
          <span className="self-center text-lg text-zinc-600">→</span>
          <TableCard
            name="orders"
            columns={[
              { col: "id · uuid PK" },
              { col: "product_id" },
              { col: "user_ref" },
              { col: "status" },
              { col: "region" },
            ]}
          />
        </div>
        <div className="mt-4 text-center text-xs text-zinc-400">
          No foreign keys · no sequences (DSQL) · UUID PKs · purchase ={" "}
          <span className="text-acid">check + decrement in one transaction</span> · OCC retry →
          never oversell
        </div>
      </div>

      {/* guarantees */}
      <div className="flex w-full max-w-6xl gap-3">
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-1 text-sm font-semibold text-zinc-100">
            Never oversell — by design
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            Each purchase runs check + decrement in one transaction. Aurora DSQL uses optimistic
            concurrency control; conflicting commits are rejected (SQLSTATE 40001) and retried with
            exponential backoff. The loser re-reads the latest stock and returns “sold out”.
          </p>
        </div>
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-1 text-sm font-semibold text-zinc-100">Proven under load (k6)</div>
          <p className="text-xs leading-relaxed text-zinc-400">
            100 units · 3,000 concurrent purchases across the Tokyo &amp; Seoul endpoints →{" "}
            <span className="font-semibold text-acid">exactly 100 confirmed</span>, 2,900 sold-out,
            0 errors, final stock 0. Zero oversell at scale.
          </p>
        </div>
      </div>

      <div className="text-[11px] text-zinc-600">
        Frontend: Vercel · Database: Amazon Aurora DSQL (APAC region set) · Auth: Vercel OIDC
        federation
      </div>
    </main>
  );
}

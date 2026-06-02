# Never oversell, anywhere on Earth — building a global drop platform on Amazon Aurora DSQL

*Built for the H0 hackathon (Hack the Zero Stack with Vercel v0 and AWS Databases). #H0Hackathon*

When a limited drop goes live, thousands of people press **Buy** in the same second. The classic failure modes — overselling, double-booking, the site falling over — are really one failure: **losing track of a single number under global concurrency.** Sell 101 units of a 100-unit drop and you've broken a promise to a real customer.

I kept watching limited drops oversell, double-book, and crash — and I wanted to know whether a database could make that *impossible* by design, not just patched over with queues bolted on top. So I built **DROPZERO**, a drop platform that sells *exactly* its stock and not one unit more, no matter how many buyers hit it at once or which region they come from. The whole thing runs on **Amazon Aurora DSQL** with a Next.js frontend on Vercel. Live demo: https://dsql-drop-app.vercel.app

## Why Aurora DSQL

A single-region database can keep a stock counter honest with a transaction. The hard part is doing it **across regions** without giving up correctness. Most distributed setups force a choice: strong consistency *or* low latency *or* multi-region writes — pick two.

Aurora DSQL is the reason DROPZERO can refuse that trade-off. It's a serverless, distributed SQL database with **multi-Region, active-active clusters that are strongly consistent.** Two regional endpoints, one logical database, synchronous commit quorum. That means a buyer in Tokyo and a buyer in Seoul racing for the last unit are resolved against *the same truth* — exactly one wins, and the counter never goes negative. This is the property the entire product is built on.

## The stack (and zero hardcoded secrets)

- **Frontend:** Next.js (scaffolded with v0), deployed on Vercel.
- **Auth:** Vercel **OIDC federation** → assume an AWS IAM role → mint a DSQL auth token *per connection*. No long-lived credentials anywhere in the app.
- **DB:** Amazon Aurora DSQL.

The connection is refreshingly boring — which is the point:

```ts
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

const pool = new AuroraDSQLPool({
  host: process.env.PGHOST!,
  region: process.env.AWS_REGION!,
  user: "admin",
  database: "postgres",
  port: 5432,
  customCredentialsProvider: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,        // injected by Vercel
    clientConfig: { region: process.env.AWS_REGION! },
  }),
});
```

The first time I tried DSQL I burned an evening on "auth problems" — which turned out to be unrelated credentials. Lesson: let Vercel's OIDC integration own the token lifecycle and *don't* hand-roll DSQL tokens.

## A deliberate, DSQL-native data model

Aurora DSQL is PostgreSQL-compatible, but it is **not** vanilla Postgres. Three constraints shaped the schema:

- **No foreign keys** — integrity is enforced in the app.
- **No sequences / SERIAL** — primary keys are UUIDs (`gen_random_uuid()` works as a server-side default).
- **One DDL statement per transaction** — migrations run statement-by-statement.

The schema is tiny on purpose:

- `products(id uuid PK, name, drop_name)`
- `inventory(id uuid PK, product_id, stock)` ← the entire drop hinges on this **one row**
- `orders(id uuid PK, product_id, user_ref, status, region)`

Every buyer on Earth is racing for the same `stock` cell. That's the whole game.

## The core: never oversell

A purchase is a single transaction — check and decrement — and the only interesting part is what happens when two of them collide. Aurora DSQL uses **optimistic concurrency control**: it detects the conflict at **commit** time and rejects the loser with `SQLSTATE 40001` (or DSQL's `OC000` / `OC001`). So the app must retry.

```ts
const OCC = new Set(["40001", "OC000", "OC001"]);

async function purchase(productId, userRef, region, maxAttempts = 40) {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const upd = await client.query(
        "UPDATE inventory SET stock = stock - 1 WHERE product_id = $1 AND stock > 0",
        [productId],
      );
      if (upd.rowCount === 0) { await client.query("ROLLBACK"); return "sold_out"; }
      await client.query(
        "INSERT INTO orders (product_id, user_ref, status, region) VALUES ($1,$2,'confirmed',$3)",
        [productId, userRef, region],
      );
      await client.query("COMMIT");           // a conflict surfaces here
      return "confirmed";
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      if (OCC.has(e.code) && attempt < maxAttempts) {
        await backoffWithJitter(attempt);     // exponential + jitter
        continue;                             // retry re-reads the latest stock
      }
      throw e;
    } finally {
      client.release();
    }
  }
}
```

The elegant part: a retry re-reads the *latest* snapshot. Once stock hits 0, the `WHERE stock > 0` matches no rows and the request cleanly returns **sold out**. The conflict becomes a correct answer, not an error.

## Proving multi-region consistency

I created a multi-Region peered cluster: **Tokyo (ap-northeast-1)** and **Seoul (ap-northeast-2)** as active peers, with **Osaka (ap-northeast-3)** as the witness.

A gotcha worth saving you the hour I lost: I assumed the witness had to be a US region (a claim you'll find repeated online). `us-east-1` and `us-west-2` were both **rejected**. The witness must live in the **same region set** as the peers — for an APAC cluster, that's Osaka:

```bash
aws dsql create-cluster --region ap-northeast-1 \
  --multi-region-properties '{"witnessRegion":"ap-northeast-3"}'
# then create the Seoul peer and link the two ARNs
```

The demo writes to **both** regional endpoints at the same instant. Stock = 1, one purchase to Tokyo, one to Seoul: **exactly one confirms, the other gets sold-out, and both endpoints report the same final stock.** Strong consistency, across regions, with zero application-side coordination.

## Does it hold at scale? (k6)

I pointed k6 at both regional endpoints: **100 units in stock, 3,000 concurrent purchases.**

| Retry budget | confirmed | sold_out | errors | final stock |
|---|---|---|---|---|
| 8 attempts | 100 | 2,810 | 90 | 0 |
| 40 attempts | **100** | 2,900 | **0** | **0** |

Two takeaways:
1. **Oversell never happened** — `confirmed` is exactly 100 and final stock is exactly 0 in both runs. The 90 "errors" in the first run were *failed* purchases (conflicts that exhausted retries), never extra sales.
2. **Hot-row contention needs a real retry budget.** A single stock row under 50 concurrent VUs generates a lot of OCC conflicts; bumping the retry ceiling turned those 90 errors into clean sold-outs. Idempotent, retryable transactions are not optional here — they're the design.

## Global from the first commit

A worldwide drop should read like home wherever you are. The UI ships in **8 languages** — English, Japanese, Chinese, Korean, Spanish, French, Portuguese, and Arabic — including full **right-to-left** layout for Arabic (the whole interface mirrors; numbers and IDs stay LTR).

## What I'd tell the next builder

- **Lean on the managed auth path.** Vercel OIDC → IAM → DSQL token means no secrets in the app and no token plumbing.
- **Respect DSQL's dialect.** No FKs, no sequences, one DDL per transaction, fixed Repeatable Read isolation. Design *with* it, not around it.
- **Treat OCC retries as a feature, not error handling.** They're how "never oversell" actually works.
- **Multi-region witness = same region set.** Don't trust the "US-only" folklore; trust the API error.

DROPZERO sells exactly what's in stock — to one buyer or to a million, in Tokyo or São Paulo — because Aurora DSQL gives you a single, strongly consistent source of truth across regions, and the rest is a small, careful transaction.

**Live:** https://dsql-drop-app.vercel.app · **Architecture:** https://dsql-drop-app.vercel.app/architecture

*#H0Hackathon — built with Amazon Aurora DSQL and Vercel.*

---

### Short version (LinkedIn / X)
For #H0Hackathon I built **DROPZERO** — a global limited-drop platform that *never oversells*. The trick: **Amazon Aurora DSQL**'s multi-Region, active-active **strong consistency** (Tokyo + Seoul + an Osaka witness) plus an optimistic-concurrency retry on a single stock row. Load test: 100 units, 3,000 concurrent buyers across two regions → **exactly 100 sold, 0 oversold, 0 errors.** Zero hardcoded secrets (Vercel OIDC → IAM → DSQL token), 8 languages incl. RTL Arabic. Live: https://dsql-drop-app.vercel.app

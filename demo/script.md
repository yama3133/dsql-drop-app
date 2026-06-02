# DROPZERO — デモ動画 台本（アフレコ対応版）/ Demo Script

合計 **4:00**（要件3〜5分）。**音声は後入れ前提**。各セクションに【画面 / 🎬キープ目安】【🇯🇵】【🇬🇧】。
無音で画面を撮る → 編集で声/字幕を乗せる。各場面は記載の秒数だけキープすれば声が収まる。
要件として「使ったAWS DB＝**Amazon Aurora DSQL**」を口頭 or 字幕で必ず示す。
本番: https://dsql-drop-app.vercel.app ／ 図: https://dsql-drop-app.vercel.app/architecture
字幕ファイル: `demo/subtitles.en.srt`（英語）/ `demo/subtitles.ja.srt`（日本語）

---

## ① 0:00–0:30 フック＆課題 / Hook（🎬 トップ画面を約30秒キープ。在庫100が見える状態）
- 🇯🇵 世界中から同時に殺到する「限定ドロップ」。チケットや限定販売では、売り越しや二重予約が頻発し、サーバーも落ちます。DROPZERO は、何百万人が同時に来ても絶対に売り越さないドロップ基盤です。
- 🇬🇧 Limited drops trigger a worldwide stampede the instant they go live. Tickets and limited releases routinely oversell, double-book, and crash — and no one even knows who actually got one. DROPZERO is a drop platform that never oversells, no matter how many millions hit it at once.

## ② 0:30–1:10 アプリ紹介 / The app（🎬 約40秒。購入実演→言語を日本語/アラビア語に切替）
- 🇯🇵 これがそのアプリ。v0 で作り、Vercel にデプロイしました。在庫はリアルタイムで減り、購入すると注文IDが返ります。8言語対応で、アラビア語では画面が右から左に反転します。
- 🇬🇧 Here's the app — built with v0 and deployed on Vercel. Stock updates in real time, and a purchase returns a confirmed order. It speaks eight languages, with full right-to-left layout for Arabic.

## ③ 1:10–2:10 核心：売り越さない / Never oversell（🎬 約60秒。ターミナルで `npm run db:mr-test`、結果を見せる）
- 🇯🇵 ここが核心です。在庫はたった1つ。その1つに、東京とソウル、別々のリージョンから同時に購入を投げます。Amazon Aurora DSQL のマルチリージョン強整合で、成功するのは片方だけ。在庫はマイナスにならず、両拠点から見た在庫も完全に一致します。
- 🇬🇧 Here's the heart of it — one single unit in stock. We fire two purchases at the very same instant: one to Tokyo, one to Seoul, two different regions. Amazon Aurora DSQL's multi-region strong consistency means exactly one wins. Stock never goes negative, and both regions agree on the result.

## ④ 2:10–3:00 スケール実証 / Proven at scale（🎬 約50秒。`k6 run loadtest/drop.js`、集計を見せる）
- 🇯🇵 桁を上げます。在庫100に、3000件の購入を2リージョンへ同時に流します。結果は、ちょうど100件だけ成功、残りは売り切れ、エラーはゼロ。何千人が殺到しても、売れるのは在庫数ぴったりだけです。
- 🇬🇧 Now let's scale it: a hundred units, and three thousand concurrent purchases across both regions. The result — exactly one hundred confirmed, everything else sold out, zero errors. Thousands of buyers, and we sell precisely our stock, never one more.

## ⑤ 3:00–3:40 アーキ＆なぜ Aurora DSQL（🎬 約40秒。`/architecture` をゆっくりスクロール）
- 🇯🇵 仕組みです。フロントは Vercel、認証は OIDC で AWS の IAM ロールを引き受け、DSQL のトークンを都度生成します。ハードコードの秘密情報はゼロ。購入は1トランザクション、競合はリトライで吸収。強整合な Aurora DSQL だからこそ綺麗に成立します。
- 🇬🇧 Here's how it works. The frontend is on Vercel; auth uses OIDC federation to assume an AWS IAM role and mint a DSQL token — zero hardcoded secrets. Each purchase checks and decrements stock in one transaction, and concurrency conflicts are absorbed by retries. This is only this clean because Aurora DSQL is multi-region and strongly consistent.

## ⑥ 3:40–4:00 インパクト＆締め / Close（🎬 約20秒。トップのチップ→本番URL）
- 🇯🇵 売り越しゼロは、ボットや混乱に対する「公平なアクセス」そのもの。世界中のどこからでも、誰もが同じ一つの真実を見られる。DROPZERO——絶対に売り越さない、グローバル・ドロップ基盤です。
- 🇬🇧 Zero oversell is fairness — against bots, against chaos. Anywhere on earth, everyone sees one single source of truth. DROPZERO: global drops that never oversell.

---

## 撮影メモ
- QuickTime で各セクションを**無音で**収録 → iMovie/CapCut 等で音声＋字幕を後入れ。
- 各セクションは上記「🎬キープ目安」の秒数だけ画面を保持すれば、ナレーションが収まる。
- ③④のターミナルは事前リセット推奨: `MR_STOCK=1 npm run db:mr-setup`（③用）/ `MR_STOCK=100 npm run db:mr-setup`（④用）。待ち時間は編集で早送り。
- YouTube は**限定公開(Unlisted)**。非公開だと審査員が見られない。
- 字幕は `demo/subtitles.en.srt` / `demo/subtitles.ja.srt` を読み込む。実際の編集尺がズレたらタイムスタンプを微調整。

---

## TTS用テキスト（読み上げにそのまま貼れる連続版）

### 🇬🇧 English (read straight through)
Limited drops trigger a worldwide stampede the instant they go live. Tickets and limited releases routinely oversell, double-book, and crash — and no one even knows who actually got one. DROPZERO is a drop platform that never oversells, no matter how many millions hit it at once.
Here's the app — built with v0 and deployed on Vercel. Stock updates in real time, and a purchase returns a confirmed order. It speaks eight languages, with full right-to-left layout for Arabic.
Here's the heart of it — one single unit in stock. We fire two purchases at the very same instant: one to Tokyo, one to Seoul, two different regions. Amazon Aurora DSQL's multi-region strong consistency means exactly one wins. Stock never goes negative, and both regions agree on the result.
Now let's scale it: a hundred units, and three thousand concurrent purchases across both regions. The result — exactly one hundred confirmed, everything else sold out, zero errors. Thousands of buyers, and we sell precisely our stock, never one more.
Here's how it works. The frontend is on Vercel; auth uses OIDC federation to assume an AWS IAM role and mint a DSQL token — zero hardcoded secrets. Each purchase checks and decrements stock in one transaction, and concurrency conflicts are absorbed by retries. This is only this clean because Aurora DSQL is multi-region and strongly consistent.
Zero oversell is fairness — against bots, against chaos. Anywhere on earth, everyone sees one single source of truth. DROPZERO: global drops that never oversell.

### 🇯🇵 日本語（通し読み）
世界中から同時に殺到する「限定ドロップ」。チケットや限定販売では、売り越しや二重予約が頻発し、サーバーも落ちます。DROPZERO は、何百万人が同時に来ても絶対に売り越さないドロップ基盤です。
これがそのアプリ。v0 で作り、Vercel にデプロイしました。在庫はリアルタイムで減り、購入すると注文IDが返ります。8言語対応で、アラビア語では画面が右から左に反転します。
ここが核心です。在庫はたった1つ。その1つに、東京とソウル、別々のリージョンから同時に購入を投げます。Amazon Aurora DSQL のマルチリージョン強整合で、成功するのは片方だけ。在庫はマイナスにならず、両拠点から見た在庫も完全に一致します。
桁を上げます。在庫100に、3000件の購入を2リージョンへ同時に流します。結果は、ちょうど100件だけ成功、残りは売り切れ、エラーはゼロ。何千人が殺到しても、売れるのは在庫数ぴったりだけです。
仕組みです。フロントは Vercel、認証は OIDC で AWS の IAM ロールを引き受け、DSQL のトークンを都度生成します。ハードコードの秘密情報はゼロ。購入は1トランザクション、競合はリトライで吸収。強整合な Aurora DSQL だからこそ綺麗に成立します。
売り越しゼロは、ボットや混乱に対する「公平なアクセス」そのもの。世界中のどこからでも、誰もが同じ一つの真実を見られる。DROPZERO——絶対に売り越さない、グローバル・ドロップ基盤です。

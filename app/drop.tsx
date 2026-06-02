"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOCALES, T, type Locale } from "@/lib/i18n";

type Inventory = { id: string; name: string; dropName: string | null; stock: number };
type BuyState =
  | { kind: "idle" }
  | { kind: "buying" }
  | { kind: "confirmed"; orderId: string; region: string | null }
  | { kind: "sold_out" };

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function Drop() {
  const [locale, setLocale] = useState<Locale>("en");
  const [inv, setInv] = useState<Inventory | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [buy, setBuy] = useState<BuyState>({ kind: "idle" });
  const [flashKey, setFlashKey] = useState(0);
  const [secs, setSecs] = useState(5 * 60);
  const prevStock = useRef<number | null>(null);

  const t = T[locale];

  // 初期ロケール: localStorage → ブラウザ言語 → en
  useEffect(() => {
    const saved =
      typeof localStorage !== "undefined" ? localStorage.getItem("dz-locale") : null;
    const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en";
    const pick = (c: string | null): Locale | null =>
      c && LOCALES.some((l) => l.code === c) ? (c as Locale) : null;
    setLocale(pick(saved) ?? pick(nav) ?? "en");
  }, []);

  // ロケール変更時に文書方向(RTL/LTR)と言語属性を反映＋保存
  useEffect(() => {
    const dir = LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem("dz-locale", locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/inventory", { cache: "no-store" });
      if (!r.ok) return;
      const data: Inventory = await r.json();
      setInv(data);
      setTotal((prev) => (prev === null ? Math.max(data.stock, 1) : Math.max(prev, data.stock)));
      if (prevStock.current !== null && data.stock < prevStock.current) {
        setFlashKey((k) => k + 1);
      }
      prevStock.current = data.stock;
    } catch {
      /* ignore transient errors */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 1500);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const onBuy = async () => {
    if (!inv || buy.kind === "buying" || inv.stock <= 0) return;
    setBuy({ kind: "buying" });
    try {
      const r = await fetch("/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: inv.id }),
      });
      const data = await r.json();
      if (r.ok && data.status === "confirmed") {
        setBuy({ kind: "confirmed", orderId: data.orderId, region: data.region ?? null });
      } else {
        setBuy({ kind: "sold_out" });
      }
    } catch {
      setBuy({ kind: "idle" });
    } finally {
      load();
    }
  };

  const stock = inv?.stock ?? 0;
  const cap = total ?? 1;
  const pct = Math.max(0, Math.min(100, (stock / cap) * 100));
  const low = stock > 0 && pct <= 15;
  const soldOut = inv !== null && stock <= 0;

  return (
    <>
      {/* language selector */}
      <div
        dir="ltr"
        className="z-10 flex max-w-md flex-wrap items-center justify-center gap-1.5"
      >
        {LOCALES.map((l) => (
          <button
            key={l.code}
            data-lang={l.code}
            onClick={() => setLocale(l.code)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              locale === l.code
                ? "bg-acid font-semibold text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* drop card */}
      <div className="z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-7">
        {/* header */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-acid">
            {inv?.dropName ?? t.dropFallback}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-zinc-400">
            <span
              className="h-1.5 w-1.5 rounded-full bg-acid"
              style={{ animation: "dz-pulse 1.4s ease-in-out infinite" }}
            />
            {t.live}
          </span>
        </div>

        {/* product visual */}
        <div className="relative mb-6 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-acid/15 via-zinc-900 to-black">
          <div aria-hidden className="absolute h-40 w-40 rounded-full bg-acid/25 blur-3xl" />
          <span className="relative text-7xl drop-shadow-[0_8px_30px_rgba(197,255,54,0.35)]">
            👟
          </span>
          <span className="absolute bottom-3 left-4 right-4 text-lg font-semibold tracking-tight text-zinc-100">
            {inv?.name ?? "—"}
          </span>
        </div>

        {/* stock */}
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              {t.remaining}
            </div>
            <div
              key={flashKey}
              dir="ltr"
              className="font-mono text-5xl font-semibold tabular-nums"
              style={{
                color: low ? "var(--color-danger)" : "var(--color-foreground)",
                animation: flashKey ? "dz-flash 0.5s ease-out" : undefined,
              }}
            >
              {String(stock).padStart(3, "0")}
              <span className="ml-1 text-base font-normal text-zinc-600">/ {cap}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
              {t.endsIn}
            </div>
            <div dir="ltr" className="font-mono text-lg tabular-nums text-zinc-300">
              {fmtTime(secs)}
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: low ? "var(--color-danger)" : "var(--color-acid)",
            }}
          />
        </div>

        {/* CTA */}
        <button
          id="buy-button"
          onClick={onBuy}
          disabled={soldOut || buy.kind === "buying" || inv === null}
          className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-base font-bold tracking-wide transition active:scale-[0.99] disabled:cursor-not-allowed"
          style={{
            backgroundColor: soldOut ? "#27272a" : "var(--color-acid)",
            color: soldOut ? "#71717a" : "#0a0a0a",
            animation: low && !soldOut ? "dz-glow 1.6s ease-in-out infinite" : undefined,
          }}
        >
          {buy.kind === "buying" ? (
            <>
              <span
                className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black"
                style={{ animation: "dz-spin 0.6s linear infinite" }}
              />
              {t.securing}
            </>
          ) : soldOut ? (
            t.soldOut
          ) : (
            t.secure
          )}
        </button>

        {/* result */}
        {buy.kind === "confirmed" && (
          <div
            className="mt-4 rounded-xl border border-acid/30 bg-acid/10 p-4"
            style={{ animation: "dz-rise 0.4s ease-out" }}
          >
            <div className="flex items-center gap-2 font-semibold text-acid">
              <span>✓</span> {t.securedTitle}
            </div>
            <div dir="ltr" className="mt-1 font-mono text-xs text-zinc-300">
              {t.orderLabel} #{buy.orderId.slice(0, 8).toUpperCase()}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{t.committed(buy.region)}</div>
          </div>
        )}
        {buy.kind === "sold_out" && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{
              animation: "dz-rise 0.4s ease-out",
              borderColor: "rgba(255,77,109,0.3)",
              background: "rgba(255,77,109,0.1)",
            }}
          >
            <div className="font-semibold" style={{ color: "var(--color-danger)" }}>
              {t.soldOut}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{t.soldOutNote}</div>
          </div>
        )}

        {/* guarantees */}
        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          {[
            ["0", t.chipOversell],
            ["2", t.chipRegions],
            ["1000s", t.chipConcurrent],
          ].map(([big, small]) => (
            <div key={small}>
              <div dir="ltr" className="font-mono text-sm font-semibold text-zinc-200">
                {big}
              </div>
              <div className="text-[10px] leading-tight text-zinc-500">{small}</div>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <footer className="z-10 flex max-w-md flex-col items-center gap-1 text-center text-[11px] leading-relaxed text-zinc-500">
        <span className="text-zinc-400">{t.tagline}</span>
        <span dir="ltr">Amazon Aurora DSQL · Tokyo ⇄ Seoul · Vercel</span>
      </footer>
    </>
  );
}

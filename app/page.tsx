import Drop from "./drop";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-acid/20 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-600/10 blur-[130px]"
      />

      {/* ブランドロゴは常に LTR 固定（アラビア語のRTLでも反転させない） */}
      <header
        dir="ltr"
        className="z-10 flex items-center gap-2 text-sm font-semibold tracking-[0.25em] text-zinc-400"
      >
        <span className="text-acid">▲</span> DROPZERO
      </header>

      <Drop />
    </main>
  );
}

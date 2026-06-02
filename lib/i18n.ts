export type Locale = "en" | "ja" | "zh" | "ko" | "es" | "fr" | "pt" | "ar";

export const LOCALES: { code: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ja", label: "日本語", dir: "ltr" },
  { code: "zh", label: "中文", dir: "ltr" },
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export type Dict = {
  live: string;
  remaining: string;
  endsIn: string;
  secure: string;
  securing: string;
  soldOut: string;
  securedTitle: string;
  orderLabel: string;
  committed: (region: string | null) => string;
  soldOutNote: string;
  chipOversell: string;
  chipRegions: string;
  chipConcurrent: string;
  dropFallback: string;
  tagline: string;
};

export const T: Record<Locale, Dict> = {
  en: {
    live: "Live",
    remaining: "Remaining",
    endsIn: "Ends in",
    secure: "Secure yours",
    securing: "Securing…",
    soldOut: "Sold out",
    securedTitle: "Secured",
    orderLabel: "Order",
    committed: (r) => `committed${r ? ` · ${r}` : ""} · strongly consistent across regions`,
    soldOutNote: "The last unit was just claimed — the counter never went negative.",
    chipOversell: "oversell, ever",
    chipRegions: "regions, one truth",
    chipConcurrent: "concurrent buyers",
    dropFallback: "Limited Drop",
    tagline: "Globally consistent. Never oversold.",
  },
  ja: {
    live: "ライブ",
    remaining: "残り",
    endsIn: "終了まで",
    secure: "購入する",
    securing: "確保中…",
    soldOut: "売り切れ",
    securedTitle: "確保しました",
    orderLabel: "注文",
    committed: (r) => `${r ? `${r} で` : ""}コミット · リージョン間で強整合`,
    soldOutNote: "最後の1点はたった今確保されました。在庫がマイナスになることはありません。",
    chipOversell: "売り越しゼロ",
    chipRegions: "リージョン・単一の真実",
    chipConcurrent: "同時購入者",
    dropFallback: "限定ドロップ",
    tagline: "世界中で強整合。絶対に売り越さない。",
  },
  zh: {
    live: "实时",
    remaining: "剩余",
    endsIn: "距结束",
    secure: "立即抢购",
    securing: "抢购中…",
    soldOut: "已售罄",
    securedTitle: "已抢到",
    orderLabel: "订单",
    committed: (r) => `${r ? `已在 ${r} ` : ""}提交 · 跨区域强一致`,
    soldOutNote: "最后一件刚刚被抢走——库存绝不会变为负数。",
    chipOversell: "零超卖",
    chipRegions: "区域 · 单一事实",
    chipConcurrent: "并发买家",
    dropFallback: "限量发售",
    tagline: "全球强一致，绝不超卖。",
  },
  ko: {
    live: "실시간",
    remaining: "남은 수량",
    endsIn: "종료까지",
    secure: "지금 구매",
    securing: "확보 중…",
    soldOut: "품절",
    securedTitle: "확보 완료",
    orderLabel: "주문",
    committed: (r) => `${r ? `${r} 에서 ` : ""}커밋 · 지역 간 강한 일관성`,
    soldOutNote: "마지막 수량이 방금 확보되었습니다 — 재고가 마이너스가 되지 않습니다.",
    chipOversell: "초과 판매 없음",
    chipRegions: "지역, 하나의 진실",
    chipConcurrent: "동시 구매자",
    dropFallback: "한정 드롭",
    tagline: "전 세계적으로 강한 일관성. 초과 판매 없음.",
  },
  es: {
    live: "En vivo",
    remaining: "Restantes",
    endsIn: "Termina en",
    secure: "Asegura el tuyo",
    securing: "Asegurando…",
    soldOut: "Agotado",
    securedTitle: "Asegurado",
    orderLabel: "Pedido",
    committed: (r) => `confirmado${r ? ` · ${r}` : ""} · consistencia fuerte entre regiones`,
    soldOutNote: "La última unidad acaba de reservarse — el contador nunca fue negativo.",
    chipOversell: "sin sobreventa",
    chipRegions: "regiones, una verdad",
    chipConcurrent: "compradores simultáneos",
    dropFallback: "Lanzamiento limitado",
    tagline: "Consistencia global. Nunca sobrevendido.",
  },
  fr: {
    live: "En direct",
    remaining: "Restant",
    endsIn: "Se termine dans",
    secure: "Réservez le vôtre",
    securing: "Réservation…",
    soldOut: "Épuisé",
    securedTitle: "Réservé",
    orderLabel: "Commande",
    committed: (r) => `validé${r ? ` · ${r}` : ""} · cohérence forte entre régions`,
    soldOutNote: "La dernière unité vient d'être réservée — le compteur n'est jamais passé sous zéro.",
    chipOversell: "aucune survente",
    chipRegions: "régions, une vérité",
    chipConcurrent: "acheteurs simultanés",
    dropFallback: "Drop limité",
    tagline: "Cohérence mondiale. Jamais de survente.",
  },
  pt: {
    live: "Ao vivo",
    remaining: "Restantes",
    endsIn: "Termina em",
    secure: "Garanta o seu",
    securing: "Garantindo…",
    soldOut: "Esgotado",
    securedTitle: "Garantido",
    orderLabel: "Pedido",
    committed: (r) => `confirmado${r ? ` · ${r}` : ""} · consistência forte entre regiões`,
    soldOutNote: "A última unidade acabou de ser reservada — o contador nunca ficou negativo.",
    chipOversell: "sem venda excedente",
    chipRegions: "regiões, uma verdade",
    chipConcurrent: "compradores simultâneos",
    dropFallback: "Lançamento limitado",
    tagline: "Consistência global. Nunca vendido além do estoque.",
  },
  ar: {
    live: "مباشر",
    remaining: "المتبقي",
    endsIn: "ينتهي خلال",
    secure: "احجز نسختك",
    securing: "جارٍ الحجز…",
    soldOut: "نفدت الكمية",
    securedTitle: "تم الحجز",
    orderLabel: "الطلب",
    committed: (r) => `تم التأكيد${r ? ` · ${r}` : ""} · اتساق قوي عبر المناطق`,
    soldOutNote: "تم حجز آخر قطعة للتو — ولم يصبح العداد سالبًا أبدًا.",
    chipOversell: "بدون بيع زائد",
    chipRegions: "مناطق، حقيقة واحدة",
    chipConcurrent: "مشترون متزامنون",
    dropFallback: "إصدار محدود",
    tagline: "اتساق عالمي. لا بيع زائد أبدًا.",
  },
};

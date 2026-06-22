function currentLang(): string {
  try {
    const stored = localStorage.getItem("simlog.lang");
    if (stored) return stored;
    const nav = navigator.language?.slice(0, 2);
    if (nav === "en" || nav === "es") return nav;
  } catch { /* */ }
  return "es";
}

const LOCALE_MAP: Record<string, string> = {
  es: "es-MX",
  en: "en-US",
};

export function locale(): string {
  return LOCALE_MAP[currentLang()] || "es-MX";
}

export function formatDate(ts: number | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  const defaults: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return d.toLocaleDateString(locale(), opts || defaults);
}

export function formatDateShort(ts: number | string): string {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString(locale(), { month: "long", day: "numeric", year: "numeric" });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(locale()).format(n);
}

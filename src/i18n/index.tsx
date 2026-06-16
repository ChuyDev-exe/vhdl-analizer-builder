// SPDX-License-Identifier: MIT
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import es from "./es.json";
import en from "./en.json";

const LANG_KEY = "simlog.lang";

const LANGS: Record<string, Record<string, string>> = { es, en };

function detectLang(): string {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && LANGS[stored]) return stored;
    const nav = navigator.language?.slice(0, 2);
    if (nav && LANGS[nav]) return nav;
  } catch {
    /* */
  }
  return "es";
}

interface I18nCtx {
  lang: string;
  setLang: (l: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nCtx = createContext<I18nCtx>({
  lang: "es",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(detectLang);
  const [dict, setDict] = useState<Record<string, string>>(LANGS[lang] || es);

  const setLang = (l: string) => {
    setLangState(l);
    setDict(LANGS[l] || es);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* */
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let s = dict[key] ?? (es as Record<string, string>)[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(`{${k}}`, String(v));
      }
    }
    return s;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

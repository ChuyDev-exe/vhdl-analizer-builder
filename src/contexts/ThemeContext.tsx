import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme | ((prev: Theme) => Theme)) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean | ((prev: boolean) => boolean)) => void;
  fontSize: number;
  setFontSize: (v: number | ((prev: number) => number)) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

function resolveTheme(): Theme {
  const stored = localStorage.getItem("simlog.theme") as Theme | null;
  if (stored) return stored;
  const doc = document.documentElement.dataset.theme as Theme | undefined;
  if (doc === "dark" || doc === "light") return doc;
  return systemTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const explicitTheme = useRef(localStorage.getItem("simlog.theme") !== null);
  const [theme, setThemeRaw] = useState<Theme>(resolveTheme);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("simlog.fontsize") || 13));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("simlog.highcontrast") === "true");

  const setTheme = useCallback((next: Theme | ((prev: Theme) => Theme)) => {
    explicitTheme.current = true;
    setThemeRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      localStorage.setItem("simlog.theme", value);
      return value;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.highcontrast = String(highContrast);
    localStorage.setItem("simlog.highcontrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-size", fontSize + "px");
    document.documentElement.style.setProperty("--font-size-sm", Math.max(10, fontSize - 2) + "px");
    document.documentElement.style.setProperty("--font-size-xs", Math.max(8, fontSize - 4) + "px");
    localStorage.setItem("simlog.fontsize", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) document.documentElement.dataset.reducedmotion = "true";
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.dataset.reducedmotion = String(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, highContrast, setHighContrast, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

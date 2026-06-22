// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef, useState } from "react";

const systemTheme = (): "dark" | "light" => (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

/** Resolve the initial theme: stored preference > document default > system preference. */
function resolveTheme(): "dark" | "light" {
  const stored = localStorage.getItem("simlog.theme") as "dark" | "light" | null;
  if (stored) return stored;
  const doc = document.documentElement.dataset.theme as "dark" | "light" | undefined;
  if (doc === "dark" || doc === "light") return doc;
  return systemTheme();
}

export function useUIState() {
  const explicitTheme = useRef(localStorage.getItem("simlog.theme") !== null);
  const [theme, setThemeRaw] = useState<"dark" | "light">(resolveTheme);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("simlog.fontsize") || 13));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("simlog.highcontrast") === "true");

  // User-initiated theme change: persist it and stop following the system.
  const setTheme = useCallback((next: "dark" | "light" | ((prev: "dark" | "light") => "dark" | "light")) => {
    explicitTheme.current = true;
    setThemeRaw((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      localStorage.setItem("simlog.theme", value);
      return value;
    });
  }, []);

  // Use the stored theme or fall back to the OS preference once.
  // After initial load the theme stays fixed unless the user changes it.
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

  return { theme, setTheme, fontSize, setFontSize, highContrast, setHighContrast } as const;
}

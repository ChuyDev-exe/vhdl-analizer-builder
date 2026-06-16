// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";

export function useUIState() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("simlog.theme") as "dark" | "light") || "dark";
  });
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("simlog.fontsize") || 13));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("simlog.highcontrast") === "true");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("simlog.theme", theme);
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

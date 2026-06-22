import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTheme } from "./ThemeContext";

interface SimTheme {
  gridColor: string;
  nodeColor: string;
  nodeStroke: string;
  edgeColor: string;
  edgeActive: string;
  bgColor: string;
  maskColor: string;
}

const dark: SimTheme = {
  gridColor: "#1c1c1f",
  nodeColor: "#1c1c1f",
  nodeStroke: "#34d399",
  edgeColor: "#6f6f78",
  edgeActive: "#34d399",
  bgColor: "#000000",
  maskColor: "rgba(0,0,0,.7)",
};

const light: SimTheme = {
  gridColor: "#d4d4d4",
  nodeColor: "#e5e5e5",
  nodeStroke: "#16a34a",
  edgeColor: "#737373",
  edgeActive: "#16a34a",
  bgColor: "#f5f5f5",
  maskColor: "rgba(255,255,255,.7)",
};

const SimulatorThemeContext = createContext<SimTheme>(dark);

export function SimulatorThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const value = useMemo(() => (theme === "light" ? light : dark), [theme]);
  return (
    <SimulatorThemeContext.Provider value={value}>
      {children}
    </SimulatorThemeContext.Provider>
  );
}

export function useSimulatorTheme(): SimTheme {
  return useContext(SimulatorThemeContext);
}

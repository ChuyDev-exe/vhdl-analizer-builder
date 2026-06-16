// SPDX-License-Identifier: MIT
import { createContext } from "react";
import type { NodeData } from "./types";

/* Acciones del circuito que necesitan los nodos (registro: ancho; reloj: divisor;
   secuenciales: valor inicial). App provee la implementación real. */
export const CircuitCtx = createContext<{
  setRegWidth: (id: string, w: number) => void;
  setNodeData: (id: string, patch: Partial<NodeData>) => void;
}>({
  setRegWidth: () => {},
  setNodeData: () => {},
});

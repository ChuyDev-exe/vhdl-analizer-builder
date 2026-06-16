// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge } from "./types";
import { isFF, portsOf } from "./defs";

const portIdx = (h: string | null | undefined) => (h ? Number(h.slice(1)) : 0);

export interface Diagnostics {
  loopNodes: Set<string>; // nodos dentro de un bucle combinacional
  floating: Array<{ id: string; port: number }>; // entradas sin conectar
  dupLabels: string[]; // nombres de puerto (IN/CLK/OUT) duplicados
}

/* Un nodo "rompe" la combinacionalidad si su salida está registrada (FF/REG):
   su Q no depende de sus entradas en el mismo instante, así que no propaga bucle. */
function isSequential(kind: string) {
  return isFF(kind) || kind === "REG";
}

/* Detecta bucles combinacionales (realimentación sin elemento de memoria)
   y entradas sin conectar. */
export function analyze(nodes: RFNode[], edges: RFEdge[]): Diagnostics {
  // ---- bucles combinacionales (DFS sobre el subgrafo combinacional) ----
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => (adj[n.id] = []));
  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    if (src && !isSequential(src.data.kind) && adj[e.source]) adj[e.source].push(e.target);
  }

  const loopNodes = new Set<string>();
  const color: Record<string, number> = {}; // 0=sin visitar, 1=en pila, 2=hecho
  const stack: string[] = [];
  const dfs = (u: string) => {
    color[u] = 1;
    stack.push(u);
    for (const v of adj[u] || []) {
      if (color[v] === 1) {
        // ciclo: marca desde v hasta el tope de la pila
        const i = stack.lastIndexOf(v);
        if (i >= 0) for (let k = i; k < stack.length; k++) loopNodes.add(stack[k]);
      } else if (!color[v]) dfs(v);
    }
    stack.pop();
    color[u] = 2;
  };
  nodes.forEach((n) => {
    if (!color[n.id]) dfs(n.id);
  });

  // ---- entradas sin conectar (se ignoran EN/RST, que tienen valor por defecto seguro) ----
  const floating: Array<{ id: string; port: number }> = [];
  for (const n of nodes) {
    const inputs = portsOf(n).inputs;
    inputs.forEach((name, i) => {
      if (name === "EN" || name === "RST") return;
      const has = edges.some((e) => e.target === n.id && portIdx(e.targetHandle) === i);
      if (!has) floating.push({ id: n.id, port: i });
    });
  }
  // ---- etiquetas de puerto duplicadas (IN/CLK/OUT) ----
  const seen = new Map<string, number>();
  for (const n of nodes) {
    if (n.data.kind === "INPUT" || n.data.kind === "CLOCK" || n.data.kind === "OUTPUT") {
      const l = ((n.data.label as string) || "").trim();
      if (l) seen.set(l, (seen.get(l) || 0) + 1);
    }
  }
  const dupLabels = [...seen.entries()].filter(([, c]) => c > 1).map(([l]) => l);

  return { loopNodes, floating, dupLabels };
}

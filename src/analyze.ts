// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge } from "./types";
import { isFF, isMemory, portsOf } from "./defs";

const portIdx = (h: string | null | undefined) => (h ? Number(h.slice(1)) : 0);

export interface Diagnostics {
  loopNodes: Set<string>;
  floating: Array<{ id: string; port: number }>;
  dupLabels: string[];
  raceWarnings: Array<{ nodeId: string; path: string[]; depth: number }>;
}

function isSequential(kind: string) {
  return isFF(kind) || kind === "REG" || kind === "RAM";
}

export function analyze(nodes: RFNode[], edges: RFEdge[]): Diagnostics {
  // ---- bucles combinacionales ----
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => (adj[n.id] = []));
  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source);
    if (src && !isSequential(src.data.kind) && adj[e.source]) adj[e.source].push(e.target);
  }

  const loopNodes = new Set<string>();
  const color: Record<string, number> = {};
  const stack: string[] = [];
  const dfs = (u: string) => {
    color[u] = 1;
    stack.push(u);
    for (const v of adj[u] || []) {
      if (color[v] === 1) {
        const i = stack.lastIndexOf(v);
        if (i >= 0) for (let k = i; k < stack.length; k++) loopNodes.add(stack[k]);
      } else if (!color[v]) dfs(v);
    }
    stack.pop();
    color[u] = 2;
  };
  nodes.forEach((n) => { if (!color[n.id]) dfs(n.id); });

  // ---- entradas sin conectar ----
  const floating: Array<{ id: string; port: number }> = [];
  for (const n of nodes) {
    const inputs = portsOf(n).inputs;
    inputs.forEach((name, i) => {
      if (name === "EN" || name === "RST") return;
      const has = edges.some((e) => e.target === n.id && portIdx(e.targetHandle) === i);
      if (!has) floating.push({ id: n.id, port: i });
    });
  }

  // ---- etiquetas duplicadas ----
  const seen = new Map<string, number>();
  for (const n of nodes) {
    if (n.data.kind === "INPUT" || n.data.kind === "CLOCK" || n.data.kind === "OUTPUT") {
      const l = ((n.data.label as string) || "").trim();
      if (l) seen.set(l, (seen.get(l) || 0) + 1);
    }
  }
  const dupLabels = [...seen.entries()].filter(([, c]) => c > 1).map(([l]) => l);

  // ---- advertencias de race condition (caminos críticos disparejos) ----
  const raceWarnings: Array<{ nodeId: string; path: string[]; depth: number }> = [];
  const depth: Record<string, number> = {};
  nodes.forEach((n) => {
    depth[n.id] = (n.data.kind === "INPUT" || n.data.kind === "CLOCK") ? 0 : 0;
  });
  for (let it = 0; it < nodes.length + 4; it++) {
    let ch = false;
    for (const e of edges) {
      const sd = (depth[e.source] ?? 0) + 1;
      const tgt = nodes.find((n) => n.id === e.target);
      if (tgt && !isSequential(tgt.data.kind) && sd > (depth[e.target] ?? 0)) {
        depth[e.target] = sd;
        ch = true;
      }
    }
    if (!ch) break;
  }
  // Encontrar nodos con múltiples caminos de distinta profundidad
  const maxDepth: Record<string, number> = {};
  const minDepth: Record<string, number> = {};
  for (const n of nodes) {
    if (isSequential(n.data.kind)) continue;
    const depths: number[] = [];
    for (const e of edges) {
      if (e.target === n.id) depths.push(depth[e.source] ?? 0);
    }
    if (depths.length > 1) {
      const mn = Math.min(...depths);
      const mx = Math.max(...depths);
      if (mx - mn > 1) {
        minDepth[n.id] = mn;
        maxDepth[n.id] = mx;
        raceWarnings.push({
          nodeId: n.id,
          path: [n.data.kind, n.id].filter(Boolean),
          depth: mx - mn,
        });
      }
    }
  }

  return { loopNodes, floating, dupLabels, raceWarnings };
}

export function computeDepth(nodes: RFNode[], edges: RFEdge[]): number {
  if (!nodes.length) return 0;
  const depth: Record<string, number> = {};
  for (const n of nodes) depth[n.id] = (n.data.kind === "INPUT" || n.data.kind === "CLOCK") ? 0 : 0;
  for (let it = 0; it < nodes.length + 4; it++) {
    let ch = false;
    for (const e of edges) {
      const sd = (depth[e.source] ?? 0) + 1;
      const tgt = nodes.find((n) => n.id === e.target);
      if (tgt && !isSequential(tgt.data.kind) && sd > (depth[e.target] ?? 0)) {
        depth[e.target] = sd;
        ch = true;
      }
    }
    if (!ch) break;
  }
  return Math.max(...Object.values(depth), 0);
}

// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge, NodeData, Module, Sig, PortVal } from "./types";
import { getDef, isGate, isFF, isMemory, isExprCustom, isSchematic, nextFF, regWidth, portsOf, def4, is0or1, asSig, asBits, busWidth, memDepth, GATE_FN } from "./defs";

const portIdx = (h: string | null | undefined) => (h ? Number(h.slice(1)) : 0);
const notSig = (s: Sig): Sig => (s === 0 ? 1 : s === 1 ? 0 : s === "u" ? "u" : "x");

/* valor (escalar o bus) presente en la entrada `idx` de `id`. Sin conexión -> 'z'.
   Con múltiples drivers: resuelve usando álgebra de resolución STD_LOGIC. */
function inputRaw(nodes: RFNode[], edges: RFEdge[], id: string, idx: number): PortVal {
  const drivers = edges.filter((ed) => ed.target === id && portIdx(ed.targetHandle) === idx);
  if (drivers.length === 0) return "z";
  if (drivers.length === 1) {
    const src = nodes.find((n) => n.id === drivers[0].source);
    return src ? (src.data.outVals?.[portIdx(drivers[0].sourceHandle)] ?? "z") : "z";
  }
  // Múltiples drivers: resolver
  const vals: PortVal[] = [];
  for (const e of drivers) {
    const src = nodes.find((n) => n.id === e.source);
    vals.push(src ? (src.data.outVals?.[portIdx(e.sourceHandle)] ?? "z") : "z");
  }
  // Si todos son escalares, resolver
  if (vals.every((v) => !Array.isArray(v)))
    return resolveMultiDriver(vals as Sig[]);
  // Para buses: resolver bit a bit
  const w = Math.max(...vals.map((v) => (Array.isArray(v) ? v.length : 1)));
  const resolved: Sig[] = [];
  for (let b = 0; b < w; b++) {
    const bits: Sig[] = vals.map((v) => (Array.isArray(v) ? (v[b] ?? "z") : v));
    resolved.push(resolveMultiDriver(bits));
  }
  return resolved.every((b) => b === resolved[0]) && resolved.length === 1 ? resolved[0] : resolved;
}
/* Resolución de múltiples drivers estilo STD_LOGIC:
   U > X > 0 > 1 > Z (cualquier U → U; conflicto 0/1 → X; Z es débil) */
function resolveMultiDriver(vals: Sig[]): Sig {
  let has0 = false, has1 = false, hasX = false, hasU = false, hasZ = false;
  for (const v of vals) {
    if (v === "u") hasU = true;
    else if (v === "x" || v === "-") hasX = true;
    else if (v === 0) has0 = true;
    else if (v === 1) has1 = true;
    else if (v === "z") hasZ = true;
  }
  if (hasU) return "u";
  if (hasX) return "x";
  if (has0 && has1) return "x"; // conflicto
  if (has0) return 0;
  if (has1) return 1;
  return "z";
}
/* valor escalar (coerciona un bus a 'x') */
function inputValue(nodes: RFNode[], edges: RFEdge[], id: string, idx: number): Sig {
  return asSig(inputRaw(nodes, edges, id, idx));
}

/* Evalúa la salida combinacional de un nodo (sin avanzar estado secuencial).
   Los componentes definidos por VHDL se resuelven recursivamente. */
const rstAsserted = (nodes: RFNode[], edges: RFEdge[], id: string, def: { inputs: string[] }) => {
  const ri = def.inputs.indexOf("RST");
  return ri >= 0 && inputValue(nodes, edges, id, ri) === 1;
};

function evalNode(node: RFNode, nodes: RFNode[], edges: RFEdge[]) {
  const d = node.data;
  const def = getDef(d.kind);
  const ins = (n: number) => inputValue(nodes, edges, node.id, n);
  let outs: PortVal[];
  if (d.kind === "INPUT" || d.kind === "CLOCK") outs = [d.value ?? 0];
  else if (d.kind === "OUTPUT") {
    d.value = ins(0);
    return;
  }
  // ---- buses ----
  else if (d.kind === "BUSIN") {
    const w = busWidth(node);
    outs = [asBits(d.bits, w)];
  } else if (d.kind === "BUSOUT") {
    d.bits = asBits(inputRaw(nodes, edges, node.id, 0), busWidth(node));
    return;
  } else if (d.kind === "SPLIT") {
    outs = asBits(inputRaw(nodes, edges, node.id, 0), busWidth(node));
  } else if (d.kind === "MERGE") {
    const w = busWidth(node);
    outs = [Array.from({ length: w }, (_, i) => ins(i))];
  } else if (d.kind === "ROM") {
    const w = busWidth(node);
    const en = ins(w); // EN = puerto w (tras A0..Aw-1)
    if (en !== 1) { outs = new Array(w).fill("z"); }
    else {
      const addr = (d.bits as Sig[] | undefined)?.slice(0, w).map((b) => (b === 1 ? 1 : 0));
      const addrVal = addr ? addr.reduce<number>((a, b, i) => a + (b << i), 0) : 0;
      const mem = (d.mem as Sig[][] | undefined) || [];
      const word = mem[addrVal] || new Array(w).fill("u");
      outs = word.slice(0, w);
    }
  } else if (d.kind === "RAM") {
    const w = busWidth(node);
    const stored = (d.mem as Sig[][] | undefined) || [];
    const addr = Array.from({ length: w }, (_, i) => ins(i)).map((b) => (b === 1 ? 1 : 0));
    const addrVal = addr.reduce<number>((a, b, i) => a + (b << i), 0);
    const word = stored[addrVal] || new Array(w).fill("u");
    outs = word.slice(0, w);
  } else if (isFF(d.kind)) {
    const q: Sig = rstAsserted(nodes, edges, node.id, def) ? (d.init ?? 0) : (d.q ?? 0);
    outs = [q, notSig(q)];
  } else if (d.kind === "REG") {
    const w = regWidth(node);
    const reset = inputValue(nodes, edges, node.id, w + 2) === 1; // RST = w+2
    outs = reset ? new Array(w).fill(d.init ?? 0) : (d.bits ?? new Array(w).fill(0)).slice();
  } else if (isGate(d.kind)) outs = GATE_FN[d.kind](def.inputs.map((_, i) => ins(i)));
  else if (isSchematic(d.kind)) outs = evalSchematic(node, nodes, edges, false);
  else if (isExprCustom(d.kind)) {
    const vals = def.inputs.map((_, i) => ins(i));
    if (vals.some((v) => v === "u"))
      outs = def.outputs.map(() => "u");
    else if (vals.some((v) => !is0or1(v)))
      outs = def.outputs.map(() => "x"); // x si alguna entrada es x/z
    else {
      const io: Record<string, number> = {};
      def.inputs.forEach((nm, i) => (io[nm] = vals[i] as number));
      outs = def.outputs.map((o) => {
        try {
          return def.compiled![o](io) ? 1 : 0;
        } catch {
          return "x";
        }
      });
    }
  } else outs = [];
  d.outVals = outs;
}

/* Resuelve un componente definido por VHDL.
   - alimenta las entradas internas (proxies INPUT/CLOCK)
   - estabiliza la lógica interna
   - si `advance`, avanza el estado secuencial interno (flancos)
   - devuelve los valores de los puertos de salida */
function evalSchematic(node: RFNode, nodes: RFNode[], edges: RFEdge[], advance: boolean): Sig[] {
  const def = getDef(node.data.kind);
  const sch = def.schematic!;
  const inner = node.data.inner!;
  // alimentar proxies de entrada
  def.inputs.forEach((_, i) => {
    const pid = sch.inputProxyIds[i];
    const p = inner.nodes.find((n) => n.id === pid);
    if (p) p.data.value = inputValue(nodes, edges, node.id, i);
  });
  settleModule(inner.nodes, inner.edges);
  if (advance) {
    applyEdgesModule(inner.nodes, inner.edges);
    settleModule(inner.nodes, inner.edges);
  }
  return def.outputs.map((_, j) => {
    const oid = sch.outputProxyIds[j];
    return inputValue(inner.nodes, inner.edges, oid, 0);
  });
}

/* Orden topológico de nodos combinacionales para settleModule.
   Excluye nodos secuenciales (FF, REG, RAM) cuyo orden no importa en la
   estabilización combinacional. */
function topoSort(nodes: RFNode[], edges: RFEdge[]): string[] {
  const inDeg: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  const isComb = (id: string) => {
    const k = nodes.find((n) => n.id === id)?.data.kind;
    return k && !isFF(k) && k !== "REG" && k !== "RAM" && k !== "ROM" && k !== "OUTPUT";
  };
  for (const n of nodes) {
    inDeg[n.id] = 0;
    adj[n.id] = [];
  }
  for (const e of edges) {
    if (isComb(e.source) && isComb(e.target)) {
      adj[e.source].push(e.target);
      inDeg[e.target] = (inDeg[e.target] || 0) + 1;
    }
  }
  const q: string[] = [];
  const order: string[] = [];
  for (const id in inDeg) if (inDeg[id] === 0) q.push(id);
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of adj[u] || []) {
      inDeg[v]--;
      if (inDeg[v] === 0) q.push(v);
    }
  }
  // Añadir los que quedaron fuera (ciclos, etc.) al final
  for (const n of nodes) if (!order.includes(n.id)) order.push(n.id);
  return order;
}

function settleModule(nodes: RFNode[], edges: RFEdge[]) {
  const order = topoSort(nodes, edges);
  for (let i = 0; i < nodes.length + 6; i++) {
    let changed = false;
    for (const id of order) {
      const n = nodes.find((nd) => nd.id === id);
      if (!n) continue;
      const prev = n.data.outVals ?? [];
      evalNode(n, nodes, edges);
      const cur = n.data.outVals ?? [];
      if (cur.length !== prev.length || cur.some((v, k) => v !== prev[k])) changed = true;
    }
    if (!changed) break;
  }
}

/* Aplica los flancos de reloj a los secuenciales del módulo (una vez) */
function applyEdgesModule(nodes: RFNode[], edges: RFEdge[]) {
  const updates: Array<() => void> = [];
  for (const n of nodes) {
    const d = n.data;
    if (isFF(d.kind)) {
      const def = getDef(d.kind);
      const getIn = (name: string) => inputValue(nodes, edges, n.id, def.inputs.indexOf(name));
      const clk = getIn("CLK");
      const rst = getIn("RST") === 1; // reset asíncrono activo alto
      const en = getIn("EN") !== 0; // enable (sin conectar = habilitado)
      if (rst)
        updates.push(() => {
          d.q = d.init ?? 0;
        });
      else if ((d.prevClk ?? 0) === 0 && clk === 1 && en)
        updates.push(() => {
          d.q = nextFF(d.kind, d.q ?? 0, getIn);
        });
      d.prevClk = clk;
    } else if (d.kind === "REG") {
      const w = regWidth(n);
      const clk = inputValue(nodes, edges, n.id, w);
      const rst = inputValue(nodes, edges, n.id, w + 2) === 1;
      const en = inputValue(nodes, edges, n.id, w + 1) !== 0;
      if (rst)
        updates.push(() => {
          d.bits = new Array(w).fill(d.init ?? 0);
        });
      else if ((d.prevClk ?? 0) === 0 && clk === 1 && en)
        updates.push(() => {
          const bits = (d.bits ?? new Array(w).fill(0)).slice();
          for (let b = 0; b < w; b++) bits[b] = inputValue(nodes, edges, n.id, b);
          d.bits = bits;
        });
      d.prevClk = clk;
    } else if (isSchematic(d.kind)) {
      updates.push(() => {
        evalSchematic(n, nodes, edges, true);
      });
    } else if (d.kind === "RAM") {
      const w = busWidth(n);
      const clk = inputValue(nodes, edges, n.id, 2 * w + 1); // tras A0..Aw-1, D_IN0..D_INw-1, WE
      const we = inputValue(nodes, edges, n.id, 2 * w); // WE
      if ((d.prevClk ?? 0) === 0 && clk === 1 && we === 1) {
        const addr = Array.from({ length: w }, (_, i) => inputValue(nodes, edges, n.id, i));
        const addrVal = addr.reduce<number>((a, b, i) => a + ((b === 1 ? 1 : 0) << i), 0);
        const din = Array.from({ length: w }, (_, i) => inputValue(nodes, edges, n.id, w + i));
        updates.push(() => {
          const mem = (d.mem as Sig[][] | undefined) ? (d.mem as Sig[][]).slice() : [];
          mem[addrVal] = din;
          d.mem = mem;
        });
      }
      d.prevClk = clk;
    }
  }
  updates.forEach((fn) => fn());
}

/* ---------- clon profundo del módulo de trabajo ---------- */
function cloneData(d: NodeData): NodeData {
  return {
    ...d,
    bits: d.bits ? [...d.bits] : undefined,
    outVals: d.outVals ? [...d.outVals] : undefined,
    inVals: d.inVals ? [...d.inVals] : undefined,
    inner: d.inner ? cloneModule(d.inner) : undefined,
  };
}
export function cloneModule(m: Module): Module {
  return { nodes: m.nodes.map((n) => ({ ...n, data: cloneData(n.data) })), edges: m.edges.map((e) => ({ ...e })) };
}

/* MODO RETARDO: avanza la propagación UNA capa.
   Doble-buffer: lee de un snapshot congelado (prev), escribe sobre los nodos originales. */
export function deltaStep(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  const prev = cloneModule({ nodes, edges });
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const d = n.data;
    const oldOuts = prev.nodes[i]?.data.outVals ?? [];
    evalNode(n, prev.nodes, prev.edges);
    const delay = (d.delay as number) ?? 1;
    if (delay > 1) {
      n.data.outVals = oldOuts;
    }
  }
  for (const n of nodes) n.data.inVals = portsOf(n).inputs.map((_, j) => inputRaw(nodes, edges, n.id, j));
  return nodes;
}

/* Un ciclo de simulación: combinacional -> flancos -> combinacional.
   Muta el módulo in situ (el caller debe pasar una copia fresca si la necesita). */
export function simulate(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  settleModule(nodes, edges);
  applyEdgesModule(nodes, edges);
  settleModule(nodes, edges);
  for (const n of nodes) {
    n.data.inVals = portsOf(n).inputs.map((_, i) => inputRaw(nodes, edges, n.id, i));
  }
  return nodes;
}

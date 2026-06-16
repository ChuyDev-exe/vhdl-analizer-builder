// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge, NodeData, Module, Sig, PortVal } from "./types";
import { getDef, isGate, isFF, isExprCustom, isSchematic, nextFF, regWidth, portsOf, def4, asSig, asBits, busWidth, GATE_FN } from "./defs";

const portIdx = (h: string | null | undefined) => (h ? Number(h.slice(1)) : 0);
const notSig = (s: Sig): Sig => (s === 0 ? 1 : s === 1 ? 0 : "x");

/* valor (escalar o bus) presente en la entrada `idx` de `id`. Sin conexión -> 'z'. */
function inputRaw(nodes: RFNode[], edges: RFEdge[], id: string, idx: number): PortVal {
  const e = edges.find((ed) => ed.target === id && portIdx(ed.targetHandle) === idx);
  if (!e) return "z";
  const src = nodes.find((n) => n.id === e.source);
  return src ? (src.data.outVals?.[portIdx(e.sourceHandle)] ?? "z") : "z";
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
    if (vals.some((v) => !def4(v)))
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

function settleModule(nodes: RFNode[], edges: RFEdge[]) {
  for (let i = 0; i < nodes.length + 6; i++) {
    let changed = false;
    for (const n of nodes) {
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

/* MODO RETARDO: avanza la propagación UNA capa (retardo unitario por compuerta).
   Doble-buffer: cada nodo calcula su salida a partir de las salidas del paso ANTERIOR,
   de modo que los glitches/hazards se hacen visibles a lo largo de varios pasos delta. */
export function deltaStep(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  const prev = cloneModule({ nodes, edges }); // valores del paso anterior (solo lectura)
  const next = cloneModule({ nodes, edges }); // se escribe aquí
  for (let i = 0; i < next.nodes.length; i++) evalNode(next.nodes[i], prev.nodes, prev.edges);
  for (const n of next.nodes) n.data.inVals = portsOf(n).inputs.map((_, j) => inputRaw(next.nodes, next.edges, n.id, j));
  return next.nodes;
}

/* Un ciclo de simulación: combinacional -> flancos -> combinacional */
export function simulate(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  const work = cloneModule({ nodes, edges });
  settleModule(work.nodes, work.edges);
  applyEdgesModule(work.nodes, work.edges);
  settleModule(work.nodes, work.edges);
  // calcular entradas vivas para coloreado
  for (const n of work.nodes) {
    n.data.inVals = portsOf(n).inputs.map((_, i) => inputRaw(work.nodes, work.edges, n.id, i));
  }
  return work.nodes;
}

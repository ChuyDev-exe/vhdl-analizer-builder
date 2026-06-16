// SPDX-License-Identifier: MIT
import { compileExpr } from "./expr";
import type { RFNode, RFEdge, Sig, PortVal } from "./types";

export const def4 = (s: Sig): s is 0 | 1 => s === 0 || s === 1;

/* coerción entre valor de puerto (escalar/vector) y escalar/bus */
export function asSig(v: PortVal | undefined): Sig {
  if (Array.isArray(v)) return v.length === 1 ? v[0] : "x";
  return v ?? "z";
}
export function asBits(v: PortVal | undefined, w: number): Sig[] {
  if (Array.isArray(v)) {
    const o = v.slice(0, w);
    while (o.length < w) o.push("z");
    return o;
  }
  const o = new Array(w).fill("z") as Sig[];
  o[0] = v ?? "z";
  return o;
}

export const REG_BITS = 4;

export interface Schematic {
  nodes: RFNode[];
  edges: RFEdge[];
  inputProxyIds: string[]; // id del nodo INPUT/CLOCK interno por cada entrada (en orden)
  outputProxyIds: string[]; // id del nodo OUTPUT interno por cada salida (en orden)
}

export interface CompDef {
  cat: string;
  label: string;
  inputs: string[];
  outputs: string[];
  seq?: boolean;
  clock?: boolean;
  register?: boolean;
  custom?: boolean;
  ico?: string; // icono emoji
  exprs?: Record<string, string>; // componente por expresión
  compiled?: Record<string, (i: Record<string, number>) => number>;
  schematic?: Schematic; // componente definido por VHDL
  vhdlSource?: string;
}

export const NODE_DEFS: Record<string, CompDef> = {
  INPUT: { cat: "Entradas / Salidas", label: "IN", inputs: [], outputs: ["Q"] },
  CLOCK: { cat: "Entradas / Salidas", label: "CLK", inputs: [], outputs: ["Q"], clock: true },
  OUTPUT: { cat: "Entradas / Salidas", label: "OUT", inputs: ["D"], outputs: [] },

  AND: { cat: "Compuertas", label: "AND", inputs: ["A", "B"], outputs: ["Y"] },
  OR: { cat: "Compuertas", label: "OR", inputs: ["A", "B"], outputs: ["Y"] },
  NOT: { cat: "Compuertas", label: "NOT", inputs: ["A"], outputs: ["Y"] },
  NAND: { cat: "Compuertas", label: "NAND", inputs: ["A", "B"], outputs: ["Y"] },
  NOR: { cat: "Compuertas", label: "NOR", inputs: ["A", "B"], outputs: ["Y"] },
  XOR: { cat: "Compuertas", label: "XOR", inputs: ["A", "B"], outputs: ["Y"] },
  XNOR: { cat: "Compuertas", label: "XNOR", inputs: ["A", "B"], outputs: ["Y"] },

  DFF: { cat: "Secuencial / Memoria", label: "FF D", inputs: ["D", "   ", "EN", "RST"], outputs: ["Q", "Qn"], seq: true },
  TFF: { cat: "Secuencial / Memoria", label: "FF T", inputs: ["T", "   ", "EN", "RST"], outputs: ["Q", "Qn"], seq: true },
  JKFF: { cat: "Secuencial / Memoria", label: "FF JK", inputs: ["J", "K", "   ", "EN", "RST"], outputs: ["Q", "Qn"], seq: true },
  SRFF: { cat: "Secuencial / Memoria", label: "FF SR", inputs: ["S", "R", "   ", "EN", "RST"], outputs: ["Q", "Qn"], seq: true },

  /* Buses multibit */
  BUSIN: { cat: "Buses", label: "BUS-IN", inputs: [], outputs: ["Q"] },
  BUSOUT: { cat: "Buses", label: "BUS-OUT", inputs: ["D"], outputs: [] },
  SPLIT: { cat: "Buses", label: "SPLIT", inputs: ["D"], outputs: ["Q"] },
  MERGE: { cat: "Buses", label: "MERGE", inputs: ["A", "B"], outputs: ["Y"] },
};

/* puertos de bus: qué índices de un componente llevan vectores en vez de 1 bit */
export function isBusInput(kind: string, i: number): boolean {
  return (kind === "BUSOUT" && i === 0) || (kind === "SPLIT" && i === 0);
}
export function isBusOutput(kind: string, i: number): boolean {
  return (kind === "BUSIN" && i === 0) || (kind === "MERGE" && i === 0);
}
export function isBus(kind: string): boolean {
  return kind === "BUSIN" || kind === "BUSOUT" || kind === "SPLIT" || kind === "MERGE";
}

// álgebra de 4 estados (z se trata como x en las entradas de compuerta)
const AND2 = (a: Sig, b: Sig): Sig => (a === 0 || b === 0 ? 0 : a === 1 && b === 1 ? 1 : "x");
const OR2 = (a: Sig, b: Sig): Sig => (a === 1 || b === 1 ? 1 : a === 0 && b === 0 ? 0 : "x");
const NOT1 = (a: Sig): Sig => (a === 0 ? 1 : a === 1 ? 0 : "x");
const XOR2 = (a: Sig, b: Sig): Sig => (def4(a) && def4(b) ? ((a ^ b) as Sig) : "x");

export const GATE_FN: Record<string, (i: Sig[]) => Sig[]> = {
  AND: (i) => [AND2(i[0], i[1])],
  OR: (i) => [OR2(i[0], i[1])],
  NOT: (i) => [NOT1(i[0])],
  NAND: (i) => [NOT1(AND2(i[0], i[1]))],
  NOR: (i) => [NOT1(OR2(i[0], i[1]))],
  XOR: (i) => [XOR2(i[0], i[1])],
  XNOR: (i) => [NOT1(XOR2(i[0], i[1]))],
};

/* Registro de componentes personalizados (kind = "CUSTOM:NOMBRE") */
export const CUSTOM: Record<string, CompDef> = {};

export function getDef(kind: string): CompDef {
  if (kind.startsWith("CUSTOM:")) return CUSTOM[kind];
  return NODE_DEFS[kind];
}
export const FF_KINDS = ["DFF", "TFF", "JKFF", "SRFF"];
export function isFF(kind: string) {
  return FF_KINDS.includes(kind);
}
export function isGate(kind: string) {
  return !!GATE_FN[kind];
}
export function isCustom(kind: string) {
  return kind.startsWith("CUSTOM:");
}

/* ancho de un registro (configurable por instancia, por defecto REG_BITS) */
export function regWidth(n: RFNode): number {
  return (n.data.width as number) || REG_BITS;
}
export function regPorts(w: number): { inputs: string[]; outputs: string[] } {
  return {
    inputs: Array.from({ length: w }, (_, b) => "D" + b).concat("CLK", "EN", "RST"),
    outputs: Array.from({ length: w }, (_, b) => "Q" + b),
  };
}
export function busWidth(n: RFNode): number {
  return (n.data.width as number) || 4;
}

/* puertos efectivos de un nodo (REG/SPLIT/MERGE dependen de su ancho) */
export function portsOf(n: RFNode): { inputs: string[]; outputs: string[] } {
  const k = n.data.kind;
  if (k === "REG") return regPorts(regWidth(n));
  if (k === "SPLIT") return { inputs: ["D"], outputs: Array.from({ length: busWidth(n) }, (_, b) => "b" + b) };
  if (k === "MERGE") return { inputs: Array.from({ length: busWidth(n) }, (_, b) => "b" + b), outputs: ["Y"] };
  const d = getDef(k);
  return { inputs: d?.inputs || [], outputs: d?.outputs || [] };
}

/* próximo estado Q de un flip-flop según su tipo (en flanco de subida), 4 estados.
   q = estado actual; getIn(nombrePuerto) = valor en esa entrada. */
export function nextFF(kind: string, q: Sig, getIn: (name: string) => Sig): Sig {
  const tog = (s: Sig): Sig => (s === 0 ? 1 : s === 1 ? 0 : "x");
  switch (kind) {
    case "DFF":
      return getIn("D");
    case "TFF": {
      const t = getIn("T");
      return t === 1 ? tog(q) : t === 0 ? q : "x";
    }
    case "JKFF": {
      const j = getIn("J"),
        k = getIn("K");
      if (!def4(j) || !def4(k)) return "x";
      if (j && k) return tog(q);
      return j ? 1 : k ? 0 : q; // Q+ = J·Q' + K'·Q
    }
    case "SRFF": {
      const s = getIn("S"),
        r = getIn("R");
      if (!def4(s) || !def4(r)) return "x";
      if (s && r) return "x"; // conflicto S=R=1
      return s ? 1 : r ? 0 : q;
    }
    default:
      return q;
  }
}
export function isSchematic(kind: string) {
  const d = getDef(kind);
  return !!(d && d.schematic);
}
export function isExprCustom(kind: string) {
  const d = getDef(kind);
  return !!(d && d.compiled && !d.schematic);
}
export function removeCustom(kind: string) {
  delete CUSTOM[kind];
}

/* duplica un componente personalizado bajo un nombre nuevo */
export function duplicateCustom(kind: string, newName: string): string {
  const d = CUSTOM[kind];
  if (!d) throw new Error("el componente no existe");
  const clean = newName.trim().replace(/[^A-Za-z0-9_]/g, "");
  if (!clean) throw new Error("nombre inválido");
  const nk = "CUSTOM:" + clean.toUpperCase();
  if (CUSTOM[nk]) throw new Error(`ya existe un componente '${clean}'`);
  CUSTOM[nk] = { ...d, label: clean };
  return nk;
}
/* renombra un componente (crea con el nombre nuevo y elimina el viejo) */
export function renameCustom(kind: string, newName: string): string {
  const nk = duplicateCustom(kind, newName);
  delete CUSTOM[kind];
  return nk;
}

export function defineCustom(name: string, inputsStr: string, exprLines: string): string {
  const clean = name.trim().replace(/[^A-Za-z0-9_]/g, "");
  if (!clean) throw new Error("nombre inválido");
  const inputs = inputsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!inputs.length) throw new Error("define al menos una entrada");
  const exprs: Record<string, string> = {};
  const compiled: Record<string, (i: Record<string, number>) => number> = {};
  const outputs: string[] = [];
  exprLines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
      if (!m) throw new Error("línea inválida: " + line);
      compiled[m[1]] = compileExpr(m[2]); // valida la sintaxis
      exprs[m[1]] = m[2];
      outputs.push(m[1]);
    });
  if (!outputs.length) throw new Error("define al menos una salida");
  const kind = "CUSTOM:" + clean.toUpperCase();
  CUSTOM[kind] = { cat: "Personalizados", label: clean, inputs, outputs, custom: true, exprs, compiled };
  return kind;
}

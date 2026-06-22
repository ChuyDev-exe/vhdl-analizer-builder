// SPDX-License-Identifier: MIT
import type { Node, Edge } from "@xyflow/react";

/* Señal lógica estilo STD_LOGIC completa:
   0, 1, "x" = indefinido/conflicto, "z" = alta impedancia / sin conectar,
   "u" = uninitialized, "-" = don't care */
export type Sig = 0 | 1 | "x" | "z" | "u" | "-";

/* Valor en un puerto: escalar (1 bit) o vector (bus de N bits). */
export type PortVal = Sig | Sig[];

export interface NodeData {
  kind: string; // "AND", "INPUT", "CUSTOM:MUX2", ...
  label?: string; // nombre de puerto VHDL (IO)
  value?: Sig; // INPUT / CLOCK / OUTPUT
  q?: Sig; // D flip-flop
  bits?: Sig[]; // registro / bus (BUS-IN / BUS-OUT / MERGE…)
  prevClk?: Sig; // detección de flanco
  outVals?: PortVal[]; // salidas vivas (coloreado)
  inVals?: PortVal[]; // entradas vivas (coloreado)
  init?: Sig; // valor inicial del elemento secuencial (por defecto 0)
  div?: number; // divisor de frecuencia del reloj (multi-reloj)
  duty?: number; // ciclo de trabajo 0-100 (por defecto 50)
  delay?: number; // retardo de propagación (modo retardo)
  mem?: Sig[][]; // contenido de ROM/RAM (array de palabras)
  tPLH?: number; // retardo LOW→HIGH individual por compuerta
  tPHL?: number; // retardo HIGH→LOW individual por compuerta
  inner?: Module; // estado interno vivo de un componente definido por VHDL
  [key: string]: unknown; // índice para compatibilidad con React Flow
}

export type RFNode = Node<NodeData>;
export type RFEdge = Edge;

export interface Module {
  nodes: RFNode[];
  edges: RFEdge[];
}

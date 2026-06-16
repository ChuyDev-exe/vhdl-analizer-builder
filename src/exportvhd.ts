// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge, Sig, PortVal } from "./types";
import { isFF, regWidth, busWidth } from "./defs";

const clean = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_");
const scalar = (v: PortVal | undefined): Sig => (Array.isArray(v) ? "x" : (v ?? "z"));

export interface WaveRow {
  id: string;
  label: string;
}
export interface WaveSample {
  vals: Record<string, PortVal>;
}

/* ============================================================
   EXPORTAR VCD (Value Change Dump) del diagrama de tiempos
   Compatible con GTKWave / ModelSim. 1 bit por traza.
   ============================================================ */
export function toVCD(rows: WaveRow[], history: WaveSample[], stepNs = 10): string {
  const L: string[] = [];
  L.push("$date today $end", "$timescale 1ns $end", "$scope module testbench $end");
  // un símbolo imprimible por traza (desde '!')
  const sym: Record<string, string> = {};
  rows.forEach((r, i) => {
    sym[r.id] = String.fromCharCode(33 + i);
    L.push(`$var wire 1 ${sym[r.id]} ${clean(r.label)} $end`);
  });
  L.push("$upscope $end", "$enddefinitions $end");

  let prev: Record<string, Sig> = {};
  history.forEach((s, t) => {
    const changes: string[] = [];
    const cur: Record<string, Sig> = {};
    rows.forEach((r) => {
      const v = scalar(s.vals[r.id]);
      cur[r.id] = v;
      if (t === 0 || prev[r.id] !== v) changes.push(`${v}${sym[r.id]}`);
    });
    if (changes.length) {
      L.push(`#${t * stepNs}`);
      L.push(...changes);
    }
    prev = cur;
  });
  return L.join("\n") + "\n";
}

/* ============================================================
   GENERAR TESTBENCH VHDL
   Instancia el diseño y reproduce los estímulos registrados
   (secuencia de entradas) más la generación de reloj.
   ============================================================ */
export function generateTestbench(nodes: RFNode[], edges: RFEdge[], entName: string, history: WaveSample[], stepNs = 10): string {
  const name = clean(entName || "circuito");
  const inputs = nodes.filter((n) => n.data.kind === "INPUT");
  const clocks = nodes.filter((n) => n.data.kind === "CLOCK");
  const outputs = nodes.filter((n) => n.data.kind === "OUTPUT");
  const busIns = nodes.filter((n) => n.data.kind === "BUSIN");
  const busOuts = nodes.filter((n) => n.data.kind === "BUSOUT");
  const ioName = (n: RFNode) => clean((n.data.label as string) || n.id);
  const bw = (n: RFNode) => (n.data.width as number) || 4;

  const L: string[] = [];
  L.push("library IEEE;", "use IEEE.STD_LOGIC_1164.ALL;", "", `entity tb_${name} is`, `end tb_${name};`, "");
  L.push(`architecture sim of tb_${name} is`);
  [...inputs, ...clocks].forEach((c) => L.push(`  signal ${ioName(c)} : STD_LOGIC := '0';`));
  busIns.forEach((c) => L.push(`  signal ${ioName(c)} : STD_LOGIC_VECTOR(${bw(c) - 1} downto 0) := (others => '0');`));
  outputs.forEach((c) => L.push(`  signal ${ioName(c)} : STD_LOGIC;`));
  busOuts.forEach((c) => L.push(`  signal ${ioName(c)} : STD_LOGIC_VECTOR(${bw(c) - 1} downto 0);`));
  L.push(`  constant PERIODO : time := ${stepNs} ns;`, "begin", "");

  // instancia del diseño bajo prueba
  const maps = [...inputs, ...clocks, ...busIns, ...outputs, ...busOuts].map((c) => `    ${ioName(c)} => ${ioName(c)}`);
  L.push(`  uut : entity work.${name}`, "  port map (", maps.join(",\n"), "  );", "");

  // generación de reloj
  clocks.forEach((c) => {
    L.push(`  -- reloj ${ioName(c)}`, `  ${ioName(c)} <= not ${ioName(c)} after PERIODO/2;`, "");
  });

  // estímulos a partir de la secuencia registrada en el waveform
  const allStim = [...inputs, ...busIns];
  if (history.length && allStim.length) {
    L.push("  -- estímulos registrados desde el simulador", "  estimulos : process", "  begin");
    type StimState = Record<string, Sig | Sig[]>;
    const sigKey = (id: string) => id;
    let prev: StimState = {};
    history.forEach((s, t) => {
      const sets: string[] = [];
      const cur: StimState = {};
      inputs.forEach((c) => {
        const v = scalar(s.vals[c.id]);
        cur[sigKey(c.id)] = v;
        if (t === 0 || v !== (prev[c.id] ?? 0)) sets.push(`    ${ioName(c)} <= '${v}';`);
      });
      busIns.forEach((c) => {
        const raw = s.vals[c.id];
        const v: Sig[] = Array.isArray(raw) ? raw : (new Array(bw(c)).fill(0) as Sig[]);
        cur[sigKey(c.id)] = v;
        const prevV = prev[c.id];
        const changed = t === 0 || !Array.isArray(prevV) || prevV.length !== v.length || v.some((b, i) => b !== (prevV as Sig[])[i]);
        if (changed) sets.push(`    ${ioName(c)} <= "${v.map((b) => (b === 1 ? "1" : "0")).join("")}";`);
      });
      if (sets.length) {
        L.push(...sets, "    wait for PERIODO;");
      } else L.push("    wait for PERIODO;");
      prev = cur;
    });
    L.push("    wait;", "  end process;");
  } else {
    L.push(
      "  -- añade estímulos aquí (no hay traza registrada todavía)",
      "  estimulos : process begin",
      "    wait for 10 * PERIODO;",
      "    wait;",
      "  end process;",
    );
  }

  L.push("", "end sim;");
  return L.join("\n");
}

/* filas de traza (igual criterio que el panel de ondas) */
export function waveRows(nodes: RFNode[]): WaveRow[] {
  const rows: WaveRow[] = [];
  nodes.forEach((n) => {
    if (n.data.kind === "INPUT") rows.push({ id: n.id, label: (n.data.label as string) || n.id });
  });
  nodes.forEach((n) => {
    if (n.data.kind === "CLOCK") rows.push({ id: n.id, label: (n.data.label as string) || "clk" });
  });
  nodes.forEach((n) => {
    if (isFF(n.data.kind)) rows.push({ id: n.id, label: ((n.data.label as string) || n.id) + ".Q" });
  });
  nodes.forEach((n) => {
    if (n.data.kind === "REG") for (let b = 0; b < regWidth(n); b++) rows.push({ id: n.id + ":" + b, label: n.id + ".b" + b });
  });
  nodes.forEach((n) => {
    if (n.data.kind === "OUTPUT") rows.push({ id: n.id, label: (n.data.label as string) || n.id });
  });
  return rows;
}

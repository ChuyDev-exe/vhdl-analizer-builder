// SPDX-License-Identifier: MIT
import type { RFNode, RFEdge, NodeData, Module, Sig } from "./types";
import { getDef, isGate, isFF, isCustom, isSchematic, isExprCustom, regWidth, CUSTOM, REG_BITS, type Schematic, type CompDef } from "./defs";
import { parseExpr, type Ast } from "./expr";

const portIdx = (h: string | null | undefined) => (h ? Number(h.slice(1)) : 0);
const clean = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_");

/* ============================================================
   DIAGRAMA -> VHDL
   ============================================================ */
function baseName(kind: string): string {
  return (
    (
      {
        INPUT: "in",
        OUTPUT: "out",
        CLOCK: "clk",
        AND: "and_g",
        OR: "or_g",
        NOT: "not_g",
        NAND: "nand_g",
        NOR: "nor_g",
        XOR: "xor_g",
        XNOR: "xnor_g",
        DFF: "dff",
        REG: "reg",
      } as Record<string, string>
    )[kind] || "u"
  );
}
function ioName(n: RFNode): string {
  return clean((n.data.label as string) || `${baseName(n.data.kind)}_${n.id}`);
}

export function generateVhdl(nodes: RFNode[], edges: RFEdge[], entName: string): string {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // expresión VECTORIAL que alimenta la entrada de bus `idx` de `targetId`
  const busDriver = (targetId: string, idx: number): string => {
    const e = edges.find((ed) => ed.target === targetId && portIdx(ed.targetHandle) === idx);
    const src = e && byId.get(e.source);
    if (!src) return `(others => '0')`;
    if (src.data.kind === "BUSIN") return ioName(src);
    if (src.data.kind === "MERGE") return `merge_${clean(src.id)}`;
    return `(others => '0')`;
  };
  const driver = (targetId: string, idx: number): string => {
    const e = edges.find((ed) => ed.target === targetId && portIdx(ed.targetHandle) === idx);
    if (!e) return "'0'";
    const src = byId.get(e.source);
    if (!src) return "'0'";
    const k = src.data.kind,
      p = portIdx(e.sourceHandle);
    if (k === "INPUT" || k === "CLOCK") return ioName(src);
    if (isFF(k)) return p === 0 ? `${clean(src.id)}_q` : `(not ${clean(src.id)}_q)`;
    if (k === "REG") return `${clean(src.id)}_q(${p})`;
    if (k === "SPLIT") return `${busDriver(src.id, 0)}(${p})`; // bit p del bus de entrada del SPLIT
    if (isCustom(k)) return `u_${clean(src.id)}_${getDef(k).outputs[p]}`;
    return `${clean(src.id)}_y`;
  };

  const inputs = nodes.filter((n) => n.data.kind === "INPUT");
  const clocks = nodes.filter((n) => n.data.kind === "CLOCK");
  const outputs = nodes.filter((n) => n.data.kind === "OUTPUT");
  const gates = nodes.filter((n) => isGate(n.data.kind));
  const customs = nodes.filter((n) => isCustom(n.data.kind));
  const exprCustoms = nodes.filter((n) => isExprCustom(n.data.kind));
  const schCustoms = nodes.filter((n) => isSchematic(n.data.kind));
  const ffs = nodes.filter((n) => isFF(n.data.kind));
  const regs = nodes.filter((n) => n.data.kind === "REG");
  const busIns = nodes.filter((n) => n.data.kind === "BUSIN");
  const busOuts = nodes.filter((n) => n.data.kind === "BUSOUT");
  const merges = nodes.filter((n) => n.data.kind === "MERGE");
  const bw = (n: RFNode) => (n.data.width as number) || 4;
  const name = clean(entName || "circuito");

  const L: string[] = ["library IEEE;", "use IEEE.STD_LOGIC_1164.ALL;", "", `entity ${name} is`];
  const ports: string[] = [];
  inputs.forEach((c) => ports.push(`    ${ioName(c)} : in  STD_LOGIC`));
  clocks.forEach((c) => ports.push(`    ${ioName(c)} : in  STD_LOGIC`));
  busIns.forEach((c) => ports.push(`    ${ioName(c)} : in  STD_LOGIC_VECTOR(${bw(c) - 1} downto 0)`));
  outputs.forEach((c) => ports.push(`    ${ioName(c)} : out STD_LOGIC`));
  busOuts.forEach((c) => ports.push(`    ${ioName(c)} : out STD_LOGIC_VECTOR(${bw(c) - 1} downto 0)`));
  if (ports.length) L.push("  port (", ports.join(";\n"), "  );");
  L.push(`end ${name};`, "", `architecture rtl of ${name} is`);
  gates.forEach((c) => L.push(`  signal ${clean(c.id)}_y : STD_LOGIC;`));
  customs.forEach((c) => getDef(c.data.kind).outputs.forEach((o) => L.push(`  signal u_${clean(c.id)}_${o} : STD_LOGIC;`)));
  ffs.forEach((c) => L.push(`  signal ${clean(c.id)}_q : STD_LOGIC;`));
  regs.forEach((c) => L.push(`  signal ${clean(c.id)}_q : STD_LOGIC_VECTOR(${regWidth(c) - 1} downto 0);`));
  merges.forEach((c) => L.push(`  signal merge_${clean(c.id)} : STD_LOGIC_VECTOR(${bw(c) - 1} downto 0);`));
  // declaración de componentes (definidos por VHDL) usados en el diseño
  const usedSchKinds = [...new Set(schCustoms.map((c) => c.data.kind))];
  usedSchKinds.forEach((k) => {
    const d = getDef(k);
    L.push(`  component ${clean(d.label)} is`);
    const cp = d.inputs.map((p) => `    ${p} : in  STD_LOGIC`).concat(d.outputs.map((p) => `    ${p} : out STD_LOGIC`));
    L.push("  port (", cp.join(";\n"), "  );", "  end component;");
  });
  L.push("begin", "");

  gates.forEach((c) => {
    const a = driver(c.id, 0),
      b = c.data.kind === "NOT" ? "" : driver(c.id, 1);
    let expr = "";
    switch (c.data.kind) {
      case "AND":
        expr = `${a} and ${b}`;
        break;
      case "OR":
        expr = `${a} or ${b}`;
        break;
      case "NOT":
        expr = `not ${a}`;
        break;
      case "NAND":
        expr = `not (${a} and ${b})`;
        break;
      case "NOR":
        expr = `not (${a} or ${b})`;
        break;
      case "XOR":
        expr = `${a} xor ${b}`;
        break;
      case "XNOR":
        expr = `not (${a} xor ${b})`;
        break;
    }
    L.push(`  ${clean(c.id)}_y <= ${expr};`);
  });
  // componentes por expresión: asignación concurrente en línea
  exprCustoms.forEach((c) => {
    const d = getDef(c.data.kind);
    L.push(`  -- componente ${d.label} (${c.id})`);
    d.outputs.forEach((o) => {
      let e = d.exprs![o];
      d.inputs.forEach((inp, idx) => {
        e = e.replace(new RegExp("\\b" + inp + "\\b", "g"), `(${driver(c.id, idx)})`);
      });
      L.push(`  u_${clean(c.id)}_${o} <= ${e};`);
    });
  });
  // componentes definidos por VHDL: instanciación estructural (port map)
  schCustoms.forEach((c) => {
    const d = getDef(c.data.kind);
    const maps = d.inputs.map((p, i) => `    ${p} => ${driver(c.id, i)}`).concat(d.outputs.map((o) => `    ${o} => u_${clean(c.id)}_${o}`));
    L.push(`  u_${clean(c.id)} : ${clean(d.label)}`, "  port map (", maps.join(",\n"), "  );");
  });
  // MERGE: concatena los bits de entrada en un bus (MSB primero)
  merges.forEach((c) => {
    const w = bw(c);
    const parts = Array.from({ length: w }, (_, i) => `(${driver(c.id, w - 1 - i)})`);
    L.push(`  merge_${clean(c.id)} <= ${parts.join(" & ")};`);
  });
  if (gates.length || customs.length || merges.length) L.push("");

  const sens = (s: string) => {
    s = s
      .replace(/^\(not\s+/, "")
      .replace(/\)$/, "")
      .replace(/\(.*\)$/, "");
    return s === "'0'" ? "clk" : s;
  };
  ffs.forEach((c) => {
    const d = getDef(c.data.kind);
    const q = `${clean(c.id)}_q`;
    const drv = (name: string) => driver(c.id, d.inputs.indexOf(name));
    const clk = sens(drv("CLK"));
    let next: string;
    switch (c.data.kind) {
      case "TFF":
        next = `${q} xor (${drv("T")})`;
        break; // Q+ = Q xor T
      case "JKFF":
        next = `((${drv("J")}) and (not ${q})) or ((not (${drv("K")})) and ${q})`;
        break; // Q+ = J·Q' + K'·Q
      case "SRFF":
        next = `(${drv("S")}) or ((not (${drv("R")})) and ${q})`;
        break; // Q+ = S + R'·Q
      default:
        next = drv("D"); // D-FF
    }
    const rst = drv("RST"),
      en = drv("EN");
    const hasRst = rst !== "'0'",
      hasEn = en !== "'0'";
    const initVal = c.data.init === 1 ? "'1'" : "'0'";
    const cap = hasEn ? `if ${en} = '1' then ${q} <= ${next}; end if;` : `${q} <= ${next};`;
    L.push(`  -- ${d.label} ${c.id}`, `  process(${clk}${hasRst ? ", " + sens(rst) : ""})`, "  begin");
    if (hasRst) L.push(`    if ${sens(rst)} = '1' then`, `      ${q} <= ${initVal};`, `    elsif rising_edge(${clk}) then`, `      ${cap}`, "    end if;");
    else L.push(`    if rising_edge(${clk}) then`, `      ${cap}`, "    end if;");
    L.push("  end process;", "");
  });
  regs.forEach((c) => {
    const w = regWidth(c);
    const clk = sens(driver(c.id, w));
    L.push(`  -- Registro ${c.id} (${w} bits)`, `  process(${clk})`, "  begin", `    if rising_edge(${clk}) then`);
    for (let b = 0; b < w; b++) L.push(`      ${clean(c.id)}_q(${b}) <= ${driver(c.id, b)};`);
    L.push("    end if;", "  end process;", "");
  });
  outputs.forEach((c) => L.push(`  ${ioName(c)} <= ${driver(c.id, 0)};`));
  busOuts.forEach((c) => L.push(`  ${ioName(c)} <= ${busDriver(c.id, 0)};`));
  L.push("", "end rtl;");

  // anteponer las definiciones VHDL de los componentes usados -> archivo único autocontenido
  const sources: string[] = [];
  usedSchKinds.forEach((k) => {
    const d = getDef(k);
    if (d.vhdlSource) sources.push(`-- === componente ${d.label} ===`, d.vhdlSource.trim(), "");
  });
  return [...sources, L.join("\n")].join("\n");
}

/* ============================================================
   VHDL -> DIAGRAMA
   Subconjunto: entity/port (STD_LOGIC), señales, asignaciones
   concurrentes booleanas y procesos rising_edge (D flip-flops).
   ============================================================ */
export interface BuildResult {
  nodes: RFNode[];
  edges: RFEdge[];
  entName: string;
}

export function buildFromVhdl(text: string): BuildResult {
  const src = text.replace(/--[^\n]*/g, "");
  const em = /entity\s+([a-z0-9_]+)\s+is/i.exec(src);
  const entName = em ? em[1] : "circuito";

  const ports: Record<string, "in" | "out"> = {};
  const pm = /port\s*\(([\s\S]*?)\)\s*;/i.exec(src);
  if (pm)
    pm[1].split(";").forEach((decl) => {
      const m = /([a-z0-9_,\s]+):\s*(in|out)\s+std_logic\b/i.exec(decl);
      if (m)
        m[1].split(",").forEach((n) => {
          const nm = n.trim();
          if (nm) ports[nm] = m[2].toLowerCase() as "in" | "out";
        });
    });

  // señales vectoriales: signal name : STD_LOGIC_VECTOR(H downto 0)  -> ancho H+1
  const vec: Record<string, number> = {};
  let vm: RegExpExecArray | null;
  const vecRe = /signal\s+([a-z0-9_,\s]+):\s*std_logic_vector\s*\(\s*(\d+)\s+downto\s+0\s*\)/gi;
  while ((vm = vecRe.exec(src)))
    vm[1].split(",").forEach((n) => {
      const nm = n.trim();
      if (nm) vec[nm] = +vm![2] + 1;
    });

  const ffDriver: Record<string, { d: string; clk: string; rst?: string; init?: string }> = {};
  const regAssign: Record<string, { clk: string; bits: Record<number, string> }> = {}; // registros vectoriales
  const clkNames = new Set<string>();
  let pr: RegExpExecArray | null;
  const procRe = /process\s*\([\s\S]*?\)([\s\S]*?)end\s+process\s*;/gi;
  while ((pr = procRe.exec(src))) {
    const body = pr[1];
    const cm = /rising_edge\s*\(\s*([a-z0-9_]+)\s*\)/i.exec(body);
    if (!cm) continue;
    clkNames.add(cm[1].toLowerCase());
    // asignaciones a bits de vector:  name(i) <= expr;  -> registro
    let vi: RegExpExecArray | null;
    const vidxRe = /([a-z0-9_]+)\s*\(\s*(\d+)\s*\)\s*<=\s*([^;]+);/gi;
    while ((vi = vidxRe.exec(body))) {
      const nm = vi[1].trim();
      (regAssign[nm] || (regAssign[nm] = { clk: cm[1], bits: {} })).bits[+vi[2]] = vi[3].trim();
    }
    // asignaciones escalares:  q <= d;  -> flip-flop D (excluye las indexadas)
    let am: RegExpExecArray | null;
    const asgRe = /([a-z0-9_]+)\s*<=\s*([^;]+);/gi;
    while ((am = asgRe.exec(body))) ffDriver[am[1].trim()] = { d: am[2].trim(), clk: cm[1] };

    // reset asíncrono:  if rst='1' then q<='0'; elsif rising_edge(clk) then q<=d; end if;
    const arm = /if\s*\(?\s*([a-z0-9_]+)\s*(?:=\s*'1')?\s*\)?\s*then([\s\S]*?)elsif\s+rising_edge\s*\(\s*([a-z0-9_]+)\s*\)\s*then([\s\S]*?)end\s+if/i.exec(
      body,
    );
    if (arm) {
      const rstSig = arm[1],
        resetBody = arm[2],
        clk2 = arm[3],
        clkBody = arm[4];
      const initOf: Record<string, string> = {};
      let rm: RegExpExecArray | null;
      const rre = /([a-z0-9_]+)\s*<=\s*([^;]+);/gi;
      while ((rm = rre.exec(resetBody))) initOf[rm[1].trim()] = rm[2].trim();
      let dm: RegExpExecArray | null;
      const dre = /([a-z0-9_]+)\s*<=\s*([^;]+);/gi;
      while ((dm = dre.exec(clkBody))) {
        const tgt = dm[1].trim();
        ffDriver[tgt] = { d: dm[2].trim(), clk: clk2, rst: rstSig, init: initOf[tgt] };
      }
    }
  }

  const noProc = src.replace(/process\s*\([\s\S]*?\)[\s\S]*?end\s+process\s*;/gi, "");
  const noComp = noProc.replace(/component\s+\w+\s+is[\s\S]*?end\s+component\s*;/gi, "");
  const archStart = noComp.search(/\bbegin\b/i);
  const archBody = archStart >= 0 ? noComp.slice(archStart + 5) : noComp;
  const sigDriver: Record<string, string> = {};
  let am2: RegExpExecArray | null;
  const asgRe2 = /([a-z0-9_]+)\s*<=\s*([^;]+);/gi;
  while ((am2 = asgRe2.exec(archBody))) {
    const tgt = am2[1].trim();
    if (/end\b/i.test(tgt)) continue;
    sigDriver[tgt] = am2[2].trim();
  }

  // asignación seleccionada:  with SEL select TGT <= V0 when '0', V1 when '1', VD when others;
  let ws: RegExpExecArray | null;
  const wsRe = /with\s+(\w+)\s+select\s+(\w+)\s*<=\s*([^;]+);/gi;
  while ((ws = wsRe.exec(archBody))) {
    const sel = ws[1],
      tgt = ws[2];
    let v0: string | null = null,
      v1: string | null = null,
      vd: string | null = null;
    ws[3].split(",").forEach((it) => {
      const im2 = /(.+?)\bwhen\b\s*(?:'([01])'|(others))/i.exec(it.trim());
      if (im2) {
        if (im2[2] === "0") v0 = im2[1].trim();
        else if (im2[2] === "1") v1 = im2[1].trim();
        else vd = im2[1].trim();
      }
    });
    const a0 = v0 ?? vd ?? "'0'",
      a1 = v1 ?? vd ?? "'0'";
    sigDriver[tgt] = `((not (${sel})) and (${a0})) or ((${sel}) and (${a1}))`;
  }

  // instanciaciones de componentes:  label : comp [entity work.comp] port map ( a => x, ... );
  interface Inst {
    compName: string;
    maps: { formal?: string; actual: string; pos: number; named: boolean }[];
  }
  const insts: Inst[] = [];
  let im: RegExpExecArray | null;
  const instRe = /(\w+)\s*:\s*(?:entity\s+work\.)?(\w+)\s+port\s+map\s*\(([\s\S]*?)\)\s*;/gi;
  while ((im = instRe.exec(archBody))) {
    const maps = im[3]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((tok, i) => {
        const mm = /^([a-z0-9_]+)\s*=>\s*(.+)$/i.exec(tok);
        return mm ? { formal: mm[1], actual: mm[2].trim(), pos: i, named: true } : { actual: tok, pos: i, named: false };
      });
    insts.push({ compName: im[2], maps });
  }

  const nodes: RFNode[] = [];
  const edges: RFEdge[] = [];
  let lid = 1;
  const nid = () => "n" + lid++;
  const netOut: Record<string, { id: string; port: number }> = {};
  const memo: Record<string, { id: string; port: number } | "__building__"> = {};

  const mk = (kind: string, data: Partial<NodeData> = {}): RFNode => {
    const id = nid();
    const node: RFNode = { id, type: "logic", position: { x: 0, y: 0 }, data: { kind, ...data } };
    nodes.push(node);
    return node;
  };
  const wire = (from: { id: string; port: number }, toId: string, toPort: number) =>
    edges.push({ id: "e" + lid++, source: from.id, sourceHandle: "o" + from.port, target: toId, targetHandle: "i" + toPort });

  for (const name in ports)
    if (ports[name] === "in") {
      const isClk = clkNames.has(name.toLowerCase());
      const c = mk(isClk ? "CLOCK" : "INPUT", { label: name, value: 0 });
      netOut[name] = { id: c.id, port: 0 };
    }

  // crear nodos de las instancias y registrar las nets que producen sus salidas
  const instNodes: { node: RFNode; def: CompDef; maps: Inst["maps"] }[] = [];
  for (const inst of insts) {
    const kind = "CUSTOM:" + inst.compName.toUpperCase();
    const def = CUSTOM[kind];
    if (!def) throw new Error("componente no encontrado en la librería: " + inst.compName);
    const node = mk(kind, { inner: instantiateInner(kind) });
    const combined = [...def.inputs, ...def.outputs];
    inst.maps.forEach((mp) => {
      const formal = mp.named ? mp.formal! : combined[mp.pos];
      const oi = def.outputs.findIndex((p) => p.toLowerCase() === (formal || "").toLowerCase());
      if (oi >= 0) netOut[mp.actual] = { id: node.id, port: oi };
    });
    instNodes.push({ node, def, maps: inst.maps });
  }

  // crear registros vectoriales (L2) y registrar las nets de sus salidas: name(i) -> Qi
  const regNodes: { node: RFNode; ra: { clk: string; bits: Record<number, string> }; w: number }[] = [];
  for (const name in regAssign) {
    const ra = regAssign[name];
    const w = vec[name] || Math.max(...Object.keys(ra.bits).map(Number)) + 1;
    const node = mk("REG", { width: w, bits: new Array(w).fill(0) as Sig[] });
    for (let i = 0; i < w; i++) netOut[`${name}(${i})`] = { id: node.id, port: i };
    regNodes.push({ node, ra, w });
  }

  const findKey = (obj: Record<string, unknown>, name: string) => Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase());

  function resolveNet(name: string): { id: string; port: number } {
    const key = name.toLowerCase();
    const direct = findKey(netOut, name);
    if (direct) return netOut[direct];
    if (memo[key] && memo[key] !== "__building__") return memo[key] as { id: string; port: number };

    const ffKey = findKey(ffDriver, name);
    if (ffKey) {
      const ff = ffDriver[ffKey];
      const c = mk("DFF", { label: name, init: ff.init === "'1'" ? 1 : 0 });
      memo[key] = { id: c.id, port: 0 };
      const d = buildExpr(ff.d);
      if (d) wire(d, c.id, 0);
      const clk = resolveNet(ff.clk);
      if (clk) wire(clk, c.id, 1);
      if (ff.rst) {
        const r = resolveNet(ff.rst);
        if (r) wire(r, c.id, 3);
      } // RST = entrada 3
      return memo[key] as { id: string; port: number };
    }
    const sgKey = findKey(sigDriver, name);
    if (sgKey) {
      memo[key] = "__building__";
      const r = buildExpr(sigDriver[sgKey]);
      memo[key] = r;
      return r;
    }
    const c = mk("INPUT", { label: name, value: 0 });
    netOut[name] = { id: c.id, port: 0 };
    return netOut[name];
  }

  function buildExpr(str: string): { id: string; port: number } {
    let ast: Ast;
    const expanded = expandWhenElse(str);
    try {
      ast = parseExpr(expanded);
    } catch (e) {
      throw new Error(`expresión "${str}": ${(e as Error).message}`);
    }
    return buildAst(ast);
  }
  function buildAst(ast: Ast): { id: string; port: number } {
    if ("lit" in ast) {
      const c = mk("INPUT", { value: ast.lit as Sig });
      return { id: c.id, port: 0 };
    }
    if ("ref" in ast) {
      const r = resolveNet(ast.ref);
      if ((memo[ast.ref.toLowerCase()] as unknown) === "__building__") throw new Error("bucle combinacional en " + ast.ref);
      return r;
    }
    const typeMap: Record<string, string> = { and: "AND", or: "OR", not: "NOT", nand: "NAND", nor: "NOR", xor: "XOR", xnor: "XNOR" };
    const c = mk(typeMap[ast.op]);
    const l = buildAst(ast.l);
    if (l) wire(l, c.id, 0);
    if (ast.op !== "not") {
      const r = buildAst((ast as any).r);
      if (r) wire(r, c.id, 1);
    }
    return { id: c.id, port: 0 };
  }

  // cablear los registros vectoriales: bits D y reloj
  for (const { node, ra, w } of regNodes) {
    for (let i = 0; i < w; i++) {
      const ex = ra.bits[i];
      if (ex) {
        const s = buildExpr(ex);
        if (s) wire(s, node.id, i);
      }
    }
    const clk = resolveNet(ra.clk);
    if (clk) wire(clk, node.id, w); // CLK = último puerto de entrada
  }

  // cablear las entradas de cada instancia (sus salidas ya están registradas como nets)
  for (const { node, def, maps } of instNodes) {
    const combined = [...def.inputs, ...def.outputs];
    maps.forEach((mp) => {
      const formal = mp.named ? mp.formal! : combined[mp.pos];
      const ii = def.inputs.findIndex((p) => p.toLowerCase() === (formal || "").toLowerCase());
      if (ii >= 0) {
        const s = buildExpr(mp.actual);
        if (s) wire(s, node.id, ii);
      }
    });
  }

  for (const name in ports)
    if (ports[name] === "out") {
      const c = mk("OUTPUT", { label: name });
      const drvKey = findKey(sigDriver, name);
      const ffKey = findKey(ffDriver, name);
      let s: { id: string; port: number } | null = null;
      if (drvKey) s = buildExpr(sigDriver[drvKey]);
      else if (ffKey) s = resolveNet(name);
      if (s) wire(s, c.id, 0);
    }

  if (!nodes.length) throw new Error("no se encontraron puertos ni señales reconocibles");
  autoLayout(nodes, edges);
  return { nodes, edges, entName };
}

/* Auto-layout por niveles (longest-path con tope para tolerar realimentación) */
export function autoLayout(nodes: RFNode[], edges: RFEdge[]) {
  const depth: Record<string, number> = {};
  nodes.forEach((n) => (depth[n.id] = n.data.kind === "INPUT" || n.data.kind === "CLOCK" ? 0 : 1));
  for (let it = 0; it < nodes.length + 4; it++) {
    let ch = false;
    for (const e of edges) {
      const nd = (depth[e.source] || 0) + 1;
      const t = nodes.find((n) => n.id === e.target);
      if (t && t.data.kind !== "INPUT" && t.data.kind !== "CLOCK" && nd > (depth[e.target] || 0) && nd < nodes.length + 2) {
        depth[e.target] = nd;
        ch = true;
      }
    }
    if (!ch) break;
  }
  const maxD = Math.max(0, ...Object.values(depth));
  nodes.forEach((n) => {
    if (n.data.kind === "OUTPUT") depth[n.id] = maxD + 1;
  });
  const cols: Record<number, RFNode[]> = {};
  nodes.forEach((n) => {
    (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n);
  });
  Object.keys(cols).forEach((d) =>
    cols[+d].forEach((n, i) => {
      n.position = { x: 40 + +d * 190, y: 40 + i * 110 };
    }),
  );
}

/* ============================================================
   COMPONENTE REUTILIZABLE DEFINIDO POR VHDL
   ============================================================ */
export function defineCustomFromVhdl(vhdlText: string): string {
  const built = buildFromVhdl(vhdlText);
  const inProxies = built.nodes.filter((n) => n.data.kind === "INPUT" || n.data.kind === "CLOCK");
  const outProxies = built.nodes.filter((n) => n.data.kind === "OUTPUT");
  if (!inProxies.length && !outProxies.length) throw new Error("la entidad necesita puertos in/out");
  const inputs = inProxies.map((n) => (n.data.label as string) || n.id);
  const outputs = outProxies.map((n) => (n.data.label as string) || n.id);
  const schematic: Schematic = {
    nodes: built.nodes,
    edges: built.edges,
    inputProxyIds: inProxies.map((n) => n.id),
    outputProxyIds: outProxies.map((n) => n.id),
  };
  const label = clean(built.entName);
  const kind = "CUSTOM:" + label.toUpperCase();
  CUSTOM[kind] = { cat: "Personalizados", label, ico: "🧩", inputs, outputs, custom: true, schematic, vhdlSource: vhdlText };
  return kind;
}

/* define un componente reutilizable a partir del diagrama actual (el visualizador).
   Las entradas/relojes (IN/CLK) y salidas (OUT) del lienzo se vuelven los puertos. */
export function defineCustomFromDiagram(name: string, nodes: RFNode[], edges: RFEdge[]): string {
  const clone: { nodes: RFNode[]; edges: RFEdge[] } = JSON.parse(JSON.stringify({ nodes, edges }));
  const inProx: RFNode[] = [],
    outProx: RFNode[] = [];
  let ii = 0,
    oo = 0;
  clone.nodes.forEach((n) => {
    if (n.data.kind === "INPUT" || n.data.kind === "CLOCK") {
      if (!n.data.label) n.data.label = (n.data.kind === "CLOCK" ? "clk" : "in") + ii;
      ii++;
      inProx.push(n);
    } else if (n.data.kind === "OUTPUT") {
      if (!n.data.label) n.data.label = "out" + oo;
      oo++;
      outProx.push(n);
    }
  });
  if (!inProx.length && !outProx.length) throw new Error("el diagrama necesita entradas (IN/CLK) y/o salidas (OUT) para definir los puertos");
  const label = clean(name || "comp");
  if (!label) throw new Error("nombre inválido");
  const inputs = inProx.map((n) => clean(n.data.label as string));
  const outputs = outProx.map((n) => clean(n.data.label as string));
  const schematic: Schematic = {
    nodes: clone.nodes,
    edges: clone.edges,
    inputProxyIds: inProx.map((n) => n.id),
    outputProxyIds: outProx.map((n) => n.id),
  };
  const vhdlSource = generateVhdl(clone.nodes, clone.edges, label);
  const kind = "CUSTOM:" + label.toUpperCase();
  CUSTOM[kind] = { cat: "Personalizados", label, ico: "🧩", inputs, outputs, custom: true, schematic, vhdlSource };
  return kind;
}

/* condición VHDL -> expresión booleana de 1 bit */
function condExpr(cond: string): string {
  cond = cond.trim();
  const m = /^(.+?)\s*=\s*'([01])'\s*$/.exec(cond);
  if (m) return m[2] === "1" ? `(${m[1].trim()})` : `(not (${m[1].trim()}))`;
  const m2 = /^(.+?)\s*=\s*(.+)$/.exec(cond);
  if (m2) return `(not ((${m2[1].trim()}) xor (${m2[2].trim()})))`; // igualdad de dos señales
  return `(${cond})`;
}
/* asignación condicional:  v1 when cond else v2 [when cond2 else …]  -> expresión mux */
export function expandWhenElse(rhs: string): string {
  if (!/\bwhen\b/i.test(rhs)) return rhs;
  const m = /^([\s\S]*?)\bwhen\b([\s\S]*?)\belse\b([\s\S]*)$/i.exec(rhs);
  if (m) {
    const c = condExpr(m[2]);
    return `((${c}) and (${m[1].trim()})) or ((not ${c}) and (${expandWhenElse(m[3])}))`;
  }
  const m2 = /^([\s\S]*?)\bwhen\b([\s\S]*)$/i.exec(rhs); // "v when cond" sin else
  if (m2) return `((${condExpr(m2[2])}) and (${m2[1].trim()}))`;
  return rhs;
}

/* Linter semántico del editor VHDL: devuelve {línea, mensaje} */
export function lintVhdl(text: string): { line: number; msg: string }[] {
  const out: { line: number; msg: string }[] = [];
  const lines = text.split("\n");
  const src = text.replace(/--[^\n]*/g, "");

  /* paréntesis */
  let depth = 0;
  lines.forEach((ln, i) => {
    const code = ln.replace(/--.*/, "");
    for (const ch of code) {
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth < 0) {
          out.push({ line: i + 1, msg: "')' sin '(' correspondiente" });
          depth = 0;
        }
      }
    }
  });
  if (depth > 0) out.push({ line: lines.length, msg: `${depth} paréntesis '(' sin cerrar` });

  /* palabras clave estructurales */
  if (!/\bentity\b/i.test(src)) out.push({ line: 1, msg: "falta la declaración 'entity'" });
  else if (!/end\s+entity\b/i.test(src)) out.push({ line: 1, msg: "falta 'end entity'" });
  if (!/\barchitecture\b/i.test(src)) out.push({ line: 1, msg: "falta 'architecture … begin'" });
  else if (!/end\s+architecture\b/i.test(src) && !/end\b\s*;\s*$/.test(src)) out.push({ line: lines.length, msg: "falta 'end architecture' o 'end;'" });
  const endProc = (src.match(/end\s+process/gi) || []).length;
  const openProc = (src.match(/\bprocess\b/gi) || []).length - endProc;
  if (openProc !== endProc) out.push({ line: 1, msg: `'process' (${openProc}) y 'end process' (${endProc}) no coinciden` });

  /* señales declaradas vs usadas */
  const declared = new Set<string>();
  const used = new Set<string>();
  const portSigRe = /signal\s+([a-z0-9_,\s]+):/gi;
  let pm: RegExpExecArray | null;
  while ((pm = portSigRe.exec(src))) {
    pm[1].split(",").forEach((n) => {
      const s = n.trim().toLowerCase();
      if (s) declared.add(s);
    });
  }
  const archM = /architecture\s+\w+\s+of\s+(\w+)\s+is/i.exec(src);
  const entM = /entity\s+(\w+)\s+is/i.exec(src);
  if (archM && entM) {
    const entName = entM[1].toLowerCase();
    declared.add(entName);
    const portBlock = /port\s*\(([\s\S]*?)\)\s*;/i.exec(src);
    if (portBlock) {
      portBlock[1].split(";").forEach((decl) => {
        const m = /([a-z0-9_,\s]+):/i.exec(decl);
        if (m)
          m[1].split(",").forEach((n) => {
            const s = n.trim().toLowerCase();
            if (s) declared.add(s);
          });
      });
    }
    const archBody = src.slice(src.search(/\bbegin\b/i) + 5);
    const idRe = /\b([a-z][a-z0-9_]*)\b/gi;
    let im: RegExpExecArray | null;
    const keywords = new Set([
      "in",
      "out",
      "inout",
      "buffer",
      "library",
      "use",
      "all",
      "entity",
      "architecture",
      "is",
      "of",
      "begin",
      "end",
      "port",
      "map",
      "signal",
      "process",
      "variable",
      "constant",
      "function",
      "procedure",
      "if",
      "then",
      "else",
      "elsif",
      "for",
      "loop",
      "while",
      "generate",
      "component",
      "when",
      "others",
      "to",
      "downto",
      "range",
      "not",
      "and",
      "or",
      "nand",
      "nor",
      "xor",
      "xnor",
      "with",
      "select",
      "case",
      "generic",
      "work",
      "rising_edge",
      "falling_edge",
      "wait",
      "after",
      "transport",
      "null",
      "return",
      "mod",
      "rem",
      "abs",
      "package",
      "body",
      "configuration",
      "alias",
      "attribute",
      "group",
      "file",
      "access",
      "protected",
      "unaffected",
      "force",
      "release",
      "pure",
      "impure",
      "severity",
      "note",
      "warning",
      "error",
      "failure",
      "assert",
      "report",
      "postponed",
      "block",
      "exit",
      "next",
      "label",
      "literal",
      "on",
      "open",
      "bus",
      "new",
    ]);
    while ((im = idRe.exec(archBody))) {
      const w = im[1].toLowerCase();
      if (!keywords.has(w) && !declared.has(w) && !/^'/.test(w) && w.length > 1) used.add(w);
    }
    const undeclared = [...used].filter((w) => !declared.has(w));
    undeclared.forEach((w) => {
      const foundLine = lines.findIndex((l) => l.toLowerCase().includes(w));
      out.push({ line: foundLine >= 0 ? foundLine + 1 : 1, msg: `señal '${w}' usada pero no declarada` });
    });
    /* puertos declarados pero no usados en el cuerpo */
    if (portBlock) {
      const body = src.slice(src.search(/\bbegin\b/i) + 5);
      portBlock[1].split(";").forEach((decl) => {
        const m = /([a-z0-9_,\s]+):/i.exec(decl);
        if (m)
          m[1].split(",").forEach((n) => {
            const s = n.trim().toLowerCase();
            if (s && s !== entName && !body.toLowerCase().includes(s)) {
              const lineIdx = lines.findIndex((l) => l.toLowerCase().includes(s));
              out.push({ line: lineIdx >= 0 ? lineIdx + 1 : 1, msg: `puerto '${s}' declarado pero no usado en la arquitectura` });
            }
          });
      });
    }
  }

  return out;
}

/* clona el esquemático de un componente para una nueva instancia (estado interno propio) */
export function instantiateInner(kind: string): Module {
  const d = getDef(kind);
  if (!d || !d.schematic) return { nodes: [], edges: [] };
  return JSON.parse(JSON.stringify({ nodes: d.schematic.nodes, edges: d.schematic.edges }));
}

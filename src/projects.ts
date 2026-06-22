// SPDX-License-Identifier: MIT
/* Gestión de proyectos con nombre en el navegador (localStorage). */
const PREFIX = "simlog.proj.";
const RECENT_KEY = "simlog.recent";
const FAV_KEY = "simlog.favorites";
const AUTOSAVE_KEY = "simlog.autosave_interval";

export interface ProjectMeta {
  name: string;
  ts: number;
  count: number;
  desc?: string;
  tags?: string[];
  ver?: number;
  cloud?: boolean;
}

export interface ProjectData {
  nodes: unknown[];
  edges: unknown[];
  entName: string;
  components?: unknown[];
  desc?: string;
  tags?: string[];
  ver?: number;
}

/** Valida un nombre de proyecto/componente. Devuelve null si es válido, o un mensaje de error. */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "El nombre no puede estar vacío";
  if (trimmed.length > 64) return "El nombre no puede superar los 64 caracteres";
  if (!/^[A-Za-z0-9_\-\s.]+$/.test(trimmed)) return "Solo se permiten letras, números, guiones, puntos y espacios";
  if (/^\s/.test(name) || /\s$/.test(name)) return "El nombre no puede empezar o terminar con espacios";
  return null;
}

/* ---------- CRUD ---------- */

export function listProjects(): ProjectMeta[] {
  const out: ProjectMeta[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    try {
      const d = JSON.parse(localStorage.getItem(k) || "{}");
      out.push({
        name: k.slice(PREFIX.length),
        ts: d.ts || 0,
        count: (d.nodes || []).length,
        desc: d.desc,
        tags: d.tags,
        ver: d.ver,
      });
    } catch {
      /* ignora entradas corruptas */
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export function saveProject(name: string, data: ProjectData): void {
  const clean = name.trim();
  if (!clean) throw new Error("nombre vacío");
  data.ver = (data.ver || 0) + 1;
  localStorage.setItem(PREFIX + clean, JSON.stringify({ ...data, name: clean, ts: Date.now() }));
}

export function loadProject(name: string): ProjectData {
  const raw = localStorage.getItem(PREFIX + name);
  if (!raw) throw new Error("proyecto no encontrado");
  return JSON.parse(raw);
}

export function deleteProject(name: string): void {
  localStorage.removeItem(PREFIX + name);
  removeRecent(name);
  removeFavorite(name);
}

export function projectExists(name: string): boolean {
  return localStorage.getItem(PREFIX + name.trim()) != null;
}

/* ---------- Descripción y etiquetas ---------- */

export function updateProjectMeta(name: string, meta: { desc?: string; tags?: string[] }): void {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (meta.desc !== undefined) d.desc = meta.desc;
    if (meta.tags !== undefined) d.tags = meta.tags;
    localStorage.setItem(PREFIX + name, JSON.stringify(d));
  } catch {
    /* */
  }
}

/* ---------- Proyectos recientes ---------- */

export function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecent(name: string): void {
  try {
    let r = getRecent().filter((n) => n !== name);
    r.unshift(name);
    if (r.length > 20) r = r.slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
  } catch {
    /* */
  }
}

function removeRecent(name: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter((n) => n !== name)));
  } catch {
    /* */
  }
}

/* ---------- Favoritos ---------- */

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(name: string): boolean {
  try {
    let f = getFavorites();
    const idx = f.indexOf(name);
    if (idx >= 0) {
      f.splice(idx, 1);
      localStorage.setItem(FAV_KEY, JSON.stringify(f));
      return false;
    }
    f.push(name);
    localStorage.setItem(FAV_KEY, JSON.stringify(f));
    return true;
  } catch {
    return false;
  }
}

function removeFavorite(name: string): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(getFavorites().filter((n) => n !== name)));
  } catch {
    /* */
  }
}

/* ---------- Papelera (trash) ---------- */

export const TRASH_KEY = "simlog.trash";
export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface TrashItem {
  name: string;
  deletedAt: number;
  data: ProjectData;
}

export function getTrash(): TrashItem[] {
  try { return JSON.parse(localStorage.getItem(TRASH_KEY) || "[]"); } catch { return []; }
}

export function saveTrash(items: TrashItem[]) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(items));
}

/* ---------- Historial de versiones ---------- */

export const VERSIONS_PREFIX = "simlog.versions.";

export interface VersionEntry {
  ts: number;
  data: ProjectData;
  label?: string;
}

export function getVersions(name: string): VersionEntry[] {
  try { return JSON.parse(localStorage.getItem(VERSIONS_PREFIX + name) || "[]"); } catch { return []; }
}

export function pushVersion(name: string, data: ProjectData, label?: string) {
  const versions = getVersions(name);
  versions.unshift({ ts: Date.now(), data: { ...data, ver: (data.ver || 0) } as ProjectData, label });
  if (versions.length > 20) versions.length = 20;
  localStorage.setItem(VERSIONS_PREFIX + name, JSON.stringify(versions));
}

/* ---------- Autosave interval ---------- */

export function getAutosaveInterval(): number {
  try {
    return Number(localStorage.getItem(AUTOSAVE_KEY)) || 300;
  } catch {
    return 300;
  }
}

export function setAutosaveInterval(ms: number): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, String(ms));
  } catch {
    /* */
  }
}

/* ---------- Plantillas ---------- */

export interface Template {
  name: string;
  desc: string;
  tags: string[];
  build: () => { nodes: unknown[]; edges: unknown[]; entName: string };
}

export function getTemplates(): Template[] {
  return [
    { name: "Contador 4 bits", desc: "Contador síncrono de 4 bits con reset", tags: ["secuencial", "contador"], build: () => JSON.parse(TMPL_COUNTER) },
    { name: "Registro 4 bits", desc: "Registro de desplazamiento de 4 bits", tags: ["secuencial", "registro"], build: () => JSON.parse(TMPL_SHIFT_REG) },
    { name: "Sumador 1 bit", desc: "Sumador completo de 1 bit (full adder)", tags: ["aritmética", "sumador"], build: () => JSON.parse(TMPL_ADDER) },
    { name: "Multiplexor 4:1", desc: "Multiplexor de 4 entradas con 2 selectores", tags: ["combinacional", "mux"], build: () => JSON.parse(TMPL_MUX) },
    { name: "Deco 2:4", desc: "Decodificador 2 a 4", tags: ["combinacional", "decoder"], build: () => JSON.parse(TMPL_DECODER) },
    { name: "Flip-Flop JK", desc: "Flip-Flop JK con enable y reset", tags: ["secuencial", "ff"], build: () => JSON.parse(TMPL_JKFF) },
    { name: "ALU 1 bit", desc: "ALU de 1 bit con suma, resta, AND, OR", tags: ["aritmética", "alu"], build: () => JSON.parse(TMPL_ALU) },
    {
      name: "Máq. estados (Moore)",
      desc: "Ejemplo de máquina de estados estilo Moore con 2 FFs",
      tags: ["secuencial", "fsm"],
      build: () => JSON.parse(TMPL_FSM),
    },
    { name: "Detector de flanco", desc: "Detector de flanco de subida", tags: ["secuencial", "detector"], build: () => JSON.parse(TMPL_EDGE) },
    { name: "Divisor de frecuencia", desc: "Divisor de frecuencia por 4 con FFs", tags: ["secuencial", "divisor"], build: () => JSON.parse(TMPL_DIVIDER) },
    { name: "Contador BCD", desc: "Contador BCD de 0 a 9", tags: ["secuencial", "contador", "bcd"], build: () => JSON.parse(TMPL_BCD) },
    {
      name: "Registro SIPO",
      desc: "Registro de desplazamiento serie-paralelo (SIPO)",
      tags: ["secuencial", "registro", "sipo"],
      build: () => JSON.parse(TMPL_SIPO),
    },
  ];
}

// Templates JSON are stored as serialized strings to avoid importing heavy data

const TMPL_COUNTER = `{"nodes":[{"id":"n1","position":{"x":40,"y":200},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":360},"data":{"kind":"INPUT","label":"rst","value":0}},{"id":"n3","position":{"x":260,"y":120},"data":{"kind":"REG","bits":[0,0,0,0],"width":4,"label":"cnt"}},{"id":"n4","position":{"x":470,"y":120},"data":{"kind":"BUSOUT","bits":[0,0,0,0],"width":4,"label":"q"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i4"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i6"},{"id":"e3","source":"n3","sourceHandle":"o0","target":"n4","targetHandle":"i0"}],"entName":"contador_4b"}`;

const TMPL_SHIFT_REG = `{"nodes":[{"id":"n1","position":{"x":40,"y":200},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":360},"data":{"kind":"INPUT","label":"din","value":0}},{"id":"n3","position":{"x":260,"y":120},"data":{"kind":"REG","bits":[0,0,0,0],"width":4,"label":"sr"}},{"id":"n4","position":{"x":470,"y":120},"data":{"kind":"OUTPUT","label":"q3"}},{"id":"n5","position":{"x":470,"y":200},"data":{"kind":"OUTPUT","label":"q2"}},{"id":"n6","position":{"x":470,"y":280},"data":{"kind":"OUTPUT","label":"q1"}},{"id":"n7","position":{"x":470,"y":360},"data":{"kind":"OUTPUT","label":"q0"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i4"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i0"}],"entName":"shift_reg_4b"}`;

const TMPL_ADDER = `{"nodes":[{"id":"n1","position":{"x":40,"y":120},"data":{"kind":"INPUT","label":"a","value":0}},{"id":"n2","position":{"x":40,"y":240},"data":{"kind":"INPUT","label":"b","value":0}},{"id":"n3","position":{"x":40,"y":360},"data":{"kind":"INPUT","label":"cin","value":0}},{"id":"n4","position":{"x":260,"y":80},"data":{"kind":"XOR"}},{"id":"n5","position":{"x":260,"y":240},"data":{"kind":"AND"}},{"id":"n6","position":{"x":260,"y":360},"data":{"kind":"OR"}},{"id":"n7","position":{"x":470,"y":120},"data":{"kind":"XOR"}},{"id":"n8","position":{"x":470,"y":280},"data":{"kind":"OUTPUT","label":"cout"}},{"id":"n9","position":{"x":640,"y":120},"data":{"kind":"OUTPUT","label":"s"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n4","targetHandle":"i0"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n4","targetHandle":"i1"},{"id":"e3","source":"n1","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e4","source":"n2","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e5","source":"n4","sourceHandle":"o0","target":"n7","targetHandle":"i0"},{"id":"e6","source":"n3","sourceHandle":"o0","target":"n7","targetHandle":"i1"},{"id":"e7","source":"n5","sourceHandle":"o0","target":"n6","targetHandle":"i0"},{"id":"e8","source":"n3","sourceHandle":"o0","target":"n6","targetHandle":"i1"},{"id":"e9","source":"n6","sourceHandle":"o0","target":"n8","targetHandle":"i0"},{"id":"e10","source":"n7","sourceHandle":"o0","target":"n9","targetHandle":"i0"}],"entName":"full_adder"}`;

const TMPL_MUX = `{"nodes":[{"id":"n1","position":{"x":40,"y":60},"data":{"kind":"INPUT","label":"i0","value":0}},{"id":"n2","position":{"x":40,"y":180},"data":{"kind":"INPUT","label":"i1","value":0}},{"id":"n3","position":{"x":40,"y":300},"data":{"kind":"INPUT","label":"i2","value":0}},{"id":"n4","position":{"x":40,"y":420},"data":{"kind":"INPUT","label":"i3","value":0}},{"id":"n5","position":{"x":40,"y":100},"data":{"kind":"INPUT","label":"s0","value":0}},{"id":"n6","position":{"x":40,"y":200},"data":{"kind":"INPUT","label":"s1","value":0}},{"id":"n7","position":{"x":220,"y":100},"data":{"kind":"NOT"}},{"id":"n8","position":{"x":220,"y":200},"data":{"kind":"NOT"}},{"id":"n9","position":{"x":400,"y":60},"data":{"kind":"AND"}},{"id":"n10","position":{"x":400,"y":180},"data":{"kind":"AND"}},{"id":"n11","position":{"x":400,"y":300},"data":{"kind":"AND"}},{"id":"n12","position":{"x":400,"y":420},"data":{"kind":"AND"}},{"id":"n13","position":{"x":580,"y":240},"data":{"kind":"OR"}},{"id":"n14","position":{"x":750,"y":240},"data":{"kind":"OUTPUT","label":"y"}}],"edges":[],"entName":"mux_4_1"}`;

const TMPL_DECODER = `{"nodes":[{"id":"n1","position":{"x":40,"y":120},"data":{"kind":"INPUT","label":"a","value":0}},{"id":"n2","position":{"x":40,"y":260},"data":{"kind":"INPUT","label":"b","value":0}},{"id":"n3","position":{"x":220,"y":120},"data":{"kind":"NOT"}},{"id":"n4","position":{"x":220,"y":260},"data":{"kind":"NOT"}},{"id":"n5","position":{"x":400,"y":50},"data":{"kind":"AND"}},{"id":"n6","position":{"x":400,"y":150},"data":{"kind":"AND"}},{"id":"n7","position":{"x":400,"y":250},"data":{"kind":"AND"}},{"id":"n8","position":{"x":400,"y":350},"data":{"kind":"AND"}},{"id":"n9","position":{"x":560,"y":50},"data":{"kind":"OUTPUT","label":"y0"}},{"id":"n10","position":{"x":560,"y":150},"data":{"kind":"OUTPUT","label":"y1"}},{"id":"n11","position":{"x":560,"y":250},"data":{"kind":"OUTPUT","label":"y2"}},{"id":"n12","position":{"x":560,"y":350},"data":{"kind":"OUTPUT","label":"y3"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i0"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n4","targetHandle":"i0"},{"id":"e3","source":"n1","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e4","source":"n2","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e5","source":"n3","sourceHandle":"o0","target":"n6","targetHandle":"i0"},{"id":"e6","source":"n2","sourceHandle":"o0","target":"n6","targetHandle":"i1"},{"id":"e7","source":"n1","sourceHandle":"o0","target":"n7","targetHandle":"i0"},{"id":"e8","source":"n4","sourceHandle":"o0","target":"n7","targetHandle":"i1"},{"id":"e9","source":"n3","sourceHandle":"o0","target":"n8","targetHandle":"i0"},{"id":"e10","source":"n4","sourceHandle":"o0","target":"n8","targetHandle":"i1"}],"entName":"decoder_2_4"}`;

const TMPL_JKFF = `{"nodes":[{"id":"n1","position":{"x":40,"y":60},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":180},"data":{"kind":"INPUT","label":"j","value":0}},{"id":"n3","position":{"x":40,"y":300},"data":{"kind":"INPUT","label":"k","value":0}},{"id":"n4","position":{"x":40,"y":420},"data":{"kind":"INPUT","label":"rst","value":0}},{"id":"n5","position":{"x":260,"y":240},"data":{"kind":"JKFF","q":0,"init":0}},{"id":"n6","position":{"x":470,"y":180},"data":{"kind":"OUTPUT","label":"q"}},{"id":"n7","position":{"x":470,"y":300},"data":{"kind":"OUTPUT","label":"qn"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n5","targetHandle":"i2"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e3","source":"n3","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e4","source":"n4","sourceHandle":"o0","target":"n5","targetHandle":"i4"},{"id":"e5","source":"n5","sourceHandle":"o0","target":"n6","targetHandle":"i0"},{"id":"e6","source":"n5","sourceHandle":"o1","target":"n7","targetHandle":"i0"}],"entName":"jkff"}`;

const TMPL_ALU = `{"nodes":[{"id":"n1","position":{"x":40,"y":40},"data":{"kind":"INPUT","label":"a","value":0}},{"id":"n2","position":{"x":40,"y":120},"data":{"kind":"INPUT","label":"b","value":0}},{"id":"n3","position":{"x":40,"y":200},"data":{"kind":"INPUT","label":"cin","value":0}},{"id":"n4","position":{"x":40,"y":300},"data":{"kind":"INPUT","label":"s0","value":0}},{"id":"n5","position":{"x":40,"y":380},"data":{"kind":"INPUT","label":"s1","value":0}},{"id":"n6","position":{"x":220,"y":80},"data":{"kind":"XOR"}},{"id":"n7","position":{"x":220,"y":250},"data":{"kind":"AND"}},{"id":"n8","position":{"x":220,"y":340},"data":{"kind":"AND"}},{"id":"n9","position":{"x":220,"y":420},"data":{"kind":"OR"}},{"id":"n10","position":{"x":400,"y":160},"data":{"kind":"XOR"}},{"id":"n11","position":{"x":400,"y":340},"data":{"kind":"OR"}},{"id":"n12","position":{"x":580,"y":120},"data":{"kind":"XOR"}},{"id":"n13","position":{"x":580,"y":280},"data":{"kind":"AND"}},{"id":"n14","position":{"x":580,"y":420},"data":{"kind":"NOT"}},{"id":"n15","position":{"x":750,"y":120},"data":{"kind":"OUTPUT","label":"sum"}},{"id":"n16","position":{"x":750,"y":280},"data":{"kind":"OUTPUT","label":"cout"}}],"edges":[],"entName":"alu_1b"}`;

const TMPL_FSM = `{"nodes":[{"id":"n1","position":{"x":40,"y":120},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":280},"data":{"kind":"INPUT","label":"rst","value":0}},{"id":"n3","position":{"x":40,"y":400},"data":{"kind":"INPUT","label":"x","value":0}},{"id":"n4","position":{"x":260,"y":120},"data":{"kind":"DFF","q":0,"init":0}},{"id":"n5","position":{"x":260,"y":320},"data":{"kind":"DFF","q":0,"init":0}},{"id":"n6","position":{"x":470,"y":100},"data":{"kind":"AND"}},{"id":"n7","position":{"x":470,"y":240},"data":{"kind":"AND"}},{"id":"n8","position":{"x":470,"y":400},"data":{"kind":"AND"}},{"id":"n9","position":{"x":660,"y":100},"data":{"kind":"OR"}},{"id":"n10","position":{"x":660,"y":260},"data":{"kind":"OUTPUT","label":"z"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n4","targetHandle":"i1"},{"id":"e2","source":"n1","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e3","source":"n2","sourceHandle":"o0","target":"n4","targetHandle":"i3"},{"id":"e4","source":"n2","sourceHandle":"o0","target":"n5","targetHandle":"i3"}],"entName":"fsm_moore"}`;

const TMPL_EDGE = `{"nodes":[{"id":"n1","position":{"x":40,"y":120},"data":{"kind":"INPUT","label":"clk","value":0}},{"id":"n2","position":{"x":40,"y":280},"data":{"kind":"INPUT","label":"sig","value":0}},{"id":"n3","position":{"x":240,"y":200},"data":{"kind":"DFF","q":0,"init":0,"label":"dly"}},{"id":"n4","position":{"x":440,"y":120},"data":{"kind":"NOT"}},{"id":"n5","position":{"x":440,"y":280},"data":{"kind":"AND"}},{"id":"n6","position":{"x":630,"y":200},"data":{"kind":"OUTPUT","label":"rise"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i1"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i0"},{"id":"e3","source":"n3","sourceHandle":"o1","target":"n4","targetHandle":"i0"},{"id":"e4","source":"n2","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e5","source":"n4","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e6","source":"n5","sourceHandle":"o0","target":"n6","targetHandle":"i0"}],"entName":"edge_detector"}`;

const TMPL_DIVIDER = `{"nodes":[{"id":"n1","position":{"x":40,"y":200},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":260,"y":120},"data":{"kind":"DFF","q":0,"init":0}},{"id":"n3","position":{"x":260,"y":280},"data":{"kind":"DFF","q":0,"init":0}},{"id":"n4","position":{"x":470,"y":200},"data":{"kind":"OUTPUT","label":"div2"}},{"id":"n5","position":{"x":470,"y":340},"data":{"kind":"OUTPUT","label":"div4"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n2","targetHandle":"i1"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i4"},{"id":"e3","source":"n3","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e4","source":"n2","sourceHandle":"o1","target":"n4","targetHandle":"i0"}],"entName":"div_freq"}`;

const TMPL_BCD = `{"nodes":[{"id":"n1","position":{"x":40,"y":200},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":360},"data":{"kind":"INPUT","label":"rst","value":0}},{"id":"n3","position":{"x":260,"y":120},"data":{"kind":"REG","bits":[0,0,0,0],"width":4,"label":"bcd"}},{"id":"n4","position":{"x":470,"y":120},"data":{"kind":"BUSOUT","bits":[0,0,0,0],"width":4,"label":"q"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i4"},{"id":"e2","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i6"},{"id":"e3","source":"n3","sourceHandle":"o0","target":"n4","targetHandle":"i0"}],"entName":"contador_bcd"}`;

const TMPL_SIPO = `{"nodes":[{"id":"n1","position":{"x":40,"y":120},"data":{"kind":"CLOCK","value":0}},{"id":"n2","position":{"x":40,"y":280},"data":{"kind":"INPUT","label":"din","value":0}},{"id":"n3","position":{"x":260,"y":80},"data":{"kind":"DFF","q":0,"init":0,"label":"b3"}},{"id":"n4","position":{"x":260,"y":200},"data":{"kind":"DFF","q":0,"init":0,"label":"b2"}},{"id":"n5","position":{"x":260,"y":320},"data":{"kind":"DFF","q":0,"init":0,"label":"b1"}},{"id":"n6","position":{"x":260,"y":440},"data":{"kind":"DFF","q":0,"init":0,"label":"b0"}},{"id":"n7","position":{"x":470,"y":80},"data":{"kind":"OUTPUT","label":"q3"}},{"id":"n8","position":{"x":470,"y":200},"data":{"kind":"OUTPUT","label":"q2"}},{"id":"n9","position":{"x":470,"y":320},"data":{"kind":"OUTPUT","label":"q1"}},{"id":"n10","position":{"x":470,"y":440},"data":{"kind":"OUTPUT","label":"q0"}}],"edges":[{"id":"e1","source":"n1","sourceHandle":"o0","target":"n3","targetHandle":"i1"},{"id":"e2","source":"n1","sourceHandle":"o0","target":"n4","targetHandle":"i1"},{"id":"e3","source":"n1","sourceHandle":"o0","target":"n5","targetHandle":"i1"},{"id":"e4","source":"n1","sourceHandle":"o0","target":"n6","targetHandle":"i1"},{"id":"e5","source":"n2","sourceHandle":"o0","target":"n3","targetHandle":"i0"},{"id":"e6","source":"n3","sourceHandle":"o0","target":"n4","targetHandle":"i0"},{"id":"e7","source":"n4","sourceHandle":"o0","target":"n5","targetHandle":"i0"},{"id":"e8","source":"n5","sourceHandle":"o0","target":"n6","targetHandle":"i0"},{"id":"e9","source":"n3","sourceHandle":"o0","target":"n7","targetHandle":"i0"},{"id":"e10","source":"n4","sourceHandle":"o0","target":"n8","targetHandle":"i0"},{"id":"e11","source":"n5","sourceHandle":"o0","target":"n9","targetHandle":"i0"},{"id":"e12","source":"n6","sourceHandle":"o0","target":"n10","targetHandle":"i0"}],"entName":"sipo_4b"}`;

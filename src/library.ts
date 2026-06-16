// SPDX-License-Identifier: MIT
import { CUSTOM, defineCustom } from "./defs";
import { defineCustomFromVhdl } from "./vhdl";

const LIB_KEY = "simlog.customlib.v2";
const LIB_VER = 2;

export interface LibEntry {
  kind: string;
  label: string;
  mode: "expr" | "vhdl";
  inputs?: string[];
  exprs?: Record<string, string>;
  vhdlSource?: string;
  ver?: number;
}

/* serializa la librería de componentes personalizados a una forma portátil */
export function serializeLibrary(): LibEntry[] {
  return Object.entries(CUSTOM).map(([kind, d]) => {
    const base = d.schematic
      ? { kind, label: d.label, mode: "vhdl" as const, vhdlSource: d.vhdlSource }
      : { kind, label: d.label, mode: "expr" as const, inputs: d.inputs, exprs: d.exprs };
    return { ...base, ver: (d as any).ver || 1 };
  });
}

/* registra una lista de componentes; devuelve cuántos se cargaron */
export function applyLibrary(entries: LibEntry[]): number {
  let n = 0;
  for (const e of entries) {
    try {
      if (e.mode === "vhdl" && e.vhdlSource) {
        defineCustomFromVhdl(e.vhdlSource);
        n++;
      } else if (e.mode === "expr" && e.inputs && e.exprs) {
        defineCustom(
          e.label,
          e.inputs.join(","),
          Object.entries(e.exprs)
            .map(([o, x]) => `${o} = ${x}`)
            .join("\n"),
        );
        n++;
      }
    } catch {
      /* ignora entradas inválidas */
    }
  }
  return n;
}

function migrateV1ToV2(raw: any): any {
  // v1 stored raw array of entries; v2 wraps in { kind, version, components }
  if (Array.isArray(raw)) return { kind: "simlog-library", version: 2, components: raw };
  if (raw.version === 1) return { ...raw, version: 2 };
  return raw;
}

export function saveLibrary() {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(serializeLibrary()));
  } catch {
    /* sin almacenamiento */
  }
}
export function loadLibrary(): number {
  try {
    let raw = localStorage.getItem(LIB_KEY);
    if (!raw) {
      // fallback: try old v1 key
      const old = localStorage.getItem("simlog.customlib.v1");
      if (old) {
        raw = old;
        localStorage.removeItem("simlog.customlib.v1");
      }
    }
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const migrated = migrateV1ToV2(data);
    const entries: LibEntry[] = migrated.components || migrated;
    const n = applyLibrary(entries);
    saveLibrary();
    return n;
  } catch {
    return 0;
  }
}

export function getLibraryVersion(): number {
  try {
    const raw = localStorage.getItem(LIB_KEY) || localStorage.getItem("simlog.customlib.v1");
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return 1;
    return data.version || 1;
  } catch {
    return 0;
  }
}

export function exportLibrary(): string {
  return JSON.stringify({ kind: "simlog-library", version: LIB_VER, components: serializeLibrary() }, null, 2);
}
export function importLibrary(json: string): number {
  const data = JSON.parse(json);
  const migrated = migrateV1ToV2(data);
  const entries: LibEntry[] = migrated.components || migrated;
  const n = applyLibrary(entries);
  saveLibrary();
  return n;
}

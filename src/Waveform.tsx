// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RFNode, Sig, PortVal } from "./types";
import { isFF } from "./defs";
import { useI18n } from "./i18n";

const WAVE_KEY = "simlog.waveform.v1";
const GROUP_KEY = "simlog.waveform.groups.v1";
const MARKER_KEY = "simlog.waveform.markers.v1";
const COLOR_KEY = "simlog.waveform.colors.v1";
const REGION_KEY = "simlog.waveform.regions.v1";

export interface WaveSample {
  vals: Record<string, PortVal>;
}

interface Row {
  id: string;
  label: string;
  kind: "sig" | "bus" | "group";
  cls: string;
  busBits?: string[];
  groupIds?: string[];
  collapsed?: boolean;
}

const FF_PREFIX: Record<string, string> = { DFF: "D", TFF: "T", JKFF: "JK", SRFF: "SR" };

function traceRows(nodes: RFNode[], t: (key: string, params?: Record<string, string | number>) => string): Row[] {
  const hasIO = nodes.some((n) => n.data.kind === "INPUT" || n.data.kind === "CLOCK" || n.data.kind === "OUTPUT");
  if (!hasIO) return [];
  const rows: Row[] = [];
  const regGroups = new Map<string, { label: string; bits: string[] }>();
  nodes.forEach((n) => {
    if (n.data.kind === "OUTPUT")
      rows.push({
        id: n.id,
        label: (n.data.label as string) && (n.data.label as string).trim() ? (n.data.label as string) : t("wave.default_output"),
        kind: "sig",
        cls: "out",
      });
    else if (n.data.kind === "INPUT") rows.push({ id: n.id, label: (n.data.label as string) || n.id, kind: "sig", cls: "in" });
    else if (n.data.kind === "CLOCK") rows.push({ id: n.id, label: (n.data.label as string) || "clk", kind: "sig", cls: "clk" });
    else if (isFF(n.data.kind)) {
      const prefix = FF_PREFIX[n.data.kind] || "?";
      rows.push({ id: n.id, label: ((n.data.label as string) || n.id) + "." + prefix + ".Q", kind: "sig", cls: "ff" });
    } else if (n.data.kind === "BUSIN" || n.data.kind === "BUSOUT" || n.data.kind === "MERGE")
      rows.push({ id: n.id, label: (n.data.label as string) || n.id, kind: "bus", cls: "bus" });
    else if (n.data.kind === "SPLIT") rows.push({ id: n.id, label: (n.data.label as string) || n.id, kind: "bus", cls: "bus" });
    else if (n.data.kind === "REG") {
      const bits: string[] = [];
      for (let b = 0; b < regWidth(n); b++) bits.push(n.id + ":" + b);
      regGroups.set(n.id, { label: (n.data.label as string) || n.id, bits });
    }
  });
  regGroups.forEach((g, id) => {
    rows.push({ id, label: g.label, kind: "bus", cls: "bus", busBits: g.bits });
  });
  return rows;
}
function regWidth(n: RFNode): number {
  return (n.data.width as number) || 4;
}

const EXPORT_CSS = `
.wave-line{fill:none;stroke:#e6ecf5;stroke-width:2}
.wave-line.clk{stroke:#7c5cff}
.wave-line.in{stroke:#4f8cff}
.wave-line.out{stroke:#34d399}
.wave-line.ff{stroke:#e5b567}
.wave-line.undef{stroke:#888;stroke-dasharray:4 2}
.wave-label{fill:#ededef;font:11px monospace}
.wave-sep{stroke:#1c1c1f}
rect.bg{fill:#000}
.wave-tick{fill:#6f6f78;font:9px monospace}
.wave-glitch{fill:none;stroke:#ff6b6b;stroke-width:2;stroke-dasharray:2 2}`;

const hex = (bits: (Sig | undefined)[]): string => {
  if (!bits.length) return "X";
  if (bits.some((b) => b !== 0 && b !== 1)) return "X";
  return bits
    .reduceRight<number>((a, b, i) => a + ((b as number) << i), 0)
    .toString(16)
    .toUpperCase();
};

type Radix = "hex" | "dec" | "bin";
const fmtBits = (bits: (Sig | undefined)[], radix: Radix): string => {
  if (!bits.length || bits.some((b) => b !== 0 && b !== 1)) return "X";
  const v = bits.reduce<number>((a, b, i) => a + ((b as number) << i), 0);
  if (radix === "bin") return [...bits].reverse().join("");
  if (radix === "dec") return String(v);
  return v.toString(16).toUpperCase();
};
const radixPrefix: Record<Radix, string> = { hex: "0x", dec: "", bin: "0b" };

interface Marker {
  x: number;
  label: string;
}

function EyeIcon({ on }: { on: boolean }) {
  if (on)
    return (
      <svg width="20" height="15" viewBox="0 0 16 12">
        <path d="M1 6C3 1 13 1 15 6C13 11 3 11 1 6Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  return (
    <svg width="20" height="15" viewBox="0 0 16 12">
      <path d="M1 6C3 1 13 1 15 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M15 6C13 11 3 11 1 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="1" y1="0" x2="15" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CtrlIcon({ type }: { type: "up" | "down" }) {
  if (type === "up")
    return (
      <svg width="16" height="16" viewBox="0 0 12 12">
        <path d="M2 8L6 3L10 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 12 12">
      <path d="M2 4L6 9L10 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon({ on }: { on: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d={on ? "M2 4L6 9L10 4" : "M4 2L9 6L4 10"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Waveform({
  nodes,
  history,
  onClose,
  onClear,
  onExportVCD,
  delayMode,
}: {
  nodes: RFNode[];
  history: WaveSample[];
  onClose: () => void;
  onClear: () => void;
  onExportVCD: () => void;
  delayMode: boolean;
}) {
  const { t } = useI18n();
  const baseRows = useMemo(() => traceRows(nodes, t), [nodes, t]);
  const noCircuit = nodes.length === 0;
  const [stepW, setStepW] = useState(26);
  const [radix, setRadix] = useState<"hex" | "dec" | "bin">("hex");
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [markers, setMarkers] = useState<Record<number, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(MARKER_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(WAVE_KEY);
      if (raw) return JSON.parse(raw).order || [];
    } catch {
      return [];
    }
  });
  const [names, setNames] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(WAVE_KEY);
      if (raw) return JSON.parse(raw).names || {};
    } catch {
      return {};
    }
  });
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(WAVE_KEY);
      if (raw) return JSON.parse(raw).visible || {};
    } catch {
      return {};
    }
  });
  const [groups, setGroups] = useState<Record<string, { label: string; collapsed: boolean; ids: string[] }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(GROUP_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [transView, setTransView] = useState(false);
  const [editingMarker, setEditingMarker] = useState<number | null>(null);
  const [markerEditVal, setMarkerEditVal] = useState("");
  const [signalColors, setSignalColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(COLOR_KEY) || "{}"); } catch { return {}; }
  });
  const [regions, setRegions] = useState<Record<string, { start: number; end: number; label: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(REGION_KEY) || "{}"); } catch { return {}; }
  });
  const [regionEditing, setRegionEditing] = useState<string | null>(null);
  const [regionEditVal, setRegionEditVal] = useState("");
  const [measureA, setMeasureA] = useState<number | null>(null);
  const [analogBuses, setAnalogBuses] = useState(false);
  const [findDir, setFindDir] = useState<1 | -1>(1);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [snapHist, setSnapHist] = useState<WaveSample[] | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [composites, setComposites] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("simlog.waveform.composites.v1") || "{}"); } catch { return {}; }
  });
  const [compositeEdit, setCompositeEdit] = useState<string | null>(null);
  const [compositeExpr, setCompositeExpr] = useState("");
  const [scrollPos, setScrollPos] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const presetInput = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wavePanelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const prevHistoryLen = useRef(0);

  /* undo/redo */
  const waveUndo = useRef<string[]>([]);
  const waveRedo = useRef<string[]>([]);
  const waveSaveSnap = useCallback((o: string[], n: Record<string, string>, v: Record<string, boolean>) => {
    waveUndo.current.push(JSON.stringify({ order: o, names: n, visible: v }));
    if (waveUndo.current.length > 50) waveUndo.current.shift();
    waveRedo.current = [];
  }, []);
  const pushWaveSnap = useRef(true);
  const waveOrderRef = useRef(order);
  waveOrderRef.current = order;
  const waveNamesRef = useRef(names);
  waveNamesRef.current = names;
  const waveVisibleRef = useRef(visible);
  waveVisibleRef.current = visible;
  const saveWaveSnap = useCallback(() => {
    if (!pushWaveSnap.current) {
      pushWaveSnap.current = true;
      return;
    }
    waveSaveSnap(waveOrderRef.current, waveNamesRef.current, waveVisibleRef.current);
  }, [waveSaveSnap]);
  const waveUndoFn = useCallback(() => {
    if (!waveUndo.current.length) return;
    waveRedo.current.push(JSON.stringify({ order: waveOrderRef.current, names: waveNamesRef.current, visible: waveVisibleRef.current }));
    const s = JSON.parse(waveUndo.current.pop()!);
    setOrder(s.order);
    setNames(s.names || {});
    setVisible(s.visible || {});
  }, []);
  const waveRedoFn = useCallback(() => {
    if (!waveRedo.current.length) return;
    waveUndo.current.push(JSON.stringify({ order: waveOrderRef.current, names: waveNamesRef.current, visible: waveVisibleRef.current }));
    const s = JSON.parse(waveRedo.current.pop()!);
    setOrder(s.order);
    setNames(s.names || {});
    setVisible(s.visible || {});
  }, []);

  /* atajos */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      const inWave = wavePanelRef.current?.contains(ae);
      if (!inWave) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          waveRedoFn();
        } else {
          e.preventDefault();
          waveUndoFn();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        waveRedoFn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [waveUndoFn, waveRedoFn]);

  /* restaurar preset desde URL */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset");
    if (preset) {
      try {
        const p = JSON.parse(decodeURIComponent(escape(atob(preset))));
        if (p.order) setOrder(p.order);
        if (p.names) setNames(p.names);
        if (p.visible) setVisible(p.visible);
      } catch {
        /* */
      }
    }
  }, []);

  /* persistir */
  useEffect(() => {
    try {
      localStorage.setItem(WAVE_KEY, JSON.stringify({ order, names, visible }));
    } catch {
      /* */
    }
  }, [order, names, visible]);
  useEffect(() => {
    try {
      localStorage.setItem(MARKER_KEY, JSON.stringify(markers));
    } catch {
      /* */
    }
  }, [markers]);
  useEffect(() => {
    try {
      localStorage.setItem(GROUP_KEY, JSON.stringify(groups));
    } catch {
      /* */
    }
  }, [groups]);
  useEffect(() => {
    try {
      localStorage.setItem(COLOR_KEY, JSON.stringify(signalColors));
    } catch {
      /* */
    }
  }, [signalColors]);
  useEffect(() => {
    try {
      localStorage.setItem(REGION_KEY, JSON.stringify(regions));
    } catch {
      /* */
    }
  }, [regions]);
  useEffect(() => {
    try {
      localStorage.setItem("simlog.waveform.composites.v1", JSON.stringify(composites));
    } catch {
      /* */
    }
  }, [composites]);

  /* auto-scroll: cuando llegan nuevos datos, desplazar a la derecha */
  useEffect(() => {
    if (history.length > prevHistoryLen.current && scrollRef.current) {
      const el = scrollRef.current;
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
    prevHistoryLen.current = history.length;
  }, [history.length]);

  /* construir filas con orden/grupos */
  const rows = useMemo(() => {
    const map = new Map(baseRows.map((r) => [r.id, r]));
    let ordered = [...order.filter((id) => map.has(id)), ...baseRows.filter((r) => !order.includes(r.id)).map((r) => r.id)];

    if (search.trim()) {
      const low = search.toLowerCase();
      ordered = ordered.filter((id) => {
        const r = map.get(id)!;
        return r.label.toLowerCase().includes(low) || r.id.toLowerCase().includes(low);
      });
    }

    // Aplicar grupos: insertar filas de grupo + colapsar
    const groupIds = Object.keys(groups);
    if (groupIds.length > 0) {
      const result: string[] = [];
      const used = new Set<string>();
      const addGroup = (gid: string) => {
        const g = groups[gid];
        result.push("__group:" + gid);
        if (!g.collapsed) {
          g.ids.forEach((id) => {
            if (!used.has(id) && ordered.includes(id)) {
              result.push(id);
              used.add(id);
            }
          });
        }
      };
      // Los IDs que están en grupos se muestran solo dentro de su grupo
      groupIds.forEach((gid) => addGroup(gid));
      // Los IDs no agrupados van al final
      ordered.forEach((id) => {
        if (!used.has(id)) result.push(id);
      });
      ordered = result;
    }

    const all = ordered
      .map((id) => {
        if (id.startsWith("__group:")) {
          const gid = id.slice(8);
          const g = groups[gid];
          return { id, label: g?.label || gid, kind: "group" as const, cls: "group", collapsed: g?.collapsed || false, groupIds: g?.ids };
        }
        const r = map.get(id);
        if (!r) return null;
        return { ...r, label: names[id] ?? r.label };
      })
      .filter(Boolean) as Row[];

    // Reemplazar etiquetas de grupo con nombres personalizados
    return all.map((r) => {
      if (r.kind === "group") return r;
      return { ...r, label: names[r.id] ?? r.label };
    });
  }, [baseRows, order, names, visible, search, groups]);

  /* detectar glitches en modo retardo */
  const glitchSet = useMemo(() => {
    if (!delayMode || history.length < 2) return new Set<number>();
    const gl = new Set<number>();
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].vals;
      const cur = history[i].vals;
      for (const key of Object.keys(cur)) {
        const pv = prev[key],
          cv = cur[key];
        if (pv !== cv) {
          // Glitch: vuelve al valor anterior en el siguiente paso
          const next = history[i + 1]?.vals[key];
          if (next !== undefined && next !== cv && next === pv) {
            gl.add(i);
          }
        }
      }
    }
    return gl;
  }, [history, delayMode]);

  /* vista de transiciones */
  const transIndices = useMemo(() => {
    if (history.length < 2) return [];
    const ti = [0];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].vals;
      const cur = history[i].vals;
      let changed = false;
      for (const key of Object.keys(cur)) {
        if (prev[key] !== cur[key]) {
          changed = true;
          break;
        }
      }
      if (changed) ti.push(i);
    }
    return ti;
  }, [history]);

  const displayIndices = transView ? transIndices : history.length > 0 ? Array.from({ length: history.length }, (_, i) => i) : [];
  const displayLen = displayIndices.length;

  const labelW = 184,
    ctrlW = 92,
    rowH = 36,
    top = 26;
  const padRight = 20;

  /* Virtualización: cuando displayLen > 500, solo renderizar ciclos visibles */
  const useVirtual = displayLen > 500;
  const scrollEl = scrollRef.current;
  const viewW = scrollEl?.clientWidth || 800;
  const virtStart = useVirtual ? Math.max(0, Math.floor((scrollPos - labelW) / stepW) - 2) : 0;
  const virtEnd = useVirtual ? Math.min(displayLen, Math.ceil((scrollPos - labelW + viewW) / stepW) + 2) : displayLen;
  const virtIndices = useVirtual ? displayIndices.slice(virtStart, virtEnd) : displayIndices;
  const virtOffset = useVirtual ? virtStart * stepW : 0;

  const width = labelW + Math.max(20, displayLen) * stepW + padRight;

  const move = (id: string, dir: -1 | 1) => {
    saveWaveSnap();
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id),
      j = i + dir;
    if (j < 0 || j >= ids.length) return;
    // No mover dentro/fuera de grupos
    const inGroup = (idx: number) => rows[idx]?.kind === "group" || ids[idx]?.startsWith("__group:");
    if (inGroup(i) || inGroup(j)) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setOrder(ids);
  };

  const startRename = (id: string, cur: string) => {
    if (id.startsWith("__group:")) {
      const gid = id.slice(8);
      setEditing(id);
      setEditValue(groups[gid]?.label || gid);
      requestAnimationFrame(() => editRef.current?.select());
      return;
    }
    if (editing) saveWaveSnap();
    setEditing(id);
    setEditValue(cur);
    requestAnimationFrame(() => editRef.current?.select());
  };

  const commitRename = (id: string) => {
    const v = editValue.trim();
    if (id.startsWith("__group:")) {
      const gid = id.slice(8);
      if (v) setGroups((g) => ({ ...g, [gid]: { ...g[gid], label: v } }));
      setEditing(null);
      return;
    }
    if (v !== (names[id] ?? "")) saveWaveSnap();
    if (v) setNames((m) => ({ ...m, [id]: v }));
    else if (!v && names[id])
      setNames((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    setEditing(null);
  };

  const toggleVis = (id: string) => {
    saveWaveSnap();
    setVisible((v) => ({ ...v, [id]: !(v[id] ?? true) }));
  };
  const isVisible = (id: string) => visible[id] ?? true;

  const handleDragStart = (id: string) => {
    if (id.startsWith("__group:")) return;
    setDragId(id);
  };

  const toggleGroup = (gid: string) => {
    setGroups((g) => ({ ...g, [gid]: { ...g[gid], collapsed: !g[gid].collapsed } }));
  };

  const createGroup = () => {
    const gid = "g" + Date.now();
    const selected = rows.filter((r) => r.kind !== "group" && isVisible(r.id)).map((r) => r.id);
    setGroups((g) => ({ ...g, [gid]: { label: t("wave.default_group"), collapsed: false, ids: selected } }));
  };

  const removeGroup = (gid: string) => {
    setGroups((g) => {
      const n = { ...g };
      delete n[gid];
      return n;
    });
  };

  const addToGroup = (gid: string, id: string) => {
    setGroups((g) => {
      const grp = g[gid];
      if (!grp || grp.ids.includes(id)) return g;
      return { ...g, [gid]: { ...grp, ids: [...grp.ids, id] } };
    });
  };

  const removeFromGroup = (gid: string, id: string) => {
    setGroups((g) => {
      const grp = g[gid];
      if (!grp) return g;
      return { ...g, [gid]: { ...grp, ids: grp.ids.filter((x) => x !== id) } };
    });
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      setStepW((s) => Math.max(12, Math.min(60, s - Math.sign(e.deltaY) * 2)));
    }
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left + (svgRef.current!.parentElement?.scrollLeft || 0);
    const y = e.clientY - rect.top;
    const n2 = displayIndices.length;
    const idx = Math.floor((x - labelW) / stepW);
    setCursor(idx >= 0 && idx < n2 ? idx : null);
    const ri = Math.floor((y - top) / rowH);
    setHoverRow(ri >= 0 && ri < rows.length ? ri : null);
  };
  const onLeave = () => {
    setCursor(null);
    setHoverRow(null);
  };

  const onClick = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left + (svgRef.current!.parentElement?.scrollLeft || 0);
    const n2 = displayIndices.length;
    const idx = Math.floor((x - labelW) / stepW);
    if (idx < 0 || idx >= n2) return;
    const actualIdx = displayIndices[idx];
    if (e.shiftKey) {
      // Shift+click: toggle measurement point
      if (measureA === actualIdx) {
        setMeasureA(null);
      } else if (measureA !== null) {
        setMeasureA(null); // second click completes measurement (shown in header)
      } else {
        setMeasureA(actualIdx);
      }
      return;
    }
    if (e.altKey) {
      // Alt+click: copy value of hovered signal
      if (hoverRow !== null && rows[hoverRow]) {
        copyValue(rows[hoverRow], idx);
      }
      return;
    }
    // Normal click: toggle marker
    setMarkers((m) => {
      if (m[actualIdx] !== undefined) {
        const n = { ...m };
        delete n[actualIdx];
        return n;
      }
      return { ...m, [actualIdx]: "" };
    });
    setEditingMarker(actualIdx);
    setMarkerEditVal(markers[actualIdx] || "");
  };

  const cursorIdx = cursor !== null ? displayIndices[cursor] : null;
  const cursorX = cursorIdx !== null && cursor !== null ? labelW + cursor * stepW + stepW / 2 : 0;
  const markerEntries = Object.entries(markers) as [string, string][];

  /* marcas de tiempo */
  const tickInterval = Math.max(1, Math.floor(80 / stepW));
  const ticks: { idx: number; x: number; label: string }[] = [];
  if (displayLen > 0) {
    for (let i = 0; i < displayLen; i += tickInterval) {
      const actualIdx = displayIndices[i];
      ticks.push({ idx: i, x: labelW + i * stepW + stepW / 2, label: `${actualIdx * 10}` });
    }
  }

  const exportSvg = () => {
    const svg = svgRef.current!.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = EXPORT_CSS;
    svg.insertBefore(style, svg.firstChild);
    const data = new XMLSerializer().serializeToString(svg);
    dl("ondas.svg", new Blob([data], { type: "image/svg+xml" }));
  };
  const exportPng = () => {
    const svg = svgRef.current!.cloneNode(true) as SVGSVGElement;
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = EXPORT_CSS;
    svg.insertBefore(style, svg.firstChild);
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      c.toBlob((b) => b && dl("ondas.png", b));
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data)));
  };
  const dl = (name: string, blob: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  /* exportar CSV */
  const exportCsv = () => {
    if (!history.length) return;
    const sigIds = rows.filter((r) => r.kind !== "group").map((r) => r.id);
    let csv =
      t("wave.csv_header", {
        sig: sigIds
          .map((id) => {
            const r = rows.find((x) => x.id === id);
            return r?.label || id;
          })
          .join(","),
      }) + "\n";
    for (let i = 0; i < history.length; i++) {
      const row = [String(i), String(i * 10)];
      sigIds.forEach((id) => {
        const r = rows.find((x) => x.id === id);
        row.push(valAtRaw(r || rows[0], i));
      });
      csv += row.join(",") + "\n";
    }
    dl("ondas.csv", new Blob([csv], { type: "text/csv" }));
  };

  /* exportar JSON */
  const exportJson = () => {
    if (!history.length) return;
    const sigIds = rows.filter((r) => r.kind !== "group").map((r) => r.id);
    const data = history.map((h, i) => {
      const entry: Record<string, string | number> = { ciclo: i, tiempo_ns: i * 10 };
      sigIds.forEach((id) => {
        const r = rows.find((x) => x.id === id);
        entry[r?.label || id] = valAtRaw(r || rows[0], i);
      });
      return entry;
    });
    dl("ondas.json", new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  };

  const valAtRaw = (r: Row, i: number): string => {
    const actualIdx = displayIndices[i] ?? i;
    const raw = history[actualIdx]?.vals[r.id];
    if (r.kind === "bus") {
      const bits = r.busBits
        ? r.busBits.map((bid) => {
            const v = history[actualIdx]?.vals[bid];
            return v === 1 ? 1 : (0 as Sig);
          })
        : Array.isArray(raw)
          ? raw.map((b) => (typeof b === "number" ? b : 0) as Sig)
          : [];
      return radixPrefix[radix] + fmtBits(bits, radix);
    }
    return Array.isArray(raw) ? "x" : String(raw ?? "z");
  };

  // preset
  const exportPreset = () =>
    dl("senales.preset.json", new Blob([JSON.stringify({ kind: "simlog-wave-preset", order, names, visible }, null, 2)], { type: "application/json" }));
  const importPreset = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result as string);
        saveWaveSnap();
        setOrder(p.order || []);
        setNames(p.names || {});
        setVisible(p.visible || {});
      } catch {
        /* */
      }
    };
    r.readAsText(file);
  };

  const colorOf = (r: Row): string => {
    return signalColors[r.id] || "";
  };

  const findEdge = (from: number, dir: 1 | -1, rising: boolean): number | null => {
    const searchIdx = displayIndices;
    const searchRows = allRowsRef.current;
    let i = searchIdx.indexOf(from);
    if (i < 0) i = 0;
    const start = i + dir;
    const valAt = (row: Row, idx: number): PortVal | undefined => {
      if (row.id.startsWith("__comp:")) {
        const cid = row.id.slice(8);
        const expr = composites[cid];
        if (!expr) return undefined;
        return evalComposite(expr, idx);
      }
      const actualIdx = searchIdx[idx];
      if (actualIdx === undefined) return undefined;
      return history[actualIdx]?.vals[row.id];
    };
    if (dir > 0) {
      for (let j = start; j < searchIdx.length; j++) {
        for (const row of searchRows) {
          if (row.kind !== "sig" || !isVisible(row.id)) continue;
          const pv = valAt(row, j - 1);
          const cv = valAt(row, j);
          if (typeof pv === "number" && typeof cv === "number") {
            if (rising && pv === 0 && cv === 1) return searchIdx[j];
            if (!rising && pv === 1 && cv === 0) return searchIdx[j];
          }
        }
      }
    } else {
      for (let j = start; j >= 0; j--) {
        for (const row of searchRows) {
          if (row.kind !== "sig" || !isVisible(row.id)) continue;
          const pv = valAt(row, j);
          const cv = valAt(row, j + 1);
          if (typeof pv === "number" && typeof cv === "number") {
            if (rising && pv === 0 && cv === 1) return searchIdx[j + 1];
            if (!rising && pv === 1 && cv === 0) return searchIdx[j + 1];
          }
        }
      }
    }
    return null;
  };

  const copyValue = async (row: Row, idx: number) => {
    if (idx < 0 || idx >= history.length) return;
    const actualIdx = displayIndices[idx];
    const raw = history[actualIdx]?.vals[row.id];
    let text: string;
    if (row.kind === "bus") {
      const bits = row.busBits
        ? row.busBits.map((bid) => {
            const v = history[actualIdx]?.vals[bid];
            return v === 1 ? 1 : (0 as Sig);
          })
        : Array.isArray(raw)
          ? raw.map((b) => (typeof b === "number" ? b : 0) as Sig)
          : [];
      text = radixPrefix[radix] + fmtBits(bits, radix);
    } else {
      text = Array.isArray(raw) ? "x" : String(raw ?? "z");
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* */
    }
  };

  /* Evaluar una expresión booleana compuesta para un índice dado */
  const evalComposite = (expr: string, idx: number): Sig => {
    const actualIdx = displayIndices[idx];
    if (actualIdx === undefined) return 0;
    const resolveName = (name: string): Sig => {
      // Buscar en filas de señal
      for (const row of rows) {
        if (row.kind !== "sig") continue;
        const label = (names[row.id] ?? row.label).toLowerCase();
        if (label === name.toLowerCase()) {
          const v = history[actualIdx]?.vals[row.id];
          return (typeof v === "number" ? v : 0) as Sig;
        }
        if (row.id.toLowerCase() === name.toLowerCase()) {
          const v = history[actualIdx]?.vals[row.id];
          return (typeof v === "number" ? v : 0) as Sig;
        }
      }
      return 0;
    };
    // Parser simple: NOT X, X AND Y, X OR Y, X XOR Y, (EXPR)
    const tokens = expr.match(/\(|\)|NOT|AND|OR|XOR|[^\s()]+/gi) || [];
    const output: (Sig | string)[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i].toUpperCase();
      if (t === "(") output.push(t);
      else if (t === ")") {
        const sub: (Sig | string)[] = [];
        while (output.length && output[output.length - 1] !== "(") sub.unshift(output.pop()!);
        output.pop(); // remove (
        if (sub.length === 1 && typeof sub[0] === "number") output.push(sub[0]);
        else if (sub.length >= 3) {
          let acc = sub[0] as Sig;
          for (let j = 1; j < sub.length; j += 2) {
            const op = sub[j] as string;
            const rhs = sub[j + 1] as Sig;
            if (op === "AND") acc = (acc === 1 && rhs === 1 ? 1 : 0) as Sig;
            else if (op === "OR") acc = (acc === 1 || rhs === 1 ? 1 : 0) as Sig;
            else if (op === "XOR") acc = (acc !== rhs ? 1 : 0) as Sig;
          }
          output.push(acc);
        } else output.push(0);
      } else if (t === "NOT") {
        const next = resolveName(tokens[i + 1]);
        output.push(next === 1 ? 0 : 1);
        i++;
      } else if (t === "AND" || t === "OR" || t === "XOR") output.push(t);
      else output.push(resolveName(t));
    }
    // Evaluar lo que quede
    let result = output[0] as Sig;
    for (let j = 1; j < output.length; j += 2) {
      const op = output[j] as string;
      const rhs = output[j + 1] as Sig;
      if (op === "AND") result = (result === 1 && rhs === 1 ? 1 : 0) as Sig;
      else if (op === "OR") result = (result === 1 || rhs === 1 ? 1 : 0) as Sig;
      else if (op === "XOR") result = (result !== rhs ? 1 : 0) as Sig;
    }
    return result;
  };

  const compositeRows: Row[] = useMemo(() => {
    return Object.entries(composites).map(([id, expr]) => ({
      id: "__comp:" + id,
      label: expr || "expr",
      kind: "sig" as const,
      cls: "comp",
    }));
  }, [composites]);

  const allRows = useMemo(() => [...rows, ...compositeRows], [rows, compositeRows]);
  const allRowsRef = useRef(allRows);
  allRowsRef.current = allRows;
  const height = top + allRows.length * rowH + 10;

  const headerParts: string[] = [];
  if (cursorIdx !== null) headerParts.push(t("wave.cursor_info", { n: cursorIdx, t: cursorIdx * 10 }));
  const markerList = Object.entries(markers);
  if (cursorIdx !== null && markerList.length > 0) {
    const deltas = markerList.map(([k, lbl]) => `Δ${lbl ? "(" + lbl + ")" : ""}=${Math.abs(cursorIdx - Number(k)) * 10}ns`).join(" ");
    headerParts.push(deltas);
  }
  if (measureA !== null && cursorIdx !== null) {
    const delta = Math.abs(cursorIdx - measureA) * 10;
    headerParts.push(`📏 ${delta}ns`);
  }
  if (transView) headerParts.push(t("wave.trans_view"));

  const hasSignals = rows.length > 0;

  return (
    <div className="wave-panel" ref={wavePanelRef}>
      <div className="wave-head">
        <h3>
          {t("wave.title")}
          {headerParts.length > 0 && <> · {headerParts.join(" · ")}</>}
        </h3>
        <div>
          <label className="wave-zoom">
            {t("wave.zoom")} <input type="range" min={12} max={60} value={stepW} onChange={(e) => setStepW(+e.target.value)} />
          </label>
          <label className="wave-zoom" title={t("wave.radix_title")}>
            <select value={radix} onChange={(e) => setRadix(e.target.value as Radix)}>
              <option value="hex">hex</option>
              <option value="dec">dec</option>
              <option value="bin">bin</option>
            </select>
          </label>
          <button
            className={"btn btn-small" + (transView ? " btn-primary" : "")}
            aria-label={t(transView ? "wave.aria.trans_off" : "wave.aria.trans_on")}
            onClick={() => setTransView((v) => !v)}
            title={t("wave.aria.trans_title")}
          >
            {transView ? t("wave.trans_on") : t("wave.trans_off")}
          </button>
          <button className="btn btn-small" disabled={cursorIdx === null} onClick={() => { const idx = findEdge(cursorIdx!, 1, true); if (idx !== null) { const di = displayIndices.indexOf(idx); if (di >= 0) setCursor(di); } }} title="Find next rising edge">↗</button>
          <button className="btn btn-small" disabled={cursorIdx === null} onClick={() => { const idx = findEdge(cursorIdx!, 1, false); if (idx !== null) { const di = displayIndices.indexOf(idx); if (di >= 0) setCursor(di); } }} title="Find next falling edge">↘</button>
          <button className={"btn btn-small" + (analogBuses ? " btn-primary" : "")} onClick={() => setAnalogBuses((v) => !v)} title="Analog bus view">📈</button>
          <button className="btn btn-small" onClick={exportPng} aria-label={t("wave.export_png")}>
            {t("wave.export_png")}
          </button>
          <button className="btn btn-small" onClick={exportSvg} aria-label={t("wave.export_svg")}>
            {t("wave.export_svg")}
          </button>
          <button className="btn btn-small" onClick={onExportVCD} aria-label={t("wave.export_vcd")}>
            {t("wave.export_vcd")}
          </button>
          <button className="btn btn-small" onClick={exportCsv} aria-label={t("wave.export_csv")}>
            {t("wave.export_csv")}
          </button>
          <button className="btn btn-small" onClick={exportJson} aria-label={t("wave.export_json")}>
            {t("wave.export_json")}
          </button>
          <button className="btn btn-small" title={t("wave.preset_export_title")} onClick={exportPreset} aria-label={t("wave.preset_export_title")}>
            {t("wave.preset_export")}
          </button>
          <button
            className="btn btn-small"
            title={t("wave.preset_import_title")}
            onClick={() => presetInput.current?.click()}
            aria-label={t("wave.preset_import_title")}
          >
            {t("wave.preset_import")}
          </button>
          <button
            className="btn btn-small"
            title={t("wave.preset_url_title")}
            aria-label={t("wave.preset_url_title")}
            onClick={() => {
              const data = btoa(unescape(encodeURIComponent(JSON.stringify({ order, names, visible }))));
              const url = `${window.location.origin}${window.location.pathname}?preset=${data}`;
              navigator.clipboard
                .writeText(url)
                .then(() => {})
                .catch(() => {});
            }}
          >
            {t("wave.preset_url")}
          </button>
          <button className="btn btn-small" title={t("wave.group_add_title")} onClick={createGroup} aria-label={t("wave.aria.btn_group")}>
            {t("wave.group_add")}
          </button>
          <button className="btn btn-small" disabled={measureA === null || cursorIdx === null} onClick={() => { if (measureA !== null && cursorIdx !== null) { const rid = "r" + Date.now(); setRegions((r) => ({ ...r, [rid]: { start: Math.min(measureA, cursorIdx), end: Math.max(measureA, cursorIdx), label: `R${Object.keys(regions).length + 1}` } })); } }} title={t("wave.region_add_title")}>
            {t("wave.region_add")}
          </button>
          <button className="btn btn-small" onClick={() => { setSnapHist([...history]); setCompareMode(true); }} title="Snapshot current state for comparison">{t("wave.snapshot")}</button>
          {snapHist && <button className={"btn btn-small" + (compareMode ? " btn-primary" : "")} onClick={() => { setCompareMode((v) => !v); }} title={t("wave.compare_title")}>{t("wave.compare")}</button>}
          {snapHist && compareMode && <button className="btn btn-small" onClick={() => { setSnapHist(null); setCompareMode(false); }} title={t("wave.compare_clear")}>{t("wave.compare_clear")}</button>}
          <button className="btn btn-small" onClick={() => { const id = "c" + Date.now(); setComposites((c) => ({ ...c, [id]: "" })); setCompositeEdit(id); setCompositeExpr(""); }} title={t("wave.comp_add_title")}>{t("wave.comp_add")}</button>
          <input
            ref={presetInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importPreset(f);
              e.target.value = "";
            }}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder={t("wave.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="wave-search"
          />
          <button className="btn btn-small" onClick={onClear}>
            {t("wave.clear")}
          </button>
          <button className="btn btn-small" onClick={onClose}>
            {t("wave.close")}
          </button>
        </div>
      </div>
      <div className="wave-scroll" ref={scrollRef} onScroll={(e) => setScrollPos((e.target as HTMLElement).scrollLeft)}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={onClick}
          onWheel={onWheel}
        >
          <defs>
            <clipPath id="wave-clip">
              <rect x={labelW} y={0} width={width - labelW} height={height} />
            </clipPath>
          </defs>
          <rect x={0} y={0} width={width} height={height} fill="#000" />
          {hoverRow !== null && <rect x={0} y={top + hoverRow * rowH} width={width} height={rowH} className="wave-hover-row" />}
          {cursorIdx !== null && <line className="wave-cursor" x1={cursorX} y1={top} x2={cursorX} y2={height - 6} />}
          {measureA !== null && cursorIdx !== null && measureA !== cursorIdx && (() => {
            const mi = displayIndices.indexOf(measureA);
            if (mi < 0) return null;
            const ax = labelW + mi * stepW + stepW / 2;
            const delta = Math.abs(cursorIdx - measureA) * 10;
            const midX = (ax + cursorX) / 2;
            const midY = top - 6;
            return (
              <g>
                <line className="wave-measure" x1={ax} y1={top} x2={cursorX} y2={top} />
                <line className="wave-measure" x1={ax} y1={top - 4} x2={ax} y2={top + 4} />
                <line className="wave-measure" x1={cursorX} y1={top - 4} x2={cursorX} y2={top + 4} />
                <text x={midX} y={midY} textAnchor="middle" className="wave-tick" fill="#fbbf24" fontSize={10}>
                  {delta}ns
                </text>
              </g>
            );
          })()}
          {measureA !== null && cursorIdx === null && (() => {
            const mi = displayIndices.indexOf(measureA);
            if (mi < 0) return null;
            const ax = labelW + mi * stepW + stepW / 2;
            return <line className="wave-cursor" x1={ax} y1={top} x2={ax} y2={height - 6} stroke="#fbbf24" />;
          })()}
          {markerEntries.map(([k, lbl]) => {
            const idx = displayIndices.indexOf(Number(k));
            if (idx < 0) return null;
            const mx = labelW + idx * stepW + stepW / 2;
            const isEditingM = editingMarker === Number(k);
            return (
              <g key={k}>
                <line className="wave-cursor" x1={mx} y1={top} x2={mx} y2={height - 6} stroke="#60a5fa" strokeDasharray="6 3" />
                {isEditingM ? (
                  <foreignObject x={mx - 30} y={top - 20} width={80} height={20}>
                    <input
                      className="wave-rename-input"
                      value={markerEditVal}
                      onChange={(e) => setMarkerEditVal(e.target.value)}
                      onBlur={() => {
                        setMarkers((m) => ({ ...m, [Number(k)]: markerEditVal }));
                        setEditingMarker(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setMarkers((m) => ({ ...m, [Number(k)]: markerEditVal }));
                          setEditingMarker(null);
                        }
                        if (e.key === "Escape") setEditingMarker(null);
                      }}
                      style={{ width: 70, fontSize: 10 }}
                      autoFocus
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={mx}
                    y={top - 6}
                    textAnchor="middle"
                    className="wave-tick"
                    style={{ cursor: "pointer" }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setEditingMarker(Number(k));
                      setMarkerEditVal(lbl || "");
                    }}
                  >
                    {lbl || `M${Object.keys(markers).indexOf(k) + 1}`}
                  </text>
                )}
              </g>
            );
          })}
          <line className="wave-sep" x1={labelW - 1} y1={top - 4} x2={labelW - 1} y2={height - 6} />
          {Object.entries(regions).map(([rid, rgn]) => {
            const si = displayIndices.indexOf(rgn.start);
            const ei = displayIndices.indexOf(rgn.end);
            if (si < 0 || ei < 0) return null;
            const rx = labelW + Math.min(si, ei) * stepW;
            const rw = Math.abs(ei - si) * stepW;
            const rmX = rx + rw - 2;
            const commitRegionEdit = (v: string) => setRegions((r) => ({ ...r, [rid]: { ...r[rid], label: v } }));
            const deleteRegion = () => setRegions((r) => { const n = { ...r }; delete n[rid]; return n; });
            const startEdit = () => { setRegionEditing(rid); setRegionEditVal(rgn.label); };
            const blurEdit = () => { commitRegionEdit(regionEditVal); setRegionEditing(null); };
            const keyEdit = (e: React.KeyboardEvent) => { if (e.key === "Enter") blurEdit(); if (e.key === "Escape") setRegionEditing(null); };
            return (
              <g key={rid}>
                <rect x={rx} y={top} width={rw} height={height - top - 10} fill="rgba(96,165,250,0.06)" stroke="rgba(96,165,250,0.2)" strokeWidth={1} strokeDasharray="4 2" />
                {regionEditing === rid ? (
                  <foreignObject x={rx} y={top + 2} width={Math.min(rw, 120)} height={20}>
                    <input className="wave-rename-input" value={regionEditVal} onChange={(e) => setRegionEditVal(e.target.value)} onBlur={blurEdit} onKeyDown={keyEdit} style={{ width: Math.min(rw, 110), fontSize: 10 }} autoFocus />
                  </foreignObject>
                ) : (
                  <g>
                    <text x={rx + 4} y={top + 14} className="wave-tick" fill="#60a5fa" fontSize={9} style={{ cursor: "pointer" }} onClick={startEdit}>
                      {rgn.label || rid}
                    </text>
                    <text x={rmX - 2} y={top + 14} className="wave-tick" fill="#f87171" fontSize={9} style={{ cursor: "pointer" }} onClick={deleteRegion}>✕</text>
                  </g>
                )}
              </g>
            );
          })}
          <text x={6} y={top - 8} className="wave-tick">
            {t("wave.header_dt")}
          </text>
          {ticks.map((t) => (
            <g key={t.idx}>
              <line className="wave-grid-tick" x1={t.x} y1={top - 4} x2={t.x} y2={height - 6} />
              <text x={t.x} y={top - 8} className="wave-tick" textAnchor="middle">
                {t.label}
              </text>
            </g>
          ))}
          {allRows.map((r, ri) => {
            const y0 = top + ri * rowH,
              yc = y0 + rowH / 2 + 4;
            const sep = <line className="wave-sep" x1={0} y1={y0 + rowH} x2={width} y2={y0 + rowH} />;
            const isEditing = editing === r.id;
            const hidden = r.kind === "group" ? false : !isVisible(r.id);
            const btnY = y0 + (rowH - 22) / 2;
            const ctrlBtn = (x: number, on: () => void, icon: React.ReactNode, title: string) => (
              <g className="wave-ctl-btn" onClick={on} transform={`translate(${x}, ${btnY})`}>
                <title>{title}</title>
                <rect width="22" height="22" rx="4" className="wave-ctl-hit" />
                <g transform="translate(3, 4)">{icon}</g>
              </g>
            );

            if (r.kind === "group") {
              const gid = r.id.slice(8);
              const g = groups[gid];
              const ctrl = (
                <g>
                  {ctrlBtn(4, () => toggleGroup(gid), <CollapseIcon on={!!r.collapsed} />, t(r.collapsed ? "wave.group_expand" : "wave.group_collapse"))}
                  {ctrlBtn(
                    34,
                    () => removeGroup(gid),
                    <text x={2} y={15} fontSize={13} fill="#f87171">
                      ✕
                    </text>,
                    t("wave.group_delete"),
                  )}
                  {isEditing ? (
                    <foreignObject x={ctrlW} y={y0 + 4} width={labelW - ctrlW - 4} height={24}>
                      <input
                        ref={editRef}
                        className="wave-rename-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitRename(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(r.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      x={ctrlW + 2}
                      y={yc}
                      className="wave-label"
                      fontWeight="bold"
                      onClick={() => startRename(r.id, g?.label || gid)}
                      style={{ cursor: "pointer" }}
                    >
                      {g?.label || gid} [{g?.ids.length || 0}]
                    </text>
                  )}
                </g>
              );
              if (r.collapsed)
                return (
                  <g key={r.id} opacity={0.6}>
                    {sep}
                    {ctrl}
                  </g>
                );
              return (
                <g key={r.id}>
                  {sep}
                  {ctrl}
                </g>
              );
            }

            const isComposite = r.id.startsWith("__comp:");
            const controls = (
              <g className="wave-ctl" opacity={hidden ? 0.35 : 1}>
                {isComposite ? (
                  <g>
                    {ctrlBtn(4, () => { setComposites((c) => { const n = { ...c }; delete n[r.id.slice(8)]; return n; }); }, <text x={2} y={15} fontSize={13} fill="#f87171">✕</text>, "Delete expression")}
                  </g>
                ) : (
                  <>
                {ctrlBtn(4, () => toggleVis(r.id), <EyeIcon on={!hidden} />, t(hidden ? "wave.vis_show" : "wave.vis_hide"))}
                {ctrlBtn(34, () => move(r.id, -1), <CtrlIcon type="up" />, t("wave.move_up"))}
                {ctrlBtn(60, () => move(r.id, 1), <CtrlIcon type="down" />, t("wave.move_down"))}
                {(() => {
                  const c = colorOf(r);
                  return (
                    <g>
                      <rect x={86} y={btnY + 4} width={12} height={12} rx={2} fill={c || "#555"} stroke={c ? "var(--border)" : "none"} strokeWidth={1} style={{ cursor: "pointer" }} onClick={() => { setPickedColor(r.id); colorPickerRef.current?.click(); }} />
                      {pickedColor === r.id && <input ref={colorPickerRef} type="color" value={c || "#ffffff"} onChange={(e) => { setSignalColors((s) => ({ ...s, [r.id]: e.target.value === "#ffffff" ? "" : e.target.value })); setPickedColor(null); }} style={{ position: "absolute", width: 0, height: 0, opacity: 0 }} />}
                    </g>
                  );
                })()}
                </>
                )}
                {isEditing ? (
                  <foreignObject x={ctrlW} y={y0 + 4} width={labelW - ctrlW - 4} height={24}>
                    <input
                      ref={editRef}
                      className="wave-rename-input"
                      value={isComposite ? composites[r.id.slice(8)] || "" : editValue}
                      onChange={(e) => {
                        if (isComposite) {
                          setComposites((c) => ({ ...c, [r.id.slice(8)]: e.target.value }));
                        } else {
                          setEditValue(e.target.value);
                        }
                      }}
                      onBlur={() => isComposite ? setEditing(null) : commitRename(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { if (isComposite) { setComposites((c) => { const n = { ...c }; if (!n[r.id.slice(8)]) delete n[r.id.slice(8)]; return n; }); setEditing(null); } else commitRename(r.id); }
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={ctrlW + 2}
                    y={yc}
                    className="wave-label"
                    onClick={() => startRename(r.id, r.label)}
                    style={{ cursor: "grab" }}
                    onPointerDown={() => handleDragStart(r.id)}
                    onPointerEnter={(e) => {
                      if (dragId && dragId !== r.id) {
                        const ids = rows.map((x) => x.id);
                        const from = ids.indexOf(dragId),
                          to = ids.indexOf(r.id);
                        if (from >= 0 && to >= 0) {
                          ids.splice(from, 1);
                          ids.splice(to, 0, dragId);
                          setOrder(ids);
                          setDragId(r.id);
                        }
                      }
                    }}
                    onPointerUp={() => setDragId(null)}
                    onPointerLeave={() => {}}
                  >
                    {r.label}
                  </text>
                )}
              </g>
            );
            const cval =
              cursorIdx !== null && !hidden ? (
                <text x={cursorX - 4} y={y0 + 12} textAnchor="end" className="wave-cval" clipPath="url(#wave-clip)">
                  {isComposite ? (() => { const ci = cursor!; const ci2 = displayIndices[ci]; if (ci2 === undefined) return "z"; return String(evalComposite(composites[r.id.slice(8)] || "", ci)); })() : valAtRaw(r, cursor!)}
                </text>
              ) : null;
            if (hidden)
              return (
                <g key={r.id} opacity={0.25}>
                  {sep}
                  {controls}
                </g>
              );
            if (r.kind === "bus") {
              if (analogBuses) {
                // Analog view: draw a line chart of the numeric value
                const vals: number[] = [];
                let maxVal = 1;
                const analogIter = useVirtual ? virtIndices : displayIndices;
                for (let vi4 = 0; vi4 < analogIter.length; vi4++) {
                  const actualIdx = analogIter[vi4];
                  const di4 = useVirtual ? virtStart + vi4 : vi4;
                  const bitsOrVal = history[actualIdx]?.vals[r.id];
                  let numVal = 0;
                  if (r.busBits) {
                    const bitVals = r.busBits.map((bid) => {
                      const v = history[actualIdx]?.vals[bid];
                      return (v === 1 || v === 0 ? v : 0) as Sig;
                    });
                    if (bitVals.length && bitVals.every((b) => b === 0 || b === 1))
                      numVal = bitVals.reduce<number>((a, b, i) => a + (b as number) * (1 << i), 0);
                  } else if (Array.isArray(bitsOrVal)) {
                    const bits = (bitsOrVal as Sig[]).map((b) => (typeof b === "number" ? b : 0) as Sig);
                    if (bits.length && bits.every((b) => b === 0 || b === 1))
                      numVal = bits.reduce<number>((a, b, i) => a + b * (1 << i), 0);
                  }
                  vals.push(numVal);
                  if (numVal > maxVal) maxVal = numVal;
                }
                if (maxVal === 0) maxVal = 1;
                const midBand = y0 + rowH / 2;
                const amp = (rowH - 16) / 2;
                let d = "";
                for (let vi4 = 0; vi4 < vals.length; vi4++) {
                  const x = labelW + (useVirtual ? virtStart + vi4 : vi4) * stepW;
                  const y = midBand - amp * (vals[vi4] / maxVal);
                  d += vi4 === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
                }
                const analogColor = signalColors[r.id] || "var(--accent)";
                return (
                  <g key={r.id}>
                    {sep}
                    {controls}
                    {d && <path className="wave-line" d={d} stroke={analogColor || undefined} clipPath="url(#wave-clip)" />}
                    {cval}
                  </g>
                );
              }
              const busTexts: string[] = [];
              const busIter = useVirtual ? virtIndices : displayIndices;
              for (let vi3 = 0; vi3 < busIter.length; vi3++) {
                const actualIdx = busIter[vi3];
                const di3 = useVirtual ? virtStart + vi3 : vi3;
                const bitsOrVal = history[actualIdx]?.vals[r.id];
                if (r.busBits) {
                  const bitVals = r.busBits.map((bid) => {
                    const v = history[actualIdx]?.vals[bid];
                    return (v === 1 || v === 0 ? v : 0) as Sig;
                  });
                  busTexts.push(fmtBits(bitVals, radix));
                } else {
                  const arr = Array.isArray(bitsOrVal) ? bitsOrVal : [];
                  const bits = arr.map((b) => (typeof b === "number" ? b : 0) as Sig);
                  busTexts.push(fmtBits(bits, radix));
                }
              }
              const y = y0 + rowH - 4;
              const fontSize = Math.min(12, stepW * 0.45);
              const texts = busTexts.map((t, vi3) => (
                <text key={vi3} x={labelW + (useVirtual ? virtStart + vi3 : vi3) * stepW + 2} y={y} className="wave-label" fontSize={fontSize} fill="var(--on)" clipPath="url(#wave-clip)">
                  {t}
                </text>
              ));
              return (
                <g key={r.id}>
                  {sep}
                  {controls}
                  {texts}
                  {cval}
                </g>
              );
            }
            const hi = y0 + 7,
              lo = y0 + rowH - 9,
              mid = y0 + rowH / 2;
            const yOf = (v: Sig) => (v === 1 ? hi : v === 0 ? lo : mid);
            const customColor = colorOf(r);
            let d = "",
              prevY: number | null = null,
              anyUndef = false;
            const iterIndices = useVirtual ? virtIndices : displayIndices;
            for (let vi = 0; vi < iterIndices.length; vi++) {
              const actualIdx = iterIndices[vi];
              const di = useVirtual ? virtStart + vi : vi;
              let raw: PortVal | undefined;
              if (isComposite) {
                const cid = r.id.slice(8);
                raw = composites[cid] ? evalComposite(composites[cid], vi) : 0;
              } else {
                raw = history[actualIdx]?.vals[r.id];
              }
              const v: Sig = Array.isArray(raw) ? "x" : (raw ?? "z");
              if (v !== 0 && v !== 1) anyUndef = true;
              const y = yOf(v);
              const x = labelW + di * stepW,
                xn = labelW + (di + 1) * stepW;
              if (vi === 0) d += `M ${x} ${y}`;
              else if (prevY !== y) d += ` L ${x} ${prevY} L ${x} ${y}`;
              d += ` L ${xn} ${y}`;
              prevY = y;
            }
            // Dibujar indicadores de glitch (en modo retardo)
            const glitches: React.ReactNode[] = [];
            if (delayMode) {
              glitchSet.forEach((gi) => {
                const idxInView = displayIndices.indexOf(gi);
                if (idxInView < 0) return;
                const gx = labelW + idxInView * stepW;
                glitches.push(<line key={"g" + gi} className="wave-glitch" x1={gx} y1={y0 + 2} x2={gx} y2={y0 + rowH - 4} />);
              });
            }
            return (
              <g key={r.id}>
                {sep}
                {controls}
                {d && <path className={"wave-line " + r.cls + (anyUndef ? " undef" : "")} d={d} clipPath="url(#wave-clip)" stroke={customColor || undefined} />}
                {compareMode && snapHist && !isComposite && (() => {
                  // Overlay snapshot waveform
                  let sd = "", sprevY: number | null = null;
                  for (let vi2 = 0; vi2 < iterIndices.length; vi2++) {
                    const actualIdx = iterIndices[vi2];
                    const di2 = useVirtual ? virtStart + vi2 : vi2;
                    const raw = snapHist[actualIdx]?.vals[r.id];
                    const v: Sig = Array.isArray(raw) ? "x" : (raw ?? "z");
                    const y = yOf(v);
                    const x = labelW + di2 * stepW, xn = labelW + (di2 + 1) * stepW;
                    if (vi2 === 0) sd += `M ${x} ${y}`;
                    else if (sprevY !== y) sd += ` L ${x} ${sprevY} L ${x} ${y}`;
                    sd += ` L ${xn} ${y}`;
                    sprevY = y;
                  }
                  return sd ? <path className="wave-line" d={sd} clipPath="url(#wave-clip)" stroke="#60a5fa" opacity={0.35} strokeDasharray="6 3" /> : null;
                })()}
                {glitches}
                {cval}
              </g>
            );
          })}
          {hasSignals && history.length === 0 && (
            <text className="wave-hint" x={labelW + 10} y={top + 22}>
              {t("wave.hint_no_sim")}
            </text>
          )}
          {!hasSignals && (
            <text className="wave-hint" x={labelW + 10} y={top + 22}>
              {t("wave.hint_no_signals")}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

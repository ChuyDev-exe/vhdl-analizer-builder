// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Link, useNavigate } from "react-router-dom";

import LogicNode from "../../LogicNode";
import Palette, { DND_TYPE } from "../../Palette";
import Waveform, { type WaveSample } from "../../Waveform";
import CustomModal from "../../CustomModal";
import { simulate, deltaStep } from "../../engine";
import { analyze } from "../../analyze";
import { generateVhdl, buildFromVhdl, instantiateInner, defineCustomFromDiagram, lintVhdl, autoLayout } from "../../vhdl";
import { CUSTOM, REG_BITS, getDef, isSchematic, isFF, isBus, removeCustom } from "../../defs";
import { loadLibrary, saveLibrary, applyLibrary, exportLibrary, importLibrary, serializeLibrary } from "../../library";
import { saveProject, loadProject, listProjects, getRecent, getFavorites, getAutosaveInterval, setAutosaveInterval, pushVersion } from "../../projects";
import ProjectsModal from "../../ProjectsModal";
import LibraryModal from "../../LibraryModal";
import HelpModal from "../../HelpModal";
import { toVCD, generateTestbench, waveRows } from "../../exportvhd";
import { highlightVhdl, getVhdlCompletions, formatVhdl } from "../../highlight";
import { CircuitCtx } from "../../ctx";
import { initAnalytics, trackEvent } from "../../analytics";
import HealthCheck from "../../HealthCheck";
import TourModal from "../../TourModal";
import type { RFNode, RFEdge, NodeData, Sig, PortVal } from "../../types";
import {
  FiPlay,
  FiSkipForward,
  FiRefreshCw,
  FiZap,
  FiClock,
  FiChevronDown,
  FiSave,
  FiFolder,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiRotateCcw,
  FiRotateCw,
  FiGrid,
  FiCode,
  FiBarChart2,
  FiSun,
  FiMoon,
  FiPlus,
  FiPackage,
  FiHelpCircle,
  FiList,
  FiCopy,
  FiShare2,
  FiActivity,
  FiHome,
  FiUser,
  FiImage,
  FiPrinter,
  FiDroplet,
  FiMap,
  FiSidebar,
} from "react-icons/fi";
import "../../styles.css";
import { useI18n } from "../../i18n";
import { HeaderDropdown, type DropdownItem } from "../../HeaderDropdown";
import { useTheme } from "../../contexts/ThemeContext";
import { SimulatorThemeProvider, useSimulatorTheme } from "../../contexts/SimulatorThemeContext";
import { ToastProvider, useToast } from "../../components/shared/Toast";
import HistoryPanel from "../../components/shared/HistoryPanel";
import PropertiesPanel from "../../components/shared/PropertiesPanel";

const nodeTypes = { logic: LogicNode };
const CIRCUIT_KEY = "simlog.circuito.v1";

function SimCanvas({ children }: { children: (theme: ReturnType<typeof useSimulatorTheme>) => React.ReactNode }) {
  const simTheme = useSimulatorTheme();
  return <>{children(simTheme)}</>;
}

function Flow() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const idRef = useRef(100);
  const initData = useRef<{ nodes: RFNode[]; edges: RFEdge[]; entName: string; libCount: number; restored: boolean } | null>(null);
  if (!initData.current) {
    const libCount = loadLibrary();
    let d = { nodes: [] as RFNode[], edges: [] as RFEdge[], entName: "circuito", libCount, restored: false };
    try {
      const raw = localStorage.getItem(CIRCUIT_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.nodes?.length) d = { nodes: s.nodes, edges: s.edges || [], entName: s.entName || "circuito", libCount, restored: true };
      }
    } catch {}
    initData.current = d;
    // Ensure idRef is past all existing node IDs to avoid key collisions
    const maxId = d.nodes.reduce((max, n) => {
      const m = n.id?.match(/^c(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10) + 1) : max;
    }, 100);
    idRef.current = maxId;
  }

  const [nodes, setNodes] = useState<RFNode[]>(initData.current.nodes);
  const [edges, setEdges] = useState<RFEdge[]>(initData.current.edges);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const autoSyncRef = useRef(false);
  const entNameRef = useRef(initData.current.entName);
  const tickCount = useRef(0);

  const [entName, setEntName] = useState(initData.current.entName);
  entNameRef.current = entName;
  const [running, setRunning] = useState(false);
  const [freq, setFreq] = useState(2);
  const [completions, setCompletions] = useState<Array<{ word: string; snippet: string }> | null>(null);
  const [completionIdx, setCompletionIdx] = useState(0);
  const [waveOpen, setWaveOpen] = useState(false);
  const [waveHist, setWaveHist] = useState<WaveSample[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [vhdl, setVhdl] = useState("");
  const vhdlRef = useRef("");
  vhdlRef.current = vhdl;
  const lintErrs = useMemo(() => lintVhdl(vhdl), [vhdl]);
  const [autoSync, setAutoSync] = useState(false);
  autoSyncRef.current = autoSync;
  const [msg, setMsg] = useState<{ t: string; cls: string }>({ t: "", cls: "" });
  const [status, setStatus] = useState(t("app.status.empty"));
  const [modalOpen, setModalOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [projName, setProjName] = useState("circuito");
  const [customVersion, setCustomVersion] = useState(0);
  const [diag, setDiag] = useState<{ loops: number; floating: number; dup: string[] }>({ loops: 0, floating: 0, dup: [] });
  const [snap, setSnap] = useState(false);
  const [delayMode, setDelayMode] = useState(false);
  const delayModeRef = useRef(false);
  delayModeRef.current = delayMode;
  const { theme, setTheme, fontSize, setFontSize, highContrast, setHighContrast } = useTheme();
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const hasUnsavedRef = useRef(false);
  hasUnsavedRef.current = hasUnsaved;
  const [autoSaveMs, setAutoSaveMs] = useState(() => getAutosaveInterval());
  const [showPresentation, setShowPresentation] = useState(() => {
    try { return localStorage.getItem("simlog.presentation_dismissed") !== "1"; } catch { return true; }
  });
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const runSimRef = useRef<() => void>(() => {});
  const statusRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { toast } = useToast();
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bgColor, setBgColor] = useState("");
  const [showMinimap, setShowMinimap] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [alignGuides, setAlignGuides] = useState<{ type: "h" | "v"; pos: number }[]>([]);
  const [propsOpen, setPropsOpen] = useState(false);

  const serializeToHash = useCallback(() => {
    try {
      const data = { nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current, library: serializeLibrary() };
      const json = JSON.stringify(data);
      const compressed = btoa(unescape(encodeURIComponent(json)));
      return compressed;
    } catch { return null; }
  }, []);

  // Keep idRef past all existing "c"+numeric IDs — call after replacing nodes.
  const recalibrateIdRef = useCallback((ns: RFNode[]) => {
    const max = ns.reduce((m, n) => {
      const r = n.id?.match(/^c(\d+)$/);
      return r ? Math.max(m, parseInt(r[1], 10) + 1) : m;
    }, 100);
    idRef.current = Math.max(idRef.current, max);
  }, []);

  const restoreFromHash = useCallback((hash: string) => {
    try {
      const json = decodeURIComponent(escape(atob(hash)));
      const data = JSON.parse(json);
      if (data.library) applyLibrary(data.library);
      if (data.nodes) {
        recalibrateIdRef(data.nodes);
        edgesRef.current = data.edges || [];
        nodesRef.current = data.nodes;
        setEdges(data.edges || []);
        setNodes(data.nodes || []);
        setEntName(data.entName || "circuito");
        queueMicrotask(() => runSimRef.current());
        setStatus(t("app.status.url_restored"));
      }
    } catch { setStatus(t("app.status.url_error")); }
  }, [recalibrateIdRef]);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) restoreFromHash(hash);
  }, []);

  useEffect(() => {
    initAnalytics();
    trackEvent("page_view", "LogicFlow");
    const seen = localStorage.getItem("simlog.tour.v1");
    if (!seen) {
      setTourOpen(true);
      localStorage.setItem("simlog.tour.v1", "1");
    }
  }, []);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const saveCircuit = useCallback(() => {
    try {
      saveLibrary();
      localStorage.setItem(CIRCUIT_KEY, JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current }));
      setHasUnsaved(false);
    } catch {}
  }, []);

  const saveTimer = useRef<number | undefined>(undefined);
  const armedSave = useRef(false);
  useEffect(() => {
    if (!armedSave.current) { armedSave.current = true; return; }
    setHasUnsaved(true);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(saveCircuit, autoSaveMs);
    return () => window.clearTimeout(saveTimer.current);
  }, [nodes, edges, entName, saveCircuit, autoSaveMs]);

  useEffect(() => {
    const { restored, libCount, nodes: ns } = initData.current!;
    if (ns.length) { queueMicrotask(() => commit(nodesRef.current)); setCustomVersion((v) => v + 1); }
    setStatus(restored ? t("app.status.restored", { n: ns.length, lib: libCount }) : libCount ? t("app.status.library", { n: libCount }) : t("app.status.empty"));
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  const commit = useCallback((ns: RFNode[]) => {
    const r = simulate(ns, edgesRef.current);
    const diag = analyze(r, edgesRef.current);
    const annotated = r.map((n) => (n.data._loop === diag.loopNodes.has(n.id) ? n : { ...n, data: { ...n.data, _loop: diag.loopNodes.has(n.id) } }));
    setDiag({ loops: diag.loopNodes.size, floating: diag.floating.length, dup: diag.dupLabels });
    nodesRef.current = annotated;
    setNodes(annotated);
    return annotated;
  }, []);

  const runSim = useCallback(() => commit(nodesRef.current), [commit]);
  runSimRef.current = runSim;

  const syncCodeFromDiagram = useCallback(() => {
    if (!autoSyncRef.current) return;
    queueMicrotask(() => setVhdl(generateVhdl(nodesRef.current, edgesRef.current, entNameRef.current)));
  }, []);

  const pushHistory = useCallback(() => {
    undoStack.current.push(JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current }));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const recordSample = useCallback((ns: RFNode[]) => {
    const vals: Record<string, PortVal> = {};
    ns.forEach((nd) => {
      const d = nd.data;
      if (d.kind === "INPUT" || d.kind === "CLOCK" || d.kind === "OUTPUT") vals[nd.id] = d.value ?? "z";
      else if (isFF(d.kind)) vals[nd.id] = d.q ?? d.init ?? 0;
      else if (d.kind === "REG") (d.bits || []).forEach((b, i) => (vals[nd.id + ":" + i] = b));
      else if (d.kind === "BUSIN" || d.kind === "BUSOUT") vals[nd.id] = (d.bits || []).slice();
      else if (d.kind === "MERGE") vals[nd.id] = (d.outVals?.[0] as Sig[]) || [];
    });
    setWaveHist((h) => [...h.slice(-199), { vals }]);
  }, []);

  const deltaTick = useCallback(() => {
    const r = deltaStep(nodesRef.current, edgesRef.current);
    nodesRef.current = r;
    setNodes(r);
    recordSample(r);
  }, [recordSample]);

  const tick = useCallback(() => {
    tickCount.current++;
    const toggled = nodesRef.current.map((nd) => {
      if (nd.data.kind !== "CLOCK") return nd;
      const div = (nd.data.div as number) || 1;
      const duty = (nd.data.duty as number) ?? 50;
      if (div === 1) {
        const v: Sig = nd.data.value === 1 ? 0 : 1;
        return { ...nd, data: { ...nd.data, value: v } };
      }
      const pos = tickCount.current % div;
      const highTicks = Math.max(1, Math.round(div * duty / 100));
      const v: Sig = pos < highTicks ? 1 : 0;
      return { ...nd, data: { ...nd.data, value: v } };
    });
    const r = commit(toggled);
    recordSample(r);
  }, [commit, recordSample]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tickRef.current(), 1000 / (2 * freq));
    return () => clearInterval(t);
  }, [running, freq]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const removing = changes.some((c) => c.type === "remove");
    if (removing) pushHistory();
    const next = applyNodeChanges(changes, nodesRef.current) as RFNode[];

    const dragging = changes.find((c) => c.type === "position" && c.dragging);
    if (dragging && "position" in dragging && dragging.position) {
      const moved = next.find((n) => n.id === dragging.id);
      if (moved) {
        const guides: { type: "h" | "v"; pos: number }[] = [];
        const margin = 6;
        for (const n of nodesRef.current) {
          if (n.id === moved.id) continue;
          if (Math.abs(n.position.x - moved.position.x) < margin) {
            guides.push({ type: "v", pos: n.position.x });
          }
          if (Math.abs(n.position.y - moved.position.y) < margin) {
            guides.push({ type: "h", pos: n.position.y });
          }
          const myRight = moved.position.x + 80;
          const nRight = n.position.x + 80;
          if (Math.abs(nRight - myRight) < margin) {
            guides.push({ type: "v", pos: nRight });
          }
          const myBottom = moved.position.y + 40;
          const nBottom = n.position.y + 40;
          if (Math.abs(nBottom - myBottom) < margin) {
            guides.push({ type: "h", pos: nBottom });
          }
        }
        setAlignGuides(guides);
      }
    } else {
      setAlignGuides([]);
    }

    nodesRef.current = next;
    setNodes(next);
    if (removing) { queueMicrotask(runSim); syncCodeFromDiagram(); }
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removing = changes.some((c) => c.type === "remove");
    if (removing) pushHistory();
    const next = applyEdgeChanges(changes, edgesRef.current) as RFEdge[];
    edgesRef.current = next;
    setEdges(next);
    if (removing) { queueMicrotask(runSim); syncCodeFromDiagram(); }
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const onConnect = useCallback((c: Connection) => {
    pushHistory();
    const filtered = edgesRef.current.filter((e) => !(e.target === c.target && e.targetHandle === c.targetHandle));
    const next = addEdge({ ...c }, filtered) as RFEdge[];
    edgesRef.current = next;
    setEdges(next);
    runSim();
    syncCodeFromDiagram();
    setStatus(t("app.status.connected"));
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const onNodeClick = useCallback((_: unknown, node: RFNode) => {
    setSelectedNode(node);
    setPropsOpen(true);
    if (node.data.kind !== "INPUT") return;
    const next = nodesRef.current.map((nd) => (nd.id === node.id ? { ...nd, data: { ...nd.data, value: (nd.data.value === 1 ? 0 : 1) as Sig } } : nd));
    if (delayModeRef.current) {
      nodesRef.current = next;
      setNodes(next);
      recordSample(next);
    } else { const r = commit(next); recordSample(r); }
    setStatus(t("app.status.toggled", { label: node.data.label || node.id }));
  }, [commit, recordSample]);

  const onNodeDoubleClick = useCallback((_: unknown, node: RFNode) => {
    const { x, y } = node.position;
    reactFlowInstance.setCenter(x + 50, y + 30, { zoom: 2, duration: 300 });
  }, [reactFlowInstance]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const nextNodeId = useCallback(() => {
    const max = nodesRef.current.reduce((m, n) => {
      const r = n.id?.match(/^c(\d+)$/);
      return r ? Math.max(m, parseInt(r[1], 10)) : m;
    }, 0);
    const next = Math.max(max + 1, idRef.current);
    idRef.current = next + 1;
    return "c" + next;
  }, []);

  const addNodeAt = useCallback((kind: string, pos: { x: number; y: number }) => {
    pushHistory();
    const id = nextNodeId();
    const def = getDef(kind);
    const data: NodeData = { kind };
    if (kind === "INPUT" || kind === "CLOCK") data.value = 0;
    if (kind === "REG") { data.width = REG_BITS; data.bits = new Array(REG_BITS).fill(0) as Sig[]; }
    if (isBus(kind)) { data.width = 4; if (kind === "BUSIN" || kind === "BUSOUT") data.bits = new Array(4).fill(0) as Sig[]; }
    if (isSchematic(kind)) data.inner = instantiateInner(kind);
    const node: RFNode = { id, type: "logic", position: pos, data };
    const next = [...nodesRef.current, node];
    nodesRef.current = next;
    setNodes(next);
    runSim();
    syncCodeFromDiagram();
    setStatus(`${def.label}`);
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const setRegWidth = useCallback((id: string, w: number) => {
    pushHistory();
    const old = nodesRef.current.find((n) => n.id === id);
    const oldW = (old?.data.width as number) || REG_BITS;
    const nextNodes = nodesRef.current.map((n) => (n.id === id ? { ...n, data: { ...n.data, width: w, bits: new Array(w).fill(0) as Sig[] } } : n));
    const nextEdges = edgesRef.current.filter((e) => {
      if (e.target === id) { const k = Number((e.targetHandle || "i0").slice(1)); if (k !== oldW && k >= w) return false; }
      if (e.source === id) { const k = Number((e.sourceHandle || "o0").slice(1)); if (k >= w) return false; }
      return true;
    }).map((e) => (e.target === id && Number((e.targetHandle || "i0").slice(1)) === oldW ? { ...e, targetHandle: "i" + w } : e));
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
    runSim();
    syncCodeFromDiagram();
    setStatus(t("app.status.reg_width", { id, w }));
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const setNodeData = useCallback((id: string, patch: Partial<NodeData>) => {
    pushHistory();
    const next = nodesRef.current.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    nodesRef.current = next;
    setNodes(next);
    runSim();
    syncCodeFromDiagram();
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const [, dropRef] = useDrop(() => ({
    accept: DND_TYPE,
    drop: (item: { kind: string }, monitor) => {
      const off = monitor.getClientOffset();
      if (!off) return;
      addNodeAt(item.kind, screenToFlowPosition({ x: off.x, y: off.y }));
    },
  }), [addNodeAt, screenToFlowPosition]);

  const genVhdl = useCallback(() => {
    const code = generateVhdl(nodesRef.current, edgesRef.current, entName);
    setVhdl(code);
    setMsg({ t: t("app.status.code_generated"), cls: "ok" });
  }, [entName]);

  const buildVhdl = useCallback((text: string, verbose: boolean) => {
    try {
      pushHistory();
      const res = buildFromVhdl(text);
      recalibrateIdRef(res.nodes);
      edgesRef.current = res.edges;
      nodesRef.current = res.nodes;
      setEdges(res.edges);
      setNodes(res.nodes);
      setEntName(res.entName);
      queueMicrotask(runSim);
      setMsg({ t: t("app.status.diagram_built", { n: res.nodes.length }), cls: "ok" });
      if (verbose) setStatus(t("app.status.diagram_built_short", { n: res.nodes.length }));
    } catch (e) {
      setMsg({ t: t("app.status.build_error", { msg: (e as Error).message }), cls: "err" });
      if (verbose) setStatus(t("app.status.build_error_vhdl", { msg: (e as Error).message }));
    }
  }, [runSim, pushHistory]);

  const syncTimer = useRef<number | undefined>(undefined);
  const onVhdlChange = (text: string) => {
    setVhdl(text);
    // Compute auto-complete from the last word
    const ta = textAreaRef.current;
    if (ta) {
      const pos = ta.selectionStart;
      const before = text.slice(0, pos);
      const wordMatch = /([a-zA-Z_]\w*)$/.exec(before);
      if (wordMatch) {
        const c = getVhdlCompletions(wordMatch[1]);
        setCompletions(c.length > 0 ? c : null);
        setCompletionIdx(0);
      } else {
        setCompletions(null);
      }
    }
    if (!autoSync) return;
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => buildVhdl(text, false), 600);
  };

  const completeWord = (snippet: string) => {
    const ta = textAreaRef.current;
    if (!ta) return;
    const text = vhdlRef.current;
    const pos = ta.selectionStart;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const wordMatch = /([a-zA-Z_]\w*)$/.exec(before);
    if (wordMatch) {
      const start = pos - wordMatch[1].length;
      const newText = before.slice(0, start) + snippet + after;
      setVhdl(newText);
      setCompletions(null);
      queueMicrotask(() => {
        ta.focus();
        ta.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!completions || !completions.length) return;
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      completeWord(completions[completionIdx].snippet);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCompletionIdx((i) => (i + 1) % completions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCompletionIdx((i) => (i - 1 + completions.length) % completions.length);
    } else if (e.key === "Escape") {
      setCompletions(null);
    }
  };

  const openEditor = () => {
    setEditorOpen((o) => {
      const nx = !o;
      if (nx && !vhdl) setVhdl(generateVhdl(nodesRef.current, edgesRef.current, entName));
      return nx;
    });
  };

  const restore = useCallback((snap: string) => {
    const s = JSON.parse(snap);
    edgesRef.current = s.edges;
    nodesRef.current = s.nodes;
    setEdges(s.edges);
    setNodes(s.nodes);
    setEntName(s.entName || "circuito");
    entNameRef.current = s.entName || "circuito";
    queueMicrotask(runSim);
  }, [runSim]);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push(JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current }));
    restore(undoStack.current.pop()!);
    setStatus(t("app.status.undo"));
  }, [restore]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push(JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current }));
    restore(redoStack.current.pop()!);
    setStatus(t("app.status.redo"));
  }, [restore]);

  const clipboard = useRef<{ nodes: RFNode[]; edges: RFEdge[] } | null>(null);
  const copySel = useCallback(() => {
    const sel = nodesRef.current.filter((n) => n.selected);
    if (!sel.length) return false;
    const ids = new Set(sel.map((n) => n.id));
    const edges = edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target));
    clipboard.current = JSON.parse(JSON.stringify({ nodes: sel, edges }));
    setStatus(t("app.status.copied", { n: sel.length }));
    return true;
  }, []);

  const pasteSel = useCallback(() => {
    const cb = clipboard.current;
    if (!cb || !cb.nodes.length) return;
    pushHistory();
    const idMap: Record<string, string> = {};
    const newNodes = cb.nodes.map((n) => {
      const nid = nextNodeId();
      idMap[n.id] = nid;
      return { ...n, id: nid, position: { x: n.position.x + 32, y: n.position.y + 32 }, selected: true };
    });
    const newEdges = cb.edges.map((e) => ({ ...e, id: "e" + idRef.current++, source: idMap[e.source], target: idMap[e.target] }));
    const next = nodesRef.current.map((n) => ({ ...n, selected: false })).concat(newNodes);
    const nextE = [...edgesRef.current, ...newEdges];
    nodesRef.current = next;
    edgesRef.current = nextE;
    setNodes(next);
    setEdges(nextE);
    runSim();
    syncCodeFromDiagram();
    setStatus(t("app.status.pasted", { n: newNodes.length }));
  }, [runSim, syncCodeFromDiagram, pushHistory]);

  const duplicateSel = useCallback(() => { if (copySel()) pasteSel(); }, [copySel, pasteSel]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); setProjectsOpen(true); return; }
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { setHelpOpen(true); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") { copySel(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") { pasteSel(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, copySel, pasteSel, duplicateSel]);

  const download = (name: string, text: string, type = "text/plain") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
  };

  const importVhd = (file: File) => {
    const r = new FileReader();
    r.onload = () => { setEditorOpen(true); setVhdl(r.result as string); buildVhdl(r.result as string, true); };
    r.readAsText(file);
  };

  const serialize = () =>
    JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current, entName, components: serializeLibrary() }, null, 2);

  const applyProject = (data: any) => {
    if (data.components) applyLibrary(data.components);
    else if (data.custom) applyLibrary(Object.values(data.custom).map((d: any) => ({ kind: "", label: d.label, mode: "expr", inputs: d.inputs, exprs: d.exprs })));
    saveLibrary();
    setCustomVersion((v) => v + 1);
    const ns = data.nodes || [];
    recalibrateIdRef(ns);
    edgesRef.current = data.edges || [];
    nodesRef.current = ns;
    setEdges(data.edges || []);
    setNodes(data.nodes || []);
    setEntName(data.entName || "circuito");
    queueMicrotask(runSim);
  };

  const loadJson = (file: File) => {
    const r = new FileReader();
    r.onload = () => { try { applyProject(JSON.parse(r.result as string)); setStatus(t("app.status.loaded")); } catch (e) { setStatus(t("app.status.load_error", { msg: (e as Error).message })); } };
    r.readAsText(file);
  };

  const saveProjectAs = (name: string) => {
    try {
      const data = JSON.parse(serialize());
      saveProject(name, data);
      pushVersion(name, data, "Guardado manual");
      setProjName(name);
      setStatus(t("app.status.project_saved", { name }));
    } catch (e) { setStatus(t("app.status.project_save_error", { msg: (e as Error).message })); }
  };

  const openProject = (name: string) => {
    try { applyProject(loadProject(name)); setProjName(name); setStatus(t("app.status.project_opened", { name })); } catch (e) { setStatus(t("app.status.project_open_error", { msg: (e as Error).message })); }
  };

  const backupExport = () => {
    const backup = { kind: "simlog-backup", version: 2, circuit: { nodes: nodesRef.current, edges: edgesRef.current, entName: entNameRef.current }, library: serializeLibrary(), projects: listProjects(), favorites: getFavorites(), recent: getRecent(), date: new Date().toISOString() };
    download("simlog-backup.json", JSON.stringify(backup, null, 2), "application/json");
  };

  const backupImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result as string);
        if (data.kind !== "simlog-backup") throw new Error("Invalid backup file");
        if (data.library) applyLibrary(data.library);
        saveLibrary();
        if (data.circuit) applyProject(data.circuit);
        if (data.favorites) localStorage.setItem("simlog.projects.favorites", JSON.stringify(data.favorites));
        if (data.recent) localStorage.setItem("simlog.projects.recent", JSON.stringify(data.recent));
        setCustomVersion((v) => v + 1);
        setStatus(t("app.status.backup_imported"));
      } catch (e) { setStatus(t("app.status.backup_import_error", { msg: (e as Error).message })); }
    };
    r.readAsText(file);
  };

  const deleteCustom = (kind: string) => {
    if (nodesRef.current.some((n) => n.data.kind === kind)) { setStatus(t("app.status.custom_in_use")); return; }
    removeCustom(kind);
    saveLibrary();
    setCustomVersion((v) => v + 1);
    setStatus(t("app.status.custom_deleted"));
  };

  const importLib = (file: File) => {
    const r = new FileReader();
    r.onload = () => { try { const n = importLibrary(r.result as string); setCustomVersion((v) => v + 1); setStatus(t("app.status.library_imported", { n })); } catch (e) { setStatus(t("app.status.library_import_error", { msg: (e as Error).message })); } };
    r.readAsText(file);
  };

  const relayout = useCallback(() => { pushHistory(); autoLayout(nodesRef.current, edgesRef.current); setNodes([...nodesRef.current]); setStatus(t("app.status.auto_layout")); }, [pushHistory]);

  const reset = () => {
    tickCount.current = 0;
    const next = nodesRef.current.map((nd) => { const iv: Sig = nd.data.init ?? 0; return { ...nd, data: { ...nd.data, q: iv, prevClk: 0 as Sig, bits: nd.data.bits ? nd.data.bits.map(() => iv) : undefined } }; });
    commit(next); setWaveHist([]); setStatus(t("app.status.reset"));
  };

  const clearAll = () => {
    if (!confirm(t("app.confirm_clear"))) return;
    pushHistory();
    nodesRef.current = []; edgesRef.current = []; setNodes([]); setEdges([]); setWaveHist([]);
    setStatus(t("app.status.cleared"));
  };

  const exportImage = useCallback(async () => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, { backgroundColor: bgColor || undefined });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = (entNameRef.current || "circuito") + ".png";
      a.click();
      toast("Imagen exportada", "ok");
    } catch {
      toast("Error al exportar imagen", "err");
    }
    setExporting(false);
  }, [bgColor, toast]);

  const printCircuit = useCallback(() => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) {
      window.print();
      return;
    }
    toPng(el, { backgroundColor: bgColor || "#ffffff" }).then((dataUrl) => {
      const w = window.open("", "_blank");
      if (!w) { window.print(); return; }
      w.document.write(`
        <html><head><title>LogicFlow - ${entNameRef.current || "circuito"}</title>
        <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%;height:auto}</style>
        </head><body><img src="${dataUrl}" onload="window.print();window.close()" /></body></html>
      `);
      w.document.close();
    }).catch(() => window.print());
  }, [bgColor]);

  const exportVCD = () => download("ondas.vcd", toVCD(waveRows(nodesRef.current), waveHist), "text/plain");
  const exportTb = () => download((entName || "circuito") + "_tb.vhd", generateTestbench(nodesRef.current, edgesRef.current, entName, waveHist), "text/plain");

  const fileVhd = useRef<HTMLInputElement>(null);
  const fileJson = useRef<HTMLInputElement>(null);
  const fileLib = useRef<HTMLInputElement>(null);
  const fileBackup = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const ta = textAreaRef.current;
    if (!ta) return;
    if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }, []);

  return (
    <CircuitCtx.Provider value={{ setRegWidth, setNodeData }}>
      <div className="app">
        {showPresentation && (
          <div className="presentation-banner">
            <div className="presentation-content">
              <strong>Bienvenido a LogicFlow</strong>
              <span>Arrastra componentes desde la paleta izquierda al lienzo. Conecta las salidas (⚪) a las entradas para crear tu circuito. Presiona <kbd>▶ Run</kbd> para simular.</span>
            </div>
            <button className="presentation-dismiss" onClick={() => { setShowPresentation(false); try { localStorage.setItem("simlog.presentation_dismissed", "1"); } catch {} }}>
              Entendido
            </button>
          </div>
        )}
        <header className="topbar">
          <div className="brand">
            <Link to="/" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="2" />
                <path d="M8 14h12M14 8v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="14" cy="14" r="3" fill="currentColor" />
              </svg>
              <h1>VHDL Viewer</h1>
            </Link>
          </div>
          <div className="ctrls">
            <button className={"btn btn-run" + (running ? " running" : "")} onClick={() => setRunning((r) => !r)} aria-label={running ? t("app.aria.run_stop") : t("app.aria.run_start")}>
              <FiPlay size={14} /> {running ? t("app.stop") : t("app.run")}
            </button>
            <button className="btn" onClick={tick} title={t("app.step")} aria-label={t("app.aria.step")}><FiSkipForward size={14} /></button>
            {delayMode && <button className="btn" onClick={deltaTick} title={t("app.delay_propagate")} aria-label={t("app.aria.propagate")}><FiZap size={14} /></button>}
            <button className="btn" onClick={reset} title={t("app.reset")} aria-label={t("app.aria.reset")}><FiRefreshCw size={14} /></button>
            <button className={"btn" + (delayMode ? " btn-primary" : "")} title={t("app.delay_mode")} onClick={() => { const nx = !delayMode; setDelayMode(nx); delayModeRef.current = nx; if (!nx) runSim(); setStatus(nx ? t("app.status.delay_on") : t("app.status.delay_off")); }}>
              <FiZap size={14} />
            </button>
            <label className="freq">
              <FiClock size={13} />
              <input type="range" min={1} max={20} value={freq} onChange={(e) => setFreq(+e.target.value)} />
              <span>{freq} Hz</span>
            </label>
          </div>
          <div className="ctrls right">
            <button className="btn" onClick={() => navigate("/")} title="Inicio" style={{ fontSize: 12 }}>
              <FiHome size={14} />
            </button>
            <button className="btn" onClick={() => navigate("/dashboard")} title="Dashboard" style={{ fontSize: 12 }}>
              <FiUser size={14} />
            </button>
            <HeaderDropdown
              label={t("menu.project")}
              icon={FiSave}
              items={[
                { label: t("menu.project.save"), icon: FiSave, onClick: () => setProjectsOpen(true) },
                { label: t("menu.project.open"), icon: FiFolder, onClick: () => setProjectsOpen(true) },
                { label: t("menu.project.import_json"), icon: FiUpload, onClick: () => fileJson.current?.click() },
                { label: t("menu.project.export_json"), icon: FiDownload, onClick: () => download((projName || entName || "circuito") + ".json", serialize(), "application/json") },
                { label: t("menu.project.import_vhdl"), icon: FiUpload, onClick: () => fileVhd.current?.click() },
                { label: t("menu.project.export_vhdl"), icon: FiDownload, onClick: () => download((entName || "circuito") + ".vhd", generateVhdl(nodesRef.current, edgesRef.current, entName)) },
                { separator: true },
                { label: t("menu.project.backup_export"), icon: FiDownload, onClick: backupExport },
                { label: t("menu.project.backup_import"), icon: FiUpload, onClick: () => fileBackup.current?.click() },
                { separator: true },
                { label: t("menu.project.clear"), icon: FiTrash2, onClick: clearAll, danger: true },
              ]}
            />
            <HeaderDropdown
              label={t("menu.edit")}
              icon={FiRotateCcw}
              items={[
                { label: t("menu.edit.undo"), icon: FiRotateCcw, onClick: undo },
                { label: t("menu.edit.redo"), icon: FiRotateCw, onClick: redo },
                { label: t("menu.edit.duplicate"), icon: FiCopy, onClick: duplicateSel },
                { label: snap ? t("menu.edit.snap_off") : t("menu.edit.snap_on"), icon: FiGrid, onClick: () => setSnap((s) => !s) },
                { label: t("menu.edit.auto_layout"), icon: FiGrid, onClick: relayout },
              ]}
            />
            <HeaderDropdown
              label={t("menu.view")}
              icon={FiCode}
              items={[
                { label: t("menu.view.editor"), icon: FiCode, onClick: openEditor },
                { label: t("menu.view.waveform"), icon: FiBarChart2, onClick: () => setWaveOpen((w) => !w) },
                { label: showMinimap ? "Ocultar minimapa" : "Mostrar minimapa", icon: FiMap, onClick: () => setShowMinimap((s) => !s) },
                { label: historyOpen ? "Ocultar historial" : "Mostrar historial", icon: FiRotateCcw, onClick: () => setHistoryOpen((h) => !h) },
                { label: propsOpen || editorOpen ? "Cerrar panel" : "Propiedades", icon: FiSidebar, onClick: () => { if (propsOpen || editorOpen) { setPropsOpen(false); setEditorOpen(false); } else { setPropsOpen(true); } } },
                { separator: true },
                { label: "Exportar como PNG", icon: FiImage, onClick: exportImage },
                { label: "Imprimir / PDF", icon: FiPrinter, onClick: printCircuit },
                { label: "Fondo: personalizado", icon: FiDroplet, onClick: () => {
                  const input = document.createElement("input");
                  input.type = "color";
                  input.value = bgColor || (theme === "dark" ? "#000000" : "#f5f5f5");
                  input.addEventListener("input", () => setBgColor(input.value));
                  input.click();
                }},
                { separator: true },
                { label: theme === "dark" ? t("menu.view.theme_light") : t("menu.view.theme_dark"), icon: theme === "dark" ? FiSun : FiMoon, onClick: () => setTheme((t) => (t === "dark" ? "light" : "dark")) },
                { label: t("menu.view.help"), icon: FiHelpCircle, onClick: () => setHelpOpen(true) },
                {
                  label: t("menu.view.share"), icon: FiShare2,
                  onClick: () => {
                    const s = serializeToHash();
                    if (!s) { setStatus(t("app.status.url_serialize_error")); return; }
                    const url = `${window.location.origin}${window.location.pathname}#${s}`;
                    navigator.clipboard.writeText(url).then(() => setStatus(t("app.status.url_copy"))).catch(() => setStatus(t("app.status.url_copy_error", { url })));
                  },
                },
                { label: t("menu.view.health"), icon: FiActivity, onClick: () => setHealthOpen(true) },
                { label: highContrast ? t("menu.view.contrast_normal") : t("menu.view.contrast_high"), onClick: () => setHighContrast((h) => !h) },
                { label: t("menu.view.font", { n: fontSize }), onClick: () => { const sizes = [10, 11, 12, 13, 14, 15, 16, 18, 20]; const i = sizes.indexOf(fontSize); setFontSize(sizes[(i + 1) % sizes.length]); } },
                { label: t("menu.view.autosave", { n: Math.round(autoSaveMs / 1000) }), onClick: () => { const intervals = [300, 1000, 2000, 5000, 10000, 30000]; const i = intervals.indexOf(autoSaveMs); const next = intervals[(i + 1) % intervals.length]; setAutoSaveMs(next); setAutosaveInterval(next); } },
              ]}
            />
            <HeaderDropdown
              label={t("menu.library")}
              icon={FiPackage}
              items={[
                { label: t("menu.library.new"), icon: FiPlus, onClick: () => setModalOpen(true) },
                { label: t("menu.library.manage"), icon: FiList, onClick: () => setLibOpen(true) },
                { label: t("menu.library.export"), icon: FiDownload, onClick: () => download("componentes.simlib.json", exportLibrary(), "application/json") },
                { label: t("menu.library.import"), icon: FiUpload, onClick: () => fileLib.current?.click() },
              ]}
            />
          </div>
        </header>

        <div className="layout">
          <Palette customVersion={customVersion} onDeleteCustom={deleteCustom} />
          <section className="center">
            <SimulatorThemeProvider>
              <SimCanvas>
                {(simTheme) => (
                  <div className="canvas-wrap" ref={dropRef as any}>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={nodeTypes}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onNodeClick={onNodeClick as any}
                      onNodeDoubleClick={onNodeDoubleClick as any}
                      onPaneClick={onPaneClick}
                      snapToGrid={snap}
                      snapGrid={[20, 20]}
                      fitView
                      proOptions={{ hideAttribution: true }}
                      defaultEdgeOptions={{ animated: false }}
                      style={{ background: bgColor || undefined }}
                    >
                      <Background gap={20} color={simTheme.gridColor} />
                      <Controls />
                      {showMinimap && <MiniMap pannable zoomable nodeColor={simTheme.nodeColor} maskColor={simTheme.maskColor} style={{ border: "1px solid var(--border)", borderRadius: 8 }} />}
                      {alignGuides.map((g, i) => (
                        <div
                          key={i}
                          className={`align-guide ${g.type === "h" ? "h" : "v"}`}
                          style={g.type === "h" ? { top: g.pos, left: 0, right: 0 } : { left: g.pos, top: 0, bottom: 0 }}
                        />
                      ))}
                    </ReactFlow>
                    <div className="status" ref={statusRef} role="status" aria-live="polite" aria-atomic="true">{status}</div>
                    {historyOpen && (
                      <div className="canvas-overlay top-right">
                        <HistoryPanel
                          undoStack={undoStack.current}
                          redoStack={redoStack.current}
                          onUndo={undo}
                          onRedo={redo}
                        />
                      </div>
                    )}
                    {(diag.loops > 0 || diag.floating > 0 || diag.dup.length > 0) && (
                      <div className="diag" title={t("diag.title")}>
                        {diag.loops > 0 && <span className="diag-err">{t("diag.loops", { n: diag.loops })}</span>}
                        {diag.dup.length > 0 && <span className="diag-err">{t("diag.dup", { names: diag.dup.join(", ") })}</span>}
                        {diag.floating > 0 && <span className="diag-warn">{t("diag.floating", { n: diag.floating })}</span>}
                      </div>
                    )}
                  </div>
                )}
              </SimCanvas>
            </SimulatorThemeProvider>
            {waveOpen && <Waveform nodes={nodes} history={waveHist} onExportVCD={exportVCD} onClose={() => setWaveOpen(false)} onClear={() => setWaveHist([])} delayMode={delayMode} />}
          </section>
          {(editorOpen || propsOpen) && (
            <aside className="vhdl-panel">
              <div className="vhdl-tabs">
                <button
                  className={`vhdl-tab${editorOpen && !propsOpen ? " active" : ""}`}
                  onClick={() => { setEditorOpen(true); setPropsOpen(false); }}
                >
                  <FiCode size={13} /> VHDL
                </button>
                <button
                  className={`vhdl-tab${propsOpen ? " active" : ""}`}
                  onClick={() => { setPropsOpen(true); setEditorOpen(false); }}
                >
                  <FiSidebar size={13} /> Propiedades
                </button>
                <button className="btn btn-small" style={{ marginLeft: "auto" }} onClick={() => { setEditorOpen(false); setPropsOpen(false); }}>✕</button>
              </div>

              {editorOpen && !propsOpen && (
                <>
                  <label className="ent-name">{t("vhdl.entity")}<input value={entName} onChange={(e) => { setEntName(e.target.value); entNameRef.current = e.target.value; syncCodeFromDiagram(); }} /></label>
                  <div className="vhdl-actions">
                    <button className="btn btn-small btn-primary" onClick={genVhdl}>{t("vhdl.diagram_to_code")}</button>
                    <button className="btn btn-small" onClick={() => buildVhdl(vhdl, true)}>{t("vhdl.code_to_diagram")}</button>
                    <button className="btn btn-small" onClick={() => { const f = formatVhdl(vhdl); setVhdl(f); }}>Formatear</button>
                    <label className="chk" title={t("vhdl.auto_sync_title")}><input type="checkbox" checked={autoSync} onChange={(e) => { setAutoSync(e.target.checked); autoSyncRef.current = e.target.checked; if (e.target.checked) setVhdl(generateVhdl(nodesRef.current, edgesRef.current, entNameRef.current)); }} /> {t("vhdl.auto_sync")}</label>
                  </div>
                  <div className="vhdl-editor">
                    <div className="vhdl-gutter" ref={gutterRef} aria-hidden="true">{Array.from({ length: Math.max(1, vhdl.split("\n").length) }, (_, i) => i + 1).join("\n")}</div>
                    <div className="vhdl-code">
                      <pre className="vhdl-pre" aria-hidden="true" ref={preRef} dangerouslySetInnerHTML={{ __html: highlightVhdl(vhdl) || " " }} />
                      <textarea className="vhdl-text" spellCheck={false} value={vhdl} onChange={(e) => onVhdlChange(e.target.value)} placeholder={t("vhdl.placeholder")} ref={textAreaRef} onScroll={syncScroll} onKeyDown={handleKeyDown} />
                      {completions && (
                        <div className="vhdl-completions">
                          {completions.map((c, i) => (
                            <div key={c.word} className={`vhdl-comp ${i === completionIdx ? "sel" : ""}`} onPointerDown={(e) => { e.preventDefault(); completeWord(c.snippet); }}>{c.word}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {vhdl.trim() && (lintErrs.length ? <div className="lint">{lintErrs.map((e, i) => (<div key={i} className="lint-err">⚠ línea {e.line}: {e.msg}</div>))}</div> : <div className="lint lint-ok">{t("vhdl.lint_ok")}</div>)}
                  <div className="vhdl-foot">
                    <button className="btn btn-small" onClick={() => navigator.clipboard.writeText(vhdl)}>{t("vhdl.copy")}</button>
                    <button className="btn btn-small" onClick={() => download((entName || "circuito") + ".vhd", vhdl || generateVhdl(nodesRef.current, edgesRef.current, entName))}>{t("vhdl.download")}</button>
                    <button className="btn btn-small" title={t("vhdl.testbench")} onClick={exportTb}>{t("vhdl.testbench")}</button>
                    <span className={"vhdl-msg " + msg.cls}>{msg.t}</span>
                  </div>
                </>
              )}

              {propsOpen && !editorOpen && (
                <PropertiesPanel
                  node={selectedNode}
                  onClose={() => setPropsOpen(false)}
                  onUpdate={(id, patch) => {
                    setNodeData(id, patch);
                    const nd = nodesRef.current.find((n) => n.id === id);
                    if (nd) setSelectedNode(nd);
                  }}
                />
              )}
            </aside>
          )}
        </div>

        {projectsOpen && <ProjectsModal current={projName} onClose={() => setProjectsOpen(false)} onSave={saveProjectAs} onLoad={openProject} />}
        {libOpen && <LibraryModal onClose={() => setLibOpen(false)} onChanged={() => { saveLibrary(); setCustomVersion((v) => v + 1); }} inUse={(kind) => nodesRef.current.some((n) => n.data.kind === kind)} onExport={(kind) => { const d = getDef(kind); download(d.label + ".simlib.json", JSON.stringify({ kind: "simlog-library", version: 1, components: [d.schematic ? { kind, label: d.label, mode: "vhdl", vhdlSource: d.vhdlSource } : { kind, label: d.label, mode: "expr", inputs: d.inputs, exprs: d.exprs }] }, null, 2), "application/json"); }} />}
        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        {healthOpen && <HealthCheck onClose={() => setHealthOpen(false)} />}
        {tourOpen && <TourModal onClose={() => setTourOpen(false)} />}
        {modalOpen && <CustomModal onClose={() => setModalOpen(false)} onFromDiagram={(name) => defineCustomFromDiagram(name, nodesRef.current, edgesRef.current)} onCreated={(kind) => { saveLibrary(); setCustomVersion((v) => v + 1); setStatus(t("app.status.custom_created", { label: getDef(kind).label })); }} />}

        <input ref={fileVhd} type="file" accept=".vhd,.vhdl,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importVhd(f); e.target.value = ""; }} />
        <input ref={fileJson} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadJson(f); e.target.value = ""; }} />
        <input ref={fileLib} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importLib(f); e.target.value = ""; }} />
        <input ref={fileBackup} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) backupImport(f); e.target.value = ""; }} />
      </div>
    </CircuitCtx.Provider>
  );
}

export default function SimulatorPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <ToastProvider>
          <Flow />
        </ToastProvider>
      </ReactFlowProvider>
    </DndProvider>
  );
}

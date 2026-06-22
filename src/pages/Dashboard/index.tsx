import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPlus, FiSearch, FiGrid, FiList, FiFolder, FiTrash2, FiStar,
  FiClock, FiShare2, FiDownload, FiSettings, FiLogOut, FiCopy,
  FiEye, FiBarChart2, FiArchive, FiX, FiRefreshCw, FiLock, FiUnlock,
  FiUsers, FiCalendar, FiChevronRight,
} from "react-icons/fi";
import JSZip from "jszip";
import Header from "../../components/shared/Header";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects, loadProject, deleteProject, getFavorites, toggleFavorite, saveProject, pushRecent, getTrash, saveTrash, getVersions, pushVersion, TRASH_RETENTION_MS, type ProjectMeta, type TrashItem, type VersionEntry } from "../../projects";
import { listCloudProjects, deleteCloudProject } from "../../services/cloudProjects";
import { generateThumbnail } from "../../services/miniatura";
import { computeDepth } from "../../analyze";
import { formatDate as intlFormatDate } from "../../lib/intl";
import "../../styles.css";
import { PLANS } from "../../services/subscriptions";
import "./Dashboard.css";

type ViewMode = "grid" | "list";
type FilterType = "all" | "favorites" | "shared" | "trash";
type SortType = "updated" | "created" | "name";
type ProjectType = "all" | "combinational" | "sequential" | "bus";
type SharePermission = "read" | "edit";

function inferCircuitType(nodes: any[]): ProjectType {
  if (!nodes || nodes.length === 0) return "all";
  const kinds = new Set(nodes.map((n) => n.data?.kind));
  const hasSeq = kinds.has("DFF") || kinds.has("TFF") || kinds.has("JKFF") || kinds.has("SRFF") || kinds.has("REG") || kinds.has("RAM") || kinds.has("ROM");
  const hasBus = kinds.has("BUSIN") || kinds.has("BUSOUT") || kinds.has("MERGE") || kinds.has("SPLIT");
  if (hasSeq && hasBus) return "sequential";
  if (hasSeq) return "sequential";
  if (hasBus) return "bus";
  return "combinational";
}

function countComponents(nodes: any[]): { total: number; gates: number; ffs: number; depth: number } {
  if (!nodes) return { total: 0, gates: 0, ffs: 0, depth: 0 };
  const gates = nodes.filter((n) => ["AND", "OR", "XOR", "NOT", "NAND", "NOR"].includes(n.data?.kind)).length;
  const ffs = nodes.filter((n) => ["DFF", "TFF", "JKFF", "SRFF", "REG"].includes(n.data?.kind)).length;
  return { total: nodes.length, gates, ffs, depth: 0 };
}

interface SharedWithEntry {
  email: string;
  permission: SharePermission;
}

function getSharedWith(name: string): SharedWithEntry[] {
  try {
    const data = loadProject(name);
    return (data as any).sharedWith || [];
  } catch { return []; }
}

function formatDate(ts: number) {
  return intlFormatDate(ts);
}

function diffNodes(a: any[], b: any[]) {
  const aMap = new Map(a.map((n) => [n.id, n]));
  const bMap = new Map(b.map((n) => [n.id, n]));
  const added: any[] = [];
  const removed: any[] = [];
  const changed: Array<{ id: string; kind: string; label?: string; from: any; to: any }> = [];
  for (const n of b) {
    if (!aMap.has(n.id)) added.push(n);
    else {
      const old = aMap.get(n.id);
      if (JSON.stringify(old.data) !== JSON.stringify(n.data)) changed.push({ id: n.id, kind: n.data.kind, label: n.data.label, from: old, to: n });
    }
  }
  for (const n of a) { if (!bMap.has(n.id)) removed.push(n); }
  return { added, removed, changed };
}

function diffEdges(a: any[], b: any[]) {
  const aSet = new Set(a.map((e) => `${e.source}:${e.sourceHandle}:${e.target}:${e.targetHandle}`));
  const bSet = new Set(b.map((e) => `${e.source}:${e.sourceHandle}:${e.target}:${e.targetHandle}`));
  const added = b.filter((e) => !aSet.has(`${e.source}:${e.sourceHandle}:${e.target}:${e.targetHandle}`));
  const removed = a.filter((e) => !bSet.has(`${e.source}:${e.sourceHandle}:${e.target}:${e.targetHandle}`));
  return { added, removed };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [projectType, setProjectType] = useState<ProjectType>("all");
  const [sortBy, setSortBy] = useState<SortType>("updated");
  const [projects, setProjects] = useState<(ProjectMeta & { cloud?: boolean; type?: ProjectType })[]>([]);
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<TrashItem[]>(getTrash());
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof countComponents>>({ total: 0, gates: 0, ffs: 0, depth: 0 });
  const [showShare, setShowShare] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<SharePermission>("read");
  const [sharedWith, setSharedWith] = useState<SharedWithEntry[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [showDiff, setShowDiff] = useState<{ projectName: string; left: VersionEntry; right: VersionEntry } | null>(null);
  const [diffResult, setDiffResult] = useState<{ nodes: ReturnType<typeof diffNodes>; edges: ReturnType<typeof diffEdges> } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const planId = user?.plan || "free";
  const plan = PLANS[planId];
  const projectLimit = planId === "free" ? 3 : planId === "pro" ? 50 : Infinity;

  const filtered = useMemo(() => {
    let list = showTrash
      ? trashItems.map((t) => ({ name: t.name, ts: t.deletedAt, count: t.data.nodes?.length || 0, cloud: false } as ProjectMeta))
      : filterType === "shared"
        ? projects.filter((p) => {
            try {
              const sw = getSharedWith(p.name);
              return sw.length > 0;
            } catch { return false; }
          })
        : filterType === "favorites" ? projects.filter((p) => favorites.includes(p.name)) : projects;

    if (projectType !== "all") {
      list = list.filter((p) => {
        try {
          const data = loadProject(p.name);
          return inferCircuitType(data.nodes) === projectType;
        } catch { return true; }
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      if (!isNaN(from)) list = list.filter((p) => p.ts >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      if (!isNaN(to)) list = list.filter((p) => p.ts <= to);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tags?.some((t) => t.includes(q)));
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.ts - a.ts;
    });

    return list;
  }, [projects, search, filterType, projectType, sortBy, favorites, showTrash, trashItems, dateFrom, dateTo]);

  const loadProjects = useCallback(async () => {
    const local = listProjects();
    const localMap = new Map(local.map((p) => [p.name, { ...p, cloud: false }]));
    if (user) {
      const cloud = await listCloudProjects(user.id);
      for (const cp of cloud) {
        const existing = localMap.get(cp.name);
        if (!existing || cp.ts > existing.ts) localMap.set(cp.name, { ...cp, cloud: true });
      }
    }
    setProjects(Array.from(localMap.values()));
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    const visible = filtered.slice(0, 12);
    for (const p of visible) {
      if (thumbnails[p.name]) continue;
      try {
        const data = loadProject(p.name);
        const svg = generateThumbnail(data.nodes, data.edges);
        setThumbnails((t) => ({ ...t, [p.name]: svg }));
      } catch { /* */ }
    }
  }, [filtered, projects]);

  const toggleSelect = (name: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.name)));
  };

  const handleOpen = (name: string) => {
    pushRecent(name);
    navigate(`/simulator?project=${encodeURIComponent(name)}`);
  };

  const handleDelete = (name: string) => {
    try {
      const data = loadProject(name);
      const trash = getTrash();
      trash.unshift({ name, deletedAt: Date.now(), data });
      saveTrash(trash.filter((t) => Date.now() - t.deletedAt < TRASH_RETENTION_MS));
      deleteProject(name);
      if (user) deleteCloudProject(user.id, name);
      loadProjects();
      setTrashItems(getTrash());
    } catch { /* */ }
  };

  const handleRestore = (name: string) => {
    const trash = getTrash();
    const item = trash.find((t) => t.name === name);
    if (item) {
      saveProject(name, item.data);
      saveTrash(trash.filter((t) => t.name !== name));
      loadProjects();
      setTrashItems(getTrash());
    }
  };

  const handlePermDelete = (name: string) => {
    saveTrash(getTrash().filter((t) => t.name !== name));
    setTrashItems(getTrash());
  };

  const emptyTrash = () => {
    saveTrash([]);
    setTrashItems([]);
  };

  const handleExportSelected = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const projectsFolder = zip.folder("proyectos");
      if (!projectsFolder) return;

      for (const name of selected) {
        try {
          const data = loadProject(name);
          projectsFolder.file(`${name}.json`, JSON.stringify(data, null, 2));
          const svg = generateThumbnail(data.nodes, data.edges);
          projectsFolder.file(`${name}.svg`, svg);
        } catch { /* */ }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulador-proyectos-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleShowVersions = (name: string) => {
    setShowVersions(name);
    setVersions(getVersions(name));
  };

  const handleRestoreVersion = (name: string, ver: VersionEntry) => {
    saveProject(name, ver.data);
    pushVersion(name, ver.data, "Restaurado");
    loadProjects();
    setShowVersions(null);
  };

  const handleShowStats = (name: string) => {
    try {
      const data = loadProject(name);
      const comps = countComponents(data.nodes);
      const depth = computeDepth(data.nodes as any, data.edges as any);
      setStats({ ...comps, depth });
      setShowStats(name);
    } catch { /* */ }
  };

  const handleShowDiff = (name: string, left: VersionEntry, right: VersionEntry) => {
    const nodeDiff = diffNodes(left.data.nodes || [], right.data.nodes || []);
    const edgeDiff = diffEdges(left.data.edges || [], right.data.edges || []);
    setDiffResult({ nodes: nodeDiff, edges: edgeDiff });
    setShowDiff({ projectName: name, left, right });
  };

  const handleShareOpen = (name: string) => {
    setShowShare(name);
    setShareEmail("");
    setSharePermission("read");
    setSharedWith(getSharedWith(name));
  };

  const doShare = async (name: string) => {
    if (!shareEmail) return;
    try {
      const data = loadProject(name);
      const existing: SharedWithEntry[] = (data as any).sharedWith || [];
      if (!existing.find((s) => s.email === shareEmail)) {
        existing.push({ email: shareEmail, permission: sharePermission });
      }
      saveProject(name, { ...data, sharedWith: existing } as any);
      setSharedWith(existing);
      setShareEmail("");
    } catch { /* */ }
  };

  const removeShared = (name: string, email: string) => {
    try {
      const data = loadProject(name);
      const existing: SharedWithEntry[] = ((data as any).sharedWith || []).filter((s: SharedWithEntry) => s.email !== email);
      saveProject(name, { ...data, sharedWith: existing } as any);
      setSharedWith(existing);
    } catch { /* */ }
  };

  if (!user) {
    return (
      <div className="dashboard-page">
        <Header />
        <div className="dashboard-empty">
          <h2>Inicia sesión para ver tu dashboard</h2>
          <p>Guarda tus proyectos en la nube, colabora y accede a todas las funciones.</p>
          <button className="btn-primary btn-lg" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const usage = {
    used: projects.filter((p) => !(p as any).cloud).length,
    total: projectLimit === Infinity ? -1 : projectLimit,
    storage: +(projects.reduce((a, p) => a + p.count * 0.001, 0)).toFixed(1),
    storageTotal: planId === "free" ? 5 : planId === "pro" ? 1024 : 51200,
  };

  const renderDiffModal = () => {
    if (!showDiff || !diffResult) return null;
    const { projectName, left, right } = showDiff;
    return (
      <div className="modal-overlay" onClick={() => setShowDiff(null)}>
        <div className="modal dash-modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="dash-modal-header">
            <h3><FiEye size={16} /> Diff: {projectName}</h3>
            <div className="diff-versions-label">
              <span>v{left.ts}</span>
              <FiChevronRight size={12} />
              <span>v{right.ts}</span>
            </div>
            <button className="modal-close" onClick={() => setShowDiff(null)}><FiX size={16} /></button>
          </div>
          <div className="dash-modal-body diff-body">
            <div className="diff-section">
              <h4 className="diff-title added">Nodos añadidos ({diffResult.nodes.added.length})</h4>
              {diffResult.nodes.added.length === 0 ? (
                <p className="diff-empty">Sin cambios</p>
              ) : (
                <div className="diff-list">
                  {diffResult.nodes.added.map((n) => (
                    <div key={n.id} className="diff-item added">
                      <span className="diff-kind">{n.data?.kind}</span>
                      {n.data?.label && <span className="diff-label">{n.data.label}</span>}
                      <span className="diff-id">{n.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="diff-section">
              <h4 className="diff-title removed">Nodos eliminados ({diffResult.nodes.removed.length})</h4>
              {diffResult.nodes.removed.length === 0 ? (
                <p className="diff-empty">Sin cambios</p>
              ) : (
                <div className="diff-list">
                  {diffResult.nodes.removed.map((n) => (
                    <div key={n.id} className="diff-item removed">
                      <span className="diff-kind">{n.data?.kind}</span>
                      {n.data?.label && <span className="diff-label">{n.data.label}</span>}
                      <span className="diff-id">{n.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="diff-section">
              <h4 className="diff-title changed">Nodos modificados ({diffResult.nodes.changed.length})</h4>
              {diffResult.nodes.changed.length === 0 ? (
                <p className="diff-empty">Sin cambios</p>
              ) : (
                <div className="diff-list">
                  {diffResult.nodes.changed.map((n) => (
                    <div key={n.id} className="diff-item changed">
                      <span className="diff-kind">{n.kind}</span>
                      {n.label && <span className="diff-label">{n.label}</span>}
                      <span className="diff-id">{n.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="diff-section">
              <h4 className="diff-title added">Conexiones añadidas ({diffResult.edges.added.length})</h4>
              {diffResult.edges.added.length === 0 ? (
                <p className="diff-empty">Sin cambios</p>
              ) : (
                <div className="diff-list">
                  {diffResult.edges.added.map((e, i) => (
                    <div key={i} className="diff-item added">
                      <span className="diff-edge">{e.source}:{e.sourceHandle} → {e.target}:{e.targetHandle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="diff-section">
              <h4 className="diff-title removed">Conexiones eliminadas ({diffResult.edges.removed.length})</h4>
              {diffResult.edges.removed.length === 0 ? (
                <p className="diff-empty">Sin cambios</p>
              ) : (
                <div className="diff-list">
                  {diffResult.edges.removed.map((e, i) => (
                    <div key={i} className="diff-item removed">
                      <span className="diff-edge">{e.source}:{e.sourceHandle} → {e.target}:{e.targetHandle}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <Header />
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-user">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="sidebar-avatar" width={48} height={48} />
            ) : (
              <div className="sidebar-avatar-placeholder">{user.name[0]}</div>
            )}
            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span className="sidebar-plan">{plan.nameEs || plan.name}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <Link to="/dashboard" className="sidebar-link active"><FiFolder size={16} /> Proyectos</Link>
            <Link to="/settings" className="sidebar-link"><FiSettings size={16} /> Configuración</Link>
          </nav>

          <div className="sidebar-filters">
            <h4>Filtros</h4>
            {(["all", "favorites", "shared", "trash"] as FilterType[]).map((ft) => (
              <button
                key={ft}
                className={`sidebar-filter${(ft === "trash" ? showTrash : filterType === ft && !showTrash) ? " active" : ""}`}
                onClick={() => {
                  if (ft === "trash") { setShowTrash(true); setFilterType("all"); }
                  else { setShowTrash(false); setFilterType(ft); }
                }}
              >
                {ft === "all" && <FiFolder size={13} />}
                {ft === "favorites" && <FiStar size={13} />}
                {ft === "shared" && <FiShare2 size={13} />}
                {ft === "trash" && <FiTrash2 size={13} />}
                {ft === "all" ? "Todos" : ft === "favorites" ? "Favoritos" : ft === "shared" ? "Compartidos" : "Papelera"}
              </button>
            ))}
          </div>

          <div className="sidebar-usage">
            <h4>Uso del plan</h4>
            <div className="usage-bar">
              <div className="usage-label">
                <span>Proyectos</span>
                <span>{usage.used}/{usage.total === -1 ? "∞" : usage.total}</span>
              </div>
              <div className="usage-track">
                <div className="usage-fill" style={{ width: `${usage.total === -1 ? Math.min(usage.used / 10, 100) : (usage.used / usage.total) * 100}%` }} />
              </div>
            </div>
            <div className="usage-bar">
              <div className="usage-label">
                <span>Almacenamiento</span>
                <span>{usage.storage} MB / {usage.storageTotal} MB</span>
              </div>
              <div className="usage-track">
                <div className="usage-fill" style={{ width: `${(usage.storage / usage.storageTotal) * 100}%` }} />
              </div>
            </div>
            {trashItems.length > 0 && (
              <div className="sidebar-trash-info">
                <FiArchive size={12} /> {trashItems.length} en papelera
              </div>
            )}
          </div>

          <div className="sidebar-actions">
            <Link to="/pricing" className="sidebar-upgrade">
              {planId === "free" ? "Mejorar plan" : "Gestionar plan"}
            </Link>
            <button className="sidebar-logout" onClick={signOut}>
              <FiLogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-toolbar">
            <div className="toolbar-left">
              <h2>{showTrash ? "Papelera" : filterType === "favorites" ? "Favoritos" : filterType === "shared" ? "Compartidos" : "Mis proyectos"}</h2>
              <div className="search-box">
                <FiSearch size={14} className="search-icon" />
                <input type="text" placeholder="Buscar proyectos..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="toolbar-right">
              <div className="date-filter" title="Filtrar por fecha">
                <FiCalendar size={13} />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="date-input" placeholder="Desde" />
                <span className="date-sep">—</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="date-input" placeholder="Hasta" />
                {(dateFrom || dateTo) && (
                  <button className="date-clear" onClick={() => { setDateFrom(""); setDateTo(""); }}><FiX size={12} /></button>
                )}
              </div>
              <select className="toolbar-select" value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)} title="Filtrar por tipo">
                <option value="all">Todos</option>
                <option value="combinational">Combinacional</option>
                <option value="sequential">Secuencial</option>
                <option value="bus">Buses</option>
              </select>
              <select className="toolbar-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)} title="Ordenar">
                <option value="updated">Actualizado</option>
                <option value="created">Creado</option>
                <option value="name">Nombre</option>
              </select>
              <div className="view-toggle">
                <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")}><FiGrid size={14} /></button>
                <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}><FiList size={14} /></button>
              </div>
              <button className="btn-primary" onClick={() => navigate("/simulator")}>
                <FiPlus size={14} /> Nuevo
              </button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="bulk-bar">
              <span>{selected.size} seleccionados</span>
              <button className="bulk-btn" onClick={selectAll}>
                {selected.size === filtered.length ? "Deseleccionar" : "Seleccionar todos"}
              </button>
              <button className="bulk-btn" onClick={handleExportSelected} disabled={exporting}>
                <FiDownload size={13} /> {exporting ? "Exportando..." : "Exportar ZIP"}
              </button>
            </div>
          )}

          {showTrash && trashItems.length > 0 && (
            <div className="trash-bar">
              <span><FiArchive size={13} /> Los elementos se eliminarán permanentemente después de 30 días</span>
              <button className="bulk-btn danger" onClick={emptyTrash}>Vaciar papelera</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="dashboard-empty-state">
              <FiFolder size={48} />
              <h3>{showTrash ? "Papelera vacía" : "No hay proyectos"}</h3>
              <p>{search ? "Intenta con otros términos de búsqueda" : showTrash ? "Los proyectos eliminados aparecen aquí" : "Crea tu primer proyecto en el simulador"}</p>
              {!search && !showTrash && (
                <button className="btn-primary" onClick={() => navigate("/simulator")}>
                  <FiPlus size={14} /> Crear proyecto
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="project-grid">
              {filtered.map((proj) => (
                <div key={proj.name} className={`project-card${selected.has(proj.name) ? " selected" : ""}`} onClick={() => toggleSelect(proj.name)}>
                  <div className="project-preview" onClick={(e) => { e.stopPropagation(); handleOpen(proj.name); }} style={{ cursor: "pointer" }}>
                    <div className="project-svg-wrap" dangerouslySetInnerHTML={{ __html: thumbnails[proj.name] || `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" width="280" height="160" fill="none"><rect width="280" height="160" rx="8" fill="#111" /><text x="140" y="85" text-anchor="middle" fill="#333" font-size="10" font-family="monospace">Cargando...</text></svg>` }} />
                    <div className="project-check">{selected.has(proj.name) && "✓"}</div>
                    {showTrash && (
                      <div className="project-trash-actions">
                        <button className="trash-btn" onClick={(e) => { e.stopPropagation(); handleRestore(proj.name); }} title="Restaurar">
                          <FiRefreshCw size={12} /> Restaurar
                        </button>
                        <button className="trash-btn danger" onClick={(e) => { e.stopPropagation(); handlePermDelete(proj.name); }} title="Eliminar permanentemente">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="project-card-body">
                    <div className="project-card-header">
                      <h4>{proj.name}</h4>
                      {!showTrash && (
                        <button className="fav-btn" onClick={(e) => { e.stopPropagation(); setFavorites((f) => { const n = [...f]; const idx = n.indexOf(proj.name); idx >= 0 ? n.splice(idx, 1) : n.push(proj.name); toggleFavorite(proj.name); return n; }); }}>
                          <FiStar size={14} className={favorites.includes(proj.name) ? "filled" : ""} />
                        </button>
                      )}
                    </div>
                    {(proj as any).desc && <p className="project-desc">{(proj as any).desc}</p>}
                    <div className="project-meta">
                      <span className="project-count">{proj.count} comp.</span>
                      <span className="project-date"><FiClock size={11} /> {formatDate(proj.ts)}</span>
                      <span className={`project-type-badge ${inferCircuitType(proj.count ? (() => { try { return loadProject(proj.name).nodes; } catch { return []; } })() : [])}`}>
                        {proj.count ? inferCircuitType((() => { try { return loadProject(proj.name).nodes; } catch { return []; } })()) : ""}
                      </span>
                      {(proj as any).cloud && <span className="project-cloud-badge" title="Sincronizado con la nube">☁</span>}
                    </div>
                    {proj.tags && proj.tags.length > 0 && (
                      <div className="project-tags">
                        {proj.tags.map((t: string) => <span key={t} className="project-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  {!showTrash && (
                    <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="card-btn" title="Abrir" onClick={() => handleOpen(proj.name)}><FiFolder size={14} /></button>
                      <button className="card-btn" title="Compartir" onClick={() => handleShareOpen(proj.name)}><FiShare2 size={14} /></button>
                      <button className="card-btn" title="Versiones" onClick={() => handleShowVersions(proj.name)}><FiCopy size={14} /></button>
                      <button className="card-btn" title="Estadísticas" onClick={() => handleShowStats(proj.name)}><FiBarChart2 size={14} /></button>
                      <button className="card-btn danger" title="Eliminar" onClick={() => handleDelete(proj.name)}><FiTrash2 size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="project-list">
              <div className="list-header">
                <span className="list-col-check"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} /></span>
                <span className="list-col-name">Nombre</span>
                <span className="list-col-size">Comp.</span>
                <span className="list-col-type">Tipo</span>
                <span className="list-col-date">Actualizado</span>
                <span className="list-col-actions">Acciones</span>
              </div>
              {filtered.map((proj) => (
                <div key={proj.name} className={`project-list-row${selected.has(proj.name) ? " selected" : ""}`} onClick={() => toggleSelect(proj.name)}>
                  <span className="list-col-check"><input type="checkbox" checked={selected.has(proj.name)} onChange={() => toggleSelect(proj.name)} onClick={(e) => e.stopPropagation()} /></span>
                  <span className="list-col-name" onClick={() => handleOpen(proj.name)} style={{ cursor: "pointer" }}>
                    {favorites.includes(proj.name) && <FiStar size={11} className="filled" style={{ marginRight: 6 }} />}
                    {proj.name}
                    {(proj as any).cloud && <span className="cloud-indicator" title="Sincronizado con la nube">☁</span>}
                  </span>
                  <span className="list-col-size">{proj.count}</span>
                  <span className="list-col-type">
                    {(() => {
                      try { const d = loadProject(proj.name); return inferCircuitType(d.nodes); } catch { return ""; }
                    })()}
                  </span>
                  <span className="list-col-date">{formatDate(proj.ts)}</span>
                  <span className="list-col-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="card-btn" onClick={() => handleOpen(proj.name)} title="Abrir"><FiFolder size={13} /></button>
                    <button className="card-btn" onClick={() => handleShowVersions(proj.name)} title="Versiones"><FiCopy size={13} /></button>
                    <button className="card-btn" onClick={() => handleShareOpen(proj.name)} title="Compartir"><FiShare2 size={13} /></button>
                    <button className="card-btn" onClick={() => handleShowStats(proj.name)} title="Estadísticas"><FiBarChart2 size={13} /></button>
                    <button className="card-btn danger" onClick={() => handleDelete(proj.name)} title="Eliminar"><FiTrash2 size={13} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Versions modal */}
      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(null)}>
          <div className="modal dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3><FiCopy size={16} /> Versiones: {showVersions}</h3>
              <button className="modal-close" onClick={() => setShowVersions(null)}><FiX size={16} /></button>
            </div>
            <div className="dash-modal-body">
              {versions.length === 0 ? (
                <p className="dash-empty-text">Sin versiones guardadas. Cada autoguardado crea un snapshot.</p>
              ) : (
                versions.map((v, i) => (
                  <div key={i} className="version-row">
                    <span className="version-num">v{versions.length - i}</span>
                    <span className="version-date">{formatDate(v.ts)}</span>
                    {v.label && <span className="version-label">{v.label}</span>}
                    <span className="version-comps">{v.data.nodes?.length || 0} comp.</span>
                    <div className="version-actions">
                      {i > 0 && (
                        <button className="btn-ghost btn-xs" onClick={() => handleShowDiff(showVersions, versions[i - 1], v)} title="Comparar con anterior">
                          <FiEye size={11} />
                        </button>
                      )}
                      <button className="btn-ghost btn-xs" onClick={() => handleRestoreVersion(showVersions, v)}>Restaurar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats modal */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(null)}>
          <div className="modal dash-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3><FiBarChart2 size={16} /> Estadísticas: {showStats}</h3>
              <button className="modal-close" onClick={() => setShowStats(null)}><FiX size={16} /></button>
            </div>
            <div className="dash-modal-body stats-grid">
              <div className="stat-item"><span className="stat-value">{stats.total}</span><span className="stat-label">Total componentes</span></div>
              <div className="stat-item"><span className="stat-value">{stats.gates}</span><span className="stat-label">Compuertas</span></div>
              <div className="stat-item"><span className="stat-value">{stats.ffs}</span><span className="stat-label">Flip-Flops</span></div>
              <div className="stat-item"><span className="stat-value">{stats.depth}</span><span className="stat-label">Profundidad</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(null)}>
          <div className="modal dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3><FiShare2 size={16} /> Compartir: {showShare}</h3>
              <button className="modal-close" onClick={() => setShowShare(null)}><FiX size={16} /></button>
            </div>
            <div className="dash-modal-body">
              <p className="dash-hint">Comparte este proyecto con otros usuarios por email.</p>
              <div className="share-form">
                <input type="email" placeholder="email@ejemplo.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
                <select className="toolbar-select" value={sharePermission} onChange={(e) => setSharePermission(e.target.value as SharePermission)}>
                  <option value="read"><FiLock size={12} /> Solo lectura</option>
                  <option value="edit"><FiUnlock size={12} /> Edición</option>
                </select>
                <button className="btn-primary" onClick={() => doShare(showShare)} disabled={!shareEmail}>Compartir</button>
              </div>
              {sharedWith.length > 0 && (
                <div className="shared-list">
                  <h4>Compartido con:</h4>
                  {sharedWith.map((sw) => (
                    <div key={sw.email} className="shared-row">
                      <FiUsers size={13} />
                      <span className="shared-email">{sw.email}</span>
                      <span className={`shared-perm ${sw.permission}`}>
                        {sw.permission === "read" ? <FiLock size={10} /> : <FiUnlock size={10} />}
                        {sw.permission === "read" ? "Solo lectura" : "Edición"}
                      </span>
                      <button className="shared-remove" onClick={() => removeShared(showShare, sw.email)} title="Eliminar">
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diff modal */}
      {renderDiffModal()}
    </div>
  );
}

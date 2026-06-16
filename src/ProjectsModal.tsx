// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useI18n } from "./i18n";
import { FiSave, FiFolder, FiTrash2, FiStar, FiSearch, FiClock, FiPlus } from "react-icons/fi";
import {
  listProjects,
  deleteProject,
  projectExists,
  validateName,
  getFavorites,
  toggleFavorite,
  getRecent,
  pushRecent,
  updateProjectMeta,
  getTemplates,
  type ProjectMeta,
} from "./projects";

export default function ProjectsModal({
  current,
  onClose,
  onSave,
  onLoad,
}: {
  current: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(current);
  const [items, setItems] = useState<ProjectMeta[]>(() => listProjects());
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<string[]>(() => getFavorites());
  const [recent, setRecent] = useState<string[]>(() => getRecent());
  const [desc, setDesc] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingMeta, setEditingMeta] = useState<string | null>(null);
  const [tab, setTab] = useState<"projects" | "templates">("projects");
  const templates = getTemplates();
  const refresh = () => {
    setItems(listProjects());
    setFavs(getFavorites());
    setRecent(getRecent());
  };

  const doSave = () => {
    const n = name.trim();
    const nameErr = validateName(n);
    if (nameErr) {
      setMsg(nameErr);
      return;
    }
    if (projectExists(n) && !confirm(t("modal.projects.confirm_overwrite", { name: n }))) return;
    setMsg("");
    onSave(n);
    pushRecent(n);
    refresh();
  };

  const doLoad = (pname: string) => {
    onLoad(pname);
    pushRecent(pname);
    onClose();
  };

  const doDelete = (pname: string) => {
    if (confirm(t("modal.projects.confirm_delete", { name: pname }))) {
      deleteProject(pname);
      refresh();
    }
  };

  const doToggleFav = (pname: string) => {
    toggleFavorite(pname);
    refresh();
  };

  const doApplyTemplate = (tmpl: (typeof templates)[0]) => {
    tmpl.build();
    onLoad(tmpl.name);
    onSave(tmpl.name);
    pushRecent(tmpl.name);
    refresh();
    onClose();
  };

  const openMeta = (p: ProjectMeta) => {
    setEditingMeta(p.name);
    setDesc(p.desc || "");
    setTagsInput((p.tags || []).join(", "));
  };
  const saveMeta = () => {
    if (editingMeta) {
      const tags = tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      updateProjectMeta(editingMeta, { desc, tags });
    }
    setEditingMeta(null);
    refresh();
  };

  const fecha = (ts: number) => (ts ? new Date(ts).toLocaleString() : "");

  const q = query.toLowerCase();
  const filtered = items.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.tags || []).some((tg) => tg.toLowerCase().includes(q)) || (p.desc || "").toLowerCase().includes(q);
  });
  const pinned = filtered.filter((p) => favs.includes(p.name));
  const rest = filtered.filter((p) => !favs.includes(p.name));

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal projects-modal">
        <div className="proj-tabs">
          <button className={"proj-tab" + (tab === "projects" ? " active" : "")} onClick={() => setTab("projects")}>
            {t("modal.projects.title")}
          </button>
          <button className={"proj-tab" + (tab === "templates" ? " active" : "")} onClick={() => setTab("templates")}>
            {t("modal.projects.templates") || "Plantillas"}
          </button>
        </div>

        {tab === "projects" && (
          <>
            <div className="proj-save">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setMsg("");
                }}
                placeholder={t("modal.projects.placeholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSave();
                }}
              />
              <button className="btn btn-small btn-primary" onClick={doSave}>
                <FiSave size={13} /> {t("modal.projects.save")}
              </button>
            </div>
            {msg && (
              <span className="vhdl-msg err" style={{ display: "block", marginBottom: 8 }}>
                {msg}
              </span>
            )}

            <div className="proj-search">
              <FiSearch size={13} className="proj-search-icon" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("modal.projects.search") || "Buscar…"} />
            </div>

            {recent.length > 0 && !query && (
              <div className="proj-section">
                <div className="proj-section-title">
                  <FiClock size={12} /> {t("modal.projects.recent") || "Recientes"}
                </div>
                <div className="proj-chips">
                  {recent.slice(0, 5).map((r) => (
                    <button key={r} className="proj-chip" onClick={() => doLoad(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="proj-list">
              {filtered.length === 0 && (
                <div className="proj-empty">{query ? t("modal.projects.no_results") || "Sin resultados" : t("modal.projects.empty")}</div>
              )}
              {pinned.map((p) => (
                <ProjectRow
                  key={p.name}
                  project={p}
                  favs={favs}
                  editingMeta={editingMeta}
                  desc={desc}
                  tagsInput={tagsInput}
                  setDesc={setDesc}
                  setTagsInput={setTagsInput}
                  onLoad={doLoad}
                  onDelete={doDelete}
                  onToggleFav={doToggleFav}
                  onOpenMeta={openMeta}
                  onSaveMeta={saveMeta}
                  fecha={fecha}
                  t={t}
                />
              ))}
              {rest.map((p) => (
                <ProjectRow
                  key={p.name}
                  project={p}
                  favs={favs}
                  editingMeta={editingMeta}
                  desc={desc}
                  tagsInput={tagsInput}
                  setDesc={setDesc}
                  setTagsInput={setTagsInput}
                  onLoad={doLoad}
                  onDelete={doDelete}
                  onToggleFav={doToggleFav}
                  onOpenMeta={openMeta}
                  onSaveMeta={saveMeta}
                  fecha={fecha}
                  t={t}
                />
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-small" onClick={onClose}>
                {t("modal.projects.close")}
              </button>
            </div>
          </>
        )}

        {tab === "templates" && (
          <div className="proj-list">
            {templates.map((tmpl) => (
              <div className="proj-row" key={tmpl.name}>
                <div className="proj-info">
                  <span className="proj-name">{tmpl.name}</span>
                  <span className="proj-meta">
                    {tmpl.desc} · {tmpl.tags.join(", ")}
                  </span>
                </div>
                <div className="proj-actions">
                  <button className="btn btn-small btn-primary" onClick={() => doApplyTemplate(tmpl)}>
                    <FiPlus size={13} /> {t("modal.projects.use_template") || "Usar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project: p,
  favs,
  editingMeta,
  desc,
  tagsInput,
  setDesc,
  setTagsInput,
  onLoad,
  onDelete,
  onToggleFav,
  onOpenMeta,
  onSaveMeta,
  fecha,
  t,
}: {
  project: ProjectMeta;
  favs: string[];
  editingMeta: string | null;
  desc: string;
  tagsInput: string;
  setDesc: (v: string) => void;
  setTagsInput: (v: string) => void;
  onLoad: (n: string) => void;
  onDelete: (n: string) => void;
  onToggleFav: (n: string) => void;
  onOpenMeta: (p: ProjectMeta) => void;
  onSaveMeta: () => void;
  fecha: (ts: number) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isFav = favs.includes(p.name);
  const editing = editingMeta === p.name;

  return (
    <div className={"proj-row" + (isFav ? " fav" : "")}>
      <div className="proj-info">
        <div className="proj-info-top">
          <span className="proj-name">{p.name}</span>
          {p.ver && <span className="proj-ver">v{p.ver}</span>}
          {p.tags && p.tags.length > 0 && <span className="proj-tags">{p.tags.join(", ")}</span>}
        </div>
        <span className="proj-meta">
          {p.count} {t("modal.projects.components")} · {fecha(p.ts)}
        </span>
        {p.desc && <span className="proj-desc">{p.desc}</span>}
        {editing && (
          <div className="proj-meta-edit">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("modal.projects.desc_placeholder") || "Descripción"} />
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t("modal.projects.tags_placeholder") || "Etiquetas (coma separadas)"}
            />
            <button className="btn btn-small btn-primary" onClick={onSaveMeta}>
              {t("modal.projects.save")}
            </button>
          </div>
        )}
      </div>
      <div className="proj-actions">
        <button className={"btn btn-small" + (isFav ? " fav" : "")} title={isFav ? "Quitar favorito" : "Favorito"} onClick={() => onToggleFav(p.name)}>
          <FiStar size={13} />
        </button>
        {!editing && (
          <button className="btn btn-small" title="Editar metadatos" onClick={() => onOpenMeta(p)}>
            ✎
          </button>
        )}
        <button className="btn btn-small" title={t("modal.projects.open")} onClick={() => onLoad(p.name)}>
          <FiFolder size={13} />
        </button>
        <button className="btn btn-small btn-danger" title={t("modal.projects.delete")} onClick={() => onDelete(p.name)}>
          <FiTrash2 size={13} />
        </button>
      </div>
    </div>
  );
}

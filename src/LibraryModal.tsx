// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useI18n } from "./i18n";
import { FiCopy, FiEdit2, FiTrash2, FiDownload, FiEye } from "react-icons/fi";
import { CUSTOM, duplicateCustom, renameCustom, removeCustom, type CompDef } from "./defs";

export default function LibraryModal({
  onClose,
  onChanged,
  inUse,
  onExport,
}: {
  onClose: () => void;
  onChanged: () => void;
  inUse: (kind: string) => boolean;
  onExport: (kind: string) => void;
}) {
  const { t } = useI18n();
  const [, force] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const refresh = () => {
    onChanged();
    force((v) => v + 1);
  };
  const entries = Object.entries(CUSTOM) as [string, CompDef][];

  const doRename = (kind: string, d: CompDef) => {
    if (inUse(kind)) {
      setMsg(t("modal.library.in_use_error", { label: d.label }));
      return;
    }
    const n = prompt(t("modal.library.rename_prompt"), d.label);
    if (!n) return;
    try {
      renameCustom(kind, n);
      refresh();
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const doDuplicate = (kind: string, d: CompDef) => {
    const n = prompt(t("modal.library.copy_prompt"), d.label + "_copia");
    if (!n) return;
    try {
      duplicateCustom(kind, n);
      refresh();
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const doDelete = (kind: string, d: CompDef) => {
    if (inUse(kind)) {
      setMsg(t("modal.library.in_use_delete", { label: d.label }));
      return;
    }
    if (confirm(t("modal.library.confirm_delete", { label: d.label }))) {
      removeCustom(kind);
      refresh();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal projects-modal">
        <h2>{t("modal.library.title")}</h2>
        <div className="proj-list">
          {entries.length === 0 && <div className="proj-empty">{t("modal.library.empty")}</div>}
          {entries.map(([kind, d]) => (
            <div className="lib-row" key={kind}>
              <div className="proj-row">
                <div className="proj-info">
                  <span className="proj-name">
                    {d.label} <span className="pal-tag">{d.schematic ? "vhdl" : "expr"}</span>
                  </span>
                  <span className="proj-meta">
                    {`in: ${d.inputs.join(", ") || "—"} · out: ${d.outputs.join(", ") || "—"}`}
                    {inUse(kind) ? ` · ${t("modal.library.in_use")}` : ""}
                  </span>
                </div>
                <div className="proj-actions">
                  <button className="btn btn-small" title={t("modal.library.preview")} onClick={() => setPreview(preview === kind ? null : kind)}>
                    <FiEye size={13} />
                  </button>
                  <button className="btn btn-small" title={t("modal.library.duplicate")} onClick={() => doDuplicate(kind, d)}>
                    <FiCopy size={13} />
                  </button>
                  <button className="btn btn-small" title={t("modal.library.rename")} onClick={() => doRename(kind, d)}>
                    <FiEdit2 size={13} />
                  </button>
                  <button className="btn btn-small" title={t("modal.library.export")} onClick={() => onExport(kind)}>
                    <FiDownload size={13} />
                  </button>
                  <button className="btn btn-small btn-danger" title={t("modal.library.delete")} onClick={() => doDelete(kind, d)}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
              {preview === kind && (
                <pre className="lib-preview">
                  {d.schematic
                    ? d.vhdlSource || "(VHDL)"
                    : Object.entries(d.exprs || {})
                        .map(([o, e]) => `${o} = ${e}`)
                        .join("\n")}
                </pre>
              )}
            </div>
          ))}
        </div>
        {msg && <span className="vhdl-msg err">{msg}</span>}
        <div className="modal-actions">
          <button className="btn btn-small" onClick={onClose}>
            {t("modal.library.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useI18n } from "./i18n";
import { defineCustom, getDef } from "./defs";
import { defineCustomFromVhdl } from "./vhdl";
import { validateName } from "./projects";

const collides = (label: string) =>
  label.trim() &&
  getDef(
    "CUSTOM:" +
      label
        .trim()
        .replace(/[^A-Za-z0-9_]/g, "")
        .toUpperCase(),
  );

const VHDL_TEMPLATE = `library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity mi_componente is
  port (
    a : in  STD_LOGIC;
    b : in  STD_LOGIC;
    y : out STD_LOGIC
  );
end mi_componente;

architecture rtl of mi_componente is
begin
  y <= a xor b;
end rtl;`;

type Mode = "expr" | "vhdl" | "diagram";

export default function CustomModal({
  onClose,
  onCreated,
  onFromDiagram,
}: {
  onClose: () => void;
  onCreated: (kind: string) => void;
  onFromDiagram: (name: string) => string;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("diagram");
  const [name, setName] = useState("");
  const [inputs, setInputs] = useState("");
  const [exprs, setExprs] = useState("");
  const [vhdl, setVhdl] = useState(VHDL_TEMPLATE);
  const [diagName, setDiagName] = useState("");
  const [msg, setMsg] = useState("");

  const create = () => {
    try {
      const label = mode === "expr" ? name : mode === "diagram" ? diagName : /entity\s+([a-z0-9_]+)/i.exec(vhdl)?.[1] || "";
      const nameErr = mode !== "vhdl" ? validateName(label) : null;
      if (nameErr) {
        setMsg(nameErr);
        return;
      }
      if (collides(label) && !confirm(t("modal.custom.confirm_overwrite", { name: label.trim() }))) return;
      let kind: string;
      if (mode === "expr") kind = defineCustom(name, inputs, exprs);
      else if (mode === "vhdl") kind = defineCustomFromVhdl(vhdl);
      else kind = onFromDiagram(diagName);
      onCreated(kind);
      onClose();
    } catch (e) {
      setMsg(t("modal.custom.error", { msg: (e as Error).message }));
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h2>{t("modal.custom.title")}</h2>
        <div className="mode-tabs">
          <button className={"tab" + (mode === "diagram" ? " active" : "")} onClick={() => setMode("diagram")}>
            {t("modal.custom.tab_diagram")}
          </button>
          <button className={"tab" + (mode === "vhdl" ? " active" : "")} onClick={() => setMode("vhdl")}>
            {t("modal.custom.tab_vhdl")}
          </button>
          <button className={"tab" + (mode === "expr" ? " active" : "")} onClick={() => setMode("expr")}>
            {t("modal.custom.tab_expr")}
          </button>
        </div>

        {mode === "diagram" && (
          <>
            <label>
              {t("modal.custom.name")}
              <input value={diagName} onChange={(e) => setDiagName(e.target.value)} placeholder={t("modal.custom.name_placeholder")} />
            </label>
            <p className="modal-hint">{t("modal.custom.hint_diagram")}</p>
          </>
        )}

        {mode === "vhdl" && (
          <>
            <label>
              {t("modal.custom.entity")}
              <textarea rows={14} value={vhdl} onChange={(e) => setVhdl(e.target.value)} spellCheck={false} />
            </label>
            <p className="modal-hint">{t("modal.custom.hint_vhdl")}</p>
          </>
        )}

        {mode === "expr" && (
          <>
            <label>
              {t("modal.custom.expr_name")}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("modal.custom.expr_name_placeholder")} />
            </label>
            <label>
              {t("modal.custom.expr_inputs")}
              <input value={inputs} onChange={(e) => setInputs(e.target.value)} placeholder={t("modal.custom.expr_inputs_placeholder")} />
            </label>
            <label>
              {t("modal.custom.expr_outputs")}
              <textarea rows={4} value={exprs} onChange={(e) => setExprs(e.target.value)} placeholder={"Y = (A and (not S)) or (B and S)"} />
            </label>
            <p className="modal-hint">{t("modal.custom.expr_hint")}</p>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-small" onClick={onClose}>
            {t("modal.custom.cancel")}
          </button>
          <button className="btn btn-small btn-primary" onClick={create}>
            {t("modal.custom.create")}
          </button>
        </div>
        {msg && <span className="vhdl-msg err">{msg}</span>}
      </div>
    </div>
  );
}

import { FiX, FiCpu, FiMapPin, FiTag, FiType } from "react-icons/fi";
import { getDef } from "../../defs";
import type { RFNode, NodeData, Sig } from "../../types";

interface PropertiesPanelProps {
  node: RFNode | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<NodeData>) => void;
}

const KIND_LABELS: Record<string, string> = {
  INPUT: "Entrada",
  OUTPUT: "Salida",
  CLOCK: "Reloj",
  AND: "Compuerta AND",
  OR: "Compuerta OR",
  XOR: "Compuerta XOR",
  NAND: "Compuerta NAND",
  NOR: "Compuerta NOR",
  NOT: "Inversor",
  DFF: "Flip-Flop D",
  JKFF: "Flip-Flop JK",
  REG: "Registro",
  BUSIN: "Bus de entrada",
  BUSOUT: "Bus de salida",
  MERGE: "Fusión",
  SPLIT: "Divisor",
  ROM: "ROM",
  RAM: "RAM",
  CUSTOM: "Personalizado",
};

function isFF(kind: string) {
  return kind === "DFF" || kind === "JKFF";
}

export default function PropertiesPanel({ node, onClose, onUpdate }: PropertiesPanelProps) {
  if (!node) {
    return (
      <aside className="props-panel">
        <div className="props-empty">
          Selecciona un nodo para ver sus propiedades
        </div>
      </aside>
    );
  }

  const d = node.data;
  const def = getDef(d.kind);
  const label = KIND_LABELS[d.kind] || def?.label || d.kind;

  return (
    <aside className="props-panel">
      <div className="props-head">
        <h2><FiCpu size={14} /> Propiedades</h2>
        <button className="btn btn-small" onClick={onClose}><FiX size={14} /></button>
      </div>

      <div className="props-section">
        <div className="props-row">
          <FiTag size={12} />
          <span className="props-label">Tipo</span>
          <span className="props-value">{label}</span>
        </div>
        <div className="props-row">
          <FiMapPin size={12} />
          <span className="props-label">ID</span>
          <span className="props-value mono">{node.id}</span>
        </div>
        <div className="props-row">
          <FiType size={12} />
          <span className="props-label">Etiqueta</span>
          <input
            className="props-input"
            value={d.label || ""}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            placeholder="Sin etiqueta"
          />
        </div>
      </div>

      {(d.kind === "INPUT" || d.kind === "CLOCK") && (
        <div className="props-section">
          <div className="props-row">
            <span className="props-label">Valor inicial</span>
            <select
              className="props-select"
              value={String(d.value ?? 0)}
              onChange={(e) => onUpdate(node.id, { value: (Number(e.target.value) || 0) as Sig })}
            >
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </div>
        </div>
      )}

      {d.kind === "REG" && (
        <div className="props-section">
          <div className="props-row">
            <span className="props-label">Ancho (bits)</span>
            <input
              className="props-input mono"
              type="number"
              min={1}
              max={64}
              defaultValue={(d.width as number) || 4}
              onBlur={(e) => onUpdate(node.id, { width: Math.max(1, Math.min(64, +e.target.value || 4)) })}
            />
          </div>
          <div className="props-row">
            <span className="props-label">Valor</span>
            <span className="props-value mono">{(d.bits as Sig[])?.join("") || "0000"}</span>
          </div>
        </div>
      )}

      {d.kind === "CLOCK" && (
        <div className="props-section">
          <div className="props-row">
            <span className="props-label">Divisor</span>
            <input
              className="props-input mono"
              type="number"
              min={1}
              max={256}
              defaultValue={(d.div as number) || 1}
              onBlur={(e) => onUpdate(node.id, { div: Math.max(1, Math.min(256, +e.target.value || 1)) })}
            />
          </div>
          <div className="props-row">
            <span className="props-label">Duty (%)</span>
            <input
              className="props-input mono"
              type="number"
              min={1}
              max={99}
              defaultValue={(d.duty as number) ?? 50}
              onBlur={(e) => onUpdate(node.id, { duty: Math.max(1, Math.min(99, +e.target.value || 50)) })}
            />
          </div>
        </div>
      )}

      {isFF(d.kind) && (
        <div className="props-section">
          <div className="props-row">
            <span className="props-label">Valor inicial (Q)</span>
            <select
              className="props-select"
              value={String(d.init ?? 0)}
              onChange={(e) => onUpdate(node.id, { init: (Number(e.target.value) || 0) as Sig })}
            >
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </div>
        </div>
      )}

      {(d.kind === "BUSIN" || d.kind === "BUSOUT") && (
        <div className="props-section">
          <div className="props-row">
            <span className="props-label">Ancho (bits)</span>
            <input
              className="props-input mono"
              type="number"
              min={1}
              max={64}
              defaultValue={(d.width as number) || 4}
              onBlur={(e) => onUpdate(node.id, { width: Math.max(1, Math.min(64, +e.target.value || 4)) })}
            />
          </div>
        </div>
      )}

      <div className="props-section">
        <div className="props-row">
          <span className="props-label">Posición</span>
          <span className="props-value mono">x:{Math.round(node.position.x)} y:{Math.round(node.position.y)}</span>
        </div>
      </div>
    </aside>
  );
}

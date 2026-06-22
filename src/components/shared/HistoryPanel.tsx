import { FiRotateCcw, FiRotateCw, FiClock } from "react-icons/fi";

interface HistoryPanelProps {
  undoStack: unknown[];
  redoStack: unknown[];
  onUndo: () => void;
  onRedo: () => void;
}

export default function HistoryPanel({ undoStack, redoStack, onUndo, onRedo }: HistoryPanelProps) {
  return (
    <div className="history-panel">
      <div className="history-head">
        <FiClock size={13} />
        <span>Historial</span>
      </div>
      <div className="history-actions">
        <button className="btn btn-small" disabled={undoStack.length === 0} onClick={onUndo} title="Deshacer (Ctrl+Z)">
          <FiRotateCcw size={12} /> Deshacer
        </button>
        <button className="btn btn-small" disabled={redoStack.length === 0} onClick={onRedo} title="Rehacer (Ctrl+Shift+Z)">
          <FiRotateCw size={12} /> Rehacer
        </button>
      </div>
      <div className="history-stack">
        {undoStack.length === 0 && redoStack.length === 0 && (
          <span className="history-empty">Sin cambios aún</span>
        )}
        {undoStack.map((_, i) => (
          <div key={i} className="history-entry undo">
            <span className="history-dot" />
            <span>Cambio {undoStack.length - i}</span>
          </div>
        ))}
        <div className="history-entry current">
          <span className="history-dot current" />
          <span>Estado actual</span>
        </div>
        {[...redoStack].reverse().map((_, i) => (
          <div key={i} className="history-entry redo">
            <span className="history-dot redo" />
            <span>Cambio {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

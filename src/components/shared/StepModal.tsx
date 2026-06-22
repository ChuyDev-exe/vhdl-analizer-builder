import { useState, type ReactNode } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiX, FiChevronRight } from "react-icons/fi";

interface Step {
  title: string;
  content: ReactNode;
}

interface StepModalProps {
  open: boolean;
  onClose: () => void;
  steps: Step[];
  onComplete?: () => void;
}

export default function StepModal({ open, onClose, steps, onComplete }: StepModalProps) {
  const [step, setStep] = useState(0);
  const last = step === steps.length - 1;

  if (!open) return null;

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleNext = () => {
    if (last) {
      onComplete?.();
      handleClose();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal" style={{ width: 520, maxWidth: "92vw" }}>
        <div className="modal-header">
          <div className="step-dots">
            {steps.map((_, i) => (
              <span key={i} className={`step-dot${i === step ? " active" : ""}${i < step ? " done" : ""}`} />
            ))}
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Cerrar">
            <FiX size={18} />
          </button>
        </div>

        <div className="step-body">
          <h2 className="step-title">{steps[step].title}</h2>
          <div className="step-content">{steps[step].content}</div>
        </div>

        <div className="step-footer">
          <span className="step-counter">
            Paso {step + 1} de {steps.length}
          </span>
          <div className="step-actions">
            {step > 0 && (
              <button className="btn btn-small" onClick={handlePrev}>
                <FiArrowLeft size={13} /> Anterior
              </button>
            )}
            {!last ? (
              <button className="btn btn-small btn-primary" onClick={handleNext}>
                Siguiente <FiArrowRight size={13} />
              </button>
            ) : (
              <button className="btn btn-small btn-primary" onClick={handleNext}>
                <FiCheck size={13} /> Completar
              </button>
            )}
            <button className="btn btn-small" onClick={handleClose}>
              Saltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

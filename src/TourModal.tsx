// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useI18n } from "./i18n";

const STEP_KEYS = [
  { titleKey: "tour.welcome_title", textKey: "tour.welcome_text" },
  { titleKey: "tour.palette_title", textKey: "tour.palette_text" },
  { titleKey: "tour.connect_title", textKey: "tour.connect_text" },
  { titleKey: "tour.simulate_title", textKey: "tour.simulate_text" },
  { titleKey: "tour.waveform_title", textKey: "tour.waveform_text" },
  { titleKey: "tour.vhdl_title", textKey: "tour.vhdl_text" },
  { titleKey: "tour.projects_title", textKey: "tour.projects_text" },
];

export default function TourModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const s = STEP_KEYS[step];
  const last = step === STEP_KEYS.length - 1;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: 480 }}>
        <h2 style={{ marginBottom: 6 }}>{t(s.titleKey)}</h2>
        <div className="modal-hint" style={{ marginBottom: 20, lineHeight: 1.6, fontSize: 13 }}>
          {t(s.textKey)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("tour.step", { current: step + 1, total: STEP_KEYS.length })}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {step > 0 && (
              <button className="btn btn-small" onClick={() => setStep(step - 1)}>
                {t("tour.prev")}
              </button>
            )}
            {!last && (
              <button className="btn btn-small btn-primary" onClick={() => setStep(step + 1)}>
                {t("tour.next")}
              </button>
            )}
            {last && (
              <button className="btn btn-small btn-primary" onClick={onClose}>
                {t("tour.done")}
              </button>
            )}
            <button className="btn btn-small" onClick={onClose}>
              {t("tour.skip")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { useI18n } from "./i18n";

const SHORTCUT_KEYS: [string, string][] = [
  ["Ctrl/⌘ + S", "help.s_ctrl_s"],
  ["Ctrl/⌘ + Z", "help.s_ctrl_z"],
  ["Ctrl/⌘ + Shift + Z / Ctrl+Y", "help.s_ctrl_shift_z"],
  ["Ctrl/⌘ + C", "help.s_ctrl_c"],
  ["Ctrl/⌘ + V", "help.s_ctrl_v"],
  ["Ctrl/⌘ + D", "help.s_ctrl_d"],
  ["Supr / Backspace", "help.s_del"],
  ["Shift + arrastrar", "help.s_shift_drag"],
  ["?", "help.s_question"],
];
const TIP_KEYS = ["help.tip1", "help.tip2", "help.tip3", "help.tip4", "help.tip5"];

export default function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal projects-modal">
        <h2>{t("help.title")}</h2>
        <div className="help-grid">
          {SHORTCUT_KEYS.map(([k, descKey]) => (
            <div className="help-row" key={k}>
              <kbd>{k}</kbd>
              <span>{t(descKey)}</span>
            </div>
          ))}
        </div>
        <h3 className="help-h3">{t("help.tips_title")}</h3>
        <ul className="help-tips">
          {TIP_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="btn btn-small" onClick={onClose}>
            {t("help.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

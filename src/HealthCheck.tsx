// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";

interface Check {
  key: string;
  ok: boolean;
  detail?: string;
}

export default function HealthCheck({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    const results: Check[] = [];

    try {
      const k = "__health_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      results.push({ key: "modal.health.local_storage", ok: true });
    } catch {
      results.push({ key: "modal.health.local_storage", ok: false, detail: t("modal.health.ls_error") });
    }

    if ("serviceWorker" in navigator) {
      results.push({ key: "modal.health.sw", ok: true });
    } else {
      results.push({ key: "modal.health.sw", ok: false, detail: t("modal.health.sw_error") });
    }

    results.push({ key: "modal.health.conn", ok: navigator.onLine, detail: navigator.onLine ? t("modal.health.online") : t("modal.health.offline") });

    if ((performance as any)?.memory) {
      const mem = (performance as any).memory;
      results.push({
        key: "modal.health.memory",
        ok: mem.jsHeapSizeLimit > 0,
        detail: `${Math.round(mem.usedJSHeapSize / 1024 / 1024)} MB usados de ${Math.round(mem.jsHeapSizeLimit / 1024 / 1024)} MB`,
      });
    }

    results.push({ key: "modal.health.browser", ok: true, detail: navigator.userAgent.slice(0, 120) });

    setChecks(results);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allOk = checks.every((c) => c.ok);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: 520 }}>
        <h2>{t("modal.health.title")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {checks.map((c) => (
            <div
              key={c.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 6,
                background: c.ok ? "rgba(52,211,153,.08)" : "rgba(239,91,107,.08)",
                border: `1px solid ${c.ok ? "rgba(52,211,153,.3)" : "rgba(239,91,107,.3)"}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{c.ok ? "✓" : "✗"}</span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t(c.key)}</span>
              {c.detail && (
                <span style={{ fontSize: 11, color: "var(--muted)", maxWidth: "50%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.detail}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{allOk ? t("modal.health.ok") : t("modal.health.fail")}</div>
        <div className="modal-actions">
          <button className="btn btn-small" onClick={onClose}>
            {t("modal.health.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

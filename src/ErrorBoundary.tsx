// SPDX-License-Identifier: MIT
import { Component, type ReactNode } from "react";
import { useI18n } from "./i18n";

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, color: "#e6ecf5", fontFamily: "monospace", maxWidth: 800, margin: "40px auto" }}>
      <h2 style={{ color: "#ef5b6b" }}>{t("error.title")}</h2>
      <pre style={{ whiteSpace: "pre-wrap", background: "#0b0f18", padding: 16, borderRadius: 8, border: "1px solid #2a3450" }}>
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
      <button
        onClick={onRetry}
        style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #4f8cff", background: "#1d2536", color: "#e6ecf5", cursor: "pointer" }}
      >
        {t("error.retry")}
      </button>
    </div>
  );
}

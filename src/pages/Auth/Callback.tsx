// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { handleOAuthCallback, handleSupabaseCallback } from "../../services/auth";

export default function AuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    async function process() {
      // Try Supabase first
      const sbProfile = await handleSupabaseCallback();
      if (sbProfile) {
        navigate("/dashboard", { replace: true });
        return;
      }

      // Fallback: localStorage OAuth
      if (!code || !provider) {
        setError("Parámetros de autenticación inválidos");
        return;
      }

      try {
        handleOAuthCallback(provider as any, code);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError("Error al procesar la autenticación");
      }
    }

    process();
  }, [provider, navigate]);

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
        <h2>Error de autenticación</h2>
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: "var(--muted)" }}>Iniciando sesión...</p>
      </div>
    </div>
  );
}

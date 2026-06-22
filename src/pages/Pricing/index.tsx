import { useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiStar, FiZap, FiShield, FiServer, FiHeadphones, FiUsers, FiCpu, FiBarChart2, FiCode, FiShare2, FiDownload, FiSave } from "react-icons/fi";
import { PLANS, type PlanId } from "../../services/subscriptions";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import "../../styles.css";
import "./Pricing.css";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <FiStar size={22} />,
  pro: <FiZap size={22} />,
  team: <FiShield size={22} />,
};

const PLAN_AUDIENCE: Record<string, string> = {
  free: "Para aficionados y curiosos",
  pro: "Para profesionales y entusiastas",
  team: "Para organizaciones y empresas",
};

const PLAN_HIGHLIGHTS: Record<string, string[]> = {
  free: ["1 proyecto cloud", "25 componentes por proyecto", "5 MB almacenamiento", "Integración GitHub/GitLab"],
  pro: ["Componentes ilimitados", "50 proyectos cloud", "1 GB almacenamiento", "Editor VHDL avanzado", "Historial 30 días", "Soporte email 48h"],
  team: ["Colaboradores ilimitados", "SSO/SAML", "Roles y permisos", "Auditoría completa", "API ilimitada", "Soporte prioritario 4h"],
};

const SUPPORT_LABELS: Record<string, string> = {
  community: "Comunidad (GitHub Discussions)",
  email48h: "Email con respuesta en 48h",
  email24h_chat: "Email 24h + Chat en vivo",
  priority4h_chat_phone: "Prioridad 4h + Chat + Teléfono",
};

const COMPARISON_ROWS = [
  { label: "Proyectos cloud", free: "1", pro: "50", team: "Ilimitados" },
  { label: "Componentes por proyecto", free: "25", pro: "∞", team: "∞" },
  { label: "Almacenamiento cloud", free: "5 MB", pro: "1 GB", team: "50 GB" },
  { label: "Historial de versiones", free: "—", pro: "30 días", team: "1 año" },
  { label: "Compartir (solo lectura)", free: "✅", pro: "✅", team: "✅" },
  { label: "Compartir (edición)", free: "—", pro: "✅", team: "✅" },
  { label: "Colaboradores", free: "—", pro: "3", team: "∞" },
  { label: "Colaboración en tiempo real", free: "—", pro: "—", team: "✅" },
  { label: "Roles y permisos", free: "—", pro: "—", team: "✅" },
  { label: "Exportar PNG / SVG", free: "Con marca", pro: "Sin marca", team: "Sin marca" },
  { label: "Exportar PDF", free: "—", pro: "✅", team: "✅" },
  { label: "Exportar VCD / CSV", free: "—", pro: "✅", team: "✅" },
  { label: "Exportar JSON", free: "✅", pro: "✅", team: "✅" },
  { label: "Editor VHDL avanzado", free: "—", pro: "✅", team: "✅" },
  { label: "Diff visual", free: "—", pro: "✅", team: "✅" },
  { label: "Integración GitHub", free: "✅", pro: "✅", team: "✅" },
  { label: "Integración GitLab", free: "✅", pro: "✅", team: "✅" },
  { label: "API REST", free: "—", pro: "1 000/día", team: "Ilimitada" },
  { label: "Simulación remota (API)", free: "—", pro: "1 000/mes", team: "Ilimitada" },
  { label: "SSO / SAML", free: "—", pro: "—", team: "✅" },
  { label: "Registro de auditoría", free: "—", pro: "—", team: "✅" },
  { label: "Soporte", free: "Comunidad", pro: "Email 48h", team: "Prioridad 4h + Chat + Tel." },
];

const FAQS = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí, puedes cambiar de plan o cancelar cuando quieras. Si escalas a Pro o Team, el cambio es instantáneo. No hay contratos ni permanencia.",
  },
  {
    q: "¿Hay período de prueba gratuito?",
    a: "El plan Pro incluye 14 días gratis sin necesidad de registrar una tarjeta de crédito. Durante la prueba tienes acceso completo a todas las funciones. Al finalizar, puedes elegir entre suscribirte o seguir con el plan Gratis.",
  },
  {
    q: "¿Qué pasa si excedo los límites de mi plan?",
    a: "Recibirás una notificación al alcanzar el 80% del límite de almacenamiento o proyectos. Al llegar al 100%, se deshabilita la creación de nuevos proyectos cloud y el guardado en la nube, pero tus datos permanecen intactos. Puedes liberar espacio eliminando proyectos o actualizar tu plan.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos pagos con tarjeta de crédito/débito (Visa, Mastercard, Amex) a través de Stripe, PayPal y transferencia bancaria para planes anuales. Todos los pagos son procesados de forma segura por Stripe; nunca almacenamos información de tarjetas.",
  },
  {
    q: "¿Puedo usar el simulador sin conexión a internet?",
    a: "El simulador funciona principalmente en línea. Sin embargo, los proyectos locales se guardan en el navegador y son accesibles sin conexión. Las funciones cloud (colaboración en tiempo real, guardado en la nube, historial de versiones) requieren conexión a internet.",
  },
  {
    q: "¿Ofrecen descuentos para organizaciones educativas?",
    a: "Sí, ofrecemos descuentos especiales para universidades e instituciones educativas en el plan Team. Contáctanos en edu@logicflow.dev para más información.",
  },
  {
    q: "¿Cómo funciona la facturación?",
    a: "Recibirás una factura detallada por cada pago. Puedes descargar tus facturas desde Configuración → Facturación. Para planes Team, ofrecemos facturación consolidada mensual con soporte para datos fiscales.",
  },
  {
    q: "¿Puedo cancelar mi suscripción?",
    a: "Sí, puedes cancelar en cualquier momento desde Configuración → Plan. Al cancelar, mantienes acceso a las funciones del plan hasta el final del período facturado. Después, tu cuenta se convierte al plan Gratis sin perder tus proyectos.",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const annualSavings = (monthly: number, annual: number) => {
    if (monthly === 0) return 0;
    const totalMonthly = monthly * 12;
    return Math.round(((totalMonthly - annual) / totalMonthly) * 100);
  };

  return (
    <div className="pricing-page">
      <Header />

      <section className="pricing-hero">
        <div className="pricing-hero-badge">Precios simples, sin sorpresas</div>
        <h1>Elige el plan ideal para ti</h1>
        <p className="pricing-hero-sub">
          Desde el aficionado hasta el equipo enterprise. <br className="pricing-br" />
          Todos los planes incluyen el simulador completo sin limitaciones locales.
        </p>

        <div className="pricing-toggle-wrap">
          <div className="pricing-toggle">
            <span className={`pricing-toggle-label${!isAnnual ? " active" : ""}`}>Mensual</span>
            <button
              className={`toggle-switch${isAnnual ? " annual" : ""}`}
              onClick={() => setIsAnnual(!isAnnual)}
              role="switch"
              aria-checked={isAnnual}
            >
              <span className="toggle-knob" />
            </button>
            <span className={`pricing-toggle-label${isAnnual ? " active" : ""}`}>
              Anual
            </span>
          </div>
          {isAnnual && <span className="pricing-save-badge">Ahorra hasta 20%</span>}
        </div>
      </section>

      {/* ── Grid ── */}
      <div className="pricing-grid">
        {(["free", "pro", "team"] as PlanId[]).map((pid) => {
          const plan = PLANS[pid];
          const price = isAnnual ? plan.priceAnnual : plan.price;
          const period = isAnnual ? "/año" : "/mes";
          const icon = PLAN_ICONS[pid];
          const audience = PLAN_AUDIENCE[pid];
          const highlights = PLAN_HIGHLIGHTS[pid];

          return (
            <div key={pid} className={`pricing-card${plan.popular ? " popular" : ""}`}>
              {plan.badge && <span className="pricing-badge">{plan.badge}</span>}

              <div className="pricing-card-header">
                <div className="pricing-card-icon">{icon}</div>
                <h3 className="pricing-card-name">{plan.nameEs}</h3>
                <p className="pricing-card-audience">{audience}</p>
              </div>

              <div className="pricing-amount">
                {price === 0 ? (
                  <span className="pricing-free">Gratis</span>
                ) : (
                  <>
                    <span className="pricing-currency">$</span>
                    <span className="pricing-price">{price}</span>
                    <span className="pricing-period">{period}</span>
                  </>
                )}
              </div>

              {isAnnual && price > 0 && (
                <div className="pricing-monthly-equiv">
                  ${(price / 12).toFixed(2)}/mes —{" "}
                  <span className="pricing-save-pct">
                    ahorra {annualSavings(plan.price, plan.priceAnnual)}%
                  </span>
                </div>
              )}

              <p className="pricing-desc">{plan.descriptionEs}</p>

              <Link
                to={price === 0 ? "/simulator" : "#"}
                className={`pricing-btn${plan.popular ? " btn-primary" : ""}`}
              >
                {price === 0 ? "Empezar gratis" : `Suscribirse al plan ${plan.nameEs}`}
              </Link>

              <div className="pricing-highlights">
                <h4>Lo que incluye:</h4>
                <ul>
                  {highlights.map((h, i) => (
                    <li key={i}><FiCheck size={13} /> {h}</li>
                  ))}
                </ul>
              </div>

              <details className="pricing-all-features-toggle">
                <summary>Todas las características</summary>
                <ul className="pricing-all-features">
                  <li>
                    <span className="pricing-feat-label">Proyectos cloud</span>
                    <span className="pricing-feat-val">{plan.features.cloudProjects === "unlimited" ? "Ilimitados" : plan.features.cloudProjects}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Componentes</span>
                    <span className="pricing-feat-val">{plan.features.componentsPerProject === "unlimited" ? "Ilimitados" : `Hasta ${plan.features.componentsPerProject}`}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Colaboradores</span>
                    <span className="pricing-feat-val">{plan.features.collaborators === 0 ? "—" : `Hasta ${plan.features.collaborators}`}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Exportación PNG/SVG</span>
                    <span className="pricing-feat-val">{plan.features.exportWatermark ? "Con marca de agua" : "Sin marca"}{!plan.features.exportPNG && !plan.features.exportSVG ? " (—)" : ""}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Exportación PDF</span>
                    <span className="pricing-feat-val">{plan.features.exportPDF ? "✅" : "—"}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Editor VHDL</span>
                    <span className="pricing-feat-val">{plan.features.vhdlEditor ? "✅" : "—"}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Colaboración en tiempo real</span>
                    <span className="pricing-feat-val">{plan.features.realtimeCollab ? "✅" : "—"}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Integración GitHub</span>
                    <span className="pricing-feat-val">{plan.features.githubIntegration ? "✅" : "—"}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Integración GitLab</span>
                    <span className="pricing-feat-val">{plan.features.gitlabIntegration ? "✅" : "—"}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Almacenamiento cloud</span>
                    <span className="pricing-feat-val">{plan.features.cloudStorageMB >= 1024 ? `${(plan.features.cloudStorageMB / 1024).toFixed(0)} GB` : `${plan.features.cloudStorageMB} MB`}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">API REST</span>
                    <span className="pricing-feat-val">{plan.features.apiRequestsPerDay === 0 ? "—" : plan.features.apiRequestsPerDay === "unlimited" ? "Ilimitada" : `${plan.features.apiRequestsPerDay}/día`}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Historial de versiones</span>
                    <span className="pricing-feat-val">{plan.features.versionHistoryDays === 0 ? "—" : plan.features.versionHistoryDays >= 365 ? "1 año" : `${plan.features.versionHistoryDays} días`}</span>
                  </li>
                  <li>
                    <span className="pricing-feat-label">Soporte</span>
                    <span className="pricing-feat-val">{SUPPORT_LABELS[plan.features.supportLevel]}</span>
                  </li>
                  {plan.features.trialDays > 0 && (
                    <li className="pricing-feat-trial">
                      <FiStar size={12} /> {plan.features.trialDays} días de prueba gratis
                    </li>
                  )}
                </ul>
              </details>
            </div>
          );
        })}
      </div>

      {/* ── Enterprise CTA ── */}
      <section className="pricing-enterprise">
        <div className="pricing-enterprise-inner">
          <div className="pricing-enterprise-content">
            <h2>¿Necesitas un plan personalizado?</h2>
            <p>
              Si tu equipo requiere un plan con límites superiores, facturación consolidada,
              SLA personalizado o características específicas, tenemos una solución para ti.
            </p>
            <div className="pricing-enterprise-features">
              <div className="pricing-ent-feat"><FiUsers size={18} /><span>Colaboradores ilimitados</span></div>
              <div className="pricing-ent-feat"><FiServer size={18} /><span>On-premise disponible</span></div>
              <div className="pricing-ent-feat"><FiShield size={18} /><span>SLA 99.9%</span></div>
              <div className="pricing-ent-feat"><FiHeadphones size={18} /><span>Soporte dedicado 24/7</span></div>
            </div>
          </div>
          <a href="mailto:enterprise@logicflow.dev" className="btn-primary btn-lg">
            Contactar a ventas
          </a>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="pricing-comparison-section">
        <h2>Comparativa completa de funciones</h2>
        <p className="pricing-comparison-desc">
          Todos los detalles de cada plan para que elijas con confianza.
        </p>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Función</th>
                <th>Free</th>
                <th className="popular">Pro</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={i}>
                  <td className="comparison-feat-label">{row.label}</td>
                  <td className={row.free === "✅" ? "yes" : row.free === "—" ? "no" : ""}>{row.free}</td>
                  <td className={`${row.pro === "✅" ? "yes" : row.pro === "—" ? "no" : ""} popular`}>{row.pro}</td>
                  <td className={row.team === "✅" ? "yes" : row.team === "—" ? "no" : ""}>{row.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Features Showcase ── */}
      <section className="pricing-features-showcase">
        <h2>Todo lo que obtienes</h2>
        <p className="pricing-features-showcase-desc">
          Independientemente del plan que elijas, el simulador incluye estas capacidades.
        </p>
        <div className="pricing-showcase-grid">
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiCpu size={20} /></div>
            <h4>Simulador completo</h4>
            <p>Compuertas lógicas, flip-flops, buses, señales. El motor de simulación es el mismo en todos los planes.</p>
          </div>
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiBarChart2 size={20} /></div>
            <h4>Diagrama de tiempos</h4>
            <p>Visualiza señales en tiempo real con zoom, cursor de medición y exportación VCD/CSV.</p>
          </div>
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiCode size={20} /></div>
            <h4>Generación VHDL</h4>
            <p>Tu circuito se traduce automáticamente a VHDL sintetizable listo para FPGA.</p>
          </div>
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiShare2 size={20} /></div>
            <h4>Compartir por enlace</h4>
            <p>Comparte tu circuito con quien quieras mediante un enlace. Sin necesidad de cuenta.</p>
          </div>
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiDownload size={20} /></div>
            <h4>Exportación múltiple</h4>
            <p>Exporta como PNG, SVG, JSON, VCD, CSV o PDF. Integra con GTKWave y otras herramientas.</p>
          </div>
          <div className="pricing-showcase-card">
            <div className="pricing-showcase-icon"><FiSave size={20} /></div>
            <h4>Guardado local</h4>
            <p>Tus proyectos se guardan automáticamente en el navegador. Sin conexión, sin preocupaciones.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pricing-faq">
        <h2>Preguntas frecuentes</h2>
        <p className="pricing-faq-desc">
          Respuestas a las dudas más comunes sobre nuestros planes y facturación.
        </p>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <details key={i} className="faq-item">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

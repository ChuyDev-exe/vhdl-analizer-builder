import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCpu, FiCode, FiBarChart2, FiShare2, FiZap,
  FiChevronRight, FiCheck, FiGithub, FiArrowRight,
  FiPlay, FiLayers, FiStar, FiMessageSquare, FiUser,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { PLANS } from "../../services/subscriptions";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import "../../styles.css";
import "./Landing.css";

const FEATURES = [
  { icon: FiCpu, title: "Editor de Circuitos", desc: "Arrastra y suelta compuertas lógicas, flip-flops, registros y buses en un lienzo interactivo. Simulación en tiempo real con 4 estados (0, 1, Z, X)." },
  { icon: FiCode, title: "VHDL Bidireccional", desc: "Genera código VHDL desde tu diagrama o construye el circuito escribiendo VHDL. Sincronización automática en ambas direcciones." },
  { icon: FiBarChart2, title: "Diagrama de Tiempos", desc: "Visualiza las señales del circuito en un波形 interactivo. Exporta a VCD para usar con GTKWave u otros visores." },
  { icon: FiZap, title: "Modo Retardo", desc: "Simulación paso a paso con propagación de retardos. Visualiza glitches y condiciones de carrera en tu circuito." },
  { icon: FiShare2, title: "Compartir por URL", desc: "Comparte tu circuito con solo un enlace. El receptor ve exactamente el mismo diagrama y librería de componentes." },
  { icon: FiLayers, title: "Componentes Personalizados", desc: "Crea tus propios componentes a partir de subcircuitos o expresiones booleanas. Construye librerías reutilizables." },
];

const FAQ = [
  { q: "¿Qué es LogicFlow?", a: "Es una herramienta web gratuita para diseñar, simular y exportar circuitos lógicos. Soporta compuertas, flip-flops, registros, buses, y generación bidireccional de VHDL." },
  { q: "¿Necesito crear una cuenta?", a: "No. Puedes usar el simulador sin registro. Crear una cuenta te permite guardar proyectos en la nube, colaborar y acceder a funciones avanzadas." },
  { q: "¿Qué es VHDL y para qué sirve?", a: "VHDL es un lenguaje de descripción de hardware. Puedes diseñar tu circuito visualmente y exportarlo a VHDL para sintetizarlo en una FPGA, o escribir VHDL y convertirlo automáticamente a diagrama." },
  { q: "¿Puedo compartir mis circuitos?", a: "Sí. Cada circuito se puede compartir mediante un enlace único. En los planes Pro y superiores puedes compartir con permisos de edición y colaborar en tiempo real." },
  { q: "¿Qué planes de pago ofrecen?", a: "Ofrecemos planes Free, Estudiante, Pro, Pro Max y Team. El plan Free es completamente funcional para uso individual. Los planes de pago añaden almacenamiento cloud, colaboración y exportación sin marca de agua." },
  { q: "¿Cómo funciona la exportación?", a: "Puedes exportar tu circuito como VHDL, VCD (trazas de simulación), JSON (proyecto completo), CSV, SVG, PNG y PDF. Los planes gratuitos incluyen marca de agua en PNG/SVG." },
];

const TESTIMONIALS = [
  { name: "Carlos M.", role: "Estudiante de Ingeniería", text: "Increíble herramienta para aprender circuitos lógicos. La sincronización VHDL me ayudó a entender cómo funciona realmente el hardware.", avatar: "CM" },
  { name: "Ana G.", role: "Profesora Universitaria", text: "Lo uso en mis clases de diseño digital. Mis estudiantes pasaron de tener miedo al VHDL a diseñar sus propios circuitos en una semana.", avatar: "AG" },
  { name: "Luis R.", role: "Ingeniero FPGA", text: "Para prototipado rápido es perfecto. Genero el VHDL base en minutos y luego lo refino para síntesis. Me ha ahorrado horas.", avatar: "LR" },
];

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={`reveal${visible ? " visible" : ""}${className ? " " + className : ""}`}>
      {children}
    </div>
  );
}

function PricingCard({ planId, isAnnual }: { planId: string; isAnnual: boolean }) {
  const plan = PLANS[planId as keyof typeof PLANS];
  if (!plan) return null;
  const price = isAnnual ? plan.priceAnnual : plan.price;
  const period = isAnnual ? "/año" : "/mes";
  const features = [
    { label: `Proyectos cloud: ${plan.features.cloudProjects === "unlimited" ? "Ilimitados" : plan.features.cloudProjects}`, included: true },
    { label: `Componentes: ${plan.features.componentsPerProject === "unlimited" ? "Ilimitados" : plan.features.componentsPerProject}` },
    { label: `Colaboradores: ${plan.features.collaborators === 0 ? "—" : plan.features.collaborators === ("unlimited" as any) ? "Ilimitados" : plan.features.collaborators}`, included: plan.features.collaborators > 0 },
    { label: `Historial: ${plan.features.versionHistoryDays === 0 ? "—" : plan.features.versionHistoryDays + " días"}`, included: plan.features.versionHistoryDays > 0 },
    { label: "Compartir (solo lectura)", included: plan.features.shareLinkView },
    { label: "Compartir (edición)", included: plan.features.shareLinkEdit },
    { label: "Exportar sin marca", included: !plan.features.exportWatermark },
    { label: "Exportar PDF", included: plan.features.exportPDF },
    { label: "Editor VHDL avanzado", included: plan.features.vhdlEditor },
    { label: "Colaboración en tiempo real", included: plan.features.realtimeCollab },
    { label: `Almacenamiento: ${plan.features.cloudStorageMB >= 1024 ? (plan.features.cloudStorageMB / 1024).toFixed(0) + " GB" : plan.features.cloudStorageMB + " MB"}`, included: true },
  ];

  return (
    <div className={`pricing-card${plan.popular ? " popular" : ""}`}>
      {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
      <h3 className="pricing-name">{plan.nameEs || plan.name}</h3>
      <div className="pricing-amount">
        {price === 0 ? (
          <span className="pricing-free">Gratis</span>
        ) : (
          <><span className="pricing-currency">$</span><span className="pricing-price">{price}</span><span className="pricing-period">{period}</span></>
        )}
      </div>
      <p className="pricing-desc">{plan.descriptionEs || plan.description}</p>
      <Link to={price === 0 ? "/simulator" : "/pricing"} className={`pricing-btn${plan.popular ? " btn-primary" : ""}`}>
        {price === 0 ? "Empezar gratis" : `Contratar ${plan.nameEs}`}
      </Link>
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i} className={f.included === false ? "missing" : ""}>
            <FiCheck size={14} /><span>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DemoBanner() {
  const navigate = useNavigate();
  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <span className="demo-badge">DEMO</span>
        <span className="demo-banner-text">Circuito de ejemplo: Contador síncrono de 4 bits</span>
        <button className="demo-btn" onClick={() => navigate("/simulator")}>
          <FiPlay size={14} /> Probar ahora
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, signInWithGithub } = useAuth();
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoTab, setDemoTab] = useState<"circuit" | "wave" | "code">("circuit");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="landing-loader">
        <div className="loader-center">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none" className="loader-icon">
            <rect x="1.5" y="1.5" width="25" height="25" rx="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
            <path d="M5 18 5 10 11 10 11 18 17 18 17 10 23 10 23 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="5" cy="18" r="1.2" fill="currentColor" />
            <circle cx="23" cy="18" r="1.2" fill="currentColor" />
            <line x1="1.5" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="1.5" y1="20" x2="4" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="24" y1="11" x2="26.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="24" y1="17" x2="26.5" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <p className="loader-text">Cargando LogicFlow…</p>
        </div>
      </div>
    );
  }

  const openLogin = () => {
    const event = new CustomEvent("open-login");
    window.dispatchEvent(event);
  };

  return (
    <div className="landing">
      <Header transparent />
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
        </div>
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-badge">
            <FiZap size={14} />
            Simulación en tiempo real
          </div>
          <h1 className="hero-title">
            Diseña, simula y exporta
            <br />
            <span className="hero-highlight">circuitos lógicos</span>
          </h1>
          <p className="hero-desc">
            Editor visual de circuitos con VHDL bidireccional, diagrama de tiempos,
            simulación de 4 estados y componentes personalizados. Todo en el navegador.
          </p>
          <div className="hero-actions">
            <button className="btn-primary btn-lg hero-cta" onClick={() => navigate("/simulator")}>
              <FiPlay size={18} />
              Probar ahora
              <FiArrowRight size={18} />
            </button>
            <button className="btn-ghost btn-lg" onClick={openLogin}>
              <FiUser size={18} /> Iniciar sesión
            </button>
            <button className="btn-ghost btn-lg" onClick={signInWithGithub}>
              <FiGithub size={18} /> GitHub
            </button>
          </div>
          <div className="hero-login-banner">
            <span>¿Ya tienes cuenta?</span>
            <button className="link-btn" onClick={openLogin}>Inicia sesión</button>
            <span className="hero-login-sep">·</span>
            <Link to="/get-started" className="link-btn">Primeros pasos</Link>
            <span className="hero-login-sep">·</span>
            <Link to="/docs" className="link-btn">Documentación</Link>
          </div>
          <div className="hero-stats">
            <span><strong>4</strong> estados de simulación</span>
            <span><strong>50+</strong> componentes</span>
            <span><strong>VHDL</strong> bidireccional</span>
            <span><strong>100%</strong> gratuito</span>
          </div>
        </div>
      </section>

      <DemoBanner />

      <AnimatedSection>
        <section className="features" id="features">
          <h2 className="section-title">Todo lo que necesitas para diseñar circuitos</h2>
          <p className="section-desc">Desde compuertas básicas hasta sistemas secuenciales complejos</p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon"><f.icon size={24} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section className="demo-section" id="demo">
          <h2 className="section-title">Pruébalo sin registro</h2>
          <p className="section-desc">
            Sin descargas, sin tarjetas. Abre el simulador y crea tu primer circuito en segundos.
          </p>

          <div className="demo-tabs">
            <button
              className={`demo-tab${demoTab === "circuit" ? " active" : ""}`}
              onClick={() => setDemoTab("circuit")}
            >
              <FiCpu size={14} /> Circuito
            </button>
            <button
              className={`demo-tab${demoTab === "wave" ? " active" : ""}`}
              onClick={() => setDemoTab("wave")}
            >
              <FiBarChart2 size={14} /> Señales
            </button>
            <button
              className={`demo-tab${demoTab === "code" ? " active" : ""}`}
              onClick={() => setDemoTab("code")}
            >
              <FiCode size={14} /> Código VHDL
            </button>
          </div>

          {demoTab === "circuit" && (
            <div className="demo-card">
              <div className="demo-card-header">
                <div className="demo-dots"><span /><span /><span /></div>
                <span className="demo-card-title">Contador síncrono de 4 bits</span>
                <span className="demo-card-badge">En vivo</span>
              </div>
              <div className="demo-circuit-body">
                <svg viewBox="0 0 700 300" className="demo-svg">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0,0 L10,5 L0,10 Z" fill="var(--on)" opacity="0.6"/>
                    </marker>
                    <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--on)" stopOpacity="0">
                        <animate attributeName="offset" values="0;1" dur="2s" repeatCount="indefinite"/>
                      </stop>
                      <stop offset="100%" stopColor="var(--on)" stopOpacity="0.6">
                        <animate attributeName="offset" values="0;1" dur="2s" repeatCount="indefinite"/>
                      </stop>
                    </linearGradient>
                  </defs>

                  {/* Clock */}
                  <rect x="20" y="100" width="90" height="70" rx="8" fill="var(--panel-2)" stroke="var(--border)" strokeWidth="1.5"/>
                  <text x="65" y="140" textAnchor="middle" fill="var(--on)" fontSize="12" fontWeight="600">CLOCK</text>
                  <text x="65" y="155" textAnchor="middle" fill="var(--muted)" fontSize="9">1 kHz</text>
                  <circle cx="110" cy="135" r="4" fill="var(--on)">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
                  </circle>

                  {/* Arrow */}
                  <line x1="114" y1="135" x2="170" y2="135" stroke="var(--on)" strokeWidth="2" opacity="0.5"/>
                  <polygon points="168,130 178,135 168,140" fill="var(--on)" opacity="0.5"/>

                  {/* Counter */}
                  <rect x="180" y="80" width="120" height="110" rx="8" fill="var(--panel-2)" stroke="var(--on)" strokeWidth="1.5"/>
                  <text x="240" y="118" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="600">CONTADOR</text>
                  <text x="240" y="133" textAnchor="middle" fill="var(--muted)" fontSize="10">4 bits síncrono</text>
                  <text x="240" y="148" textAnchor="middle" fill="var(--on)" fontSize="11">Q₃ Q₂ Q₁ Q₀</text>

                  {/* 4 arrows from counter to decoder */}
                  <line x1="300" y1="100" x2="370" y2="100" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <line x1="300" y1="115" x2="370" y2="115" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <line x1="300" y1="130" x2="370" y2="130" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <line x1="300" y1="145" x2="370" y2="145" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="300" cy="100" r="3" fill="currentColor" opacity="0.3"/>
                  <circle cx="300" cy="115" r="3" fill="currentColor" opacity="0.3"/>
                  <circle cx="300" cy="130" r="3" fill="currentColor" opacity="0.3"/>
                  <circle cx="300" cy="145" r="3" fill="currentColor" opacity="0.3"/>

                  {/* Decoder */}
                  <rect x="380" y="80" width="110" height="110" rx="8" fill="var(--panel-2)" stroke="var(--border)" strokeWidth="1.5"/>
                  <text x="435" y="118" textAnchor="middle" fill="var(--text)" fontSize="11" fontWeight="600">DECODER</text>
                  <text x="435" y="133" textAnchor="middle" fill="var(--muted)" fontSize="9">BIN → 7SEG</text>
                  <text x="435" y="150" textAnchor="middle" fill="var(--bus-accent)" fontSize="10">a b c d e f g</text>

                  {/* Bus arrow */}
                  <line x1="490" y1="135" x2="550" y2="135" stroke="var(--bus-accent)" strokeWidth="2.5" opacity="0.5"/>
                  <polygon points="548,129 558,135 548,141" fill="var(--bus-accent)" opacity="0.5"/>

                  {/* Display */}
                  <rect x="560" y="60" width="110" height="150" rx="8" fill="var(--panel-2)" stroke="var(--border)" strokeWidth="1.5"/>
                  <text x="615" y="100" textAnchor="middle" fill="var(--text)" fontSize="12" fontWeight="600">DISPLAY</text>
                  <text x="615" y="115" textAnchor="middle" fill="var(--muted)" fontSize="9">7 Segmentos</text>
                  {/* 7-seg shape */}
                  <g transform="translate(585, 125)" stroke="var(--on)" strokeWidth="2.5" fill="none">
                    <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>
                    <polyline points="8,0 32,0 38,6"/>
                    <polyline points="38,6 32,12 8,12 2,6 8,0"/>
                    <line x1="38" y1="6" x2="42" y2="6"/>
                    <line x1="38" y1="6" x2="38" y2="18"/>
                    <line x1="2" y1="6" x2="2" y2="18"/>
                    <line x1="2" y1="18" x2="8" y2="24"/>
                    <line x1="38" y1="18" x2="32" y2="24"/>
                    <line x1="8" y1="24" x2="32" y2="24"/>
                  </g>

                  {/* Labels */}
                  <text x="65" y="195" textAnchor="middle" fill="var(--muted)" fontSize="9">Clock</text>
                  <text x="240" y="210" textAnchor="middle" fill="var(--muted)" fontSize="9">Q₀–Q₃</text>
                  <text x="435" y="210" textAnchor="middle" fill="var(--bus-accent)" fontSize="9">a–g</text>
                  <text x="615" y="225" textAnchor="middle" fill="var(--muted)" fontSize="9">Display</text>

                  {/* Flow arrows */}
                  <g fill="var(--muted)" opacity="0.3">
                    <text x="140" y="130" fontSize="9" textAnchor="middle">→</text>
                    <text x="345" y="160" fontSize="9" textAnchor="middle">→</text>
                    <text x="525" y="130" fontSize="9" textAnchor="middle">→</text>
                  </g>
                </svg>
              </div>
            </div>
          )}

          {demoTab === "wave" && (
            <div className="demo-card">
              <div className="demo-card-header">
                <div className="demo-dots"><span /><span /><span /></div>
                <span className="demo-card-title">Diagrama de tiempos</span>
                <span className="demo-card-badge">Simulación</span>
              </div>
              <div className="demo-wave-body">
                <div className="demo-wave-controls">
                  <span className="demo-wave-ctl active">▶</span>
                  <span className="demo-wave-ctl">⏸</span>
                  <span className="demo-wave-ctl">⟳</span>
                  <span className="demo-wave-zoom">1x</span>
                </div>
                <svg viewBox="0 0 680 160" className="demo-wave-svg">
                  {/* Grid */}
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
                    <line key={t} x1={t * 85 + 50} y1="10" x2={t * 85 + 50} y2="150" stroke="var(--border)" strokeWidth="0.5" />
                  ))}
                  <line x1="0" y1="150" x2="680" y2="150" stroke="var(--border)" strokeWidth="1" />

                  {/* Labels */}
                  {[
                    { y: 30, label: "CLK" },
                    { y: 55, label: "Q₀" },
                    { y: 80, label: "Q₁" },
                    { y: 105, label: "Q₂" },
                    { y: 130, label: "Q₃" },
                  ].map(({ y, label }) => (
                    <text key={label} x="12" y={y + 3} fill="var(--muted)" fontSize="10" fontFamily="monospace">{label}</text>
                  ))}

                  {/* CLK wave */}
                  <polyline points="50,26 50,14 93,14 93,26 135,26 135,14 178,14 178,26 220,26 220,14 263,14 263,26 305,26 305,14 348,14 348,26 390,26 390,14 433,14 433,26 475,26 475,14 518,14 518,26 560,26 560,14 603,14 603,26 645,26 645,14" fill="none" stroke="var(--on)" strokeWidth="1.5"/>

                  {/* Q0 toggles every cycle */}
                  <polyline points="50,51 93,51 93,39 135,39 135,51 178,51 178,39 220,39 220,51 263,51 263,39 305,39 305,51 348,51 348,39 390,39 390,51 433,51 433,39 475,39 475,51 518,51 518,39 560,39 560,51 603,51 603,39 645,39 645,51" fill="none" stroke="var(--text)" strokeWidth="1.5"/>

                  {/* Q1 toggles every 2 cycles */}
                  <polyline points="50,76 135,76 135,64 178,64 178,76 263,76 263,64 305,64 305,76 390,76 390,64 433,64 433,76 518,76 518,64 560,64 560,76 645,76 645,64" fill="none" stroke="var(--text)" strokeWidth="1.5"/>

                  {/* Q2 toggles every 4 cycles */}
                  <polyline points="50,101 220,101 220,89 263,89 263,101 433,101 433,89 475,89 475,101 645,101 645,89" fill="none" stroke="var(--text)" strokeWidth="1.5"/>

                  {/* Q3 toggles every 8 cycles */}
                  <polyline points="50,126 390,126 390,114 433,114 433,126 645,126 645,114" fill="none" stroke="var(--text)" strokeWidth="1.5"/>

                  {/* Cursor */}
                  <line x1="390" y1="10" x2="390" y2="150" stroke="var(--danger)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6"/>
                  <rect x="380" y="152" width="20" height="14" rx="2" fill="var(--danger)" opacity="0.8"/>
                  <text x="390" y="162" textAnchor="middle" fill="#fff" fontSize="8" fontFamily="monospace">t₄</text>
                </svg>
              </div>
            </div>
          )}

          {demoTab === "code" && (
            <div className="demo-card">
              <div className="demo-card-header">
                <div className="demo-dots"><span /><span /><span /></div>
                <span className="demo-card-title">contador_sincrono.vhd</span>
                <span className="demo-card-badge">Generado</span>
              </div>
              <div className="demo-code-body">
                <div className="demo-code-lines">
                  {[
                    { n: 1, t: "library IEEE;" },
                    { n: 2, t: "use IEEE.std_logic_1164.all;" },
                    { n: 3, t: "use IEEE.numeric_std.all;" },
                    { n: 4, t: "" },
                    { n: 5, t: "entity contador_sincrono is" },
                    { n: 6, t: "  port (" },
                    { n: 7, t: "    clk : in  std_logic;", h: true },
                    { n: 8, t: "    rst : in  std_logic;", h: true },
                    { n: 9, t: "    q   : out std_logic_vector(3 downto 0)" },
                    { n: 10, t: "  );" },
                    { n: 11, t: "end entity;" },
                    { n: 12, t: "" },
                    { n: 13, t: "architecture rtl of contador_sincrono is" },
                    { n: 14, t: "  signal count : unsigned(3 downto 0);" },
                    { n: 15, t: "begin" },
                    { n: 16, t: "  process(clk, rst)" },
                    { n: 17, t: "  begin" },
                    { n: 18, t: "    if rst = '1' then" },
                    { n: 19, t: "      count <= (others => '0');" },
                    { n: 20, t: "    elsif rising_edge(clk) then" },
                    { n: 21, t: "      count <= count + 1;" },
                    { n: 22, t: "    end if;" },
                    { n: 23, t: "  end process;" },
                    { n: 24, t: "" },
                    { n: 25, t: "  q <= std_logic_vector(count);" },
                    { n: 26, t: "end architecture;" },
                  ].map((line) => (
                    <div key={line.n} className={`demo-code-line${line.h ? " highlight" : ""}`}>
                      <span className="demo-code-num">{String(line.n).padStart(3)}</span>
                      <span className="demo-code-text">{line.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="demo-cta">
            <div className="demo-cta-stats">
              <div className="demo-stat">
                <span className="demo-stat-num">0</span>
                <span className="demo-stat-label">Registro</span>
              </div>
              <div className="demo-stat-divider" />
              <div className="demo-stat">
                <span className="demo-stat-num">0</span>
                <span className="demo-stat-label">Descarga</span>
              </div>
              <div className="demo-stat-divider" />
              <div className="demo-stat">
                <span className="demo-stat-num">2 min</span>
                <span className="demo-stat-label">Primer circuito</span>
              </div>
            </div>
            <Link to="/simulator" className="btn-primary btn-lg">
              <FiPlay size={18} /> Probar simulador ahora
            </Link>
          </div>
        </section>
      </AnimatedSection>

      {/* Testimonios deshabilitado por ahora */}

      <AnimatedSection>
        <section className="pricing" id="pricing">
          <h2 className="section-title">Planes para todos los niveles</h2>
          <p className="section-desc">Desde aficionados hasta equipos enterprise</p>
          <div className="pricing-toggle">
            <span className={!isAnnual ? "active" : ""}>Mensual</span>
            <button className={`toggle-switch${isAnnual ? " annual" : ""}`} onClick={() => setIsAnnual(!isAnnual)} role="switch" aria-checked={isAnnual}>
              <span className="toggle-knob" />
            </button>
            <span className={isAnnual ? "active" : ""}>Anual <span className="toggle-discount">-20%</span></span>
          </div>
          <div className="pricing-grid">
            {["free", "pro", "team"].map((pid) => (
              <PricingCard key={pid} planId={pid} isAnnual={isAnnual} />
            ))}
          </div>
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section className="faq" id="faq">
          <h2 className="section-title">Preguntas frecuentes</h2>
          <div className="faq-list">
            {FAQ.map((item, i) => (
              <div key={i} className={`faq-item${openFaq === i ? " open" : ""}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <FiChevronRight size={18} className="faq-arrow" />
                </button>
                <div className="faq-answer"><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-orb" />
        </div>
        <div className="cta-content">
          <h2>Empieza a simular ahora</h2>
          <p>Sin registro, sin tarjeta de crédito. Todo funciona en el navegador.</p>
          <div className="cta-actions">
            <button className="btn-primary btn-lg" onClick={() => navigate("/simulator")}>
              <FiPlay size={18} /> Probar simulador
            </button>
            <button className="btn-ghost btn-lg" onClick={signInWithGithub}>
              <FiGithub size={18} /> GitHub
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

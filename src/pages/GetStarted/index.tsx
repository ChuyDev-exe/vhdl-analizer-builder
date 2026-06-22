import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPlay, FiArrowRight, FiCopy, FiCheck, FiTerminal, FiExternalLink, FiChevronRight } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import "../../styles.css";
import "./GetStarted.css";

interface CodeBlock {
  lang: string;
  code: string;
}

interface Step {
  num: number;
  title: string;
  desc: string;
  code?: CodeBlock;
  tip?: string;
  action?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    num: 1,
    title: "Abre el simulador",
    desc: "Haz clic en 'Probar ahora' para abrir el simulador. No necesitas registro ni descarga, todo funciona directamente en el navegador.",
    code: {
      lang: "bash",
      code: "# No hay nada que instalar\n# Solo abre el navegador y visita:\nhttps://logicflow.dev/simulator",
    },
    action: { label: "Abrir simulador", to: "/simulator" },
  },
  {
    num: 2,
    title: "Arrastra componentes al lienzo",
    desc: "Del panel izquierdo (la paleta), arrastra compuertas lógicas, entradas y salidas. Cada componente tiene conectores en sus bordes.",
    code: {
      lang: "texto",
      code: "Componentes disponibles:\n├─ Entradas: INPUT, CLOCK\n├─ Compuertas: AND, OR, NOT, NAND, NOR, XOR, XNOR\n├─ Flip-Flops: D, JK, T, SR\n├─ Salidas: OUTPUT, LED\n└─ Buses: BUSIN, BUSOUT, MERGE, SPLIT",
    },
    tip: "Usa INPUT para bits individuales, CLOCK para señales periódicas y BUS para grupos de señales de varios bits.",
  },
  {
    num: 3,
    title: "Conecta los componentes",
    desc: "Haz clic en un conector (círculo en el borde) y arrastra hasta otro conector para crear una conexión. Las conexiones se muestran como líneas en el lienzo.",
    code: {
      lang: "vhdl",
      code: "-- Esto es lo que genera el simulador automáticamente\n-- cuando conectas una compuerta AND:\n\nand_1: entity work.and_gate\n  port map (\n    a => input_1,\n    b => input_2,\n    y => output_1\n  );",
    },
    tip: "Puedes seleccionar conexiones y eliminarlas con la tecla Supr. Usa Shift+clic para seleccionar múltiples elementos.",
  },
  {
    num: 4,
    title: "Ejecuta la simulación",
    desc: "Presiona el botón ▶ Run para iniciar la simulación en tiempo real. Haz clic sobre las entradas (INPUT) para alternar entre 0 y 1. El circuito se actualiza instantáneamente.",
    code: {
      lang: "texto",
      code: "Estados de simulación:\n  0  → Lógica baja (0V)\n  1  → Lógica alta (5V/3.3V)\n  Z  → Alta impedancia (desconectado)\n  X  → Conflicto (valor desconocido)\n\nAtajos:\n  Space  → Iniciar/Detener simulación\n  ← →   → Paso a paso\n  R      → Reset",
    },
    action: { label: "Ver funciones de simulación", to: "/docs" },
  },
  {
    num: 5,
    title: "Visualiza las señales",
    desc: "Abre el Diagrama de Tiempos desde el menú View → Waveform. Aquí puedes ver cómo evolucionan todas las señales del circuito ciclo a ciclo.",
    code: {
      lang: "texto",
      code: "Panel de waveform:\n  ├─ Cada señal en una fila\n  ├─ Zoom con el slider o rueda del ratón\n  ├─ Haz clic en una señal para renombrarla\n  └─ Exporta a VCD para GTKWave\n      o a CSV para hoja de cálculo",
    },
    tip: "El modo Retardo (botón ⚡) te permite ver la propagación de señales paso a paso, ideal para detectar glitches y condiciones de carrera.",
  },
  {
    num: 6,
    title: "Exporta o comparte tu circuito",
    desc: "Puedes exportar tu diseño en múltiples formatos o compartirlo con un enlace. El VHDL generado es apto para síntesis en FPGA.",
    code: {
      lang: "bash",
      code: "# Formatos de exportación:\n# VHDL  →  diseño.vhd    (para síntesis FPGA)\n# JSON  →  proyecto.json  (copia de seguridad)\n# VCD   →  ondas.vcd      (trazas de simulación)\n# SVG   →  diagrama.svg   (vectorial)\n# PNG   →  diagrama.png   (imagen)\n# PDF   →  reporte.pdf    (documentación)",
    },
    action: { label: "Ver todas las opciones de exportación", to: "/docs" },
  },
];

function CodeBlock({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="gs-code-block">
      <div className="gs-code-header">
        <span className="gs-code-lang">
          <FiTerminal size={12} /> {block.lang}
        </span>
        <button className="gs-code-copy" onClick={copy}>
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="gs-code-content"><code>{block.code}</code></pre>
    </div>
  );
}

function StepCard({ step, isActive }: { step: Step; isActive: boolean }) {
  return (
    <div id={`step-${step.num}`} className={`gs-step${isActive ? " active" : ""}`}>
      <div className="gs-step-head">
        <span className="gs-step-num">{step.num}</span>
        <h2 className="gs-step-title">{step.title}</h2>
      </div>
      <p className="gs-step-desc">{step.desc}</p>
      {step.code && <CodeBlock block={step.code} />}
      {step.tip && (
        <div className="gs-tip">
          <strong>Tip</strong>
          <p>{step.tip}</p>
        </div>
      )}
      {step.action && (
        <Link to={step.action.to} className="gs-step-link">
          {step.action.label} <FiArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function GetStartedPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const num = Number(entry.target.getAttribute("data-step"));
            if (num) setActiveStep(num);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );

    stepRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (num: number) => {
    const el = stepRefs.current[num - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="gs-page">
      <Header />

      <div className="gs-layout">
        <aside className="gs-sidebar">
          <div className="gs-sidebar-sticky">
            <h3 className="gs-sidebar-title">En esta página</h3>
            <nav className="gs-sidebar-nav">
              {STEPS.map((step) => (
                <button
                  key={step.num}
                  className={`gs-sidebar-link${activeStep === step.num ? " active" : ""}`}
                  onClick={() => scrollTo(step.num)}
                >
                  <span className="gs-sidebar-num">{step.num}</span>
                  {step.title}
                </button>
              ))}
            </nav>
            <div className="gs-sidebar-cta">
              <button className="btn-primary" onClick={() => navigate("/simulator")} style={{ width: "100%", justifyContent: "center" }}>
                <FiPlay size={14} /> Abrir simulador
              </button>
            </div>
          </div>
        </aside>

        <main className="gs-main">
          <header className="gs-main-header">
            <h1>Primeros pasos</h1>
            <p className="gs-main-desc">
              Aprende a usar LogicFlow en 5 minutos.
              Sigue estos pasos para crear tu primer circuito.
            </p>
            <div className="gs-main-meta">
              <span className="gs-meta-badge">Guía rápida</span>
              <span className="gs-meta-time">6 pasos · 5 min</span>
            </div>
          </header>

          <div className="gs-steps">
            {STEPS.map((step, i) => (
              <div key={step.num} ref={(el) => { stepRefs.current[i] = el; }} data-step={step.num}>
                <StepCard step={step} isActive={activeStep === step.num} />
                {i < STEPS.length - 1 && <div className="gs-step-divider" />}
              </div>
            ))}
          </div>

          <section className="gs-next">
            <h2>¿Listo para más?</h2>
            <div className="gs-next-grid">
              <Link to="/docs" className="gs-next-card">
                <h3>Documentación completa</h3>
                <p>Todos los detalles sobre componentes, VHDL, simulación y exportación.</p>
                <span className="gs-next-link">Ver docs <FiArrowRight size={14} /></span>
              </Link>
              <Link to="/simulator" className="gs-next-card">
                <h3>Abrir el simulador</h3>
                <p>Empieza a diseñar tu circuito ahora mismo, sin registro.</p>
                <span className="gs-next-link">Ir al simulador <FiArrowRight size={14} /></span>
              </Link>
              <Link to="/blog" className="gs-next-card">
                <h3>Tutoriales y ejemplos</h3>
                <p>Circuitos de ejemplo, guías paso a paso y casos de uso reales.</p>
                <span className="gs-next-link">Ver blog <FiArrowRight size={14} /></span>
              </Link>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}

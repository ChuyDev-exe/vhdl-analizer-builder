import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCpu, FiClock, FiShare2, FiZap, FiLayers, FiCode, FiPlus } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { getTemplates, saveProject, type Template } from "../../projects";
import "../../styles.css";
import "./Examples.css";

const tagIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  secuencial: FiClock,
  combinacional: FiZap,
  aritmética: FiCpu,
  contador: FiClock,
  registro: FiLayers,
  sumador: FiPlus,
  mux: FiShare2,
  decoder: FiCode,
  ff: FiCpu,
  fsm: FiZap,
  detector: FiZap,
  divisor: FiClock,
  bcd: FiCpu,
  sipo: FiLayers,
  alu: FiCpu,
};

const TAG_ORDER = ["combinacional", "secuencial", "aritmética"];

export default function ExamplesPage() {
  const templates = getTemplates();
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const allTags = [...new Set(templates.flatMap((t) => t.tags))].sort(
    (a, b) => {
      const ia = TAG_ORDER.indexOf(a);
      const ib = TAG_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }
  );

  const filtered = filter === "all" ? templates : templates.filter((t) => t.tags.includes(filter));

  const openTemplate = (tmpl: Template) => {
    const data = tmpl.build();
    saveProject(tmpl.name, data);
    navigate(`/simulator?proj=${encodeURIComponent(tmpl.name)}`);
  };

  return (
    <div className="examples-page">
      <MetaTags
        title="Circuitos de ejemplo · LogicFlow"
        description="Explora circuitos lógicos de ejemplo listos para simular y modificar."
        url="https://logicflow.dev/examples"
      />
      <Header />

      <section className="examples-hero">
        <div className="examples-hero-bg" />
        <h1>Circuitos de ejemplo</h1>
        <p>Explora, aprende y modifica. Todos los circuitos se abren directamente en el simulador.</p>
      </section>

      <div className="examples-tags">
        <button
          className={`examples-tag-btn${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        {allTags.map((tag) => {
          const TagIcon = tagIcons[tag];
          return (
            <button
              key={tag}
              className={`examples-tag-btn${filter === tag ? " active" : ""}`}
              onClick={() => setFilter(tag)}
            >
              {TagIcon && <TagIcon size={13} />}
              {tag}
            </button>
          );
        })}
      </div>

      <div className="examples-grid">
        {filtered.map((tmpl) => {
          const primaryTag = tmpl.tags.find((t) => TAG_ORDER.includes(t)) || tmpl.tags[0];
          const TagIcon = tagIcons[primaryTag] || FiCpu;
          return (
            <button key={tmpl.name} className="examples-card" onClick={() => openTemplate(tmpl)}>
              <div className="examples-card-header">
                <div className="examples-card-icon"><TagIcon size={20} /></div>
                <div className="examples-card-tags">
                  {tmpl.tags.slice(0, 3).map((t) => (
                    <span key={t} className="examples-card-tag">{t}</span>
                  ))}
                </div>
              </div>
              <h3 className="examples-card-name">{tmpl.name}</h3>
              <p className="examples-card-desc">{tmpl.desc}</p>
              <span className="examples-card-action">
                Abrir en simulador <FiZap size={13} />
              </span>
            </button>
          );
        })}
      </div>

      <Footer />
    </div>
  );
}

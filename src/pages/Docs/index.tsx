import { Link } from "react-router-dom";
import { FiChevronRight, FiCpu, FiCode, FiBarChart2, FiShare2, FiZap, FiLayers, FiBook, FiPlay, FiGrid } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { useI18n } from "../../i18n";
import "../../styles.css";
import "./Docs.css";

interface DocSection {
  icon: React.ComponentType<{ size?: number }>;
  titleKey: string;
  descKey: string;
  items?: string[];
  link?: string;
  linkKey?: string;
}

const SECTIONS: DocSection[] = [
  { icon: FiPlay, titleKey: "docs.section.getting_started", descKey: "docs.section.getting_started.desc", link: "/get-started", linkKey: "docs.link.getting_started" },
  { icon: FiGrid, titleKey: "docs.section.examples", descKey: "docs.section.examples.desc", link: "/examples", linkKey: "docs.link.examples" },
  {
    icon: FiCpu, titleKey: "docs.section.editor", descKey: "docs.section.editor.desc",
    items: ["docs.section.editor.item1", "docs.section.editor.item2", "docs.section.editor.item3", "docs.section.editor.item4"],
  },
  {
    icon: FiCode, titleKey: "docs.section.vhdl", descKey: "docs.section.vhdl.desc",
    items: ["docs.section.vhdl.item1", "docs.section.vhdl.item2", "docs.section.vhdl.item3", "docs.section.vhdl.item4"],
  },
  {
    icon: FiBarChart2, titleKey: "docs.section.waveform", descKey: "docs.section.waveform.desc",
    items: ["docs.section.waveform.item1", "docs.section.waveform.item2", "docs.section.waveform.item3"],
  },
  {
    icon: FiZap, titleKey: "docs.section.simulation", descKey: "docs.section.simulation.desc",
    items: ["docs.section.simulation.item1", "docs.section.simulation.item2", "docs.section.simulation.item3"],
  },
  {
    icon: FiLayers, titleKey: "docs.section.custom", descKey: "docs.section.custom.desc",
    items: ["docs.section.custom.item1", "docs.section.custom.item2", "docs.section.custom.item3"],
  },
  {
    icon: FiShare2, titleKey: "docs.section.share", descKey: "docs.section.share.desc",
    items: ["docs.section.share.item1", "docs.section.share.item2", "docs.section.share.item3"],
  },
  {
    icon: FiBook, titleKey: "docs.section.api", descKey: "docs.section.api.desc",
    items: ["docs.section.api.item1", "docs.section.api.item2", "docs.section.api.item3", "docs.section.api.item4"],
  },
];

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <div className="docs-page">
      <MetaTags
        title="Documentación · LogicFlow"
        description={t("docs.subtitle")}
        url="https://logicflow.dev/docs"
      />
      <Header />
      <section className="docs-hero">
        <div className="docs-hero-bg" />
        <h1>{t("docs.title")}</h1>
        <p>{t("docs.subtitle")}</p>
        <div className="docs-hero-links">
          <Link to="/get-started" className="docs-hero-btn">
            <FiPlay size={14} /> {t("docs.link.getting_started")}
          </Link>
          <Link to="/examples" className="docs-hero-btn">
            <FiGrid size={14} /> {t("docs.link.examples")}
          </Link>
        </div>
      </section>
      <div className="docs-grid">
        {SECTIONS.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="docs-card">
              <div className="docs-card-icon"><Icon size={22} /></div>
              <h2>{t(section.titleKey)}</h2>
              <p>{t(section.descKey)}</p>
              {section.items && (
                <ul className="docs-card-list">
                  {section.items.map((item, j) => (
                    <li key={j}><FiChevronRight size={12} /> {t(item)}</li>
                  ))}
                </ul>
              )}
              {section.link && section.linkKey && (
                <Link to={section.link} className="docs-card-link">
                  {t(section.linkKey)} <FiChevronRight size={14} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}

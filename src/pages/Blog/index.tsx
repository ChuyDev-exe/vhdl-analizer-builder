import { useState } from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiClock, FiArrowRight, FiRss } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { useI18n } from "../../i18n";
import { POSTS, CATEGORIES, CATEGORY_COLORS } from "./data";
import "../../styles.css";
import "./Blog.css";

const avatars: Record<string, string> = {
  "Equipo LogicFlow": "",
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}

export default function BlogPage() {
  const { lang } = useI18n();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? POSTS : POSTS.filter((p) => p.category === filter);

  return (
    <div className="blog-page">
      <MetaTags
        title="Blog & Changelog · LogicFlow"
        description="Novedades, tutoriales y actualizaciones de LogicFlow, el simulador de circuitos lógicos."
        url="https://logicflow.dev/blog"
      />
      <Header />

      <section className="blog-hero">
        <div className="blog-hero-bg" />
        <div className="blog-hero-content">
          <span className="blog-hero-badge">Blog & Changelog</span>
          <h1>Últimas publicaciones</h1>
          <p>Novedades, tutoriales y actualizaciones de LogicFlow</p>
          <div className="blog-hero-actions">
            <Link to="/blog" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Ver todos <FiArrowRight size={14} />
            </Link>
            <a href="/rss.xml" className="blog-rss-link" target="_blank" rel="noopener noreferrer">
              <FiRss size={14} /> RSS
            </a>
          </div>
        </div>
      </section>

      <div className="blog-categories">
        {CATEGORIES.map((cat) => {
          const color = cat.value === "all" ? "var(--accent)" : CATEGORY_COLORS[cat.value];
          return (
            <button
              key={cat.value}
              className={`blog-cat-btn${filter === cat.value ? " active" : ""}`}
              style={filter === cat.value ? { borderColor: color, color } : {}}
              onClick={() => setFilter(cat.value)}
            >
              {cat.value !== "all" && <span className="blog-cat-dot" style={{ background: color }} />}
              {lang === "en" && cat.labelEn ? cat.labelEn : cat.label}
            </button>
          );
        })}
      </div>

      <div className="blog-list">
        {filtered.length === 0 && (
          <div className="blog-empty">
            <p>No hay publicaciones en esta categoría.</p>
          </div>
        )}
        {filtered.map((post) => {
          const initials = getInitials(post.author);
          const color = CATEGORY_COLORS[post.category];
          return (
            <Link key={post.id} to={`/blog/${post.id}`} className="blog-card">
              <div className="blog-card-category" style={{ background: color + "18", color }}>
                {CATEGORIES.find((c) => c.value === post.category)?.label}
              </div>
              <h2 className="blog-card-title">{post.title}</h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-footer">
                <div className="blog-card-author">
                  <div className="blog-card-avatar">{initials}</div>
                  <div className="blog-card-author-info">
                    <span className="blog-card-author-name">{post.author}</span>
                    <div className="blog-card-meta">
                      <span><FiCalendar size={11} /> {new Date(post.date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span><FiClock size={11} /> {post.readTime}</span>
                    </div>
                  </div>
                </div>
                <span className="blog-card-arrow"><FiArrowRight size={16} /></span>
              </div>
            </Link>
          );
        })}
      </div>

      <Footer />
    </div>
  );
}

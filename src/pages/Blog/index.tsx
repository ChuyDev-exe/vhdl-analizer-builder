import { useState } from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiTag, FiArrowRight } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { useI18n } from "../../i18n";
import { POSTS, CATEGORIES, CATEGORY_COLORS } from "./data";
import "../../styles.css";
import "./Blog.css";

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
        <h1>Blog & Changelog</h1>
        <p>Novedades, tutoriales y actualizaciones de LogicFlow</p>
      </section>

      <div className="blog-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`blog-cat-btn${filter === cat.value ? " active" : ""}`}
            onClick={() => setFilter(cat.value)}
          >
            {lang === "en" && cat.labelEn ? cat.labelEn : cat.label}
          </button>
        ))}
      </div>

      <div className="blog-list">
        {filtered.map((post) => (
          <Link key={post.id} to={`/blog/${post.id}`} className="blog-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="blog-card-meta">
              <span className="blog-date">
                <FiCalendar size={12} /> {new Date(post.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="blog-read-time">{post.readTime} de lectura</span>
              <span className="blog-category" style={{ color: CATEGORY_COLORS[post.category] }}>
                <FiTag size={12} /> {CATEGORIES.find((c) => c.value === post.category)?.label}
              </span>
            </div>
            <h2 className="blog-card-title">{post.title}</h2>
            <p className="blog-card-excerpt">{post.excerpt}</p>
            <div className="blog-card-footer">
              <span className="blog-author">{post.author}</span>
              <span className="blog-read-more">
                Leer más <FiArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Footer />
    </div>
  );
}

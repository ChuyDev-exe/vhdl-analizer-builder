import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCalendar, FiClock, FiArrowLeft, FiArrowRight, FiArrowUp } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { POSTS, CATEGORIES, CATEGORY_COLORS } from "./data";
import "../../styles.css";
import "./Blog.css";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p) => p.id === slug);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!post) {
    return (
      <div className="blog-page">
        <Header />
        <section className="blog-hero">
          <h1>Artículo no encontrado</h1>
          <p>El artículo que buscas no existe o ha sido eliminado.</p>
          <Link to="/blog" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 20 }}>
            <FiArrowLeft size={14} /> Volver al blog
          </Link>
        </section>
        <Footer />
      </div>
    );
  }

  const idx = POSTS.indexOf(post);
  const prev = idx > 0 ? POSTS[idx - 1] : null;
  const next = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;
  const initials = getInitials(post.author);
  const color = CATEGORY_COLORS[post.category];

  return (
    <div className="blog-page">
      <MetaTags
        title={`${post.title} · LogicFlow`}
        description={post.excerpt}
        url={`https://logicflow.dev/blog/${post.id}`}
      />
      <Header />

      <div className="blog-progress" style={{ transform: `scaleX(${progress})` }} />

      <article className="blog-post">
        <Link to="/blog" className="blog-post-back">
          <FiArrowLeft size={14} /> Volver al blog
        </Link>

        <header className="blog-post-header">
          <div className="blog-post-category" style={{ background: color + "18", color }}>
            {CATEGORIES.find((c) => c.value === post.category)?.label}
          </div>
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-excerpt">{post.excerpt}</p>
          <div className="blog-post-author-row">
            <div className="blog-card-avatar blog-post-avatar">{initials}</div>
            <div>
              <div className="blog-post-author-name">{post.author}</div>
              <div className="blog-post-meta">
                <span><FiCalendar size={12} /> {new Date(post.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span><FiClock size={12} /> {post.readTime} de lectura</span>
              </div>
            </div>
          </div>
        </header>

        <div className="blog-post-body">
          {post.body.map((paragraph, i) => {
            if (paragraph.startsWith("•")) {
              return <li key={i} className="blog-post-li">{paragraph.slice(2)}</li>;
            }
            if (paragraph.endsWith(":") && paragraph.length < 60) {
              return <h3 key={i} className="blog-post-h3">{paragraph}</h3>;
            }
            if (paragraph.match(/^Paso \d+:|^\d+\.|^Características|^¿Cómo|^Correcciones|^Mejoras|^Novedades/)) {
              return <h3 key={i} className="blog-post-h3">{paragraph}</h3>;
            }
            return <p key={i} className="blog-post-p">{paragraph}</p>;
          })}
        </div>

        <div className="blog-post-author-bio">
          <div className="blog-card-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{initials}</div>
          <div>
            <strong>{post.author}</strong>
            <p>Compartiendo conocimientos sobre diseño de circuitos lógicos, VHDL y simulación digital.</p>
          </div>
        </div>

        <nav className="blog-post-nav">
          {prev ? (
            <Link to={`/blog/${prev.id}`} className="blog-post-nav-link prev">
              <span className="blog-post-nav-label"><FiArrowLeft size={12} /> Artículo anterior</span>
              <span className="blog-post-nav-title">{prev.title}</span>
            </Link>
          ) : <div />}
          {next ? (
            <Link to={`/blog/${next.id}`} className="blog-post-nav-link next">
              <span className="blog-post-nav-label">Artículo siguiente <FiArrowRight size={12} /></span>
              <span className="blog-post-nav-title">{next.title}</span>
            </Link>
          ) : <div />}
        </nav>
      </article>

      <button className="blog-back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Volver arriba">
        <FiArrowUp size={18} />
      </button>

      <Footer />
    </div>
  );
}

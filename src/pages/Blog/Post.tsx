import { useParams, Link } from "react-router-dom";
import { FiCalendar, FiTag, FiArrowLeft } from "react-icons/fi";
import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import MetaTags from "../../components/MetaTags";
import { POSTS, CATEGORIES, CATEGORY_COLORS } from "./data";
import "../../styles.css";
import "./Blog.css";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find((p) => p.id === slug);

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

  return (
    <div className="blog-page">
      <MetaTags
        title={`${post.title} · LogicFlow`}
        description={post.excerpt}
        url={`https://logicflow.dev/blog/${post.id}`}
      />
      <Header />
      <article className="blog-post">
        <Link to="/blog" className="blog-post-back">
          <FiArrowLeft size={14} /> Volver al blog
        </Link>

        <header className="blog-post-header">
          <div className="blog-card-meta">
            <span className="blog-date">
              <FiCalendar size={12} /> {new Date(post.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="blog-read-time">{post.readTime} de lectura</span>
            <span className="blog-category" style={{ color: CATEGORY_COLORS[post.category] }}>
              <FiTag size={12} /> {CATEGORIES.find((c) => c.value === post.category)?.label}
            </span>
          </div>
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-excerpt">{post.excerpt}</p>
          <span className="blog-author">{post.author}</span>
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
      </article>
      <Footer />
    </div>
  );
}

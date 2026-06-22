import { useState } from "react";
import { Link } from "react-router-dom";
import { FiGithub, FiTwitter, FiMail, FiHeart, FiArrowUp, FiSend } from "react-icons/fi";

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSent, setNewsletterSent] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterSent(true);
    setNewsletterEmail("");
  };

  return (
    <footer className="site-footer">
      <div className="footer-wave">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C300,120 600,0 1200,60 L1200,120 L0,120 Z" fill="var(--panel)" opacity="0.5" />
        </svg>
      </div>
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="25" height="25" rx="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
              <path d="M5 18 5 10 11 10 11 18 17 18 17 10 23 10 23 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="5" cy="18" r="1.2" fill="currentColor" />
              <circle cx="23" cy="18" r="1.2" fill="currentColor" />
              <line x1="1.5" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="1.5" y1="20" x2="4" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="11" x2="26.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="17" x2="26.5" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span>LogicFlow</span>
          </div>
          <p>
            Editor de circuitos lógicos con VHDL bidireccional,
            simulación en tiempo real y diagrama de tiempos.
            Todo en el navegador, gratis.
          </p>
          <div className="footer-social">
            <a href="https://github.com/chuy/logicflow" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FiGithub size={18} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FiTwitter size={18} />
            </a>
            <a href="mailto:hola@logicflow.dev" aria-label="Email">
              <FiMail size={18} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Producto</h4>
          <Link to="/">Inicio</Link>
          <Link to="/simulator">Simulador</Link>
          <Link to="/pricing">Precios</Link>
          <Link to="/blog">Blog / Changelog</Link>
        </div>

        <div className="footer-col">
          <h4>Recursos</h4>
          <Link to="/docs">Documentación</Link>
          <a href="https://github.com/chuy/logicflow" target="_blank" rel="noopener noreferrer">GitHub</a>
          <Link to="/contact">Contacto</Link>
          <Link to="/faq">FAQ</Link>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <a href="/terms">Términos de servicio</a>
          <a href="/privacy">Política de privacidad</a>
          <a href="/security">Seguridad</a>
          <a href="/cookies">Cookies</a>
        </div>

        <div className="footer-newsletter">
          <h4>Novedades</h4>
          <p>Recibe actualizaciones y tutoriales en tu correo.</p>
          {!newsletterSent ? (
            <form className="newsletter-form" onSubmit={handleNewsletter}>
              <div className="newsletter-input-wrap">
                <FiMail size={14} />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="newsletter-btn" aria-label="Suscribirse">
                <FiSend size={14} />
              </button>
            </form>
          ) : (
            <p className="newsletter-thanks">¡Gracias por suscribirte! 🎉</p>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          Hecho con <FiHeart size={12} style={{ color: "var(--danger)", verticalAlign: "middle" }} /> por el equipo de LogicFlow.
          &copy; {new Date().getFullYear()} — MIT License.
        </p>
        <button className="footer-back-top" onClick={scrollToTop} aria-label="Volver arriba">
          <FiArrowUp size={16} />
        </button>
      </div>
    </footer>
  );
}

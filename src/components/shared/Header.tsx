import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiGithub, FiGitlab, FiLogOut, FiUser, FiGrid, FiSettings,
  FiMenu, FiX, FiChevronDown, FiMail, FiZap,
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "./Modal";

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent }: HeaderProps) {
  const { user, isAuthenticated, signOut, signInWithGithub, signInWithGitlab, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  useEffect(() => {
    const handler = () => setLoginModalOpen(true);
    window.addEventListener("open-login", handler);
    return () => window.removeEventListener("open-login", handler);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleMagicLink = async () => {
    if (!magicEmail) return;
    await sendMagicLink(magicEmail);
    setMagicSent(true);
  };

  const navLinks = [
    { to: "/", label: "Inicio" },
    { to: "/simulator", label: "Simulador" },
    { to: "/get-started", label: "Primeros pasos" },
    { to: "/docs", label: "Docs" },
    { to: "/pricing", label: "Precios" },
    { to: "/blog", label: "Blog" },
  ];

  return (
    <>
      <header className={`site-header${transparent && !scrolled ? " transparent" : ""}${scrolled ? " scrolled" : ""}`}>
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={() => setMobileOpen(false)}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="header-logo-icon">
              <rect x="1.5" y="1.5" width="25" height="25" rx="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
              <path d="M5 18 5 10 11 10 11 18 17 18 17 10 23 10 23 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="5" cy="18" r="1.2" fill="currentColor" />
              <circle cx="23" cy="18" r="1.2" fill="currentColor" />
              <line x1="1.5" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="1.5" y1="20" x2="4" y2="20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="11" x2="26.5" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="24" y1="17" x2="26.5" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="header-logo-text">Logic<span className="header-logo-accent">Flow</span></span>
          </Link>

          <nav className={`header-nav${mobileOpen ? " open" : ""}`}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link${isActive(link.to) ? " active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="nav-mobile-auth">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  <Link to="/settings" className="nav-link" onClick={() => setMobileOpen(false)}>Configuración</Link>
                  <button className="btn-ghost mobile-signout" onClick={() => { signOut(); setMobileOpen(false); }}>
                    <FiLogOut size={14} /> Cerrar sesión
                  </button>
                </>
              ) : (
                <button className="btn-primary" onClick={() => { setLoginModalOpen(true); setMobileOpen(false); }}>
                  Iniciar sesión
                </button>
              )}
            </div>
          </nav>

          <div className="header-actions">
            <button className="header-btn header-sim-cta" onClick={() => navigate("/simulator")}>
              <FiZap size={14} />
              <span>Simulador</span>
            </button>

            {isAuthenticated ? (
              <div className="header-user" ref={userMenuRef}>
                <button
                  className="header-user-trigger"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="header-avatar" width={30} height={30} />
                  ) : (
                    <div className="header-avatar-placeholder">{user?.name?.[0] || "U"}</div>
                  )}
                  <span className="header-user-name">{user?.name?.split(" ")[0]}</span>
                  <FiChevronDown size={12} className={`header-chevron${userMenuOpen ? " open" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="header-user-menu">
                    <div className="user-menu-header">
                      <strong>{user?.name}</strong>
                      <span className="user-menu-plan">{user?.plan === "free" ? "Plan Gratuito" : `Plan ${user?.plan}`}</span>
                    </div>
                    <div className="user-menu-items">
                      <button onClick={() => { navigate("/dashboard"); setUserMenuOpen(false); }}>
                        <FiGrid size={15} /> Dashboard
                      </button>
                      <button onClick={() => { navigate("/settings"); setUserMenuOpen(false); }}>
                        <FiSettings size={15} /> Configuración
                      </button>
                      <button onClick={() => { navigate("/pricing"); setUserMenuOpen(false); }} className="upgrade">
                        Mejorar plan
                      </button>
                      <hr />
                      <button onClick={() => { signOut(); setUserMenuOpen(false); }} className="danger">
                        <FiLogOut size={15} /> Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-primary header-login-btn" onClick={() => setLoginModalOpen(true)}>
                <FiUser size={15} />
                <span>Iniciar sesión</span>
              </button>
            )}

            <button
              className="header-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menú"
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <Modal open={loginModalOpen} onClose={() => { setLoginModalOpen(false); setMagicSent(false); setMagicEmail(""); }} title="Iniciar sesión" width={400}>
        <div className="login-modal">
          <p className="login-modal-desc">Elige cómo quieres iniciar sesión</p>
          <button className="login-btn login-github" onClick={() => { signInWithGithub(); setLoginModalOpen(false); }}>
            <FiGithub size={20} />
            <span>Continuar con GitHub</span>
          </button>
          <button className="login-btn login-gitlab" onClick={() => { signInWithGitlab(); setLoginModalOpen(false); }}>
            <FiGitlab size={20} />
            <span>Continuar con GitLab</span>
          </button>
          <div className="login-divider"><span>o con email</span></div>
          {!magicSent ? (
            <form className="login-magic" onSubmit={(e) => { e.preventDefault(); handleMagicLink(); }}>
              <div className="login-magic-input">
                <FiMail size={16} />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary login-magic-btn" disabled={!magicEmail}>
                Enviar magic link
              </button>
            </form>
          ) : (
            <div className="login-magic-sent">
              <div className="login-magic-check">✓</div>
              <p>Revisa tu correo. Te enviamos un enlace mágico para iniciar sesión.</p>
            </div>
          )}
          <p className="login-modal-footer">
            Al continuar, aceptas los{" "}
            <a href="/terms">términos de servicio</a> y la{" "}
            <a href="/privacy">política de privacidad</a>.
          </p>
        </div>
      </Modal>
    </>
  );
}

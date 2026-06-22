import { useState, useEffect } from "react";
import { FiSave, FiUser, FiMail, FiLock, FiBell, FiMoon, FiSun, FiGlobe, FiDownload, FiTrash2, FiGithub, FiGitlab, FiLink, FiImage } from "react-icons/fi";
import Header from "../../components/shared/Header";
import { useAuth } from "../../contexts/AuthContext";
import { exportUserData } from "../../services/cloudProjects";
import "../../styles.css";
import "./Settings.css";

export default function SettingsPage() {
  const { user, updateProfile, updatePreferences, deleteAccount } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || "");
  const [gitlabUsername, setGitlabUsername] = useState(user?.gitlabUsername || "");
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || "");
      setGithubUsername(user.githubUsername || "");
      setGitlabUsername(user.gitlabUsername || "");
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="settings-page">
        <Header />
        <div className="settings-empty">
          <h2>Inicia sesión para configurar tu cuenta</h2>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    await updateProfile({ name, bio, avatar, githubUsername, gitlabUsername });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const cloudData = await exportUserData(user.id);
      const data = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          githubUsername: user.githubUsername,
          gitlabUsername: user.gitlabUsername,
          createdAt: user.createdAt,
          plan: user.plan,
        },
        preferences: user.preferences,
        projects: cloudData.projects || [],
        exportDate: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "logicflow-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="settings-page">
      <Header />
      <div className="settings-container">
        <h1>Configuración</h1>

        <section className="settings-section">
          <h2><FiUser size={16} /> Perfil</h2>
          <div className="settings-card">
            <div className="settings-field">
              <label><FiImage size={12} /> Avatar URL</label>
              <div className="settings-avatar-row">
                {avatar && <img src={avatar} alt="" className="settings-avatar-preview" width={40} height={40} />}
                <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="settings-field">
              <label>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="settings-field">
              <label>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>
            <div className="settings-field">
              <label>Email</label>
              <input value={email} disabled />
            </div>
            <div className="settings-field">
              <label><FiGithub size={12} /> GitHub usuario</label>
              <div className="settings-link-row">
                <input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="usuario" />
                {githubUsername && <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noopener noreferrer" className="settings-link"><FiLink size={12} /></a>}
              </div>
            </div>
            <div className="settings-field">
              <label><FiGitlab size={12} /> GitLab usuario</label>
              <div className="settings-link-row">
                <input value={gitlabUsername} onChange={(e) => setGitlabUsername(e.target.value)} placeholder="usuario" />
                {gitlabUsername && <a href={`https://gitlab.com/${gitlabUsername}`} target="_blank" rel="noopener noreferrer" className="settings-link"><FiLink size={12} /></a>}
              </div>
            </div>
            <button className="btn-primary" onClick={handleSaveProfile}>
              <FiSave size={14} /> {saved ? "Guardado" : "Guardar cambios"}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2><FiBell size={16} /> Preferencias</h2>
          <div className="settings-card">
            <div className="settings-field row">
              <label>Tema</label>
              <div className="settings-toggle-group">
                <button
                  className={`toggle-option${user.preferences.theme === "dark" ? " active" : ""}`}
                  onClick={() => updatePreferences({ theme: "dark" })}
                >
                  <FiMoon size={14} /> Oscuro
                </button>
                <button
                  className={`toggle-option${user.preferences.theme === "light" ? " active" : ""}`}
                  onClick={() => updatePreferences({ theme: "light" })}
                >
                  <FiSun size={14} /> Claro
                </button>
              </div>
            </div>
            <div className="settings-field row">
              <label>Idioma</label>
              <select
                value={user.preferences.language}
                onChange={(e) => updatePreferences({ language: e.target.value as any })}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="settings-field row">
              <label>Tamaño de fuente</label>
              <input
                type="number"
                min={10}
                max={20}
                value={user.preferences.fontSize}
                onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
                style={{ width: 80 }}
              />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2><FiLock size={16} /> Conexiones OAuth</h2>
          <div className="settings-card">
            <div className="settings-field row">
              <span><FiGithub size={14} /> GitHub</span>
              <span className="settings-connected">Conectado</span>
            </div>
            <div className="settings-field row">
              <span><FiGitlab size={14} /> GitLab</span>
              <button className="btn-ghost">Conectar</button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2><FiDownload size={16} /> Datos</h2>
          <div className="settings-card">
            <p className="settings-hint">Exporta todos tus datos (proyectos, perfil, facturas) en formato JSON.</p>
            <button className="btn-ghost" onClick={handleExportData} disabled={exporting}>
              <FiDownload size={14} /> {exporting ? "Exportando..." : "Exportar mis datos (GDPR)"}
            </button>
          </div>
        </section>

        <section className="settings-section danger-zone">
          <h2><FiTrash2 size={16} /> Eliminar cuenta</h2>
          <div className="settings-card">
            <p className="settings-hint">
              Esta acción eliminará permanentemente tu cuenta y todos tus datos. No se puede recuperar.
            </p>
            {!showDeleteConfirm ? (
              <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                <FiTrash2 size={14} /> Eliminar mi cuenta
              </button>
            ) : (
              <div className="delete-confirm">
                <p>¿Estás seguro? Escribe <strong>ELIMINAR</strong> para confirmar.</p>
                <input
                  type="text"
                  placeholder="Escribe ELIMINAR"
                  onChange={(e) => {
                    if (e.target.value === "ELIMINAR") {
                      deleteAccount();
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

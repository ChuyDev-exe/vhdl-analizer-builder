import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import "../../styles.css";

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <Header />

      <main className="legal-content">
        <h1>Política de Privacidad</h1>
        <p className="legal-date">Última actualización: 2026</p>

        <section>
          <h2>Datos que almacenamos</h2>
          <p>LogicFlow está diseñada para respetar tu privacidad. La aplicación es mayoritariamente del lado del cliente. Los únicos datos que se almacenan externamente son los necesarios para la funcionalidad de la plataforma (cuentas de usuario y proyectos guardados en la nube).</p>
        </section>

        <section>
          <h2>Autenticación y cuentas</h2>
          <p>Si decides iniciar sesión, utilizamos proveedores externos (GitHub, GitLab) para autenticarte. Solo almacenamos tu nombre, email y avatar proporcionados por el proveedor. No manejamos contraseñas.</p>
          <p>Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde la configuración de tu perfil.</p>
        </section>

        <section>
          <h2>Proyectos en la nube</h2>
          <p>Los proyectos que guardes se almacenan en los servidores de Supabase (proveedor de base de datos y autenticación). Puedes descargar, exportar o eliminar tus proyectos en cualquier momento.</p>
        </section>

        <section>
          <h2>Almacenamiento local (localStorage)</h2>
          <p>La aplicación utiliza <code>localStorage</code> del navegador para:</p>
          <ul>
            <li>Guardar el circuito actual y restaurarlo al recargar la página.</li>
            <li>Recordar el estado del diagrama de tiempos (orden de trazas, nombres personalizados, visibilidad).</li>
            <li>Recordar la preferencia de tema (claro/oscuro) y modo de alto contraste.</li>
          </ul>
          <p>Ninguno de estos datos sale de tu navegador a menos que explícitamente decidas guardar un proyecto en la nube.</p>
        </section>

        <section>
          <h2>Datos que NO recopilamos</h2>
          <ul>
            <li>No usamos cookies de rastreo.</li>
            <li>No enviamos analytics a terceros.</li>
            <li>No compartimos datos personales con nadie.</li>
            <li>No vendemos información de usuarios.</li>
          </ul>
        </section>

        <section>
          <h2>Enlaces externos</h2>
          <p>Esta aplicación puede contener enlaces a sitios externos (GitHub, GitLab, Supabase). No somos responsables de las prácticas de privacidad de terceros.</p>
        </section>

        <section>
          <h2>Cambios en esta política</h2>
          <p>Si esta política cambia, se actualizará este documento. El uso continuado de la aplicación implica la aceptación de esta política.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

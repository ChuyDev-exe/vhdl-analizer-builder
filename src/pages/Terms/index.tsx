import Header from "../../components/shared/Header";
import Footer from "../../components/shared/Footer";
import "../../styles.css";

export default function TermsPage() {
  return (
    <div className="legal-page">
      <Header />

      <main className="legal-content">
        <h1>Términos de Servicio</h1>
        <p className="legal-date">Última actualización: 2024</p>

        <section>
          <h2>1. Aceptación de los Términos</h2>
          <p>Al utilizar <strong>LogicFlow</strong> ("el Servicio"), aceptas estos Términos de Servicio. Si no estás de acuerdo, no utilices el Servicio.</p>
        </section>

        <section>
          <h2>2. Descripción del Servicio</h2>
          <p>LogicFlow es una aplicación web que permite diseñar y simular circuitos lógicos, con generación bidireccional de VHDL y diagrama de tiempos. La aplicación se ejecuta principalmente en el navegador del usuario.</p>
        </section>

        <section>
          <h2>3. Servicio "Tal Cual"</h2>
          <p>El Servicio se proporciona <strong>"tal cual"</strong> y sin garantía de ningún tipo, expresa o implícita, incluyendo pero no limitándose a las garantías de comerciabilidad, idoneidad para un propósito particular y no infracción. No garantizamos que el Servicio sea ininterrumpido, libre de errores o seguro.</p>
        </section>

        <section>
          <h2>4. Responsabilidades del Usuario</h2>
          <ul>
            <li>No utilizar el Servicio para actividades ilegales o prohibidas por la ley aplicable.</li>
            <li>No intentar vulnerar la seguridad del Servicio, incluyendo ataques de inyección, denegación de servicio o ingeniería inversa del backend.</li>
            <li>No utilizar el Servicio para almacenar o transmitir contenido malicioso.</li>
            <li>El usuario es responsable de sus propios circuitos y datos. Se recomienda realizar copias de seguridad periódicas.</li>
          </ul>
        </section>

        <section>
          <h2>5. Propiedad Intelectual</h2>
          <p>El código fuente de LogicFlow es propiedad exclusiva del autor. Todos los derechos reservados.</p>
          <p>Los circuitos, diagramas y archivos creados por el usuario <strong>pertenecen al usuario</strong>. Este proyecto no reclama propiedad sobre los diseños creados con el Servicio.</p>
        </section>

        <section>
          <h2>6. Limitación de Responsabilidad</h2>
          <p>En ningún caso los mantenedores del proyecto serán responsables por daños directos, indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o la imposibilidad de uso del Servicio, incluso si se les ha advertido de la posibilidad de tales daños.</p>
        </section>

        <section>
          <h2>7. Disponibilidad</h2>
          <p>No se garantiza la disponibilidad continua del Servicio. El Servicio puede dejar de estar disponible temporal o permanentemente sin previo aviso.</p>
        </section>

        <section>
          <h2>8. Ley Aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República Argentina.</p>
        </section>

        <section>
          <h2>9. Cambios en los Términos</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación. El uso continuado del Servicio después de cualquier modificación constituye la aceptación de los nuevos términos.</p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>Para preguntas sobre estos términos, abre un issue en <a href="https://github.com/anomalyco/logicflow/issues" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

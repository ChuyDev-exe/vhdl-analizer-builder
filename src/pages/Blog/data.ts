export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: "feature" | "tutorial" | "changelog" | "announcement";
  author: string;
  readTime: string;
  body: string[];
}

export const POSTS: BlogPost[] = [
  {
    id: "v1.0",
    title: "Lanzamiento de LogicFlow v1.0",
    excerpt: "Anunciamos el lanzamiento oficial de LogicFlow, una herramienta web gratuita para diseñar y simular circuitos lógicos con soporte VHDL bidireccional.",
    date: "2026-06-15",
    category: "announcement",
    author: "Equipo LogicFlow",
    readTime: "3 min",
    body: [
      "Hoy es un día especial para nosotros: anunciamos el lanzamiento oficial de LogicFlow v1.0, una herramienta web gratuita y de código abierto para diseñar, simular y compartir circuitos lógicos directamente desde el navegador.",
      "LogicFlow nace con la misión de hacer accesible el diseño de circuitos digitales a estudiantes, educadores y profesionales. No requiere instalación, registro ni descarga: todo funciona en el navegador, con soporte completo para simulación en tiempo real, generación VHDL bidireccional y diagrama de tiempos.",
      "Características principales:",
      "• Editor visual con arrastrar y soltar: 20+ tipos de componentes (compuertas, FFs, buses, ROM, RAM, registros).",
      "• Simulación en tiempo real con 4 estados (0, 1, X, Z) y modo retardo para detección de glitches.",
      "• VHDL bidireccional: genera código VHDL desde el diagrama y viceversa, con linting y autocompletado.",
      "• Diagrama de tiempos interactivo con zoom, marcadores, grupos y exportación a VCD/CSV.",
      "• Componentes personalizados: crea tus propios subcircuitos desde diagramas o expresiones booleanas.",
      "• Persistencia en la nube con Supabase (opcional) y modo offline con localStorage.",
      "• Soporte multi-idioma (español e inglés) con detección automática.",
      "LogicFlow v1.0 es el resultado de meses de desarrollo y lo ofrecemos bajo licencia MIT. El código fuente está disponible en GitHub.",
    ],
  },
  {
    id: "colaboracion-tiempo-real",
    title: "Colaboración en tiempo real: trabaja con tu equipo en el mismo circuito",
    excerpt: "Nueva funcionalidad que permite a múltiples usuarios editar simultáneamente un circuito, con cursores, comentarios en nodos y sincronización instantánea.",
    date: "2026-06-10",
    category: "feature",
    author: "Equipo LogicFlow",
    readTime: "4 min",
    body: [
      "Una de las funcionalidades más solicitadas por nuestra comunidad ya está aquí: la colaboración en tiempo real. Ahora puedes invitar a tus compañeros a editar un circuito simultáneamente, viendo los cambios en vivo.",
      "¿Cómo funciona?",
      "1. Abre cualquier proyecto guardado en la nube.",
      "2. Haz clic en el botón Compartir del dashboard.",
      "3. Ingresa el email del colaborador y selecciona el permiso (solo lectura o edición).",
      "4. Ambos verán el mismo circuito con cursores de diferentes colores.",
      "Características de la colaboración:",
      "• Cursores en vivo: cada colaborador muestra su cursor y selección en tiempo real.",
      "• Comentarios en nodos: haz clic derecho sobre cualquier componente para añadir un comentario.",
      "• Historial de cambios: cada edición queda registrada en el historial de versiones.",
      "• Sin conflictos: el sistema de sincronización resuelve ediciones simultáneas automáticamente.",
      "La colaboración en tiempo real está disponible en todos los planes, incluyendo el plan gratuito con hasta 2 colaboradores por proyecto.",
    ],
  },
  {
    id: "primeros-pasos",
    title: "Primeros pasos: cómo diseñar tu primer circuito",
    excerpt: "Guía paso a paso para crear tu primer circuito lógico desde cero, desde las compuertas básicas hasta la simulación completa.",
    date: "2026-06-05",
    category: "tutorial",
    author: "Equipo LogicFlow",
    readTime: "6 min",
    body: [
      "En este tutorial te guiaremos paso a paso para crear tu primer circuito lógico: una compuerta AND con dos entradas y una salida. No necesitas experiencia previa.",
      "Paso 1: Abre el simulador",
      "Ve a logicflow.dev/simulator. Verás un lienzo en blanco con una paleta de componentes a la izquierda.",
      "Paso 2: Añade las entradas",
      "Desde la paleta, arrastra dos componentes INPUT al lienzo. Estos serán tus interruptores de entrada.",
      "Paso 3: Añade una compuerta AND",
      "Arrastra una compuerta AND desde la categoría 'Compuertas'. Colócala entre las entradas y el borde derecho.",
      "Paso 4: Conecta los componentes",
      "Haz clic en el conector de salida del primer INPUT y arrastra hasta el primer conector de entrada de la AND. Repite con el segundo INPUT en la segunda entrada.",
      "Paso 5: Añade una salida",
      "Arrastra un componente OUTPUT al lienzo y conéctalo a la salida de la compuerta AND.",
      "Paso 6: Simula",
      "Presiona el botón ▶ Run. Haz clic en los INPUTs para alternar entre 0 y 1. Observa cómo la salida solo es 1 cuando ambas entradas son 1.",
      "¡Felicidades! Has creado tu primer circuito. Ahora experimenta con otras compuertas como OR, XOR y NOT.",
    ],
  },
  {
    id: "vhdl-bidireccional",
    title: "VHDL bidireccional: del diagrama al código y viceversa",
    excerpt: "Cómo funciona la sincronización bidireccional entre el editor visual y el código VHDL, y cómo aprovecharla al máximo.",
    date: "2026-05-28",
    category: "tutorial",
    author: "Equipo LogicFlow",
    readTime: "5 min",
    body: [
      "Una de las características más potentes de LogicFlow es la sincronización bidireccional entre el editor visual de circuitos y el código VHDL. Puedes empezar desde cualquier lado.",
      "Del diagrama al código:",
      "Dibuja tu circuito en el lienzo arrastrando componentes y conectándolos. En cualquier momento, abre el editor VHDL (View → VHDL Editor) y verás el código generado automáticamente. Cada componente se traduce a una instanciación de entidad, y las conexiones se convierten en señales.",
      "Del código al diagrama:",
      "Si prefieres escribir VHDL directamente, puedes hacerlo. El editor VHDL cuenta con resaltado de sintaxis y autocompletado. Al hacer clic en 'Sincronizar', el diagrama se genera automáticamente a partir del código.",
      "Consejos para trabajar con VHDL:",
      "• Usa nombres descriptivos para tus señales — se convertirán en etiquetas en el diagrama.",
      "• El linting integrado te ayuda a detectar errores antes de la simulación.",
      "• Puedes alternar entre modo automático (auto-sync) y manual para tener control total.",
      "• Las expresiones booleanas se pueden importar directamente desde el editor de componentes personalizados.",
      "El VHDL generado es apto para síntesis en FPGA, por lo que puedes llevar tus diseños del simulador a hardware real.",
    ],
  },
  {
    id: "changelog-junio",
    title: "Changelog: Junio 2026",
    excerpt: "Novedades de este mes: exportación ZIP, diff visual de versiones, dashboard mejorado, y más.",
    date: "2026-06-22",
    category: "changelog",
    author: "Equipo LogicFlow",
    readTime: "3 min",
    body: [
      "Este mes traemos importantes actualizaciones al dashboard y nuevas funcionalidades de exportación. Aquí están todos los cambios:",
      "Novedades:",
      "• 🆕 Exportación masiva en ZIP: selecciona varios proyectos y descárgalos como un archivo ZIP con JSON + SVG.",
      "• 🆕 Diff visual de versiones: compara dos versiones de un mismo circuito y ve exactamente qué nodos y conexiones cambiaron.",
      "• 🆕 Filtro por fecha: ahora puedes filtrar proyectos por rango de fechas en el dashboard.",
      "• 🆕 Permisos de uso compartido: al compartir un proyecto, puedes elegir entre solo lectura o edición.",
      "• 🆕 Estadísticas completas: la profundidad del circuito ahora se calcula automáticamente.",
      "Mejoras:",
      "• 🔧 Dashboard rediseñado con vista de tipo de circuito y badges en las tarjetas.",
      "• 🔧 Historial de versiones ahora se guarda automáticamente al guardar un proyecto.",
      "• 🔧 Meta tags OG dinámicos para compartir circuitos en redes sociales.",
      "• 🔧 Sitemap actualizado con todas las páginas del sitio.",
      "• 🔧 Documentación traducida al inglés.",
      "Correcciones:",
      "• 🐛 Solucionado error al cargar proyectos con nombres que contienen espacios.",
      "• 🐛 Mejorada la detección de idioma del navegador.",
      "Gracias a todos los que reportaron issues y sugirieron mejoras. ¡Sigan así!",
    ],
  },
];

export const CATEGORIES = [
  { value: "all", label: "Todos", labelEn: "All" },
  { value: "feature", label: "Novedades", labelEn: "Features" },
  { value: "tutorial", label: "Tutoriales", labelEn: "Tutorials" },
  { value: "changelog", label: "Changelog", labelEn: "Changelog" },
  { value: "announcement", label: "Anuncios", labelEn: "Announcements" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  feature: "#34d399",
  tutorial: "#a78bfa",
  changelog: "#f5c842",
  announcement: "#ef5b6b",
};

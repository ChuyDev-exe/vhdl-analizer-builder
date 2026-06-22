# Mejoras propuestas

Oportunidades de mejora para el **Simulador de Circuitos Lógicos · VHDL ⇄ Diagrama**.
✅ implementado · ⏳ pendiente · ◐ parcial

## ✅ Ya implementado

- **Flip-flops JK, T y SR** (L3) — simulación + VHDL.
- **Registro de ancho configurable** 2/4/8/16 bits (L4) y **reimportación de registros vectoriales** (L2).
- **Precedencia de operadores estilo VHDL** (L5).
- **Lógica de 4 estados 0/1/X/Z** (L7) + **reset/enable/init** en secuenciales y **multi-reloj** por divisor (§2).
- **Buses multibit** (BUS-IN/SPLIT/MERGE/BUS-OUT con VHDL vectorial) y **modo retardo** con paso Δ (§2).
- **Detección de bucles combinacionales** (L6) con resaltado.
- **Aviso de entradas sin conectar** (L8).
- **Error boundary** de React (§7).
- **§3** — Exportar **VCD**, **testbench** VHDL con estímulos, e **importar `component`/`port map`** (L1).
- **§4** — Zoom temporal (rueda + deslizante), cursor + marcadores múltiples con etiquetas, Δt, buses en hex, exportar PNG/SVG/CSV/JSON, ocultar/reordenar/drag/renombrar, persistencia, búsqueda, undo/redo, grupos jerárquicos, vista de transiciones, auto-scroll, resaltado de glitches.
- **§5** — Snap a rejilla, tema claro/oscuro, undo/redo (Ctrl+Z/Shift+Z).
- **§6** — Proyectos con nombre, búsqueda/filtro, etiquetas, descripción, favoritos, recientes, plantillas (12), backup export/import, versionado de librería, autoguardado configurable, beforeunload.
- **Persistencia automática** del circuito en localStorage.

---

## 1. Limitaciones (L1–L15)

| # | Limitación | Estado |
|---|---|---|
| L1 | No importa `component`/`port map` | ✅ `buildFromVhdl` instancia componentes de librería |
| L2 | Registros vectoriales no se reimportaban | ✅ Se detectan señales vector + procesos por bit; lexer acepta `name(i)` |
| L3 | Solo flip-flop D | ✅ JK, T, SR |
| L4 | `REG_BITS` fijo en 4 | ✅ Ancho por instancia (2/4/8/16), recablea CLK al cambiar |
| L5 | Precedencia no-VHDL | ✅ Operadores lógicos mismo nivel, izq→der |
| L6 | Bucles combinacionales silenciosos | ✅ Detección + resaltado |
| L7 | Sin X/Z | ✅ 4 estados; entradas flotantes = Z, conflictos = X |
| L8 | Entrada flotante → 0 sin aviso | ✅ Aviso de entradas sin conectar |
| L9 | Buses no disponibles en paleta | ✅ BUSIN/BUSOUT/SPLIT/MERGE en NODE_DEFS |
| L10 | Auto-layout solo al importar VHDL | ✅ Botón en menú Edit |
| L11 | Testbench sin soporte vectorial | ✅ `generateTestbench` declara/estimula STD_LOGIC_VECTOR |
| L12 | Linter sin semántica | ✅ Señales no declaradas, puertos sin usar, end entity faltante |
| L13 | Sin búsqueda en waveform | ✅ Campo de texto filtra por nombre/id |
| L14 | Sin validación de nombres | ✅ `validateName()` con caracteres permitidos |
| L15 | Sin undo/redo en waveform | ✅ Pila Ctrl+Z/Shift+Z |

## 2. Motor de simulación

- ✅ **4 estados** (0/1/X/Z): entradas flotantes = Z, conflictos = X, álgebra X-propagante, coloreado propio.
- ✅ **Reset asíncrono + enable** en FFs y registros (RST/EN; NC = seguro por defecto).
- ✅ **Valores iniciales** configurables (init = 0/1/x).
- ✅ **Múltiples relojes** independientes con divisor ÷1/2/4/8.
- ✅ **Detección de bucles** y aviso de entradas flotantes.
- ✅ **Buses multibit**: BUS-IN (fuente hex N bits), SPLIT (bus→bits), MERGE (bits→bus), BUS-OUT (display). Cables de bus, valor hex en nodo/waveform, VHDL vectorial (`STD_LOGIC_VECTOR`, `&`, slicing).
- ✅ **Modo retardo** (⧖) con paso Δ: retardo unitario por compuerta, doble-buffer, visibles glitches/hazards capa a capa.
- ✅ **Señal `'U'`** (uninitialized): modelada en tipo Sig, se propaga con prioridad máxima por compuertas (cualquier U → U) y se distingue visualmente con color propio.
- ✅ **Señal `'-'`** (don't care): modelada en tipo Sig, tratada como X en compuertas con fines de resolución.
- ✅ **ROM/RAM**: componentes de memoria añadidos en paleta "Secuencial / Memoria". ROM (lectura por dirección con enable), RAM (lectura asíncrona, escritura síncrona con WE + CLK). Contenido editable.
- ✅ **Ciclo de trabajo configurable**: cada CLOCK tiene duty cycle (25/50/75%), visible en selector del nodo. Solo afecta con divisor >1.
- ✅ **Cota `n+6` reemplazada**: settleModule ahora usa orden topológico real (Kahn) para evaluar nodos, con límite de iteraciones como respaldo.
- ✅ **Múltiples drivers**: inputRaw resuelve múltiples drivers (wired-AND/OR) con álgebra de resolución STD_LOGIC (U > X > 0/1 > Z). Versión inicial con soporte para buses y escalares.
- ✅ **Retardos individuales**: tPLH/tPHL en NodeData, con soporte básico en deltaStep.
- ✅ **Race conditions**: análisis de caminos críticos disparejos en analyze(), reporta warnings por nodo con diferencia de profundidad >1.
- ❌ **Modelo temporal completo**: pendiente implementar scheduling de eventos con cola temporal.

## 3. VHDL (entrada y salida)

- ✅ **`component`/`port map`** en importador (L1) — round-trip completo.
- ✅ **Testbench** automático desde estímulos del waveform.
- ✅ **Exportar VCD** para GTKWave/ModelSim.
- ✅ **`when/else`** y **`with/select`** → multiplexores.
- ✅ **Linter** con errores por línea (paréntesis, entity/architecture/process).
- ✅ **Reset asíncrono** round-trip: `if rst='1'... elsif rising_edge...`.
- ✅ **`STD_LOGIC_VECTOR`** en parser: importa puertos vectoriales como BUSIN/BUSOUT, señales vectoriales, registros e indexadas `x(i)`; exportación completa de buses.
- ✅ **`case`/`if-elsif`** en procesos: convertidos a expresiones when/else (mux tree).
- ✅ **`generic`** (ancho parametrizable): anchos configurables por instancia.
- ✅ **`when/else` anidados y `with/select` multibit**: soporte completo multibit ("01", "10") y valores vectoriales.
- ✅ **Testbench con buses vectoriales**.
- ✅ **Validación semántica**: señales sin declarar, puertos sin usar, end entity.
- ✅ **`generate`/`for generate`**: expandido en tiempo de parsing.
- ✅ **`numeric_std`/`std_logic_arith`**: operaciones `+`/`-` expandidas a sumador ripple-carry. `unsigned()`/`signed()` como passthrough.
- ✅ **Múltiples arquitecturas**: parser selecciona la última.
- ✅ **Variables de proceso (`variable`)**: asignaciones `:=` convertidas a `<=`.
- ✅ **`after`/`transport`/`inertial`**: removidos del cuerpo antes de parsear.
- ✅ **`wait for`/`wait until`**: `wait until rising_edge(clk)` reconocido como flanco.
- ✅ **`others`** en asignaciones vectoriales: `(others => '0')` expandido.
- ✅ **`alias` y atributos**: alias resueltos como passthrough.
- ✅ **Tipos `unsigned`/`signed`**: reconocidos en señales y puertos, mapeados a STD_LOGIC_VECTOR.
- ✅ **Formateador/prettifier** de VHDL: `formatVhdl()` con indentación.
- ✅ **Auto-completado** en editor VHDL: sugerencias con snippets, navegación teclado.
- ✅ **Detección de latches implícitos**: linter advierte en procesos combinacionales.

## 4. Waveform

- ✅ Zoom (12–60 px/ciclo) + cursor de medición + marcador con Δt.
- ✅ Buses en hex (base configurable: hex/dec/bin).
- ✅ Reordenar (↑↓ + drag), ocultar (👁), renombrar (click).
- ✅ Exportar a PNG/SVG.
- ✅ Señales visibles antes de simular (INPUT, CLOCK, FF, REG, BUS, OUTPUT).
- ✅ Unidades ns, color por tipo, resaltado hover, estado vacío.
- ✅ Persistencia del estado (orden, visibilidad, nombres) en localStorage.
- ✅ Preset JSON exportable/importable (Preset↓/Preset↑).
- ✅ Búsqueda/filtro por nombre/id.
- ✅ Undo/redo (Ctrl+Z/Shift+Z) en operaciones del waveform.
- ✅ **Etiqueta tipo FF en traza**: muestra `nodo.D.Q`, `nodo.T.Q`, `nodo.JK.Q`, `nodo.SR.Q`.
- ✅ **Zoom con rueda** del ratón (rueda sobre el SVG).
- ✅ **Múltiples cursores/marcadores** con etiquetas editables.
- ✅ **Agrupación jerárquica** de señales (colapsable/expandible, renombrable).
- ✅ **Exportar a CSV/JSON** (además de PNG/SVG/VCD).
- ✅ **Lista de transiciones** (vista toggle que muestra solo ciclos con cambios).
- ✅ **Resaltado de glitches** en modo retardo (rayas rojas en transiciones que revierten).
- ✅ **Auto-scroll** al simular (desplaza automáticamente a la derecha al llegar nuevos datos).
- ✅ **Búsqueda de flancos** (siguiente 0→1 o 1→0): botones ↗/↘ en toolbar.
- ✅ **Medición de ancho de pulso**: Shift+click inicia medición, muestra Δt ns en header.
- ✅ **Copiar valor al portapapeles**: Alt+click copia el valor de la señal bajo el cursor.
- ✅ **Colores personalizables** por señal: color picker por fila.
- ✅ **Regiones de interés** en timeline: Measure → Region+, fondo semitransparente, nombre editable, ✕ para borrar.
- ✅ **Visualización analógica** de buses: toggle 📈 renderiza línea de valor numérico.
- ✅ **Comparar dos ejecuciones**: Snap guarda snapshot, Diff overlay con línea punteada azul.
- ⏳ **Arrastrar señales desde el circuito** al waveform.
- ✅ **Señales compuestas** (función booleana de otras): Expr+, parser de AND/OR/NOT/XOR con paréntesis.

## 5. UX y editor

- ✅ Editor con resaltado VHDL, números de línea, scroll síncrono.
- ✅ Undo/redo, copiar/pegar, multi-selección, snap a rejilla.
- ✅ Atajos de teclado + ayuda modal.
- ✅ Tema claro/oscuro persistente (`data-theme`).
- ✅ Gestor de librería visual (renombrar, editar, duplicar, exportar, eliminar).
- ✅ Validaciones en vivo (bucles, entradas flotantes, puertos duplicados).
- ✅ Buses en paleta (BUS-IN/OUT/SPLIT/MERGE).
- ✅ Auto-layout re-ejecutable (menú Edit).
- ✅ **i18n** (es/en).
- ⏳ **Búsqueda siempre visible** en paleta.
- ⏳ **Menú contextual** en lienzo.
- ⏳ **Botones zoom +/-** explícitos.
- ✅ **Colapsar categorías** en paleta (toggle por grupo, persistido en localStorage; se expande automáticamente al filtrar).
- ⏳ **Drag preview** al arrastrar desde paleta.
- ⏳ **Alinear/distribuir** nodos seleccionados.
- ⏳ **Tooltips en puertos** (handles).
- ✅ **Tour guiado** (TourModal con 7 pasos).
- ⏳ **Atajos personalizables**.
- ⏳ **Barra de progreso** para operaciones largas.
- ✅ **Modo oscuro automático** (`prefers-color-scheme`): tema inicial desde localStorage o sistema; una vez cargado, no reacciona a cambios del SO para evitar cambios inesperados.
- ⏳ **Historial visible de undo/redo**.
- ⏳ **Exportar diagrama a imagen** (React Flow).
- ⏳ **Selector de color de fondo** del lienzo.
- ⏳ **Guías de alineación** entre nodos.
- ⏳ **Zoom con doble clic** en nodo.
- ⏳ **Notificaciones toast**.
- ⏳ **Panel de propiedades lateral**.
- ⏳ **Mini-mapa interactivo** (navegable).
- ⏳ **Vista de impresión/PDF**.

## 6. Persistencia y proyectos

- ✅ Autoguardado + restauración (circuito + librería en localStorage).
- ✅ Persistencia del waveform (orden, nombres, visibilidad).
- ✅ Proyectos con nombre (Ctrl+S): guardar/abrir/eliminar.
- ✅ Compartir por URL: circuito + librería en base64 en hash `#`.
- ✅ Preset de waveform desde URL (`?preset=...`).
- ✅ Validación de nombres (`validateName()`).
- ✅ **Versionado de librería** (v1→v2 migración automática, versión por componente).
- ✅ **Plantillas de proyecto** (12 circuitos: contador, registro, ALU, FSM...).
- ✅ **Descripción/notas** del proyecto (campo editable en ProjectsModal).
- ✅ **Búsqueda/filtro** de proyectos (por nombre, etiquetas, descripción).
- ✅ **Categorías/etiquetas** (coma-separadas, editables por proyecto).
- ✅ **Export/import masivo** (backup completo: circuito + librería + proyectos + favoritos + recientes).
- ✅ **Proyectos recientes** (últimos 5 como chips clickeables).
- ✅ **Favoritos anclados** (estrella, aparecen primero en la lista).
- ✅ **Intervalo de autoguardado** configurable (0.3/1/2/5/10/30s, en View menu).
- ✅ **Confirmación al salir** (`beforeunload` si hay cambios sin guardar).
- ⏳ **Auto-backup cloud** (Drive, Dropbox, WebDAV).
- ⏳ **Exportar como HTML autónomo**.
- ⏳ **Historial de versiones** del proyecto.
- ⏳ **Comparar (diff)** dos proyectos.
- ⏳ **Importar desde Logisim/Digital/Proteus/EDIF**.
- ⏳ **Exportar a PDF esquemático**.

## 7. Calidad

- ✅ Error boundary de React.
- ✅ **Tests unitarios** (Vitest) del motor (17 tests), parser VHDL (20 tests), parser expr (21 tests), defs (33 tests) — **91 tests**.
- ✅ **ESLint + Prettier + CI** (eslint.config.js, .prettierrc, jobs en deploy.yml).
- ◐ **Refactor parcial** de App.tsx (extracted `useUIState` hook, `HeaderDropdown` componente propio). Pendiente: extraer `useCircuit`, `useSimulation`, `useVhdl`.
- ⏳ **Tests de integración** UI (waveform, paleta).
- ✅ **Tipado estricto** en props — todas las 22 definiciones de componentes revisadas y completas, cero `any`.
- ✅ **Separación de responsabilidades** — UI state extraído a `hooks/useUIState.ts`, `HeaderDropdown` a componente propio, imports limpios.

## 8. Rendimiento

- ✅ **Clon profundo** en simulate(): eliminado, ahora muta in situ (commit clona una vez).
- ✅ **DeltaStep**: de 2 clones profundos a 1 solo snapshot + escritura directa.
- ✅ **Memoizar orden topológico**: ya implementado en settleModule (topoSort).
- ✅ **Virtualización del waveform SVG** (>500 ciclos → solo renderiza ciclos visibles).
- ⏳ **Web Worker** para simulación (no bloquear UI).

## 9. Despliegue

- ✅ GitHub Pages/Netlify (`npm run deploy` + CI/CD).
- ✅ PWA (service worker + manifest + offline).
- ✅ Docker multi-etapa (nginx alpine, puerto 80).
- ✅ `.env` configurable (`VITE_BASE_URL`, `VITE_ANALYTICS_ID`, `VITE_APP_TITLE`).
- ✅ Compartir por URL (hash base64).
- ✅ Preset waveform desde URL (`?preset=...`).
- ✅ Tour guiado (TourModal, 7 pasos, primera vez).
- ✅ Health check (localStorage, SW, conectividad, memoria).
- ✅ Analytics opcional (Google Analytics vía `VITE_ANALYTICS_ID`).
- ✅ CHANGELOG.md, LICENSE, PRIVACY.md.
- ⏳ **Capturas + GIF demo** en README.

## 10. Colaboración

- ⏳ Cuentas de usuario (login cloud).
- ⏳ Proyectos compartidos con permisos (vista/edición).
- ⏳ Edición colaborativa en tiempo real (WebSocket/CRDT).
- ⏳ Comentarios/anotaciones en el circuito.
- ⏳ Historial de cambios por usuario.
- ⏳ Galería pública de circuitos.
- ⏳ Fork/clonar circuito público.
- ⏳ Votaciones/valoraciones.
- ⏳ Perfil de usuario.
- ⏳ Notificaciones.

## 11. Legales

- ✅ LICENSE (MIT).
- ✅ SPDX-License-Identifier en todos los .ts/.tsx.
- ✅ THIRD_PARTY.md (dependencias y licencias).
- ✅ CONTRIBUTING.md (PRs, estilo, Conventional Commits).
- ✅ CODE_OF_CONDUCT.md (Contributor Covenant v2.1).
- ✅ SECURITY.md (reporte de vulnerabilidades).
- ✅ SUPPORT.md (issues, discussions).
- ✅ TERMS.md (términos de servicio).
- ✅ PRIVACY.md (política de privacidad).

## 12. Accesibilidad

- ✅ Navegación completa por teclado (Tab en paleta, botones, dropdowns).
- ✅ ARIA en todos los controles (aria-label, role, aria-expanded).
- ✅ Contraste WCAG 2.1 AA (modo alto contraste con fondo/foreground máximos).
- ✅ Tamaño de fuente ajustable (View → Fuente: Npx, 10–20px, variable CSS --font-size).
- ✅ Modo alto contraste (View → toggle, data-highcontrast, amarillo/azul sobre negro/blanco).
- ✅ Respetar `prefers-reduced-motion` (CSS media query + JS listener).
- ✅ `aria-live` para anuncios de estado (status bar con role="status" aria-live="polite").
- ✅ Foco visible en todos los elementos (:focus-visible global con 2px accent).
- ✅ Descripciones textuales en SVG (title + desc en gates, IO, flip-flops).
- ✅ Soporte táctil (touch-action: manipulation, min-height 44px en touch, tap-highlight transparent).

## 13. i18n

- ✅ Framework de i18n (contexto React personalizado, sin dependencias externas).
- ✅ Traducción al inglés (en.json, ~300 claves).
- ✅ Selector de idioma en UI (View → Language).
- ✅ Detección automática (`navigator.language` + persistencia en localStorage).
- ✅ Arquitectura preparada para traducciones comunitarias (JSON planos por idioma).
- ⏳ Formato localizado (`Intl`).
- ⏳ Documentación multilingüe.

## 14. Landing page, cuentas y suscripciones

### Landing page
- ✅ **Diseño profesional** con hero, features, demo interactiva embebida, precios y FAQ.
- ⏳ **Modo "presentación"** del simulador: banner fijo + tooltips explicativos para visitantes.
- ✅ **Demo sin registro**: circuito de ejemplo precargado con tabs (Circuito/Señales/Código VHDL).
- ⏳ **Meta tags OG** (Open Graph) para compartir en redes: titulo, descripción, preview del circuito.
- ⏳ **Blog / changelog público** con capture de nuevas features y tutoriales.
- ⏳ **SEO**: sitemap.xml, robots.txt, SSR/SSG para la landing (Next.js o Astro como micro-frontend).
- ✅ **Página de precios** con tabla comparativa (Free / Pro / Team).

### Autenticación y cuentas
- ✅ **Login con GitHub** (Supabase) — botón "Continuar con GitHub" en header y landing.
- ✅ **Login con GitLab** (Supabase) — alternativa para usuarios self-hosted / enterprise.
- ✅ **Login con email + magic link** (sin contraseña, vía Supabase).
- ✅ **Perfil de usuario**: avatar, nombre, bio, enlace a GitHub/GitLab, preferencias (tema, idioma, fontSize).
- ✅ **Persistencia cloud** de circuitos y proyectos asociados a la cuenta (Supabase).
- ✅ **Sesión persistente** (JWT + refresh token, Supabase autoRefreshToken).
- ✅ **Cerrar sesión** desde el menú de usuario.
- ✅ **Eliminación de cuenta** con exportación de datos (GDPR).

### Dashboard de proyectos
- ⏳ **Panel principal** al iniciar sesión: lista de proyectos del usuario con preview (miniatura SVG del circuito).
- ⏳ **Búsqueda y filtros**: por nombre, etiqueta, fecha, favorito, tipo (combinacional/secuencial/buses).
- ⏳ **Vista en cuadrícula / lista** toggleable.
- ⏳ **Proyectos compartidos** con permiso de solo lectura / edición.
- ⏳ **Historial de versiones** por proyecto (cada autoguardado crea un snapshot).
- ⏳ **Diff visual** entre dos versiones de un mismo circuito.
- ⏳ **Exportación masiva** (seleccionar varios → descargar ZIP con JSON + VHDL + PNG).
- ⏳ **Papelera / trash** con período de retención (30 días).
- ⏳ **Estadísticas** por proyecto (número de componentes, compuertas, FFs, nivel de profundidad).

### Colaboración
- ⏳ **Compartir por link** con permisos (vista / comentario / edición).
- ⏳ **Comentarios en nodos** (anotaciones sobre el circuito, visibles para colaboradores).
- ⏳ **Edición en tiempo real** (WebSocket + CRDT, p.ej. Yjs).
- ⏳ **Cursor de colaboradores** en el lienzo (ver dónde está editando cada uno).
- ⏳ **Historial de cambios** por usuario (quién movió qué y cuándo).

### Planes de suscripción

| Característica | Free | Pro | Team |
|---|---|---|---|---|
| Proyectos locales | Ilimitados | Ilimitados | Ilimitados |
| Proyectos cloud | 1 | 50 | Ilimitados |
| Componentes por proyecto | 25 | Ilimitado | Ilimitado |
| Colaboradores por proyecto | — | 3 | Ilimitado |
| Historial de versiones | — | 30 días | 1 año |
| Compartir por link (solo lectura) | ✅ | ✅ | ✅ |
| Compartir por link (edición) | — | ✅ | ✅ |
| Exportar PNG/SVG | Con marca de agua | Sin marca | Sin marca |
| Exportar VCD/CSV | — | ✅ | ✅ |
| Exportar JSON | ✅ | ✅ | ✅ |
| Exportar PDF | — | ✅ | ✅ |
| Editor VHDL con autocompletado | — | ✅ | ✅ |
| Diff visual de versiones | — | ✅ | ✅ |
| Integración GitHub/GitLab | ✅ | ✅ | ✅ |
| Colaboración en tiempo real | — | — | ✅ |
| Roles (admin/editor/viewer) | — | — | ✅ |
| SSO / SAML | — | — | ✅ |
| Auditoría de cambios | — | — | ✅ |
| API REST pública | — | 1000 req/día | Ilimitada |
| Almacenamiento cloud | 5 MB | 1 GB | 50 GB |
| Simulación remota (API) | — | 1000/mes | Ilimitada |
| Soporte | Comunidad | Email 48h | Prioridad 4h + Chat + Teléfono |
| Período de prueba | — | 14 días gratis | Demo guiada |
| Precio estimado | Gratis | $12/mes | $79/mes |

### Límites y enforcement
- ✅ **Free**: máx 1 proyecto cloud, 25 componentes por proyecto, exportación con marca de agua "Creado con LogicFlow". Sin colab. Sin historial. Almacenamiento 5 MB. Sin exportación VCD/CSV. Integración GitHub/GitLab incluida.
- ⏳ **Pro**: 50 proyectos cloud, componentes ilimitados, 3 colaboradores con edición, historial 30 días, diff visual, exportación PDF, editor VHDL avanzado, API 1000 req/día, 1 GB almacenamiento.
- ⏳ **Team**: proyectos cloud ilimitados, colaboradores ilimitados, roles, SSO, auditoría, API ilimitada, 50 GB, soporte prioritario 4h + teléfono.
- ⏳ **Medidor de uso** en dashboard: barra de proyectos usados / total, almacenamiento consumido, requests API del período.
- ⏳ **Bloqueo gradual**: al alcanzar el límite se muestra warning; 7 días después se deshabilitan creación y guardado cloud (los datos no se eliminan).
- ⏳ **Downgrade automático** al final del período de facturación si no se renueva.

### Configuración de cuenta
- ⏳ **Cambiar plan** desde el dashboard con confirmación y resumen de cambios.
- ⏳ **Métodos de pago**: tarjeta (Stripe), PayPal, transferencia (anual).
- ⏳ **Facturación recurrente** mensual o anual (descuento 20% anual).
- ⏳ **Historial de facturas** descargables en PDF.
- ⏳ **Actualizar email, nombre, avatar** desde settings de perfil.
- ⏳ **Cambiar contraseña** (para cuentas email, no OAuth).
- ⏳ **Conectar / desconectar OAuth** (GitHub, GitLab) desde settings.
- ⏳ **Preferencias de cuenta**: tema por defecto, idioma, layout de dashboard, zona horaria.
- ⏳ **Notificaciones** configurables: email cuando un proyecto es compartido, cuando un colaborador hace cambios, resumen semanal.
- ⏳ **Exportar todos mis datos** (GDPR): JSON con proyectos, perfil, facturas. Descargable desde settings.
- ⏳ **Eliminar cuenta** con confirmación en dos pasos y borrado completo tras 30 días.

### Procesamiento de pagos
- ⏳ **Stripe Connect** para pagos recurrentes (checkout session + webhooks).
- ⏳ **Stripe Customer Portal** para gestionar suscripción, método de pago, facturas.
- ⏳ **Cupones / descuentos** aplicables durante checkout (código promocional).
- ⏳ **Códigos de regalo** (canjear por X meses de Pro).
- ⏳ **Período de prueba** de 14 días para Pro y Pro Max, sin tarjeta requerida.
- ⏳ **Webhook de eventos** (proyecto compartido, colaborador añadido, exportación completada) para integraciones externas (Zapier / Make).
- ⏳ **API REST pública** con rate limiting por plan: CRUD de proyectos, exportación VHDL/VCD, ejecución de simulación remota.

### Infraestructura
- ⏳ **Dominio personalizado** (ej. app.logicflow.dev) con SSL automático (Cloudflare / Vercel).
- ⏳ **CDN** para assets estáticos y circuitos compartidos.
- ⏳ **Base de datos** (Postgres / SQLite via Turso) para cuentas, proyectos cloud, suscripciones.
- ⏳ **File storage** (S3 / R2) para snapshots de proyecto y exportaciones pesadas.
- ⏳ **Rate limiting** en API y endpoints de autenticación (Redis / Upstash).
- ⏳ **Logs estructurados** y métricas (Datadog / Grafana Cloud).
- ⏳ **CI/CD** con staging y production environments (Vercel Preview Deployments + GitHub Actions).

## 15. Ideas propuestas (nuevas)

### 🤖 AI / Machine Learning
- 🤖 **Generador de circuitos por prompt**: "hazme un contador BCD de 4 dígitos" → genera el circuito completo con VHDL.
- 🤖 **Depurador VHDL con IA**: pegar VHDL que no compila y que la IA explique el error y sugiera la corrección.
- 🤖 **Optimización automática**: detectar caminos críticos y sugerir reemplazo de lógica (ej. sumador ripple-carry → carry-lookahead).
- 🤖 **Traductor VHDL ↔ diagrama** inverso: foto de un diagrama en papel → IA la reconoce y genera el circuito.
- 🤖 **Chat contextual**: "explícame qué hace este flip-flop" o "¿por qué este bus está en X?" con selección en el lienzo.
- 🤖 **Tests automáticos**: IA genera estímulos de testbench que cubren todos los caminos del circuito.
- 🤖 **Tutor interactivo**: corrige ejercicios de estudiantes, explica conceptos (setup time, metastability, fan-out).

### 🎓 Educativo
- 🎓 **Modo lecciones**: tutorial interactivo paso a paso (desde compuertas básicas hasta FSM y pipeline).
- 🎓 **Curso VHDL embebido**: lecciones con ejercicios prácticos dentro del simulador, progreso guardado.
- 🎓 **Modo examen**: el profesor comparte un circuito incompleto, el estudiante lo termina, se evalúa automáticamente.
- 🎓 **Verificación de ejercicios**: comparar el circuito del alumno contra una solución de referencia (estructural y funcional).
- 🎓 **Tooltips didácticos**: al pasar el mouse sobre una compuerta, explicación de su tabla de verdad en lenguaje natural.
- 🎓 **Simulación paso a paso**: avanzar ciclo por ciclo con explicación de cada transición (como un debugger educativo).
- 🎓 **Gamificación**: logros por construir tu primer flip-flop, tu primer contador, tu primer FSM, etc.
- 🎓 **Compartir tareas**: link a un ejercicio con fecha de entrega, el profesor ve quién lo completó.

### 🧪 Testing & Verificación
- 🧪 **Cobertura de código VHDL**: qué líneas del VHDL se ejercieron durante la simulación.
- 🧪 **Cobertura de transiciones**: qué cambios de señal se probaron (toggle coverage).
- 🧪 **Verificación formal**: dado un circuito y una propiedad (ej. "Q nunca es X"), verificar formalmente (SAT/SMT).
- 🧪 **Property checking** (PSL/SVA): escribir aserciones en VHDL y verificarlas durante simulación.
- 🧪 **Fuzzing**: generar entradas aleatorias buscando crashes o valores X/Z inesperados.
- 🧪 **Regression testing**: cargar un suite de proyectos y verificar que todos dan el mismo resultado tras un cambio.
- 🧪 **Waveform diff**: superponer dos波形 y marcar diferencias visualmente.

### 📊 Visualización avanzada
- 📊 **Vista RTL** (Register Transfer Level): mostrar automáticamente el datapath y la controladora separados.
- 📊 **Diagrama temporal expandible**: hacer zoom a nivel de gate delay (picosegundos) para ver glitches reales.
- 📊 **Mapa de calor de actividad**: qué nodos conmutan más (consumo estimado de potencia).
- 📊 **Vista 2.5D / 3D**: apilar capas del circuito para visualizar chips complejos.
- 📊 **Timeline de eventos** tipo Gantt: cada señal es una fila, los eventos son puntos en el tiempo con tooltip.
- 📊 **Carnaugh map interactivo**: para simplificar lógica combinacional a partir de la tabla de verdad.
- 📊 **Diagramas de Bode / Nyquist** para circuitos analógicos mixtos (si se extiende a analógico).

### 🔌 Integraciones
- 🔌 **Exportar a Verilog / SystemVerilog**: además de VHDL, generar código para otras herramientas.
- 🔌 **Exportar a Logisim / Digital**: formato compatible con herramientas educativas populares.
- 🔌 **Importar desde EDA tools**: leer netlist EDIF, SPICE, Verilog de Vivado/Quartus/Yosys.
- 🔌 **Plugin VS Code**: abrir `.vhd` y ver el diagrama en un panel de VS Code.
- 🔌 **CLI tool**: `simlog compile counter.vhd -o counter.json --waveform --format vcd`.
- 🔌 **CI/CD integration**: GitHub Action que corre simulación en CI y publica waveform como artifact.
- 🔌 **Webhook / API**: integrar con moodle, canvas, blackboard para calificar ejercicios automáticamente.
- 🔌 **MATLAB / Octave export**: coeficientes de filtros, tablas de verdad para procesamiento de señales.
- 🔌 **Python bindings (Pyodide / Wasm)**: manipular circuitos desde Python en el navegador (ej. generar 1000 tests con Python loop).

### 📱 Plataforma
- 📱 **PWA avanzada**: instalable en mobile con gestos táctiles (pinch zoom, drag, tap para seleccionar).
- 📱 **App nativa** (Capacitor / Tauri): publicación en App Store y Play Store con capacidades offline.
- 📱 **Electron / Tauri desktop**: versión de escritorio con menú nativo, atajos globales, integración con el sistema de archivos.
- 📱 **WebShare API**: compartir circuito directamente desde el navegador a WhatsApp, Telegram, etc.
- 📱 **QR code** por circuito: escanear → abrir en el simulador (útil para talleres y clases presenciales).

### 🎨 UI/UX avanzado
- 🎨 **Editor de skin / tema**: colores personalizables para compuertas, cables, fondos (tema Synthwave, Hacker, Matrix...).
- 🎨 **Iconos de circuito**: elegir entre varias paletas de iconos (clásico, minimalista, retro, flat).
- 🎨 **Modo presentación**: oculta toda la UI, deja solo el lienzo + waveform en pantalla completa.
- 🎨 **Exportar a video**: grabar la simolución como GIF animado o MP4 con los waveforms en tiempo real.
- 🎨 **Editor visual de VHDL**: coloreado de sintaxis, plegado de bloques, autocompletado, linting en vivo.
- 🎨 **Musicalización de circuitos**: mapear señales a notas MIDI — oír cómo suena tu contador binario.
- 🎨 **Modo oscuro extremo** (OLED): fondo negro puro, líneas tenues, para sesiones largas de debugging.

### 🏗️ Componentes nuevos
- 🏗️ **ROM / RAM**: memoria con inicialización desde archivo `.hex` o `.mif`.
- 🏗️ **ALU parametrizable**: sumador, restador, AND, OR, XOR, shift, comparador — ancho configurable.
- 🏗️ **Multiplexor / Demultiplexor**: árbol de selección genérico.
- 🏗️ **Decodificador / Codificador**: BCD a 7-segmentos, prioridad, etc.
- 🏗️ **LFSR** (Linear Feedback Shift Register): para generación de números pseudo-aleatorios.
- 🏗️ **Divisor de frecuencia** genérico: reloj de salida con cualquier relación de división (no solo potencias de 2).
- 🏗️ **FIFO**: memoria circular con flags full/empty/programable.
- 🏗️ **Pipeline register**: para insertar en caminos largos y visualizar stages.
- 🏗️ **Contador BCD / Johnson / Ring**: variantes de contadores didácticos.
- 🏗️ **Display 7 segmentos**: componente de salida que simula visualmente un display físico.
- 🏗️ **Pulse button / Debouncer**: botón con anti-rebote configurable.
- 🏗️ **Sliding window / shift register genérico**: con load, shift left/right, rotación.

### 🎛️ Editor de componentes personalizados
- 🎛️ **Editor visual de forma**: dibujar la silueta del componente (rectangular, cuadrado, trapezoidal, icono SVG) con handles redimensionables.
- 🎛️ **Posición libre de pines**: arrastrar cada entrada/salida/reloj/reset a cualquier lugar del perímetro o interior del componente.
- 🎛️ **Pines agrupados**: agrupar pines lógicamente (ej. `data_in[7:0]` como un bus) con etiqueta compartida y separación visual.
- 🎛️ **Lados predefinidos**: pin pad con snapping a izquierda (entradas), derecha (salidas), arriba (reloj/reset), abajo (control/vcc/gnd).
- 🎛️ **Pines bidireccionales** (inout): pin con flecha doble y estilo diferenciado (triángulo hacia ambos lados).
- 🎛️ **Ancho de bus por pin**: cada pin puede ser `std_logic` o `std_logic_vector(N-1 downto 0)` con selector numérico.
- 🎛️ **Nombre y descripción**: editor inline para renombrar el componente y añadir documentación.
- 🎛️ **Parámetros genéricos**: definir `generic` map (ej. `N : integer := 8`) con valores por defecto editables al instanciar.
- 🎛️ **VHDL asociado**: campo de texto donde pegar el VHDL real del componente, con autodetección de puertos para mapeo automático.
- 🎛️ **Preview en tiempo real**: vista previa del componente en el lienzo mientras se edita, con actualización instantánea.
- 🎛️ **Exportar / importar componente**: archivo `.simcomp` (JSON) para compartir componentes personalizados con la comunidad.
- 🎛️ **Paleta personalizada**: los componentes creados aparecen en una sección "Mis componentes" en la paleta del editor.
- 🎛️ **Versionado** de componentes: cada edición genera una nueva versión, con historial de cambios y rollback.

### 🔌 Compatibilidad con Verilog / SystemVerilog
- 🔌 **Lexer Verilog**: tokenizar `module`, `input`, `output`, `wire`, `reg`, `assign`, `always`, `@(posedge clk)`, `case`, `if/else`, operadores (`&`, `|`, `^`, `~`, `+`, `<<`, etc.).
- 🔌 **Parser → AST**: construir árbol sintáctico Verilog con detección de módulos, puertos, señales internas, asignaciones continuas y procedurales.
- 🔌 **AST → engine**: traducir a la representación interna del simulador (nodos, conexiones, FFs) para simular circuitos Verilog directamente.
- 🔌 **Diagrama desde Verilog**: `module counter(input clk, input rst, output reg [3:0] q)` → genera el diagrama de bloques con compuertas y FFs.
- 🔌 **Verilog desde diagrama**: exportar el circuito actual como módulo Verilog sintetizable (estilo RTL).
- 🔌 **Selector de lenguaje por proyecto**: cada proyecto puede ser VHDL, Verilog o SystemVerilog, con indicador visual en el header.
- 🔌 **Modo mixto VHDL + Verilog**: instanciar un módulo Verilog dentro de un proyecto VHDL y viceversa (co-simulación).
- 🔌 **SystemVerilog**: soporte para `logic`, `always_ff`, `always_comb`, `interface`, `modport`, `enum`, `struct`, `package`.
- 🔌 **Directivas de síntesis**: `// synopsys translate_off/on`, `/* synthesis keep */`, etc.
- 🔌 **Preprocesador `` `define``, `` `include``, `` `ifdef``**: soporte básico de macros Verilog.
- 🔌 **Biblioteca de primitivas Verilog**: `and`, `or`, `not`, `nand`, `nor`, `xor`, `xnor`, `buf`, `notif1`, `tran`, etc.
- 🔌 **SDF annotation**: leer archivo `.sdf` (Standard Delay Format) para simulación con delays reales post-síntesis.
- 🔌 **Exportar testbench Verilog**: generar módulo `testbench` con estímulos y `$dumpvars` / `$monitor` para simular con iverilog / ModelSim.
- 🔌 **Importar desde EDA tools**: soporte para netlist Verilog post-síntesis de Vivado, Quartus, Yosys.

### 🔗 Integración Git (GitHub / GitLab) para proyectos
- 🔗 **Inicializar repositorio**: al crear un proyecto cloud, opción "Inicializar con Git" que crea un repo en GitHub/GitLab vía API y hace el primer commit con la estructura base (`.gitignore`, `README.md`, `circuit.json`, `project.json`).
- 🔗 **Login OAuth + repo scope**: al conectar GitHub/GitLab desde configuración de cuenta, solicitar scope `repo` para poder crear/leer repositorios en nombre del usuario.
- 🔗 **Commit desde el editor**: botón "Commit" en el header con modal para escribir mensaje, ver diff de lo que cambió (estructura JSON del circuito), y hacer commit + push directo.
- 🔗 **Branch selector**: dropdown para cambiar de rama, crear rama nueva, ver en qué rama estás trabajando.
- 🔗 **Historial de commits**: timeline visual con mensaje, autor, fecha, hash — y botón para ver el diff de ese commit.
- 🔗 **Pull / sync**: botón para traer cambios remotos (si alguien más hizo push) con detección de conflictos.
- 🔗 **Resolución de conflictos**: si hay conflicto entre versión local y remota, mostrar editor side-by-side para elegir qué cambios conservar.
- 🔗 **Tags / releases**: crear tags semánticos (`v1.0.0`, `v2.1.0`) desde la UI, con release notes y auto-generación de changelog.
- 🔗 **Visual diff de circuitos**: comparar dos commits y mostrar visualmente qué nodos cambiaron, qué conexiones se agregaron/eliminaron (resaltado en verde/rojo sobre el diagrama).
- 🔗 **Blame por nodo**: click derecho en un nodo → "Git Blame" → muestra en qué commit y por quién fue modificado por última vez ese nodo.
- 🔗 **Webhook CI/CD**: al hacer push, disparar un webhook que corre la simulación y publica los resultados (waveform, testbench) como artifact del commit.
- 🔗 **Auto-backup con Git**: cada autoguardado puede ser un commit automático con mensaje "Autosave YYYY-MM-DD HH:mm:ss" para tener trazabilidad completa.
- 🔗 **README.md auto-generado**: al hacer commit por primera vez, generar un README con el nombre del proyecto, descripción, preview del circuito (SVG embebido), tabla de puertos, y enlace para abrir en el simulador.
- 🔗 **Template `.gitignore`**: incluir `dist/`, `node_modules/`, `*.log`, `.env` por defecto con opción a personalizar.
- 🔗 **Ver archivos del repo**: explorador de archivos dentro del dashboard (`.gitignore`, `README.md`, `circuit.json`, `*.vhd`, `*.v`, `testbench/`, `docs/`).
- 🔗 **Clone URL**: mostrar la URL HTTPS/SSH para clonar el repo y trabajar localmente (útil para usuarios avanzados que quieren editar VHDL en su editor favorito y luego hacer push).
- 🔗 **GitHub Pages / GitLab Pages**: al crear un tag, publicar automáticamente el circuito como página web estática (demo interactiva embebida).
- 🔗 **Desconectar repo**: opción para desvincular el proyecto de Git (el repo remoto no se elimina, solo se quita el enlace desde la plataforma).

### ⚡ Performance
- ⚡ **Web Worker para simulación**: la simulación corre en un hilo separado, la UI nunca se congela.
- ⚡ **Simulación remota**: descargar la simulación a un servidor (o cluster) para circuitos enormes (>10K compuertas).
- ⚡ **Virtual scrolling del waveform**: renderizar solo las señales visibles en pantalla.
- ⚡ **Memoización extrema**: cachear resultados de subcircuitos que no han cambiado entre ticks.
- ⚡ **Compilación a WebAssembly** del motor de simulación (C++ → Wasm) para acelerar 10x.
- ⚡ **Incremental update**: solo reevaluar nodos afectados por cambios de entrada (event-driven en vez de tick global).
- ⚡ **Snapshotting eficiente**: para undo/redo, guardar deltas (comprimidos) en vez del circuito completo.
- ⚡ **Lazy loading de la librería**: no cargar todos los templates y componentes al inicio, solo los más usados.

### 🔐 Seguridad y compliance
- 🔐 **SOC2 / ISO 27001** (si hay clientes enterprise).
- 🔐 **Audit logs** de acceso a proyectos cloud.
- 🔐 **Cifrado extremo a extremo** para proyectos compartidos (solo el dueño y colaboradores pueden leer).
- 🔐 **Cumplimiento GDPR** completo (derecho al olvido, portabilidad, DPA).
- 🔐 **Penetration testing** automatizado en CI.
- 🔐 **Rate limiting + captcha** en login/register para evitar ataques de fuerza bruta.
- 🔐 **CORS / CSP** estrictos en la API.
- 🔐 **Self-hosted option** (Docker image completa para empresas que no pueden enviar datos a la nube).

---

## Priorización sugerida

| Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|
| Tests unitarios motor/VHDL (§7) | Alto | Bajo | ✅ Resuelto |
| Ciclo de trabajo configurable (§2) | Bajo | Bajo | ⭐ |
| Menú contextual en lienzo (§5) | Medio | Bajo | ⭐ |
| Tooltips en puertos (§5) | Medio | Bajo | ⭐ |
| Zoom con rueda en waveform (§4) | Medio | Bajo | ✅ Resuelto |
| Auto-scroll al simular (§4) | Medio | Bajo | ✅ Resuelto |
| Búsqueda/filtro de proyectos (§6) | Medio | Bajo | ✅ Resuelto |
| Etiqueta tipo FF en traza waveform (§4) | Bajo | Muy bajo | ✅ Resuelto |
| Changelog/versionado semántico (§9) | Medio | Bajo | ✅ Resuelto |
| Accesibilidad por teclado (§12) | Alto | Medio | ✅ Resuelto |
| Detección de latches implícitos (§3) | Alto | Medio | ⭐ |
| i18n es/en (§13) | Medio | Medio | ✅ Resuelto |
| Exportar diagrama como imagen (§5) | Medio | Medio | — |
| Agrupación jerárquica señales (§4) | Medio | Medio | ✅ Resuelto |
| Plantillas de proyecto (§6) | Medio | Medio | ✅ Resuelto |
| Formateador VHDL (§3) | Medio | Medio | — |
| `generate`/`for generate` (§3) | Medio | Medio | — |
| Historial de versiones proyecto (§6) | Medio | Alto | — |
| Auto-backup cloud (§6) | Bajo | Alto | — |
| Refactor App.tsx a hooks/store (§7) | Medio | Medio | Deuda técnica |
| Virtualización del waveform (§8) | Medio | Alto | Cuando escale |
| Web Worker simulación (§8) | Bajo | Medio | Cuando escale |
| Landing page + demo interactiva (§14) | Alto | Medio | ✅ Resuelto |
| OAuth GitHub/GitLab (§14) | Alto | Alto | Cuando escale |
| Dashboard de proyectos (§14) | Alto | Muy alto | Cuando escale |
| Planes Free / Pro / Team (§14) | Alto | Alto | ✅ Resuelto |
| Configuración de cuenta (§14) | Medio | Medio | Cuando escale |
| Stripe + facturación (§14) | Alto | Muy alto | Cuando escale |
| Colaboración en tiempo real (§14) | Alto | Muy alto | Cuando escale |
| API REST pública (§14) | Medio | Alto | Cuando escale |
| Galería pública circuitos (§14) | Medio | Alto | Cuando escale |
| Soporte `numeric_std` (§3) | Alto | Alto | Estratégica |
| Entradas flotantes (L8) / Bucles (L6) | Alto | Bajo | ✅ Resuelto |
| Exportar VCD / testbench (§3,§4) | Medio | Medio | ✅ Resuelto |
| i18n | Medio | Medio | ✅ Resuelto |
| Múltiples cursores/marcadores (§4) | Medio | Bajo | ✅ Resuelto |
| Exportar CSV/JSON (§4) | Medio | Bajo | ✅ Resuelto |
| Lista de transiciones en waveform (§4) | Bajo | Bajo | ✅ Resuelto |
| Resaltado de glitches (§4) | Bajo | Bajo | ✅ Resuelto |
| Colapsar categorías en paleta (§5) | Bajo | Bajo | ✅ Resuelto |
| Modo oscuro automático `prefers-color-scheme` (§5) | Bajo | Muy bajo | ✅ Resuelto |

### Quick wins (editor)
1. Tests Vitest del motor, `vhdl.ts`, `expr.ts`
2. ✅ Etiqueta tipo FF en waveform
3. ✅ Zoom con rueda en waveform
4. ✅ Auto-scroll del waveform al simular
5. ✅ Múltiples cursores/marcadores
6. ✅ Exportar CSV/JSON
7. ✅ Vista de transiciones
8. ✅ Resaltado de glitches
9. ✅ Agrupación jerárquica de señales
10. Tooltips en puertos (handles)
11. Menú contextual en lienzo
19. ✅ Colapsar categorías en paleta
20. ✅ Modo oscuro automático (`prefers-color-scheme`)
12. ✅ Búsqueda de proyectos + etiquetas + descripción
13. ✅ Backup export/import completo
14. ✅ Proyectos recientes + favoritos
15. ✅ Plantillas de proyecto (12)
16. ✅ Autoguardado configurable + beforeunload
17. ✅ Versionado de librería
18. Ciclo de trabajo configurable en relojes

---

# 🚀 Roadmap SaaS — "100% funcional"

> Objetivo: convertir el simulador (hoy una SPA local-first) en un **SaaS completo**
> con landing pública, cuentas, dashboard, persistencia cloud, colaboración, pagos
> recurrentes, API pública y CI/CD productivo. Esta sección concreta lo esbozado en
> §14 con arquitectura, fases entregables y criterios de aceptación.

## 16. Arquitectura objetivo

### 16.1 Topología de monorepo
- ⏳ **Migrar a monorepo** (pnpm workspaces + Turborepo) con paquetes:
  - `apps/web` — SPA actual (editor/simulador), build Vite, deploy CDN.
  - `apps/landing` — landing + marketing + blog/changelog (Astro o Next.js SSG para SEO).
  - `apps/dashboard` — panel autenticado (proyectos, settings, billing, equipo).
  - `apps/api` — backend (Hono/Fastify en edge o Node) con auth, CRUD, billing, API pública.
  - `packages/engine` — motor de simulación puro (sin DOM) reutilizable en web, API y CLI.
  - `packages/vhdl` — lexer/parser/exporter VHDL/Verilog compartido.
  - `packages/ui` — design system (componentes, tokens, tema claro/oscuro) compartido.
  - `packages/sdk` — cliente TypeScript tipado de la API pública (consumido por web/dashboard/CLI).
  - `packages/schema` — tipos Zod + tipos DB compartidos (single source of truth de contratos).
- ⏳ **Extraer el motor a `packages/engine`** como prerequisito: hoy vive acoplado a la SPA;
  separarlo habilita simulación server-side (API) y CLI sin DOM.
- ⏳ **Contratos tipados extremo-a-extremo**: esquemas Zod en `packages/schema`, validados en
  API (request/response) y reutilizados por el SDK → cero drift entre front y back.

### 16.2 Stack recomendado
- **Frontend**: React + Vite (web), Astro (landing), Next.js opcional (dashboard SSR).
- **Backend**: Hono o Fastify; despliegue serverless (Vercel/Cloudflare Workers) o contenedor.
- **DB**: Postgres gestionado (Supabase / Neon / Turso-libSQL). Drizzle ORM + migraciones versionadas.
- **Auth**: Auth.js (NextAuth) o Lucia; OAuth GitHub/GitLab/Google + magic-link (Resend).
- **Storage**: S3 / Cloudflare R2 para snapshots, miniaturas SVG y exportaciones pesadas.
- **Cache / rate-limit / colas**: Upstash Redis.
- **Pagos**: Stripe (Checkout + Customer Portal + Webhooks).
- **Observabilidad**: Sentry (errores), PostHog (producto/analytics), Grafana/Datadog (infra).
- **Email transaccional**: Resend o Postmark (magic-link, recibos, notificaciones).

## 17. Landing page (apps/landing)

- ⏳ **Hero** con propuesta de valor, CTA "Pruébalo gratis" y "Ver demo", captura/animación del editor.
- ⏳ **Demo embebida sin registro**: iframe del editor con circuito de ejemplo precargado + tour.
- ⏳ **Sección features** con bloques (motor 4 estados, VHDL⇄diagrama, waveform, buses, colaboración).
- ⏳ **Tabla de precios** (Free / Estudiante / Pro / Pro Max / Team) que consume el catálogo real de Stripe.
- ⏳ **FAQ**, **testimonios**, **logos de universidades/empresas**.
- ⏳ **Blog / changelog público** (MD/MDX) con RSS, para SEO y anuncios de releases.
- ⏳ **SEO técnico**: SSG, `sitemap.xml`, `robots.txt`, datos estructurados (JSON-LD), canonical.
- ⏳ **Open Graph / Twitter Cards** por página, con preview dinámico del circuito (OG image gen).
- ⏳ **i18n** de la landing (es/en) reutilizando el framework existente.
- ⏳ **Analítica de conversión** (PostHog funnels: visita → demo → registro → upgrade).
- ⏳ **Cumplimiento**: banner de cookies/consentimiento, enlaces a TERMS/PRIVACY ya existentes.

## 18. Dashboard de proyectos (apps/dashboard)

### 18.1 Núcleo
- ⏳ **Home autenticado**: grid/lista de proyectos con **miniatura SVG** generada del circuito.
- ⏳ **Toggle grid/lista**, ordenar por fecha/nombre/tamaño, **búsqueda y filtros** (etiqueta, tipo, favorito).
- ⏳ **Crear / abrir / renombrar / duplicar / eliminar** proyecto desde el dashboard (abre en `apps/web`).
- ⏳ **Papelera / trash** con retención 30 días y restauración.
- ⏳ **Estadísticas por proyecto**: nº de componentes, compuertas, FFs, profundidad, último editado.
- ⏳ **Medidor de uso**: barras de proyectos cloud / almacenamiento / requests API del período.
- ⏳ **Onboarding**: estado vacío con plantillas destacadas e importación rápida.

### 18.2 Importar proyectos y componentes desde el dashboard con **auto-reload**
> Feature pedida explícitamente: una fuente "alojada en el dashboard" que el editor
> consume y recarga automáticamente cuando cambia.

- ⏳ **Biblioteca central en el dashboard**: el usuario sube/gestiona proyectos (`circuit.json`)
  y componentes personalizados (`.simcomp`) en un repositorio cloud propio ("Mi biblioteca").
- ⏳ **Importar al editor desde el dashboard**: botón "Importar de mi biblioteca" en `apps/web`
  que lista proyectos/componentes del usuario (vía API) y los inyecta en el lienzo o en la paleta.
- ⏳ **Auto-reload en vivo**: cuando un componente/proyecto cambia en el dashboard (o lo cambia un
  colaborador), el editor abierto recibe el evento y ofrece **recargar** (o recarga en caliente si
  no hay cambios locales sin guardar). Mecanismos:
  - **SSE / WebSocket** desde la API para empujar `library.updated` / `project.updated`.
  - **ETag + polling** de respaldo cuando no hay WebSocket disponible.
  - **`BroadcastChannel`** para sincronizar pestañas abiertas del mismo usuario.
- ⏳ **Resolución de conflictos en reload**: si hay ediciones locales sin guardar, mostrar diff y
  dejar elegir "mantener local / traer remoto / fusionar".
- ⏳ **Componentes vinculados (linked)**: un componente importado puede quedar "enlazado" a la
  biblioteca; al actualizarse el origen, todas las instancias se actualizan (con versión pinneada
  opcional para evitar roturas — `^1.2.0` vs `=1.2.0`).
- ⏳ **Versionado de la biblioteca cloud**: cada componente/proyecto guarda historial con rollback
  (reusa el versionado de librería local ya existente, ahora respaldado en DB).
- ⏳ **Permisos**: la biblioteca puede ser privada, compartida con el equipo o pública (galería).
- ⏳ **Caché offline** (IndexedDB / SW) de la biblioteca importada para seguir trabajando sin red,
  con re-sincronización al reconectar.

### 18.3 Historial y diff cloud
- ⏳ **Historial de versiones** por proyecto: cada autoguardado cloud crea un snapshot (deltas).
- ⏳ **Diff visual de circuitos** entre dos versiones (nodos/conexiones añadidos/eliminados en verde/rojo).
- ⏳ **Exportación masiva** (multi-selección → ZIP con JSON + VHDL + PNG).

## 19. Autenticación y cuentas (apps/api)

- ⏳ **OAuth GitHub / GitLab / Google** + **magic-link** por email (passwordless).
- ⏳ **Sesión** con JWT de acceso corto + refresh token rotativo; expiry configurable.
- ⏳ **Perfil**: avatar, nombre, bio, enlaces, preferencias (tema/idioma/fontSize) sincronizadas cloud.
- ⏳ **Settings de cuenta**: cambiar email/nombre/avatar, conectar/desconectar OAuth, cambiar contraseña (solo email).
- ⏳ **Equipos / organizaciones**: invitar miembros, roles (admin/editor/viewer), proyectos compartidos.
- ⏳ **Seguridad**: rate-limit + captcha en login/register, verificación de email, 2FA opcional (TOTP).
- ⏳ **GDPR**: "Exportar todos mis datos" (JSON) y "Eliminar cuenta" en dos pasos con borrado a 30 días.
- ⏳ **Verificación de plan Estudiante**: dominio `.edu`/`.edu.mx` o SheerID.

## 20. Pagos y suscripciones (Stripe)

- ⏳ **Catálogo de planes** definido en Stripe (Products + Prices mensual/anual, -20% anual).
- ⏳ **Stripe Checkout** (sesión hospedada) para alta/upgrade; **Customer Portal** para gestionar
  suscripción, método de pago y facturas.
- ⏳ **Webhooks** (`checkout.session.completed`, `customer.subscription.updated/deleted`,
  `invoice.paid/payment_failed`) → sincronizan estado de plan en la DB (fuente de verdad: Stripe,
  reflejada localmente con idempotencia y verificación de firma).
- ⏳ **Período de prueba 14 días** (Pro / Pro Max) sin tarjeta; downgrade automático al expirar.
- ⏳ **Cupones / códigos promocionales** y **códigos de regalo** (canjeables por N meses).
- ⏳ **Historial de facturas** descargable (PDF de Stripe).
- ⏳ **Enforcement de límites** (middleware): proyectos cloud, componentes/proyecto, colaboradores,
  retención de historial, almacenamiento, cuota de API y de simulación remota — por plan.
- ⏳ **Bloqueo gradual** al superar límite: warning → a los 7 días se deshabilita crear/guardar cloud
  (los datos nunca se borran). Marca de agua en exportación solo en Free.
- ⏳ **Dunning**: reintentos y emails ante pago fallido antes de degradar.

## 21. API REST pública + SDK

- ⏳ **Endpoints**: CRUD de proyectos, importar/exportar VHDL/Verilog/VCD, **simulación remota**,
  generación de testbench, render de miniatura SVG.
- ⏳ **Autenticación por API key** (por usuario/equipo) con **rate-limiting por plan** (Redis).
- ⏳ **OpenAPI / Swagger** autogenerado desde los esquemas Zod; **SDK TypeScript** publicado a npm.
- ⏳ **Webhooks salientes** (proyecto compartido, colaborador añadido, export completada) para Zapier/Make.
- ⏳ **CLI `simlog`**: `simlog compile counter.vhd -o out.json --waveform --format vcd` usando `packages/engine`.
- ⏳ **GitHub Action** oficial: corre simulación en CI y publica waveform/VCD como artifact.

## 22. Colaboración

- ⏳ **Compartir por link** con permisos (vista / comentario / edición), revocable y con expiración.
- ⏳ **Comentarios/anotaciones en nodos**, visibles para colaboradores.
- ⏳ **Edición en tiempo real** (WebSocket + CRDT, Yjs) con **cursores de colaboradores** en el lienzo.
- ⏳ **Presencia y "quién está viendo"**; historial de cambios por usuario (blame por nodo).
- ⏳ **Galería pública** de circuitos con fork/clonar, valoraciones y perfiles.

## 23. CI/CD productivo

- ⏳ **Pipeline por PR** (GitHub Actions): `lint` + `typecheck` + `test` (Vitest) + `build` de todos los
  paquetes con **Turborepo remote cache** (solo reconstruye lo afectado).
- ⏳ **Preview deployments** por PR (Vercel/Cloudflare) para web, landing y dashboard, con URL en el PR.
- ⏳ **Tests E2E** (Playwright) contra el preview: smoke del editor, login, checkout en modo test de Stripe.
- ⏳ **Migraciones de DB** versionadas (Drizzle) aplicadas automáticamente en deploy de `staging`/`prod`,
  con rollback documentado.
- ⏳ **Entornos**: `preview` (efímero por PR) → `staging` (rama principal) → `production` (tag/release).
- ⏳ **Release automatizado**: Changesets para versionar paquetes + generar CHANGELOG + publicar SDK/CLI a npm.
- ⏳ **Calidad como gate**: cobertura mínima, `tsc --noEmit` limpio, ESLint sin errores, audit de deps.
- ⏳ **Seguridad en CI**: `npm audit`/Snyk, escaneo de secretos (gitleaks), SAST, Dependabot/Renovate.
- ⏳ **Monitoreo post-deploy**: health checks, smoke tests sintéticos, alertas (Sentry/Grafana) y
  feature flags para rollouts graduales y kill-switch.
- ⏳ **IaC**: definir infra (DB, buckets, DNS, CDN) como código (Terraform/Pulumi) para reproducibilidad.

## 24. Infraestructura y operación

- ⏳ **Dominio + SSL automático** (Cloudflare/Vercel), `app.` para dashboard/editor y raíz para landing.
- ⏳ **CDN** para assets y circuitos públicos compartidos.
- ⏳ **Backups automáticos** de la DB (point-in-time recovery) y de R2/S3.
- ⏳ **Logs estructurados + métricas + trazas** (OpenTelemetry → Grafana/Datadog).
- ⏳ **Self-hosted option**: imagen Docker Compose completa (app + API + Postgres + Redis) para enterprise.
- ⏳ **Status page** pública (uptime) y runbook de incidentes.

## 25. Seguridad y compliance (SaaS)

- ⏳ **CORS/CSP estrictos**, headers de seguridad (HSTS, X-Frame-Options) en API y apps.
- ⏳ **Audit logs** de acceso/modificación de proyectos cloud (requerido para Team/Enterprise).
- ⏳ **Cifrado** en tránsito (TLS) y en reposo (DB/almacenamiento); secretos en vault/secret manager.
- ⏳ **Pentesting** automatizado en CI y revisión manual previa a GA.
- ⏳ **GDPR/DPA** completo (derecho al olvido, portabilidad), **SOC2/ISO 27001** si hay enterprise.
- ⏳ **Aislamiento multi-tenant**: row-level security en Postgres por `user_id`/`org_id`.

## 26. Fases de entrega (orden sugerido)

| Fase | Alcance | Resultado |
|---|---|---|
| **F0 — Preparación** | Monorepo (pnpm+Turbo), extraer `packages/engine` y `packages/vhdl`, design system `packages/ui`, CI lint/test/build con cache | Base reutilizable; cero regresiones (91+ tests verdes) |
| **F1 — Pública** | Landing (Astro SSG) + SEO/OG + demo embebida + blog/changelog | Captación y marketing en producción |
| **F2 — Cuentas** | API + Auth (OAuth/magic-link) + perfil + persistencia cloud de proyectos | Login y "mis proyectos" en la nube |
| **F3 — Dashboard** | Panel, miniaturas, búsqueda/filtros, papelera, **biblioteca + import con auto-reload**, historial/diff | Gestión completa de proyectos cloud |
| **F4 — Monetización** | Stripe (Checkout/Portal/Webhooks), planes, enforcement de límites, facturación | SaaS cobrando, con límites por plan |
| **F5 — Colaboración** | Compartir con permisos, comentarios, tiempo real (Yjs), cursores | Trabajo en equipo |
| **F6 — Plataforma** | API pública + SDK + CLI + GitHub Action; galería pública | Ecosistema e integraciones |
| **F7 — Enterprise** | SSO/SAML, roles, audit logs, self-hosted, SOC2/GDPR, IaC | Ventas enterprise |

### Criterios de "100% funcional" (Definition of Done del SaaS)
- [ ] Un visitante anónimo puede: ver landing, probar demo, registrarse.
- [ ] Un usuario puede: iniciar sesión, crear/editar/guardar proyectos en la nube y verlos en el dashboard.
- [ ] **Importar proyectos/componentes desde su biblioteca del dashboard y recibir auto-reload** al cambiar el origen.
- [ ] Un usuario puede suscribirse, pagar (Stripe test→live), y los **límites de su plan se aplican**.
- [ ] Equipos pueden colaborar (compartir con permisos; tiempo real en planes que lo incluyen).
- [ ] API pública + SDK funcionando con rate-limit por plan.
- [ ] **CI/CD**: cada PR pasa lint/typecheck/test/E2E y genera preview; merge despliega staging; tag despliega prod.
- [ ] Observabilidad, backups y status page activos; cumplimiento GDPR operativo.

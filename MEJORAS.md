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
- ⏳ **Ciclo de trabajo configurable**: solo divisor de frecuencia, no duty cycle.
- ⏳ **Cota `n+6` en `settleModule`**: usar orden topológico real o convergencia por cambio neto.
- ⏳ **Múltiples drivers (wired-AND/OR)**: resolver según tipo open-drain/push-pull.
- ⏳ **Retardos individuales** por compuerta (`tPLH`/`tPHL`).
- ⏳ **Señal `'U'`** (uninitialized): no modelada; puede ocultar bugs.
- ⏳ **Señal `'-'`** (don't care): no modelada.
- ⏳ **Race conditions**: no se advierten caminos críticos.
- ⏳ **ROM/RAM**: no hay componente de memoria.

## 3. VHDL (entrada y salida)

- ✅ **`component`/`port map`** en importador (L1) — round-trip completo.
- ✅ **Testbench** automático desde estímulos del waveform.
- ✅ **Exportar VCD** para GTKWave/ModelSim.
- ✅ **`when/else`** y **`with/select`** → multiplexores.
- ✅ **Linter** con errores por línea (paréntesis, entity/architecture/process).
- ✅ **Reset asíncrono** round-trip: `if rst='1'... elsif rising_edge...`.
- ◐ **`STD_LOGIC_VECTOR`** en parser: importa registros vectoriales e indexadas `x(i)`; exportación completa de buses; **reimportar** puertos vectoriales como buses aún pendiente.
- ⏳ **`case`/`if-elsif`** en procesos (más allá de `rising_edge`).
- ⏳ **`generic`** (ancho parametrizable).
- ⏳ **`when/else` anidados y `with/select` multibit**: solo condiciones de 1 bit.
- ✅ **Testbench con buses vectoriales**.
- ✅ **Validación semántica**: señales sin declarar, puertos sin usar, end entity.
- ⏳ **`generate`/`for generate`**.
- ⏳ **`numeric_std`/`std_logic_arith`**: operaciones aritméticas no se traducen.
- ⏳ **Múltiples arquitecturas**: parser solo procesa la primera.
- ⏳ **Variables de proceso (`variable`)**.
- ⏳ **`after`/`transport`/`inertial`**.
- ⏳ **`wait for`/`wait until`**: solo entiende `rising_edge`.
- ⏳ **`others`** en asignaciones vectoriales: usa concatenación explícita.
- ⏳ **`alias` y atributos** (`'range`, `'high`, `'low`).
- ⏳ **Tipos `unsigned`/`signed`**: sin conversión.
- ⏳ **Formateador/prettifier** de VHDL.
- ⏳ **Auto-completado** en editor VHDL.
- ⏳ **Detección de latches implícitos**.

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
- ⏳ **Búsqueda de flancos** (siguiente 0→1 o 1→0).
- ⏳ **Medición de ancho de pulso**.
- ⏳ **Copiar valor al portapapeles**.
- ⏳ **Colores personalizables** por señal.
- ⏳ **Regiones de interés** en timeline.
- ⏳ **Visualización analógica** de buses.
- ⏳ **Comparar dos ejecuciones**.
- ⏳ **Arrastrar señales desde el circuito** al waveform.
- ⏳ **Señales compuestas** (función booleana de otras).

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
- ⏳ **Colapsar categorías** en paleta.
- ⏳ **Drag preview** al arrastrar desde paleta.
- ⏳ **Alinear/distribuir** nodos seleccionados.
- ⏳ **Tooltips en puertos** (handles).
- ✅ **Tour guiado** (TourModal con 7 pasos).
- ⏳ **Atajos personalizables**.
- ⏳ **Barra de progreso** para operaciones largas.
- ⏳ **Modo oscuro automático** (`prefers-color-scheme`).
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

- ⏳ **Clon profundo** en cada tick (`cloneModule`): migrar a modelo mutable.
- ⏳ **Memoizar orden topológico** en vez de iterar `n+6`.
- ⏳ **Web Worker** para simulación (no bloquear UI).
- ⏳ **Virtualización del waveform SVG** (>500 ciclos → canvas).

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
| Cuentas de usuario/cloud (§10) | Alto | Muy alto | Cuando escale |
| Edición colaborativa (§10) | Alto | Muy alto | Cuando escale |
| Galería pública circuitos (§10) | Medio | Alto | Cuando escale |
| Soporte `numeric_std` (§3) | Alto | Alto | Estratégica |
| Entradas flotantes (L8) / Bucles (L6) | Alto | Bajo | ✅ Resuelto |
| Exportar VCD / testbench (§3,§4) | Medio | Medio | ✅ Resuelto |
| i18n | Medio | Medio | ✅ Resuelto |
| Múltiples cursores/marcadores (§4) | Medio | Bajo | ✅ Resuelto |
| Exportar CSV/JSON (§4) | Medio | Bajo | ✅ Resuelto |
| Lista de transiciones en waveform (§4) | Bajo | Bajo | ✅ Resuelto |
| Resaltado de glitches (§4) | Bajo | Bajo | ✅ Resuelto |
| Colapsar categorías en paleta (§5) | Bajo | Bajo | Quick win |

### Quick wins
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
12. ✅ Búsqueda de proyectos + etiquetas + descripción
13. ✅ Backup export/import completo
14. ✅ Proyectos recientes + favoritos
15. ✅ Plantillas de proyecto (12)
16. ✅ Autoguardado configurable + beforeunload
17. ✅ Versionado de librería
18. Ciclo de trabajo configurable en relojes

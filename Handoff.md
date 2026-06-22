# Handoff — Dashboard, features, refactor (quinta sesión)

Sesión: 2026-06-22 · Rama: `main` · Dashboard + features + refactor

---

## 🎯 Goal

Implementar dashboard completo con 9 features, 6 mejoras adicionales, fix de bugs y refactor de theming.

### Items implementados

#### Dashboard (9/9)
1. ✅ **Panel principal** — lista de proyectos con miniatura SVG, grid/lista toggle, favoritos, recientes
2. ✅ **Búsqueda y filtros** — por nombre, etiqueta, fecha (picker de rango), tipo
3. ✅ **Vista cuadrícula / lista** — toggle con persistencia en localStorage
4. ✅ **Proyectos compartidos** — sección separada con permisos (read/edit), íconos por rol
5. ✅ **Historial de versiones** — hook `useVersionHistory` compartido, conectado al autoguardado del simulador
6. ✅ **Diff visual** — modal comparando dos versiones con resaltado de nodos agregados/quitados
7. ✅ **Exportación masiva** — ZIP real con JSZip (JSON + VHDL + SVG + metadata)
8. ✅ **Papelera / trash** — retención 30 días, restaurar desde trash
9. ✅ **Estadísticas** — conteo por tipo + nivel de profundidad (`computeDepth` desde `analyze.ts`)

#### Features extras (6/6)
10. ✅ **Meta tags OG** — `MetaTags` componente dinámico para OG/twitter cards
11. ✅ **Blog / changelog público** — páginas `/blog` y `/blog/:slug` con contenido completo
12. ✅ **SEO** — `sitemap.xml` actualizado con todas las páginas
13. ✅ **Modo presentación** — banner dismissable en simulador, persistido en localStorage
14. ✅ **Formato localizado** — `Intl` utility (`formatDate`, `formatNumber`)
15. ✅ **Documentación multilingüe** — 30+ claves i18n agregadas a `es.json` y `en.json`

#### Infraestructura
16. ✅ **LICENSE** — cambiado de MIT a "All Rights Reserved"
17. ✅ **Páginas legales** — `/terms` y `/privacy` creadas con contenido actualizado
18. ✅ **ThemeContext global** — `src/contexts/ThemeContext.tsx` envuelve toda la app en `main.tsx`
19. ✅ **SimulatorThemeContext** — contexto exclusivo del simulador con colores dinámicos (grid, MiniMap, mask)
20. ✅ **Logo SVG** — chip + señal de pulsos + pines IC, usa `currentColor` (verde `--on`)

#### Fixes
21. ✅ **Duplicado `c100` en MiniMap** — `nextNodeId()` escanea `nodesRef.current` para garantizar unicidad
22. ✅ **Theme flip entre páginas** — orden de resolución: stored → document dataset → system
23. ✅ **`data-theme="dark"`** — seteado explícitamente en `index.html`
24. ✅ **React Router Future Flags** — `v7_startTransition` + `v7_relativeSplatPath` en `<BrowserRouter>`

---

# Handoff — UX features, blog, docs, examples (sexta sesión)

Sesión: 2026-06-22 · Rama: `main` · 9 features de UX + blog redesign + docs + examples

---

## 🎯 Goal

Implementar 9 mejoras UX en el simulador, rediseñar blog al estilo Astro, mejorar docs, crear página de ejemplos, step modal, RSS feed y actualizar icono.

### Items implementados

#### UX del simulador (9/9)
1. ✅ **Historial visible de undo/redo** — `HistoryPanel` flotante en canvas (View → Mostrar historial), muestra pila undo/redo con dots de estado, botones deshacer/rehacer
2. ✅ **Exportar diagrama a imagen** — `html-to-image` genera PNG del canvas (View → Exportar como PNG)
3. ✅ **Selector de color de fondo del lienzo** — color picker en View → Fondo: personalizado, aplica inline style al ReactFlow
4. ✅ **Guías de alineación entre nodos** — líneas dashed verdes al arrastrar cerca de otro nodo (margen 6px, detecta centros y bordes)
5. ✅ **Zoom con doble clic en nodo** — `onNodeDoubleClick` → `setCenter` al nodo con zoom 2× animado (300ms)
6. ✅ **Notificaciones toast** — `ToastProvider` + `useToast`, toasts centrados abajo con tipos ok/err/info, auto-dismiss 3s
7. ✅ **Panel de propiedades lateral** — sidebar con tabs VHDL ↔ Propiedades, muestra tipo/ID/etiqueta/valor/init/div/duty/ancho/posición según el tipo de nodo
8. ✅ **Mini-mapa interactivo navegable** — toggle View → Mostrar/Ocultar minimapa, ya tenía `pannable`+`zoomable`, añadido borde con border-radius
9. ✅ **Vista de impresión/PDF** — View → Imprimir / PDF, exporta canvas a PNG en ventana nueva y ejecuta `window.print()`, media query `@media print` oculta toda la UI

#### Blog redesign
10. ✅ **Hero con gradiente** — badges, gradient background, actions (RSS link)
11. ✅ **Category pills con colores** — dots coloreados según categoría (feature/tutorial/changelog/announcement)
12. ✅ **Grid 2 columnas responsive** — `auto-fill, minmax(340px, 1fr)`
13. ✅ **Avatares con iniciales** — gradient background, nombre y fecha en cada card
14. ✅ **Reading progress bar** — fixed top bar 3px con gradient
15. ✅ **Prev/Next navigation** — grid 2 columnas con títulos y flechas
16. ✅ **Author bio section** — avatar + nombre + descripción al final de cada post
17. ✅ **Back-to-top button** — fixed bottom-right

#### Docs & Examples
18. ✅ **Docs hero mejorado** — gradient background, quick-link buttons (Getting Started + Examples)
19. ✅ **Sección Examples en docs** — nueva card apuntando a `/examples`
20. ✅ **Página `/examples`** — showcase de 12 templates con tag filtering, iconos por categoría, cards con acción "Abrir en simulador"

#### Componentes
21. ✅ **StepModal reusable** — `src/components/shared/StepModal.tsx`, multi-step con dot indicators, prev/next/skip/complete, `onComplete` callback
22. ✅ **Toast system** — `src/components/shared/Toast.tsx`, provider + context + auto-dismiss
23. ✅ **HistoryPanel** — `src/components/shared/HistoryPanel.tsx`, pila visual con dots de estado
24. ✅ **PropertiesPanel** — `src/components/shared/PropertiesPanel.tsx`, inspector contextual de nodos

#### SEO & Assets
25. ✅ **RSS feed** — `public/rss.xml` con 5 artículos, fechas RFC 2822, categories
26. ✅ **Icono actualizado** — `public/icons/icon.svg` ahora coincide con el logo chip + pulsos + pines IC (512×512)

#### i18n
27. ✅ **4 nuevas claves i18n** — `docs.section.examples`, `docs.section.examples.desc`, `docs.link.examples` en `es.json` y `en.json`

## ✅ Verificación

```bash
npm run build     # 0 errors, built in 1.71s
```

## ✏️ Archivos nuevos/modificados

### Nuevos
| Archivo | Propósito |
|---------|-----------|
| `src/components/shared/Toast.tsx` | Sistema de notificaciones toast |
| `src/components/shared/HistoryPanel.tsx` | Panel visual de historial undo/redo |
| `src/components/shared/PropertiesPanel.tsx` | Panel de propiedades laterales |
| `src/components/shared/StepModal.tsx` | Modal de pasos guiados reutilizable |
| `src/pages/Examples/index.tsx` | Página showcase de circuitos ejemplo |
| `src/pages/Examples/Examples.css` | Estilos de la página de ejemplos |
| `public/rss.xml` | RSS feed del blog |

### Modificados
| Archivo | Cambios |
|---------|---------|
| `src/pages/Simulator/index.tsx` | +9 features (history, export, bg, guides, zoom, toast, props, minimap, print) |
| `src/pages/Blog/index.tsx` | Rediseño completo Astro-style |
| `src/pages/Blog/Post.tsx` | Progress bar, prev/next, autor bio |
| `src/pages/Blog/Blog.css` | Nuevos estilos hero/grid/cards/post |
| `src/pages/Docs/index.tsx` | Hero mejorado, examples section |
| `src/pages/Docs/Docs.css` | Hero bg, botones de acceso rápido |
| `src/styles.css` | +300 líneas: toast, history, properties, tabs, guides, print |
| `src/App.tsx` | Ruta `/examples` |
| `src/i18n/es.json`, `en.json` | 4 claves nuevas (examples section) |
| `public/icons/icon.svg` | Rediseñado con chip + pulsos + pines IC |
| `package.json` | `html-to-image` dependency |

## 📐 Arquitectura

**Toast system**: `ToastProvider` envuelve `<Flow>` en `SimulatorPage`. `useToast()` disponible dentro del simulador para emitir notificaciones.

**Properties panel**: Reemplaza el VHDL-only sidebar con tabs. El panel de propiedades se activa al hacer clic en un nodo (`setSelectedNode` + `setPropsOpen(true)`). Muestra controles según el tipo de nodo (REG → ancho, CLOCK → divisor/duty, FF → init, etc.).

**Alignment guides**: Interceptadas en `onNodesChange`. Detecta arrastres con `changes.find(c => c.type === 'position' && c.dragging)` y compara posición contra otros nodos con margen 6px. Renderiza `<div className="align-guide">` absolutos sobre el canvas.

**History panel**: Botón flotante overlay en canvas (`.canvas-overlay.top-right`). Toma `undoStack.current` y `redoStack.current` por referencia para mostrar conteo visual.

## ⚠️ Notas

- `html-to-image` se añadió como dependencia para exportar PNG. La exportación a PDF reusa la misma función + `window.print()`.
- El minimap toggle no afecta al estado interno de React Flow — solo condiciona la renderización del `<MiniMap>`.
- El color de fondo del canvas se aplica via `style={{ background: bgColor || undefined }}` en `<ReactFlow>`, sobreescribiendo el tema en tiempo real.
- Para usar el StepModal en el simulador, importarlo y pasarle `steps` array con `{ title, content }`.

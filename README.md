# LogicFlow · Simulador de Circuitos Lógicos

Editor de circuitos lógicos estilo Xilinx ISE, hecho con **Node + Vite + React + TypeScript**.
Simulación con lógica de 4 estados (0/1/X/Z), buses multibit y diagrama de tiempos interactivo.

## Características

- **Editor de nodos con drag & drop** usando [React Flow](https://reactflow.dev) (`@xyflow/react`) para el lienzo, el cableado y las conexiones, y [react-dnd](https://react-dnd.github.io/react-dnd/) para arrastrar componentes desde la paleta.
- **Componentes**:
  - Entradas/salidas: interruptor (IN), reloj configurable (CLK ÷1/2/4/8), LED (OUT).
  - Compuertas: AND, OR, NOT, NAND, NOR, XOR, XNOR.
  - Secuenciales: flip-flops **D, T, JK, SR** con reset asíncrono, enable y valor inicial configurables.
  - Registro de ancho configurable (2/4/8/16 bits) con enable y reset.
  - Buses multibit: BUS-IN (fuente hex editable), BUS-OUT (display), SPLIT (bus → bits), MERGE (bits → bus).
  - **Componentes reutilizables** creados por diagrama, VHDL o expresión booleana; simulación jerárquica.
- **Lógica de 4 estados**: `0`, `1`, `X` (indefinido/conflicto), `Z` (alta impedancia/sin conectar), con coloreado propio en nodos y waveform.
- **VHDL bidireccional con Auto-sync ⇄**:
  - *Diagrama → Código*: genera VHDL sintetizable del circuito, incluyendo registros vectoriales, `component`/`port map` estructural y asignaciones concurrentes.
  - *Código → Diagrama*: importa un `.vhd` y construye los componentes automáticamente. Soporta `entity`/`port`, señales, asignaciones booleanas, `when/else`, `with/select`, `component`/`port map`, procesos `rising_edge` con reset asíncrono, y registros vectoriales indexados.
  - Con **Auto-sync** activo la sincronización es en ambos sentidos en vivo.
- **Reloj** configurable (1–20 Hz), paso único, paso delta (modo retardo) y reset de estados.
- **Diagrama de tiempos (waveform)** interactivo con zoom, cursor de medición, marcador con Δt, buses en hex/dec/bin, reordenar/renombrar/ocultar trazas por drag-and-drop, y exportación a PNG/SVG/VCD.
- **Componentes reutilizables** de tres formas, todos guardados de forma persistente (localStorage):
  - **Del diagrama**: convierte el circuito actual del lienzo en un componente.
  - **Por VHDL**: pega una `entity`/`architecture`; se simula de forma **jerárquica** y se exporta de forma **estructural** (`component` + `port map`).
  - **Por expresión** booleana (p. ej. un MUX).
- **Librería de componentes** exportable/importable en **un solo archivo** para reutilizarla entre proyectos.
- **Exportar testbench** VHDL con los estímulos registrados en el waveform.
- **Exportar VCD** para visualizar en GTKWave/ModelSim.
- **Guardar/cargar/eliminar** proyectos con nombre en el navegador (localStorage).
- **Deshacer/rehacer** (Ctrl+Z / Ctrl+Shift+Z), **copiar/pegar/duplicar** selección de nodos, snap a la rejilla.
- **Detección de bucles combinacionales** con resaltado de nodos afectados, aviso de entradas sin conectar y detección de nombres de puerto duplicados.
- **Tema claro/oscuro**, panel de ayuda con atajos de teclado.
- **Persistencia automática** del circuito y la librería en localStorage.
- **Generación de testbench** automática a partir de los estímulos del waveform.

## Uso

```bash
npm install          # instalar dependencias
npm run dev          # http://localhost:5599 (desarrollo)
npm run build        # build de producción en dist/
npm run preview      # previsualizar build local
npm run typecheck    # verificar tipos
npm run deploy       # publicar en GitHub Pages
```

## Despliegue

### GitHub Pages

```bash
npm run deploy
```

Requiere que el repositorio tenga GitHub Pages habilitado (Settings → Pages → Source: GitHub Actions).

### Netlify

Conecta el repositorio a Netlify, comando `npm run build`, directorio `dist`.
O despliega manualmente:

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### Docker

```bash
docker build -t logicflow .
docker run -p 8080:80 logicflow
```

### Variables de entorno

Copia `.env.example` a `.env` y configura:

| Variable | Descripción |
|---|---|
| `VITE_BASE_URL` | URL base (ej: `/simulador/` para subdirectorio) |
| `VITE_ANALYTICS_ID` | Google Analytics Measurement ID (opcional) |

## Compartir circuitos

Cualquier circuito se puede compartir como enlace:
1. **View → Compartir por URL**: copia al portapapeles un enlace con el circuito completo codificado en el hash.
2. Las señales observadas en el waveform también se pueden compartir con el botón **URL↗** en el panel de ondas (genera un enlace con `?preset=...`).

## PWA

La aplicación es una Progressive Web App. Al abrirla en Chrome/Edge, aparece un aviso para instalarla como aplicación de escritorio. También funciona offline gracias al service worker.

## Tour guiado

La primera vez que se abre la aplicación, aparece un tour interactivo de 7 pasos que explica las funciones principales.

## Importar VHDL

Pulsa **📥 .vhd** y selecciona un archivo (hay un ejemplo en `ejemplos/contador.vhd`).
El subconjunto soportado para importar: `entity`/`port` con `STD_LOGIC` y `STD_LOGIC_VECTOR`, señales,
asignaciones concurrentes booleanas (`<=` con `and/or/not/nand/nor/xor/xnor`), `when/else`, `with/select`,
`component`/`port map`, procesos `rising_edge(clk)` para flip-flops D y registros vectoriales.

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `src/engine.ts` | Motor de simulación (combinacional + flancos de reloj + paso delta). |
| `src/vhdl.ts` | Generación y *parsing* de VHDL ⇄ nodos/aristas + auto-layout. |
| `src/expr.ts` | Parser de expresiones booleanas estilo VHDL. |
| `src/defs.ts` | Definición de componentes primitivos, compuertas, FF, buses y registro de personalizados. |
| `src/LogicNode.tsx` | Nodo visual de React Flow con puertos, LEDs, selectores de ancho/init/div. |
| `src/Palette.tsx` | Paleta de componentes con react-dnd y filtro de búsqueda. |
| `src/Waveform.tsx` | Diagrama de tiempos interactivo con zoom, cursor, marcador y exportación. |
| `src/analyze.ts` | Diagnóstico de bucles combinacionales, entradas flotantes y etiquetas duplicadas. |
| `src/library.ts` | Serialización y persistencia de la librería de componentes personalizados. |
| `src/projects.ts` | Gestión de proyectos con nombre en localStorage. |
| `src/exportvhd.ts` | Exportación a VCD y generación de testbench VHDL. |
| `src/highlight.ts` | Resaltado de sintaxis VHDL para el editor. |
| `src/ErrorBoundary.tsx` | Error boundary de React para evitar pantallas en blanco. |
| `src/ctx.ts` | Contexto React para acciones del circuito (cambiar ancho, propiedades de nodo). |
| `src/HelpModal.tsx` | Panel de ayuda y atajos de teclado. |
| `src/CustomModal.tsx` | Modal para crear componentes reutilizables (3 modos). |
| `src/LibraryModal.tsx` | Gestor visual de la librería de componentes. |
| `src/ProjectsModal.tsx` | Gestor de proyectos guardados en el navegador. |

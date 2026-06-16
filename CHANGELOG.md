# Changelog

## [1.0.0] — 2024-01-01

### Añadido
- Editor de circuitos lógicos con React Flow
- VHDL bidireccional: diagrama → código y código → diagrama con auto-sync
- Lógica de 4 estados (0/1/X/Z) con álgebra X-propagante
- Flip-flops D, T, JK, SR con reset asíncrono, enable y valor inicial
- Registro de ancho configurable (2/4/8/16 bits)
- Buses multibit: BUS-IN, BUS-OUT, SPLIT, MERGE
- Diagrama de tiempos (waveform) con zoom, cursor, marcador, exportación PNG/SVG/VCD
- Componentes reutilizables por diagrama, VHDL o expresión booleana
- Librería de componentes exportable/importable
- Gestión de proyectos con nombre en localStorage
- Deshacer/rehacer, copiar/pegar/duplicar nodos, snap a la rejilla
- Tema claro/oscuro
- Detección de bucles combinacionales y entradas sin conectar
- Generación de testbench VHDL con estímulos del waveform
- Modo retardo (paso delta) para visualizar glitches
- Linter VHDL con detección semántica de señales no declaradas
- Búsqueda de señales en el waveform
- Buses en la paleta de componentes
- Auto-layout re-ejecutable
- Testbench con buses vectoriales
- Validación de nombres en proyectos y componentes
- PWA con service worker para uso offline
- Despliegue a GitHub Pages vía `npm run deploy`
- Dockerfile multi-etapa para producción
- Compartición de circuitos por URL (base64 en hash)
- CHANGELOG, LICENSE (MIT), PRIVACY.md
- GitHub Actions CI/CD (typecheck + build + deploy)
- Página de estado (health check) y analytics opcional vía .env
- Tour guiado para primeros pasos

### Técnico
- Vite 5 + React 18 + TypeScript 5
- @xyflow/react para el lienzo de nodos
- react-dnd para drag & drop desde la paleta

# Guía de Contribución

Gracias por tu interés en contribuir a **Simulador de Circuitos Lógicos**. Toda contribución es bienvenida, ya sea reportando bugs, sugiriendo mejoras o enviando código.

## Cómo Reportar Bugs

1. Abre un [*issue* en GitHub](https://github.com/ANOMALYCO/ota-requester-worker/issues/new).
2. Usa un título descriptivo y claro.
3. Incluye:
   - Pasos para reproducir el error.
   - Comportamiento esperado vs. comportamiento observado.
   - Capturas de pantalla o GIFs si es relevante.
   - Información del navegador y sistema operativo.

## Cómo Sugerir Funcionalidades

1. Abre un [*issue*](https://github.com/ANOMALYCO/ota-requester-worker/issues/new) con la etiqueta `enhancement`.
2. Describe el problema que resuelve la funcionalidad propuesta.
3. Si es posible, esboza una solución o alternativa.

## Flujo de Trabajo para Pull Requests

1. **Fork** este repositorio en GitHub.
2. Crea una **rama** con un nombre descriptivo: `fix/descripcion`, `feat/descripcion`, `refactor/descripcion`.
3. Realiza tus cambios siguiendo las [convenciones de estilo](#estilo-de-código).
4. Asegúrate de que el proyecto compile sin errores:
   ```bash
   npm run typecheck
   ```
5. Asegúrate de que la build funciona:
   ```bash
   npm run build
   ```
6. Haz *commit* con [*commits convencionales*](https://www.conventionalcommits.org/es/):
   - `feat:` — nueva funcionalidad.
   - `fix:` — corrección de bug.
   - `refactor:` — cambios de código que no corrigen bugs ni añaden funcionalidad.
   - `docs:` — cambios en documentación.
   - `style:` — cambios de formato (espacios, puntos y coma, etc.).
   - `test:` — añadir o corregir tests.
   - `chore:` — cambios en herramientas, dependencias, etc.
7. Abre un **Pull Request** contra la rama `main`.
8. Describe tus cambios en el PR y referencia cualquier *issue* relacionado.

## Estilo de Código

- **TypeScript estricto**: el proyecto usa `strict: true` en `tsconfig.json`. No uses `any` ni `@ts-ignore` salvo casos excepcionales debidamente justificados.
- **React Hooks**: sigue las [reglas de hooks](https://react.dev/warnings/invalid-hook-call-warning). Usa `useCallback`, `useMemo` y `React.memo` cuando tenga sentido.
- **Nombres**: `camelCase` para variables y funciones, `PascalCase` para componentes y tipos, `UPPER_SNAKE_CASE` para constantes.
- **Importaciones**: orden: librerías externas → módulos internos → tipos. Evita importaciones con side effects.
- **Formateo**: se prefiere el estilo por defecto de TypeScript/ESLint. No hay linter configurado explícitamente; mantén consistencia con el código existente.
- **Componentes**: prefiere componentes funcionales con hooks. Evita componentes de clase.
- **Tests**: coloca los tests junto al archivo que prueban con extensión `.test.ts`.

## Cómo Ejecutar Tests Localmente

Actualmente no hay un framework de tests configurado. Para verificar que todo funciona:

```bash
npm run typecheck   # verificar tipos
npm run build       # compilar y empaquetar
npm run dev         # levantar servidor de desarrollo y probar manualmente
```

## Código de Conducta

Este proyecto sigue un [Código de Conducta](CODE_OF_CONDUCT.md). Al participar, se espera que cumplas con él.

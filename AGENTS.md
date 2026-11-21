<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Guía del repositorio

Next.js App Router, TypeScript, React, Zod y SQLite con `node:sqlite`. Usar npm y mantener el `package-lock.json`.

| Tarea | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Desarrollo | `npm run dev` |
| Pruebas | `npm test` |
| Prueba del almacén | `node --test src/db/store.test.ts` |
| Lint | `npm run lint` |
| Compilación | `npm run build` |

## Reparto

- **Asier** lleva los datos de demo, el filtro, el orden y las razones en `src/matching/`, además de las rutas de perfiles, feed, swipes y matches en `src/app/api/`.
- **Adolfo** lleva la entrevista con la Realtime API de OpenAI y `POST /api/voice/session`.
- **Ander** lleva las pantallas y estilos, la interacción de swipe y el aviso visual de match.
- Avisar a los otros dos antes de cambiar `src/domain/` o `src/db/`. Coordinar con el consumidor los cambios de contrato que afecten a la entrevista o a la interfaz.

## Convenciones y referencias

- Los identificadores van en inglés. Reutilizar los tipos y esquemas Zod de `src/domain/` para validar las entradas de las rutas y el almacén de `src/db/store.ts` para acceder a SQLite.
- Para el alcance y los criterios del MVP, leer [el spec](docs/1-spec.md). Para las responsabilidades y los contratos de integración, leer [el diseño del sistema](docs/2-system-design.md).
- Para una tarea de Asier, empezar por [su guía de contexto](docs/asier-context.md).

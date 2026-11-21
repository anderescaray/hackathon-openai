# Contexto de trabajo de Asier

## Punto de partida

En `feature/data`, commit `04abe82`, ya están los esquemas y tipos de [perfiles y feed](../src/domain/profile.ts), el [contrato de swipe](../src/domain/swipe.ts) y el [almacén SQLite](../src/db/store.ts). El almacén guarda y consulta perfiles y swipes. Usa `DATABASE_PATH`, con `data/app.db` como valor por defecto.

Ya están hechos el pipeline de matching, los datos de demo (25 por rol, en `src/matching/demo-data.json`, que se cargan con `npm run seed`), la tabla de embeddings y las cinco rutas de la tabla. Las decisiones y el contrato exacto están en [el pipeline de matching](3-pipeline-matching.md). Lo siguiente es integrar con Adolfo (cuerpos del `PATCH`) y con Ander (feed, swipes y matches reales).

## Límites e integración

Los datos de demo y la lógica de Asier van en `src/matching/`. Next.js exige que los puntos de entrada HTTP vivan en `src/app/`, así que estos archivos previstos también son de Asier.

| Archivo previsto | API | Consumidor y respuesta |
|---|---|---|
| `src/app/api/profiles/route.ts` | `POST /api/profiles` | Entrevista de Adolfo. Devuelve el `Profile` en borrador. |
| `src/app/api/profiles/[id]/route.ts` | `PATCH /api/profiles/:id` | Entrevista de Adolfo. Devuelve el `Profile` actualizado. |
| `src/app/api/feed/route.ts` | `GET /api/feed?profileId=` | Feed de Ander. Devuelve hasta cinco `FeedItem`. |
| `src/app/api/swipes/route.ts` | `POST /api/swipes` | Interacción de Ander. Devuelve `{ match: FeedItem \| null }`. |
| `src/app/api/matches/route.ts` | `GET /api/matches?profileId=` | Aviso de Ander. Devuelve `FeedItem[]` para la consulta cada dos segundos. |

Adolfo implementa `POST /api/voice/token` y las herramientas que envían los datos de la entrevista. Ander construye el feed con el JSON de ejemplo y después conecta los endpoints. Las pantallas, los estilos y la presentación del match son de Ander. Para cambios en `src/domain/` o `src/db/`, avisar a ambos. Si aparece una decisión de contrato pendiente, anotarla y acordarla con el consumidor antes de implementarla.

## Criterios de aceptación del matching

Seguir la [regla de match](2-system-design.md#la-regla-de-match-asier) y el [contrato de rutas](2-system-design.md#las-rutas). Para comprobar el recorrido:

- Validar las entradas con Zod, incluidas las de la entrevista. Los borradores admiten hechos parciales. Completar el perfil exige todos los hechos de su rol y activa el cálculo del embedding de las notas en el servidor.
- Evaluar con código los imprescindibles del inquilino frente a los hechos de la casa y los de la casa frente a los del inquilino. Un hecho ausente incumple el requisito que lo necesita. Solo entran perfiles completos al feed.
- Ordenar los candidatos que pasan el filtro con `0.7 × preferencias cumplidas + 0.3 × parecido de las notas`, según el diseño. Las preferencias cuentan en ambos sentidos. Mostrar hasta cinco candidatos, excluyendo a los que el perfil ya ha deslizado.
- Generar razones en español con plantillas a partir de requisitos cumplidos. El like devuelve un match cuando hay un like recíproco. El descarte y el like unilateral devuelven `match: null`.

## Retomar el trabajo

Empezar por `git status --short --branch` y leer la sección del [diseño del sistema](2-system-design.md) que cubre la tarea. Para perfil o persistencia, abrir también el esquema o almacén correspondiente y su prueba. Para el feed y los swipes, revisar los contratos y el consumidor si ya está integrado. Al cerrar, registrar el estado, los archivos cambiados, el siguiente paso, los comandos ejecutados con su resultado y las decisiones de integración pendientes.

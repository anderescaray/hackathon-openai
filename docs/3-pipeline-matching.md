# Pipeline de matching (Asier)

Parte del [diseño del sistema](2-system-design.md). Describe lo que hay en `src/matching/` y en las rutas de `src/app/api/` que son de Asier.

## Recorrido

1. **Perfil.** `POST /api/profiles` crea un borrador. Cada herramienta de la entrevista hace un `PATCH /api/profiles/:id`:
   - `set_facts`: guarda un lote de hechos del rol en una sola escritura. Si un campo falla, no se guarda ninguno. `set_fact` (uno solo) usa la misma escritura.
   - `add_requirement`: guarda un requisito sobre un hecho del otro rol. Si ya hay uno con el mismo campo y operador, lo sustituye.
   - `finish_interview`: exige todos los hechos del rol, guarda las notas, calcula su embedding y marca el perfil como completo.
2. **Filtro.** Solo se emparejan perfiles completos de roles opuestos. Cada lado tiene que cumplir todos los imprescindibles del otro. Si falta un hecho, el requisito no se cumple.
3. **Orden.** `0.7 × preferencias cumplidas (de los dos lados) + 0.3 × coseno de las notas`, con el coseno acotado a 0..1.
4. **Feed.** Las 5 compatibles de mayor puntuación que el perfil aún no ha deslizado, calculadas en cada petición. Desempate por id.
5. **Swipe y match.** Cada perfil decide una vez por pareja. El segundo like devuelve el match. `GET /api/matches` devuelve todos los likes mutuos.

## Contrato de las rutas

| Ruta | Entrada | Salida |
|---|---|---|
| `POST /api/profiles` | `{ role, displayName?, photoUrls? }` | `Profile` (201) |
| `PATCH /api/profiles/:id` | `{ action: "set_facts", facts }`, `{ action: "set_fact", field, value }`, `{ action: "add_requirement", field, operator, value, isMust }` o `{ action: "finish_interview", notes }` | `Profile` |
| `GET /api/feed?profileId=` | | `FeedItem[]`, como mucho 5. Un borrador recibe `[]` |
| `POST /api/swipes` | `Swipe` | `{ match: FeedItem \| null }` |
| `GET /api/matches?profileId=` | | `FeedItem[]` |

Errores con `{ error }`. 400 para una entrada inválida; si la ha rechazado Zod, la respuesta incluye además `issues`. 404 si el perfil no existe. 409 en estos casos:
- cambiar un perfil ya completo;
- deslizar una pareja incompatible;
- cambiar una decisión ya tomada.

Repetir la misma finalización devuelve el mismo perfil. Si dos finalizaciones con notas distintas se solapan, gana la primera y la otra recibe 409.

Repetir el mismo swipe conserva la decisión y devuelve el estado **actual** del match. Si el otro lado dio like entre los dos intentos, el reintento devuelve el `FeedItem` aunque el primero devolviera `null`. Para la interfaz, un match es nuevo si su id no estaba ya entre los avisados, sin importar si llegó por el swipe o por `GET /api/matches`.

## Integración con la entrevista de voz

Cada herramienta del agente Realtime (`src/interview/`) se traduce así:

| Momento de la entrevista | Operación |
|---|---|
| Pulsar «Empezar entrevista» | `POST /api/profiles { role }`. El `Profile` del 201 inicia la entrevista y su `id` se usa durante toda la sesión. |
| `save_facts` | `PATCH { action: "set_facts", facts: { … } }`. |
| `complete_facts` | Sin llamada. Se comprueba con el último `Profile` confirmado: si faltan hechos, se devuelven sus nombres al agente; si no, se pasa a requisitos. El perfil sigue en `draft`. |
| `save_requirement` | `PATCH { action: "add_requirement", field, operator, value, isMust }`. |
| `finish_interview` | `PATCH { action: "finish_interview", notes }`. La despedida empieza al recibir el `Profile` con `status: "complete"`. Si el embedding falla, el perfil se completa igual. |

Reglas para la pantalla:
- **Respuestas.** Mostrar el `Profile` que devuelve cada escritura y solo después confirmar la herramienta al agente.
- **400.** Pasar `error` y `issues` al agente para que corrija el dato.
- **404 o 409.** Mostrarlos como error.
- **Respuesta perdida.** Repetir el mismo `PATCH` con el mismo id y el mismo contenido: es seguro.
- **Orden.** Enviar las llamadas de una entrevista de una en una y en orden, incluidas las que lleguen en eventos seguidos, para que `complete_facts` vea el último guardado.
- **Requisitos.** Cada requisito se identifica por `field` + `operator`. «Entre 800 y 1.100 €» son dos requisitos (`gte 800` y `lte 1100`), y corregir el máximo conserva el mínimo. La lista en pantalla tiene que usar `field` + `operator` como clave.
- **Entrega a Ander.** Al pulsar «Continuar» tras el cierre, la pantalla guarda `{ profileId, role }` con `setSession` (`src/app/_lib/session.ts`, `sessionStorage["homie.session"]`, independiente en cada pestaña). Con ese id, `GET /api/feed?profileId=<id>` devuelve el feed.

## Decisiones

- **Sin lógica de días.** El feed no tiene cupos ni tandas, como dice el spec.
- **Validación de requisitos en `src/matching/requirements.ts`.** El esquema de `src/domain/` acepta cualquier valor para cualquier campo, así que esta capa añade las reglas sin tocar el contrato compartido:
  - `in` solo vale para campos de lista cerrada, y cada valor tiene que estar en esa lista;
  - `lte` y `gte` solo valen para números y fechas ISO;
  - `eq` exige el tipo del campo.
- **Valores neutros.** Sin preferencias, esa parte vale 0.5; sin embedding en alguno de los dos lados, la similitud vale 0.5. Así los datos que faltan no suben ni bajan una pareja.
- **Embedding.** Se calcula con `text-embedding-3-small`, con un límite de 3 s. Si no hay clave, hay un error o se pasa del tiempo, el perfil se completa igual, sin embedding. Se guarda en la tabla `profile_embeddings`, aparte, porque `profileSchema` es estricto.
- **Swipes sin carreras.** La comprobación y la escritura son síncronas (`node:sqlite`), así que dos peticiones no se pueden intercalar entre ellas.
- **Razones.** Se generan con plantillas en español a partir de los requisitos cumplidos: primero los del que mira y después los del otro lado.

## Datos de demo

`src/matching/demo-data.json` tiene 25 casas y 25 inquilinos de Barcelona con ids estables (`home-01`, `tenant-01`, …). Las fotos de las casas usan `picsum.photos` con una semilla fija. `npm run seed` los carga (actualiza por id, sin borrar perfiles de entrevistas ni swipes) y calcula los embeddings si existe `OPENAI_API_KEY`. Un test comprueba que cada perfil tiene al menos dos compatibles.

## Pendiente

- Que Adolfo apunte las herramientas de la entrevista a `PATCH /api/profiles/:id` con estos cuerpos.
- Que Ander sustituya el JSON de ejemplo por `/api/feed`, `/api/swipes` y `/api/matches`.

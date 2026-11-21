# Plan: interfaz de Homie (parte de Ander)

Spec: `docs/1-spec.md` · Diseño: `docs/2-system-design.md` · Mockups: `docs/ui/mockups/*.html`
(canvas original: https://claude.ai/artifact/RZnct6ZcDGmm3VDtsduGLd, página "Final · combined").

Tiempo: ~2 h. Solo **Discover** (inquilino) y **Interested → Accept** (casero) funcionan de verdad.
El resto (Matches, Chat, Profile, Chats y My listings del casero) es interfaz con datos falsos.

Ejecutores:
- **Gemini CLI, modelo Neon** (`gemini -m "$GEMINI_MODEL"`): escribe el frontend (componentes, pantallas, animaciones).
- **Claude Code** (sesión orquestadora + subagentes): fase 0, fotos, datos falsos, adaptador de datos,
  integración con las ramas de Asier y Adolfo, revisión y pulido de todo lo que escribe Gemini.

Rama: `feat/ui`. Nada se sube a `main` sin pasar por la revisión de Claude.

---

## 1. Decisiones cerradas (no se rediscuten)

| Tema | Decisión |
|---|---|
| Idioma | Toda la app en **inglés**. Nombre: **homie** (en minúsculas en el logo). |
| Formato | Web con forma de móvil: marco de 390×844 centrado en el escritorio y pantalla completa en un móvil real. La demo se hace con dos ventanas: inquilino y casero. |
| Roles | Contrato: `role: "tenant" \| "home"`. En la UI, "home" se presenta como **landlord**. |
| Feed | 5 casas al día (lo que devuelve `/api/feed`). Contador "2 of 5 today". Al acabar: pantalla final "That's your 5 for today". |
| Gestos de la casa | **Scroll vertical** = más fotos de la **misma** casa, con snap, y la última página es la ficha completa. **Toque en la foto** = panel "Fits you 4/4" con los imprescindibles que cumple. **Swipe horizontal** = decidir (derecha like, izquierda pass). **No se puede pasar de casa sin decidir.** Sin botones, solo gesto (la demo se hace con ratón). |
| Feedback del swipe | La carta rota siguiendo el puntero, el borde se tiñe (granate = like, gris = pass) y aparece un icono ♥ o ✕ cuya opacidad crece con la distancia. Pasado el umbral (~120 px o velocidad) sale volando con un spring y entra la siguiente. |
| Casero | Sin feed. La pestaña **Interested** muestra los inquilinos que le han dado like, ya filtrados, con **Decline / Accept**. Accept = like del casero → hay match → chat. |
| Match | Inquilino: la casita guiña el ojo y celebra ("It's a match"), botón "Say hi". Lo detecta por polling a `/api/matches` cada 2 s. El match aparece en la pestaña Matches. |
| Chat | Solo interfaz y con datos falsos, pero se puede escribir y el mensaje se añade en local. |
| Navegación | Dock inferior con botón central elevado. Inquilino: Matches · **Discover** (centro) · Profile. Casero: Chats · **Interested** (centro) · My listings (plural). |
| Mascota | La casita reportera con **tejado triangular granate**, chimenea granate, ventanita redonda, ceja que se levanta, bigote, pajarita ocre, libreta y micro retro. **Un único componente** `<Homie mood=…/>`: no puede haber dos versiones distintas. |
| Librerías | `motion` (gestos, springs, layout) y `lucide-react` (iconos). Nada más. |
| Fotos | Unsplash descargadas a `public/homes/` (funcionan sin wifi). |

## 2. Sistema visual (tokens)

Ver `docs/ui/mockups/tenant-core.html` y `after-swipe.html`: son la referencia visual exacta. Las
`/_blob/...` de dentro son fotos de muestra; en la app van las de `public/homes/`.

```css
--bg:          #F4EEE6;  /* crema, fondo de la app */
--surface:     #FFFFFF;  /* hojas y tarjetas */
--surface-2:   #FFFBF5;  /* dock, cabeceras */
--ink:         #241A1C;  /* texto principal y trazos de la mascota */
--muted:       #6E6260;  /* texto secundario */
--subtle:      #8A7F7B;  /* hints */
--line:        #EAE2D8;  /* separadores */
--granate:     #7C1D2E;  /* acento principal */
--granate-700: #5A1220;
--granate-50:  #F5E1E1;  /* chips "must" */
--ochre:       #C08A1E;  /* puntos y detalles */
--ochre-300:   #E2B04A;  /* botón del match y check sobre granate */
--ochre-100:   #F7E3B5;  /* badges NEW, monogramas */
--house-wall:  #FBF5EA;
```

- Tipografía: **Fraunces** 600 (títulos, precio, logo) + **DM Sans** 400–700 (todo lo demás), con `next/font/google`.
- Radios: hoja 28, tarjeta 18–22, chip 10, botón 16–18, marco del teléfono 44.
- Sombras suaves y cálidas: `0 -10px 30px rgba(36,26,28,.12)` en la hoja.
- Movimiento: springs de `motion` (`stiffness ~300, damping ~30`), sin rebotes exagerados. Respetar `prefers-reduced-motion`.
- Prohibido (huele a AI slop): degradados morados, glassmorphism por todas partes, emojis como iconos, tarjetas con borde de color a la izquierda, sombras grises duras, Inter por defecto, textos "lorem".

## 3. Estructura de carpetas (`src/app` es de Ander)

```
src/app/
  layout.tsx                  fuentes, tokens y <PhoneFrame>
  globals.css                 tokens de arriba + base
  page.tsx                    elegir rol ("I'm looking for a home" / "I'm renting one out")
  (tenant)/discover/page.tsx
  (tenant)/matches/page.tsx
  (tenant)/profile/page.tsx
  (landlord)/interested/page.tsx
  (landlord)/chats/page.tsx
  (landlord)/listings/page.tsx
  chat/[matchId]/page.tsx
  interview-preview/page.tsx  entrevista con el simulador (la ruta real /interview es de Adolfo)
  _ui/                        primitivas: PhoneFrame, Dock, Sheet, Chip, Button, Avatar/Monogram
  _ui/homie/Homie.tsx         la mascota (moods: idle | listening | speaking | wink | celebrate)
  _features/discover/         SwipeDeck, HomeCard, PhotoPager, FitsOverlay, HomeDetails, DayDone
  _features/match/            MatchCelebration (overlay)
  _features/interview/        InterviewView (presentacional), useInterviewSimulator
  _features/inbox/            MatchesList, ChatView, InterestedList, TenantCard, ListingsList
  _lib/api.ts                 ADAPTADOR de datos (mock | api)
  _lib/session.ts             profileId y rol en localStorage; ?as=<profileId> para la demo
  _lib/format.ts              etiquetas en inglés de campos y valores (€, distritos…)
  _lib/fixtures/              FeedItem[], tenants interesados, chats falsos (JSON validado con zod)
public/homes/<homeId>-<n>.jpg
```

Gemini solo toca `_ui`, `_features` y las `page.tsx`. `_lib` es de Claude. `src/domain`,
`src/db`, `src/interview` y `src/matching` no se tocan (son de todos, de Adolfo y de Asier).

## 4. Contratos internos (los fija Claude en la fase 0; Gemini los consume)

### 4.1 Adaptador de datos — `src/app/_lib/api.ts`

```ts
export type DataSource = "mock" | "api"; // NEXT_PUBLIC_DATA_SOURCE, por defecto "mock"
getFeed(profileId: string): Promise<FeedItem[]>                         // GET /api/feed
swipe(from: string, to: string, liked: boolean): Promise<{ match: FeedItem | null }> // POST /api/swipes
getMatches(profileId: string): Promise<FeedItem[]>                      // GET /api/matches
getInterested(homeId: string): Promise<FeedItem[]>                      // FALTA EN ASIER → mock
getProfile(id: string): Promise<Profile>                                // GET /api/profiles/:id (si existe)
```
Para la pantalla de imprescindibles, la UI calcula qué requisitos cumple la casa con una función
pura `evaluateRequirements(viewer: Profile, other: Profile)` en `_lib/fit.ts`, que devuelve
`{ musts: Check[], nice: Check[], theyRequire: Check[] }`. Si Asier publica una función igual en
`src/matching`, se usa la suya. `reasons[]` del `FeedItem` se enseña en el match.

**Hay que pedírselo a Asier:** una ruta para los likes recibidos por una casa (`GET
/api/likes?profileId=` → `FeedItem[]`). Mientras no exista, va con mock.

### 4.2 Entrevista — `InterviewView` (presentacional)

Adolfo ya tiene la lógica en `origin/feat/voice-interview` (`src/interview/InterviewScreen.tsx`, OpenAI
Realtime, fases `facts → requirements → done`). Nosotros hacemos **solo la vista**, con estas props,
para que él la monte dentro de su pantalla en lugar de su JSX:

```ts
type InterviewViewProps = {
  role: Role;
  status: "idle" | "connecting" | "live" | "finished" | "failed";
  phase: "facts" | "requirements" | "done";
  profile: Profile;                 // facts + requirements rellenándose
  speaker: "agent" | "user" | "none"; // mueve la boca o inclina el micro de Homie
  agentLine?: string;               // subtítulo de Homie (opcional: si no llega, se oculta)
  userLine?: string;
  justSaved?: string[];             // campos recién guardados → animación de entrada
  onStart(): void; onEnd(): void; onToggleMute?(): void; onTypeInstead?(): void;
};
```
`useInterviewSimulator(role)` devuelve exactamente esas props y reproduce un guion falso (8–10
pasos, ~1,5 s cada uno) para desarrollar y como plan B de la demo. Las etiquetas en inglés salen de
`_lib/format.ts` (las de Adolfo están en castellano).

Pasos: 2 (Adolfo) → stepper de 2 segmentos: tenant "About you" → "What you're after";
landlord "Your place" → "Who you're looking for".

### 4.3 `<Homie />`

```ts
type HomieProps = { mood: "idle" | "listening" | "speaking" | "wink" | "celebrate"; size?: number };
```
El SVG sale de `docs/ui/mockups/tenant-core.html` (mascota de la entrevista) y `after-swipe.html`
(guiño). La animación es CSS o `motion`: bob, parpadeo, ceja, micro que se inclina, boca hablando y
brazo que saluda.

## 5. Fases y quién hace qué

```
F0  Claude (main)      ~15 min  base, tokens, contratos, stubs ─┐
                                                                ├─► F1 en paralelo (~60 min)
F1  G1 Gemini Discover          ┐
    G2 Gemini Interview + rol   │  cada uno en su carpeta
    G3 Gemini Inbox + match     │
    C1 Claude fotos + fixtures  │
    C2 Claude integración ramas ┘
F2  Claude revisor     ~20 min  review, fixes, pulido de animaciones, prueba en navegador
F3  Claude + equipo    ~20 min  unir con main/Asier/Adolfo, recorrido de demo con dos ventanas, ensayo
```

### F0 · Base (Claude, secuencial, antes de lanzar a nadie)
1. Leer `node_modules/next/dist/docs/` (Next 16 tiene cambios rompientes; ver `AGENTS.md`).
2. `npm i motion lucide-react`.
3. `globals.css` con los tokens; `layout.tsx` con Fraunces y DM Sans; `PhoneFrame`.
4. `_ui/homie/Homie.tsx` portado fielmente del mockup (lo hace Claude: tiene que ser idéntico).
5. `_ui/Dock.tsx` (variantes tenant y landlord) y el esqueleto de todas las rutas con un placeholder.
6. `_lib/api.ts`, `_lib/session.ts`, `_lib/fit.ts`, `_lib/format.ts` con tipos y la implementación mock;
   fixtures mínimas (5 FeedItem con fotos provisionales).
7. Stubs con props tipadas: `MatchCelebration`, `InterviewView`, `useInterviewSimulator`.
8. `npm run lint && npm run build` en verde → commit `feat(ui): scaffold homie shell, tokens and data adapter`.

### F1 · En paralelo
Cada brief de Gemini se lanza en una terminal aparte con:
`gemini -m "$GEMINI_MODEL" --yolo -p "$(cat .ui-briefs/G1.md)"`
(ajustar los flags a lo que diga `gemini --help`). Los briefs los genera Claude a partir de esta
sección e incluyen siempre: tokens, rutas de los mockups, carpetas permitidas, "no toques nada
fuera de tu carpeta", "no instales dependencias", "lint y build antes de acabar" y
"no hagas commit: lo hace Claude".

**G1 · Discover (Gemini)** — `_features/discover`, `(tenant)/discover/page.tsx`
- `SwipeDeck`: pila de `FeedItem`; solo la carta de arriba es interactiva y la siguiente asoma escalada al 0,96.
- `HomeCard`: foto arriba (~560 px) y hoja flotante con título, precio en granate, "Entire home · 68 m² · Furnished", chips de imprescindibles cumplidos ("+N must-haves") y el hint "Swipe to decide · scroll for photos". Indicador vertical de fotos a la derecha.
- `PhotoPager`: scroll vertical con `scroll-snap` por las fotos de la casa; la última página es `HomeDetails` (todos los requisitos ✓/✗, preferencias, notas del casero y datos).
- `FitsOverlay`: al tocar la foto sube la hoja "Fits you 4/4" con la lista ✓ + valor, "Nice to have · 2 of 3" y la tarjeta granate "You fit the landlord's must-haves too". Se cierra tocando.
- Drag horizontal con `motion` (`drag="x"`), según la sección 1. Hay que distinguir el gesto vertical (scroll) del horizontal (decisión) con un umbral de dirección.
- Al decidir: `api.swipe()`. Si devuelve match → `MatchCelebration`. Al acabar las 5 → `DayDone`, con la casita durmiendo o saludando: "That's your 5 for today".
- Cabecera: logo "homie" en una píldora crema y el contador "2 of 5 today" con un punto ocre.

**G2 · Entrevista + elegir rol (Gemini)** — `_features/interview`, `interview-preview/`, `page.tsx` raíz
- `InterviewView` según 4.2 y el mockup: Homie a la izquierda (~130 px) con el bocadillo "Homie asks", la frase del usuario alineada a la derecha, "Your card" en una rejilla de 2 columnas (la primera ficha "must" en granate, las "nice" en blanco y un hueco discontinuo con el siguiente campo), stepper arriba, y abajo "Type instead" · micro granate · "End".
- La ficha nueva entra con un spring y un destello ocre; el sello MUST aparece como un pequeño "stamp".
- `useInterviewSimulator` con un guion de inquilino y otro de casero.
- Al terminar: "Your card is ready", con un resumen y el botón "See your 5 homes" (o "See who's interested").
- `page.tsx` raíz: Homie grande saludando, "Find a home that fits — both ways." y dos botones grandes para elegir rol. Enlace pequeño "Demo: load a ready profile" (plan B).

**G3 · Inbox, chat y match (Gemini)** — `_features/inbox`, `_features/match`, el resto de páginas
- `MatchCelebration` (overlay a pantalla completa sobre granate, con Homie `wink` o `celebrate` sobre un disco crema): brillos ocre, "It's a match", foto de la casa y monograma del inquilino superpuestos, razones, "Say hi to Marta" (ocre) y "Keep discovering".
- `(tenant)/matches`: tarjeta del match nuevo con el badge NEW y borde ocre, y la lista de chats (fixtures).
- `chat/[matchId]`: cabecera con foto y nombre, píldora "Matched · must-haves met on both sides", burbujas (las mías en granate), tarjeta de visita, sugerencias e input. Enviar añade la burbuja en local.
- `(landlord)/interested`: selector de piso y `TenantCard` (monograma, nombre, "3/3 musts", una rejilla 2×2 con income (×rent) / contract / moves in / household, la frase de las notas y Decline / "Accept · open chat"). Accept → `api.swipe(home, tenant, true)` → `MatchCelebration` en versión casero → chat. Decline → la tarjeta sale y entra la siguiente.
- `(landlord)/chats`, `(landlord)/listings` (tarjetas de 2–3 pisos con foto, precio y "3 interested") y `(tenant)/profile` (la ficha de la entrevista en modo lectura): sencillas, con fixtures.
- **Nunca** mostrar edad, nacionalidad, género, hijos ni foto de la persona.

**C1 · Fotos y fixtures (subagente Claude)** — `public/homes/`, `_lib/fixtures/`
- Descargar de Unsplash (licencia libre) 5–6 fotos verticales por casa para unas 25 casas: interiores de pisos de Barcelona/Europa (salón, dormitorio, cocina, baño, balcón o fachada), 800×1200 en JPG con q≈75 → `public/homes/<homeId>-<n>.jpg`. Comprobar a ojo que cada foto es un interior real y que las de una casa encajan entre sí.
- Mirar la rama de Asier (cuando exista) para usar **los mismos `homeId`** que su seed; si aún no está, ids `home-01…home-25` y avisar a Asier para que su seed use `photoUrls: ["/homes/home-01-1.jpg", …]`.
- Fixtures validadas con `feedItemSchema`: 5 FeedItem del inquilino demo, 3 inquilinos interesados para la casa demo y 3 chats falsos.

**C2 · Integración (subagente Claude)** — `_lib/api.ts`, notas para el equipo
- Cada ~20 min: `git fetch`; revisar los cambios en `origin/*` (Asier: `src/matching`, rutas; Adolfo: `src/interview`) y en `src/domain/profile.ts`.
- Implementar el modo `api` del adaptador según las rutas reales; dejar `mock` como fallback.
- Preparar un PR o parche para Adolfo que monte `InterviewView` en su `InterviewScreen` (mapeando `status`, `phase` y `profile`; `speaker` a partir de los eventos de audio de Realtime si hay tiempo), **sin tocar su lógica**. Lo aplica él o se acuerda con él.
- Apuntar en `docs/3-plan-ui.md § Integración` lo que falta de los demás (ruta de likes, ids de fotos…).

### F2 · Revisión (Claude)
Por cada entrega de Gemini: leer el diff completo; `npm run lint && npm run build`; abrir en el
navegador a 390×844 y comprobar contra el mockup (colores, tipografía, espaciado, la misma casita);
probar gestos con ratón; corregir directamente lo pequeño y devolver a Gemini lo grande con
feedback concreto. Comprobar que no se usan rutas o datos fuera del adaptador. Commit por feature.

### F3 · Unir y ensayar
Merge de `main` (y de las ramas de Asier y Adolfo cuando estén) en `feat/ui`; poner
`NEXT_PUBLIC_DATA_SOURCE=api`; recorrido completo: entrevista (o plan B) → Discover → like a la
casa demo → en la ventana del casero, Interested → Accept → celebración en las dos ventanas →
chat. Dos ensayos seguidos sin fallo.

## 6. Definición de hecho (UI)
- [ ] `npm run lint` y `npm run build` limpios.
- [ ] Todas las pantallas del mockup existen y se parecen a él a 390×844.
- [ ] Un único `Homie`, con tejado granate en todas partes.
- [ ] Swipe fluido a 60 fps con ratón; no se puede saltar una casa sin decidir.
- [ ] Con `mock` funciona todo sin backend; con `api`, contra las rutas de Asier.
- [ ] La vista de entrevista funciona con el simulador y está lista para enchufarla en Adolfo.
- [ ] Ningún dato discriminatorio en pantalla.

## Integración (lo va rellenando C2)
Última revisión: `git fetch` del 2026-11-21. Ramas remotas: `origin/main`, `origin/feat/voice-interview`.

- **Adolfo (`origin/feat/voice-interview`, último `ed5a73f`)**: entrevista de voz con OpenAI Realtime
  en `src/interview/**`, `POST /api/voice/session` (clave temporal) y la página `src/app/interview/page.tsx`
  (`/interview?role=tenant|home`). Herramientas `save_facts`, `complete_facts`, `save_requirement`,
  `finish_interview`; fases `facts → requirements → done`. Actualiza `docs/2-system-design.md`
  (ElevenLabs → OpenAI, tabla de rutas).
- **Asier**: aún no hay rama en remoto. El modo `api` de `_lib/api.ts` sigue la tabla de
  `docs/2-system-design.md` tal cual (`/api/feed`, `/api/swipes`, `/api/matches`, `/api/profiles/:id`)
  y cae a mock si una ruta falla.
- **Deriva del contrato**: ninguna. Ni la rama de Adolfo ni main tocan `src/domain/profile.ts` ni
  `swipe.ts` respecto a lo que usamos.
- **Conflictos**: ninguno. `feat/ui` y la rama de Adolfo no comparten ficheros; él tiene
  `src/app/interview` y `src/app/api/voice`, nosotros el resto de `src/app` (la vista de prueba está
  en `/interview-preview`). Su página se pintará dentro de nuestro `PhoneFrame` (layout raíz).
- **Pendiente de Asier**:
  - `GET /api/likes?profileId=<homeId>` → `FeedItem[]` con los inquilinos que han dado like a esa casa
    y pasan los imprescindibles de los dos lados (pestaña Interested). Hasta entonces, mock.
  - `GET /api/profiles/:id` → `Profile`.
  - `POST /api/swipes` con cuerpo `Swipe` (`{ fromProfileId, toProfileId, liked }`) → `{ match: FeedItem | null }`.
  - Seed con ids `home-01…home-25` y `photoUrls: ["/homes/home-NN-1.jpg", …]` (las fotos las está bajando C1 a `public/homes/`).
  - Nombre del casero por casa (ahora sale de `landlordNames` en las fixtures); un campo o una tabla aparte.
- **Pendiente de Adolfo**:
  - Aplicar `docs/ui/patches/adolfo-mount-interview-view.patch` tras unir `feat/ui` (ver
    `docs/ui/patches/README.md`): monta `InterviewView` sin tocar su lógica y ya expone `speaker`,
    `agentLine`, `justSaved` y `onContinue`.
  - Para `userLine`, activar la transcripción de entrada en la sesión Realtime.
  - Llamar a `PATCH /api/profiles/:id` (o `saveProfile`) cuando Asier tenga la ruta, para que el
    perfil de la entrevista llegue al feed.
- **Pasar a modo `api`**: `NEXT_PUBLIC_DATA_SOURCE=api` en `.env.local` y reiniciar `next dev` (es una
  variable pública: se fija al compilar). Cada llamada que falle avisa en consola
  (`[homie] api.<fn> failed, using mock data`) y usa mock, así que se puede ir activando ruta a ruta.

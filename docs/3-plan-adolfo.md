# Plan: matching de vivienda por voz (parte de Adolfo)
Spec: 1-spec.md · Design: 2-system-design.md

Este plan cubre solo la entrevista de voz. El matching (Asier) y el feed (Ander) siguen el reparto
y el orden del día del diseño.

## v1 (MVP)
Status: approved
Base: F1 · Después: F2 · Al unir con Asier: F3 · Antes de congelar: F4

### F1: Base común · ✅
- Goal: que los tres puedan trabajar en paralelo sin pisarse.
- Delivers: el proyecto arranca y el contrato de datos está en `main`.
- Covers: "Mismo modelo de datos para inquilino y casa" (doc 1).
- Touches: el contrato del diseño (`src/domain/profile.ts`).
- Size: hecho.

#### I0: Proyecto y contrato compartido · ✅
- What: crea la app Next.js y el contrato `Profile` como esquemas zod, con sus tipos.
- Why: es lo único que une las tres partes; sin él nadie puede empezar.
- Evidence: `npm test` 6/6, `npm run lint` sin avisos, `npm run build` compila. Commit
  `build: scaffold next app and shared profile contract`.

### F2: Entrevista de voz que rellena un perfil · ✅
- Goal: sustituir formularios y mensajes por una conversación.
- Delivers: alguien habla con el agente y ve sus campos rellenarse en pantalla.
- Covers: entrevista en dos fases, pregunta "¿es imprescindible?", cierre "¿quieres añadir algo?" (doc 1).
- Touches: "La entrevista de voz" y la ruta `POST /api/voice/session` (doc 2).
- Open questions: si las bases obligan a usar OpenAI para lo central.
- Depends on: F1.
- Size: unas 2 h 45 min.

#### I1: Aplicar una llamada del agente a un perfil · ✅
- What: una función que recibe lo que el agente quiere apuntar (un hecho, el fin de la fase de
  hechos, un requisito o el cierre de la entrevista) y devuelve el perfil actualizado junto con
  los hechos que faltan. Si el agente manda algo que no encaja en el
  contrato, devuelve un error y el perfil no cambia.
- Why: es donde se decide qué entra en un perfil. Lo que dice un modelo no es de fiar hasta que
  pasa por el contrato.
- Depends on: I0.
- Changes:
  - Función pura en `src/interview` para `save_facts`, `complete_facts`, `save_requirement` y
    `finish_interview`.
  - El valor de un requisito se valida contra el campo al que apunta.
  - Validación con los esquemas de `src/domain/profile.ts`.
- Acceptance:
  - `save_facts({ hasPets: true })` sobre un inquilino en borrador deja `facts.hasPets` en `true`.
  - `save_requirement` con `isMust` añade el requisito marcado como imprescindible; un segundo
    requisito sobre el mismo campo sustituye al primero.
  - `complete_facts` se acepta solo con todos los hechos; si falta alguno, devuelve cuáles.
  - Un campo que no existe (por ejemplo `nationality`) devuelve error y el perfil queda igual.
  - `finish_interview(notes)` guarda las notas y pasa el estado a `complete` solo si están todos
    los hechos; si falta alguno, devuelve cuáles.
  - El perfil que se pasa a la función no se modifica.
- Out: guardar en servidor (I5).
- DoD:
  - [ ] Lint, tests y build pasan
  - [ ] Tests nuevos según `testing.md`
  - [ ] Código en `src/interview`
  - [ ] Logs: N/A (función pura)
  - [ ] Commit según `git.md`
- Evidence: `npm test` con 15 tests nuevos en `src/interview/toolCall.test.ts`, lint y build pasan.
  Commit `feat: apply voice agent tool calls to a profile`.

#### I2: Guiones y herramientas de los dos agentes · ✅
- What: escribe en el código la configuración de los dos agentes. El de la fase 1 entrevista sobre
  lo que la persona o la casa ofrece y solo puede apuntar hechos. El de la fase 2 pregunta qué
  busca, tras cada cosa si es imprescindible, y cierra con "¿quieres añadir algo?"; solo puede
  apuntar requisitos. El guion cambia según el rol y saca la lista de campos del contrato.
- Why: es la conversación que ve el jurado, y tenerla en el código evita que el guion y el contrato
  digan cosas distintas.
- Depends on: I1.
- Changes:
  - Función en `src/interview/agents` que, dado un rol y una fase, devuelve el guion y las
    definiciones de herramientas.
- Acceptance:
  - La configuración de la fase 1 de un inquilino nombra sus siete hechos y solo ofrece `save_facts`
    y `complete_facts`.
  - La configuración de la fase 2 solo ofrece `save_requirement` y `finish_interview`, y sus campos
    son los hechos del otro rol.
  - Ningún guion menciona nacionalidad, edad, género ni hijos como algo que preguntar.
- DoD:
  - [ ] Lint, tests y build pasan
  - [ ] Tests nuevos según `testing.md`
  - [ ] Código en `src/interview/agents`
  - [ ] Logs: N/A
  - [ ] Commit según `git.md`
- Evidence: 15 tests en `src/interview/agents.test.ts`, lint y build pasan. Commit
  `feat: build scripts and tools for the interview agents`. Incluye un tercer agente sin
  herramientas que solo se despide.

#### I3: Ruta de la sesión de voz · ✅
- What: una ruta del servidor que pide a OpenAI una clave temporal y la devuelve al navegador.
- Why: la clave de OpenAI no puede llegar al navegador.
- Depends on: nada.
- Changes:
  - `POST /api/voice/session`.
  - Lectura y validación de `OPENAI_API_KEY`.
- Acceptance:
  - Con la clave configurada devuelve una clave temporal.
  - Sin clave configurada devuelve un error genérico y el detalle va al log del servidor.
  - Si OpenAI responde con error, devuelve un error genérico y el detalle va al log.
- DoD:
  - [ ] Lint, tests y build pasan
  - [ ] Tests nuevos según `testing.md`
  - [ ] Código en `src/interview` y la ruta en `src/app/api/voice/session`
  - [ ] Logs según `logging.md`
  - [ ] Commit según `git.md`
- Evidence: 6 tests en `src/interview/voiceSession.test.ts`. Llamada real:
  `curl -X POST localhost:3000/api/voice/session` devolvió HTTP 200 con una clave `ek_…`. Commit
  `feat: add voice session route that issues a temporary openai key`.

#### I4: Pantalla de entrevista con campos en vivo · ✅
- What: la pantalla donde la persona pulsa para empezar, habla con el agente de la fase 1 y luego
  con el de la fase 2, y ve cómo se rellenan sus hechos y requisitos mientras habla.
- Why: es el momento de la demo.
- Depends on: I1, I2, I3.
- Changes:
  - Conexión WebRTC con la Realtime API y manejo de las llamadas a herramientas, que pasan por I1.
  - Relevo: al aceptarse `complete_facts`, envía la configuración de la fase 2 a la misma sesión.
  - Vista de los campos, distinguiendo imprescindibles de preferencias.
  - El perfil se guarda en memoria del navegador hasta I5.
- Acceptance:
  - Tras hablar un minuto, los hechos y requisitos dichos aparecen en pantalla.
  - Con todos los hechos, el agente pasa a preguntar qué buscas sin cortar la conversación.
  - Al terminar, el perfil queda como `complete`.
  - Si el agente manda algo inválido, se le devuelve el error y la pantalla no cambia.
- DoD:
  - [ ] Lint, tests y build pasan
  - [ ] Tests: lo que no cubran I1 e I2
  - [ ] Código en `src/interview`
  - [ ] Logs según `logging.md`
  - [ ] Commit según `git.md`
- Evidence: `npm test` 68/68, lint y build pasan. Entrevista completa contra la Realtime API real
  en modo texto, para inquilino y para casero: hechos, relevo de agente, requisitos y perfil
  `complete`. La pantalla `/interview?role=tenant|home` carga y enseña los campos. Falta probarla
  hablando: el navegador automático no puede aceptar el permiso del micrófono.

### F3: Guardar de verdad · todo
- Goal: que lo que sale de la entrevista llegue al matching.
- Delivers: tras la entrevista, el perfil aparece en el feed del otro lado.
- Covers: el "Hecho" de doc 1.
- Touches: `POST /api/profiles` y `PATCH /api/profiles/:id` (doc 2).
- Depends on: F2 y las rutas de Asier.
- Size: unos 20 min.

#### I5: Guardar el perfil con las rutas de Asier

### F4: Plan B · descartado
- Goal: que la demo no dependa de que la voz funcione en directo.
- Delivers: la entrevista se puede completar escribiendo, y hay un perfil de demo ya entrevistado.
- Covers: el pozo "Voz en directo" de doc 1.
- Touches: "Plan B" en doc 2.
- Depends on: F2.
- Size: unos 30 min.

#### I6: Modo solo texto y perfil de demo precargado

## Later
- Concertar la visita tras el match, con o sin chat: doc 1, "Si sobra tiempo".
- Subida de fotos para una casa creada en vivo: atajo del diseño.
- Cuentas y permisos por perfil: atajo del diseño.

## Decisions
- 2026-11-21: el plan cubre solo la parte de Adolfo; cada uno planifica la suya.
- 2026-11-21: los tests usan el runner que trae Node, para no añadir otra dependencia.
- 2026-11-21: hasta que existan las rutas de Asier, la entrevista guarda el perfil en el navegador.
- 2026-11-21: voz con la Realtime API de OpenAI en vez de ElevenLabs. Un agente por fase (primero
  qué ofreces, después qué buscas) y relevo hecho por nuestro código. Las fases no se mezclan porque cada agente solo tiene sus herramientas.
- 2026-11-21, Adolfo: sin plan B. La demo es un vídeo de un minuto que incluye 10-15 segundos de
  entrevista grabada por nosotros, así que la voz no tiene que funcionar en directo ante el jurado.
- 2026-11-21: Adolfo probó la entrevista por voz en el navegador y funciona.

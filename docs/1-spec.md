# Matching de vivienda por entrevista de voz (nombre provisional)

Mode: showcase (hackathon)
Status: approved

## Objetivo
Ganar el hackathon. El reto es "help someone take a concrete step on the housing problem". El jurado
mira tres cosas: si es mejor que lo que ya existe, si funciona y si resuelve el reto.

La idea, en palabras del equipo: cuando buscas piso aplicas a cientos de anuncios y te responden
pocos, porque al otro lado hay alguien recibiendo 100 mensajes que pierde horas filtrando. Queremos
que cada lado reciba al otro ya filtrado. La transcripción original está en `primera_idea.md`.

Si la idea da para startup se mira después del hackathon; hoy no condiciona nada.

## Problema
Quien busca piso pierde una hora al día escribiendo a 100-300 anuncios, y el casero no puede leer
los 90+ mensajes que recibe, porque ante la escasez todos escriben a todo.

## Hoy
Idealista y similares: el inquilino escribe a todo "por si acaso"; el casero filtra a mano y
responde tarde o nunca (respuestas dos meses después, cuando ya tienes casa).

## Audiencia
El jurado del hackathon. Tiene que pensar: "nadie pierde tiempo con pisos o personas que no
cumplen, porque llegan filtrados en los dos lados, y solo han tenido que hablar 5 minutos".

## Ya existe
- Badi: "el Tinder de la vivienda" (habitaciones, Barcelona).
- Rentberry AI: swipe sobre matches filtrados por IA.
- Rentinder: proyecto de hackathon con swipe y LLM.
- Rentalot: pre-screening por voz, solo para caseros.

Ninguno encontrado junta entrevista de voz en los dos lados con match mutuo por requisitos.
Decisión: construir. El swipe no es el argumento; lo es el filtrado mutuo sin formularios.

## Apetito
Hoy (2026-11-21), tres personas trabajando con IA.

## Hecho
En la demo alguien habla con el agente, se ven sus campos rellenados, aparece su feed sin ninguna
opción que incumpla un imprescindible de cualquiera de los dos lados, y un like mutuo muestra el
match con sus razones.

## MVP (dentro)
| Función | Criterio de aceptación |
|---|---|
| Entrevista de voz en dos fases, cada una con su agente: primero qué ofreces, después qué buscas; para inquilino y para casero | Tras hablar, los campos fijos de esa persona o casa quedan rellenados y se ven en pantalla |
| Pregunta "¿es imprescindible?" | Cada campo que la persona menciona queda marcado como imprescindible o preferencia |
| Cierre "¿quieres añadir algo?" | Lo que diga se guarda como texto libre |
| Mismo modelo de datos para inquilino y casa | Una sola lista cerrada de campos objetivos describe a ambos |
| Filtro mutuo por imprescindibles | Ninguna opción del feed incumple un imprescindible de ninguno de los dos lados |
| Orden por preferencias y texto libre | El feed muestra las 5 mejores opciones, de más a menos afín |
| Feed vertical en web con forma de móvil | El inquilino ve casas y el casero ve perfiles; puede dar like o descartar |
| Pantalla de match | Con like mutuo aparece el match y las razones (qué requisitos se cumplen) |
| Datos inventados | 20-30 casas y 20-30 inquilinos de Barcelona cargados antes de la demo |

## Fuera
- Pago de 20 € por urgencia: se menciona en el pitch, no se construye.
- Registro y contraseñas: se entra eligiendo "soy inquilino" o "soy casero".
- Límite real de 5 al día: se muestran los 5 mejores, sin lógica de días.
- Verificación de nóminas y documentos: vale lo que se dice en la entrevista.
- Anuncios reales: no hay API pública utilizable hoy y el scraping va contra las condiciones de los portales.
- Campos de nacionalidad, edad, género o hijos: no existen; el agente no los pregunta ni los guarda. Filtrar por ellos es discriminación ilegal en alquiler.
- Chat entre inquilino y casero.

Si sobra tiempo: concertar la visita tras el match (con o sin chat; se decide entonces). Los huecos
de visita no se preguntan en la entrevista.

## Pozos
- Requisitos libres juzgados por un modelo: el filtro lo hace el código sobre campos fijos; el texto libre solo ordena.
- "A 10 minutos de mi universidad": se convierte en zonas o barrios, sin cálculo de rutas.
- Feed vacío en la demo: los datos inventados se generan para que haya matches con los perfiles de la demo.
- Voz en directo: es la pieza de más riesgo; hace falta un plan B (entrevista ya hecha o por texto).

## Éxito
La demo funciona de principio a fin delante del jurado y responde a sus tres preguntas.

## Piezas
| Pieza | Central/periférica | Quién |
|---|---|---|
| Modelo de datos compartido (campos fijos) | Central | Los tres, antes de repartir |
| Entrevista de voz y extracción de campos | Central | Adolfo |
| Matching, datos inventados y razones del match | Central | Asier |
| Feed y pantalla de match | Central | Ander |

## Decisiones
- 2026-11-21, Adolfo: el motivo es ganar; modo showcase.
- 2026-11-21, Adolfo: los dos lados se entrevistan por voz, con el mismo modelo de datos, en dos fases y con un agente por fase: primero qué ofreces (más personal), después qué buscas.
- 2026-11-21, Adolfo: imprescindibles descartan en ambos sentidos; preferencias ordenan. El agente pregunta si cada cosa es imprescindible.
- 2026-11-21, Adolfo: lista cerrada de campos más texto libre al final.
- 2026-11-21, Adolfo: solo campos objetivos como filtro.
- 2026-11-21, Adolfo: el MVP acaba en la pantalla de match; la visita es un extra.
- 2026-11-21, Adolfo: web con forma de móvil.
- 2026-11-21, Adolfo: datos inventados, 20-30 de cada.

## Preguntas abiertas
- Hora exacta de entrega: preguntar a la organización.
- Formato y duración de la demo (en vivo o vídeo): preguntar a la organización.
- Si es obligatorio usar algún producto concreto de OpenAI: mirar las bases.
- Fotos de una casa creada en vivo: propuesta, fotos precargadas sin subida.

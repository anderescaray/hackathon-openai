# Parches para el equipo

## `adolfo-mount-interview-view.patch` (para Adolfo)

Cambia solo `src/interview/InterviewScreen.tsx` (de `origin/feat/voice-interview`) para que pinte la
vista de la UI, `InterviewView` (`src/app/_features/interview/InterviewView.tsx`), en lugar de tu JSX.

**Tu lógica no se toca:** conexión Realtime, `handleToolCall`, cambio de fase, despedida,
`endCall`/`startCall` y `handleDropped` siguen igual. Lo que cambia:

- El `return` pinta `<audio ref={audioRef} autoPlay />` (el mismo) y al lado `<InterviewView />` con
  `role`, `status` (`dropped` se enseña como `failed`), `phase`, `profile`, `onStart={startCall}` y
  `onEnd={endCall}`.
- Estado solo de presentación, que se lee en `handleServerEvent` **antes** de los `return` tempranos:
  - `speaker`: `output_audio_buffer.started` → `agent`; `output_audio_buffer.stopped/cleared` y
    `input_audio_buffer.speech_stopped` → `none`; `input_audio_buffer.speech_started` → `user`.
  - `agentLine`: `response.output_audio_transcript.delta` (se va acumulando) y `.done`.
  - `userLine`: `conversation.item.input_audio_transcription.completed`. Solo llega si activas la
    transcripción de entrada en la sesión (`audio.input.transcription`); si no, la vista oculta la frase.
  - `justSaved`: los `output.saved` de las tool calls aceptadas (anima esas fichas).
- `onContinue` (botón del final): `setSession({ profileId: profile.id, role })` y va a `/discover`
  (inquilino) o `/interested` (casero).
- Se quitan los imports y constantes que solo usaba el JSX viejo (`labels.ts`, `ROLE_TITLES`,
  `PHASE_TITLES`, `STATUS_MESSAGES`). `labels.ts` y sus tests siguen en su sitio.

### Cómo aplicarlo

Después de unir `feat/ui` en tu rama (para que existan `src/app/_features` y `src/app/_lib`), desde
la raíz del repo:

```bash
git apply --check docs/ui/patches/adolfo-mount-interview-view.patch
git apply docs/ui/patches/adolfo-mount-interview-view.patch
```

Comprobado con `git apply --check` sobre tu fichero actual (commit `ed5a73f`), y con `tsc` y `eslint`
limpios. Si cambias `InterviewScreen.tsx` antes de aplicarlo, avísanos y lo regeneramos.

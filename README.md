# hackathon-openai

Matching de vivienda por entrevista de voz. Qué es y por qué: `docs/1-spec.md`. Cómo está montado:
`docs/2-system-design.md`.

## Arrancar

```bash
npm install
cp .env.example .env.local   # y rellena las claves
npm run dev                  # http://localhost:3000
```

## Comprobar

```bash
npm test        # tests
npm run lint
npm run build
```

## Carpetas

| Carpeta | Dueño | Qué |
|---|---|---|
| `src/domain` | Los tres | El contrato: `profile.ts`. Se cambia avisando a los otros dos. |
| `src/db` | Los tres | La base de datos SQLite: `store.ts` guarda y lee perfiles y swipes. Se crea sola en `data/app.db`. |
| `src/interview` | Adolfo | Entrevista de voz |
| `src/matching` | Asier | Datos, filtro, orden y rutas |
| `src/app` | Ander | Feed y pantalla de match |

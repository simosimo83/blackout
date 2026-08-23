# BLACKOUT — MVP

> Un blackout. Un oggetto scomparso. Una sola linea rivela il ladro.

Web app mobile-first per validare il concept **BLACKOUT**: sei casi in cui si
disegna un unico circuito chiuso sulla planimetria, rispettando gli indizi
numerici. Il circuito racchiude la zona rimasta al buio e la zona rivela il
sospettato e l'oggetto rubato.

Stack: **Next.js (App Router) + React + TypeScript**, CSS proprio, dati dei casi
letti lato server, nessun account.

## Avvio rapido

```bash
npm install
npm run dev          # http://localhost:3000
```

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Sviluppo |
| `npm run build` / `npm start` | Build e avvio in produzione |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Test di logica (Vitest) |
| `npm run test:e2e` | Test end-to-end (Playwright, mobile + desktop) |
| `npm run verify` | lint + typecheck + test |

Se i browser di Playwright sono preinstallati fuori dalla cache di default:
`CHROMIUM_PATH=/percorso/chrome npm run test:e2e`.

## Struttura

```
app/
  page.tsx                    homepage
  tutorial/                   tutorial interattivo (griglia dimostrativa 3x3)
  casi/                       archivio dei sei casi
  casi/[id]/                  pagina di gioco
  api/blackout/cases          metadati dei casi
  api/blackout/cases/[id]     contenuto giocabile (senza soluzione)
  api/blackout/cases/[id]/check   verifica del circuito
  api/blackout/cases/[id]/hint    suggerimenti (3 livelli)
  api/waitlist                iscrizione alla lista d'attesa
  api/analytics               eventi proprietari
components/                   planimetria, toolbar, risultato, form
lib/
  slitherlink.ts              logica pura del circuito (client + server + test)
  cases.server.ts             accesso ai dati, verifica, suggerimenti (solo server)
  solver.ts                   risolutore di riferimento usato dai test
  progress.ts                 progressi in localStorage
  analytics.ts                invio eventi
  i18n/it.ts                  tutte le stringhe dell'interfaccia
data/blackout_6_casi_data.json  sorgente master dei sei casi
tests/                        test di logica e delle API
e2e/                          test end-to-end
```

## Come sono protetti i contenuti sensibili

`data/blackout_6_casi_data.json` viene **letto dal filesystem a runtime**, mai
importato: soluzione, `region`, `answer` ed epilogo non entrano in nessun bundle
client e non compaiono nell'HTML prerenderizzato. Il payload pubblico di un caso
contiene solo storia, indizi, sospettati e oggetti.

La rivelazione (colpevole, oggetto, epilogo, zona buia) arriva **solo** dalla
risposta di `POST /api/blackout/cases/:id/check` a verifica corretta. In caso di
errore la risposta elenca soltanto gli indizi incompatibili, mai i bordi giusti.

Formato dei bordi: `r2c3-top`, `r2c3-right`, `r2c3-bottom`, `r2c3-left`. L'API
accetta tutti e quattro i lati e li normalizza (il lato destro di una stanza è il
lato sinistro della successiva).

## Suggerimenti

1. **Regola logica** — un consiglio scelto in base allo stato attuale, senza
   toccare la griglia.
2. **Passaggio certo** — corregge un bordo sbagliato oppure ne rivela uno certo.
3. **Sblocco** — rivela da tre a cinque bordi della soluzione.

Ogni uso viene registrato negli analytics (`hint_used` con `hint_level`); un caso
risolto con suggerimenti resta valido e il risultato lo indica.

## Progressi

Nessun account. In `localStorage` (`blackout.progress.v1`) restano ID anonimo,
casi iniziati e completati, stato della griglia, tempo trascorso, miglior tempo,
errori, suggerimenti usati e data dell'ultima sessione. Ricaricando la pagina si
riprende esattamente da dove si era rimasti. Il caso 1 è aperto; ogni caso
completato sblocca il successivo.

## Variabili d'ambiente

Vedere `.env.example`. Tutte opzionali.

| Variabile | Default | Descrizione |
| --- | --- | --- |
| `DATABASE_URL` | — | Postgres per lista d'attesa ed eventi. Le tabelle vengono create al primo uso. |
| `BLACKOUT_DATA_DIR` | `.data/` | Cartella dei file JSONL usati quando non c'è Postgres. |
| `BLACKOUT_STORE` | — | `memory` per non scrivere nulla su disco. |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `internal` | Elenco separato da virgole: `internal`, `plausible`, `ga`, `posthog`, `none`. |
| `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` | — | Script del provider esterno, caricato nel layout. |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | — | Attributo `data-domain` per lo script. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG` | — | `1` per stampare gli eventi in console. |

Eventi inviati: `landing_view`, `play_cta_click`, `tutorial_start`,
`tutorial_complete`, `case_start`, `first_interaction`, `hint_used`,
`check_attempt`, `case_complete`, `next_case_click`, `share_result`,
`email_capture_view`, `email_submitted`. Ogni evento porta con sé `game`,
`case_id`, `difficulty`, `duration_seconds`, `wrong_checks`, `hints_used`,
`device_type`, `utm_source`, `utm_campaign`, `referrer`, `new_or_returning`.

## Deploy

Compatibile con Vercel, Railway e simili: `npm run build` + `npm start`.
`next start` ascolta sulla porta indicata da `PORT`, quindi non serve altra
configurazione. Il file dei casi viene incluso nel deploy tramite
`outputFileTracingIncludes` in `next.config.ts`.

### Railway

`railway.json` contiene già build, start e healthcheck. Dal dashboard basta
creare un progetto da questo repository; da riga di comando:

```bash
npm i -g @railway/cli
railway login                    # oppure export RAILWAY_API_TOKEN=...
railway init --name blackout
railway up                       # build e deploy della cartella corrente
railway domain                   # assegna un dominio pubblico
```

Il filesystem di Railway è effimero: per non perdere email ed eventi a ogni
deploy, scegliere una delle due strade.

```bash
# Postgres gestito (consigliato)
railway add --database postgres
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
```

oppure montare un volume sul percorso di `BLACKOUT_DATA_DIR` (default `.data/`).

### Vercel

Il filesystem è in sola lettura: impostare `DATABASE_URL` (Postgres) per salvare
email ed eventi, altrimenti restano in memoria e vanno persi al riavvio.

## Traduzioni

Tutte le stringhe visibili stanno in `lib/i18n/it.ts`. Per aggiungere inglese o
spagnolo basta copiare il file, tradurre i valori e registrare il locale in
`lib/i18n/index.ts`.

## Nota sui dati dei casi

Il file originale del prototipo lasciava al caso 6 **due** soluzioni valide. È
stato aggiunto un solo indizio, `[3, 1, 1]`, che riporta il caso alla soluzione
prevista (regione e colpevole invariati). Tutto il resto dei dati è identico
all'originale; `tests/cases.test.ts` verifica l'unicità della soluzione di tutti
e sei i casi, la coerenza degli indizi e la corrispondenza fra zona buia,
sospettato e oggetto.

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
`CHROMIUM_PATH=/percorso/chrome npm run test:e2e`. Per lanciare i test contro
un'istanza già in esecuzione: `E2E_BASE_URL=https://... npm run test:e2e`
(con `E2E_PROXY` se serve un proxy in uscita).

Il progetto richiede **Node 20.9 o superiore** (vedi `engines` in
`package.json` e `.nvmrc`).

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

## Impaginazione su telefono

La pagina di gioco è pensata perché planimetria e comandi stiano in una sola
schermata anche su un 360x640:

- intestazione compatta, storia ridotta a poche righe con "Leggi tutto";
- barra Linea/Escludi e tempo appiccicati in alto, annulla/ripristina/reset e
  zoom subito sotto la planimetria;
- "Verifica" e "Suggerimento" in una barra fissa in fondo, dentro l'area del
  pollice e rispettando le safe area di iOS;
- la planimetria si rimpicciolisce quanto basta a stare tutta sopra la barra e
  torna a scorrere dentro il suo riquadro quando la si ingrandisce;
- in orizzontale sotto i 430 px di altezza restano solo titolo e planimetria;
- il risultato diventa un pannello che sale dal basso, con le azioni sempre
  visibili.

Sul tocco: il trascinamento sui bordi disegna (mantenendo l'orientamento, così
seguendo un muro non si accendono i bordi trasversali), mentre il trascinamento
al centro delle stanze scorre la pagina o sposta la planimetria ingrandita.
L'area sensibile di un bordo non scende mai sotto i 15 px per lato.

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

**Istanza live:** https://blackout-web-production.up.railway.app
(progetto `blackout`, servizio `blackout-web`, volume da 5 GB montato su `/data`
con `BLACKOUT_DATA_DIR=/data`, così email ed eventi sopravvivono ai deploy).

Il servizio è collegato a questo repository: **ogni push sul branch
`claude/blackout-mvp-webapp-lazzhp` fa partire da solo build e deploy**, senza
comandi da lanciare. Per cambiare branch (per esempio passando a `main` dopo il
merge) basta il dashboard Railway, oppure:

```bash
railway service blackout-web
railway link --project blackout
# dal dashboard: Settings → Source → Branch
```

Resta possibile pubblicare a mano la cartella corrente, utile per provare
qualcosa senza committare:

```bash
railway up --service blackout-web --detach
```

`railway.json` contiene già build, start e healthcheck (formato deprecato ma
valido fino al 2026-12-01: `railway config migrate --apply` genera la versione
`.railway/railway.ts`, da rivedere perché rinomina il servizio). Dal dashboard
basta creare un progetto da questo repository; da riga di comando:

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

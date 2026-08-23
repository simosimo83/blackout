/**
 * Tutte le stringhe dell'interfaccia in italiano.
 * Per aggiungere una lingua: copiare questo file (es. `en.ts`), tradurre i
 * valori e registrarlo in `lib/i18n/index.ts`. Nessun testo visibile deve
 * essere scritto direttamente nei componenti.
 */
export const it = {
  locale: "it",
  meta: {
    title: "BLACKOUT — Un blackout. Un oggetto scomparso. Una sola linea rivela il ladro.",
    description:
      "Durante pochi secondi di buio è avvenuto un furto impossibile. Ricostruisci la zona non sorvegliata e scopri chi si trovava al suo interno.",
    siteName: "BLACKOUT",
  },
  nav: {
    cases: "Casi",
    tutorial: "Come si gioca",
    brand: "BLACKOUT",
  },
  home: {
    kicker: "Sei casi. Un solo circuito per ciascuno.",
    title: "BLACKOUT",
    tagline: "Un blackout. Un oggetto scomparso. Una sola linea rivela il ladro.",
    intro:
      "Durante pochi secondi di buio è avvenuto un furto impossibile. Ricostruisci la zona non sorvegliata e scopri chi si trovava al suo interno.",
    ctaPrimary: "Gioca il primo caso",
    ctaSecondary: "Come si gioca",
    noAccount: "Nessuna registrazione. Si gioca subito, dal browser.",
    stepsTitle: "Tre passaggi",
    steps: [
      {
        title: "Leggi gli indizi",
        body: "Ogni numero indica quanti lati di quella stanza fanno parte del circuito di sorveglianza.",
      },
      {
        title: "Disegna un solo circuito",
        body: "Una linea chiusa sui bordi delle stanze: niente incroci, niente ramificazioni, niente tratti sospesi.",
      },
      {
        title: "Rivela la zona buia",
        body: "Le stanze racchiuse dal circuito restano al buio: dentro ci sono un sospettato e un oggetto.",
      },
    ],
    casesTitle: "I sei casi",
    casesSubtitle: "Ogni caso risolto sblocca il successivo.",
    howTitle: "Come funziona",
    howBody:
      "BLACKOUT è un gioco di deduzione pura: nessuna fortuna, nessun tentativo alla cieca. Ogni caso ha una sola soluzione possibile e si risolve solo con la logica degli indizi. Se ti blocchi, tre livelli di suggerimento ti rimettono in pista senza risolvere il caso al posto tuo.",
    howPoints: [
      "Si gioca da telefono e da computer, senza installare nulla.",
      "I progressi restano salvati su questo dispositivo, anche dopo il refresh.",
      "Ogni caso richiede dai 3 ai 20 minuti.",
    ],
    finalCtaTitle: "Le luci si spengono fra poco.",
    finalCtaBody: "Il primo caso dura meno di cinque minuti.",
    finalCta: "Entra nel primo caso",
  },
  waitlist: {
    title: "Nuovi casi in arrivo",
    body: "Lascia la tua email per essere avvisato quando pubblichiamo il prossimo blackout. Niente altro, nessuno spam.",
    placeholder: "la-tua@email.it",
    submit: "Avvisami",
    submitting: "Invio…",
    success: "Perfetto. Ti avviseremo al prossimo caso.",
    errorInvalid: "Controlla l'indirizzo email.",
    errorGeneric: "Non è stato possibile salvare l'email. Riprova fra poco.",
    afterCaseTitle: "Vuoi i prossimi casi?",
    afterCaseBody: "Hai risolto due casi. Lasciaci l'email e ti avvisiamo quando arrivano i nuovi.",
  },
  tutorial: {
    title: "Come si gioca",
    subtitle: "Novanta secondi e sei pronto per il primo caso.",
    stepLabel: (current: number, total: number) => `Passo ${current} di ${total}`,
    next: "Avanti",
    back: "Indietro",
    finish: "Gioca il primo caso",
    skip: "Salta il tutorial",
    doneTitle: "Sai già tutto.",
    doneBody: "Il resto è deduzione. Il primo caso ti aspetta.",
    stepDoneHint: "Ottimo. Puoi passare avanti.",
    steps: [
      {
        title: "La linea passa sui bordi",
        body: "Il circuito non attraversa le stanze: corre sui loro bordi. Tocca un bordo per accenderlo.",
        task: "Accendi almeno un bordo per continuare.",
      },
      {
        title: "Il numero conta i lati",
        body: "Il numero dentro una stanza dice quanti dei suoi quattro lati fanno parte del circuito. Un 3 vuole esattamente tre lati accesi.",
        task: "Porta la stanza con il 3 ad avere esattamente tre lati accesi.",
      },
      {
        title: "Escludi i bordi impossibili",
        body: "Con la modalità Escludi metti una X sui bordi che sicuramente non fanno parte del circuito. Serve a ragionare, non a sbagliare.",
        task: "Passa alla modalità Escludi e segna almeno una X.",
      },
      {
        title: "Un solo circuito chiuso",
        body: "Alla fine deve restare una sola linea chiusa: niente incroci, niente diramazioni, niente pezzi staccati. Chiudi il circuito rispettando tutti i numeri.",
        task: "Completa il circuito di questa griglia di prova.",
      },
    ],
  },
  cases: {
    title: "Archivio casi",
    subtitle: "Sei blackout, sei zone da ricostruire.",
    caseNumber: (n: number) => `Caso ${n}`,
    difficulty: "Difficoltà",
    duration: "Tempo indicativo",
    bestTime: "Miglior tempo",
    noBestTime: "—",
    status: {
      locked: "Bloccato",
      new: "Da iniziare",
      inProgress: "In corso",
      done: "Completato",
    },
    action: {
      locked: "Risolvi il caso precedente",
      new: "Inizia il caso",
      inProgress: "Riprendi",
      done: "Rigioca",
    },
    lockedHint: (n: number) => `Si sblocca completando il caso ${n}.`,
    resetProgress: "Azzera i progressi",
    resetConfirm: "Vuoi davvero cancellare tutti i progressi salvati su questo dispositivo?",
  },
  game: {
    back: "Archivio",
    timer: "Tempo",
    suspects: "Sospettati",
    objects: "Oggetti",
    toolbar: {
      line: "Linea",
      exclude: "Escludi",
      undo: "Annulla",
      redo: "Ripristina",
      reset: "Reset",
      zoomIn: "Ingrandisci",
      zoomOut: "Riduci",
      resetConfirm: "Cancellare tutto il circuito disegnato?",
    },
    check: "Verifica la soluzione",
    checking: "Verifica…",
    hint: "Suggerimento",
    hintLevel: (n: number) => `Suggerimento ${n} di 3`,
    hintsExhausted: "Hai usato tutti i suggerimenti di questo caso.",
    hintApplied: "I bordi rivelati sono stati aggiunti alla planimetria.",
    close: "Chiudi",
    showResult: "Mostra il risultato",
    solvedBanner: "Zona buia ricostruita.",
    errors: {
      cluesIncompatible: (n: number) =>
        n === 1
          ? "Un indizio non torna: è evidenziato sulla planimetria."
          : `${n} indizi non tornano: sono evidenziati sulla planimetria.`,
      empty: "Non hai ancora tracciato nessun bordo.",
      open: "La linea non è chiusa: da qualche parte si interrompe.",
      branching: "Ci sono incroci o diramazioni: ogni vertice può avere al massimo due bordi.",
      multipleLoops: "Ci sono più circuiti separati. Ne serve uno solo.",
      wrongLoop: "Il circuito è chiuso e coerente con gli indizi, ma non è quello giusto per questo caso.",
      network: "Verifica non riuscita. Controlla la connessione e riprova.",
    },
    attempts: (n: number) => (n === 1 ? "1 verifica errata" : `${n} verifiche errate`),
    hintsUsed: (n: number) => (n === 1 ? "1 suggerimento" : `${n} suggerimenti`),
    noHints: "Nessun suggerimento",
    legend: {
      line: "Bordo sul circuito",
      excluded: "Bordo escluso",
      dark: "Zona buia",
    },
    lockedTitle: "Caso bloccato",
    lockedBody: (n: number) => `Completa prima il caso ${n}.`,
    lockedCta: "Vai all'archivio",
    notFound: "Caso non trovato.",
  },
  result: {
    title: "Caso risolto",
    suspect: "Il sospettato",
    object: "L'oggetto",
    time: "Tempo",
    wrongChecks: "Verifiche errate",
    hints: "Suggerimenti",
    epilogue: "Epilogo",
    withHints: "Risolto con l'aiuto dei suggerimenti.",
    next: "Gioca il prossimo caso",
    allDone: "Hai risolto tutti e sei i casi.",
    allDoneBody: "Nuovi blackout in preparazione: lascia l'email per essere avvisato.",
    share: "Condividi il risultato",
    shareCopied: "Risultato copiato negli appunti.",
    shareTitle: (n: number) => `BLACKOUT #${n}`,
    backToCases: "Torna all'archivio",
    close: "Guarda la planimetria",
    replay: "Rigioca il caso",
    shareText: (p: { caseNumber: number; time: string; hints: number; errors: number }) =>
      [
        `BLACKOUT #${p.caseNumber}`,
        `Risolto in ${p.time}`,
        `Suggerimenti: ${p.hints}`,
        `Errori: ${p.errors}`,
        "Riesci a ricostruire il blackout?",
      ].join("\n"),
  },
  hints: {
    titles: {
      1: "Regola logica",
      2: "Passaggio certo",
      3: "Sblocco",
    },
    rules: {
      branching:
        "Su un vertice possono incontrarsi al massimo due bordi. Dove ne hai fatti convergere tre o quattro, uno è di troppo.",
      deadEnd:
        "Ogni bordo che hai tracciato deve avere una continuazione: un vertice con un solo bordo è una linea che non si chiude mai.",
      over:
        "Una stanza evidenziata ha più lati accesi di quanti ne indica il suo numero: togli i bordi in eccesso prima di andare avanti.",
      zero:
        "Comincia dalle stanze con 0: nessuno dei loro quattro lati fa parte del circuito. Segnali con la X e il resto della planimetria si stringe da solo.",
      threeAdjacent:
        "Due stanze con 3 affiancate: il bordo che le separa fa sempre parte del circuito, e così i due lati opposti esterni.",
      three:
        "Una stanza con 3 lascia libero un solo lato. Se un suo lato è già escluso, gli altri tre sono accesi.",
      cornerOne:
        "Un 1 nell'angolo della planimetria non può usare i due lati esterni dell'angolo: escludili subito.",
      cornerThree:
        "Un 3 nell'angolo della planimetria usa sempre i due lati esterni dell'angolo.",
      two: "Una stanza con 2 ha esattamente due lati accesi: se ne escludi uno, i restanti si riducono a tre candidati.",
      corridor:
        "Il circuito separa il dentro dal fuori: due stanze adiacenti hanno il bordo comune acceso solo se una è dentro e l'altra è fuori.",
      generic:
        "Conta i lati già esclusi intorno a ogni numero: spesso una sola combinazione resta possibile senza dover indovinare nulla.",
    },
    revealLine: "Questo bordo fa parte del circuito. L'ho acceso per te.",
    revealExcluded: "Questo bordo non può fare parte del circuito. L'ho segnato con una X.",
    fixWrong: "Uno dei bordi che hai acceso non appartiene al circuito: l'ho spento e segnato con una X.",
    unlock: (n: number) => `Ho acceso ${n} bordi certi del circuito. Il resto tocca a te.`,
    nothingLeft: "Il circuito è già completo: ti manca solo premere Verifica.",
  },
  difficulty: {
    label: (n: number) => `${n}/5`,
    names: ["", "Facile", "Accessibile", "Impegnativo", "Difficile", "Da esperti"],
  },
  a11y: {
    grid: "Planimetria interattiva",
  },
  footer: {
    tagline: "Un blackout. Un oggetto scomparso. Una sola linea rivela il ladro.",
    rights: "Prototipo di gioco.",
  },
} as const;

export type Strings = typeof it;

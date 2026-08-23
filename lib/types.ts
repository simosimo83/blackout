import type { Cell, Clue, EdgeId } from "./slitherlink";

/** Metadati pubblici di un caso (archivio, homepage). */
export interface CaseMeta {
  id: number;
  title: string;
  location: string;
  difficulty: number;
  time: string;
  rows: number;
  cols: number;
}

export interface TokenSuspect {
  key: string;
  name: string;
  role: string;
  cell: Cell;
}

export interface TokenObject {
  key: string;
  name: string;
  cell: Cell;
}

/** Contenuto giocabile: nessuna traccia di soluzione, regione, colpevole o epilogo. */
export interface PlayableCase extends CaseMeta {
  story: string;
  clues: Clue[];
  suspects: TokenSuspect[];
  objects: TokenObject[];
  hintLevels: number;
}

/** Rivelazione, inviata solo dopo una verifica corretta. */
export interface CaseReveal {
  suspect: TokenSuspect;
  object: TokenObject;
  epilogue: string;
  region: Cell[];
  solution: EdgeId[];
}

export type CheckFailureReason =
  | "empty"
  | "open"
  | "branching"
  | "multipleLoops"
  | "clues"
  | "wrongLoop";

export interface CheckSuccess {
  solved: true;
  reveal: CaseReveal;
}

export interface CheckFailure {
  solved: false;
  reason: CheckFailureReason;
  /** Solo gli indizi incompatibili: mai i singoli bordi corretti. */
  invalidClues: Cell[];
}

export type CheckResult = CheckSuccess | CheckFailure;

export type HintLevel = 1 | 2 | 3;

export interface Hint {
  level: HintLevel;
  /** `rule` non tocca la griglia, `edges` aggiunge bordi o esclusioni. */
  kind: "rule" | "edges";
  title: string;
  text: string;
  lines: EdgeId[];
  excluded: EdgeId[];
}

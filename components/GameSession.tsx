"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import {
  completedCount,
  formatDuration,
  getCaseProgress,
  loadProgress,
  saveProgress,
  setCaseProgress,
  TOTAL_CASES,
  type Progress,
} from "@/lib/progress";
import type { Cell, EdgeId } from "@/lib/slitherlink";
import type { CaseReveal, CheckResult, Hint, PlayableCase } from "@/lib/types";
import GridBoard, { type BoardMode, type EdgeValue } from "./GridBoard";
import ResultPanel from "./ResultPanel";
import Toolbar from "./Toolbar";

interface BoardState {
  lines: EdgeId[];
  excluded: EdgeId[];
}

export interface SessionStart {
  lines: EdgeId[];
  excluded: EdgeId[];
  elapsedMs: number;
  wrongChecks: number;
  hintsUsed: number;
  firstInteraction: boolean;
  resumed: boolean;
}

export interface GameSessionProps {
  playable: PlayableCase;
  /** Stato ripreso da `localStorage` al momento del montaggio. */
  start: SessionStart;
}

const EMPTY_BOARD: BoardState = { lines: [], excluded: [] };
const ZOOM_STEPS = [1, 1.35, 1.8, 2.3];

export default function GameSession({ playable, start }: GameSessionProps) {
  const router = useRouter();

  const [board, setBoard] = useState<BoardState>({ lines: start.lines, excluded: start.excluded });
  const [past, setPast] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);
  const [mode, setMode] = useState<BoardMode>("line");
  const [zoomIndex, setZoomIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(start.elapsedMs);
  const [wrongChecks, setWrongChecks] = useState(start.wrongChecks);
  const [hintsUsed, setHintsUsed] = useState(start.hintsUsed);
  const [hint, setHint] = useState<Hint | null>(null);
  const [highlight, setHighlight] = useState<EdgeId[]>([]);
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidClues, setInvalidClues] = useState<Cell[]>([]);
  const [reveal, setReveal] = useState<CaseReveal | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const firstInteraction = useRef(start.firstInteraction);
  const lines = useMemo(() => new Set(board.lines), [board.lines]);
  const excluded = useMemo(() => new Set(board.excluded), [board.excluded]);
  const solved = reveal !== null;

  /* -------------------------- inizio partita ------------------------------ */

  useEffect(() => {
    track("case_start", {
      case_id: playable.id,
      difficulty: playable.difficulty,
      resumed: start.resumed,
    });
    const progress = loadProgress();
    saveProgress(setCaseProgress(progress, playable.id, { started: true }));
  }, [playable.difficulty, playable.id, start.resumed]);

  /* -------------------------------- timer -------------------------------- */

  useEffect(() => {
    if (solved) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = now - last;
      last = now;
      if (document.visibilityState === "visible") setElapsedMs((value) => value + delta);
    }, 500);
    return () => window.clearInterval(id);
  }, [solved]);

  /* ----------------------------- salvataggio ----------------------------- */

  useEffect(() => {
    if (solved) return;
    const id = window.setTimeout(() => {
      saveProgress(
        setCaseProgress(loadProgress(), playable.id, {
          started: true,
          lines: board.lines,
          excluded: board.excluded,
          elapsedMs,
          wrongChecks,
          hintsUsed,
          firstInteraction: firstInteraction.current,
        }),
      );
    }, 400);
    return () => window.clearTimeout(id);
  }, [board, elapsedMs, hintsUsed, playable.id, solved, wrongChecks]);

  /* ---------------------------- modifiche board --------------------------- */

  const noteFirstInteraction = useCallback(() => {
    if (firstInteraction.current) return;
    firstInteraction.current = true;
    track("first_interaction", { case_id: playable.id, difficulty: playable.difficulty });
  }, [playable.difficulty, playable.id]);

  const pushHistory = useCallback(() => {
    setPast((stack) => [...stack.slice(-99), board]);
    setFuture([]);
  }, [board]);

  const applyEdge = useCallback((state: BoardState, id: EdgeId, value: EdgeValue): BoardState => {
    const lineSet = new Set(state.lines);
    const excludedSet = new Set(state.excluded);
    lineSet.delete(id);
    excludedSet.delete(id);
    if (value === "line") lineSet.add(id);
    if (value === "excluded") excludedSet.add(id);
    return { lines: [...lineSet].sort(), excluded: [...excludedSet].sort() };
  }, []);

  const handleSetEdge = useCallback(
    (id: EdgeId, value: EdgeValue) => {
      noteFirstInteraction();
      setErrorMessage(null);
      setInvalidClues([]);
      setHighlight([]);
      setBoard((state) => applyEdge(state, id, value));
    },
    [applyEdge, noteFirstInteraction],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    setBoard(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setFuture([board, ...future].slice(0, 100));
    setHighlight([]);
  }, [board, future, past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setBoard(future[0]);
    setFuture(future.slice(1));
    setPast([...past, board].slice(-100));
    setHighlight([]);
  }, [board, future, past]);

  const reset = useCallback(() => {
    if (board.lines.length === 0 && board.excluded.length === 0) return;
    if (!window.confirm(t.game.toolbar.resetConfirm)) return;
    pushHistory();
    setBoard(EMPTY_BOARD);
    setErrorMessage(null);
    setInvalidClues([]);
    setHighlight([]);
  }, [board.excluded.length, board.lines.length, pushHistory]);

  /* ------------------------------- verifica ------------------------------- */

  const check = useCallback(async () => {
    if (checking || solved) return;
    setChecking(true);
    setErrorMessage(null);
    setInvalidClues([]);
    track("check_attempt", {
      case_id: playable.id,
      difficulty: playable.difficulty,
      duration_seconds: Math.round(elapsedMs / 1000),
      wrong_checks: wrongChecks,
      hints_used: hintsUsed,
      edges: board.lines.length,
    });
    try {
      const response = await fetch(`/api/blackout/cases/${playable.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edges: board.lines }),
      });
      if (!response.ok) throw new Error("check failed");
      const result = (await response.json()) as CheckResult;

      if (result.solved) {
        setReveal(result.reveal);
        setResultOpen(true);
        const progress = loadProgress();
        const previous = getCaseProgress(progress, playable.id);
        const best =
          previous.bestTimeMs === null || elapsedMs < previous.bestTimeMs ? elapsedMs : previous.bestTimeMs;
        const next: Progress = setCaseProgress(progress, playable.id, {
          completed: true,
          started: true,
          lines: board.lines,
          excluded: board.excluded,
          elapsedMs,
          wrongChecks,
          hintsUsed,
          bestTimeMs: best,
          bestHints: previous.bestHints === null ? hintsUsed : Math.min(previous.bestHints, hintsUsed),
          bestWrongChecks:
            previous.bestWrongChecks === null ? wrongChecks : Math.min(previous.bestWrongChecks, wrongChecks),
          firstInteraction: true,
        });
        // La richiesta dell'email arriva una volta sola, dopo il secondo caso,
        // e non è mai obbligatoria.
        const askEmail = completedCount(next) >= 2 && !next.waitlistSubmitted && !next.waitlistPrompted;
        saveProgress(askEmail ? { ...next, waitlistPrompted: true } : next);
        setShowWaitlist(askEmail);
        track("case_complete", {
          case_id: playable.id,
          difficulty: playable.difficulty,
          duration_seconds: Math.round(elapsedMs / 1000),
          wrong_checks: wrongChecks,
          hints_used: hintsUsed,
        });
      } else {
        setWrongChecks(wrongChecks + 1);
        setInvalidClues(result.invalidClues);
        setErrorMessage(messageFor(result));
      }
    } catch {
      setErrorMessage(t.game.errors.network);
    } finally {
      setChecking(false);
    }
  }, [
    board.excluded,
    board.lines,
    checking,
    elapsedMs,
    hintsUsed,
    playable.difficulty,
    playable.id,
    solved,
    wrongChecks,
  ]);

  /* ----------------------------- suggerimenti ----------------------------- */

  const askHint = useCallback(async () => {
    if (solved || hintsUsed >= 3) return;
    const level = (hintsUsed + 1) as 1 | 2 | 3;
    try {
      const response = await fetch(`/api/blackout/cases/${playable.id}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, lines: board.lines, excluded: board.excluded }),
      });
      if (!response.ok) throw new Error("hint failed");
      const { hint: received } = (await response.json()) as { hint: Hint };
      setHint(received);
      setHintsUsed(level);
      setErrorMessage(null);
      setInvalidClues([]);

      if (received.lines.length > 0 || received.excluded.length > 0) {
        pushHistory();
        setBoard((state) => {
          let next = state;
          for (const id of received.lines) next = applyEdge(next, id, "line");
          for (const id of received.excluded) next = applyEdge(next, id, "excluded");
          return next;
        });
        setHighlight([...received.lines, ...received.excluded]);
      }
      track("hint_used", {
        case_id: playable.id,
        difficulty: playable.difficulty,
        hint_level: level,
        hints_used: level,
        wrong_checks: wrongChecks,
        duration_seconds: Math.round(elapsedMs / 1000),
      });
    } catch {
      setErrorMessage(t.game.errors.network);
    }
  }, [
    applyEdge,
    board.excluded,
    board.lines,
    elapsedMs,
    hintsUsed,
    playable.difficulty,
    playable.id,
    pushHistory,
    solved,
    wrongChecks,
  ]);

  /* -------------------------------- azioni -------------------------------- */

  const nextCaseId = playable.id < TOTAL_CASES ? playable.id + 1 : null;

  const goToNextCase = () => {
    if (!nextCaseId) return;
    track("next_case_click", { case_id: playable.id, next_case_id: nextCaseId });
    router.push(`/casi/${nextCaseId}`);
  };

  const replay = () => {
    setReveal(null);
    setResultOpen(false);
    setBoard(EMPTY_BOARD);
    setPast([]);
    setFuture([]);
    setElapsedMs(0);
    setWrongChecks(0);
    setHintsUsed(0);
    setHint(null);
    setHighlight([]);
    setErrorMessage(null);
    setInvalidClues([]);
  };

  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <>
      <div className="game-timer">
        <span className="timer-label">{t.game.timer}</span>
        <span className="timer-value">{formatDuration(elapsedMs)}</span>
      </div>

      <Toolbar
        mode={mode}
        onMode={setMode}
        onUndo={undo}
        onRedo={redo}
        onReset={reset}
        onZoomIn={() => setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1))}
        onZoomOut={() => setZoomIndex((i) => Math.max(i - 1, 0))}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        canZoomIn={zoomIndex < ZOOM_STEPS.length - 1}
        canZoomOut={zoomIndex > 0}
        disabled={solved}
      />

      <GridBoard
        rows={playable.rows}
        cols={playable.cols}
        clues={playable.clues}
        lines={lines}
        excluded={excluded}
        mode={mode}
        suspects={playable.suspects}
        objects={playable.objects}
        invalidClues={invalidClues}
        darkRegion={reveal?.region ?? null}
        highlight={highlight}
        zoom={zoom}
        disabled={solved}
        onStrokeStart={pushHistory}
        onSetEdge={handleSetEdge}
      />

      <div className="game-status" role="status" aria-live="polite">
        {errorMessage && <p className="status-error">{errorMessage}</p>}
        {hint && (
          <div className="hint-box">
            <p className="hint-title">
              {hint.title} · {t.game.hintLevel(hint.level)}
            </p>
            <p className="hint-text">{hint.text}</p>
            {(hint.lines.length > 0 || hint.excluded.length > 0) && <p className="hint-note">{t.game.hintApplied}</p>}
            <button type="button" className="link-btn" onClick={() => setHint(null)}>
              {t.game.close}
            </button>
          </div>
        )}
      </div>

      <div className="game-actions">
        {solved ? (
          <button type="button" className="btn btn-solid btn-wide" onClick={() => setResultOpen(true)}>
            {t.game.showResult}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-solid btn-wide" onClick={check} disabled={checking}>
              {checking ? t.game.checking : t.game.check}
            </button>
            <button type="button" className="btn btn-ghost" onClick={askHint} disabled={hintsUsed >= 3}>
              {hintsUsed >= 3 ? t.game.hintsExhausted : `${t.game.hint} (${hintsUsed + 1}/3)`}
            </button>
          </>
        )}
      </div>

      <div className="game-meta">
        <span>{t.game.attempts(wrongChecks)}</span>
        <span>{hintsUsed === 0 ? t.game.noHints : t.game.hintsUsed(hintsUsed)}</span>
      </div>

      {solved && !resultOpen && <p className="solved-banner">{t.game.solvedBanner}</p>}

      {reveal && resultOpen && (
        <ResultPanel
          playable={playable}
          reveal={reveal}
          elapsedMs={elapsedMs}
          wrongChecks={wrongChecks}
          hintsUsed={hintsUsed}
          nextCaseId={nextCaseId}
          showWaitlist={showWaitlist}
          onNextCase={goToNextCase}
          onShare={() => track("share_result", { case_id: playable.id, difficulty: playable.difficulty })}
          onReplay={replay}
          onClose={() => setResultOpen(false)}
        />
      )}
    </>
  );
}

function messageFor(result: Extract<CheckResult, { solved: false }>): string {
  switch (result.reason) {
    case "empty":
      return t.game.errors.empty;
    case "branching":
      return t.game.errors.branching;
    case "open":
      return t.game.errors.open;
    case "multipleLoops":
      return t.game.errors.multipleLoops;
    case "clues":
      return t.game.errors.cluesIncompatible(result.invalidClues.length);
    default:
      return t.game.errors.wrongLoop;
  }
}

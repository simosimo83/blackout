"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import { loadProgress, saveProgress } from "@/lib/progress";
import { analyze, cellEdgeIds, interiorCells, type EdgeId } from "@/lib/slitherlink";
import { TUTORIAL_CLUES, TUTORIAL_GRID, TUTORIAL_THREE_CELL } from "@/lib/tutorial";
import GridBoard, { type BoardMode, type EdgeValue } from "./GridBoard";
import { ModeSwitch, ToolButtons } from "./Toolbar";

interface BoardState {
  lines: EdgeId[];
  excluded: EdgeId[];
}

const EMPTY: BoardState = { lines: [], excluded: [] };

export default function TutorialClient() {
  const [step, setStep] = useState(0);
  const [board, setBoard] = useState<BoardState>(EMPTY);
  const [past, setPast] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);
  const [mode, setMode] = useState<BoardMode>("line");
  const [zoom, setZoom] = useState(1);
  const completed = useRef(false);

  useEffect(() => {
    track("tutorial_start");
  }, []);

  const lines = useMemo(() => new Set(board.lines), [board.lines]);
  const excluded = useMemo(() => new Set(board.excluded), [board.excluded]);
  const solution = useMemo(() => analyze(TUTORIAL_GRID, TUTORIAL_CLUES, lines), [lines]);

  const threeSides = cellEdgeIds(TUTORIAL_THREE_CELL[0], TUTORIAL_THREE_CELL[1], TUTORIAL_GRID).filter((id) => lines.has(id)).length;

  const stepDone = [
    board.lines.length > 0,
    threeSides === 3,
    board.excluded.length > 0,
    solution.isValid,
  ];

  const steps = t.tutorial.steps;
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (!solution.isValid || completed.current) return;
    completed.current = true;
    track("tutorial_complete");
    const progress = loadProgress();
    saveProgress({ ...progress, tutorialCompleted: true });
  }, [solution.isValid]);

  const applyEdge = (state: BoardState, id: EdgeId, value: EdgeValue): BoardState => {
    const lineSet = new Set(state.lines);
    const excludedSet = new Set(state.excluded);
    lineSet.delete(id);
    excludedSet.delete(id);
    if (value === "line") lineSet.add(id);
    if (value === "excluded") excludedSet.add(id);
    return { lines: [...lineSet].sort(), excluded: [...excludedSet].sort() };
  };

  const pushHistory = () => {
    setPast((stack) => [...stack.slice(-49), board]);
    setFuture([]);
  };

  const finish = () => {
    if (!completed.current) {
      completed.current = true;
      track("tutorial_complete", { skipped: !solution.isValid });
      const progress = loadProgress();
      saveProgress({ ...progress, tutorialCompleted: true });
    }
    track("play_cta_click", { case_id: 1, source: "tutorial" });
  };

  return (
    <div className="tutorial">
      <header className="tutorial-head">
        <p className="tutorial-progress">{t.tutorial.stepLabel(step + 1, steps.length)}</p>
        <h1 className="tutorial-title">{steps[step].title}</h1>
        <p className="tutorial-body">{steps[step].body}</p>
        <p className={`tutorial-task${stepDone[step] ? " is-done" : ""}`}>
          {stepDone[step] ? t.tutorial.stepDoneHint : steps[step].task}
        </p>
      </header>

      <div className="game-bar">
        <ModeSwitch mode={mode} onMode={setMode} />
      </div>

      <GridBoard
        rows={TUTORIAL_GRID.rows}
        cols={TUTORIAL_GRID.cols}
        clues={TUTORIAL_CLUES}
        lines={lines}
        excluded={excluded}
        mode={mode}
        zoom={zoom}
        darkRegion={solution.isValid ? interiorCells(TUTORIAL_GRID, lines) : null}
        onStrokeStart={pushHistory}
        onSetEdge={(id, value) => setBoard((state) => applyEdge(state, id, value))}
      />

      <ToolButtons
        onUndo={() => {
          if (past.length === 0) return;
          setBoard(past[past.length - 1]);
          setPast(past.slice(0, -1));
          setFuture([board, ...future]);
        }}
        onRedo={() => {
          if (future.length === 0) return;
          setBoard(future[0]);
          setFuture(future.slice(1));
          setPast([...past, board]);
        }}
        onReset={() => {
          pushHistory();
          setBoard(EMPTY);
        }}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.35, 2))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.35, 1))}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        canZoomIn={zoom < 2}
        canZoomOut={zoom > 1}
      />

      {solution.isValid && (
        <div className="tutorial-done" role="status">
          <h2>{t.tutorial.doneTitle}</h2>
          <p>{t.tutorial.doneBody}</p>
        </div>
      )}

      <div className="tutorial-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          {t.tutorial.back}
        </button>
        {isLast ? (
          <Link className="btn btn-solid" href="/casi/1" onClick={finish}>
            {t.tutorial.finish}
          </Link>
        ) : (
          <button type="button" className="btn btn-solid" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
            {t.tutorial.next}
          </button>
        )}
      </div>
      <Link className="link-btn tutorial-skip" href="/casi/1" onClick={finish}>
        {t.tutorial.skip}
      </Link>
    </div>
  );
}

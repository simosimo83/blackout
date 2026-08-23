"use client";

import Link from "next/link";

import { t } from "@/lib/i18n";
import { formatDuration, getCaseProgress, isUnlocked } from "@/lib/progress";
import type { PlayableCase } from "@/lib/types";
import { useProgress } from "@/lib/useProgress";
import GameSession, { type SessionStart } from "./GameSession";
import GridBoard from "./GridBoard";
import Toolbar from "./Toolbar";

export interface GameClientProps {
  playable: PlayableCase;
}

const NO_EDGES = new Set<string>();

/**
 * Decide cosa mostrare in base ai progressi salvati sul dispositivo:
 * planimetria statica finché la pagina non è idratata, schermata "bloccato"
 * se il caso precedente non è stato risolto, altrimenti la partita.
 */
export default function GameClient({ playable }: GameClientProps) {
  const progress = useProgress();

  if (!progress) return <BoardPlaceholder playable={playable} />;

  if (!isUnlocked(progress, playable.id)) {
    return (
      <section className="panel locked-panel">
        <h2 className="panel-title">{t.game.lockedTitle}</h2>
        <p>{t.game.lockedBody(playable.id - 1)}</p>
        <Link className="btn btn-solid" href="/casi">
          {t.game.lockedCta}
        </Link>
      </section>
    );
  }

  const saved = getCaseProgress(progress, playable.id);
  // Un caso già risolto si riapre come partita nuova: il miglior tempo resta.
  const replay = saved.completed;
  const start: SessionStart = replay
    ? {
        lines: [],
        excluded: [],
        elapsedMs: 0,
        wrongChecks: 0,
        hintsUsed: 0,
        firstInteraction: false,
        resumed: false,
      }
    : {
        lines: saved.lines,
        excluded: saved.excluded,
        elapsedMs: saved.elapsedMs,
        wrongChecks: saved.wrongChecks,
        hintsUsed: saved.hintsUsed,
        firstInteraction: saved.firstInteraction,
        resumed: saved.elapsedMs > 0 || saved.lines.length > 0,
      };

  return <GameSession key={`case-${playable.id}`} playable={playable} start={start} />;
}

/** Stesso ingombro della partita, senza interazione: evita salti di layout. */
function BoardPlaceholder({ playable }: GameClientProps) {
  return (
    <>
      <div className="game-timer">
        <span className="timer-label">{t.game.timer}</span>
        <span className="timer-value">{formatDuration(0)}</span>
      </div>
      <Toolbar
        mode="line"
        onMode={() => {}}
        onUndo={() => {}}
        onRedo={() => {}}
        onReset={() => {}}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        canUndo={false}
        canRedo={false}
        canZoomIn={false}
        canZoomOut={false}
        disabled
      />
      <GridBoard
        rows={playable.rows}
        cols={playable.cols}
        clues={playable.clues}
        lines={NO_EDGES}
        excluded={NO_EDGES}
        mode="line"
        suspects={playable.suspects}
        objects={playable.objects}
        disabled
      />
    </>
  );
}

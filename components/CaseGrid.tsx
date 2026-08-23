"use client";

import Link from "next/link";

import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import {
  caseStatus,
  formatDuration,
  getCaseProgress,
  resetProgress,
  type CaseStatus,
} from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import type { CaseMeta } from "@/lib/types";

export interface CaseGridProps {
  cases: CaseMeta[];
  /** Versione ridotta per la homepage: niente reset, meno dettagli. */
  compact?: boolean;
}

function Difficulty({ level }: { level: number }) {
  return (
    <span className="difficulty" title={t.difficulty.names[level]} aria-label={`${t.cases.difficulty} ${t.difficulty.label(level)}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`pip${i < level ? " is-on" : ""}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function CaseGrid({ cases, compact = false }: CaseGridProps) {
  const progress = useProgress();

  const statusOf = (id: number): CaseStatus => (progress ? caseStatus(progress, id) : id === 1 ? "new" : "locked");

  const handleReset = () => {
    if (!window.confirm(t.cases.resetConfirm)) return;
    resetProgress();
  };

  return (
    <>
      <ol className={`case-grid${compact ? " is-compact" : ""}`}>
        {cases.map((item) => {
          const status = statusOf(item.id);
          const locked = status === "locked";
          const saved = progress ? getCaseProgress(progress, item.id) : null;
          const body = (
            <>
              <div className="case-top">
                <span className="case-number">{t.cases.caseNumber(item.id)}</span>
                <span className={`case-status is-${status}`}>{t.cases.status[status]}</span>
              </div>
              <h3 className="case-title">{item.title}</h3>
              <p className="case-location">{item.location}</p>
              <dl className="case-meta">
                <div>
                  <dt>{t.cases.difficulty}</dt>
                  <dd>
                    <Difficulty level={item.difficulty} />
                  </dd>
                </div>
                <div>
                  <dt>{t.cases.duration}</dt>
                  <dd>{item.time}</dd>
                </div>
                {!compact && (
                  <div>
                    <dt>{t.cases.bestTime}</dt>
                    <dd>{saved?.bestTimeMs ? formatDuration(saved.bestTimeMs) : t.cases.noBestTime}</dd>
                  </div>
                )}
              </dl>
              <span className="case-action">{locked ? t.cases.lockedHint(item.id - 1) : t.cases.action[status]}</span>
            </>
          );

          return (
            <li key={item.id} className={`case-card${locked ? " is-locked" : ""} is-${status}`}>
              {locked ? (
                <div className="case-inner" aria-disabled="true">
                  {body}
                </div>
              ) : (
                <Link
                  className="case-inner"
                  href={`/casi/${item.id}`}
                  onClick={() => track("play_cta_click", { case_id: item.id, difficulty: item.difficulty, source: compact ? "home_grid" : "archive" })}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {!compact && progress && (
        <button type="button" className="link-btn reset-progress" onClick={handleReset}>
          {t.cases.resetProgress}
        </button>
      )}
    </>
  );
}

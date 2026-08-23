"use client";

import Link from "next/link";
import { useState } from "react";

import { t } from "@/lib/i18n";
import { formatDuration } from "@/lib/progress";
import type { CaseReveal, PlayableCase } from "@/lib/types";
import WaitlistForm from "./WaitlistForm";

export interface ResultPanelProps {
  playable: PlayableCase;
  reveal: CaseReveal;
  elapsedMs: number;
  wrongChecks: number;
  hintsUsed: number;
  nextCaseId: number | null;
  showWaitlist: boolean;
  onNextCase: () => void;
  onShare: () => void;
  onReplay: () => void;
  onClose: () => void;
}

export default function ResultPanel({
  playable,
  reveal,
  elapsedMs,
  wrongChecks,
  hintsUsed,
  nextCaseId,
  showWaitlist,
  onNextCase,
  onShare,
  onReplay,
  onClose,
}: ResultPanelProps) {
  const [shareNote, setShareNote] = useState<string | null>(null);
  const time = formatDuration(elapsedMs);

  const share = async () => {
    const text = t.result.shareText({
      caseNumber: playable.id,
      time,
      hints: hintsUsed,
      errors: wrongChecks,
    });
    const url = typeof window !== "undefined" ? window.location.origin : "";
    onShare();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t.result.shareTitle(playable.id), text, url });
        return;
      }
    } catch {
      /* condivisione annullata: si passa alla copia */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareNote(t.result.shareCopied);
    } catch {
      setShareNote(text);
    }
  };

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-card">
        <p className="result-kicker">{t.cases.caseNumber(playable.id)}</p>
        <h2 className="result-title" id="result-title">
          {t.result.title}
        </h2>

        <div className="result-reveal">
          <div className="reveal-item">
            <span className="reveal-label">{t.result.suspect}</span>
            <span className="reveal-badge is-suspect" aria-hidden="true">
              {reveal.suspect.key}
            </span>
            <span className="reveal-name">{reveal.suspect.name}</span>
            <span className="reveal-role">{reveal.suspect.role}</span>
          </div>
          <div className="reveal-item">
            <span className="reveal-label">{t.result.object}</span>
            <span className="reveal-badge is-object" aria-hidden="true">
              {reveal.object.key}
            </span>
            <span className="reveal-name">{reveal.object.name}</span>
          </div>
        </div>

        <dl className="result-stats">
          <div>
            <dt>{t.result.time}</dt>
            <dd>{time}</dd>
          </div>
          <div>
            <dt>{t.result.wrongChecks}</dt>
            <dd>{wrongChecks}</dd>
          </div>
          <div>
            <dt>{t.result.hints}</dt>
            <dd>{hintsUsed}</dd>
          </div>
        </dl>
        {hintsUsed > 0 && <p className="result-note">{t.result.withHints}</p>}

        <div className="result-epilogue">
          <h3>{t.result.epilogue}</h3>
          <p>{reveal.epilogue}</p>
        </div>

        {showWaitlist && (
          <div className="result-waitlist">
            <h3>{t.waitlist.afterCaseTitle}</h3>
            <p>{t.waitlist.afterCaseBody}</p>
            <WaitlistForm source="post_case" compact />
          </div>
        )}

        <div className="result-actions">
          {nextCaseId ? (
            <button type="button" className="btn btn-solid" onClick={onNextCase}>
              {t.result.next}
            </button>
          ) : (
            <div className="result-alldone">
              <strong>{t.result.allDone}</strong>
              <span>{t.result.allDoneBody}</span>
            </div>
          )}
          <button type="button" className="btn btn-ghost" onClick={share}>
            {t.result.share}
          </button>
        </div>
        {shareNote && (
          <p className="result-note" role="status">
            {shareNote}
          </p>
        )}

        <div className="result-links">
          <button type="button" className="link-btn" onClick={onClose}>
            {t.result.close}
          </button>
          <button type="button" className="link-btn" onClick={onReplay}>
            {t.result.replay}
          </button>
          <Link className="link-btn" href="/casi">
            {t.result.backToCases}
          </Link>
        </div>
      </div>
    </div>
  );
}

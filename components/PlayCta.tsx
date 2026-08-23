"use client";

import Link from "next/link";

import { track } from "@/lib/analytics";
import { getCaseProgress, nextPlayableCase } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";

export interface PlayCtaProps {
  label: string;
  /** Etichetta alternativa quando c'è una partita da riprendere. */
  resumeLabel?: string;
  variant?: "solid" | "ghost";
  source: string;
  className?: string;
}

/** CTA principale: porta al primo caso non ancora risolto. */
export default function PlayCta({ label, resumeLabel, variant = "solid", source, className }: PlayCtaProps) {
  const progress = useProgress();
  const caseId = progress ? nextPlayableCase(progress) : 1;
  const resuming = progress ? caseId > 1 || getCaseProgress(progress, caseId).elapsedMs > 0 : false;

  return (
    <Link
      href={`/casi/${caseId}`}
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
      onClick={() => track("play_cta_click", { case_id: caseId, source })}
    >
      {resuming && resumeLabel ? resumeLabel : label}
    </Link>
  );
}

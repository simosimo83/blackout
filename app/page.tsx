import Link from "next/link";

import CaseGrid from "@/components/CaseGrid";
import PlayCta from "@/components/PlayCta";
import TrackView from "@/components/TrackView";
import WaitlistForm from "@/components/WaitlistForm";
import { getCaseMetas } from "@/lib/cases.server";
import { t } from "@/lib/i18n";

export default function HomePage() {
  const cases = getCaseMetas();

  return (
    <>
      <TrackView event="landing_view" />

      <section className="hero">
        <p className="hero-kicker">{t.home.kicker}</p>
        <h1 className="hero-title">{t.home.title}</h1>
        <p className="hero-tagline">{t.home.tagline}</p>
        <p className="hero-intro">{t.home.intro}</p>
        <div className="hero-actions">
          <PlayCta label={t.home.ctaPrimary} resumeLabel={t.cases.action.inProgress} source="hero" />
          <Link className="btn btn-ghost" href="/tutorial">
            {t.home.ctaSecondary}
          </Link>
        </div>
        <p className="hero-note">{t.home.noAccount}</p>
        <div className="hero-frame" aria-hidden="true">
          <svg viewBox="0 0 320 240" className="hero-art" role="presentation">
            <rect className="hero-plate" x="10" y="10" width="300" height="220" rx="10" />
            {Array.from({ length: 5 }, (_, r) =>
              Array.from({ length: 6 }, (_, c) => (
                <rect key={`${r}-${c}`} className="hero-room" x={26 + c * 46} y={26 + r * 38} width={46} height={38} />
              )),
            )}
            <path
              className="hero-loop"
              d="M118 64 H210 V102 H256 V178 H164 V140 H118 Z"
              fill="none"
            />
            <g className="hero-dark">
              <rect x={118} y={64} width={92} height={38} />
              <rect x={118} y={102} width={138} height={38} />
              <rect x={164} y={140} width={92} height={38} />
            </g>
          </svg>
        </div>
      </section>

      <section className="steps">
        <h2 className="section-title">{t.home.stepsTitle}</h2>
        <ol className="step-list">
          {t.home.steps.map((step, index) => (
            <li key={step.title}>
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cases-preview">
        <h2 className="section-title">{t.home.casesTitle}</h2>
        <p className="section-sub">{t.home.casesSubtitle}</p>
        <CaseGrid cases={cases} compact />
      </section>

      <section className="how">
        <h2 className="section-title">{t.home.howTitle}</h2>
        <p className="how-body">{t.home.howBody}</p>
        <ul className="how-points">
          {t.home.howPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="final-cta">
        <h2 className="section-title">{t.home.finalCtaTitle}</h2>
        <p>{t.home.finalCtaBody}</p>
        <PlayCta label={t.home.finalCta} resumeLabel={t.cases.action.inProgress} source="footer" />
      </section>

      <section className="waitlist-section">
        <h2 className="section-title">{t.waitlist.title}</h2>
        <p>{t.waitlist.body}</p>
        <WaitlistForm source="home" />
      </section>
    </>
  );
}

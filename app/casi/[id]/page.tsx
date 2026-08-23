import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import GameClient from "@/components/GameClient";
import StoryBlock from "@/components/StoryBlock";
import { getCaseMetas, getPlayableCase } from "@/lib/cases.server";
import { t } from "@/lib/i18n";

export function generateStaticParams() {
  return getCaseMetas().map((item) => ({ id: String(item.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const playable = getPlayableCase(Number(id));
  if (!playable) return { title: t.game.notFound };
  return {
    title: `${t.cases.caseNumber(playable.id)}: ${playable.title} — ${t.meta.siteName}`,
    description: playable.story,
  };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playable = getPlayableCase(Number(id));
  if (!playable) notFound();

  return (
    <div className="game">
      <header className="game-header">
        <p className="game-kicker">
          <Link className="game-back" href="/casi">
            ← {t.game.back}
          </Link>
          <span className="game-kicker-text">
            {t.cases.caseNumber(playable.id)} · {playable.location}
          </span>
        </p>
        <h1 className="game-title">{playable.title}</h1>
      </header>

      <StoryBlock story={playable.story} />

      <GameClient playable={playable} />

      <div className="game-lists">
        <section className="token-list">
          <h2>{t.game.suspects}</h2>
          <ul>
            {playable.suspects.map((suspect) => (
              <li key={suspect.key}>
                <span className="token-badge is-suspect">{suspect.key}</span>
                <span className="token-name">{suspect.name}</span>
                <span className="token-role">{suspect.role}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="token-list">
          <h2>{t.game.objects}</h2>
          <ul>
            {playable.objects.map((object) => (
              <li key={object.key}>
                <span className="token-badge is-object">{object.key}</span>
                <span className="token-name">{object.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ul className="legend">
        <li>
          <span className="legend-swatch is-line" aria-hidden="true" />
          {t.game.legend.line}
        </li>
        <li>
          <span className="legend-swatch is-cross" aria-hidden="true">
            ×
          </span>
          {t.game.legend.excluded}
        </li>
        <li>
          <span className="legend-swatch is-dark" aria-hidden="true" />
          {t.game.legend.dark}
        </li>
      </ul>
    </div>
  );
}

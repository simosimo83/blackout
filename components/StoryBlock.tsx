"use client";

import { useState } from "react";

import { t } from "@/lib/i18n";

export interface StoryBlockProps {
  story: string;
}

/**
 * Su telefono la storia parte ridotta a poche righe, così la planimetria resta
 * subito visibile; da tablet in su il testo è sempre esteso e il pulsante
 * scompare.
 */
export default function StoryBlock({ story }: StoryBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="game-story" data-expanded={expanded ? "true" : "false"}>
      <p id="game-story-text">{story}</p>
      <button
        type="button"
        className="link-btn story-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="game-story-text"
      >
        {expanded ? t.game.storyLess : t.game.storyMore}
      </button>
    </div>
  );
}

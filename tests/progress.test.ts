import { describe, expect, it } from "vitest";

import {
  caseStatus,
  completedCount,
  emptyProgress,
  formatDuration,
  getCaseProgress,
  isUnlocked,
  nextPlayableCase,
  setCaseProgress,
} from "@/lib/progress";

describe("progressi del giocatore", () => {
  it("il primo caso è sempre aperto, gli altri no", () => {
    const progress = emptyProgress();
    expect(isUnlocked(progress, 1)).toBe(true);
    expect(isUnlocked(progress, 2)).toBe(false);
    expect(caseStatus(progress, 1)).toBe("new");
    expect(caseStatus(progress, 2)).toBe("locked");
  });

  it("completare un caso sblocca il successivo", () => {
    const progress = setCaseProgress(emptyProgress(), 1, { completed: true, started: true });
    expect(isUnlocked(progress, 2)).toBe(true);
    expect(caseStatus(progress, 1)).toBe("done");
    expect(caseStatus(progress, 2)).toBe("new");
    expect(caseStatus(progress, 3)).toBe("locked");
    expect(completedCount(progress)).toBe(1);
    expect(nextPlayableCase(progress)).toBe(2);
  });

  it("un caso con bordi tracciati risulta in corso", () => {
    const progress = setCaseProgress(emptyProgress(), 1, { lines: ["r0c0-top"] });
    expect(caseStatus(progress, 1)).toBe("inProgress");
    expect(getCaseProgress(progress, 1).lines).toEqual(["r0c0-top"]);
  });

  it("conserva stato della griglia, tempo, errori e suggerimenti", () => {
    const progress = setCaseProgress(emptyProgress(), 3, {
      lines: ["r1c1-top", "r1c1-left"],
      excluded: ["r0c0-top"],
      elapsedMs: 65_000,
      wrongChecks: 2,
      hintsUsed: 1,
      bestTimeMs: 65_000,
    });
    const saved = getCaseProgress(progress, 3);
    expect(saved.lines).toHaveLength(2);
    expect(saved.excluded).toEqual(["r0c0-top"]);
    expect(saved.elapsedMs).toBe(65_000);
    expect(saved.wrongChecks).toBe(2);
    expect(saved.hintsUsed).toBe(1);
    expect(saved.lastPlayedAt).not.toBeNull();
  });

  it("formatta la durata in mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(402_000)).toBe("06:42");
    expect(formatDuration(-10)).toBe("00:00");
  });

  it("propone l'ultimo caso quando sono tutti risolti", () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 6; id++) progress = setCaseProgress(progress, id, { completed: true });
    expect(nextPlayableCase(progress)).toBe(6);
    expect(completedCount(progress)).toBe(6);
  });
});

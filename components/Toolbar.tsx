"use client";

import { t } from "@/lib/i18n";
import type { BoardMode } from "./GridBoard";

export interface ModeSwitchProps {
  mode: BoardMode;
  onMode: (mode: BoardMode) => void;
  disabled?: boolean;
}

/** Selettore Linea/Escludi: resta in alto, sempre a portata mentre si disegna. */
export function ModeSwitch({ mode, onMode, disabled = false }: ModeSwitchProps) {
  return (
    <div className="toolbar-modes" role="group" aria-label={`${t.game.toolbar.line} / ${t.game.toolbar.exclude}`}>
      <button
        type="button"
        className={`mode-btn${mode === "line" ? " is-active" : ""}`}
        onClick={() => onMode("line")}
        aria-pressed={mode === "line"}
        disabled={disabled}
      >
        <span className="mode-glyph line" aria-hidden="true" />
        {t.game.toolbar.line}
      </button>
      <button
        type="button"
        className={`mode-btn${mode === "exclude" ? " is-active" : ""}`}
        onClick={() => onMode("exclude")}
        aria-pressed={mode === "exclude"}
        disabled={disabled}
      >
        <span className="mode-glyph cross" aria-hidden="true">
          ×
        </span>
        {t.game.toolbar.exclude}
      </button>
    </div>
  );
}

export interface ToolButtonsProps {
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  disabled?: boolean;
}

/** Annulla, ripristina, reset e zoom: subito sotto la planimetria. */
export function ToolButtons({
  onUndo,
  onRedo,
  onReset,
  onZoomIn,
  onZoomOut,
  canUndo,
  canRedo,
  canZoomIn,
  canZoomOut,
  disabled = false,
}: ToolButtonsProps) {
  return (
    <div className="toolbar-actions">
      <button
        type="button"
        className="tool-btn"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        aria-label={t.game.toolbar.undo}
      >
        <span aria-hidden="true">↶</span>
        <span className="tool-label">{t.game.toolbar.undo}</span>
      </button>
      <button
        type="button"
        className="tool-btn"
        onClick={onRedo}
        disabled={disabled || !canRedo}
        aria-label={t.game.toolbar.redo}
      >
        <span aria-hidden="true">↷</span>
        <span className="tool-label">{t.game.toolbar.redo}</span>
      </button>
      <button
        type="button"
        className="tool-btn"
        onClick={onReset}
        disabled={disabled}
        aria-label={t.game.toolbar.reset}
      >
        <span aria-hidden="true">⟲</span>
        <span className="tool-label">{t.game.toolbar.reset}</span>
      </button>
      <span className="tool-sep" aria-hidden="true" />
      <button
        type="button"
        className="tool-btn"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label={t.game.toolbar.zoomOut}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="tool-btn"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label={t.game.toolbar.zoomIn}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

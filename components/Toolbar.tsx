"use client";

import { t } from "@/lib/i18n";
import type { BoardMode } from "./GridBoard";

export interface ToolbarProps {
  mode: BoardMode;
  onMode: (mode: BoardMode) => void;
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

export default function Toolbar({
  mode,
  onMode,
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
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-modes" role="group" aria-label={t.game.toolbar.line}>
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

      <div className="toolbar-actions">
        <button type="button" className="tool-btn" onClick={onUndo} disabled={disabled || !canUndo} title={t.game.toolbar.undo}>
          <span aria-hidden="true">↶</span>
          <span className="tool-label">{t.game.toolbar.undo}</span>
        </button>
        <button type="button" className="tool-btn" onClick={onRedo} disabled={disabled || !canRedo} title={t.game.toolbar.redo}>
          <span aria-hidden="true">↷</span>
          <span className="tool-label">{t.game.toolbar.redo}</span>
        </button>
        <button type="button" className="tool-btn" onClick={onReset} disabled={disabled} title={t.game.toolbar.reset}>
          <span aria-hidden="true">⟲</span>
          <span className="tool-label">{t.game.toolbar.reset}</span>
        </button>
        <button type="button" className="tool-btn" onClick={onZoomOut} disabled={!canZoomOut} title={t.game.toolbar.zoomOut}>
          <span aria-hidden="true">−</span>
          <span className="tool-label sr-only">{t.game.toolbar.zoomOut}</span>
        </button>
        <button type="button" className="tool-btn" onClick={onZoomIn} disabled={!canZoomIn} title={t.game.toolbar.zoomIn}>
          <span aria-hidden="true">+</span>
          <span className="tool-label sr-only">{t.game.toolbar.zoomIn}</span>
        </button>
      </div>
    </div>
  );
}

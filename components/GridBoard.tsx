"use client";

import { useCallback, useMemo, useRef } from "react";

import { t } from "@/lib/i18n";
import {
  cellKey,
  clueStatuses,
  edgeId,
  type Cell,
  type Clue,
  type EdgeId,
  type EdgeRef,
  type Grid,
} from "@/lib/slitherlink";
import type { TokenObject, TokenSuspect } from "@/lib/types";

export type EdgeValue = "line" | "excluded" | "clear";
export type BoardMode = "line" | "exclude";

export interface GridBoardProps {
  rows: number;
  cols: number;
  clues: Clue[];
  lines: ReadonlySet<EdgeId>;
  excluded: ReadonlySet<EdgeId>;
  mode: BoardMode;
  suspects?: TokenSuspect[];
  objects?: TokenObject[];
  /** Indizi da evidenziare dopo una verifica errata. */
  invalidClues?: readonly Cell[];
  /** Zona buia rivelata a caso risolto. */
  darkRegion?: readonly Cell[] | null;
  /** Bordi appena rivelati da un suggerimento. */
  highlight?: readonly EdgeId[];
  zoom?: number;
  disabled?: boolean;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  onSetEdge?: (id: EdgeId, value: EdgeValue) => void;
}

const CELL = 100;
const PAD = 46;
/** Distanza massima (in frazioni di cella) per agganciare un bordo. */
const HIT = 0.34;

export default function GridBoard({
  rows,
  cols,
  clues,
  lines,
  excluded,
  mode,
  suspects = [],
  objects = [],
  invalidClues = [],
  darkRegion = null,
  highlight = [],
  zoom = 1,
  disabled = false,
  onStrokeStart,
  onStrokeEnd,
  onSetEdge,
}: GridBoardProps) {
  const grid: Grid = useMemo(() => ({ rows, cols }), [rows, cols]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stroke = useRef<{ value: EdgeValue; applied: Set<EdgeId> } | null>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const width = cols * CELL + PAD * 2;
  const height = rows * CELL + PAD * 2;

  const statuses = useMemo(() => clueStatuses(grid, clues, lines), [grid, clues, lines]);
  const statusByCell = useMemo(
    () => new Map(statuses.map((s) => [cellKey([s.row, s.col]), s])),
    [statuses],
  );
  const invalidSet = useMemo(() => new Set(invalidClues.map(cellKey)), [invalidClues]);
  const darkSet = useMemo(() => (darkRegion ? new Set(darkRegion.map(cellKey)) : null), [darkRegion]);
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);
  const suspectByCell = useMemo(
    () => new Map(suspects.map((s) => [cellKey(s.cell), s])),
    [suspects],
  );
  const objectByCell = useMemo(() => new Map(objects.map((o) => [cellKey(o.cell), o])), [objects]);

  /** Punto del puntatore in coordinate della griglia (unità = cella). */
  const gridPoint = useCallback((event: React.PointerEvent): { u: number; v: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { u: (local.x - PAD) / CELL, v: (local.y - PAD) / CELL };
  }, []);

  /** Bordo più vicino al puntatore, se dentro l'area sensibile. */
  const edgeAt = useCallback(
    (event: React.PointerEvent): EdgeId | null => {
      const p = gridPoint(event);
      if (!p) return null;
      const { u, v } = p;
      if (u < -0.4 || v < -0.4 || u > cols + 0.4 || v > rows + 0.4) return null;

      const hRow = Math.min(Math.max(Math.round(v), 0), rows);
      const hCol = Math.min(Math.max(Math.floor(u), 0), cols - 1);
      const hDist = Math.abs(v - hRow);

      const vCol = Math.min(Math.max(Math.round(u), 0), cols);
      const vRow = Math.min(Math.max(Math.floor(v), 0), rows - 1);
      const vDist = Math.abs(u - vCol);

      const best: EdgeRef | null =
        Math.min(hDist, vDist) > HIT
          ? null
          : hDist <= vDist
            ? { kind: "h", row: hRow, col: hCol }
            : { kind: "v", row: vRow, col: vCol };
      return best ? edgeId(best, grid) : null;
    },
    [cols, grid, gridPoint, rows],
  );

  const nextValue = useCallback(
    (id: EdgeId): EdgeValue => {
      if (mode === "line") return lines.has(id) ? "clear" : "line";
      return excluded.has(id) ? "clear" : "excluded";
    },
    [excluded, lines, mode],
  );

  const haptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(6);
      } catch {
        /* non supportato */
      }
    }
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button === 2) return;
    const id = edgeAt(event);
    if (!id) {
      // Zone morte al centro delle stanze: servono per spostare la planimetria
      // quando è ingrandita.
      const container = scrollRef.current;
      if (container && (container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight)) {
        pan.current = {
          x: event.clientX,
          y: event.clientY,
          left: container.scrollLeft,
          top: container.scrollTop,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const value = nextValue(id);
    stroke.current = { value, applied: new Set([id]) };
    onStrokeStart?.();
    onSetEdge?.(id, value);
    haptic();
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (pan.current) {
      const container = scrollRef.current;
      if (container) {
        container.scrollLeft = pan.current.left - (event.clientX - pan.current.x);
        container.scrollTop = pan.current.top - (event.clientY - pan.current.y);
      }
      return;
    }
    const current = stroke.current;
    if (!current || disabled) return;
    const id = edgeAt(event);
    if (!id || current.applied.has(id)) return;
    current.applied.add(id);
    onSetEdge?.(id, current.value);
    haptic();
  };

  const endStroke = () => {
    pan.current = null;
    if (stroke.current) {
      stroke.current = null;
      onStrokeEnd?.();
    }
  };

  const x = (col: number) => PAD + col * CELL;
  const y = (row: number) => PAD + row * CELL;

  const horizontal: { id: EdgeId; row: number; col: number }[] = [];
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col < cols; col++)
      horizontal.push({ id: edgeId({ kind: "h", row, col }, grid), row, col });

  const vertical: { id: EdgeId; row: number; col: number }[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col <= cols; col++)
      vertical.push({ id: edgeId({ kind: "v", row, col }, grid), row, col });

  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) cells.push([row, col]);

  return (
    <div className="board" ref={scrollRef} data-zoomed={zoom > 1 ? "true" : "false"}>
      <svg
        ref={svgRef}
        className="board-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: `${Math.round(zoom * 100)}%` }}
        role="application"
        aria-label={t.a11y.grid}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={endStroke}
        onContextMenu={(e) => e.preventDefault()}
      >
        <rect className="board-plate" x={PAD / 2} y={PAD / 2} width={width - PAD} height={height - PAD} rx={14} />

        {/* stanze */}
        {cells.map(([row, col]) => {
          const key = cellKey([row, col]);
          const dark = darkSet?.has(key);
          return (
            <rect
              key={`cell-${key}`}
              className={`board-cell${dark ? " is-dark" : ""}`}
              x={x(col)}
              y={y(row)}
              width={CELL}
              height={CELL}
              style={dark ? { animationDelay: `${(row + col) * 55}ms` } : undefined}
            />
          );
        })}

        {/* bordi possibili */}
        {horizontal.map(({ id, row, col }) => (
          <line key={`hg-${id}`} className="board-ghost" x1={x(col)} y1={y(row)} x2={x(col + 1)} y2={y(row)} />
        ))}
        {vertical.map(({ id, row, col }) => (
          <line key={`vg-${id}`} className="board-ghost" x1={x(col)} y1={y(row)} x2={x(col)} y2={y(row + 1)} />
        ))}

        {/* vertici */}
        {Array.from({ length: (rows + 1) * (cols + 1) }, (_, i) => {
          const row = Math.floor(i / (cols + 1));
          const col = i % (cols + 1);
          return <circle key={`v-${row}-${col}`} className="board-node" cx={x(col)} cy={y(row)} r={3.4} />;
        })}

        {/* indizi e pedine */}
        {cells.map(([row, col]) => {
          const key = cellKey([row, col]);
          const status = statusByCell.get(key);
          const suspect = suspectByCell.get(key);
          const object = objectByCell.get(key);
          const cx = x(col) + CELL / 2;
          const cy = y(row) + CELL / 2;
          const hasToken = Boolean(suspect || object);
          return (
            <g key={`content-${key}`}>
              {status && (
                <text
                  className={`board-clue is-${status.state}${invalidSet.has(key) ? " is-invalid" : ""}`}
                  x={cx}
                  y={hasToken ? cy - 8 : cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {status.value}
                </text>
              )}
              {suspect && (
                <g className="board-token is-suspect">
                  <circle cx={x(col) + 24} cy={y(row) + CELL - 24} r={15} />
                  <text x={x(col) + 24} y={y(row) + CELL - 24} textAnchor="middle" dominantBaseline="central">
                    {suspect.key}
                  </text>
                </g>
              )}
              {object && (
                <g className="board-token is-object">
                  <rect x={x(col) + CELL - 39} y={y(row) + CELL - 39} width={30} height={30} rx={8} />
                  <text x={x(col) + CELL - 24} y={y(row) + CELL - 24} textAnchor="middle" dominantBaseline="central">
                    {object.key}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* esclusioni */}
        {horizontal
          .filter(({ id }) => excluded.has(id) && !lines.has(id))
          .map(({ id, row, col }) => (
            <g key={`hx-${id}`} className="board-cross">
              <line x1={x(col) + CELL / 2 - 9} y1={y(row) - 9} x2={x(col) + CELL / 2 + 9} y2={y(row) + 9} />
              <line x1={x(col) + CELL / 2 - 9} y1={y(row) + 9} x2={x(col) + CELL / 2 + 9} y2={y(row) - 9} />
            </g>
          ))}
        {vertical
          .filter(({ id }) => excluded.has(id) && !lines.has(id))
          .map(({ id, row, col }) => (
            <g key={`vx-${id}`} className="board-cross">
              <line x1={x(col) - 9} y1={y(row) + CELL / 2 - 9} x2={x(col) + 9} y2={y(row) + CELL / 2 + 9} />
              <line x1={x(col) - 9} y1={y(row) + CELL / 2 + 9} x2={x(col) + 9} y2={y(row) + CELL / 2 - 9} />
            </g>
          ))}

        {/* circuito */}
        <g className="board-lines">
          {horizontal
            .filter(({ id }) => lines.has(id))
            .map(({ id, row, col }) => (
              <g key={`hl-${id}`} className={`board-line${highlightSet.has(id) ? " is-new" : ""}`}>
                <line className="halo" x1={x(col)} y1={y(row)} x2={x(col + 1)} y2={y(row)} />
                <line className="core" x1={x(col)} y1={y(row)} x2={x(col + 1)} y2={y(row)} />
              </g>
            ))}
          {vertical
            .filter(({ id }) => lines.has(id))
            .map(({ id, row, col }) => (
              <g key={`vl-${id}`} className={`board-line${highlightSet.has(id) ? " is-new" : ""}`}>
                <line className="halo" x1={x(col)} y1={y(row)} x2={x(col)} y2={y(row + 1)} />
                <line className="core" x1={x(col)} y1={y(row)} x2={x(col)} y2={y(row + 1)} />
              </g>
            ))}
        </g>
      </svg>
    </div>
  );
}

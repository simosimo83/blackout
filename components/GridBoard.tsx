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
  type EdgeKind,
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

/** Orientamento di un bordo dal suo id canonico. */
function parseKind(id: EdgeId): EdgeKind {
  return id.endsWith("-top") || id.endsWith("-bottom") ? "h" : "v";
}

const CELL = 100;
const PAD = 46;
/** Distanza massima (in frazioni di cella) per agganciare un bordo. */
const HIT = 0.34;
/** Semilarghezza minima dell'area sensibile, in pixel reali: conta su schermi piccoli. */
const MIN_HIT_PX = 15;
/**
 * Vicino a un vertice i due bordi perpendicolari sono quasi equidistanti:
 * entro questo margine si resta sull'orientamento del tratto in corso, così
 * trascinando lungo un muro non si accendono i bordi trasversali.
 */
const KEEP_DIRECTION = 0.16;

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
  const stroke = useRef<{ value: EdgeValue; applied: Set<EdgeId>; kind: EdgeKind | null } | null>(null);
  const pan = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    pageX: number;
    pageY: number;
  } | null>(null);

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

  /**
   * Punto del puntatore in coordinate della griglia (unità = cella) più la
   * dimensione in pixel reali di una cella, che serve a tarare l'area sensibile.
   */
  const gridPoint = useCallback(
    (event: React.PointerEvent): { u: number; v: number; cellPx: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(ctm.inverse());
      return { u: (local.x - PAD) / CELL, v: (local.y - PAD) / CELL, cellPx: Math.abs(ctm.a) * CELL };
    },
    [],
  );

  /**
   * Bordo più vicino al puntatore, se dentro l'area sensibile.
   * `prefer` mantiene l'orientamento durante un trascinamento.
   */
  const edgeAt = useCallback(
    (event: React.PointerEvent, prefer: EdgeKind | null = null): EdgeId | null => {
      const p = gridPoint(event);
      if (!p) return null;
      const { u, v, cellPx } = p;
      if (u < -0.4 || v < -0.4 || u > cols + 0.4 || v > rows + 0.4) return null;
      // su celle piccole la fascia sensibile non scende sotto MIN_HIT_PX
      const hit = cellPx > 0 ? Math.min(0.45, Math.max(HIT, MIN_HIT_PX / cellPx)) : HIT;

      const hRow = Math.min(Math.max(Math.round(v), 0), rows);
      const hCol = Math.min(Math.max(Math.floor(u), 0), cols - 1);
      const hDist = Math.abs(v - hRow);

      const vCol = Math.min(Math.max(Math.round(u), 0), cols);
      const vRow = Math.min(Math.max(Math.floor(v), 0), rows - 1);
      const vDist = Math.abs(u - vCol);

      if (Math.min(hDist, vDist) > hit) return null;

      let kind: EdgeKind = hDist <= vDist ? "h" : "v";
      if (prefer && prefer !== kind && Math.abs(hDist - vDist) < KEEP_DIRECTION) kind = prefer;

      const best: EdgeRef =
        kind === "h" ? { kind: "h", row: hRow, col: hCol } : { kind: "v", row: vRow, col: vCol };
      return edgeId(best, grid);
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
      // Il centro delle stanze è zona morta: al tocco serve a spostare la
      // planimetria ingrandita e, quando non c'è nulla da spostare, a scorrere
      // la pagina (il disegno richiede touch-action: none).
      const container = scrollRef.current;
      if (container && event.pointerType !== "mouse") {
        pan.current = {
          x: event.clientX,
          y: event.clientY,
          left: container.scrollLeft,
          top: container.scrollTop,
          pageX: window.scrollX,
          pageY: window.scrollY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const value = nextValue(id);
    stroke.current = { value, applied: new Set([id]), kind: parseKind(id) };
    onStrokeStart?.();
    onSetEdge?.(id, value);
    haptic();
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (pan.current) {
      const container = scrollRef.current;
      if (container) {
        const wantLeft = pan.current.left - (event.clientX - pan.current.x);
        const wantTop = pan.current.top - (event.clientY - pan.current.y);
        const maxLeft = container.scrollWidth - container.clientWidth;
        const maxTop = container.scrollHeight - container.clientHeight;
        const left = Math.min(Math.max(wantLeft, 0), Math.max(maxLeft, 0));
        const top = Math.min(Math.max(wantTop, 0), Math.max(maxTop, 0));
        container.scrollLeft = left;
        container.scrollTop = top;
        // ciò che la planimetria non assorbe scorre la pagina
        window.scrollTo(pan.current.pageX + (wantLeft - left), pan.current.pageY + (wantTop - top));
      }
      return;
    }
    const current = stroke.current;
    if (!current || disabled) return;
    const id = edgeAt(event, current.kind);
    if (!id || current.applied.has(id)) return;
    current.applied.add(id);
    current.kind = parseKind(id);
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

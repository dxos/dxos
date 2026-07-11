//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Position of a tile in grid cells. `w`/`h` (column/row span) are optional and default to 1, so a
 * bare `{ x, y }` is a 1×1 tile — this is the shape `plugin-board` already persists.
 */
export const GridPosition = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  h: Schema.optional(Schema.Number),
});

export type GridPosition = Schema.Schema.Type<typeof GridPosition>;

/**
 * A board layout: object positions keyed by object id. Generic over the position type so consumers
 * can use their own (as long as they supply a matching projection + resolver); the built-in resolvers
 * require `Pos extends GridPosition`.
 */
export type Layout<Pos = GridPosition> = { items: Record<string, Pos> };

/**
 * Board extent in cells. `columns` bounds the horizontal axis (used for clamping and right-push
 * fallback); `rows` is a soft minimum — the board grows past it as tiles are placed lower.
 */
export type Bounds = { columns?: number; rows?: number };

/**
 * Constraints on an item's size in grid cells; not persisted (derived from the tile's definition).
 */
export type GridConstraints = { minW?: number; minH?: number; maxW?: number; maxH?: number };

/**
 * `pack` compacts items upward after every move/resize (gridstack-style); `float` leaves gaps where dropped.
 */
export type GridMode = 'pack' | 'float';

/** Direction along which displaced items are pushed to clear a collision. */
export type PushDirection = 'down' | 'up' | 'right' | 'left';

/** Options threaded to a resolver: the board extent, the moved item's size limits, and the compaction mode. */
export type ResolveOptions = { bounds?: Bounds; constraints?: GridConstraints; mode?: GridMode };

/**
 * Decides what a drop does. Given the current layout, the id being placed and its target position
 * (carrying the desired `x,y,w,h`), returns the resulting layout — or `null` to reject the drop, in
 * which case the tile springs back. Built-in resolvers never produce overlaps.
 */
export type DropResolver<Pos = GridPosition> = (
  layout: Layout<Pos>,
  id: string,
  to: Pos,
  options?: ResolveOptions,
) => Layout<Pos> | null;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Normalized cell rect (span resolved) tagged with its id, for internal engine math. */
type Cell = { id: string; x: number; y: number; w: number; h: number };

const rectOf = (position: GridPosition): { x: number; y: number; w: number; h: number } => ({
  x: position.x,
  y: position.y,
  w: position.w ?? 1,
  h: position.h ?? 1,
});

const toCells = <Pos extends GridPosition>(layout: Layout<Pos>): Cell[] =>
  Object.entries(layout.items).map(([id, position]) => ({ id, ...rectOf(position) }));

// Rebuild a layout from normalized cells, preserving any extra fields on the original positions.
const fromCells = <Pos extends GridPosition>(layout: Layout<Pos>, cells: Cell[]): Layout<Pos> => ({
  ...layout,
  items: Object.fromEntries(
    cells.map((cell) => [cell.id, { ...layout.items[cell.id], x: cell.x, y: cell.y, w: cell.w, h: cell.h } as Pos]),
  ),
});

/**
 * Rectangle overlap in grid cells. Edge-adjacent (touching) rectangles do not overlap.
 */
export const overlaps = (a: Cell, b: Cell): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Clamps a cell's width to the column count, then its x so it never spills past the right edge.
 * `columns` of `Infinity` (unbounded) leaves it untouched apart from flooring x at 0.
 */
const clampToColumns = (cell: Cell, columns: number): Cell => {
  const w = clamp(cell.w, 1, columns);
  const x = clamp(cell.x, 0, columns === Infinity ? cell.x : columns - w);
  return { ...cell, x, w };
};

/**
 * Clamps a candidate size to the given min/max constraints, defaulting min to 1 and max to Infinity.
 * The result is never below 1 regardless of how the constraints are configured.
 */
export const applyConstraints = (
  size: { w: number; h: number },
  constraints?: GridConstraints,
): { w: number; h: number } => {
  const minW = Math.max(constraints?.minW ?? 1, 1);
  const minH = Math.max(constraints?.minH ?? 1, 1);
  const maxW = constraints?.maxW ?? Infinity;
  const maxH = constraints?.maxH ?? Infinity;
  return {
    w: clamp(size.w, minW, Math.max(maxW, minW)),
    h: clamp(size.h, minH, Math.max(maxH, minH)),
  };
};

// Push occupants in the direction the tile is moving/growing: the dominant axis decides horizontal vs
// vertical, its sign decides the way. Horizontal/vertical intent is the signed positional delta plus
// any (rightward/downward) growth from a resize. Ties and no-motion default to down.
const deriveDirection = (from: Cell, to: Cell): PushDirection => {
  const horizontal = to.x - from.x + Math.max(to.w - from.w, 0);
  const vertical = to.y - from.y + Math.max(to.h - from.h, 0);
  if (horizontal !== 0 && Math.abs(horizontal) >= Math.abs(vertical)) {
    return horizontal > 0 ? 'right' : 'left';
  }
  if (vertical !== 0) {
    return vertical > 0 ? 'down' : 'up';
  }
  return 'down';
};

/**
 * Fixes the `movedId` item in place and pushes every other item that overlaps it (directly or by
 * cascade) to clear the overlap, along `direction`. Each direction places a displaced item flush to
 * the far side of what it hit (`right`→+x, `left`→−x, `down`→+y, `up`→−y). A push that would cross a
 * bound (past `columns` on the right, or before 0 on the left/top) falls back to pushing down, since
 * rows grow freely. Candidates are processed in a deterministic sweep ordered along the push axis so
 * a pushed item only ever collides with items later in the sweep.
 */
export const resolveCollisions = <Pos extends GridPosition>(
  layout: Layout<Pos>,
  movedId: string,
  direction: PushDirection = 'down',
  columns: number = Infinity,
): Layout<Pos> => {
  const cells = toCells(layout);
  const moved = cells.find((entry) => entry.id === movedId);
  if (!moved) {
    return layout;
  }

  // Settled items are fixed for the rest of the sweep; the moved item anchors the sweep.
  const settled: Cell[] = [moved];
  const remaining = cells.filter((entry) => entry.id !== movedId);
  const sorted = [...remaining].sort((a, b) => {
    switch (direction) {
      case 'right':
        return a.x - b.x || a.y - b.y;
      case 'left':
        return b.x - a.x || a.y - b.y;
      case 'up':
        return b.y - a.y || a.x - b.x;
      default:
        return a.y - b.y || a.x - b.x; // down
    }
  });

  for (const entry of sorted) {
    let current = entry;
    let collision = settled.find((other) => overlaps(current, other));
    while (collision) {
      if (direction === 'right' && collision.x + collision.w + current.w <= columns) {
        current = { ...current, x: collision.x + collision.w };
      } else if (direction === 'left' && collision.x - current.w >= 0) {
        current = { ...current, x: collision.x - current.w };
      } else if (direction === 'up' && collision.y - current.h >= 0) {
        current = { ...current, y: collision.y - current.h };
      } else {
        // Down push, or a horizontal/upward push that would cross a bound → fall back to down.
        current = { ...current, y: collision.y + collision.h };
      }
      collision = settled.find((other) => overlaps(current, other));
    }
    settled.push(current);
  }

  return fromCells(layout, settled);
};

/**
 * Gravity-up compaction: processes items in a deterministic (y, x) sweep and moves each one to the
 * smallest y >= 0 where it doesn't overlap an already-placed item, keeping its x/w unchanged.
 */
export const compact = <Pos extends GridPosition>(layout: Layout<Pos>): Layout<Pos> => {
  const sorted = toCells(layout).sort((a, b) => a.y - b.y || a.x - b.x);
  const settled: Cell[] = [];

  for (const entry of sorted) {
    let y = 0;
    while (settled.some((other) => overlaps({ ...entry, y }, other))) {
      y += 1;
    }
    settled.push({ ...entry, y });
  }

  return fromCells(layout, settled);
};

//
// Drop resolvers (none produce overlaps).
//

/**
 * Places the tile at `to` and pushes any occupants it now overlaps out of the way (right when the
 * tile moved/grew primarily along x, else down), then optionally compacts upward. This is the
 * gridstack behaviour and the default resolver. Returns the input unchanged if the id is unknown.
 */
export const pushToFit: DropResolver = (layout, id, to, options = {}) => {
  const item = layout.items[id];
  if (!item) {
    return layout;
  }

  const columns = options.bounds?.columns ?? Infinity;
  const from = { id, ...rectOf(item) };
  const size = applyConstraints({ w: to.w ?? 1, h: to.h ?? 1 }, options.constraints);
  const target = clampToColumns({ id, x: to.x, y: to.y, ...size }, columns);
  const updated = fromCells(layout, [target, ...toCells(layout).filter((cell) => cell.id !== id)]);
  const resolved = resolveCollisions(updated, id, deriveDirection(from, target), columns);
  return options.mode === 'pack' ? compact(resolved) : resolved;
};

/**
 * Places the tile at `to`, shrinking it (width first, then height) until it no longer overlaps a
 * neighbour. Returns `null` if not even a 1×1 tile fits at that spot (reject → springs back).
 */
export const resizeToFit: DropResolver = (layout, id, to, options = {}) => {
  const item = layout.items[id];
  if (!item) {
    return layout;
  }

  const columns = options.bounds?.columns ?? Infinity;
  const size = applyConstraints({ w: to.w ?? 1, h: to.h ?? 1 }, options.constraints);
  let candidate = clampToColumns({ id, x: to.x, y: to.y, ...size }, columns);
  const others = toCells(layout).filter((cell) => cell.id !== id);
  while (candidate.w > 1 && others.some((other) => overlaps(candidate, other))) {
    candidate = { ...candidate, w: candidate.w - 1 };
  }
  while (candidate.h > 1 && others.some((other) => overlaps(candidate, other))) {
    candidate = { ...candidate, h: candidate.h - 1 };
  }
  if (others.some((other) => overlaps(candidate, other))) {
    return null;
  }

  return fromCells(layout, [candidate, ...others]);
};

/**
 * Places the tile at `to` only if its footprint fits in free space within the columns; otherwise
 * rejects the drop (`null`). Never moves or resizes other tiles.
 */
export const rejectIfNoFit: DropResolver = (layout, id, to, options = {}) => {
  const item = layout.items[id];
  if (!item) {
    return layout;
  }

  const columns = options.bounds?.columns ?? Infinity;
  const size = applyConstraints({ w: to.w ?? 1, h: to.h ?? 1 }, options.constraints);
  const candidate: Cell = { id, x: to.x, y: to.y, ...size };
  if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.w > columns) {
    return null;
  }
  const others = toCells(layout).filter((cell) => cell.id !== id);
  if (others.some((other) => overlaps(candidate, other))) {
    return null;
  }

  return fromCells(layout, [candidate, ...others]);
};

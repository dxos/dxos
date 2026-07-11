//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const GridItem = Schema.Struct({
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.Number,
  h: Schema.Number,
});

export type GridItem = Schema.Schema.Type<typeof GridItem>;

export const GridLayout = Schema.Struct({
  columns: Schema.Number,
  items: Schema.mutable(Schema.Array(GridItem)),
});

export type GridLayout = Schema.Schema.Type<typeof GridLayout>;

/**
 * Constraints on an item's size in grid cells; not persisted (derived from the tile's definition).
 */
export type GridConstraints = { minW?: number; minH?: number; maxW?: number; maxH?: number };

/**
 * `pack` compacts items upward after every move/resize (gridstack-style); `float` leaves gaps where dropped.
 */
export type GridMode = 'pack' | 'float';

/** Axis along which displaced items are pushed to clear a collision. */
export type PushDirection = 'down' | 'right';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Rectangle overlap in grid cells. Edge-adjacent (touching) rectangles do not overlap.
 */
export const overlaps = (a: GridItem, b: GridItem): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Clamps an item's width to the grid's column count, then its x so it never spills past the right edge.
 */
export const clampToColumns = (item: GridItem, columns: number): GridItem => {
  const w = clamp(item.w, 1, columns);
  const x = clamp(item.x, 0, columns - w);
  return { ...item, x, w };
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

/**
 * Fixes the `movedId` item in place and pushes every other item that overlaps it (directly or by
 * cascade) to clear the overlap, along `direction`. `down` increases y; `right` increases x but
 * falls back to pushing down when the item would spill past the right edge (columns are bounded,
 * rows are not). Candidates are processed in a deterministic sweep ordered along the push axis.
 */
export const resolveCollisions = (
  layout: GridLayout,
  movedId: string,
  direction: PushDirection = 'down',
): GridLayout => {
  const moved = layout.items.find((entry) => entry.id === movedId);
  if (!moved) {
    return layout;
  }

  // Settled items are fixed for the rest of the sweep; the moved item anchors the sweep. Sort along
  // the push axis so a pushed item only ever collides with items later in the sweep.
  const settled: GridItem[] = [moved];
  const remaining = layout.items.filter((entry) => entry.id !== movedId);
  const sorted = [...remaining].sort((a, b) =>
    direction === 'right' ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x,
  );

  for (const entry of sorted) {
    let current = entry;
    let collision = settled.find((other) => overlaps(current, other));
    while (collision) {
      if (direction === 'right' && collision.x + collision.w + current.w <= layout.columns) {
        current = { ...current, x: collision.x + collision.w };
      } else {
        // Down push, or right push that would overflow the columns → fall back to down.
        current = { ...current, y: collision.y + collision.h };
      }
      collision = settled.find((other) => overlaps(current, other));
    }
    settled.push(current);
  }

  const byId = new Map(settled.map((entry) => [entry.id, entry]));
  return { ...layout, items: layout.items.map((entry) => byId.get(entry.id) ?? entry) };
};

/**
 * Gravity-up compaction: processes items in a deterministic (y, x) sweep and moves each one to the
 * smallest y >= 0 where it doesn't overlap an already-placed item, keeping its x/w unchanged.
 */
export const compact = (layout: GridLayout): GridLayout => {
  const sorted = [...layout.items].sort((a, b) => a.y - b.y || a.x - b.x);
  const settled: GridItem[] = [];

  for (const entry of sorted) {
    let y = 0;
    while (settled.some((other) => overlaps({ ...entry, y }, other))) {
      y += 1;
    }
    settled.push({ ...entry, y });
  }

  const byId = new Map(settled.map((entry) => [entry.id, entry]));
  return { ...layout, items: layout.items.map((entry) => byId.get(entry.id) ?? entry) };
};

/**
 * Moves an item to a new position, pushing anything it overlaps out of the way, then optionally
 * compacting the whole layout upward. Returns the input layout unchanged if the item isn't found
 * or the drop target is the item's own current cell.
 */
export const moveItem = (layout: GridLayout, id: string, to: { x: number; y: number }, mode: GridMode): GridLayout => {
  const item = layout.items.find((entry) => entry.id === id);
  if (!item) {
    return layout;
  }
  if (item.x === to.x && item.y === to.y) {
    return layout;
  }

  const moved = clampToColumns({ ...item, x: to.x, y: to.y }, layout.columns);
  const updated: GridLayout = { ...layout, items: layout.items.map((entry) => (entry.id === id ? moved : entry)) };
  // Push right when the item moved primarily rightward, else down.
  const direction: PushDirection =
    moved.x > item.x && moved.x - item.x >= Math.abs(moved.y - item.y) ? 'right' : 'down';
  const resolved = resolveCollisions(updated, id, direction);
  return mode === 'pack' ? compact(resolved) : resolved;
};

/**
 * Resizes an item, pushing anything it now overlaps out of the way, then optionally compacting the
 * whole layout upward. Returns the input layout unchanged if the item isn't found.
 */
export const resizeItem = (
  layout: GridLayout,
  id: string,
  size: { w: number; h: number },
  constraints: GridConstraints | undefined,
  mode: GridMode,
): GridLayout => {
  const item = layout.items.find((entry) => entry.id === id);
  if (!item) {
    return layout;
  }

  const constrained = applyConstraints(size, constraints);
  // Resize keeps the item's x fixed and caps width at the space remaining to the right edge, rather
  // than shifting x left (which clampToColumns would do) — growing a tile shouldn't relocate it.
  const maxWidth = Math.max(1, layout.columns - item.x);
  const resized = { ...item, w: Math.min(constrained.w, maxWidth), h: constrained.h };
  const updated: GridLayout = { ...layout, items: layout.items.map((entry) => (entry.id === id ? resized : entry)) };
  // Push right when the tile grew primarily in width, else down.
  const direction: PushDirection = resized.w - item.w > resized.h - item.h ? 'right' : 'down';
  const resolved = resolveCollisions(updated, id, direction);
  return mode === 'pack' ? compact(resolved) : resolved;
};

//
// Copyright 2026 DXOS.org
//

//
// Grids: a box that places the boxes naming it, instead of leaving them where they were put. Modelled on CSS grid,
// because that is the layout vocabulary a person already has — `cols` and `rows` are track lists, `fr` takes a
// share of what is left, `auto` keeps a child's own size, and a bare number is a fixed extent in scene units.
//
// The rule is what is stored — the tracks, the gap and the padding on the grid, `parent` on each child — and the
// children's coordinates are a cached projection of it, re-solved on every render. That is what keeps a run evenly
// spaced when a member is added, when one is removed, or when the grid is resized, rather than each of those being
// a re-layout someone has to remember to run.
//
// Nesting is the same rule applied again: a grid may itself be a child, so an outer grid is solved first and each
// inner one then inside the frame it was given.
//

import { type Box, type Place } from './shape.ts';

/** A box's frame, in the units its object states. */
export type Frame = { x: number; y: number; w: number; h: number };

/** One track of a grid: a share of what is left, the content's own size, or a fixed extent in scene units. */
export type Track =
  | { readonly kind: 'fr'; readonly value: number }
  | { readonly kind: 'auto' }
  | { readonly kind: 'fixed'; readonly value: number };

const FR = { kind: 'fr', value: 1 } as const;

/**
 * A track list: `3` is three equal shares and `"1fr auto 2fr"` is what it says. An entry that means nothing is one
 * share, so a typo spreads rather than collapsing the grid. An axis that states nothing has IMPLICIT tracks — one
 * per child, as CSS's `grid-auto-rows` gives and as flexbox gives for free — which is why a column of ten cards
 * needs no count beside it.
 */
export const parseTracks = (spec: number | string | undefined): Track[] | undefined => {
  if (spec === undefined) {
    return undefined;
  }
  if (typeof spec === 'number') {
    return Array.from({ length: Math.max(Math.floor(spec), 1) }, () => FR);
  }
  const entries = spec.trim().split(/\s+/).filter(Boolean);
  if (entries.length === 0) {
    return [FR];
  }
  return entries.map((entry): Track => {
    if (entry === 'auto') {
      return { kind: 'auto' };
    }
    const fr = /^(\d*\.?\d*)fr$/.exec(entry);
    if (fr) {
      const value = fr[1] === '' ? 1 : Number(fr[1]);
      return Number.isFinite(value) && value > 0 ? { kind: 'fr', value } : FR;
    }
    const fixed = Number(entry);
    return Number.isFinite(fixed) && fixed >= 0 ? { kind: 'fixed', value: fixed } : FR;
  });
};

/**
 * The size one implicit track takes: `auto`, a share, or a fixed extent. A bare number is that extent and not a
 * count, unlike `cols`/`rows` — `autoRows=136` is one row size, and how many rows there are is the children's to
 * say. Anything that means nothing is one share, which is what an axis with no rule at all takes.
 */
const autoTrack = (spec: number | string | undefined): Track => {
  if (typeof spec === 'number') {
    return Number.isFinite(spec) && spec >= 0 ? { kind: 'fixed', value: spec } : FR;
  }
  return parseTracks(spec)?.[0] ?? FR;
};

/**
 * The extent of each track along one axis. Fixed tracks take what they ask, `auto` takes the largest own size among
 * the children sitting in it, and the `fr` tracks divide what is left in proportion — never below zero, so an
 * over-committed grid collapses its shares rather than running its children off the end.
 */
const solveTracks = (tracks: readonly Track[], extent: number, gap: number, content: readonly number[]): number[] => {
  const gaps = gap * Math.max(tracks.length - 1, 0);
  const sizes = tracks.map((track, index) =>
    track.kind === 'fixed' ? track.value : track.kind === 'auto' ? (content[index] ?? 0) : 0,
  );
  const committed = sizes.reduce((total, size) => total + size, 0);
  const shares = tracks.reduce((total, track) => total + (track.kind === 'fr' ? track.value : 0), 0);
  const spare = Math.max(extent - gaps - committed, 0);
  return tracks.map((track, index) => (track.kind === 'fr' ? (spare * track.value) / shares : sizes[index]));
};

/** Where each track starts, given its extent, the gap between them and where the run as a whole sits. */
const offsets = (sizes: readonly number[], gap: number, extent: number, place: Place | undefined): number[] => {
  // Tracks that do not fill the frame leave space over, and `place` says which side of them it goes. An axis
  // holding an `fr` track has none left over, so this is the identity there, as CSS's `*-content` is.
  const total = sizes.reduce((sum, size) => sum + size, 0) + gap * Math.max(sizes.length - 1, 0);
  const spare = Math.max(extent - total, 0);
  let offset = place === 'center' ? spare / 2 : place === 'end' ? spare : 0;
  return sizes.map((size) => {
    const start = offset;
    offset += size + gap;
    return start;
  });
};

/** What a grid needs of itself. */
export type GridRule = Pick<
  Box,
  'cols' | 'rows' | 'gap' | 'padding' | 'autoCols' | 'autoRows' | 'justifyContent' | 'alignContent'
>;

/**
 * The frames of `children` inside `frame`, filled in order, row by row as CSS grid's auto-flow does. A child past
 * the last cell is left where it was rather than stacked on another: a grid states how many cells it has, and
 * silently overflowing it would hide the mistake.
 */
export const solveGrid = (grid: GridRule, frame: Frame, children: readonly Box[]): { id: string; frame: Frame }[] => {
  // Implicit tracks: the axis that states none takes as many as the children need, each the size `autoCols` /
  // `autoRows` gives — a share of the frame unless one says otherwise. Stating neither is a single column, which
  // is the stack a `flex-col` gives and the shape most runs want.
  const stated = { cols: parseTracks(grid.cols), rows: parseTracks(grid.rows) };
  const implicit = (count: number, spec: number | string | undefined): Track[] => {
    const track = autoTrack(spec);
    return Array.from({ length: Math.max(count, 1) }, () => track);
  };
  const cols =
    stated.cols ??
    (stated.rows
      ? implicit(Math.ceil(children.length / stated.rows.length), grid.autoCols)
      : implicit(1, grid.autoCols));
  const rows = stated.rows ?? implicit(Math.ceil(children.length / cols.length), grid.autoRows);
  const gap = grid.gap ?? 0;
  const padding = grid.padding ?? 0;
  const inner = {
    x: frame.x + padding,
    y: frame.y + padding,
    w: Math.max(frame.w - 2 * padding, 0),
    h: Math.max(frame.h - 2 * padding, 0),
  };
  // An `auto` track takes the largest own size among the children that land in it.
  const cellOf = (index: number) => ({ col: index % cols.length, row: Math.floor(index / cols.length) });
  const widest = cols.map((_, col) =>
    Math.max(0, ...children.filter((_child, index) => cellOf(index).col === col).map((child) => child.w)),
  );
  const tallest = rows.map((_, row) =>
    Math.max(0, ...children.filter((_child, index) => cellOf(index).row === row).map((child) => child.h)),
  );
  const widths = solveTracks(cols, inner.w, gap, widest);
  const heights = solveTracks(rows, inner.h, gap, tallest);
  const x = offsets(widths, gap, inner.w, grid.justifyContent);
  const y = offsets(heights, gap, inner.h, grid.alignContent);

  return children.flatMap((child, index) => {
    const { col, row } = cellOf(index);
    if (row >= rows.length) {
      return [];
    }
    return [{ id: child.id, frame: { x: inner.x + x[col], y: inner.y + y[row], w: widths[col], h: heights[row] } }];
  });
};

/**
 * Every box placed by a grid, outermost first. A grid nested in another is solved after the one that places it, so
 * it is solved against the frame it was just given rather than the one it was authored at. A `parent` naming no
 * box, or naming one that is not a grid, leaves the child where it is.
 */
export const solveGrids = (elements: readonly Box[]): Map<string, Frame> => {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const isGrid = (id: string | undefined) => (id === undefined ? false : byId.get(id)?.kind === 'grid');
  const frames = new Map<string, Frame>(
    elements.map((element) => [element.id, { x: element.x, y: element.y, w: element.w, h: element.h }]),
  );
  const childrenOf = new Map<string, Box[]>();
  for (const element of elements) {
    if (isGrid(element.parent)) {
      childrenOf.set(element.parent!, [...(childrenOf.get(element.parent!) ?? []), element]);
    }
  }

  // Outermost first: a grid whose own parent places it must wait for that frame. A cycle (a grid naming one of its
  // own descendants) is never reached, so it is left where it was rather than looping.
  const depth = (element: Box, seen = new Set<string>()): number => {
    const parent = element.parent !== undefined ? byId.get(element.parent) : undefined;
    if (!parent || parent.kind !== 'grid' || seen.has(element.id)) {
      return 0;
    }
    seen.add(element.id);
    return 1 + depth(parent, seen);
  };
  const grids = elements.filter((element) => childrenOf.has(element.id));
  for (const grid of [...grids].sort((left, right) => depth(left) - depth(right))) {
    const frame = frames.get(grid.id);
    if (!frame) {
      continue;
    }
    for (const placed of solveGrid(grid, frame, childrenOf.get(grid.id) ?? [])) {
      frames.set(placed.id, placed.frame);
    }
  }
  return frames;
};

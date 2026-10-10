//
// Copyright 2026 DXOS.org
//

//
// Post-placement compaction on the lattice. ELK spaces compound nodes by their padded extents and
// quantization rounds every gap up, so a placement often carries empty lanes and packages parked
// far from the package they talk to. A local search slides whole packages and single boxes by whole
// lattice pitches toward their partners — never reversing an edge's direction on either axis, never
// stacking two boxes and never bringing frames closer than their clearance — while the drawing's
// connector length and extent fall.
//

import type * as Scene from './scene.ts';
import { type Rect } from './uml-grid.ts';

export type Geometry = {
  /** Box size, shared by every node. */
  cell: { w: number; h: number };
  /** Lattice pitch; every move is a whole number of pitches. */
  pitch: { x: number; y: number };
  /** Inset of a frame around its members, and the label band above them. */
  framePad: number;
  frameLabel: number;
  /** Clear space a frame keeps from other frames and from boxes outside it. */
  frameGap: number;
};

export type Graph = {
  nodes: readonly string[];
  groups: readonly { id: string; children: readonly string[] }[];
  edges: readonly { from: string; to: string }[];
};

/** Upper bound on improvement sweeps; each sweep tries every unit once. */
const MAX_SWEEPS = 12;
/** Farthest a unit moves in one step, in pitches per axis. */
const MAX_REACH = 8;
/** Cost of one connector whose ends share neither a row nor a column (it must bend). */
const BEND_COST = 1;
/** Cost of a lattice unit of drawing width or height, against one unit of connector length. */
const EXTENT_COST = 1;

type Points = Map<string, Scene.Point>;

const sign = (value: number) => (value > 0 ? 1 : value < 0 ? -1 : 0);

const orientation = (a: Scene.Point, b: Scene.Point, c: Scene.Point) =>
  sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

/** Whether two segments properly cross; touching or collinear runs do not count. */
const intersect = (a: Scene.Point, b: Scene.Point, c: Scene.Point, d: Scene.Point) => {
  const [o1, o2, o3, o4] = [orientation(a, b, c), orientation(a, b, d), orientation(c, d, a), orientation(c, d, b)];
  return o1 * o2 < 0 && o3 * o4 < 0;
};

const apart = (a: Rect, b: Rect, gap: number) =>
  a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;

/**
 * Compacts a lattice placement. Units are every package (moved rigidly) and every box (moved
 * within or outside its package); a move is kept only when it lowers the cost — connector length
 * plus bends plus the drawing's width and height, all in lattice units — and introduces no
 * violation of the placement's invariants.
 */
export const compact = (graph: Graph, positions: ReadonlyMap<string, Scene.Point>, geometry: Geometry): Points => {
  const { cell, pitch, framePad, frameLabel, frameGap } = geometry;
  const edges = graph.edges.filter(
    (edge) => positions.has(edge.from) && positions.has(edge.to) && edge.from !== edge.to,
  );
  const groups = graph.groups
    .map((group) => ({ id: group.id, members: group.children.filter((id) => positions.has(id)) }))
    .filter((group) => group.members.length > 0);
  const grouped = new Set(groups.flatMap((group) => group.members));
  const loose = [...positions.keys()].filter((id) => !grouped.has(id));
  // Direction of every edge on each axis, which no move may reverse or flatten.
  const signs = edges.map((edge) => {
    const [from, to] = [positions.get(edge.from), positions.get(edge.to)];
    return from && to ? { x: sign(to.x - from.x), y: sign(to.y - from.y) } : { x: 0, y: 0 };
  });

  const frameOf = (members: readonly string[], state: Points): Rect => {
    const points = members.flatMap((id) => state.get(id) ?? []);
    const x = Math.min(...points.map((point) => point.x)) - framePad;
    const y = Math.min(...points.map((point) => point.y)) - framePad - frameLabel;
    const right = Math.max(...points.map((point) => point.x)) + cell.w + framePad;
    const bottom = Math.max(...points.map((point) => point.y)) + cell.h + framePad;
    return { x, y, w: right - x, h: bottom - y };
  };

  /** Invariant breaches: stacked boxes, reversed edges, frames too close to frames or outside boxes. */
  const violations = (state: Points) => {
    let count = 0;
    const taken = new Set<string>();
    for (const point of state.values()) {
      const key = `${point.x}:${point.y}`;
      count += taken.has(key) ? 1 : 0;
      taken.add(key);
    }
    edges.forEach((edge, index) => {
      const [from, to] = [state.get(edge.from), state.get(edge.to)];
      if (from && to && (sign(to.x - from.x) !== signs[index].x || sign(to.y - from.y) !== signs[index].y)) {
        count++;
      }
    });
    const frames = groups.map((group) => frameOf(group.members, state));
    for (let index = 0; index < frames.length; index++) {
      for (let other = index + 1; other < frames.length; other++) {
        count += apart(frames[index], frames[other], frameGap) ? 0 : 1;
      }
      for (const id of loose) {
        const point = state.get(id);
        count += point && !apart(frames[index], { ...point, ...cell }, frameGap) ? 1 : 0;
      }
    }
    return count;
  };

  // Straight centre-to-centre lines stand in for the routes, which do not exist yet; a move may not add crossings among them.
  const crossings = (state: Points) => {
    const center = (id: string) => {
      const point = state.get(id);
      return point ? { x: point.x + cell.w / 2, y: point.y + cell.h / 2 } : undefined;
    };
    const lines = edges.flatMap((edge) => {
      const [from, to] = [center(edge.from), center(edge.to)];
      return from && to ? [{ edge, from, to }] : [];
    });
    let count = 0;
    for (let index = 0; index < lines.length; index++) {
      for (let other = index + 1; other < lines.length; other++) {
        const [a, b] = [lines[index], lines[other]];
        const shared = [a.edge.from, a.edge.to].some((id) => id === b.edge.from || id === b.edge.to);
        count += !shared && intersect(a.from, a.to, b.from, b.to) ? 1 : 0;
      }
    }
    return count;
  };

  const cost = (state: Points) => {
    let total = 0;
    for (const edge of edges) {
      const [from, to] = [state.get(edge.from), state.get(edge.to)];
      if (from && to) {
        const [dx, dy] = [Math.abs(to.x - from.x) / pitch.x, Math.abs(to.y - from.y) / pitch.y];
        total += dx + dy + (dx > 0 && dy > 0 ? BEND_COST : 0);
      }
    }
    const rects = [
      ...groups.map((group) => frameOf(group.members, state)),
      ...loose.flatMap((id) => {
        const point = state.get(id);
        return point ? [{ ...point, ...cell }] : [];
      }),
    ];
    const width = Math.max(...rects.map((rect) => rect.x + rect.w)) - Math.min(...rects.map((rect) => rect.x));
    const height = Math.max(...rects.map((rect) => rect.y + rect.h)) - Math.min(...rects.map((rect) => rect.y));
    return total + EXTENT_COST * (width / pitch.x + height / pitch.y);
  };

  const units: (readonly string[])[] = [
    ...groups.filter((group) => group.members.length > 1).map((group) => group.members),
    ...[...positions.keys()].map((id) => [id]),
  ];
  const offsets = Array.from({ length: MAX_REACH * 2 + 1 }, (_, index) => index - MAX_REACH);
  const moves = offsets
    .flatMap((dx) => offsets.map((dy) => ({ dx, dy })))
    .filter(({ dx, dy }) => dx !== 0 || dy !== 0)
    .sort((left, right) => Math.abs(left.dx) + Math.abs(left.dy) - Math.abs(right.dx) - Math.abs(right.dy));

  let state: Points = new Map(positions);
  let current = cost(state);
  let broken = violations(state);
  let crossed = crossings(state);
  for (let sweep = 0; sweep < MAX_SWEEPS; sweep++) {
    let improved = false;
    for (const unit of units) {
      let best: { state: Points; cost: number; violations: number; crossings: number } | undefined;
      for (const { dx, dy } of moves) {
        const next = new Map(state);
        for (const id of unit) {
          const point = state.get(id);
          if (point) {
            next.set(id, { x: point.x + dx * pitch.x, y: point.y + dy * pitch.y });
          }
        }
        const value = cost(next);
        // Strictly cheaper by a margin, so float noise never shuffles equal layouts.
        if (value < (best?.cost ?? current) - 1e-6) {
          const breaches = violations(next);
          const crossing = breaches <= broken ? crossings(next) : Infinity;
          if (crossing <= crossed) {
            best = { state: next, cost: value, violations: breaches, crossings: crossing };
          }
        }
      }
      if (best) {
        state = best.state;
        current = best.cost;
        broken = best.violations;
        crossed = best.crossings;
        improved = true;
      }
    }
    if (!improved) {
      break;
    }
  }

  // Keep the placement's top-left where it was, so a move of the first package does not shift the drawing.
  const corner = (points: Iterable<Scene.Point>) => {
    const list = [...points];
    return { x: Math.min(...list.map((point) => point.x)), y: Math.min(...list.map((point) => point.y)) };
  };
  const [before, after] = [corner(positions.values()), corner(state.values())];
  return new Map(
    [...state].map(([id, point]) => [id, { x: point.x - after.x + before.x, y: point.y - after.y + before.y }]),
  );
};

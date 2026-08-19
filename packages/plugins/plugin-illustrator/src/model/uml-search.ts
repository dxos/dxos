//
// Copyright 2026 DXOS.org
//

//
// Scored placement search: the longest chain anchors the center; a greedy tree search walks the
// relation graph outward, trying candidate positions for each still-unplaced group next to its
// placed neighbour (above/below preferred, connecting nodes axis-aligned) and keeping the
// highest-scoring one. The final layout is the better of the search and the rank packing, under
// one score: +1 per straight connector, −1 per crossing. Entirely custom by necessity — ELK and
// dagre are one-shot global optimizers with no scoring callback or incremental placement API —
// but either can still lay out a group's interior or contribute a candidate to the same scorer.
// See `docs/DESIGN.md`.
//

import type * as Scene from './scene';
import { type UmlModel, parse, relationRanks } from './uml';
import { GRID, type CompileOptions as GridCompileOptions, type Rect, emit, measureCell, zRouter } from './uml-grid';
import {
  type Group,
  type GroupRule,
  buildGroups,
  frameCommands,
  inheritanceTreeRule,
  linearChainRule,
  packGroups,
  resolveRects,
} from './uml-rules';

const GAP = GRID * 3;

const snap = (value: number) => Math.round(value / GRID) * GRID;

type Point = Scene.Point;
type Segment = [Point, Point];

const segmentsOf = (points: readonly Point[]): Segment[] =>
  points.slice(0, -1).map((point, index) => [point, points[index + 1]]);

/** Orthogonal segment crossing: proper intersections plus collinear overlaps. */
const crosses = ([a1, a2]: Segment, [b1, b2]: Segment): boolean => {
  const aVertical = a1.x === a2.x;
  const bVertical = b1.x === b2.x;
  if (aVertical !== bVertical) {
    const [v1, v2] = aVertical ? [a1, a2] : [b1, b2];
    const [h1, h2] = aVertical ? [b1, b2] : [a1, a2];
    return (
      v1.x > Math.min(h1.x, h2.x) &&
      v1.x < Math.max(h1.x, h2.x) &&
      h1.y > Math.min(v1.y, v2.y) &&
      h1.y < Math.max(v1.y, v2.y)
    );
  }
  if (aVertical) {
    return a1.x === b1.x && Math.min(a1.y, a2.y) < Math.max(b1.y, b2.y) && Math.min(b1.y, b2.y) < Math.max(a1.y, a2.y);
  }
  return a1.y === b1.y && Math.min(a1.x, a2.x) < Math.max(b1.x, b2.x) && Math.min(b1.x, b2.x) < Math.max(a1.x, a2.x);
};

/** Direction changes along a polyline, ignoring zero-length segments. */
const bends = (route: readonly Point[]): number => {
  const points = route.filter(
    (point, index) => index === 0 || point.x !== route[index - 1].x || point.y !== route[index - 1].y,
  );
  let count = 0;
  for (let index = 2; index < points.length; index++) {
    const [a, b, c] = [points[index - 2], points[index - 1], points[index]];
    if (!((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y))) {
      count++;
    }
  }
  return count;
};

/**
 * Layout score over the placed subset: +1 per straight or single-bend (L) route, −1 per crossing
 * pair. Routes come from the cheap Z-router — the score ranks candidates, the A* router draws
 * the final picture.
 */
export const scoreLayout = (model: UmlModel, rects: Map<string, Rect>): number => {
  const horizontal = model.direction === 'LR' || model.direction === 'RL';
  const routes: Point[][] = [];
  for (const relation of model.relations) {
    const from = rects.get(relation.from);
    const to = rects.get(relation.to);
    if (!from || !to) {
      continue;
    }
    routes.push(zRouter({ relation, from, to, horizontal, offset: 0 }));
  }

  let score = 0;
  for (const route of routes) {
    if (bends(route) <= 1) {
      score += 1;
    }
  }
  for (let a = 0; a < routes.length; a++) {
    for (let b = a + 1; b < routes.length; b++) {
      const pairCrosses = segmentsOf(routes[a]).some((left) =>
        segmentsOf(routes[b]).some((right) => crosses(left, right)),
      );
      if (pairCrosses) {
        score -= 1;
      }
    }
  }
  return score;
};

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;

/**
 * Greedy tree search: place the chain (or largest) group first, then repeatedly place the
 * unplaced group connected to the earliest-placed node, trying axis-aligned candidates around
 * the anchor (below and above preferred, then right/left, sliding off collisions) and keeping
 * the best-scoring one.
 */
export const searchPlacement = (model: UmlModel, groups: Group[]): Map<string, Scene.Point> => {
  const groupOf = new Map<string, Group>();
  for (const group of groups) {
    for (const id of group.rects.keys()) {
      groupOf.set(id, group);
    }
  }

  const seed =
    groups.find((group) => group.rule === 'chain') ??
    [...groups].sort((left, right) => right.rects.size - left.rects.size)[0];
  // An empty or unparseable source yields no groups; compile then emits an empty scene.
  if (!seed) {
    return new Map();
  }

  const origins = new Map<string, Point>();
  origins.set(seed.id, { x: 0, y: 0 });
  const placedNodes: string[] = [...seed.rects.keys()];

  const absolute = (id: string): Rect | undefined => {
    const group = groupOf.get(id)!;
    const at = origins.get(group.id);
    if (!at) {
      return undefined;
    }
    const local = group.rects.get(id)!;
    return { ...local, x: at.x + local.x, y: at.y + local.y };
  };
  const placedBounds = (): Rect[] =>
    groups.flatMap((group) => {
      const at = origins.get(group.id);
      return at ? [{ x: at.x, y: at.y, w: group.w, h: group.h }] : [];
    });

  while (origins.size < groups.length) {
    // Frontier: the earliest-placed node with a relation into an unplaced group.
    let anchorId: string | undefined;
    let connection: { group: Group; node: string } | undefined;
    for (const placed of placedNodes) {
      for (const relation of model.relations) {
        const other = relation.from === placed ? relation.to : relation.to === placed ? relation.from : undefined;
        if (other && !origins.has(groupOf.get(other)!.id)) {
          anchorId = placed;
          connection = { group: groupOf.get(other)!, node: other };
          break;
        }
      }
      if (connection) {
        break;
      }
    }
    // Disconnected remainder: park it right of everything placed so far.
    if (!connection || !anchorId) {
      const group = groups.find((candidate) => !origins.has(candidate.id))!;
      const rightmost = Math.max(...placedBounds().map((rect) => rect.x + rect.w), 0);
      origins.set(group.id, { x: snap(rightmost + GAP), y: 0 });
      placedNodes.push(...group.rects.keys());
      continue;
    }

    const anchor = absolute(anchorId)!;
    const local = connection.group.rects.get(connection.node)!;
    const anchorCenterX = anchor.x + anchor.w / 2;
    const anchorCenterY = anchor.y + anchor.h / 2;
    // Candidates align the connecting node's axis with the anchor's, above/below preferred.
    const candidates: Point[] = [
      { x: anchorCenterX - local.x - local.w / 2, y: anchor.y + anchor.h + GAP },
      { x: anchorCenterX - local.x - local.w / 2, y: anchor.y - GAP - connection.group.h },
      { x: anchor.x + anchor.w + GAP, y: anchorCenterY - local.y - local.h / 2 },
      { x: anchor.x - GAP - connection.group.w, y: anchorCenterY - local.y - local.h / 2 },
    ];

    let best: { at: Point; score: number } | undefined;
    for (const [candidateIndex, candidate] of candidates.entries()) {
      // Slide along the placement axis (in grid steps) until the group's border clears others.
      const at = { x: snap(candidate.x), y: snap(candidate.y) };
      const bounds = placedBounds();
      let tries = 0;
      // The first two candidates are the below/above placements; index, not coordinate
      // coincidence, decides the slide axis.
      const vertical = candidateIndex < 2;
      while (
        bounds.some((rect) => overlaps(rect, { x: at.x, y: at.y, w: connection.group.w, h: connection.group.h })) &&
        tries < 24
      ) {
        if (vertical) {
          at.x += GRID * 2;
        } else {
          at.y += GRID * 2;
        }
        tries++;
      }
      if (tries >= 24) {
        continue;
      }
      origins.set(connection.group.id, at);
      const score = scoreLayout(model, resolveRects(groups, originsSubset(groups, origins)));
      origins.delete(connection.group.id);
      // Strict >, so earlier (preferred: below, then above) candidates win ties.
      if (!best || score > best.score) {
        best = { at, score };
      }
    }

    const at = best?.at ?? { x: snap(Math.max(...placedBounds().map((rect) => rect.x + rect.w)) + GAP), y: 0 };
    origins.set(connection.group.id, at);
    placedNodes.push(...connection.group.rects.keys());
  }

  // Normalize the top-left to (0, 0).
  const minX = Math.min(...[...origins.values()].map((point) => point.x));
  const minY = Math.min(...[...origins.values()].map((point) => point.y));
  return new Map([...origins].map(([id, point]) => [id, { x: point.x - minX, y: point.y - minY }]));
};

/** Placement restricted to placed groups, so partial layouts score without phantom rects. */
const originsSubset = (groups: Group[], origins: Map<string, Point>): Map<string, Point> =>
  new Map(groups.filter((group) => origins.has(group.id)).map((group) => [group.id, origins.get(group.id)!]));

export type CompileOptions = Omit<GridCompileOptions, 'route'> & {
  rules?: GroupRule[];
};

/**
 * Compile via the scored search, falling back to whichever of {search, rank packing} scores
 * higher — the search is greedy, so the packing occasionally beats it.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const { origin = { x: 0, y: 0 }, scale = 1, maxWidth = GRID * 6 } = options;
  const rules = options.rules ?? [inheritanceTreeRule, linearChainRule];
  const model = parse(source);
  const cell = measureCell(model, { maxWidth, cell: options.cell, titleHeight: options.titleHeight });
  const groups = buildGroups(model, cell, rules);

  const searched = searchPlacement(model, groups);
  const packed = packGroups(model, groups);
  const searchedScore = scoreLayout(model, resolveRects(groups, searched));
  const packedScore = scoreLayout(model, resolveRects(groups, packed));
  const origins = searchedScore >= packedScore ? searched : packed;

  const rects = resolveRects(groups, origins);
  return [
    ...frameCommands(groups, origins, { origin, scale }),
    ...emit({ model, cell, rects, ranks: relationRanks(model) }, { origin, scale }),
  ];
};

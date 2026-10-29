//
// Copyright 2026 DXOS.org
//

//
// Graph arrangement on a grid of slots: which column (and, for force, which row) each node takes once it has a
// rank. Coordinates are slot indices; the caller turns them into scene points with its pitch.
//

import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3';

export type ArrangeEdge = { from: string; to: string };

/** A node's slot: its column, and its row (the rank, unless a force layout moved it); fractional only for `force-free`. */
export type Slot = { column: number; row: number };

/**
 * - `rank`: each rank's nodes in id order.
 * - `crossings`: each rank ordered by its neighbours' mean column, sweeping down and up, keeping the order with the
 *   fewest crossings between adjacent ranks.
 * - `force`: a force layout seeded from the ranks (which it then ignores) and run to rest, each node then snapped to
 *   the nearest free slot.
 * - `force-free`: the same force layout where it came to rest, unsnapped, to compare against `force`.
 * - `routed`: `crossings`, then improved by moving and swapping nodes against the cost of their routed links; it needs
 *   the routes, so here it gives the `crossings` seed and the dynamic projection runs the search.
 */
export type Arrangement = 'rank' | 'crossings' | 'force' | 'force-free' | 'routed';

/**
 * The force layouts' strengths: how hard linked nodes pull together, how hard every node pushes its neighbours, and how
 * far (in slots) that push reaches.
 */
export type ForceOptions = { attraction?: number; repulsion?: number; range?: number };

export const DEFAULT_FORCE: Required<ForceOptions> = { attraction: 1, repulsion: 0.2, range: 3 };

const SWEEPS = 8;
const FORCE_TICKS = 300;

/** The slot of every node in `ranks`, by `arrangement`. Deterministic: the same graph always gives the same slots. */
export const arrange = (
  ranks: ReadonlyMap<string, number>,
  edges: readonly ArrangeEdge[],
  arrangement: Arrangement = 'crossings',
  force: ForceOptions = {},
): Map<string, Slot> => {
  const rows = rowsOf(ranks);
  switch (arrangement) {
    case 'rank':
      return slotsOf(rows);
    case 'crossings':
    case 'routed':
      return slotsOf(orderRows(rows, edges));
    case 'force':
    case 'force-free':
      return forceSlots(ranks, edges, slotsOf(orderRows(rows, edges)), arrangement === 'force', {
        attraction: force.attraction ?? DEFAULT_FORCE.attraction,
        repulsion: force.repulsion ?? DEFAULT_FORCE.repulsion,
        range: force.range ?? DEFAULT_FORCE.range,
      });
  }
};

const rowsOf = (ranks: ReadonlyMap<string, number>): string[][] => {
  const rows: string[][] = [];
  for (const [id, rank] of ranks) {
    (rows[rank] ??= []).push(id);
  }
  return Array.from(rows, (row) => [...(row ?? [])].sort());
};

const slotsOf = (rows: readonly string[][]): Map<string, Slot> =>
  new Map(rows.flatMap((row, rowIndex) => row.map((id, column) => [id, { column, row: rowIndex }] as const)));

/** Neighbours of each node, both directions, so a sweep in either direction reads the adjacent rank. */
const neighboursOf = (edges: readonly ArrangeEdge[]): Map<string, string[]> => {
  const neighbours = new Map<string, string[]>();
  for (const { from, to } of edges) {
    neighbours.set(from, [...(neighbours.get(from) ?? []), to]);
    neighbours.set(to, [...(neighbours.get(to) ?? []), from]);
  }
  return neighbours;
};

/** Crossings between two adjacent rows: pairs of edges whose ends are in opposite orders. */
const crossingsBetween = (
  upper: readonly string[],
  lower: readonly string[],
  edges: readonly ArrangeEdge[],
): number => {
  const top = new Map(upper.map((id, index) => [id, index]));
  const bottom = new Map(lower.map((id, index) => [id, index]));
  const pairs = edges.flatMap(({ from, to }): (readonly [number, number])[] => {
    const down = [top.get(from), bottom.get(to)] as const;
    const up = [top.get(to), bottom.get(from)] as const;
    const [upper, lower] = down[0] !== undefined && down[1] !== undefined ? down : up;
    return upper !== undefined && lower !== undefined ? [[upper, lower]] : [];
  });
  let count = 0;
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      if ((pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1]) < 0) {
        count++;
      }
    }
  }
  return count;
};

const totalCrossings = (rows: readonly string[][], edges: readonly ArrangeEdge[]): number =>
  rows.slice(1).reduce((sum, row, index) => sum + crossingsBetween(rows[index], row, edges), 0);

/** Barycenter sweeps: each row sorted by the mean position of its neighbours in the row just placed. */
const orderRows = (rows: readonly string[][], edges: readonly ArrangeEdge[]): string[][] => {
  const neighbours = neighboursOf(edges);
  const current = rows.map((row) => [...row]);
  // A copy, since sweeps reorder `current` in place: an alias would let a worse sweep overwrite the seed.
  let best = current.map((row) => [...row]);
  let bestScore = totalCrossings(current, edges);
  for (let sweep = 0; sweep < SWEEPS && bestScore > 0; sweep++) {
    const down = sweep % 2 === 0;
    const order = down
      ? current.map((_, index) => index).slice(1)
      : current
          .map((_, index) => index)
          .slice(0, -1)
          .reverse();
    for (const index of order) {
      const reference = new Map(current[down ? index - 1 : index + 1].map((id, column) => [id, column]));
      const keyed = current[index].map((id, column) => {
        const columns = (neighbours.get(id) ?? []).flatMap((other) => reference.get(other) ?? []);
        // A node with no neighbour in the reference row keeps its place.
        const key = columns.length > 0 ? columns.reduce((sum, value) => sum + value, 0) / columns.length : column;
        return { id, key };
      });
      current[index] = keyed.sort((a, b) => a.key - b.key || a.id.localeCompare(b.id)).map(({ id }) => id);
    }
    const score = totalCrossings(current, edges);
    if (score < bestScore) {
      best = current.map((row) => [...row]);
      bestScore = score;
    }
  }
  return best;
};

type SimNode = { id: string; x: number; y: number };

/**
 * A force layout in slot units, seeded from `seed` so it needs no randomness. Snapped, in reading order: each node
 * takes its nearest slot, or the nearest free one, so no two share a slot.
 */
const forceSlots = (
  ranks: ReadonlyMap<string, number>,
  edges: readonly ArrangeEdge[],
  seed: ReadonlyMap<string, Slot>,
  snap: boolean,
  { attraction, repulsion, range }: Required<ForceOptions>,
): Map<string, Slot> => {
  const nodes: SimNode[] = [...ranks].map(([id, rank]) => {
    const slot = seed.get(id) ?? { column: 0, row: rank };
    return { id, x: slot.column, y: slot.row };
  });
  const links = edges
    .filter(({ from, to }) => ranks.has(from) && ranks.has(to))
    .map(({ from, to }) => ({ source: from, target: to }));
  forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string }>(links)
        .id(({ id }) => id)
        .distance(1)
        .strength(attraction),
    )
    // Short-range, so unrelated nodes make room for each other without the graph spreading across the canvas.
    .force('charge', forceManyBody().strength(-repulsion).distanceMax(range))
    .force('collide', forceCollide(0.5))
    // Ranks only seed the layout; the forces alone place nodes, gently held towards the middle so the graph stays together.
    .force('x', forceX(0).strength(0.05))
    .force('y', forceY(0).strength(0.05))
    .stop()
    .tick(FORCE_TICKS);

  const minX = Math.min(...nodes.map(({ x }) => x));
  const minY = Math.min(...nodes.map(({ y }) => y));
  if (!snap) {
    return new Map(nodes.map(({ id, x, y }) => [id, { column: x - minX, row: y - minY }]));
  }
  const taken = new Set<string>();
  const slots = new Map<string, Slot>();
  for (const node of [...nodes].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))) {
    const slot = nearestFree({ column: Math.round(node.x - minX), row: Math.round(node.y - minY) }, taken);
    taken.add(`${slot.column},${slot.row}`);
    slots.set(node.id, slot);
  }
  return normalize(slots);
};

/** The free slot nearest `slot`, searching outward ring by ring, columns before rows. */
const nearestFree = (slot: Slot, taken: ReadonlySet<string>): Slot => {
  for (let radius = 0; ; radius++) {
    const ring: Slot[] = [];
    for (let row = slot.row - radius; row <= slot.row + radius; row++) {
      for (let column = slot.column - radius; column <= slot.column + radius; column++) {
        if (Math.max(Math.abs(row - slot.row), Math.abs(column - slot.column)) === radius) {
          ring.push({ column, row });
        }
      }
    }
    ring.sort(
      (a, b) =>
        Math.abs(a.row - slot.row) - Math.abs(b.row - slot.row) ||
        Math.abs(a.column - slot.column) - Math.abs(b.column - slot.column) ||
        a.column - b.column,
    );
    const free = ring.find(({ column, row }) => row >= 0 && !taken.has(`${column},${row}`));
    if (free) {
      return free;
    }
  }
};

/** Empty columns and rows squeezed out, so the leftmost column and the top row are zero and none are skipped. */
const normalize = (slots: Map<string, Slot>): Map<string, Slot> => {
  const dense = (values: number[]) =>
    new Map([...new Set(values)].sort((a, b) => a - b).map((value, index) => [value, index]));
  const columns = dense([...slots.values()].map(({ column }) => column));
  const rows = dense([...slots.values()].map(({ row }) => row));
  return new Map(
    [...slots].map(([id, { column, row }]) => [id, { column: columns.get(column) ?? 0, row: rows.get(row) ?? 0 }]),
  );
};

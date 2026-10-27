//
// Copyright 2026 DXOS.org
//

//
// Grid placement for the semantic diagram: every node takes one cell of a regular lattice, and a
// scored search fills whatever the author left open. Groups are laid out first, each as a compact
// unit, then the units are seated around one another, and an annealing pass with a greedy polish
// refines the whole. The score is a cheap model of what the router will make of the placement —
// straight edges between neighbours, no crossings, no edge through a box, hubs with one neighbour
// per side, chains kept straight, flow in the stated direction — so thousands of states can be
// tried before the few best are routed for real (`semantic-engine.ts`).
//

import type * as Semantic from './semantic.ts';

export type Cell = { col: number; row: number };

export type PlaceNode = { id: string; group?: string; pin?: Cell };

export type PlaceRelation = {
  from: string;
  kind: Semantic.RelationKind;
  target: string;
  soft: boolean;
  /** Cost of breaking a soft relation, in place of the default. */
  weight?: number;
};

export type PlaceEdge = {
  from: string;
  to: string;
  sides?: { start?: readonly Semantic.Side[]; end?: readonly Semantic.Side[] };
  /** The target is an abstraction that reads best against the flow, above its subtypes. */
  upward?: boolean;
};

/** How a group may be shaped: at most `maxWidth` columns, and near-square when `compact`. */
export type GroupShape = { maxWidth?: number; compact?: boolean };

export type PlaceInput = {
  nodes: readonly PlaceNode[];
  /** Group ids in declaration order. */
  groups: readonly string[];
  /** Shape limits by group id. */
  shapes?: ReadonlyMap<string, GroupShape>;
  /** Preferred columns over rows of the whole placement. */
  aspect?: number;
  /** Node relations; `from` and `target` are node ids. */
  relations: readonly PlaceRelation[];
  /** Group relations; `from` and `target` are group ids. */
  groupRelations: readonly PlaceRelation[];
  edges: readonly PlaceEdge[];
  flow: Semantic.Flow;
  /** Box half-extent as a fraction of the cell pitch, for the edge-through-box test. */
  box?: { x: number; y: number };
};

export type PlaceOptions = {
  /** Independent searches from different random seeds (default 6). */
  restarts?: number;
  /** Starting placements to refine besides the greedy ones (e.g. a layered engine's). */
  seeds?: readonly Map<string, Cell>[];
  /** How many distinct placements to return, best first (default 3). */
  keep?: number;
};

export type Placed = { cells: Map<string, Cell>; cost: number };

/** Weights, in units where one bend costs 10. */
const WEIGHT = {
  bend: 10,
  length: 1,
  backward: 6,
  sideways: 1,
  crossing: 30,
  through: 25,
  hub: 4,
  chain: 3,
  hard: 10_000,
  soft: 15,
  near: 2,
  /** Per cell a compact group's width and height differ by beyond one. */
  square: 8,
  /** Per unit of log ratio the placement strays from the preferred aspect. */
  aspect: 12,
  extent: 1.5,
  slack: 3,
  infeasible: 100_000,
};

type Index = {
  count: number;
  ids: string[];
  group: Int32Array;
  pinned: Uint8Array;
  pinCol: Int32Array;
  pinRow: Int32Array;
  members: number[][];
  edges: {
    from: number;
    to: number;
    upward?: boolean;
    /**
     * The best template per displacement, which depends only on the signs of dx and dy: its bends
     * and the indices into `ALL_SIDES` of its sides, indexed by `(sign dx + 1) * 3 + sign dy + 1`.
     */
    bends: Float64Array;
    starts: Uint8Array;
    ends: Uint8Array;
  }[];
  relations: { from: number; kind: Semantic.RelationKind; target: number; soft: boolean; weight?: number }[];
  groupRelations: { from: number; kind: Semantic.RelationKind; target: number; soft: boolean }[];
  /** Neighbour lists without duplicates, for the hub and chain terms. */
  neighbours: number[][];
  /**
   * Per node, itself and every node placed relative to it by a hard relation, transitively: `X
   * below Y` makes X follow Y, so moving Y with its followers keeps their relations.
   */
  followers: number[][];
  inDegree: Int32Array;
  outDegree: Int32Array;
  flow: Semantic.Flow;
  box: { x: number; y: number };
  /** Shape per group index. */
  shapes: (GroupShape | undefined)[];
  /** Shape of the whole placement, for a group laid out on its own. */
  whole?: GroupShape;
  aspect?: number;
  /** Every node index, for the bounds of the whole placement. */
  all: number[];
  scratch: Scratch;
};

const indexOf = (input: PlaceInput): Index => {
  const ids = input.nodes.map((node) => node.id);
  const byId = new Map(ids.map((id, index) => [id, index]));
  const groupIndex = new Map(input.groups.map((id, index) => [id, index]));
  const count = ids.length;
  const group = new Int32Array(count).fill(-1);
  const pinned = new Uint8Array(count);
  const pinCol = new Int32Array(count);
  const pinRow = new Int32Array(count);
  const members: number[][] = input.groups.map(() => []);
  input.nodes.forEach((node, index) => {
    const at = node.group === undefined ? undefined : groupIndex.get(node.group);
    if (at !== undefined) {
      group[index] = at;
      members[at].push(index);
    }
    if (node.pin) {
      pinned[index] = 1;
      pinCol[index] = node.pin.col;
      pinRow[index] = node.pin.row;
    }
  });
  const edges = input.edges.flatMap((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    return from === undefined || to === undefined || from === to
      ? []
      : [{ from, to, upward: edge.upward, ...templatesOf(edge.sides?.start, edge.sides?.end) }];
  });
  const neighbours: Set<number>[] = ids.map(() => new Set());
  const inDegree = new Int32Array(count);
  const outDegree = new Int32Array(count);
  for (const edge of edges) {
    neighbours[edge.from].add(edge.to);
    neighbours[edge.to].add(edge.from);
    outDegree[edge.from]++;
    inDegree[edge.to]++;
  }
  const resolve = (relations: readonly PlaceRelation[], lookup: Map<string, number>) =>
    relations.flatMap((relation) => {
      const from = lookup.get(relation.from);
      const target = lookup.get(relation.target);
      return from === undefined || target === undefined || from === target
        ? []
        : [{ from, kind: relation.kind, target, soft: relation.soft, weight: relation.weight }];
    });
  const relations = resolve(input.relations, byId);
  const followers = Array.from({ length: count }, (_, node) => {
    const seen = new Set([node]);
    const queue = [node];
    while (queue.length > 0) {
      const leader = queue.shift() ?? node;
      for (const relation of relations) {
        if (!relation.soft && relation.target === leader && !seen.has(relation.from)) {
          seen.add(relation.from);
          queue.push(relation.from);
        }
      }
    }
    return [...seen];
  });
  return {
    count,
    ids,
    group,
    followers,
    pinned,
    pinCol,
    pinRow,
    members,
    edges,
    relations,
    groupRelations: resolve(input.groupRelations, groupIndex),
    neighbours: neighbours.map((set) => [...set]),
    inDegree,
    outDegree,
    flow: input.flow,
    box: input.box ?? { x: 0.25, y: 0.22 },
    shapes: input.groups.map((group) => input.shapes?.get(group)),
    all: ids.map((_, node) => node),
    scratch: scratchFor(edges.length, input.groups.length),
    ...(input.aspect === undefined ? {} : { aspect: input.aspect }),
  };
};

/** Cost of a group's (or the whole placement's) shape against its limits. */
const shapeCost = (shape: GroupShape | undefined, box: Bounds, hard: number): number => {
  if (!shape) {
    return 0;
  }
  const width = box.maxCol - box.minCol + 1;
  const height = box.maxRow - box.minRow + 1;
  return (
    (shape.maxWidth !== undefined && width > shape.maxWidth ? hard * (width - shape.maxWidth) : 0) +
    (shape.compact ? WEIGHT.square * Math.max(0, Math.abs(width - height) - 1) : 0)
  );
};

//
// Geometry of routes in cell space.
//

type Vector = { x: number; y: number };

const OUT: Record<Semantic.Side, Vector> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Direction of travel when arriving at a side: into the box. */
const IN: Record<Semantic.Side, Vector> = {
  top: { x: 0, y: 1 },
  bottom: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

const ALL_SIDES: readonly Semantic.Side[] = ['top', 'bottom', 'left', 'right'];

/**
 * Fewest bends an orthogonal route takes from side `start` of a box to side `end` of another box
 * displaced by (dx, dy) cells, ignoring every other box: the template the router will try first.
 */
export const templateBends = (dx: number, dy: number, start: Semantic.Side, end: Semantic.Side): number => {
  const out = OUT[start];
  const into = IN[end];
  const along = dx * out.x + dy * out.y;
  if (out.x === into.x && out.y === into.y) {
    const across = dx * out.y + dy * out.x;
    return along > 0 ? (across === 0 ? 0 : 2) : 4;
  }
  if (out.x === -into.x && out.y === -into.y) {
    const across = dx * out.y + dy * out.x;
    return across === 0 ? 4 : 2;
  }
  const ahead = dx * into.x + dy * into.y;
  return along > 0 && ahead > 0 ? 1 : 3;
};

/** The best template for each sign of displacement, first in side order among equals. */
const templatesOf = (
  start: readonly Semantic.Side[] | undefined,
  end: readonly Semantic.Side[] | undefined,
): { bends: Float64Array; starts: Uint8Array; ends: Uint8Array } => {
  const bends = new Float64Array(9);
  const starts = new Uint8Array(9);
  const ends = new Uint8Array(9);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const template = (dx + 1) * 3 + dy + 1;
      let best = Infinity;
      let pair: [Semantic.Side, Semantic.Side] = ['bottom', 'top'];
      for (const startSide of start ?? ALL_SIDES) {
        for (const endSide of end ?? ALL_SIDES) {
          const value = templateBends(dx, dy, startSide, endSide);
          if (value < best) {
            best = value;
            pair = [startSide, endSide];
          }
        }
      }
      bends[template] = best;
      starts[template] = ALL_SIDES.indexOf(pair[0]);
      ends[template] = ALL_SIDES.indexOf(pair[1]);
    }
  }
  return { bends, starts, ends };
};

/** A random source reproducible from a seed, so a document always lays out the same way. */
const random = (seed: number) => {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
};

/** Cell coordinates per node index; NaN marks a node not yet placed. */
type State = { col: Float64Array; row: Float64Array };

// Cells are whole numbers; near the origin one packs into a small integer, which a Map hashes fastest,
// and anything farther into a disjoint range of exact larger numbers.
const NEAR = 2 ** 14;
const FAR_OFFSET = 2 ** 20;
const keyOf = (col: number, row: number) =>
  col > -NEAR && col < NEAR && row > -NEAR && row < NEAR
    ? (col + NEAR) * 2 * NEAR + (row + NEAR)
    : 2 ** 31 + (col + FAR_OFFSET) * 2 * FAR_OFFSET + (row + FAR_OFFSET);

const clone = (state: State): State => ({ col: Float64Array.from(state.col), row: Float64Array.from(state.row) });

type Bounds = { minCol: number; maxCol: number; minRow: number; maxRow: number };

const boundsOf = (state: State, nodes: readonly number[]): Bounds | undefined => {
  let minCol = Infinity;
  let maxCol = -Infinity;
  let minRow = Infinity;
  let maxRow = -Infinity;
  let any = false;
  for (const node of nodes) {
    const col = state.col[node];
    if (Number.isNaN(col)) {
      continue;
    }
    const row = state.row[node];
    any = true;
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
  }
  return any ? { minCol, maxCol, minRow, maxRow } : undefined;
};

const holds = (kind: Semantic.RelationKind, from: Cell, target: Cell): boolean => {
  switch (kind) {
    case 'right-of':
      return from.row === target.row && from.col > target.col;
    case 'left-of':
      return from.row === target.row && from.col < target.col;
    case 'below':
      return from.col === target.col && from.row > target.row;
    case 'above':
      return from.col === target.col && from.row < target.row;
    case 'same-row':
      return from.row === target.row;
    case 'same-col':
      return from.col === target.col;
  }
};

const holdsBetween = (kind: Semantic.RelationKind, from: Bounds, target: Bounds): boolean => {
  switch (kind) {
    case 'right-of':
      return from.minCol > target.maxCol;
    case 'left-of':
      return from.maxCol < target.minCol;
    case 'below':
      return from.minRow > target.maxRow;
    case 'above':
      return from.maxRow < target.minRow;
    case 'same-row':
      return from.minRow <= target.maxRow && target.minRow <= from.maxRow;
    case 'same-col':
      return from.minCol <= target.maxCol && target.minCol <= from.maxCol;
  }
};

/** Whether the segments (a1x, a1y)–(a2x, a2y) and (b1x, b1y)–(b2x, b2y) cross at a point interior to both. */
const segmentsCross = (
  a1x: number,
  a1y: number,
  a2x: number,
  a2y: number,
  b1x: number,
  b1y: number,
  b2x: number,
  b2y: number,
): boolean => {
  const d1 = (a2x - a1x) * (b1y - a1y) - (a2y - a1y) * (b1x - a1x);
  const d2 = (a2x - a1x) * (b2y - a1y) - (a2y - a1y) * (b2x - a1x);
  if (!((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))) {
    return false;
  }
  const d3 = (b2x - b1x) * (a1y - b1y) - (b2y - b1y) * (a1x - b1x);
  const d4 = (b2x - b1x) * (a2y - b1y) - (b2y - b1y) * (a2x - b1x);
  return (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
};

/** Whether the segment (ax, ay)–(bx, by) passes through the box centred at (cx, cy) with half-extents (hx, hy). */
const segmentHitsBox = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  hx: number,
  hy: number,
): boolean => {
  let enter = 0;
  let exit = 1;
  const dx = bx - ax;
  const dy = by - ay;
  // Liang–Barsky clipping against the four slabs, in the order left, right, top, bottom.
  for (let slab = 0; slab < 4; slab++) {
    const p = slab === 0 ? -dx : slab === 1 ? dx : slab === 2 ? -dy : dy;
    const q = slab === 0 ? ax - (cx - hx) : slab === 1 ? cx + hx - ax : slab === 2 ? ay - (cy - hy) : cy + hy - ay;
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }
    const ratio = q / p;
    if (p < 0) {
      enter = Math.max(enter, ratio);
    } else {
      exit = Math.min(exit, ratio);
    }
  }
  return enter < exit;
};

/** Floats per template polyline: at most four points. */
const LINE_STRIDE = 8;

/**
 * Writes the route a template draws, in cell space, into `points` at `offset` and returns its point
 * count: straight, L by its start side, Z through the middle, or U beyond both.
 */
const shapeInto = (
  points: Float64Array,
  offset: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  bends: number,
  start: Semantic.Side,
  end: Semantic.Side,
): number => {
  const alongX = start === 'left' || start === 'right';
  points[offset] = fromX;
  points[offset + 1] = fromY;
  if (bends === 1) {
    points[offset + 2] = alongX ? toX : fromX;
    points[offset + 3] = alongX ? fromY : toY;
    points[offset + 4] = toX;
    points[offset + 5] = toY;
    return 3;
  }
  if (bends === 2) {
    const out = OUT[start];
    const into = IN[end];
    const opposed = out.x === -into.x && out.y === -into.y;
    const middle = alongX
      ? opposed
        ? (out.x > 0 ? Math.max(fromX, toX) : Math.min(fromX, toX)) + out.x * 0.5
        : (fromX + toX) / 2
      : opposed
        ? (out.y > 0 ? Math.max(fromY, toY) : Math.min(fromY, toY)) + out.y * 0.5
        : (fromY + toY) / 2;
    points[offset + 2] = alongX ? middle : fromX;
    points[offset + 3] = alongX ? fromY : middle;
    points[offset + 4] = alongX ? middle : toX;
    points[offset + 5] = alongX ? toY : middle;
    points[offset + 6] = toX;
    points[offset + 7] = toY;
    return 4;
  }
  points[offset + 2] = toX;
  points[offset + 3] = toY;
  return 2;
};

/** Whether two template polylines, as written by {@link shapeInto}, cross. */
const polylinesCross = (points: Float64Array, left: number, leftCount: number, right: number, rightCount: number) => {
  for (let first = 1; first < leftCount; first++) {
    const a = left + first * 2;
    for (let second = 1; second < rightCount; second++) {
      const b = right + second * 2;
      if (
        segmentsCross(
          points[a - 2],
          points[a - 1],
          points[a],
          points[a + 1],
          points[b - 2],
          points[b - 1],
          points[b],
          points[b + 1],
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

/** Per-call working memory for {@link score}, sized to an index so scoring allocates nothing. */
type Scratch = {
  /** Per drawn line: its edge's endpoints, point count, whether it bends, and its bounding box. */
  lineFrom: Int32Array;
  lineTo: Int32Array;
  lineCount: Uint8Array;
  lineBent: Uint8Array;
  lineBox: Float64Array;
  points: Float64Array;
  sides: Int32Array;
  /** Per group: its bounds as min col, max col, min row, max row, and whether it has any placed member. */
  bounds: Float64Array;
  hasBounds: Uint8Array;
};

const scratchFor = (edges: number, groups: number): Scratch => ({
  lineFrom: new Int32Array(edges),
  lineTo: new Int32Array(edges),
  lineCount: new Uint8Array(edges),
  lineBent: new Uint8Array(edges),
  lineBox: new Float64Array(edges * 4),
  points: new Float64Array(edges * LINE_STRIDE),
  sides: new Int32Array(4),
  bounds: new Float64Array(groups * 4),
  hasBounds: new Uint8Array(groups),
});

/** Whether a relation of `kind` holds between two cells, given as coordinates. */
const holdsAt = (kind: Semantic.RelationKind, fromCol: number, fromRow: number, toCol: number, toRow: number) => {
  switch (kind) {
    case 'right-of':
      return fromRow === toRow && fromCol > toCol;
    case 'left-of':
      return fromRow === toRow && fromCol < toCol;
    case 'below':
      return fromCol === toCol && fromRow > toRow;
    case 'above':
      return fromCol === toCol && fromRow < toRow;
    case 'same-row':
      return fromRow === toRow;
    case 'same-col':
      return fromCol === toCol;
  }
};

/** Cost of a shape against its limits, for bounds given as coordinates. */
const shapeCostOf = (
  shape: GroupShape | undefined,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number,
  hard: number,
): number => (shape ? shapeCost(shape, { minCol, maxCol, minRow, maxRow }, hard) : 0);

/**
 * The placement score: lower is better. Terms involving a node not yet placed are skipped, so the
 * greedy seating can score a partial state. It runs for every state the search tries, so it works
 * in the index's scratch arrays and sums its terms in a fixed order, which keeps a placement
 * reproducible to the last bit.
 */
const score = (index: Index, state: State, occupied: Map<number, number>, strictness = 1): number => {
  // Annealing starts with relations and group bounds as strong preferences and tightens them into
  // rules, so an early state that breaks one is not a wall the search can never climb over.
  const hard = WEIGHT.soft * 3 + (WEIGHT.hard - WEIGHT.soft * 3) * strictness;
  const infeasible = WEIGHT.soft * 30 + (WEIGHT.infeasible - WEIGHT.soft * 30) * strictness;
  const { col, row } = state;
  const { scratch } = index;
  const { lineFrom, lineTo, lineCount, lineBent, lineBox, points } = scratch;
  let total = 0;

  // Edges: the bends of the best template, blocked straight runs, length and flow.
  // Each edge as the polyline of its best template, in cell space, for the crossing and through-box terms.
  let lines = 0;
  for (const edge of index.edges) {
    const fromCol = col[edge.from];
    const toCol = col[edge.to];
    if (Number.isNaN(fromCol) || Number.isNaN(toCol)) {
      continue;
    }
    const fromRow = row[edge.from];
    const toRow = row[edge.to];
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const template = (Math.sign(dx) + 1) * 3 + Math.sign(dy) + 1;
    const bends = edge.bends[template];
    const blocked =
      (bends === 0 && blockedStraight(fromCol, fromRow, dx, dy, occupied)) ||
      (bends === 1 && blockedCorners(fromCol, fromRow, dx, dy, occupied));
    total += WEIGHT.bend * (blocked ? 2 : bends) + WEIGHT.length * (Math.abs(dx) + Math.abs(dy));
    const along = index.flow === 'down' ? dy : index.flow === 'up' ? -dy : index.flow === 'right' ? dx : -dx;
    const forward = edge.upward ? -along : along;
    total += forward < 0 ? WEIGHT.backward : forward === 0 ? WEIGHT.sideways : 0;
    lineFrom[lines] = edge.from;
    lineTo[lines] = edge.to;
    lineBent[lines] = bends > 0 ? 1 : 0;
    const count = blocked
      ? 0
      : shapeInto(
          points,
          lines * LINE_STRIDE,
          fromCol,
          fromRow,
          toCol,
          toRow,
          bends,
          ALL_SIDES[edge.starts[template]],
          ALL_SIDES[edge.ends[template]],
        );
    lineCount[lines] = count;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let point = 0; point < count; point++) {
      const x = points[lines * LINE_STRIDE + point * 2];
      const y = points[lines * LINE_STRIDE + point * 2 + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    lineBox[lines * 4] = minX;
    lineBox[lines * 4 + 1] = maxX;
    lineBox[lines * 4 + 2] = minY;
    lineBox[lines * 4 + 3] = maxY;
    lines++;
  }

  const half = index.box;
  for (let first = 0; first < lines; first++) {
    const leftFrom = lineFrom[first];
    const leftTo = lineTo[first];
    const leftCount = lineCount[first];
    const leftMinX = lineBox[first * 4];
    const leftMaxX = lineBox[first * 4 + 1];
    const leftMinY = lineBox[first * 4 + 2];
    const leftMaxY = lineBox[first * 4 + 3];
    for (let second = first + 1; second < lines; second++) {
      const rightFrom = lineFrom[second];
      const rightTo = lineTo[second];
      if (leftFrom === rightFrom || leftFrom === rightTo || leftTo === rightFrom || leftTo === rightTo) {
        continue;
      }
      // A proper crossing lies inside both bounding boxes, so disjoint boxes cannot cross.
      if (
        lineBox[second * 4] > leftMaxX ||
        lineBox[second * 4 + 1] < leftMinX ||
        lineBox[second * 4 + 2] > leftMaxY ||
        lineBox[second * 4 + 3] < leftMinY
      ) {
        continue;
      }
      if (polylinesCross(points, first * LINE_STRIDE, leftCount, second * LINE_STRIDE, lineCount[second])) {
        total += WEIGHT.crossing;
      }
    }
    // A straight run is already charged when blocked; a bent one may still cut a box.
    if (lineBent[first] === 1) {
      for (let node = 0; node < index.count; node++) {
        const centreX = col[node];
        if (node === leftFrom || node === leftTo || Number.isNaN(centreX)) {
          continue;
        }
        const centreY = row[node];
        // A box clear of the line's bounding box cannot be cut by it.
        if (
          centreX + half.x < leftMinX ||
          centreX - half.x > leftMaxX ||
          centreY + half.y < leftMinY ||
          centreY - half.y > leftMaxY
        ) {
          continue;
        }
        const base = first * LINE_STRIDE;
        for (let point = 1; point < leftCount; point++) {
          const at = base + point * 2;
          if (
            segmentHitsBox(points[at - 2], points[at - 1], points[at], points[at + 1], centreX, centreY, half.x, half.y)
          ) {
            total += WEIGHT.through;
            break;
          }
        }
      }
    }
  }

  // Hubs: one neighbour per side reads best; chains: keep a pass-through node in line.
  const sides = scratch.sides;
  for (let node = 0; node < index.count; node++) {
    const nodeCol = col[node];
    if (Number.isNaN(nodeCol)) {
      continue;
    }
    const nodeRow = row[node];
    const neighbours = index.neighbours[node];
    let around = 0;
    let firstAround = -1;
    let secondAround = -1;
    sides.fill(0);
    for (const other of neighbours) {
      if (Number.isNaN(col[other])) {
        continue;
      }
      if (around === 0) {
        firstAround = other;
      } else if (around === 1) {
        secondAround = other;
      }
      around++;
      const dx = col[other] - nodeCol;
      const dy = row[other] - nodeRow;
      sides[Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 1) : dy > 0 ? 2 : 3]++;
    }
    if (around >= 3) {
      let pairs = 0;
      for (let side = 0; side < 4; side++) {
        pairs += (sides[side] * (sides[side] - 1)) / 2;
      }
      total += WEIGHT.hub * pairs;
    }
    if (around === 2 && index.inDegree[node] === 1 && index.outDegree[node] === 1) {
      const inLine =
        (col[firstAround] === nodeCol && col[secondAround] === nodeCol) ||
        (row[firstAround] === nodeRow && row[secondAround] === nodeRow);
      if (!inLine) {
        total += WEIGHT.chain;
      }
    }
  }

  // Relations.
  for (const relation of index.relations) {
    const fromCol = col[relation.from];
    const targetCol = col[relation.target];
    if (Number.isNaN(fromCol) || Number.isNaN(targetCol)) {
      continue;
    }
    const fromRow = row[relation.from];
    const targetRow = row[relation.target];
    if (holdsAt(relation.kind, fromCol, fromRow, targetCol, targetRow)) {
      total +=
        WEIGHT.near *
        (relation.kind === 'right-of' || relation.kind === 'left-of'
          ? Math.abs(fromCol - targetCol) - 1
          : relation.kind === 'above' || relation.kind === 'below'
            ? Math.abs(fromRow - targetRow) - 1
            : 0);
    } else {
      total += relation.soft ? (relation.weight ?? WEIGHT.soft) : hard;
    }
  }

  // Groups: exclusive, disjoint, compact, and related as stated.
  const { bounds, hasBounds } = scratch;
  const groups = index.members.length;
  for (let group = 0; group < groups; group++) {
    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    let placedMembers = 0;
    for (const member of index.members[group]) {
      const memberCol = col[member];
      if (Number.isNaN(memberCol)) {
        continue;
      }
      const memberRow = row[member];
      placedMembers++;
      minCol = Math.min(minCol, memberCol);
      maxCol = Math.max(maxCol, memberCol);
      minRow = Math.min(minRow, memberRow);
      maxRow = Math.max(maxRow, memberRow);
    }
    hasBounds[group] = placedMembers > 0 ? 1 : 0;
    bounds[group * 4] = minCol;
    bounds[group * 4 + 1] = maxCol;
    bounds[group * 4 + 2] = minRow;
    bounds[group * 4 + 3] = maxRow;
  }
  for (let group = 0; group < groups; group++) {
    if (hasBounds[group] === 0) {
      continue;
    }
    const minCol = bounds[group * 4];
    const maxCol = bounds[group * 4 + 1];
    const minRow = bounds[group * 4 + 2];
    const maxRow = bounds[group * 4 + 3];
    total += shapeCostOf(index.shapes[group], minCol, maxCol, minRow, maxRow, hard);
    for (let cellRow = minRow; cellRow <= maxRow; cellRow++) {
      for (let cellCol = minCol; cellCol <= maxCol; cellCol++) {
        const node = occupied.get(keyOf(cellCol, cellRow));
        if (node !== undefined && index.group[node] !== group) {
          total += infeasible;
        }
      }
    }
    let placedMembers = 0;
    for (const member of index.members[group]) {
      if (!Number.isNaN(col[member])) {
        placedMembers++;
      }
    }
    const area = (maxCol - minCol + 1) * (maxRow - minRow + 1);
    total += WEIGHT.slack * (area - placedMembers);
    for (let other = group + 1; other < groups; other++) {
      if (
        hasBounds[other] === 1 &&
        minCol <= bounds[other * 4 + 1] &&
        bounds[other * 4] <= maxCol &&
        minRow <= bounds[other * 4 + 3] &&
        bounds[other * 4 + 2] <= maxRow
      ) {
        total += infeasible;
      }
    }
  }
  for (const relation of index.groupRelations) {
    if (hasBounds[relation.from] === 0 || hasBounds[relation.target] === 0) {
      continue;
    }
    const from = {
      minCol: bounds[relation.from * 4],
      maxCol: bounds[relation.from * 4 + 1],
      minRow: bounds[relation.from * 4 + 2],
      maxRow: bounds[relation.from * 4 + 3],
    };
    const target = {
      minCol: bounds[relation.target * 4],
      maxCol: bounds[relation.target * 4 + 1],
      minRow: bounds[relation.target * 4 + 2],
      maxRow: bounds[relation.target * 4 + 3],
    };
    if (!holdsBetween(relation.kind, from, target)) {
      total += relation.soft ? WEIGHT.soft : hard;
      continue;
    }
    const gap =
      relation.kind === 'right-of'
        ? from.minCol - target.maxCol - 1
        : relation.kind === 'left-of'
          ? target.minCol - from.maxCol - 1
          : relation.kind === 'below'
            ? from.minRow - target.maxRow - 1
            : relation.kind === 'above'
              ? target.minRow - from.maxRow - 1
              : 0;
    total += WEIGHT.near * gap;
    // Beside means overlapping across the relation, not merely past it.
    const besideX = relation.kind === 'right-of' || relation.kind === 'left-of';
    const besideY = relation.kind === 'above' || relation.kind === 'below';
    if (
      (besideX && (from.minRow > target.maxRow || target.minRow > from.maxRow)) ||
      (besideY && (from.minCol > target.maxCol || target.minCol > from.maxCol))
    ) {
      total += WEIGHT.soft;
    }
  }

  // Pins hold by construction; compactness breaks the remaining ties.
  const all = boundsOf(state, index.all);
  if (all) {
    total += WEIGHT.extent * (all.maxCol - all.minCol + 1 + (all.maxRow - all.minRow + 1));
    total += shapeCost(index.whole, all, hard);
    if (index.aspect !== undefined) {
      total +=
        WEIGHT.aspect *
        Math.abs(Math.log((all.maxCol - all.minCol + 1) / (all.maxRow - all.minRow + 1) / index.aspect));
    }
  }
  return total;
};

const blockedStraight = (col: number, row: number, dx: number, dy: number, occupied: Map<number, number>): boolean => {
  const steps = Math.abs(dx) + Math.abs(dy);
  for (let step = 1; step < steps; step++) {
    if (occupied.has(keyOf(col + Math.sign(dx) * step, row + Math.sign(dy) * step))) {
      return true;
    }
  }
  return false;
};

/** Whether both L-shaped routes run into a box: along the source row then the target column, or the reverse. */
const blockedCorners = (col: number, row: number, dx: number, dy: number, occupied: Map<number, number>): boolean => {
  const clear = (horizontalFirst: boolean) => {
    const cornerCol = horizontalFirst ? col + dx : col;
    const cornerRow = horizontalFirst ? row : row + dy;
    if (occupied.has(keyOf(cornerCol, cornerRow))) {
      return false;
    }
    return (
      !blockedStraight(col, row, cornerCol - col, cornerRow - row, occupied) &&
      !blockedStraight(cornerCol, cornerRow, col + dx - cornerCol, row + dy - cornerRow, occupied)
    );
  };
  return !clear(true) && !clear(false);
};

/** The search over one index: greedy seating, annealing, then a greedy polish. */
class Search {
  readonly #index: Index;
  readonly #random: () => number;
  #state: State;
  readonly #occupied = new Map<number, number>();
  #strictness = 1;

  constructor(index: Index, seed: number, start?: State) {
    this.#index = index;
    this.#random = random(seed);
    this.#state = start
      ? clone(start)
      : { col: new Float64Array(index.count).fill(NaN), row: new Float64Array(index.count).fill(NaN) };
    for (let node = 0; node < index.count; node++) {
      if (!Number.isNaN(this.#state.col[node])) {
        this.#occupied.set(keyOf(this.#state.col[node], this.#state.row[node]), node);
      }
    }
  }

  get state(): State {
    return this.#state;
  }

  cost(): number {
    return score(this.#index, this.#state, this.#occupied, this.#strictness);
  }

  #set(node: number, col: number, row: number) {
    const state = this.#state;
    if (!Number.isNaN(state.col[node]) && this.#occupied.get(keyOf(state.col[node], state.row[node])) === node) {
      this.#occupied.delete(keyOf(state.col[node], state.row[node]));
    }
    state.col[node] = col;
    state.row[node] = row;
    if (!Number.isNaN(col)) {
      this.#occupied.set(keyOf(col, row), node);
    }
  }

  /** Moves several nodes at once; returns an undo, or undefined when two would share a cell. */
  #moveAll(moves: readonly { node: number; col: number; row: number }[]): (() => void) | undefined {
    // Moves are a handful of nodes, so linear scans beat building sets for every proposal.
    for (let position = 0; position < moves.length; position++) {
      const move = moves[position];
      const key = keyOf(move.col, move.row);
      const holder = this.#occupied.get(key);
      if (holder !== undefined && !moves.some((other) => other.node === holder)) {
        return undefined;
      }
      for (let earlier = 0; earlier < position; earlier++) {
        // `Object.is` so two unplaced targets collide, as equal set keys would.
        if (Object.is(keyOf(moves[earlier].col, moves[earlier].row), key)) {
          return undefined;
        }
      }
    }
    const previous = moves.map(({ node }) => ({ node, col: this.#state.col[node], row: this.#state.row[node] }));
    for (const { node } of moves) {
      this.#set(node, NaN, NaN);
    }
    for (const move of moves) {
      this.#set(move.node, move.col, move.row);
    }
    return () => {
      for (const { node } of moves) {
        this.#set(node, NaN, NaN);
      }
      for (const entry of previous) {
        this.#set(entry.node, entry.col, entry.row);
      }
    };
  }

  #free(node: number) {
    return !this.#index.pinned[node];
  }

  /** Seats units one at a time, each where the partial score is lowest. */
  seat(units: readonly { nodes: readonly number[]; local: readonly Cell[]; anchored: boolean }[]) {
    const placedNodes: number[] = [];
    const order = this.#unitOrder(units);
    for (const unit of order) {
      if (unit.anchored) {
        unit.nodes.forEach((node, position) => this.#set(node, unit.local[position].col, unit.local[position].row));
        placedNodes.push(...unit.nodes);
        continue;
      }
      const width = Math.max(...unit.local.map((cell) => cell.col)) + 1;
      const height = Math.max(...unit.local.map((cell) => cell.row)) + 1;
      const around = boundsOf(this.#state, placedNodes) ?? { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
      // The unit's own layout and its mirror images: a relation to a node outside it may need one.
      const variants = [0, 1, 2, 3].map((flip) =>
        unit.local.map((cell) => ({
          col: flip & 1 ? width - 1 - cell.col : cell.col,
          row: flip & 2 ? height - 1 - cell.row : cell.row,
        })),
      );
      let best: { cost: number; col: number; row: number; local: readonly Cell[] } | undefined;
      for (const local of unit.nodes.length > 1 ? variants : [unit.local]) {
        for (let row = around.minRow - height - 1; row <= around.maxRow + 1; row++) {
          for (let col = around.minCol - width - 1; col <= around.maxCol + 1; col++) {
            const undo = this.#moveAll(
              unit.nodes.map((node, position) => ({
                node,
                col: col + local[position].col,
                row: row + local[position].row,
              })),
            );
            if (!undo) {
              continue;
            }
            const cost = this.cost() + this.#random() * 1e-3;
            if (!best || cost < best.cost) {
              best = { cost, col, row, local };
            }
            undo();
          }
        }
      }
      const seat = best ?? { col: around.maxCol + 2, row: around.minRow, local: unit.local };
      unit.nodes.forEach((node, position) =>
        this.#set(node, seat.col + seat.local[position].col, seat.row + seat.local[position].row),
      );
      placedNodes.push(...unit.nodes);
    }
  }

  /** Anchored units first, then outward from the best connected by connections to what is placed. */
  #unitOrder<Unit extends { nodes: readonly number[]; anchored: boolean }>(units: readonly Unit[]): Unit[] {
    const index = this.#index;
    const unitOf = new Map<number, number>();
    units.forEach((unit, position) => unit.nodes.forEach((node) => unitOf.set(node, position)));
    const weight = (position: number, among: Set<number>) =>
      index.edges.filter((edge) => {
        const [from, to] = [unitOf.get(edge.from), unitOf.get(edge.to)];
        return (
          (from === position && to !== undefined && among.has(to)) ||
          (to === position && from !== undefined && among.has(from))
        );
      }).length;
    const all = new Set(units.map((_, position) => position));
    const done = new Set<number>();
    const order: Unit[] = [];
    units.forEach((unit, position) => {
      if (unit.anchored) {
        done.add(position);
        order.push(unit);
      }
    });
    while (done.size < units.length) {
      let best = -1;
      let bestScore = -Infinity;
      for (const position of all) {
        if (done.has(position)) {
          continue;
        }
        // Connections to what is placed dominate; total degree and size seed the first pick.
        const value =
          weight(position, done) * 1000 +
          weight(position, all) * 10 +
          units[position].nodes.length +
          this.#random() * 1e-3;
        if (value > bestScore) {
          bestScore = value;
          best = position;
        }
      }
      done.add(best);
      order.push(units[best]);
    }
    return order;
  }

  /** Moves a node with its followers by a delta. */
  #follow(node: number, dx: number, dy: number): (() => void) | undefined {
    const moving = this.#index.followers[node];
    if (moving.some((member) => !this.#free(member))) {
      return undefined;
    }
    return this.#moveAll(
      moving.map((member) => ({ node: member, col: this.#state.col[member] + dx, row: this.#state.row[member] + dy })),
    );
  }

  /**
   * Moves the subject of a broken hard relation, with its followers, to the nearest cell that
   * satisfies it; returns the undo, or undefined when nothing is broken or no cell is free.
   */
  repair(): (() => void) | undefined {
    const { col, row } = this.#state;
    const broken = this.#index.relations.filter(
      (relation) =>
        !relation.soft &&
        !holds(
          relation.kind,
          { col: col[relation.from], row: row[relation.from] },
          { col: col[relation.target], row: row[relation.target] },
        ),
    );
    if (broken.length === 0) {
      return undefined;
    }
    const relation = broken[Math.floor(this.#random() * broken.length)];
    if (this.#index.followers[relation.from].includes(relation.target)) {
      return undefined;
    }
    const target = { col: col[relation.target], row: row[relation.target] };
    for (let distance = 1; distance <= 3; distance++) {
      const wanted =
        relation.kind === 'right-of'
          ? { col: target.col + distance, row: target.row }
          : relation.kind === 'left-of'
            ? { col: target.col - distance, row: target.row }
            : relation.kind === 'below'
              ? { col: target.col, row: target.row + distance }
              : relation.kind === 'above'
                ? { col: target.col, row: target.row - distance }
                : relation.kind === 'same-row'
                  ? { col: col[relation.from], row: target.row }
                  : { col: target.col, row: row[relation.from] };
      const undo = this.#follow(relation.from, wanted.col - col[relation.from], wanted.row - row[relation.from]);
      if (undo) {
        return undo;
      }
    }
    return undefined;
  }

  /** One random move; returns its undo, or undefined when the move was impossible. */
  #propose(window: Bounds): (() => void) | undefined {
    const index = this.#index;
    const pick = this.#random();
    const node = Math.floor(this.#random() * index.count);
    const cellIn = () => ({
      col: window.minCol + Math.floor(this.#random() * (window.maxCol - window.minCol + 1)),
      row: window.minRow + Math.floor(this.#random() * (window.maxRow - window.minRow + 1)),
    });
    if (pick >= 0.4 && pick < 0.55) {
      const direction = Math.floor(this.#random() * 4);
      return this.repair() ?? this.#follow(node, [1, -1, 0, 0][direction], [0, 0, 1, -1][direction]);
    }
    if (pick < 0.4) {
      if (!this.#free(node)) {
        return undefined;
      }
      const target = cellIn();
      const holder = this.#occupied.get(keyOf(target.col, target.row));
      if (holder !== undefined) {
        if (!this.#free(holder) || index.group[holder] !== index.group[node]) {
          return undefined;
        }
        return this.#moveAll([
          { node, ...target },
          { node: holder, col: this.#state.col[node], row: this.#state.row[node] },
        ]);
      }
      return this.#moveAll([{ node, ...target }]);
    }
    const group = index.group[node];
    if (group < 0 || index.members[group].some((member) => !this.#free(member))) {
      // A free-standing node: nudge it by one cell.
      if (!this.#free(node)) {
        return undefined;
      }
      const direction = Math.floor(this.#random() * 4);
      return this.#moveAll([
        {
          node,
          col: this.#state.col[node] + [1, -1, 0, 0][direction],
          row: this.#state.row[node] + [0, 0, 1, -1][direction],
        },
      ]);
    }
    const members = index.members[group];
    const box = boundsOf(this.#state, members);
    if (!box) {
      return undefined;
    }
    if (pick < 0.8) {
      // Translate the whole group.
      const target = cellIn();
      const dx = pick < 0.65 ? [1, -1, 0, 0][Math.floor(this.#random() * 4)] : target.col - box.minCol;
      const dy = pick < 0.65 ? (dx === 0 ? (this.#random() < 0.5 ? 1 : -1) : 0) : target.row - box.minRow;
      return this.#moveAll(
        members.map((member) => ({
          node: member,
          col: this.#state.col[member] + dx,
          row: this.#state.row[member] + dy,
        })),
      );
    }
    // Mirror the group within its box.
    const horizontal = this.#random() < 0.5;
    return this.#moveAll(
      members.map((member) => ({
        node: member,
        col: horizontal ? box.minCol + box.maxCol - this.#state.col[member] : this.#state.col[member],
        row: horizontal ? this.#state.row[member] : box.minRow + box.maxRow - this.#state.row[member],
      })),
    );
  }

  #window(): Bounds {
    const all = boundsOf(this.#state, this.#index.all) ?? { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
    return { minCol: all.minCol - 1, maxCol: all.maxCol + 1, minRow: all.minRow - 1, maxRow: all.maxRow + 1 };
  }

  anneal(iterations: number, hot: number, cold: number) {
    let current = this.cost();
    let best = { cost: current, state: clone(this.#state) };
    const ramp = iterations * 0.7;
    for (let step = 0; step < iterations; step++) {
      const temperature = hot * Math.pow(cold / hot, step / iterations);
      const strictness = Math.min(1, (step / ramp) ** 2);
      if (strictness !== this.#strictness && (step % 64 === 0 || strictness === 1)) {
        this.#strictness = strictness;
        current = this.cost();
      }
      const undo = this.#propose(this.#window());
      if (!undo) {
        continue;
      }
      const next = this.cost();
      if (next <= current || this.#random() < Math.exp((current - next) / temperature)) {
        current = next;
        if (this.#strictness === 1 && current < best.cost) {
          best = { cost: current, state: clone(this.#state) };
        }
      } else {
        undo();
      }
    }
    this.#strictness = 1;
    if (this.cost() > best.cost) {
      this.#restore(best.state);
    }
  }

  /** Steepest descent over single moves and swaps until nothing improves. */
  polish(passes = 4) {
    const index = this.#index;
    let current = this.cost();
    for (let attempt = 0; attempt < index.relations.length * 4; attempt++) {
      const undo = this.repair();
      if (!undo) {
        continue;
      }
      const next = this.cost();
      if (next < current) {
        current = next;
      } else {
        undo();
      }
    }
    for (let pass = 0; pass < passes; pass++) {
      let improved = false;
      const window = this.#window();
      for (let node = 0; node < index.count; node++) {
        if (!this.#free(node)) {
          continue;
        }
        let best: { cost: number; col: number; row: number } | undefined;
        for (let row = window.minRow; row <= window.maxRow; row++) {
          for (let col = window.minCol; col <= window.maxCol; col++) {
            const holder = this.#occupied.get(keyOf(col, row));
            if (
              holder === node ||
              (holder !== undefined && (!this.#free(holder) || index.group[holder] !== index.group[node]))
            ) {
              continue;
            }
            const origin = { col: this.#state.col[node], row: this.#state.row[node] };
            const undo = this.#moveAll(
              holder === undefined
                ? [{ node, col, row }]
                : [
                    { node, col, row },
                    { node: holder, ...origin },
                  ],
            );
            if (!undo) {
              continue;
            }
            const cost = this.cost();
            if (cost < current - 1e-9 && (!best || cost < best.cost)) {
              best = { cost, col, row };
            }
            undo();
          }
        }
        if (best) {
          const holder = this.#occupied.get(keyOf(best.col, best.row));
          const origin = { col: this.#state.col[node], row: this.#state.row[node] };
          this.#moveAll(
            holder === undefined
              ? [{ node, col: best.col, row: best.row }]
              : [
                  { node, col: best.col, row: best.row },
                  { node: holder, ...origin },
                ],
          );
          current = best.cost;
          improved = true;
        }
      }
      if (!improved) {
        break;
      }
    }
  }

  #restore(state: State) {
    for (let node = 0; node < this.#index.count; node++) {
      this.#set(node, NaN, NaN);
    }
    for (let node = 0; node < this.#index.count; node++) {
      this.#set(node, state.col[node], state.row[node]);
    }
  }
}

const iterationsFor = (count: number) => 1500 + 400 * count;

/** A group's own layout, as cells relative to its top-left, or absolute when a member is pinned. */
const layoutGroup = (
  input: PlaceInput,
  group: string,
  seed: number,
): { nodes: string[]; cells: Cell[]; anchored: boolean } => {
  const members = new Set(input.nodes.filter((node) => node.group === group).map((node) => node.id));
  const sub: PlaceInput = {
    flow: input.flow,
    ...(input.box ? { box: input.box } : {}),
    nodes: input.nodes.filter((node) => members.has(node.id)).map(({ id, pin }) => ({ id, pin })),
    groups: [],
    relations: input.relations.filter((relation) => members.has(relation.from) && members.has(relation.target)),
    groupRelations: [],
    edges: input.edges.filter((edge) => members.has(edge.from) && members.has(edge.to)),
  };
  const shape = input.shapes?.get(group);
  const index = { ...indexOf(sub), ...(shape ? { whole: shape } : {}) };
  const anchored = index.pinned.some((pinned) => pinned === 1);
  const search = new Search(index, seed);
  search.seat(
    index.ids.map((_, node) => ({
      nodes: [node],
      local: [{ col: index.pinned[node] ? index.pinCol[node] : 0, row: index.pinned[node] ? index.pinRow[node] : 0 }],
      anchored: index.pinned[node] === 1,
    })),
  );
  search.anneal(iterationsFor(index.count), 8, 0.1);
  search.polish();
  const cells = index.ids.map((_, node) => ({ col: search.state.col[node], row: search.state.row[node] }));
  if (anchored) {
    return { nodes: index.ids, cells, anchored };
  }
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const minRow = Math.min(...cells.map((cell) => cell.row));
  return {
    nodes: index.ids,
    cells: cells.map((cell) => ({ col: cell.col - minCol, row: cell.row - minRow })),
    anchored,
  };
};

/** Drops empty rows and columns and moves the top-left to 0,0 — only when nothing is pinned. */
const tidy = (index: Index, state: State): Map<string, Cell> => {
  const cells = new Map<string, Cell>();
  const pinned = index.pinned.some((value) => value === 1);
  const cols = [...new Set(state.col)].sort((left, right) => left - right);
  const rows = [...new Set(state.row)].sort((left, right) => left - right);
  index.ids.forEach((id, node) =>
    cells.set(
      id,
      pinned
        ? { col: state.col[node], row: state.row[node] }
        : { col: cols.indexOf(state.col[node]), row: rows.indexOf(state.row[node]) },
    ),
  );
  return cells;
};

/** Hard relations the placement could not satisfy, as indices into `input.relations` and `input.groupRelations`. */
export const unmet = (
  input: PlaceInput,
  cells: Map<string, Cell>,
): { relations: number[]; groupRelations: number[] } => {
  const groupBounds = (group: string): Bounds | undefined => {
    const members = input.nodes.filter((node) => node.group === group).flatMap((node) => cells.get(node.id) ?? []);
    return members.length === 0
      ? undefined
      : {
          minCol: Math.min(...members.map((cell) => cell.col)),
          maxCol: Math.max(...members.map((cell) => cell.col)),
          minRow: Math.min(...members.map((cell) => cell.row)),
          maxRow: Math.max(...members.map((cell) => cell.row)),
        };
  };
  return {
    relations: input.relations.flatMap((relation, position) => {
      const from = cells.get(relation.from);
      const target = cells.get(relation.target);
      return !relation.soft && from && target && !holds(relation.kind, from, target) ? [position] : [];
    }),
    groupRelations: input.groupRelations.flatMap((relation, position) => {
      const from = groupBounds(relation.from);
      const target = groupBounds(relation.target);
      return !relation.soft && from && target && !holdsBetween(relation.kind, from, target) ? [position] : [];
    }),
  };
};

/**
 * Places every node on the grid. Returns up to `keep` distinct placements, best first, so the caller
 * can route each and let the real measurements choose.
 */
export const place = (input: PlaceInput, { restarts = 6, seeds = [], keep = 3 }: PlaceOptions = {}): Placed[] => {
  const index = indexOf(input);
  if (index.count === 0) {
    return [{ cells: new Map(), cost: 0 }];
  }
  const results: { state: State; cost: number }[] = [];
  for (let attempt = 0; attempt < restarts; attempt++) {
    const seed = attempt + 1;
    const units = [
      ...input.groups.map((group, position) => {
        const local = layoutGroup(input, group, seed * 31 + position);
        const byId = new Map(index.ids.map((id, node) => [id, node]));
        return { nodes: local.nodes.flatMap((id) => byId.get(id) ?? []), local: local.cells, anchored: local.anchored };
      }),
      ...index.ids.flatMap((_, node) =>
        index.group[node] >= 0
          ? []
          : [
              {
                nodes: [node],
                local: [
                  {
                    col: index.pinned[node] ? index.pinCol[node] : 0,
                    row: index.pinned[node] ? index.pinRow[node] : 0,
                  },
                ],
                anchored: index.pinned[node] === 1,
              },
            ],
      ),
    ].filter((unit) => unit.nodes.length > 0);
    const search = new Search(index, seed);
    search.seat(units);
    search.anneal(iterationsFor(index.count), 8, 0.1);
    search.polish();
    results.push({ state: clone(search.state), cost: search.cost() });
  }
  seeds.forEach((cells, position) => {
    const start: State = {
      col: Float64Array.from(index.ids, (id, node) =>
        index.pinned[node] ? index.pinCol[node] : (cells.get(id)?.col ?? NaN),
      ),
      row: Float64Array.from(index.ids, (id, node) =>
        index.pinned[node] ? index.pinRow[node] : (cells.get(id)?.row ?? NaN),
      ),
    };
    // A seed that stacks two nodes is unusable as given; the free search covers it.
    const keys = new Set(index.ids.map((_, node) => keyOf(start.col[node], start.row[node])));
    if (keys.size !== index.count || start.col.some(Number.isNaN)) {
      return;
    }
    const search = new Search(index, 1000 + position, start);
    results.push({ state: clone(search.state), cost: search.cost() });
    search.anneal(iterationsFor(index.count), 2, 0.05);
    search.polish();
    results.push({ state: clone(search.state), cost: search.cost() });
  });

  const distinct = new Map<string, Placed>();
  for (const { state, cost } of results.sort((left, right) => left.cost - right.cost)) {
    const cells = tidy(index, state);
    const key = [...cells].map(([id, cell]) => `${id}@${cell.col},${cell.row}`).join(' ');
    if (!distinct.has(key)) {
      distinct.set(key, { cells, cost });
    }
  }
  return [...distinct.values()].slice(0, keep);
};

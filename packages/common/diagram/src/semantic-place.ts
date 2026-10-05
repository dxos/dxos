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

export type PlaceRelation = { from: string; kind: Semantic.RelationKind; target: string; soft: boolean };

export type PlaceEdge = {
  from: string;
  to: string;
  sides?: { start?: readonly Semantic.Side[]; end?: readonly Semantic.Side[] };
  /** The target is an abstraction that reads best against the flow, above its subtypes. */
  upward?: boolean;
};

export type PlaceInput = {
  nodes: readonly PlaceNode[];
  /** Group ids in declaration order. */
  groups: readonly string[];
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
    start?: readonly Semantic.Side[];
    end?: readonly Semantic.Side[];
    upward?: boolean;
  }[];
  relations: { from: number; kind: Semantic.RelationKind; target: number; soft: boolean }[];
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
      : [{ from, to, start: edge.sides?.start, end: edge.sides?.end, upward: edge.upward }];
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
        : [{ from, kind: relation.kind, target, soft: relation.soft }];
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
  };
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

const keyOf = (col: number, row: number) => `${col}:${row}`;

const clone = (state: State): State => ({ col: Float64Array.from(state.col), row: Float64Array.from(state.row) });

type Bounds = { minCol: number; maxCol: number; minRow: number; maxRow: number };

const boundsOf = (state: State, nodes: readonly number[]): Bounds | undefined => {
  let bounds: Bounds | undefined;
  for (const node of nodes) {
    const col = state.col[node];
    const row = state.row[node];
    if (Number.isNaN(col)) {
      continue;
    }
    bounds = bounds
      ? {
          minCol: Math.min(bounds.minCol, col),
          maxCol: Math.max(bounds.maxCol, col),
          minRow: Math.min(bounds.minRow, row),
          maxRow: Math.max(bounds.maxRow, row),
        }
      : { minCol: col, maxCol: col, minRow: row, maxRow: row };
  }
  return bounds;
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

/** Cells between the two of a satisfied relation, beyond adjacency; a relation reads best between neighbours. */
const slackOf = (kind: Semantic.RelationKind, from: Cell, target: Cell): number =>
  kind === 'right-of' || kind === 'left-of'
    ? Math.abs(from.col - target.col) - 1
    : kind === 'above' || kind === 'below'
      ? Math.abs(from.row - target.row) - 1
      : 0;

const cross = (origin: Vector, a: Vector, b: Vector) =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

const segmentsCross = (a1: Vector, a2: Vector, b1: Vector, b2: Vector): boolean => {
  const d1 = cross(a1, a2, b1);
  const d2 = cross(a1, a2, b2);
  const d3 = cross(b1, b2, a1);
  const d4 = cross(b1, b2, a2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

/** Whether the segment passes through the box centred at `centre` with half-extents `half`. */
const segmentHitsBox = (a: Vector, b: Vector, centre: Vector, half: Vector): boolean => {
  let enter = 0;
  let exit = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - (centre.x - half.x)],
    [dx, centre.x + half.x - a.x],
    [-dy, a.y - (centre.y - half.y)],
    [dy, centre.y + half.y - a.y],
  ]) {
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

/** The route a template draws, in cell space: straight, L by its start side, Z through the middle, or U beyond both. */
const shapeOf = (from: Vector, to: Vector, bends: number, [start, end]: [Semantic.Side, Semantic.Side]): Vector[] => {
  const alongX = start === 'left' || start === 'right';
  if (bends === 0) {
    return [from, to];
  }
  if (bends === 1) {
    return [from, alongX ? { x: to.x, y: from.y } : { x: from.x, y: to.y }, to];
  }
  if (bends === 2) {
    const out = OUT[start];
    const into = IN[end];
    const opposed = out.x === -into.x && out.y === -into.y;
    const middle = alongX
      ? opposed
        ? (out.x > 0 ? Math.max(from.x, to.x) : Math.min(from.x, to.x)) + out.x * 0.5
        : (from.x + to.x) / 2
      : opposed
        ? (out.y > 0 ? Math.max(from.y, to.y) : Math.min(from.y, to.y)) + out.y * 0.5
        : (from.y + to.y) / 2;
    return alongX
      ? [from, { x: middle, y: from.y }, { x: middle, y: to.y }, to]
      : [from, { x: from.x, y: middle }, { x: to.x, y: middle }, to];
  }
  return [from, to];
};

const polylinesCross = (left: readonly Vector[], right: readonly Vector[]): boolean =>
  left
    .slice(1)
    .some((a2, first) => right.slice(1).some((b2, second) => segmentsCross(left[first], a2, right[second], b2)));

/**
 * The placement score: lower is better. Terms involving a node not yet placed are skipped, so the
 * greedy seating can score a partial state.
 */
const score = (index: Index, state: State, occupied: Map<string, number>, strictness = 1): number => {
  // Annealing starts with relations and group bounds as strong preferences and tightens them into
  // rules, so an early state that breaks one is not a wall the search can never climb over.
  const hard = WEIGHT.soft * 3 + (WEIGHT.hard - WEIGHT.soft * 3) * strictness;
  const infeasible = WEIGHT.soft * 30 + (WEIGHT.infeasible - WEIGHT.soft * 30) * strictness;
  const { col, row } = state;
  const placed = (node: number) => !Number.isNaN(col[node]);
  let total = 0;

  // Edges: the bends of the best template, blocked straight runs, length and flow.
  // Each edge as the polyline of its best template, in cell space, for the crossing and through-box terms.
  const lines: { from: number; to: number; points: Vector[]; bent: boolean }[] = [];
  for (const edge of index.edges) {
    if (!placed(edge.from) || !placed(edge.to)) {
      continue;
    }
    const dx = col[edge.to] - col[edge.from];
    const dy = row[edge.to] - row[edge.from];
    let bends = Infinity;
    let pair: [Semantic.Side, Semantic.Side] = ['bottom', 'top'];
    for (const start of edge.start ?? ALL_SIDES) {
      for (const end of edge.end ?? ALL_SIDES) {
        const value = templateBends(dx, dy, start, end);
        if (value < bends) {
          bends = value;
          pair = [start, end];
        }
      }
    }
    const blocked =
      (bends === 0 && blockedStraight(col[edge.from], row[edge.from], dx, dy, occupied)) ||
      (bends === 1 && blockedCorners(col[edge.from], row[edge.from], dx, dy, occupied));
    total += WEIGHT.bend * (blocked ? 2 : bends) + WEIGHT.length * (Math.abs(dx) + Math.abs(dy));
    const along = index.flow === 'down' ? dy : index.flow === 'up' ? -dy : index.flow === 'right' ? dx : -dx;
    const forward = edge.upward ? -along : along;
    total += forward < 0 ? WEIGHT.backward : forward === 0 ? WEIGHT.sideways : 0;
    const from = { x: col[edge.from], y: row[edge.from] };
    lines.push({
      from: edge.from,
      to: edge.to,
      points: blocked ? [] : shapeOf(from, { x: col[edge.to], y: row[edge.to] }, bends, pair),
      bent: bends > 0,
    });
  }

  for (let first = 0; first < lines.length; first++) {
    const left = lines[first];
    for (let second = first + 1; second < lines.length; second++) {
      const right = lines[second];
      if (left.from === right.from || left.from === right.to || left.to === right.from || left.to === right.to) {
        continue;
      }
      if (polylinesCross(left.points, right.points)) {
        total += WEIGHT.crossing;
      }
    }
    // A straight run is already charged when blocked; a bent one may still cut a box.
    if (left.bent) {
      for (let node = 0; node < index.count; node++) {
        if (node === left.from || node === left.to || !placed(node)) {
          continue;
        }
        const centre = { x: col[node], y: row[node] };
        if (left.points.slice(1).some((to, position) => segmentHitsBox(left.points[position], to, centre, index.box))) {
          total += WEIGHT.through;
        }
      }
    }
  }

  // Hubs: one neighbour per side reads best; chains: keep a pass-through node in line.
  for (let node = 0; node < index.count; node++) {
    if (!placed(node)) {
      continue;
    }
    const around = index.neighbours[node].filter(placed);
    if (around.length >= 3) {
      const sides = [0, 0, 0, 0];
      for (const other of around) {
        const dx = col[other] - col[node];
        const dy = row[other] - row[node];
        sides[Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 1) : dy > 0 ? 2 : 3]++;
      }
      total += WEIGHT.hub * sides.reduce((sum, count) => sum + (count * (count - 1)) / 2, 0);
    }
    if (around.length === 2 && index.inDegree[node] === 1 && index.outDegree[node] === 1) {
      const [first, second] = around;
      const inLine =
        (col[first] === col[node] && col[second] === col[node]) ||
        (row[first] === row[node] && row[second] === row[node]);
      if (!inLine) {
        total += WEIGHT.chain;
      }
    }
  }

  // Relations.
  for (const relation of index.relations) {
    if (!placed(relation.from) || !placed(relation.target)) {
      continue;
    }
    const from = { col: col[relation.from], row: row[relation.from] };
    const target = { col: col[relation.target], row: row[relation.target] };
    if (holds(relation.kind, from, target)) {
      total += WEIGHT.near * slackOf(relation.kind, from, target);
    } else {
      total += relation.soft ? WEIGHT.soft : hard;
    }
  }

  // Groups: exclusive, disjoint, compact, and related as stated.
  const bounds = index.members.map((members) => boundsOf(state, members));
  bounds.forEach((box, group) => {
    if (!box) {
      return;
    }
    for (let row = box.minRow; row <= box.maxRow; row++) {
      for (let col = box.minCol; col <= box.maxCol; col++) {
        const node = occupied.get(keyOf(col, row));
        if (node !== undefined && index.group[node] !== group) {
          total += infeasible;
        }
      }
    }
    const area = (box.maxCol - box.minCol + 1) * (box.maxRow - box.minRow + 1);
    total += WEIGHT.slack * (area - index.members[group].filter(placed).length);
    for (let other = group + 1; other < bounds.length; other++) {
      const peer = bounds[other];
      if (
        peer &&
        box.minCol <= peer.maxCol &&
        peer.minCol <= box.maxCol &&
        box.minRow <= peer.maxRow &&
        peer.minRow <= box.maxRow
      ) {
        total += infeasible;
      }
    }
  });
  for (const relation of index.groupRelations) {
    const from = bounds[relation.from];
    const target = bounds[relation.target];
    if (!from || !target) {
      continue;
    }
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
  const all = boundsOf(
    state,
    Array.from({ length: index.count }, (_, node) => node),
  );
  if (all) {
    total += WEIGHT.extent * (all.maxCol - all.minCol + 1 + (all.maxRow - all.minRow + 1));
  }
  return total;
};

const blockedStraight = (col: number, row: number, dx: number, dy: number, occupied: Map<string, number>): boolean => {
  const steps = Math.abs(dx) + Math.abs(dy);
  for (let step = 1; step < steps; step++) {
    if (occupied.has(keyOf(col + Math.sign(dx) * step, row + Math.sign(dy) * step))) {
      return true;
    }
  }
  return false;
};

/** Whether both L-shaped routes run into a box: along the source row then the target column, or the reverse. */
const blockedCorners = (col: number, row: number, dx: number, dy: number, occupied: Map<string, number>): boolean => {
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
  readonly #occupied = new Map<string, number>();
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
    const previous = moves.map(({ node }) => ({ node, col: this.#state.col[node], row: this.#state.row[node] }));
    const moving = new Set(moves.map(({ node }) => node));
    const targets = new Set<string>();
    for (const move of moves) {
      const key = keyOf(move.col, move.row);
      const holder = this.#occupied.get(key);
      if (targets.has(key) || (holder !== undefined && !moving.has(holder))) {
        return undefined;
      }
      targets.add(key);
    }
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
    const all = boundsOf(
      this.#state,
      Array.from({ length: this.#index.count }, (_, node) => node),
    ) ?? { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
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
    ...input,
    nodes: input.nodes.filter((node) => members.has(node.id)).map(({ id, pin }) => ({ id, pin })),
    groups: [],
    relations: input.relations.filter((relation) => members.has(relation.from) && members.has(relation.target)),
    groupRelations: [],
    edges: input.edges.filter((edge) => members.has(edge.from) && members.has(edge.to)),
  };
  const index = indexOf(sub);
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

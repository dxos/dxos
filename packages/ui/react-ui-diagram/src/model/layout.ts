//
// Copyright 2026 DXOS.org
//

//
// Layered layout over the neutral graph, hierarchy-aware: each group is laid out in its own
// coordinate space and then sized to fit its children, because React Flow positions a child
// relative to its parent. Deliberately simple — ELK replaces this (see the design's phasing);
// the seam is that nothing outside this module knows how positions were derived.
//

import {
  type Edge,
  type Graph,
  type Node,
  type Overlay,
  type Point,
  childrenOf,
  findNode,
  isGroup,
} from '../types/index.ts';

/**
 * Grid pitch. One value drives layout quantisation, drag snapping and the rendered background, so a
 * computed position always lands on a visible gridline. Node and gap constants are multiples of it.
 */
export const GRID = 16;

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 64;
const GAP_RANK = 80;
const GAP_CROSS = 48;
/** Inset children by this much, leaving room for the group's own label above them. */
const GROUP_PAD = 32;

export type LayoutOptions = {
  /** Pinned positions win over computed ones. */
  overlay?: Overlay;
  /** Grid pitch to quantise to. Defaults to {@link GRID}. */
  grid?: number;
};

const quantise = (value: number, grid: number) => Math.round(value / grid) * grid;

/**
 * Edges that close a cycle, found by DFS: an edge into a node still on the stack points backwards.
 * Ranking ignores them, so `C --> Y --> C` ranks C from its forward predecessors instead of
 * chasing the loop forever.
 */
const backEdges = (nodes: readonly Node[], edges: readonly Edge[]): Set<Edge> => {
  const outgoing = new Map<string, Edge[]>();
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  const back = new Set<Edge>();
  const done = new Set<string>();
  const onStack = new Set<string>();

  const visit = (id: string) => {
    onStack.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (onStack.has(edge.target)) {
        back.add(edge);
      } else if (!done.has(edge.target)) {
        visit(edge.target);
      }
    }
    onStack.delete(id);
    done.add(id);
  };

  // Roots first, so classification follows the diagram's reading order.
  const targets = new Set(edges.map((edge) => edge.target));
  for (const node of nodes) {
    if (!targets.has(node.id) && !done.has(node.id)) {
      visit(node.id);
    }
  }
  for (const node of nodes) {
    if (!done.has(node.id)) {
      visit(node.id);
    }
  }
  return back;
};

/** Rank each node one past its deepest forward predecessor. */
const rank = (nodes: readonly Node[], edges: readonly Edge[]): Map<string, number> => {
  const back = backEdges(nodes, edges);
  const forward = edges.filter((edge) => !back.has(edge));
  const ranks = new Map(nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const edge of forward) {
      if (!ranks.has(edge.source) || !ranks.has(edge.target)) {
        continue;
      }
      const next = (ranks.get(edge.source) ?? 0) + 1;
      if (next > (ranks.get(edge.target) ?? 0)) {
        ranks.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return ranks;
};

type Size = { width: number; height: number };
type Placed = { origin: Point; size: Size };

/** The ancestor of `id` that sits directly inside `level`, or undefined if `id` is elsewhere. */
const ancestorAt = (graph: Graph, id: string, level: string | undefined): string | undefined => {
  const seen = new Set<string>();
  let current = findNode(graph, id);
  while (current && !seen.has(current.id)) {
    if (current.parent === level) {
      return current.id;
    }
    seen.add(current.id);
    current = current.parent ? findNode(graph, current.parent) : undefined;
  }
  return undefined;
};

/**
 * Re-express edges in terms of the entities at `level`, dropping those that do not connect two
 * distinct ones. Ids are synthesised because a lifted edge is a ranking constraint, not a link.
 */
const lift = (graph: Graph, level: string | undefined, edges: readonly Edge[]): Edge[] =>
  edges.flatMap((edge) => {
    const source = ancestorAt(graph, edge.source, level);
    const target = ancestorAt(graph, edge.target, level);
    return source && target && source !== target ? [{ ...edge, id: `${source}->${target}`, source, target }] : [];
  });

/**
 * Place the children of `parent` and return the box they occupy. Recurses first, so a group's
 * footprint reflects its own contents. `inset` shifts computed positions to clear the parent's
 * label; pinned positions are already in parent space and so are never shifted.
 */
const layoutLevel = (
  graph: Graph,
  parent: string | undefined,
  placed: Map<string, Placed>,
  overlay: Overlay | undefined,
  inset: number,
  grid: number,
): Size => {
  const members = childrenOf(graph, parent);
  if (members.length === 0) {
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }

  // Size each member first: a group's footprint depends on its descendants.
  const sizes = new Map<string, Size>();
  for (const node of members) {
    if (isGroup(node)) {
      const inner = layoutLevel(graph, node.id, placed, overlay, GROUP_PAD, grid);
      sizes.set(node.id, {
        width: quantise(inner.width + GROUP_PAD * 2, grid),
        height: quantise(inner.height + GROUP_PAD * 1.5, grid),
      });
    } else {
      sizes.set(node.id, {
        width: node.size?.width ?? NODE_WIDTH,
        height: node.size?.height ?? NODE_HEIGHT,
      });
    }
  }

  // Rank against edges lifted to this level: an edge into a group's child constrains the group
  // itself, so `X --> A` must rank X above CORE. Without lifting, a level whose every edge crosses
  // a group boundary sees no edges and collapses into a single row.
  const ranks = rank(members, lift(graph, parent, graph.edges));

  const lanes = new Map<number, Node[]>();
  for (const node of members) {
    const value = ranks.get(node.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), node]);
  }

  const laneWidth = (lane: Node[]) =>
    lane.reduce((total, node) => total + (sizes.get(node.id)?.width ?? NODE_WIDTH), 0) +
    Math.max(0, lane.length - 1) * GAP_CROSS;
  const widest = Math.max(...[...lanes.values()].map(laneWidth), NODE_WIDTH);

  let y = inset;
  let height = 0;
  for (const lane of [...lanes.keys()].sort((a, b) => a - b)) {
    const row = lanes.get(lane)!;
    const rowHeight = Math.max(...row.map((node) => sizes.get(node.id)?.height ?? NODE_HEIGHT));
    // Centring is the one source of off-grid values, so quantise here rather than at the end.
    let x = inset + quantise((widest - laneWidth(row)) / 2, grid);
    for (const node of row) {
      const size = sizes.get(node.id) ?? { width: NODE_WIDTH, height: NODE_HEIGHT };
      const pinned = overlay?.positions?.[node.id];
      placed.set(node.id, {
        origin: pinned ?? { x: quantise(x, grid), y: quantise(y, grid) },
        size,
      });
      x += size.width + GAP_CROSS;
    }
    y += rowHeight + GAP_RANK;
    height += rowHeight + GAP_RANK;
  }

  return { width: widest, height: Math.max(0, height - GAP_RANK) };
};

/**
 * Resolve every node's `origin` and `size`. Coordinates are parent-relative, matching React Flow's
 * treatment of nodes that declare a `parentId`.
 */
export const layout = (graph: Graph, { overlay, grid = GRID }: LayoutOptions = {}): Graph => {
  const placed = new Map<string, Placed>();
  layoutLevel(graph, undefined, placed, overlay, 0, grid);

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const entry = placed.get(node.id);
      return entry ? { ...node, origin: entry.origin, size: entry.size } : node;
    }),
  };
};

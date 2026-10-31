//
// Copyright 2026 DXOS.org
//

//
// Graph placement (§3 variant 3): an external graph of nodes and edges, ranked into rows by a layout engine, with an
// overlay of placed positions on top. Dynamic mode places a layout's shapes with it, and hosts draw graphs with it.
//

import { Layout } from '@dxos/diagram';
import {
  type BuiltinNodeType,
  type Layer,
  type LayerId,
  type LineStyle,
  type Link,
  type LinkEnds,
  type LinkType,
  type Node,
  type Point,
  type Size,
} from '@dxos/scene';

import { type CreateProps, type NodeRegistry, type RenderList2D } from '../model/index.ts';
import {
  type Arrangement,
  type ForceOptions,
  type GridExtent,
  type LatticeSpec,
  type Slot,
  arrange,
  centeredOrigin,
  createNode,
  improveSlots,
  initialKeys,
  latticeEnds,
  routeCost,
  withTitle,
} from '../utils/index.ts';

export type GraphNode = { id: string; label?: string; type?: BuiltinNodeType };
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  /** A caption at the middle of the link. */
  text?: string;
  /** Overrides `DynamicOptions.link.ends` for this edge, so a graph can draw several kinds of edge. */
  ends?: LinkEnds;
  style?: LineStyle;
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/** User adjustments layered over the engine's layout (react-ui-diagram's pattern). */
export type Overlay = {
  positions: Record<string, Point>;
};

export type DynamicOptions = {
  /** The node types, for the part each created node's title goes in. */
  nodes: NodeRegistry;
  pitch?: Size;
  size?: Size;
  /**
   * Lays the graph out on a lattice's cells, one per node, and keeps moved nodes on them (DESIGN §8b);
   * overrides `pitch` and `size`.
   */
  lattice?: LatticeSpec;
  /** How nodes take their slots once ranked; `crossings` (fewest crossings) by default. */
  arrange?: Arrangement;
  /** Strengths of the `force` and `force-free` arrangements. */
  force?: ForceOptions;
  /** The first slot's centre; by default the layout straddles the origin. */
  origin?: Point;
  /**
   * Makes the scene node for a graph node, so a host can place its own node type (one that renders its
   * object) where the default is a titled `rect`.
   */
  createNode?: (node: GraphNode, props: CreateProps) => Node;
  /** How edges draw; by default a `curve` with no markers. Not `spline`, whose control points the layout does not make. */
  link?: {
    type?: Exclude<LinkType, 'spline'>;
    ends?: LinkEnds;
    /** The layer the links go on; the bottom one when unset. */
    layer?: LayerId;
  };
  /**
   * The scene's layers, bottom first by `z`, e.g. a backdrop under the graph; `createNode` puts each node on one and
   * `link.layer` the links. A layer's links paint under its nodes, so a backdrop needs a layer of its own below them.
   */
  layers?: readonly Layer[];
};

/** Multiples of the major grid, so a laid-out graph is already snapped. */
const DEFAULTS: Required<Pick<DynamicOptions, 'pitch' | 'size'>> = {
  pitch: { width: 256, height: 192 },
  size: { width: 192, height: 128 },
};

export const DYNAMIC_VIEW_ID = 'dynamic';

/** What placing a graph needs; only the routed arrangement reads the node types, to route edges as they draw. */
export type GraphPlacement = Omit<DynamicOptions, 'nodes'> & { nodes?: NodeRegistry };

/**
 * Each graph node's centre: its override, or its slot, with rows ranked top-down along the edges and columns the order
 * within a row, on the grid (or the lattice's cells).
 */
export const graphCenters = (
  graph: GraphModel,
  overlay: Overlay,
  options: GraphPlacement,
  /** Slots already arranged for `options`, reused for a graph seen before. */
  slotsCache?: SlotsCache,
): Map<string, Point> => {
  const { pitch, size } = options.lattice ? latticeSlots(options.lattice) : { ...DEFAULTS, ...options };
  const slots = slotsOf(graph, options, slotsCache);

  // Taken from the slots rather than from the placed nodes, so dragging a node (which only writes an
  // override) leaves the rest of the graph where it is.
  const extent = {
    columns: Math.max(...[...slots.values()].map(({ column }) => column + 1), 1),
    rows: Math.max(...[...slots.values()].map(({ row }) => row + 1), 1),
  };
  const origin =
    options.origin ?? (options.lattice ? latticeOrigin(extent, pitch) : centeredOrigin(extent, pitch, size));
  return new Map(
    graph.nodes.map(({ id }) => [
      id,
      overlay.positions[id] ?? {
        x: origin.x + (slots.get(id)?.column ?? 0) * pitch.width,
        y: origin.y + (slots.get(id)?.row ?? 0) * pitch.height,
      },
    ]),
  );
};

/** Rank rows top-down along the edges; columns are the order within a row. Overrides win. */
export const layoutGraph = (
  graph: GraphModel,
  overlay: Overlay,
  options: DynamicOptions,
  /** Slots already arranged for `options`, reused for a graph seen before. */
  slotsCache?: SlotsCache,
): RenderList2D => {
  const { size } = options.lattice ? latticeSlots(options.lattice) : { ...DEFAULTS, ...options };
  const known = new Set(graph.nodes.map(({ id }) => id));
  const centers = graphCenters(graph, overlay, options, slotsCache);

  const keys = initialKeys(graph.nodes.length + graph.edges.length);
  const nodes: Record<string, Node> = {};
  graph.nodes.forEach((node, index) => {
    const center = centers.get(node.id) ?? { x: 0, y: 0 };
    const props = { id: node.id, z: keys[graph.edges.length + index], center, size };
    nodes[node.id] = options.createNode
      ? options.createNode(node, props)
      : withTitle(options.nodes, createNode({ type: node.type ?? 'rect', ...props }), node.label ?? node.id);
  });
  const links: Record<string, Link> = {};
  graph.edges.forEach((edge, index) => {
    if (known.has(edge.from) && known.has(edge.to)) {
      links[edge.id] = {
        type: options.link?.type ?? 'smart',
        id: edge.id,
        z: keys[index],
        source: { node: edge.from },
        target: { node: edge.to },
        ...((edge.ends ?? options.link?.ends) && { ends: edge.ends ?? options.link?.ends }),
        ...(edge.text !== undefined && { text: edge.text }),
        ...(edge.style && { style: edge.style }),
        ...(options.link?.layer && { layer: options.link.layer }),
      };
    }
  });
  return {
    id: DYNAMIC_VIEW_ID,
    name: 'Dynamic',
    nodes,
    links,
    ...(options.layers && { layers: Object.fromEntries(options.layers.map((layer) => [layer.id, layer])) }),
  };
};

/**
 * Each graph's slots, for one set of options: a drag re-runs the layout with a new overlay but the same graph, and
 * arranging (a force simulation, a routed search) is the costly part. A caller re-placing one graph keeps one.
 */
export type SlotsCache = WeakMap<GraphModel, Map<string, Slot>>;

const slotsOf = (graph: GraphModel, options: GraphPlacement, cache?: SlotsCache): Map<string, Slot> => {
  const cached = cache?.get(graph);
  if (cached) {
    return cached;
  }
  const ids = graph.nodes.map(({ id }) => id);
  const known = new Set(ids);
  const edges = graph.edges.filter(({ from, to }) => known.has(from) && known.has(to));
  const ranks = Layout.rank(ids, edges);
  const seed = arrange(new Map(ids.map((id) => [id, ranks.get(id) ?? 0])), edges, options.arrange, options.force);
  const { nodes, lattice } = options;
  const slots =
    options.arrange === 'routed' && lattice && nodes
      ? routedSlots(graph, edges, seed, { ...options, nodes }, lattice)
      : seed;
  cache?.set(graph, slots);
  return slots;
};

/** Weights of a routed arrangement's score: a crossing outweighs any number of bends, a bend any detour. */
const CROSSING_COST = 1_000;
const BEND_COST = 20;

/** The last few routed arrangements by graph, so a drag (which re-runs the layout) does not re-run the search. */
const routedCache = new Map<string, Map<string, Slot>>();
const ROUTED_CACHE_SIZE = 8;

/**
 * `seed` improved by moving and swapping nodes on the lattice, scored by routing every edge through the gutters as the
 * canvas draws it.
 */
const routedSlots = (
  graph: GraphModel,
  edges: readonly GraphEdge[],
  seed: ReadonlyMap<string, Slot>,
  options: DynamicOptions,
  lattice: LatticeSpec,
): Map<string, Slot> => {
  const key = JSON.stringify([lattice, graph.nodes.map(({ id }) => id), edges.map(({ from, to }) => [from, to])]);
  const cached = routedCache.get(key);
  if (cached) {
    return cached;
  }
  const { pitch, size } = latticeSlots(lattice);
  const links: Link[] = edges.map(({ id, from, to }) => ({
    type: 'smart',
    id,
    z: 'a0',
    source: { node: from },
    target: { node: to },
  }));
  const score = (slots: ReadonlyMap<string, Slot>) => {
    const nodes: Record<string, Node> = {};
    for (const node of graph.nodes) {
      const slot = slots.get(node.id) ?? { column: 0, row: 0 };
      const props = {
        id: node.id,
        z: 'a0',
        center: { x: slot.column * pitch.width, y: slot.row * pitch.height },
        size,
      };
      nodes[node.id] = options.createNode
        ? options.createNode(node, props)
        : createNode({ type: node.type ?? 'rect', ...props });
    }
    const view: RenderList2D = { id: DYNAMIC_VIEW_ID, name: 'Dynamic', nodes, links: {} };
    const route = { spec: lattice, nodes: Object.values(nodes) };
    const routes = links.flatMap((link) => {
      const routed = latticeEnds(view, options.nodes, link, route);
      return routed ? [routed.points] : [];
    });
    const cost = routeCost(routes);
    const unrouted = links.length - routes.length;
    return (cost.crossings + unrouted) * CROSSING_COST + cost.bends * BEND_COST + cost.length / pitch.width;
  };
  const slots = improveSlots(seed, score);
  routedCache.set(key, slots);
  if (routedCache.size > ROUTED_CACHE_SIZE) {
    routedCache.delete(routedCache.keys().next().value ?? '');
  }
  return slots;
};

/** One-cell slots, a cell plus a gutter apart. */
const latticeSlots = ({ width, height, gutterX, gutterY }: LatticeSpec): { pitch: Size; size: Size } => ({
  pitch: { width: width + gutterX, height: height + gutterY },
  size: { width, height },
});

/** The centre of the cell the layout starts at, chosen so the arrangement straddles the origin. */
const latticeOrigin = (extent: GridExtent, pitch: Size): Point => ({
  // `+ 0` folds -0 into 0, as the lattice's own cell keys do.
  x: Math.round(-(extent.columns - 1) / 2) * pitch.width + 0,
  y: Math.round(-(extent.rows - 1) / 2) * pitch.height + 0,
});

//
// Copyright 2026 DXOS.org
//

//
// A generated graph (a feature map, a spec's changelog, the code index) as a dynamic 2D layout on the shared model:
// one shape per graph node placed by the layout engine, one link per edge, the lattice and arrangement on the layout so
// the editor's dynamic and lattice modes keep it (COMMON-CORE-PLAN R-50).
//

import {
  type Arrangement,
  DYNAMIC_ARRANGE,
  type ForceOptions,
  type GraphModel,
  type GraphNode,
  type LatticeSpec,
  type NodeRegistry,
  type SlotsCache,
  graphCenters,
  initialKeys,
} from '@dxos/react-ui-canvas';
import {
  type Layer,
  type LayoutIntent,
  type LinkEnds,
  type LinkType,
  type Node,
  type Point,
  type Scene,
  type Size,
  endpointNode,
} from '@dxos/scene';

/** The shape a graph node draws as, beyond its place: the 2D viewport's node type for it, and that type's own fields. */
export type GraphShape = {
  /** A node type the viewport's registry draws (a host's card, say); a titled `rect` when unset. */
  type?: string;
  /** Its size, when it differs from the slot's. */
  size?: Size;
  layer?: string;
  locked?: boolean;
  label?: string;
  /** The type's own fields (a diagram frame's `element`, say). */
  fields?: Record<string, unknown>;
};

export type GraphLayoutOptions = {
  /** The layout's id, which is also its scene's; `graph` when unset. */
  id?: string;
  /** Lays the graph out one node per cell and keeps it there (lattice mode); overrides `size` and `pitch`. */
  lattice?: LatticeSpec;
  /** The slot every node takes without a lattice. */
  size?: Size;
  pitch?: Size;
  /** How nodes take their slots once ranked; fewest crossings by default. */
  arrange?: Arrangement;
  force?: ForceOptions;
  /** The layout's layers, bottom first; `shape` puts each node on one and `link.layer` the links. */
  layers?: readonly Layer[];
  shape?: (node: GraphNode) => GraphShape;
  /** How edges draw: smart links (routed through a lattice's gutters, or round the shapes) by default. */
  link?: { type?: Exclude<LinkType, 'spline'>; ends?: LinkEnds; layer?: string };
  /** The node types, which the routed arrangement reads to route edges as they draw. */
  nodes?: NodeRegistry;
};

/** The dynamic projection's slot without a lattice, so a graph with no size draws as it did there. */
const DEFAULT_SIZE: Size = { width: 192, height: 128 };

export const GRAPH_LAYOUT_ID = 'graph';

const isLink = (element: Pick<Scene.Element2D, 'source' | 'target'>): boolean =>
  element.source !== undefined || element.target !== undefined;

/**
 * `graph` as a dynamic 2D layout: every node a shape at its arranged slot (or at `positions`, pinned there), every edge
 * between two nodes a link, with the lattice and arrangement the editor's modes read. A host's node type keeps its
 * fields under `props.canvas`, where the 2D viewport reads a node's own fields (R-18).
 */
export const graphLayout = (
  graph: GraphModel,
  options: GraphLayoutOptions = {},
  positions: Readonly<Record<string, Point>> = {},
  /** Slots already arranged for `options`, reused while the graph object is the same. */
  cache?: SlotsCache,
): Scene.LayoutRecord2D => {
  const { lattice, arrange = 'crossings', layers, link } = options;
  const size = lattice ? { width: lattice.width, height: lattice.height } : (options.size ?? DEFAULT_SIZE);
  const shapeOf = (node: GraphNode): GraphShape => options.shape?.(node) ?? {};
  const createNode = (node: GraphNode, props: { id: string; z: string; center: Point; size: Size }): Node => {
    const shape = shapeOf(node);
    return { type: shape.type ?? node.type ?? 'rect', ...props, size: shape.size ?? props.size };
  };
  const centers = graphCenters(
    graph,
    { positions: { ...positions } },
    {
      ...(lattice ? { lattice } : { size, ...(options.pitch ? { pitch: options.pitch } : {}) }),
      arrange,
      ...(options.force ? { force: options.force } : {}),
      ...(options.nodes ? { nodes: options.nodes } : {}),
      createNode,
    },
    cache,
  );

  const known = new Set(graph.nodes.map(({ id }) => id));
  const edges = graph.edges.filter(({ from, to }) => known.has(from) && known.has(to));
  // Links first, so within a layer they paint under the shapes they join.
  const keys = initialKeys(edges.length + graph.nodes.length);
  const elements: Record<string, Scene.Element2D> = {};
  edges.forEach((edge, index) => {
    const ends = edge.ends ?? link?.ends;
    elements[edge.id] = {
      id: edge.id,
      type: 'link',
      z: keys[index],
      source: { node: edge.from },
      target: { node: edge.to },
      ...(edge.text !== undefined ? { label: edge.text } : {}),
      ...(link?.layer !== undefined ? { layer: link.layer } : {}),
      ...(edge.style ? { overrides: edge.style } : {}),
      props: { canvas: { type: link?.type ?? 'smart', ...(ends ? { ends } : {}) } },
    };
  });
  graph.nodes.forEach((node, index) => {
    const { type, size: shapeSize, layer, locked, label, fields } = shapeOf(node);
    const title = label ?? (type === undefined ? (node.label ?? node.id) : undefined);
    elements[node.id] = {
      id: node.id,
      type: type ?? node.type ?? 'rect',
      z: keys[edges.length + index],
      center: centers.get(node.id) ?? { x: 0, y: 0 },
      size: shapeSize ?? size,
      ...(title !== undefined ? { label: title } : {}),
      ...(layer !== undefined ? { layer } : {}),
      ...(locked ? { locked } : {}),
      ...(positions[node.id] ? { pinned: true } : {}),
      // A host type is drawn only from its canvas fields; a titled rect is drawn from the element's own.
      ...(type !== undefined ? { props: { canvas: { ...fields } } } : {}),
    };
  });

  return {
    id: options.id ?? GRAPH_LAYOUT_ID,
    dim: '2d',
    // A free force layout leaves shapes between cells, so the layout keeps no lattice to snap them back onto.
    ...(lattice && arrange !== 'force-free' ? { lattice } : {}),
    arrange: { kind: DYNAMIC_ARRANGE, params: { arrange } },
    ...(layers ? { layers: Object.fromEntries(layers.map((layer) => [layer.id, layer])) } : {}),
    elements,
  };
};

/** A document with `layout` as its one scene, for the editor and the 2D viewport. */
export const graphDocument = (layout: Scene.LayoutRecord2D): Scene.SceneDocument => ({
  scenes: [{ id: layout.id, dim: '2d', layout: layout.id, camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [layout],
  models: [],
});

/** Where a person placed shapes: the centres of the layout's pinned shapes, by id. */
export const graphPositions = (layout: Scene.LayoutRecord2D): Record<string, Point> =>
  Object.fromEntries(
    Object.values(layout.elements).flatMap((element) =>
      element.pinned && element.center && !isLink(element) ? [[element.id, element.center]] : [],
    ),
  );

/** What an edit to a graph's layout asks of the host: shapes and links deleted, links drawn, and the rest to apply. */
export type GraphEdit = {
  /** Shapes deleted, and links deleted on their own (a link going with its shape is the shape's). */
  deleted: string[];
  /** Links drawn between two shapes. */
  linked: { from: string; to: string }[];
  /** The edit without its deletes and new links: moves and pins, which the layout keeps. */
  rest?: LayoutIntent;
};

const leaves = (intent: LayoutIntent): LayoutIntent[] =>
  intent.kind === 'batch' ? intent.intents.flatMap(leaves) : [intent];

/**
 * `intent` on a graph's layout split by who owns it: the graph is the host's model, so a delete or a drawn link goes to
 * the host (and draws only once the graph comes back with it); a move is the layout's own.
 */
export const splitGraphEdit = (layout: Scene.LayoutRecord2D, intent: LayoutIntent): GraphEdit => {
  const removed = new Set<string>();
  const linked: GraphEdit['linked'] = [];
  const rest: LayoutIntent[] = [];
  for (const leaf of leaves(intent)) {
    if (leaf.kind === 'delete') {
      leaf.ids.forEach((id) => removed.add(id));
    } else if (leaf.kind === 'create' && isLink(leaf.element)) {
      const { source, target } = leaf.element;
      const from = source && endpointNode(source);
      const to = target && endpointNode(target);
      from !== undefined && to !== undefined && linked.push({ from, to });
    } else {
      rest.push(leaf);
    }
  }
  const deleted = [...removed].filter((id) => {
    const element = layout.elements[id];
    if (!element || !isLink(element)) {
      return element !== undefined;
    }
    const ends = [element.source, element.target].map((end) => end && endpointNode(end));
    return !ends.some((end) => end !== undefined && removed.has(end));
  });
  return {
    deleted,
    linked,
    ...(rest.length === 0 ? {} : { rest: rest.length === 1 ? rest[0] : { kind: 'batch', intents: rest } }),
  };
};

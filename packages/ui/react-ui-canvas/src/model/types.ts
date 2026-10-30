//
// Copyright 2026 DXOS.org
//

//
// Scene engine types (docs/DESIGN.md §4). Plain Effect schemas: no ECHO yet, so the same shapes wrap
// into an ECHO type later without change. A diagram is one scene of typed nodes and typed links; every
// node is a `NodeBase` (centre, size, ports, style) plus the properties its type adds, so the engine
// works on the base and a host composes the scene schema from its own node types (decision 1).
//

import * as Schema from 'effect/Schema';

import {
  Bounds,
  CloudNode,
  type ElementId,
  EllipseNode,
  GeneratorNode,
  InstanceNode,
  Layer,
  type LayerId,
  LinkEnds,
  type LinkId,
  NodeBase,
  type NodeId,
  NoteNode,
  PathNode,
  Point,
  PolygonNode,
  PolylineNode,
  RectNode,
  Shape,
  type ViewId,
  ViewNode,
  boxFields,
  linkBase,
  nodeBase,
} from '@dxos/scene';

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

/** Where a diagram shape's heading (a group's name) sits, from the frame's top-left corner, and how it is set. */
export const DiagramHeading = Schema.Struct({
  /** The DSL element the heading came from, so the drawing reads it back under its own id. */
  id: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Shape.Color),
  weight: Schema.optional(Shape.Weight),
});
export type DiagramHeading = Schema.Schema.Type<typeof DiagramHeading>;

/** The DSL elements a diagram node can be. */
export const DiagramShape = Schema.Union([Shape.Box, Shape.Circle, Shape.Text, Shape.Portal]);
export type DiagramShape = Schema.Schema.Type<typeof DiagramShape>;

/**
 * A shape of a laid-out diagram (`@dxos/diagram`'s scene DSL), drawn by the renderer that writes the diagram's SVG file
 * (`SvgFile.elementMarkup`) so it reads on the canvas as it does there. The element's geometry is the node's frame and
 * its text the node's `label` (the heading's, when it has one), so a move, a resize or a relabel edits the element.
 */
export const DiagramNode = Schema.Struct({
  type: Schema.Literal('diagram'),
  ...nodeBase,
  ...boxFields,
  element: DiagramShape,
  heading: Schema.optional(DiagramHeading),
});
export type DiagramNode = Schema.Schema.Type<typeof DiagramNode>;

/** The engine's own node types. A host may add its own (decision 1); those are `NodeBase` to the engine. */
export const BuiltinNode = Schema.Union([
  RectNode,
  EllipseNode,
  CloudNode,
  PolygonNode,
  PolylineNode,
  NoteNode,
  ViewNode,
  InstanceNode,
  PathNode,
  GeneratorNode,
  DiagramNode,
]);
export type BuiltinNode = Schema.Schema.Type<typeof BuiltinNode>;
export type BuiltinNodeType = BuiltinNode['type'];
export const NODE_TYPES: readonly BuiltinNodeType[] = [
  'rect',
  'ellipse',
  'polygon',
  'cloud',
  'polyline',
  'note',
  'view',
  'instance',
  'path',
  'generator',
  'diagram',
];

/** A node of the scene: the engine handles any `NodeBase`; built-in code narrows with the guards below. */
export type Node = NodeBase;
/** A node type name; the engine's own are `BuiltinNodeType`. */
export type NodeType = string;

/** Narrows a node to one built-in type; sound because the registry maps each type name to one schema. */
export const isRectNode = (node: NodeBase): node is RectNode => node.type === 'rect';
export const isEllipseNode = (node: NodeBase): node is EllipseNode => node.type === 'ellipse';
export const isCloudNode = (node: NodeBase): node is CloudNode => node.type === 'cloud';
export const isPolygonNode = (node: NodeBase): node is PolygonNode => node.type === 'polygon';
export const isPolylineNode = (node: NodeBase): node is PolylineNode => node.type === 'polyline';
export const isNoteNode = (node: NodeBase): node is NoteNode => node.type === 'note';
export const isViewNode = (node: NodeBase): node is ViewNode => node.type === 'view';
export const isInstanceNode = (node: NodeBase): node is InstanceNode => node.type === 'instance';
export const isPathNode = (node: NodeBase): node is PathNode => node.type === 'path';
export const isGeneratorNode = (node: NodeBase): node is GeneratorNode => node.type === 'generator';
export const isDiagramNode = (node: NodeBase): node is DiagramNode => node.type === 'diagram';
/** A node built on the `box` prototype, carrying a centred, editable label. */
export const isBoxNode = (node: NodeBase): node is RectNode | ViewNode => isRectNode(node) || isViewNode(node);
/** Whether a view node draws its child View: as set, else while it has no label to show instead. */
export const showsContents = (node: ViewNode): boolean => node.link?.contents ?? node.label === undefined;
export const isBuiltinNode = (node: NodeBase): node is BuiltinNode => NODE_TYPES.some((type) => type === node.type);

/** Node types stored under an earlier name: `frame` is what `view` was called before the View rename. */
const LEGACY_NODE_TYPES: ReadonlyMap<string, BuiltinNodeType> = new Map([['frame', 'view']]);

/** A node stored under an earlier type name reads as its current type; any other node is returned as it is. */
export const withLegacyNodeType = (node: NodeBase): NodeBase => {
  const type = LEGACY_NODE_TYPES.get(node.type);
  return type ? { ...node, type } : node;
};

/** The settings each type once stored beside the shared fields, which it now keeps in `params`. */
const LEGACY_PARAMS: Readonly<Record<string, readonly string[]>> = { cloud: ['bumps'], polygon: ['sides', 'fit'] };

/** A node storing its type's settings beside the shared fields reads with them in `params`; any other is returned as it is. */
export const withLegacyParams = (node: NodeBase): NodeBase => {
  const keys = (LEGACY_PARAMS[node.type] ?? []).filter((key) => key in node);
  if (keys.length === 0) {
    return node;
  }
  const params: unknown = Reflect.get(node, 'params');
  const lifted = Object.fromEntries(keys.map((key) => [key, Reflect.get(node, key)]));
  const next = { ...node };
  keys.forEach((key) => Reflect.deleteProperty(next, key));
  // A value already in `params` was written later, so it wins over the stored one.
  return Object.assign(next, { params: { ...lifted, ...(typeof params === 'object' ? params : {}) } });
};

//
// Links
//

/** Where a diagram connector's caption sits (scene coordinates, its top-left), and how it is set. */
export const DiagramCaption = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number),
  color: Schema.optional(Shape.Color),
  weight: Schema.optional(Shape.Weight),
});
export type DiagramCaption = Schema.Schema.Type<typeof DiagramCaption>;

/**
 * A connector of a laid-out diagram, drawn by the diagram's SVG renderer: its relation's markers and dash, and the
 * route the layout gave it (scene coordinates, source end first) for as long as its ends are where the route meets them.
 */
export const DiagramConnector = Schema.Struct({
  relation: Schema.optional(Shape.Relation),
  head: Schema.optional(Shape.ArrowHead),
  tail: Schema.optional(Shape.ArrowTail),
  stroke: Schema.optional(Shape.Stroke),
  color: Schema.optional(Shape.Color),
  route: Schema.optional(Schema.Array(Point)),
  caption: Schema.optional(DiagramCaption),
});
export type DiagramConnector = Schema.Schema.Type<typeof DiagramConnector>;

/** The shared link base, drawn as a diagram connector when it carries one (moves to the scene in COMMON-CORE 0.5). */
const canvasLinkBase = { ...linkBase, connector: Schema.optional(DiagramConnector) };

export const LineLink = Schema.Struct({ type: Schema.Literal('line'), ...canvasLinkBase });
export type LineLink = Schema.Schema.Type<typeof LineLink>;

/** Cubic Bézier leaving each port along its side's normal. */
export const CurveLink = Schema.Struct({ type: Schema.Literal('curve'), ...canvasLinkBase });
export type CurveLink = Schema.Schema.Type<typeof CurveLink>;

/** Smooth curve through the ports and the control `points` in between, in order. */
export const SplineLink = Schema.Struct({
  type: Schema.Literal('spline'),
  ...canvasLinkBase,
  points: Schema.Array(Point),
});
export type SplineLink = Schema.Schema.Type<typeof SplineLink>;

/**
 * Routed between its ends rather than drawn: a stub leaves each port along its side's normal and the
 * route joins the two. Nothing is stored, so the path follows the nodes as they move.
 */
export const SmartLink = Schema.Struct({ type: Schema.Literal('smart'), ...canvasLinkBase });
export type SmartLink = Schema.Schema.Type<typeof SmartLink>;

export const Link = Schema.Union([LineLink, CurveLink, SplineLink, SmartLink]);
export type Link = Schema.Schema.Type<typeof Link>;
export type LinkType = Link['type'];
export const LINK_TYPES: readonly LinkType[] = ['line', 'curve', 'spline', 'smart'];

export type Element = Node | Link;

/** The markers a link draws. */
export const linkMarkers = (link: Link): LinkEnds => link.ends ?? {};

export const isNode = (element: Element): element is Node => 'center' in element;
export const isLink = (element: Element): element is Link => 'source' in element;

//
// Scene
//

//
// Timeline (ANIMATION.md §5.2)
//

/** The target of the camera's tracks; a node track names the node's id. The camera's are `x`, `y` and `zoom`. */
export const CAMERA_TARGET = 'camera';

/** A plain View, or the definition of a composite object that instances draw (ANIMATION.md §4.1). */
export const ViewKind = Schema.Literals(['view', 'composite']);
export type ViewKind = Schema.Schema.Type<typeof ViewKind>;

/**
 * The View schema over a set of node schemas: a host composes it from its registry's types, so the
 * schema stays exact for every type while the engine only ever sees `NodeBase`.
 */
export const createViewSchema = <const Nodes extends readonly Schema.Codec<NodeBase, unknown>[]>(nodes: Nodes) =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    nodes: Schema.Record(Schema.String, Schema.Union(nodes)),
    links: Schema.Record(Schema.String, Link),
    layers: Schema.optional(Schema.Record(Schema.String, Layer)),
    kind: Schema.optional(ViewKind),
    /** An Object the Group command made: kept out of the library until it is named or placed again. */
    anonymous: Schema.optional(Schema.Boolean),
  });

/** The View schema over the built-in node types. */
export const View = createViewSchema([
  RectNode,
  EllipseNode,
  CloudNode,
  PolygonNode,
  PolylineNode,
  NoteNode,
  ViewNode,
  InstanceNode,
  PathNode,
  GeneratorNode,
  DiagramNode,
]);

/** The View schema over any node with the shared fields: what the engine itself can validate for a host. */
export const OpenView = createViewSchema([NodeBase]);
export type View = {
  readonly id: ViewId;
  readonly name?: string;
  readonly nodes: Readonly<Record<NodeId, Node>>;
  readonly links: Readonly<Record<LinkId, Link>>;
  readonly layers?: Readonly<Record<LayerId, Layer>>;
  readonly kind?: ViewKind;
  readonly anonymous?: boolean;
};

/** A View as stored before a rename, read in the current shape: its nodes' legacy type names and settings mapped. */
export const withLegacyView = (view: View): View =>
  Object.values(view.nodes).some((node) => LEGACY_NODE_TYPES.has(node.type) || withLegacyParams(node) !== node)
    ? {
        ...view,
        nodes: Object.fromEntries(
          Object.entries(view.nodes).map(([id, node]) => [id, withLegacyParams(withLegacyNodeType(node))]),
        ),
      }
    : view;

/** A node or link of the View by id. */
export const getElement = (scene: View, id: ElementId): Element | undefined => scene.nodes[id] ?? scene.links[id];

/** Property edits: the shared fields typed, a type's own fields by name. */
export type NodeValues = Partial<Omit<NodeBase, 'id' | 'type'>> & { readonly [key: string]: unknown };
/** Per link type, so a spline's `points` are among the values an `update` may set. */
type ValuesOf<T> = T extends unknown ? Partial<Omit<T, 'id' | 'type'>> : never;
export type LinkValues = ValuesOf<Link>;

/**
 * What the surface asks of a projection (§3). The surface never writes coordinates itself: a
 * projection may apply, rewrite or reject each intent and then re-emits the positioned scene.
 */
export type Intent =
  | { kind: 'move'; ids: NodeId[]; delta: Point }
  | { kind: 'resize'; id: NodeId; bounds: Bounds }
  | { kind: 'link'; link: Link }
  | { kind: 'create'; node: Node }
  | { kind: 'delete'; ids: ElementId[] }
  | { kind: 'reorder'; id: ElementId; z: string }
  /** Property edits (label, text, geometry, control points); `id` and `type` never change. */
  | { kind: 'update'; id: ElementId; values: NodeValues | LinkValues }
  /**
   * Arrange the scene (or just `ids`, when the selection is what the user asked to tidy). An intent
   * rather than a view action, so a projection that owns its own positions may rewrite or refuse it.
   */
  | { kind: 'layout'; ids?: ElementId[] }
  /** Adds a layer, or replaces the one of its id (a rename, a visibility toggle, a move in the order). */
  | { kind: 'layer'; layer: Layer }
  /** Removes a layer and every element on it; the last layer of a scene stays. */
  | { kind: 'removeLayer'; id: LayerId }
  /** Several intents applied as one model change (one undo step), e.g. a paste. */
  | { kind: 'batch'; intents: Intent[] };

export type Capabilities = {
  move?: boolean;
  resize?: boolean;
  link?: boolean;
  create?: boolean;
  delete?: boolean;
  update?: boolean;
  layout?: boolean;
};

/** The active tool: a node type draws that node, a link type is what port drags create. */
export type Tool =
  | { kind: 'select' }
  | { kind: 'hand' }
  | { kind: 'node'; type: NodeType }
  | { kind: 'link'; type: LinkType };

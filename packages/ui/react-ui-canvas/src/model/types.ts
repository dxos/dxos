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

import { HueAnnotationId } from '@dxos/ui-types';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size = Schema.Schema.Type<typeof Size>;

export const Bounds = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
export type Bounds = Schema.Schema.Type<typeof Bounds>;

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

export type NodeId = string;
export type LinkId = string;
/** A node or link id; the two namespaces never collide within a scene. */
export type ElementId = string;
export type SceneId = string;
export type PortId = string;

export const Side = Schema.Literals(['n', 'e', 's', 'w']);
export type Side = Schema.Schema.Type<typeof Side>;

/** What a port takes: links leaving it, links arriving at it, or either (the default). */
export const PortDirection = Schema.Literals(['in', 'out', 'any']);
export type PortDirection = Schema.Schema.Type<typeof PortDirection>;

/** An attachment point on a node's frame: a side, a 0..1 offset along it, and what it accepts. */
export const Port = Schema.Struct({
  id: Schema.String,
  side: Side,
  offset: Schema.Number,
  accepts: Schema.optional(PortDirection),
});
export type Port = Schema.Schema.Type<typeof Port>;

//
// Nodes
//

/** Presentation choices a node carries; every field is optional and the frame supplies the default look. */
export const NodeStyle = Schema.Struct({
  /** One of the theme's hues, colouring fill, text and border together. */
  hue: Schema.optional(Schema.String.annotate({ title: 'Hue', [HueAnnotationId]: true })),
  rounded: Schema.optional(Schema.Boolean),
  fill: Schema.optional(Schema.Boolean),
  border: Schema.optional(Schema.Boolean),
  /** A guide: drawn dashed and unfilled, an annotation rather than content. */
  guide: Schema.optional(Schema.Boolean),
  /**
   * Text size in the node's own scene units. A nested scene's units are finer than its parent's by the
   * portal's factor, so a node created deeper carries a proportionally larger value and reads the same
   * on screen at every level.
   */
  fontSize: Schema.optional(Schema.Number.annotate({ title: 'Font size' })),
  /** Extra classes on the frame, for a host's own look. */
  className: Schema.optional(Schema.String),
});
export type NodeStyle = Schema.Schema.Type<typeof NodeStyle>;

/** The fields every node type shares; a type's schema is `Schema.Struct({ ...nodeBase, type: Literal, ... })`. */
export const nodeBase = {
  id: Schema.String,
  /** Fractional z-order key (see `order.ts`). */
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  center: Point,
  /** The frame is `size` centred on `center`, whatever the type draws inside it. */
  size: Size,
  /** Per-node ports; absent means the node type's definition supplies them (decision 12). */
  ports: Schema.optional(Schema.Array(Port)),
  style: Schema.optional(NodeStyle),
};

/** Any node as the engine sees it: the shared fields and a type name; the registry knows the rest. */
export const NodeBase = Schema.Struct({ type: Schema.String, ...nodeBase });
export type NodeBase = Schema.Schema.Type<typeof NodeBase>;

export const RectNode = Schema.Struct({
  type: Schema.Literal('rect'),
  ...nodeBase,
  label: Schema.optional(Schema.String),
});
export type RectNode = Schema.Schema.Type<typeof RectNode>;

/** An ellipse inscribed in the frame. */
export const EllipseNode = Schema.Struct({
  type: Schema.Literal('ellipse'),
  ...nodeBase,
  label: Schema.optional(Schema.String),
});
export type EllipseNode = Schema.Schema.Type<typeof EllipseNode>;

/** UML class box: a name compartment over attribute and method compartments. */
export const ClassNode = Schema.Struct({
  type: Schema.Literal('class'),
  ...nodeBase,
  name: Schema.String,
  attributes: Schema.Array(Schema.String),
  methods: Schema.Array(Schema.String),
});
export type ClassNode = Schema.Schema.Type<typeof ClassNode>;

/** Free text on the canvas. Named for what it is, so a host may keep `text` for a type of its own. */
export const NoteNode = Schema.Struct({
  type: Schema.Literal('note'),
  ...nodeBase,
  text: Schema.String,
});
export type NoteNode = Schema.Schema.Type<typeof NoteNode>;

/** Portal to the next depth: renders the referenced scene scaled into this node's bounds. */
export const PortalNode = Schema.Struct({
  type: Schema.Literal('scene'),
  ...nodeBase,
  scene: Schema.String,
});
export type PortalNode = Schema.Schema.Type<typeof PortalNode>;

/** The engine's own node types. A host may add its own (decision 1); those are `NodeBase` to the engine. */
export const BuiltinNode = Schema.Union([RectNode, EllipseNode, ClassNode, NoteNode, PortalNode]);
export type BuiltinNode = Schema.Schema.Type<typeof BuiltinNode>;
export type BuiltinNodeType = BuiltinNode['type'];
export const NODE_TYPES: readonly BuiltinNodeType[] = ['rect', 'ellipse', 'class', 'note', 'scene'];

/** A node of the scene: the engine handles any `NodeBase`; built-in code narrows with the guards below. */
export type Node = NodeBase;
/** A node type name; the engine's own are `BuiltinNodeType`. */
export type NodeType = string;

/** Narrows a node to one built-in type; sound because the registry maps each type name to one schema. */
export const isRectNode = (node: NodeBase): node is RectNode => node.type === 'rect';
export const isEllipseNode = (node: NodeBase): node is EllipseNode => node.type === 'ellipse';
export const isClassNode = (node: NodeBase): node is ClassNode => node.type === 'class';
export const isNoteNode = (node: NodeBase): node is NoteNode => node.type === 'note';
export const isPortalNode = (node: NodeBase): node is PortalNode => node.type === 'scene';
export const isBuiltinNode = (node: NodeBase): node is BuiltinNode => NODE_TYPES.some((type) => type === node.type);

//
// Links
//

/** A link end on a node; no `port` means automatic (the closest appropriate pair, recomputed on every projection). */
export const PortEndpoint = Schema.Struct({
  node: Schema.String,
  port: Schema.optional(Schema.String),
});
export type PortEndpoint = Schema.Schema.Type<typeof PortEndpoint>;

/** A free link end at a scene point (decision 3): an arrow or path that starts or ends on nothing. */
export const PointEndpoint = Schema.Struct({ point: Point });
export type PointEndpoint = Schema.Schema.Type<typeof PointEndpoint>;

export const Endpoint = Schema.Union([PortEndpoint, PointEndpoint]);
export type Endpoint = Schema.Schema.Type<typeof Endpoint>;

export const isPointEndpoint = (end: Endpoint): end is PointEndpoint => 'point' in end;
/** The node an end is attached to; a free end has none. */
export const endpointNode = (end: Endpoint): NodeId | undefined => ('node' in end ? end.node : undefined);

/** What is drawn at a link end. */
export const Marker = Schema.Literals(['arrow', 'circle']);
export type Marker = Schema.Schema.Type<typeof Marker>;

/** Markers at the source (`start`) and target (`end`) of a link. */
export const LinkEnds = Schema.Struct({
  start: Schema.optional(Marker),
  end: Schema.optional(Marker),
});
export type LinkEnds = Schema.Schema.Type<typeof LinkEnds>;

const linkBase = {
  id: Schema.String,
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  source: Endpoint,
  target: Endpoint,
  /** Shorthand for `ends: { end: 'arrow' }`; ports with `accepts` constrain which end lands where. */
  directed: Schema.optional(Schema.Boolean),
  /** Explicit end markers; when present they replace what `directed` implies. */
  ends: Schema.optional(LinkEnds),
};

export const LineLink = Schema.Struct({ type: Schema.Literal('line'), ...linkBase });
export type LineLink = Schema.Schema.Type<typeof LineLink>;

/** Cubic Bézier leaving each port along its side's normal. */
export const CurveLink = Schema.Struct({ type: Schema.Literal('curve'), ...linkBase });
export type CurveLink = Schema.Schema.Type<typeof CurveLink>;

/** Smooth curve through the ports and the control `points` in between, in order. */
export const SplineLink = Schema.Struct({
  type: Schema.Literal('spline'),
  ...linkBase,
  points: Schema.Array(Point),
});
export type SplineLink = Schema.Schema.Type<typeof SplineLink>;

/**
 * Routed between its ends rather than drawn: a stub leaves each port along its side's normal and the
 * route joins the two. Nothing is stored, so the path follows the nodes as they move.
 */
export const SmartLink = Schema.Struct({ type: Schema.Literal('smart'), ...linkBase });
export type SmartLink = Schema.Schema.Type<typeof SmartLink>;

export const Link = Schema.Union([LineLink, CurveLink, SplineLink, SmartLink]);
export type Link = Schema.Schema.Type<typeof Link>;
export type LinkType = Link['type'];
export const LINK_TYPES: readonly LinkType[] = ['line', 'curve', 'spline', 'smart'];

export type Element = Node | Link;

/** The markers a link draws: its explicit `ends`, else an arrowhead at the target when it is `directed`. */
export const linkMarkers = (link: Link): LinkEnds => link.ends ?? (link.directed ? { end: 'arrow' } : {});

export const isNode = (element: Element): element is Node => 'center' in element;
export const isLink = (element: Element): element is Link => 'source' in element;

//
// Scene
//

/**
 * The scene schema over a set of node schemas: a host composes it from its registry's types, so the
 * schema stays exact for every type while the engine only ever sees `NodeBase`.
 */
export const createSceneSchema = <const Nodes extends readonly Schema.Codec<NodeBase, unknown>[]>(nodes: Nodes) =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    nodes: Schema.Record(Schema.String, Schema.Union(nodes)),
    links: Schema.Record(Schema.String, Link),
  });

/** The scene schema over the built-in node types. */
export const Scene = createSceneSchema([RectNode, EllipseNode, ClassNode, NoteNode, PortalNode]);

/** The scene schema over any node with the shared fields: what the engine itself can validate for a host. */
export const OpenScene = createSceneSchema([NodeBase]);
export type Scene = {
  readonly id: SceneId;
  readonly name?: string;
  readonly nodes: Readonly<Record<NodeId, Node>>;
  readonly links: Readonly<Record<LinkId, Link>>;
};

/** A node or link of the scene by id. */
export const getElement = (scene: Scene, id: ElementId): Element | undefined => scene.nodes[id] ?? scene.links[id];

/** Property edits: the shared fields typed, a type's own fields by name. */
export type NodeValues = Partial<Omit<NodeBase, 'id' | 'type'>> & { readonly [key: string]: unknown };
export type LinkValues = Partial<Omit<Link, 'id' | 'type'>>;

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

/** Minor grid spacing in scene px (the finest line the grid draws at zoom 1). */
export const DEFAULT_GRID = 16;

/** Major lines every N minor lines; the grid draws both and snapping uses the major one. */
export const MAJOR_GRID_RATIO = 4;

/** Snap unit: nodes, layout defaults and scene bounds align to it. */
export const MAJOR_GRID = DEFAULT_GRID * MAJOR_GRID_RATIO;

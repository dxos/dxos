//
// Copyright 2026 DXOS.org
//

//
// Scene engine types (docs/DESIGN.md §4). Plain Effect schemas: no ECHO yet, so the same shapes wrap
// into an ECHO type later without change. A diagram is one scene of typed nodes and typed links; a
// node has a centre plus the properties its type needs; a portal node references another scene.
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

/** An attachment point on a node's frame: a side and a 0..1 offset along it. */
export const Port = Schema.Struct({ id: Schema.String, side: Side, offset: Schema.Number });
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
});
export type NodeStyle = Schema.Schema.Type<typeof NodeStyle>;

const nodeBase = {
  id: Schema.String,
  /** Fractional z-order key (see `order.ts`). */
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  center: Point,
  /** Per-node ports; absent means the node type's definition supplies them (decision 12). */
  ports: Schema.optional(Schema.Array(Port)),
  style: Schema.optional(NodeStyle),
};

export const RectNode = Schema.Struct({
  type: Schema.Literal('rect'),
  ...nodeBase,
  size: Size,
  label: Schema.optional(Schema.String),
});
export type RectNode = Schema.Schema.Type<typeof RectNode>;

export const EllipseNode = Schema.Struct({
  type: Schema.Literal('ellipse'),
  ...nodeBase,
  rx: Schema.Number,
  ry: Schema.Number,
  label: Schema.optional(Schema.String),
});
export type EllipseNode = Schema.Schema.Type<typeof EllipseNode>;

/** UML class box: a name compartment over attribute and method compartments. */
export const ClassNode = Schema.Struct({
  type: Schema.Literal('class'),
  ...nodeBase,
  size: Size,
  name: Schema.String,
  attributes: Schema.Array(Schema.String),
  methods: Schema.Array(Schema.String),
});
export type ClassNode = Schema.Schema.Type<typeof ClassNode>;

export const TextNode = Schema.Struct({
  type: Schema.Literal('text'),
  ...nodeBase,
  size: Size,
  text: Schema.String,
});
export type TextNode = Schema.Schema.Type<typeof TextNode>;

/** Portal to the next depth: renders the referenced scene scaled into this node's bounds. */
export const PortalNode = Schema.Struct({
  type: Schema.Literal('scene'),
  ...nodeBase,
  size: Size,
  scene: Schema.String,
});
export type PortalNode = Schema.Schema.Type<typeof PortalNode>;

export const Node = Schema.Union([RectNode, EllipseNode, ClassNode, TextNode, PortalNode]);
export type Node = Schema.Schema.Type<typeof Node>;
export type NodeType = Node['type'];
export const NODE_TYPES: readonly NodeType[] = ['rect', 'ellipse', 'class', 'text', 'scene'];

//
// Links
//

/** A link end; no `port` means automatic (the closest appropriate pair, recomputed on every projection). */
export const Endpoint = Schema.Struct({
  node: Schema.String,
  port: Schema.optional(Schema.String),
});
export type Endpoint = Schema.Schema.Type<typeof Endpoint>;

const linkBase = {
  id: Schema.String,
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
  source: Endpoint,
  target: Endpoint,
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

export const Link = Schema.Union([LineLink, CurveLink, SplineLink]);
export type Link = Schema.Schema.Type<typeof Link>;
export type LinkType = Link['type'];
export const LINK_TYPES: readonly LinkType[] = ['line', 'curve', 'spline'];

export type Element = Node | Link;

export const isNode = (element: Element): element is Node => 'center' in element;
export const isLink = (element: Element): element is Link => 'source' in element;

//
// Scene
//

export const Scene = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  nodes: Schema.Record(Schema.String, Node),
  links: Schema.Record(Schema.String, Link),
});
export type Scene = Schema.Schema.Type<typeof Scene>;

/** A node or link of the scene by id. */
export const getElement = (scene: Scene, id: ElementId): Element | undefined => scene.nodes[id] ?? scene.links[id];

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
  | { kind: 'update'; id: ElementId; values: Partial<Node> | Partial<Link> }
  /** Several intents applied as one model change (one undo step), e.g. a paste. */
  | { kind: 'batch'; intents: Intent[] };

export type Capabilities = {
  move?: boolean;
  resize?: boolean;
  link?: boolean;
  create?: boolean;
  delete?: boolean;
  update?: boolean;
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

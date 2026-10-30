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
  DiagramNode,
  type Element,
  type ElementId,
  EllipseNode,
  GeneratorNode,
  InstanceNode,
  Layer,
  type LayerId,
  Link,
  type LinkId,
  type LinkType,
  type Node,
  NodeBase,
  type NodeId,
  type NodeType,
  NoteNode,
  PathNode,
  Point,
  PolygonNode,
  PolylineNode,
  RectNode,
  type ViewId,
  ViewNode,
  withLegacyNodeType,
  withLegacyParams,
} from '@dxos/scene';

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

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
  Object.values(view.nodes).some((node) => withLegacyNodeType(node) !== node || withLegacyParams(node) !== node)
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

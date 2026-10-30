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
  type Element,
  type ElementId,
  Layer,
  type LayerId,
  Link,
  type LinkId,
  type LinkType,
  type Node,
  NodeBase,
  type NodeId,
  type NodeType,
  type ViewId,
} from '@dxos/scene';

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

//
// Scene
//

/** A plain View, or the definition of a composite object that instances draw (ANIMATION.md §4.1). */
export const ViewKind = Schema.Literals(['view', 'composite']);
export type ViewKind = Schema.Schema.Type<typeof ViewKind>;

export type View = {
  readonly id: ViewId;
  readonly name?: string;
  readonly nodes: Readonly<Record<NodeId, Node>>;
  readonly links: Readonly<Record<LinkId, Link>>;
  readonly layers?: Readonly<Record<LayerId, Layer>>;
  readonly kind?: ViewKind;
  readonly anonymous?: boolean;
};

/** Every list, by id. */
export type ViewMap = Readonly<Record<ViewId, View>>;

/** A node or link of the View by id. */
export const getElement = (scene: View, id: ElementId): Element | undefined => scene.nodes[id] ?? scene.links[id];

/** Property edits: the shared fields typed, a type's own fields by name. */
export type NodeValues = Partial<Omit<NodeBase, 'id' | 'type'>> & { readonly [key: string]: unknown };
/** Per link type, so a spline's `points` are among the values an `update` may set. */
type ValuesOf<T> = T extends unknown ? Partial<Omit<T, 'id' | 'type'>> : never;
export type LinkValues = ValuesOf<Link>;

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

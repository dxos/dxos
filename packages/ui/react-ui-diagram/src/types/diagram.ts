//
// Copyright 2026 DXOS.org
//

//
// Neutral in-memory representation the renderer consumes. Every dialect (Mermaid text, an ECHO
// compute graph, a read-only code AST) normalises onto this, so the renderer never sees a DSL.
//
// NOTE: This lives here pending the `@dxos/graph` rewrite (step 1 of the design), which is where
// these types belong; the field names are already the ones that rewrite preserves.
//

import * as Schema from 'effect/Schema';

export const Point = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});

export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Struct({
  width: Schema.Number,
  height: Schema.Number,
});

export type Size = Schema.Schema.Type<typeof Size>;

export const Side = Schema.Literal('top', 'right', 'bottom', 'left');

export type Side = Schema.Schema.Type<typeof Side>;

/** Named attachment point. `offset` is a 0..1 fraction along the side, so ports survive resizing. */
export const Port = Schema.Struct({
  id: Schema.String,
  side: Side,
  offset: Schema.Number,
});

export type Port = Schema.Schema.Type<typeof Port>;

/** A labelled section within a node; a node with several is a UML-style compartmented box. */
export const Compartment = Schema.Struct({
  id: Schema.String,
  label: Schema.optional(Schema.String),
  lines: Schema.Array(Schema.String),
});

export type Compartment = Schema.Schema.Type<typeof Compartment>;

/**
 * A node, or a group when its kind admits children — there is no separate group entity, which is
 * also how React Flow models it. `parent` is child→parent so multi-parent is unrepresentable.
 */
export const Node = Schema.Struct({
  id: Schema.String,
  /** Ontology kind id; drives the renderer's component lookup and what edits are legal. */
  type: Schema.String,
  label: Schema.optional(Schema.String),
  compartments: Schema.optional(Schema.Array(Compartment)),
  ports: Schema.optional(Schema.Array(Port)),
  parent: Schema.optional(Schema.String),
  /** Resolved by layout, or pinned from the overlay. */
  origin: Schema.optional(Point),
  size: Schema.optional(Size),
});

export type Node = Schema.Schema.Type<typeof Node>;

export const Edge = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  source: Schema.String,
  target: Schema.String,
  sourcePort: Schema.optional(Schema.String),
  targetPort: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
});

export type Edge = Schema.Schema.Type<typeof Edge>;

export const Graph = Schema.Struct({
  nodes: Schema.Array(Node),
  edges: Schema.Array(Edge),
});

export type Graph = Schema.Schema.Type<typeof Graph>;

/**
 * What a dialect's `project` returns. Named for the operation rather than the artifact so it does
 * not collide with the `Diagram` component. `provenance` maps entity id to a dialect-private handle
 * back into the source (a text span, an AST path, a DXN) and is opaque here — only `apply` reads it.
 */
export const Projection = Schema.Struct({
  graph: Graph,
  provenance: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type Projection = Schema.Schema.Type<typeof Projection>;

/**
 * Render-only state that no DSL can express. Persisted separately from the source, so regenerating
 * the projection never discards it.
 */
export type Overlay = {
  /** Pinned positions; absent means the node is laid out automatically. */
  positions?: Record<string, Point>;
  /** Labels for entities whose source is read-only. */
  labels?: Record<string, string>;
  collapsed?: string[];
};

export const emptyOverlay = (): Overlay => ({});

/** Ontology kind reserved for containers. A group is a node, not a separate entity. */
export const GROUP = 'group';

export const isGroup = (node: Node): boolean => node.type === GROUP;

/** Direct children of `id`, in declaration order. */
export const childrenOf = (graph: Graph, id: string | undefined): readonly Node[] =>
  graph.nodes.filter((node) => node.parent === id);

/** Root nodes — those with no parent. */
export const rootsOf = (graph: Graph): readonly Node[] => childrenOf(graph, undefined);

export const findNode = (graph: Graph, id: string): Node | undefined => graph.nodes.find((node) => node.id === id);

//
// Copyright 2023 DXOS.org
//

import type * as Option from 'effect/Option';
import type * as Pipeable from 'effect/Pipeable';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import type { Event } from '@dxos/async';
import { type MakeOptional } from '@dxos/util';

import type * as Node from './AppGraphNode';

//
// The app graph's vocabulary. Deliberately free of runtime dependencies on the store and the
// operations, so both can import it without a cycle — the brand symbols live here for the same
// reason: the store stamps them at class-definition time.
//

/**
 * Identifier denoting a Graph.
 */
export const GraphTypeId: unique symbol = Symbol.for('@dxos/app-graph/Graph');
export type GraphTypeId = typeof GraphTypeId;

/**
 * Identifier for the graph kind discriminator.
 */
export const GraphKind: unique symbol = Symbol.for('@dxos/app-graph/GraphKind');
export type GraphKind = typeof GraphKind;

export type GraphTraversalOptions = {
  /**
   * A callback which is called for each node visited during traversal.
   *
   * If the callback returns `false`, traversal is stops recursing.
   */
  visitor: (node: Node.Node, path: string[]) => boolean | void;

  /**
   * The node to start traversing from.
   *
   * @default ROOT_ID
   */
  source?: string;

  /** The relation(s) to traverse graph edges. */
  relation: Node.RelationInput | Node.RelationInput[];
};

export type GraphProps = {
  registry?: Registry.AtomRegistry;
  nodes?: MakeOptional<Node.Node, 'data' | 'cacheable'>[];
  edges?: Record<string, Edges>;
  onExpand?: (id: string, relation: Node.Relation) => void;
  onRemoveNode?: (id: string) => void;
};

export type Edge = { source: string; target: string; relation: Node.RelationInput };
export type Edges = Record<string, string[]>;

export type GraphKindType = 'readable' | 'expandable' | 'writable';

export interface BaseGraph extends Pipeable.Pipeable {
  readonly [GraphTypeId]: GraphTypeId;
  readonly [GraphKind]: GraphKindType;
  /**
   * Event emitted when a node is changed.
   */
  readonly onNodeChanged: Event<{ id: string; node: Option.Option<Node.Node> }>;
  /**
   * Get the atom key for the JSON representation of the graph.
   */
  json(id?: string): Atom.Atom<any>;
  /**
   * Get the atom key for the node with the given id.
   */
  node(id: string): Atom.Atom<Option.Option<Node.Node>>;
  /**
   * Get the atom key for the node with the given id.
   */
  nodeOrThrow(id: string): Atom.Atom<Node.Node>;
  /**
   * Get the atom key for the connections of the node with the given id.
   */
  connections(id: string, relation: Node.RelationInput): Atom.Atom<Node.Node[]>;
  /**
   * Get the atom key for the actions of the node with the given id.
   */
  actions(id: string): Atom.Atom<(Node.Action | Node.ActionGroup)[]>;
  /**
   * Get the atom key for the edges of the node with the given id.
   */
  edges(id: string): Atom.Atom<Edges>;
  /**
   * Upsert a node directly, bypassing expansion.
   * @internal
   */
  _setNode(id: string, node: Option.Option<Node.Node>): void;
  /**
   * Materialize a node argument into a node without adding it to the graph.
   * @internal
   */
  _constructNode(node: Node.NodeArg<any>): Option.Option<Node.Node>;
}

export type ReadableGraph = BaseGraph & { readonly [GraphKind]: 'readable' | 'expandable' | 'writable' };
export type ExpandableGraph = BaseGraph & { readonly [GraphKind]: 'expandable' | 'writable' };
export type WritableGraph = BaseGraph & { readonly [GraphKind]: 'writable' };

/**
 * Graph interface.
 */
export type Graph = WritableGraph;

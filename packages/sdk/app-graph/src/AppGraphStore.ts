//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type CleanupFn, Event } from '@dxos/async';
import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';
import { failedInvariant, invariant } from '@dxos/invariant';

import * as Node from './AppGraphNode';
import type { BaseGraph, Edges, Graph, GraphProps, WritableGraph } from './graph';
import { normalizeRelation, primaryKey, primaryParts, secondaryKey, secondaryParts, withLabel } from './util';

//
// The store behind the app graph: the model handle, the derived atom families and the expansion
// bookkeeping. Internal to the package — `graph.ts` re-exports the public pieces, so the public
// module carries only the vocabulary and the operations.
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

const graphSymbol = Symbol('graph');

type DeepWriteable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? DeepWriteable<T[K]> : T[K];
};

type NodeInternal = DeepWriteable<Node.Node> & { [graphSymbol]: GraphImpl };

//
// Utilities
//

export const relationKey = (relation: Node.RelationInput): string => {
  const normalized = normalizeRelation(relation);
  return secondaryKey(normalized.kind, normalized.direction);
};

export const relationFromKey = (encoded: string): Node.Relation => {
  const parts = secondaryParts(encoded);
  invariant(parts.length === 2 && parts[0].length > 0 && parts[1].length > 0, `Invalid relation key: ${encoded}`);
  const [kind, directionRaw] = parts;
  invariant(directionRaw === 'outbound' || directionRaw === 'inbound', `Invalid relation direction: ${directionRaw}`);
  return Node.relation(kind, directionRaw);
};

export const connectionKey = (id: string, relation: Node.RelationInput): string =>
  primaryKey(id, relationKey(relation));

const relationFromConnectionKey = (key: string): { id: string; relation: Node.Relation } => {
  const [id, encodedRelation] = primaryParts(key);
  invariant(id && encodedRelation, `Invalid connection key: ${key}`);
  return { id, relation: relationFromKey(encodedRelation) };
};

export const inverseRelation = (relation: Node.RelationInput): Node.Relation => {
  const normalized = normalizeRelation(relation);
  return Node.relation(normalized.kind, normalized.direction === 'outbound' ? 'inbound' : 'outbound');
};

/** Node payload; `data` is undefined for a placeholder the graph has not been given yet. */
type GraphNode = { id: string; data?: Node.Node };

/** Relation lives in `type`; `order` carries the caller's sort position. */
type GraphEdge = { id: string; type: string; source: string; target: string };

/**
 * Every edge is held in its outbound form, so an inbound relation is the same edge read backwards.
 * Without this a relation would have two storage encodings and reads would have to try both.
 */
const storedEdge = (source: string, target: string, relation: string): GraphEdge => {
  const { kind, direction } = relationFromKey(relation);
  const outbound = relationKey(Node.relation(kind, 'outbound'));
  const [from, to] = direction === 'inbound' ? [target, source] : [source, target];
  return { id: primaryKey(from, secondaryKey(outbound, to)), type: outbound, source: from, target: to };
};

const inverseKey = (relation: string): string => relationKey(inverseRelation(relationFromKey(relation)));

const edgesEqual = (a: Edges, b: Edges): boolean => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      const left = a[key];
      const right = b[key];
      return right !== undefined && left.length === right.length && left.every((id, index) => id === right[index]);
    })
  );
};

/**
 * Get the Graph a Node is currently associated with.
 */
export const getGraph = (node: Node.Node): Graph => {
  const graph = (node as NodeInternal)[graphSymbol];
  invariant(graph, 'Node is not associated with a graph.');
  return graph as Graph;
};

/**
 * The Graph represents the user interface information architecture of the application constructed via plugins.
 * @internal
 */
export class GraphImpl implements WritableGraph {
  readonly [GraphTypeId]: GraphTypeId = GraphTypeId;
  readonly [GraphKind] = 'writable' as const;

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
  }

  readonly onNodeChanged = new Event<{
    id: string;
    node: Option.Option<Node.Node>;
  }>();

  readonly _onExpand?: GraphProps['onExpand'];
  readonly _onRemoveNode?: GraphProps['onRemoveNode'];

  readonly _registry: Registry.AtomRegistry;
  readonly _expanded = new Set<string>();
  /** Relation keys a node has held, so an emptied relation still reports an empty list. */
  readonly _relations = new Map<string, Set<string>>();
  readonly _pendingExpands = new Set<string>();

  /**
   * Canonical store. Nodes an edge references before they are contributed sit in it as
   * placeholders, and a removed node leaves one behind, so arrival order is free.
   */
  readonly _model: GraphModel.GraphModel<GraphNode, GraphEdge>;

  /** @internal */
  readonly _node = Atom.family<string, Atom.Atom<Option.Option<Node.Node>>>((id) => {
    return Atom.make((get) => Option.fromUndefinedOr(get(this._model.nodeAtom(id))?.data)).pipe(
      // Cut off on the payload: `Option.some` allocates a fresh wrapper on every recompute, so
      // without this a version bump notifies subscribers of nodes it did not touch.
      Atom.withEquality(
        (a: Option.Option<Node.Node>, b: Option.Option<Node.Node>) =>
          Option.getOrUndefined(a) === Option.getOrUndefined(b),
      ),
      withLabel(`graph:node:${id}`),
    );
  });

  /**
   * The node as the model holds it right now.
   *
   * A flush applies its writes inside {@link batch}, which bumps the version once at the end, so
   * reading {@link Graph._node} from a write path yields the value from before the batch — and
   * `addNode` merges onto what it reads, so that would silently undo an earlier write in the
   * same flush.
   * @internal
   */
  _currentNode(id: string): Option.Option<Node.Node> {
    return Option.fromUndefinedOr(this._model.findNode(id)?.data);
  }

  /**
   * One mount per node in the graph, keeping its atoms alive for as long as the node is.
   *
   * The atoms are views over the model, so a dropped atom loses no data — but it does lose its
   * registry wiring: a family re-creates the atom on the next call, subscribers of the old identity
   * are stranded, and an atom that has only ever been subscribed to has no parents, so nothing can
   * invalidate it. The original design pinned every graph atom with `Atom.keepAlive` for the same
   * reason; a mount is the revocable form — {@link release} cancels it, the registry drops the
   * atom's node, and the family's weak memoization lets the atom itself be collected.
   * @internal
   */
  readonly _pins = new Map<string, CleanupFn>();

  /** @internal */
  _pin(id: string): void {
    if (!this._pins.has(id)) {
      this._pins.set(id, this._registry.mount(this._node(id)));
    }
  }

  /** @internal */
  _unpin(id: string): void {
    const cancel = this._pins.get(id);
    if (cancel) {
      this._pins.delete(id);
      cancel();
    }
  }

  /** The outgoing and inbound edges as the model holds them right now; see {@link Graph._currentNode}. @internal */
  _currentEdges(id: string): Edges {
    return this._computeEdges(id);
  }

  /** {@link Graph._currentEdges}; separate so the `_edges` atom body reads it without indirection. */
  _computeEdges(id: string): Edges {
    const edges: Edges = {};
    for (const relation of this._relations.get(id) ?? []) {
      edges[relation] = [];
    }
    for (const edge of this._model.outgoing(id)) {
      (edges[edge.type] ??= []).push(edge.target);
    }
    for (const edge of this._model.incoming(id)) {
      (edges[inverseKey(edge.type)] ??= []).push(edge.source);
    }
    return edges;
  }

  readonly _nodeOrThrow = Atom.family<string, Atom.Atom<Node.Node>>((id) => {
    return Atom.make((get) => {
      const node = get(this._node(id));
      invariant(Option.isSome(node), `Node not available: ${id}`);
      return node.value;
    });
  });

  readonly _edges = Atom.family<string, Atom.Atom<Edges>>((id) => {
    return Atom.make((get) => {
      get(this._model.version);
      return this._computeEdges(id);
    }).pipe(Atom.withEquality(edgesEqual), withLabel(`graph:edges:${id}`));
  });

  // NOTE: Currently the argument to the family needs to be referentially stable for the atom to be referentially stable.
  // TODO(wittjosiah): Atom feature request, support for something akin to `ComplexMap` to allow for complex arguments.
  readonly _connections = Atom.family<string, Atom.Atom<Node.Node[]>>((key) => {
    const parts = key ? primaryParts(key) : [];
    // An empty id (e.g. `useConnections(graph, undefined, ...)`) yields a key with two parts but no
    // id — treat that as no connections rather than throwing.
    if (parts.length < 2 || !parts[0]) {
      return Atom.make((): Node.Node[] => []);
    }

    const { id, relation } = relationFromConnectionKey(key);
    return Atom.make((get) =>
      (get(this._edges(id))[relationKey(relation)] ?? [])
        .map((childId) => get(this._node(childId)))
        .filter(Option.isSome)
        .map((node) => node.value),
    ).pipe(
      // Depend on each child's own atom so a child's change invalidates this view, but cut off on the
      // resolved list: without this a no-op re-add re-allocates the Options and notifies spuriously.
      Atom.withEquality(
        (a: Node.Node[], b: Node.Node[]) => a.length === b.length && a.every((node, index) => node === b[index]),
      ),
      withLabel(`graph:connections:${key}`),
    );
  });

  readonly _actions = Atom.family<string, Atom.Atom<(Node.Action | Node.ActionGroup)[]>>((id) => {
    return Atom.make((get) => {
      if (!id) {
        return [];
      }
      return get(this._connections(connectionKey(id, Node.actionRelation()))) as (Node.Action | Node.ActionGroup)[];
    }).pipe(withLabel(`graph:actions:${id}`));
  });

  readonly _json = Atom.family<string, Atom.Atom<any>>((id) => {
    return Atom.make((get) => {
      get(this._model.version);
      return this._model.toTree(
        id,
        (node, children: any[]) => {
          const data = node.data ?? failedInvariant(`Node not available: ${node.id}`);
          return {
            id: data.id,
            type: data.type,
            ...(data.properties.label ? { label: data.properties.label } : {}),
            ...(children.length ? { nodes: children } : {}),
          };
        },
        relationKey('child'),
      );
    }).pipe(withLabel(`graph:json:${id}`));
  });

  constructor({ registry, nodes, edges, onExpand, onRemoveNode }: GraphProps = {}) {
    this._registry = registry ?? Registry.make();
    this._onExpand = onExpand;
    this._onRemoveNode = onRemoveNode;
    this._model = new GraphModel.GraphModel<GraphNode, GraphEdge>({ registry: this._registry });

    this._model.batch(() => {
      this._setNode(GraphNode.RootId, this._constructNode({ id: GraphNode.RootId, type: Node.RootType, data: null }));
      nodes?.forEach((node) => this._setNode(node.id, this._constructNode(node)));
      Object.entries(edges ?? {}).forEach(([source, relations]) => {
        Object.entries(relations).forEach(([relation, targets]) => {
          targets.forEach((target) => this._setEdge(source, target, relation));
        });
      });
    });
  }

  json(id = GraphNode.RootId): Atom.Atom<any> {
    return this._json(id);
  }

  node(id: string): Atom.Atom<Option.Option<Node.Node>> {
    return this._node(id);
  }

  nodeOrThrow(id: string): Atom.Atom<Node.Node> {
    return this._nodeOrThrow(id);
  }

  connections(id: string, relation: Node.RelationInput): Atom.Atom<Node.Node[]> {
    return this._connections(connectionKey(id, relation));
  }

  actions(id: string): Atom.Atom<(Node.Action | Node.ActionGroup)[]> {
    return this._actions(id);
  }

  edges(id: string): Atom.Atom<Edges> {
    return this._edges(id);
  }

  /** @internal */
  _constructNode(node: Node.NodeArg<any>): Option.Option<Node.Node> {
    return Option.some({
      [graphSymbol]: this,
      data: null,
      properties: {},
      ...node,
    });
  }

  /**
   * Writes the node payload, materializing a placeholder slot when the id is new.
   * @internal
   */
  _setNode(id: string, node: Option.Option<Node.Node>): void {
    this._model.setNode({ id, data: Option.getOrUndefined(node) });
    // After the write, so the atom materializes with the value rather than with `none`.
    this._pin(id);
  }

  /** @internal */
  _setEdge(source: string, target: string, relation: string): void {
    this._trackRelation(source, relation);
    this._trackRelation(target, inverseKey(relation));
    const stored = storedEdge(source, target, relation);
    if (this._model.findEdge(stored.id)) {
      return;
    }

    this._model.addEdge(stored);
  }

  /** @internal */
  _removeEdge(source: string, target: string, relation: string): void {
    // `detachEdge`, not `removeEdge`: the latter hands back the removed edge as a graph, and nothing
    // here reads it.
    this._model.detachEdge(storedEdge(source, target, relation).id);
  }

  /** @internal */
  _trackRelation(id: string, relation: string): void {
    const relations = this._relations.get(id) ?? new Set<string>();
    relations.add(relation);
    this._relations.set(id, relations);
  }
}

/**
 * The implementation behind a graph handle. Exported for this package's tests, which assert against
 * the model and expansion bookkeeping; not part of the public surface.
 * @internal
 */
export const getInternal = (graph: BaseGraph): GraphImpl => {
  return graph as unknown as GraphImpl;
};

/**
 * Creates a new Graph instance.
 */
export const make = (params?: GraphProps): Graph => {
  return new GraphImpl(params);
};

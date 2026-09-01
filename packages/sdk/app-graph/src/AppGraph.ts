//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type CleanupFn, Event, Trigger } from '@dxos/async';
import { todo } from '@dxos/debug';
import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';
import { failedInvariant, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MakeOptional } from '@dxos/util';

import { scheduleTask } from '#scheduler';

import * as Node from './AppGraphNode.ts';
import {
  normalizeRelation,
  primaryKey,
  primaryParts,
  secondaryKey,
  secondaryParts,
  shallowEqual,
  withLabel,
} from './util.ts';

//
// The app graph: the vocabulary, the store that holds it, and the operations over it. One module
// because the store stamps the brand symbols at class-definition time and the operations reach into
// the store — split across files those are mutually recursive imports, and the class body runs
// against an uninitialized binding.
//

//
// Vocabulary.
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

//
// The store: the model handle, the derived atom families and the expansion bookkeeping.
//

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

/**
 * Convert the graph to a JSON object.
 */
export const toJSON = (graph: BaseGraph, id = GraphNode.RootId): object => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._json(id));
};

/**
 * Get the node with the given id from the graph's registry.
 */
export const getNode = (graph: BaseGraph, id: string): Option.Option<Node.Node> => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._node(id));
};

/**
 * Get the node with the given id from the graph's registry.
 *
 * @throws If the node is Option.none().
 */
export const getNodeOrThrow = (graph: BaseGraph, id: string): Node.Node => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._nodeOrThrow(id));
};

/**
 * Get the root node of the graph.
 * This is an alias for `getNodeOrThrow(graph, ROOT_ID)`.
 */
export function getRoot(graph: BaseGraph): Node.Node {
  return getNodeOrThrow(graph, GraphNode.RootId);
}

/**
 * Get all nodes connected to the node with the given id by the given relation from the graph's registry.
 */
export const getConnections = (graph: BaseGraph, id: string, relation: Node.RelationInput): Node.Node[] => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._connections(connectionKey(id, relation)));
};

/**
 * Get all actions connected to the node with the given id from the graph's registry.
 */
export const getActions = (graph: BaseGraph, id: string): Node.Node[] => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._actions(id));
};

/**
 * Get the edges from the node with the given id from the graph's registry.
 */
export const getEdges = (graph: BaseGraph, id: string): Edges => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._edges(id));
};

/**
 * Recursive depth-first traversal of the graph.
 */
export const traverse = (graph: BaseGraph, options: GraphTraversalOptions, path: string[] = []): void => {
  const { visitor, source = GraphNode.RootId, relation } = options;
  // Break cycles.
  if (path.includes(source)) {
    return;
  }

  const node = getNodeOrThrow(graph, source);
  const shouldContinue = visitor(node, [...path, source]);
  if (shouldContinue === false) {
    return;
  }

  const relations = Array.isArray(relation) ? relation : [relation];
  const seen = new Set<string>();
  for (const rel of relations) {
    for (const connected of getConnections(graph, source, rel)) {
      if (!seen.has(connected.id)) {
        seen.add(connected.id);
        traverse(graph, { source: connected.id, relation, visitor }, [...path, source]);
      }
    }
  }
};

/**
 * Get the path between two nodes in the graph.
 */
export const getPath = (graph: BaseGraph, params: { source?: string; target: string }): Option.Option<string[]> => {
  return Function.pipe(
    getNode(graph, params.source ?? 'root'),
    Option.flatMap((node) => {
      let found: Option.Option<string[]> = Option.none();
      traverse(graph, {
        source: node.id,
        relation: 'child',
        visitor: (node, path) => {
          if (Option.isSome(found)) {
            return false;
          }

          if (node.id === params.target) {
            found = Option.some(path);
          }
        },
      });

      return found;
    }),
  );
};

/**
 * Wait for the path between two nodes in the graph to be established.
 */
export const waitForPath = (
  graph: BaseGraph,
  params: { source?: string; target: string },
  options?: { timeout?: number; interval?: number },
): Promise<string[]> => {
  const { timeout = 5_000, interval = 500 } = options ?? {};
  const path = getPath(graph, params);
  if (Option.isSome(path)) {
    return Promise.resolve(path.value);
  }

  const trigger = new Trigger<string[]>();
  const i = setInterval(() => {
    const path = getPath(graph, params);
    if (Option.isSome(path)) {
      trigger.wake(path.value);
    }
  }, interval);

  return trigger.wait({ timeout }).finally(() => clearInterval(i));
};

/**
 * Resolves when the node exists in the graph; immediately if it already does.
 *
 * The graph is populated asynchronously — connectors expand a level at a time and the objects
 * behind them load out of band — and {@link expandSync} is fire-and-forget, so a consumer that needs
 * a specific node has no completion to await and would otherwise poll for it.
 *
 * Deliberately unbounded: whether a node is merely late or will never arrive is the caller's
 * question, so the deadline belongs at the call site (`Effect.timeout`). Interrupting is safe —
 * the subscription is released on interruption.
 */
export const waitFor = (graph: BaseGraph, id: string): Effect.Effect<Node.Node> =>
  Effect.suspend(() => {
    const current = getNode(graph, id);
    if (Option.isSome(current)) {
      return Effect.succeed(current.value);
    }

    return Effect.callback<Node.Node>((resume) => {
      const unsubscribe = graph.onNodeChanged.on(({ id: changed, node }) => {
        if (changed === id && Option.isSome(node)) {
          unsubscribe();
          resume(Effect.succeed(node.value));
        }
      });

      // Re-read after subscribing: a node added between the read above and the subscription
      // emits nothing further, and the wait would hang on an event that already happened.
      const raced = getNode(graph, id);
      if (Option.isSome(raced)) {
        unsubscribe();
        resume(Effect.succeed(raced.value));
      }

      return Effect.sync(() => unsubscribe());
    });
  });

/**
 * Implementation helper for expandSync.
 * If the node does not exist yet, the expand is recorded as pending and applied when the node is added.
 *
 * Fires the `onExpand` callback to add connections to the node. That callback subscribes to the node's
 * connector atom immediately, so every matching builder extension runs before this returns — which is why
 * anything on a paint-critical path (a pointer handler, a render) should prefer {@link expand}.
 *
 * Expanding a node that is already expanded for the same relation is a no-op.
 */
export const expandSync = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.RelationInput,
): T => {
  const internal = getInternal(graph);
  const normalizedRelation = normalizeRelation(relation);
  const key = primaryKey(id, relationKey(normalizedRelation));
  const nodeOpt = internal._currentNode(id);
  if (Option.isNone(nodeOpt)) {
    // Node not yet in graph: record expand to run when the node is added.
    internal._pendingExpands.add(key);
    log('expand', { key, deferred: true });
    return graph;
  }

  const expanded = internal._expanded.has(key);
  log('expand', { key, expanded });
  if (!expanded) {
    internal._expanded.add(key);
    internal._onExpand?.(id, normalizedRelation);
  }
  return graph;
};

/**
 * Expand a node in the graph, off the paint-critical path.
 *
 * Yields to the main thread before running {@link expandSync}, so a caller reacting to input does not
 * block the frame. Interrupting the effect cancels a still-pending expansion, which makes rescheduling
 * (e.g. superseding a hover with the next one) a matter of interrupting the previous fiber.
 */
export const expand = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.RelationInput,
): Effect.Effect<void> =>
  Effect.promise((signal) =>
    scheduleTask(
      () => {
        expandSync(graph, id, relation);
      },
      { strategy: 'idle', signal },
    ),
  );

/**
 * Sort the edges of the node with the given id.
 */
export const sortEdges = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.RelationInput,
  order: string[],
): T => {
  const internal = getInternal(graph);
  const edges = internal._currentEdges(id);
  const relationId = relationKey(relation);
  const current = edges[relationId] ?? [];
  // Set membership, not `includes`: both filters run over the whole relation, and a connector
  // sorting its output makes an array scan here quadratic in the number of siblings.
  const ordered = new Set(order);
  const existing = new Set(current);
  const unsorted = current.filter((id) => !ordered.has(id));
  const sorted = order.filter((id) => existing.has(id));
  const newOrder = [...sorted, ...unsorted];
  if (newOrder.length === current.length && newOrder.every((id, i) => id === current[i])) {
    return graph;
  }
  // Insertion order carries the sort, so reordering means re-adding the relation's edges.
  internal._model.batch(() => {
    current.forEach((target) => internal._removeEdge(id, target, relationId));
    newOrder.forEach((target) => internal._setEdge(id, target, relationId));
  });
  return graph;
};

/**
 * Applies `fn`'s writes as a single observable change: the model bumps its version once, so derived
 * views recompute and notify once for the whole group.
 */
export const batch = <T extends WritableGraph, A>(graph: T, fn: () => A): A => getInternal(graph)._model.batch(fn);

/**
 * Unloads the nodes: they leave the model outright, along with the expansion bookkeeping that would
 * otherwise keep the graph remembering ids it will never be asked about again.
 *
 * Unlike {@link removeNodes} this leaves no tombstone, so a subsequent read of a released relation
 * expands it afresh rather than resolving to an emptied node.
 */
export const release = <T extends WritableGraph>(graph: T, ids: readonly string[]): T => {
  const internal = getInternal(graph);
  internal._model.batch(() => {
    for (const id of ids) {
      internal._unpin(id);
      internal._relations.delete(id);
      releaseExpansion(internal, id);
    }

    internal._model.release(ids);
  });

  return graph;
};

/** Forgets that any relation of `id` was ever expanded, so the next read expands it again. */
const releaseExpansion = (internal: GraphImpl, id: string): void => {
  for (const set of [internal._expanded, internal._pendingExpands]) {
    for (const key of [...set]) {
      if (primaryParts(key)[0] === id) {
        set.delete(key);
      }
    }
  }
};

/**
 * Forgets that `relation` of `id` was expanded. Paired with the builder tearing down the matching
 * connector subscription, so a relation whose contents were released re-expands rather than
 * resolving to the emptied list it had before.
 */
export const releaseRelation = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: string,
): T => {
  const internal = getInternal(graph);
  const key = primaryKey(id, relation);
  internal._expanded.delete(key);
  internal._pendingExpands.delete(key);
  return graph;
};

/**
 * Add nodes to the graph.
 */
export const addNodes = <T extends WritableGraph>(graph: T, nodes: Node.NodeArg<any, Record<string, any>>[]): T => {
  // The model's own depth counter, not `Atom.batch`: these calls nest (a node applies its inline
  // children and edges), and a nested `Atom.batch` leaves the registry in its collect phase after
  // the inner call returns, so invalidations raised afterwards are gathered and then discarded
  // without ever being rebuilt. The version atom still bumps once for the whole group.
  getInternal(graph)._model.batch(() => {
    nodes.map((node) => addNode(graph, node));
  });
  return graph;
};

/**
 * Add a node to the graph.
 */
export const addNode = <T extends WritableGraph>(graph: T, nodeArg: Node.NodeArg<any, Record<string, any>>): T => {
  const internal = getInternal(graph);
  // Extract known NodeArg fields, preserve any extra fields (like _actionContext) in rest.
  const {
    nodes,
    actions,
    edges,
    id,
    type,
    data = null,
    properties = {},
    ...rest
  } = nodeArg as Node.NodeArg<any> & {
    _actionContext?: Node.ActionContext;
  };
  const existingNode = internal._currentNode(id);
  Option.match(existingNode, {
    onSome: (existing) => {
      const typeChanged = existing.type !== type;
      const dataChanged = !shallowEqual(existing.data, data);
      const propertiesChanged = Object.keys(properties).some((key) => existing.properties[key] !== properties[key]);
      // `changed` is on the visit log because counting `existing node` lines alone measures how often a
      // node was re-offered, not how often it actually changed — two very different costs.
      const changed = typeChanged || dataChanged || propertiesChanged;
      log('existing node', {
        id,
        changed,
        typeChanged,
        dataChanged,
        propertiesChanged,
      });
      if (changed) {
        log('updating node', { id, type, data, properties });
        const newNode = Option.some({
          ...existing,
          ...rest,
          type,
          data,
          // Merged, not replaced, so several extensions can each contribute properties to one node —
          // which makes a key one generation sets and the next omits impossible to clear. A builder
          // that varies a property must emit it on every generation, `false`/`undefined` included.
          properties: { ...existing.properties, ...properties },
        });
        internal._setNode(id, newNode);
        graph.onNodeChanged.emit({ id, node: newNode });
      }
    },
    onNone: () => {
      log('new node', { id, type, data, properties });
      const newNode = internal._constructNode({ id, type, data, properties, ...rest });
      internal._setNode(id, newNode);
      graph.onNodeChanged.emit({ id, node: newNode });

      // Apply any expands that were deferred because this node did not exist yet.
      const toApply = [...internal._pendingExpands].filter((k) => primaryParts(k)[0] === id);
      for (const pendingKey of toApply) {
        internal._pendingExpands.delete(pendingKey);
        const relation = relationFromKey(primaryParts(pendingKey)[1]);
        internal._expanded.add(pendingKey);
        internal._onExpand?.(id, relation);
      }
    },
  });

  if (nodes) {
    addNodes(graph, nodes);
    const _edges = nodes.map((node) => ({ source: id, target: node.id, relation: 'child' as const }));
    addEdges(graph, _edges);
    sortEdges(
      graph,
      id,
      'child',
      nodes.map((n) => n.id),
    );
  }

  if (actions) {
    addNodes(graph, actions);
    const actionRelation = Node.actionRelation();
    const _edges = actions.map((node) => ({ source: id, target: node.id, relation: actionRelation }));
    addEdges(graph, _edges);
    sortEdges(
      graph,
      id,
      actionRelation,
      actions.map((node) => node.id),
    );
  }

  if (edges) {
    todo();
  }
  return graph;
};

/**
 * Remove nodes from the graph.
 */
export const removeNodes = <T extends WritableGraph>(graph: T, ids: string[], edges = false): T => {
  getInternal(graph)._model.batch(() => {
    ids.map((id) => removeNode(graph, id, edges));
  });
  return graph;
};

/**
 * Remove a node from the graph.
 */
export const removeNode = <T extends WritableGraph>(graph: T, id: string, edges = false): T => {
  const internal = getInternal(graph);
  internal._setNode(id, Option.none());
  graph.onNodeChanged.emit({ id, node: Option.none() });
  // TODO(wittjosiah): Reset expanded and initialized flags?

  if (edges) {
    const nodeEdges = internal._currentEdges(id);
    const edgesToRemove: Edge[] = [];
    for (const [relationKeyValue, relatedIds] of Object.entries(nodeEdges)) {
      const relation = relationFromKey(relationKeyValue);
      const isInboundRelation = relation.direction === 'inbound';
      for (const relatedId of relatedIds) {
        if (isInboundRelation) {
          // Inbound edge lists store source node IDs; reconstruct the canonical outbound edge.
          edgesToRemove.push({ source: relatedId, target: id, relation: inverseRelation(relation) });
        } else {
          edgesToRemove.push({ source: id, target: relatedId, relation });
        }
      }
    }
    removeEdges(graph, edgesToRemove);
  }

  internal._onRemoveNode?.(id);
  return graph;
};

/**
 * Add edges to the graph.
 */
export const addEdges = <T extends WritableGraph>(graph: T, edges: Edge[]): T => {
  getInternal(graph)._model.batch(() => {
    edges.map((edge) => addEdge(graph, edge));
  });
  return graph;
};

/**
 * Add an edge to the graph.
 */
export const addEdge = <T extends WritableGraph>(graph: T, edgeArg: Edge): T => {
  const relationId = relationKey(normalizeRelation(edgeArg.relation));
  const internal = getInternal(graph);
  // Deduping is `_setEdge`'s job and it does it by edge id in O(1); the membership check that used
  // to guard this built the source's whole edge record per edge, which is quadratic on a wide fan-out.
  // No log line here — it runs per edge of every flush, and building the entry costs more than the write.
  internal._setEdge(edgeArg.source, edgeArg.target, relationId);
  return graph;
};

/**
 * Remove edges from the graph.
 */
export const removeEdges = <T extends WritableGraph>(graph: T, edges: Edge[], removeOrphans = false): T => {
  getInternal(graph)._model.batch(() => {
    edges.map((edge) => removeEdge(graph, edge, removeOrphans));
  });
  return graph;
};

/**
 * Remove an edge from the graph.
 */
export const removeEdge = <T extends WritableGraph>(graph: T, edgeArg: Edge, removeOrphans = false): T => {
  const relation = normalizeRelation(edgeArg.relation);
  const relationId = relationKey(relation);
  const inverse = inverseRelation(relation);
  const inverseId = relationKey(inverse);
  const internal = getInternal(graph);

  internal._removeEdge(edgeArg.source, edgeArg.target, relationId);

  if (removeOrphans) {
    // Asked of the model directly rather than through `_edges`, whose adjacency read rebuilds an
    // O(E) index on every version bump — quadratic when a connector drops all of its nodes at once.
    for (const endpoint of [edgeArg.source, edgeArg.target]) {
      if (endpoint !== GraphNode.RootId && !internal._model.hasEdges(endpoint)) {
        removeNodes(graph, [endpoint]);
      }
    }
  }
  return graph;
};

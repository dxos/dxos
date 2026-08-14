//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Trigger } from '@dxos/async';
import { todo } from '@dxos/debug';
import * as GraphNode from '@dxos/graph/GraphNode';
import { log } from '@dxos/log';

import { scheduleTask } from '#scheduler';

import * as Node from './AppGraphNode';
import {
  type GraphImpl,
  connectionKey,
  getInternal,
  inverseRelation,
  relationFromKey,
  relationKey,
} from './AppGraphStore';
import type { BaseGraph, Edge, Edges, ExpandableGraph, GraphTraversalOptions, WritableGraph } from './AppGraphTypes';
import { normalizeRelation, primaryKey, primaryParts, shallowEqual } from './util';

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

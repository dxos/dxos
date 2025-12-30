//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Record from 'effect/Record';

import { Event, Trigger } from '@dxos/async';
import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MakeOptional, isNonNullable } from '@dxos/util';

import * as Node from './node';

const graphSymbol = Symbol('graph');

type DeepWriteable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? DeepWriteable<T[K]> : T[K];
};

type NodeInternal = DeepWriteable<Node.Node> & { [graphSymbol]: GraphImpl };

/**
 * Get the Graph a Node is currently associated with.
 */
export const getGraph = (node: Node.Node): Graph => {
  const graph = (node as NodeInternal)[graphSymbol];
  invariant(graph, 'Node is not associated with a graph.');
  return graph as Graph;
};

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

  /**
   * The relation to traverse graph edges.
   *
   * @default 'outbound'
   */
  relation?: Node.Relation;
};

export type GraphProps = {
  registry?: Registry.Registry;
  nodes?: MakeOptional<Node.Node, 'data' | 'cacheable'>[];
  edges?: Record<string, Edges>;
  onExpand?: (id: string, relation: Node.Relation) => void;
  onInitialize?: (id: string) => Promise<void>;
  onRemoveNode?: (id: string) => void;
};

export type Edge = { source: string; target: string };
export type Edges = { inbound: string[]; outbound: string[] };

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
  connections(id: string, relation?: Node.Relation): Atom.Atom<Node.Node[]>;
  /**
   * Get the atom key for the actions of the node with the given id.
   */
  actions(id: string): Atom.Atom<(Node.Action | Node.ActionGroup)[]>;
  /**
   * Get the atom key for the edges of the node with the given id.
   */
  edges(id: string): Atom.Atom<Edges>;
}

export type ReadableGraph = BaseGraph & { readonly [GraphKind]: 'readable' | 'expandable' | 'writable' };
export type ExpandableGraph = BaseGraph & { readonly [GraphKind]: 'expandable' | 'writable' };
export type WritableGraph = BaseGraph & { readonly [GraphKind]: 'writable' };

/**
 * Graph interface.
 */
export type Graph = WritableGraph;

/**
 * The Graph represents the user interface information architecture of the application constructed via plugins.
 * @internal
 */
class GraphImpl implements WritableGraph {
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
  readonly _onInitialize?: GraphProps['onInitialize'];
  readonly _onRemoveNode?: GraphProps['onRemoveNode'];

  readonly _registry: Registry.Registry;
  readonly _expanded = Record.empty<string, boolean>();
  readonly _initialized = Record.empty<string, boolean>();
  readonly _initialEdges = Record.empty<string, Edges>();
  readonly _initialNodes = Record.fromEntries([
    [
      Node.RootId,
      this._constructNode({
        id: Node.RootId,
        type: Node.RootType,
        data: null,
        properties: {},
      }),
    ],
  ]);

  /** @internal */
  readonly _node = Atom.family<string, Atom.Writable<Option.Option<Node.Node>>>((id) => {
    const initial = Option.flatten(Record.get(this._initialNodes, id));
    return Atom.make<Option.Option<Node.Node>>(initial).pipe(Atom.keepAlive, Atom.withLabel(`graph:node:${id}`));
  });

  readonly _nodeOrThrow = Atom.family<string, Atom.Atom<Node.Node>>((id) => {
    return Atom.make((get) => {
      const node = get(this._node(id));
      invariant(Option.isSome(node), `Node not available: ${id}`);
      return node.value;
    });
  });

  readonly _edges = Atom.family<string, Atom.Writable<Edges>>((id) => {
    const initial = Record.get(this._initialEdges, id).pipe(Option.getOrElse(() => ({ inbound: [], outbound: [] })));
    return Atom.make<Edges>(initial).pipe(Atom.keepAlive, Atom.withLabel(`graph:edges:${id}`));
  });

  // NOTE: Currently the argument to the family needs to be referentially stable for the atom to be referentially stable.
  // TODO(wittjosiah): Atom feature request, support for something akin to `ComplexMap` to allow for complex arguments.
  readonly _connections = Atom.family<string, Atom.Atom<Node.Node[]>>((key) => {
    return Atom.make((get) => {
      const [id, relation] = key.split('$');
      const edges = get(this._edges(id));
      return edges[relation as Node.Relation]
        .map((id) => get(this._node(id)))
        .filter(Option.isSome)
        .map((o) => o.value);
    }).pipe(Atom.withLabel(`graph:connections:${key}`));
  });

  readonly _actions = Atom.family<string, Atom.Atom<(Node.Action | Node.ActionGroup)[]>>((id) => {
    return Atom.make((get) => {
      return get(this._connections(`${id}$outbound`)).filter(
        (node) => node.type === Node.ActionType || node.type === Node.ActionGroupType,
      );
    }).pipe(Atom.withLabel(`graph:actions:${id}`));
  });

  readonly _json = Atom.family<string, Atom.Atom<any>>((id) => {
    return Atom.make((get) => {
      const toJSON = (node: Node.Node, seen: string[] = []): any => {
        const nodes = get(this._connections(`${node.id}$outbound`));
        const obj: Record<string, any> = {
          id: node.id,
          type: node.type,
        };
        if (node.properties.label) {
          obj.label = node.properties.label;
        }
        if (nodes.length) {
          obj.nodes = nodes
            .map((n: Node.Node) => {
              // Break cycles.
              const nextSeen = [...seen, node.id];
              return nextSeen.includes(n.id) ? undefined : toJSON(n, nextSeen);
            })
            .filter(isNonNullable);
        }
        return obj;
      };

      const root = get(this._nodeOrThrow(id));
      return toJSON(root);
    }).pipe(Atom.withLabel(`graph:json:${id}`));
  });

  constructor({ registry, nodes, edges, onInitialize, onExpand, onRemoveNode }: GraphProps = {}) {
    this._registry = registry ?? Registry.make();
    this._onInitialize = onInitialize;
    this._onExpand = onExpand;
    this._onRemoveNode = onRemoveNode;

    if (nodes) {
      nodes.forEach((node) => {
        Record.set(this._initialNodes, node.id, this._constructNode(node));
      });
    }

    if (edges) {
      Object.entries(edges).forEach(([source, edges]) => {
        Record.set(this._initialEdges, source, edges);
      });
    }
  }

  json(id = Node.RootId): Atom.Atom<any> {
    return jsonImpl(this, id);
  }

  node(id: string): Atom.Atom<Option.Option<Node.Node>> {
    return nodeImpl(this, id);
  }

  nodeOrThrow(id: string): Atom.Atom<Node.Node> {
    return nodeOrThrowImpl(this, id);
  }

  connections(id: string, relation: Node.Relation = 'outbound'): Atom.Atom<Node.Node[]> {
    return connectionsImpl(this, id, relation);
  }

  actions(id: string): Atom.Atom<(Node.Action | Node.ActionGroup)[]> {
    return actionsImpl(this, id);
  }

  edges(id: string): Atom.Atom<Edges> {
    return edgesImpl(this, id);
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
}

/**
 * Internal helper to access GraphImpl internals.
 * @internal
 */
const getInternal = (graph: BaseGraph): GraphImpl => {
  return graph as unknown as GraphImpl;
};

/**
 * Convert the graph to a JSON object.
 */
export const toJSON = (graph: BaseGraph, id = Node.RootId): object => {
  const internal = getInternal(graph);
  return internal._registry.get(internal._json(id));
};

/**
 * Implementation helper for json.
 */
const jsonImpl = (graph: BaseGraph, id = Node.RootId): Atom.Atom<any> => {
  const internal = getInternal(graph);
  return internal._json(id);
};

/**
 * Implementation helper for node.
 */
const nodeImpl = (graph: BaseGraph, id: string): Atom.Atom<Option.Option<Node.Node>> => {
  const internal = getInternal(graph);
  return internal._node(id);
};

/**
 * Implementation helper for nodeOrThrow.
 */
const nodeOrThrowImpl = (graph: BaseGraph, id: string): Atom.Atom<Node.Node> => {
  const internal = getInternal(graph);
  return internal._nodeOrThrow(id);
};

/**
 * Implementation helper for connections.
 */
const connectionsImpl = (
  graph: BaseGraph,
  id: string,
  relation: Node.Relation = 'outbound',
): Atom.Atom<Node.Node[]> => {
  const internal = getInternal(graph);
  return internal._connections(`${id}$${relation}`);
};

/**
 * Implementation helper for actions.
 */
const actionsImpl = (graph: BaseGraph, id: string): Atom.Atom<(Node.Action | Node.ActionGroup)[]> => {
  const internal = getInternal(graph);
  return internal._actions(id);
};

/**
 * Implementation helper for edges.
 */
const edgesImpl = (graph: BaseGraph, id: string): Atom.Atom<Edges> => {
  const internal = getInternal(graph);
  return internal._edges(id);
};

/**
 * Implementation helper for getNode.
 */
const getNodeImpl = (graph: BaseGraph, id: string): Option.Option<Node.Node> => {
  const internal = getInternal(graph);
  return internal._registry.get(nodeImpl(graph, id));
};

/**
 * Get the node with the given id from the graph's registry.
 */
export function getNode(graph: BaseGraph, id: string): Option.Option<Node.Node>;
export function getNode(id: string): (graph: BaseGraph) => Option.Option<Node.Node>;
export function getNode(
  graphOrId: BaseGraph | string,
  id?: string,
): Option.Option<Node.Node> | ((graph: BaseGraph) => Option.Option<Node.Node>) {
  if (typeof graphOrId === 'string') {
    // Curried: getNode(id)
    const id = graphOrId;
    return (graph: BaseGraph) => getNodeImpl(graph, id);
  } else {
    // Direct: getNode(graph, id)
    const graph = graphOrId;
    return getNodeImpl(graph, id!);
  }
}

/**
 * Implementation helper for getNodeOrThrow.
 */
const getNodeOrThrowImpl = (graph: BaseGraph, id: string): Node.Node => {
  const internal = getInternal(graph);
  return internal._registry.get(nodeOrThrowImpl(graph, id));
};

/**
 * Get the node with the given id from the graph's registry.
 *
 * @throws If the node is Option.none().
 */
export function getNodeOrThrow(graph: BaseGraph, id: string): Node.Node;
export function getNodeOrThrow(id: string): (graph: BaseGraph) => Node.Node;
export function getNodeOrThrow(
  graphOrId: BaseGraph | string,
  id?: string,
): Node.Node | ((graph: BaseGraph) => Node.Node) {
  if (typeof graphOrId === 'string') {
    // Curried: getNodeOrThrow(id)
    const id = graphOrId;
    return (graph: BaseGraph) => getNodeOrThrowImpl(graph, id);
  } else {
    // Direct: getNodeOrThrow(graph, id)
    const graph = graphOrId;
    return getNodeOrThrowImpl(graph, id!);
  }
}

/**
 * Get the root node of the graph.
 * This is an alias for `getNodeOrThrow(graph, ROOT_ID)`.
 */
export function getRoot(graph: BaseGraph): Node.Node {
  return getNodeOrThrowImpl(graph, Node.RootId);
}

/**
 * Implementation helper for getConnections.
 */
const getConnectionsImpl = (graph: BaseGraph, id: string, relation: Node.Relation = 'outbound'): Node.Node[] => {
  const internal = getInternal(graph);
  return internal._registry.get(connectionsImpl(graph, id, relation));
};

/**
 * Get all nodes connected to the node with the given id by the given relation from the graph's registry.
 */
export function getConnections(graph: BaseGraph, id: string, relation?: Node.Relation): Node.Node[];
export function getConnections(id: string, relation?: Node.Relation): (graph: BaseGraph) => Node.Node[];
export function getConnections(
  graphOrId: BaseGraph | string,
  idOrRelation?: string | Node.Relation,
  relation?: Node.Relation,
): Node.Node[] | ((graph: BaseGraph) => Node.Node[]) {
  if (typeof graphOrId === 'string') {
    // Curried: getConnections(id, relation?)
    const id = graphOrId;
    const rel = (typeof idOrRelation === 'string' ? 'outbound' : idOrRelation) ?? 'outbound';
    return (graph: BaseGraph) => getConnectionsImpl(graph, id, rel);
  } else {
    // Direct: getConnections(graph, id, relation?)
    const graph = graphOrId;
    const id = idOrRelation as string;
    const rel = relation ?? 'outbound';
    return getConnectionsImpl(graph, id, rel);
  }
}

/**
 * Implementation helper for getActions.
 */
const getActionsImpl = (graph: BaseGraph, id: string): Node.Node[] => {
  const internal = getInternal(graph);
  return internal._registry.get(actionsImpl(graph, id));
};

/**
 * Get all actions connected to the node with the given id from the graph's registry.
 */
export function getActions(graph: BaseGraph, id: string): Node.Node[];
export function getActions(id: string): (graph: BaseGraph) => Node.Node[];
export function getActions(
  graphOrId: BaseGraph | string,
  id?: string,
): Node.Node[] | ((graph: BaseGraph) => Node.Node[]) {
  if (typeof graphOrId === 'string') {
    // Curried: getActions(id)
    const id = graphOrId;
    return (graph: BaseGraph) => getActionsImpl(graph, id);
  } else {
    // Direct: getActions(graph, id)
    const graph = graphOrId;
    return getActionsImpl(graph, id!);
  }
}

/**
 * Implementation helper for getEdges.
 */
const getEdgesImpl = (graph: BaseGraph, id: string): Edges => {
  const internal = getInternal(graph);
  return internal._registry.get(edgesImpl(graph, id));
};

/**
 * Get the edges from the node with the given id from the graph's registry.
 */
export function getEdges(graph: BaseGraph, id: string): Edges;
export function getEdges(id: string): (graph: BaseGraph) => Edges;
export function getEdges(graphOrId: BaseGraph | string, id?: string): Edges | ((graph: BaseGraph) => Edges) {
  if (typeof graphOrId === 'string') {
    // Curried: getEdges(id)
    const id = graphOrId;
    return (graph: BaseGraph) => getEdgesImpl(graph, id);
  } else {
    // Direct: getEdges(graph, id)
    const graph = graphOrId;
    return getEdgesImpl(graph, id!);
  }
}

/**
 * Recursive depth-first traversal of the graph.
 */
/**
 * Implementation helper for traverse.
 */
const traverseImpl = (graph: BaseGraph, options: GraphTraversalOptions, path: string[] = []): void => {
  const { visitor, source = Node.RootId, relation = 'outbound' } = options;
  // Break cycles.
  if (path.includes(source)) {
    return;
  }

  const node = getNodeOrThrow(graph, source);
  const shouldContinue = visitor(node, [...path, source]);
  if (shouldContinue === false) {
    return;
  }

  Object.values(getConnections(graph, source, relation)).forEach((child) =>
    traverseImpl(graph, { source: child.id, relation, visitor }, [...path, source]),
  );
};

/**
 * Traverse the graph with the given options.
 */
export function traverse(graph: BaseGraph, options: GraphTraversalOptions, path?: string[]): void;
export function traverse(options: GraphTraversalOptions, path?: string[]): (graph: BaseGraph) => void;
export function traverse(
  graphOrOptions: BaseGraph | GraphTraversalOptions,
  optionsOrPath?: GraphTraversalOptions | string[],
  path?: string[],
): void | ((graph: BaseGraph) => void) {
  if (typeof graphOrOptions === 'object' && 'visitor' in graphOrOptions) {
    // Curried: traverse(options, path?)
    const options = graphOrOptions as GraphTraversalOptions;
    const pathArg = Array.isArray(optionsOrPath) ? optionsOrPath : undefined;
    return (graph: BaseGraph) => traverseImpl(graph, options, pathArg);
  } else {
    // Direct: traverse(graph, options, path?)
    const graph = graphOrOptions as BaseGraph;
    const options = optionsOrPath as GraphTraversalOptions;
    const pathArg = path ?? (Array.isArray(optionsOrPath) ? optionsOrPath : undefined);
    return traverseImpl(graph, options, pathArg);
  }
}

/**
 * Implementation helper for getPath.
 */
const getPathImpl = (graph: BaseGraph, params: { source?: string; target: string }): Option.Option<string[]> => {
  return Function.pipe(
    getNode(graph, params.source ?? 'root'),
    Option.flatMap((node) => {
      let found: Option.Option<string[]> = Option.none();
      traverseImpl(graph, {
        source: node.id,
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
 * Get the path between two nodes in the graph.
 */
export function getPath(graph: BaseGraph, params: { source?: string; target: string }): Option.Option<string[]>;
export function getPath(params: { source?: string; target: string }): (graph: BaseGraph) => Option.Option<string[]>;
export function getPath(
  graphOrParams: BaseGraph | { source?: string; target: string },
  params?: { source?: string; target: string },
): Option.Option<string[]> | ((graph: BaseGraph) => Option.Option<string[]>) {
  if (params === undefined && typeof graphOrParams === 'object' && 'target' in graphOrParams) {
    // Curried: getPath(params)
    const params = graphOrParams as { source?: string; target: string };
    return (graph: BaseGraph) => getPathImpl(graph, params);
  } else {
    // Direct: getPath(graph, params)
    const graph = graphOrParams as BaseGraph;
    return getPathImpl(graph, params!);
  }
}

/**
 * Implementation helper for waitForPath.
 */
const waitForPathImpl = (
  graph: BaseGraph,
  params: { source?: string; target: string },
  options?: { timeout?: number; interval?: number },
): Promise<string[]> => {
  const { timeout = 5_000, interval = 500 } = options ?? {};
  const path = getPathImpl(graph, params);
  if (Option.isSome(path)) {
    return Promise.resolve(path.value);
  }

  const trigger = new Trigger<string[]>();
  const i = setInterval(() => {
    const path = getPathImpl(graph, params);
    if (Option.isSome(path)) {
      trigger.wake(path.value);
    }
  }, interval);

  return trigger.wait({ timeout }).finally(() => clearInterval(i));
};

/**
 * Wait for the path between two nodes in the graph to be established.
 */
export function waitForPath(
  graph: BaseGraph,
  params: { source?: string; target: string },
  options?: { timeout?: number; interval?: number },
): Promise<string[]>;
export function waitForPath(
  params: { source?: string; target: string },
  options?: { timeout?: number; interval?: number },
): (graph: BaseGraph) => Promise<string[]>;
export function waitForPath(
  graphOrParams: BaseGraph | { source?: string; target: string },
  paramsOrOptions?: { source?: string; target: string } | { timeout?: number; interval?: number },
  options?: { timeout?: number; interval?: number },
): Promise<string[]> | ((graph: BaseGraph) => Promise<string[]>) {
  if (typeof graphOrParams === 'object' && 'target' in graphOrParams) {
    // Curried: waitForPath(params, options?)
    const params = graphOrParams as { source?: string; target: string };
    const opts = typeof paramsOrOptions === 'object' && !('target' in paramsOrOptions) ? paramsOrOptions : undefined;
    return (graph: BaseGraph) => waitForPathImpl(graph, params, opts);
  } else {
    // Direct: waitForPath(graph, params, options?)
    const graph = graphOrParams as BaseGraph;
    const params = paramsOrOptions as { source?: string; target: string };
    return waitForPathImpl(graph, params, options);
  }
}

/**
 * Implementation helper for initialize.
 */
const initializeImpl = async <T extends ExpandableGraph | WritableGraph>(graph: T, id: string): Promise<T> => {
  const internal = getInternal(graph);
  const initialized = Record.get(internal._initialized, id).pipe(Option.getOrElse(() => false));
  log('initialize', { id, initialized });
  if (!initialized) {
    await internal._onInitialize?.(id);
    Record.set(internal._initialized, id, true);
  }
  return graph;
};

/**
 * Initialize a node in the graph.
 *
 * Fires the `onInitialize` callback to provide initial data for a node.
 */
export function initialize<T extends ExpandableGraph | WritableGraph>(graph: T, id: string): Promise<T>;
export function initialize(id: string): <T extends ExpandableGraph | WritableGraph>(graph: T) => Promise<T>;
export function initialize<T extends ExpandableGraph | WritableGraph>(
  graphOrId: T | string,
  id?: string,
): Promise<T> | (<T extends ExpandableGraph | WritableGraph>(graph: T) => Promise<T>) {
  if (typeof graphOrId === 'string') {
    // Curried: initialize(id)
    const id = graphOrId;
    return <T extends ExpandableGraph | WritableGraph>(graph: T) => initializeImpl(graph, id);
  } else {
    // Direct: initialize(graph, id)
    const graph = graphOrId;
    return initializeImpl(graph, id!);
  }
}

/**
 * Implementation helper for expand.
 */
const expandImpl = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.Relation = 'outbound',
): T => {
  const internal = getInternal(graph);
  const key = `${id}$${relation}`;
  const expanded = Record.get(internal._expanded, key).pipe(Option.getOrElse(() => false));
  log('expand', { key, expanded });
  if (!expanded) {
    internal._onExpand?.(id, relation);
    Record.set(internal._expanded, key, true);
  }
  return graph;
};

/**
 * Expand a node in the graph.
 *
 * Fires the `onExpand` callback to add connections to the node.
 */
export function expand<T extends ExpandableGraph | WritableGraph>(graph: T, id: string, relation?: Node.Relation): T;
export function expand(
  id: string,
  relation?: Node.Relation,
): <T extends ExpandableGraph | WritableGraph>(graph: T) => T;
export function expand<T extends ExpandableGraph | WritableGraph>(
  graphOrId: T | string,
  idOrRelation?: string | Node.Relation,
  relation?: Node.Relation,
): T | (<T extends ExpandableGraph | WritableGraph>(graph: T) => T) {
  if (typeof graphOrId === 'string') {
    // Curried: expand(id, relation?)
    const id = graphOrId;
    const rel = (typeof idOrRelation === 'string' ? 'outbound' : idOrRelation) ?? 'outbound';
    return <T extends ExpandableGraph | WritableGraph>(graph: T) => expandImpl(graph, id, rel);
  } else {
    // Direct: expand(graph, id, relation?)
    const graph = graphOrId;
    const id = idOrRelation as string;
    const rel = relation ?? 'outbound';
    return expandImpl(graph, id, rel);
  }
}

/**
 * Implementation helper for sortEdges.
 */
const sortEdgesImpl = <T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.Relation,
  order: string[],
): T => {
  const internal = getInternal(graph);
  const edgesAtom = internal._edges(id);
  const edges = internal._registry.get(edgesAtom);
  const unsorted = edges[relation].filter((id) => !order.includes(id)) ?? [];
  const sorted = order.filter((id) => edges[relation].includes(id)) ?? [];
  edges[relation].splice(0, edges[relation].length, ...[...sorted, ...unsorted]);
  internal._registry.set(edgesAtom, edges);
  return graph;
};

/**
 * Sort the edges of the node with the given id.
 */
export function sortEdges<T extends ExpandableGraph | WritableGraph>(
  graph: T,
  id: string,
  relation: Node.Relation,
  order: string[],
): T;
export function sortEdges(
  id: string,
  relation: Node.Relation,
  order: string[],
): <T extends ExpandableGraph | WritableGraph>(graph: T) => T;
export function sortEdges<T extends ExpandableGraph | WritableGraph>(
  graphOrId: T | string,
  idOrRelation?: string | Node.Relation,
  relationOrOrder?: Node.Relation | string[],
  order?: string[],
): T | (<T extends ExpandableGraph | WritableGraph>(graph: T) => T) {
  if (typeof graphOrId === 'string') {
    // Curried: sortEdges(id, relation, order)
    const id = graphOrId;
    const relation = idOrRelation as Node.Relation;
    const order = relationOrOrder as string[];
    return <T extends ExpandableGraph | WritableGraph>(graph: T) => sortEdgesImpl(graph, id, relation, order);
  } else {
    // Direct: sortEdges(graph, id, relation, order)
    const graph = graphOrId;
    const id = idOrRelation as string;
    const relation = relationOrOrder as Node.Relation;
    return sortEdgesImpl(graph, id, relation, order!);
  }
}

/**
 * Implementation helper for addNodes.
 */
const addNodesImpl = <T extends WritableGraph>(graph: T, nodes: Node.NodeArg<any, Record<string, any>>[]): T => {
  Atom.batch(() => {
    nodes.map((node) => addNodeImpl(graph, node));
  });
  return graph;
};

/**
 * Add nodes to the graph.
 */
export function addNodes<T extends WritableGraph>(graph: T, nodes: Node.NodeArg<any, Record<string, any>>[]): T;
export function addNodes(nodes: Node.NodeArg<any, Record<string, any>>[]): <T extends WritableGraph>(graph: T) => T;
export function addNodes<T extends WritableGraph>(
  graphOrNodes: T | Node.NodeArg<any, Record<string, any>>[],
  nodes?: Node.NodeArg<any, Record<string, any>>[],
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (nodes === undefined) {
    // Curried: addNodes(nodes)
    const nodes = graphOrNodes as Node.NodeArg<any, Record<string, any>>[];
    return <T extends WritableGraph>(graph: T) => addNodesImpl(graph, nodes);
  } else {
    // Direct: addNodes(graph, nodes)
    const graph = graphOrNodes as T;
    return addNodesImpl(graph, nodes);
  }
}

/**
 * Implementation helper for addNode.
 */
const addNodeImpl = <T extends WritableGraph>(graph: T, nodeArg: Node.NodeArg<any, Record<string, any>>): T => {
  const internal = getInternal(graph);
  const { nodes, edges, ...node } = nodeArg;
  const { id, type, data = null, properties = {} } = node;
  const nodeAtom = internal._node(id);
  const existingNode = internal._registry.get(nodeAtom);
  Option.match(existingNode, {
    onSome: (existing) => {
      const typeChanged = existing.type !== type;
      const dataChanged = existing.data !== data;
      const propertiesChanged = Object.keys(properties).some((key) => existing.properties[key] !== properties[key]);
      log('existing node', {
        id,
        typeChanged,
        dataChanged,
        propertiesChanged,
      });
      if (typeChanged || dataChanged || propertiesChanged) {
        log('updating node', { id, type, data, properties });
        const newNode = Option.some({
          ...existing,
          type,
          data,
          properties: { ...existing.properties, ...properties },
        });
        internal._registry.set(nodeAtom, newNode);
        graph.onNodeChanged.emit({ id, node: newNode });
      }
    },
    onNone: () => {
      log('new node', { id, type, data, properties });
      const newNode = internal._constructNode({ id, type, data, properties });
      internal._registry.set(nodeAtom, newNode);
      graph.onNodeChanged.emit({ id, node: newNode });
    },
  });

  if (nodes) {
    addNodesImpl(graph, nodes);
    const _edges = nodes.map((node) => ({ source: id, target: node.id }));
    addEdgesImpl(graph, _edges);
  }

  if (edges) {
    todo();
  }
  return graph;
};

/**
 * Add a node to the graph.
 */
export function addNode<T extends WritableGraph>(graph: T, nodeArg: Node.NodeArg<any, Record<string, any>>): T;
export function addNode(nodeArg: Node.NodeArg<any, Record<string, any>>): <T extends WritableGraph>(graph: T) => T;
export function addNode<T extends WritableGraph>(
  graphOrNodeArg: T | Node.NodeArg<any, Record<string, any>>,
  nodeArg?: Node.NodeArg<any, Record<string, any>>,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (nodeArg === undefined) {
    // Curried: addNode(nodeArg)
    const nodeArg = graphOrNodeArg as Node.NodeArg<any, Record<string, any>>;
    return <T extends WritableGraph>(graph: T) => addNodeImpl(graph, nodeArg);
  } else {
    // Direct: addNode(graph, nodeArg)
    const graph = graphOrNodeArg as T;
    return addNodeImpl(graph, nodeArg);
  }
}

/**
 * Implementation helper for removeNodes.
 */
const removeNodesImpl = <T extends WritableGraph>(graph: T, ids: string[], edges = false): T => {
  Atom.batch(() => {
    ids.map((id) => removeNodeImpl(graph, id, edges));
  });
  return graph;
};

/**
 * Remove nodes from the graph.
 */
export function removeNodes<T extends WritableGraph>(graph: T, ids: string[], edges?: boolean): T;
export function removeNodes(ids: string[], edges?: boolean): <T extends WritableGraph>(graph: T) => T;
export function removeNodes<T extends WritableGraph>(
  graphOrIds: T | string[],
  idsOrEdges?: string[] | boolean,
  edges?: boolean,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (Array.isArray(graphOrIds)) {
    // Curried: removeNodes(ids, edges?)
    const ids = graphOrIds;
    const edgesArg = typeof idsOrEdges === 'boolean' ? idsOrEdges : false;
    return <T extends WritableGraph>(graph: T) => removeNodesImpl(graph, ids, edgesArg);
  } else {
    // Direct: removeNodes(graph, ids, edges?)
    const graph = graphOrIds;
    const ids = idsOrEdges as string[];
    const edgesArg = edges ?? false;
    return removeNodesImpl(graph, ids, edgesArg);
  }
}

/**
 * Implementation helper for removeNode.
 */
const removeNodeImpl = <T extends WritableGraph>(graph: T, id: string, edges = false): T => {
  const internal = getInternal(graph);
  const nodeAtom = internal._node(id);
  // TODO(wittjosiah): Is there a way to mark these atom values for garbage collection?
  internal._registry.set(nodeAtom, Option.none());
  graph.onNodeChanged.emit({ id, node: Option.none() });
  // TODO(wittjosiah): Reset expanded and initialized flags?

  if (edges) {
    const { inbound, outbound } = internal._registry.get(internal._edges(id));
    const edgesToRemove = [
      ...inbound.map((source) => ({ source, target: id })),
      ...outbound.map((target) => ({ source: id, target })),
    ];
    removeEdgesImpl(graph, edgesToRemove);
  }

  internal._onRemoveNode?.(id);
  return graph;
};

/**
 * Remove a node from the graph.
 */
export function removeNode<T extends WritableGraph>(graph: T, id: string, edges?: boolean): T;
export function removeNode(id: string, edges?: boolean): <T extends WritableGraph>(graph: T) => T;
export function removeNode<T extends WritableGraph>(
  graphOrId: T | string,
  idOrEdges?: string | boolean,
  edges?: boolean,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (typeof graphOrId === 'string') {
    // Curried: removeNode(id, edges?)
    const id = graphOrId;
    const edgesArg = typeof idOrEdges === 'boolean' ? idOrEdges : false;
    return <T extends WritableGraph>(graph: T) => removeNodeImpl(graph, id, edgesArg);
  } else {
    // Direct: removeNode(graph, id, edges?)
    const graph = graphOrId;
    const id = idOrEdges as string;
    const edgesArg = edges ?? false;
    return removeNodeImpl(graph, id, edgesArg);
  }
}

/**
 * Implementation helper for addEdges.
 */
const addEdgesImpl = <T extends WritableGraph>(graph: T, edges: Edge[]): T => {
  Atom.batch(() => {
    edges.map((edge) => addEdgeImpl(graph, edge));
  });
  return graph;
};

/**
 * Add edges to the graph.
 */
export function addEdges<T extends WritableGraph>(graph: T, edges: Edge[]): T;
export function addEdges(edges: Edge[]): <T extends WritableGraph>(graph: T) => T;
export function addEdges<T extends WritableGraph>(
  graphOrEdges: T | Edge[],
  edges?: Edge[],
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (edges === undefined) {
    // Curried: addEdges(edges)
    const edges = graphOrEdges as Edge[];
    return <T extends WritableGraph>(graph: T) => addEdgesImpl(graph, edges);
  } else {
    // Direct: addEdges(graph, edges)
    const graph = graphOrEdges as T;
    return addEdgesImpl(graph, edges);
  }
}

/**
 * Implementation helper for addEdge.
 */
const addEdgeImpl = <T extends WritableGraph>(graph: T, edgeArg: Edge): T => {
  const internal = getInternal(graph);
  const sourceAtom = internal._edges(edgeArg.source);
  const source = internal._registry.get(sourceAtom);
  if (!source.outbound.includes(edgeArg.target)) {
    log('add outbound edge', {
      source: edgeArg.source,
      target: edgeArg.target,
    });
    internal._registry.set(sourceAtom, {
      inbound: source.inbound,
      outbound: [...source.outbound, edgeArg.target],
    });
  }

  const targetAtom = internal._edges(edgeArg.target);
  const target = internal._registry.get(targetAtom);
  if (!target.inbound.includes(edgeArg.source)) {
    log('add inbound edge', {
      source: edgeArg.source,
      target: edgeArg.target,
    });
    internal._registry.set(targetAtom, {
      inbound: [...target.inbound, edgeArg.source],
      outbound: target.outbound,
    });
  }
  return graph;
};

/**
 * Add an edge to the graph.
 */
export function addEdge<T extends WritableGraph>(graph: T, edgeArg: Edge): T;
export function addEdge(edgeArg: Edge): <T extends WritableGraph>(graph: T) => T;
export function addEdge<T extends WritableGraph>(
  graphOrEdgeArg: T | Edge,
  edgeArg?: Edge,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (edgeArg === undefined) {
    // Curried: addEdge(edgeArg)
    const edgeArg = graphOrEdgeArg as Edge;
    return <T extends WritableGraph>(graph: T) => addEdgeImpl(graph, edgeArg);
  } else {
    // Direct: addEdge(graph, edgeArg)
    const graph = graphOrEdgeArg as T;
    return addEdgeImpl(graph, edgeArg);
  }
}

/**
 * Implementation helper for removeEdges.
 */
const removeEdgesImpl = <T extends WritableGraph>(graph: T, edges: Edge[], removeOrphans = false): T => {
  Atom.batch(() => {
    edges.map((edge) => removeEdgeImpl(graph, edge, removeOrphans));
  });
  return graph;
};

/**
 * Remove edges from the graph.
 */
export function removeEdges<T extends WritableGraph>(graph: T, edges: Edge[], removeOrphans?: boolean): T;
export function removeEdges(edges: Edge[], removeOrphans?: boolean): <T extends WritableGraph>(graph: T) => T;
export function removeEdges<T extends WritableGraph>(
  graphOrEdges: T | Edge[],
  edgesOrRemoveOrphans?: Edge[] | boolean,
  removeOrphans?: boolean,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (Array.isArray(graphOrEdges)) {
    // Curried: removeEdges(edges, removeOrphans?)
    const edges = graphOrEdges;
    const removeOrphansArg = typeof edgesOrRemoveOrphans === 'boolean' ? edgesOrRemoveOrphans : false;
    return <T extends WritableGraph>(graph: T) => removeEdgesImpl(graph, edges, removeOrphansArg);
  } else {
    // Direct: removeEdges(graph, edges, removeOrphans?)
    const graph = graphOrEdges;
    const edges = edgesOrRemoveOrphans as Edge[];
    const removeOrphansArg = removeOrphans ?? false;
    return removeEdgesImpl(graph, edges, removeOrphansArg);
  }
}

/**
 * Implementation helper for removeEdge.
 */
const removeEdgeImpl = <T extends WritableGraph>(graph: T, edgeArg: Edge, removeOrphans = false): T => {
  const internal = getInternal(graph);
  const sourceAtom = internal._edges(edgeArg.source);
  const source = internal._registry.get(sourceAtom);
  if (source.outbound.includes(edgeArg.target)) {
    internal._registry.set(sourceAtom, {
      inbound: source.inbound,
      outbound: source.outbound.filter((id) => id !== edgeArg.target),
    });
  }

  const targetAtom = internal._edges(edgeArg.target);
  const target = internal._registry.get(targetAtom);
  if (target.inbound.includes(edgeArg.source)) {
    internal._registry.set(targetAtom, {
      inbound: target.inbound.filter((id) => id !== edgeArg.source),
      outbound: target.outbound,
    });
  }

  if (removeOrphans) {
    const source = internal._registry.get(sourceAtom);
    const target = internal._registry.get(targetAtom);
    if (source.outbound.length === 0 && source.inbound.length === 0 && edgeArg.source !== Node.RootId) {
      removeNodesImpl(graph, [edgeArg.source]);
    }
    if (target.outbound.length === 0 && target.inbound.length === 0 && edgeArg.target !== Node.RootId) {
      removeNodesImpl(graph, [edgeArg.target]);
    }
  }
  return graph;
};

/**
 * Remove an edge from the graph.
 */
export function removeEdge<T extends WritableGraph>(graph: T, edgeArg: Edge, removeOrphans?: boolean): T;
export function removeEdge(edgeArg: Edge, removeOrphans?: boolean): <T extends WritableGraph>(graph: T) => T;
export function removeEdge<T extends WritableGraph>(
  graphOrEdgeArg: T | Edge,
  edgeArgOrRemoveOrphans?: Edge | boolean,
  removeOrphans?: boolean,
): T | (<T extends WritableGraph>(graph: T) => T) {
  if (
    edgeArgOrRemoveOrphans === undefined ||
    typeof edgeArgOrRemoveOrphans === 'boolean' ||
    'source' in graphOrEdgeArg
  ) {
    // Curried: removeEdge(edgeArg, removeOrphans?)
    const edgeArg = graphOrEdgeArg as Edge;
    const removeOrphansArg = typeof edgeArgOrRemoveOrphans === 'boolean' ? edgeArgOrRemoveOrphans : false;
    return <T extends WritableGraph>(graph: T) => removeEdgeImpl(graph, edgeArg, removeOrphansArg);
  } else {
    // Direct: removeEdge(graph, edgeArg, removeOrphans?)
    const graph = graphOrEdgeArg as T;
    const edgeArg = edgeArgOrRemoveOrphans as Edge;
    const removeOrphansArg = removeOrphans ?? false;
    return removeEdgeImpl(graph, edgeArg, removeOrphansArg);
  }
}

/**
 * Creates a new Graph instance.
 */
export const make = (params?: GraphProps): Graph => {
  return new GraphImpl(params);
};

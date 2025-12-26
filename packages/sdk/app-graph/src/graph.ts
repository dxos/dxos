//
// Copyright 2023 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { Event, Trigger } from '@dxos/async';
import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MakeOptional, isNonNullable } from '@dxos/util';

import { type Action, type ActionGroup, type Node, type NodeArg, type Relation } from './node';

const graphSymbol = Symbol('graph');
type DeepWriteable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? DeepWriteable<T[K]> : T[K];
};
type NodeInternal = DeepWriteable<Node> & { [graphSymbol]: GraphImpl };

/**
 * Get the Graph a Node is currently associated with.
 */
export const getGraph = (node: Node): Graph => {
  const graph = (node as NodeInternal)[graphSymbol];
  invariant(graph, 'Node is not associated with a graph.');
  return graph as Graph;
};

export const ROOT_ID = 'root';
export const ROOT_TYPE = 'dxos.org/type/GraphRoot';
export const ACTION_TYPE = 'dxos.org/type/GraphAction';
export const ACTION_GROUP_TYPE = 'dxos.org/type/GraphActionGroup';

export type GraphTraversalOptions = {
  /**
   * A callback which is called for each node visited during traversal.
   *
   * If the callback returns `false`, traversal is stops recursing.
   */
  visitor: (node: Node, path: string[]) => boolean | void;

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
  relation?: Relation;
};

export type GraphParams = {
  registry?: Registry.Registry;
  nodes?: MakeOptional<Node, 'data' | 'cacheable'>[];
  edges?: Record<string, Edges>;
  onExpand?: (id: string, relation: Relation) => void;
  onInitialize?: (id: string) => Promise<void>;
  onRemoveNode?: (id: string) => void;
};

export type Edge = { source: string; target: string };
export type Edges = { inbound: string[]; outbound: string[] };

export interface ReadableGraph {
  /**
   * Event emitted when a node is changed.
   */
  onNodeChanged: Event<{ id: string; node: Option.Option<Node> }>;

  /**
   * Convert the graph to a JSON object.
   */
  toJSON(id?: string): object;

  json(id?: string): Atom.Atom<any>;

  /**
   * Get the atom key for the node with the given id.
   */
  node(id: string): Atom.Atom<Option.Option<Node>>;

  /**
   * Get the atom key for the node with the given id.
   */
  nodeOrThrow(id: string): Atom.Atom<Node>;

  /**
   * Get the atom key for the connections of the node with the given id.
   */
  connections(id: string, relation?: Relation): Atom.Atom<Node[]>;

  /**
   * Get the atom key for the actions of the node with the given id.
   */
  actions(id: string): Atom.Atom<(Action | ActionGroup)[]>;

  /**
   * Get the atom key for the edges of the node with the given id.
   */
  edges(id: string): Atom.Atom<Edges>;

  /**
   * Alias for `getNodeOrThrow(ROOT_ID)`.
   */
  get root(): Node;

  /**
   * Get the node with the given id from the graph's registry.
   */
  getNode(id: string): Option.Option<Node>;

  /**
   * Get the node with the given id from the graph's registry.
   *
   * @throws If the node is Option.none().
   */
  getNodeOrThrow(id: string): Node;

  /**
   * Get all nodes connected to the node with the given id by the given relation from the graph's registry.
   */
  getConnections(id: string, relation?: Relation): Node[];

  /**
   * Get all actions connected to the node with the given id from the graph's registry.
   */
  getActions(id: string): Node[];

  /**
   * Get the edges from the node with the given id from the graph's registry.
   */
  getEdges(id: string): Edges;

  /**
   * Recursive depth-first traversal of the graph.
   *
   * @param options.node The node to start traversing from.
   * @param options.relation The relation to traverse graph edges.
   * @param options.visitor A callback which is called for each node visited during traversal.
   */
  traverse(options: GraphTraversalOptions, path?: string[]): void;

  /**
   * Get the path between two nodes in the graph.
   */
  getPath(params: { source?: string; target: string }): Option.Option<string[]>;

  /**
   * Wait for the path between two nodes in the graph to be established.
   */
  waitForPath(
    params: { source?: string; target: string },
    options?: { timeout?: number; interval?: number },
  ): Promise<string[]>;
}

export interface ExpandableGraph extends ReadableGraph {
  /**
   * Initialize a node in the graph.
   *
   * Fires the `onInitialize` callback to provide initial data for a node.
   */
  initialize(id: string): Promise<void>;

  /**
   * Expand a node in the graph.
   *
   * Fires the `onExpand` callback to add connections to the node.
   */
  expand(id: string, relation?: Relation): void;

  /**
   * Sort the edges of the node with the given id.
   */
  sortEdges(id: string, relation: Relation, order: string[]): void;
}

export interface WritableGraph extends ExpandableGraph {
  /**
   * Add nodes to the graph.
   */
  addNodes(nodes: NodeArg<any, Record<string, any>>[]): void;

  /**
   * Add a node to the graph.
   */
  addNode(node: NodeArg<any, Record<string, any>>): void;

  /**
   * Remove nodes from the graph.
   */
  removeNodes(ids: string[], edges?: boolean): void;

  /**
   * Remove a node from the graph.
   */
  removeNode(id: string, edges?: boolean): void;

  /**
   * Add edges to the graph.
   */
  addEdges(edges: Edge[]): void;

  /**
   * Add an edge to the graph.
   */
  addEdge(edge: Edge): void;

  /**
   * Remove edges from the graph.
   */
  removeEdges(edges: Edge[], removeOrphans?: boolean): void;

  /**
   * Remove an edge from the graph.
   */
  removeEdge(edge: Edge, removeOrphans?: boolean): void;
}

/**
 * Graph interface.
 */
export type Graph = WritableGraph;

/**
 * The Graph represents the user interface information architecture of the application constructed via plugins.
 * @internal
 */
class GraphImpl implements WritableGraph {
  readonly onNodeChanged = new Event<{
    id: string;
    node: Option.Option<Node>;
  }>();

  private readonly _onExpand?: GraphParams['onExpand'];
  private readonly _onInitialize?: GraphParams['onInitialize'];
  private readonly _onRemoveNode?: GraphParams['onRemoveNode'];

  private readonly _registry: Registry.Registry;
  private readonly _expanded = Record.empty<string, boolean>();
  private readonly _initialized = Record.empty<string, boolean>();
  private readonly _initialEdges = Record.empty<string, Edges>();
  private readonly _initialNodes = Record.fromEntries([
    [
      ROOT_ID,
      this._constructNode({
        id: ROOT_ID,
        type: ROOT_TYPE,
        data: null,
        properties: {},
      }),
    ],
  ]);

  /** @internal */
  readonly _node = Atom.family<string, Atom.Writable<Option.Option<Node>>>((id) => {
    const initial = Option.flatten(Record.get(this._initialNodes, id));
    return Atom.make<Option.Option<Node>>(initial).pipe(Atom.keepAlive, Atom.withLabel(`graph:node:${id}`));
  });

  private readonly _nodeOrThrow = Atom.family<string, Atom.Atom<Node>>((id) => {
    return Atom.make((get) => {
      const node = get(this._node(id));
      invariant(Option.isSome(node), `Node not available: ${id}`);
      return node.value;
    });
  });

  private readonly _edges = Atom.family<string, Atom.Writable<Edges>>((id) => {
    const initial = Record.get(this._initialEdges, id).pipe(Option.getOrElse(() => ({ inbound: [], outbound: [] })));
    return Atom.make<Edges>(initial).pipe(Atom.keepAlive, Atom.withLabel(`graph:edges:${id}`));
  });

  // NOTE: Currently the argument to the family needs to be referentially stable for the atom to be referentially stable.
  // TODO(wittjosiah): Atom feature request, support for something akin to `ComplexMap` to allow for complex arguments.
  private readonly _connections = Atom.family<string, Atom.Atom<Node[]>>((key) => {
    return Atom.make((get) => {
      const [id, relation] = key.split('$');
      const edges = get(this._edges(id));
      return edges[relation as Relation]
        .map((id) => get(this._node(id)))
        .filter(Option.isSome)
        .map((o) => o.value);
    }).pipe(Atom.withLabel(`graph:connections:${key}`));
  });

  private readonly _actions = Atom.family<string, Atom.Atom<(Action | ActionGroup)[]>>((id) => {
    return Atom.make((get) => {
      return get(this._connections(`${id}$outbound`)).filter(
        (node) => node.type === ACTION_TYPE || node.type === ACTION_GROUP_TYPE,
      );
    }).pipe(Atom.withLabel(`graph:actions:${id}`));
  });

  private readonly _json = Atom.family<string, Atom.Atom<any>>((id) => {
    return Atom.make((get) => {
      const toJSON = (node: Node, seen: string[] = []): any => {
        const nodes = get(this.connections(node.id));
        const obj: Record<string, any> = {
          id: node.id,
          type: node.type,
        };
        if (node.properties.label) {
          obj.label = node.properties.label;
        }
        if (nodes.length) {
          obj.nodes = nodes
            .map((n) => {
              // Break cycles.
              const nextSeen = [...seen, node.id];
              return nextSeen.includes(n.id) ? undefined : toJSON(n, nextSeen);
            })
            .filter(isNonNullable);
        }
        return obj;
      };

      const root = get(this.nodeOrThrow(id));
      return toJSON(root);
    }).pipe(Atom.withLabel(`graph:json:${id}`));
  });

  constructor({ registry, nodes, edges, onInitialize, onExpand, onRemoveNode }: GraphParams = {}) {
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

  toJSON(id = ROOT_ID) {
    return this._registry.get(this._json(id));
  }

  json(id = ROOT_ID) {
    return this._json(id);
  }

  node(id: string): Atom.Atom<Option.Option<Node>> {
    return this._node(id);
  }

  nodeOrThrow(id: string): Atom.Atom<Node> {
    return this._nodeOrThrow(id);
  }

  connections(id: string, relation: Relation = 'outbound'): Atom.Atom<Node[]> {
    return this._connections(`${id}$${relation}`);
  }

  actions(id: string) {
    return this._actions(id);
  }

  edges(id: string): Atom.Atom<Edges> {
    return this._edges(id);
  }

  get root() {
    return this.getNodeOrThrow(ROOT_ID);
  }

  getNode(id: string): Option.Option<Node> {
    return this._registry.get(this.node(id));
  }

  getNodeOrThrow(id: string): Node {
    return this._registry.get(this.nodeOrThrow(id));
  }

  getConnections(id: string, relation: Relation = 'outbound'): Node[] {
    return this._registry.get(this.connections(id, relation));
  }

  getActions(id: string): Node[] {
    return this._registry.get(this.actions(id));
  }

  getEdges(id: string): Edges {
    return this._registry.get(this.edges(id));
  }

  async initialize(id: string) {
    const initialized = Record.get(this._initialized, id).pipe(Option.getOrElse(() => false));
    log('initialize', { id, initialized });
    if (!initialized) {
      await this._onInitialize?.(id);
      Record.set(this._initialized, id, true);
    }
  }

  expand(id: string, relation: Relation = 'outbound'): void {
    const key = `${id}$${relation}`;
    const expanded = Record.get(this._expanded, key).pipe(Option.getOrElse(() => false));
    log('expand', { key, expanded });
    if (!expanded) {
      this._onExpand?.(id, relation);
      Record.set(this._expanded, key, true);
    }
  }

  addNodes(nodes: NodeArg<any, Record<string, any>>[]): void {
    Atom.batch(() => {
      nodes.map((node) => this.addNode(node));
    });
  }

  addNode({ nodes, edges, ...nodeArg }: NodeArg<any, Record<string, any>>): void {
    const { id, type, data = null, properties = {} } = nodeArg;
    const nodeAtom = this._node(id);
    const node = this._registry.get(nodeAtom);
    Option.match(node, {
      onSome: (node) => {
        const typeChanged = node.type !== type;
        const dataChanged = node.data !== data;
        const propertiesChanged = Object.keys(properties).some((key) => node.properties[key] !== properties[key]);
        log('existing node', {
          id,
          typeChanged,
          dataChanged,
          propertiesChanged,
        });
        if (typeChanged || dataChanged || propertiesChanged) {
          log('updating node', { id, type, data, properties });
          const newNode = Option.some({
            ...node,
            type,
            data,
            properties: { ...node.properties, ...properties },
          });
          this._registry.set(nodeAtom, newNode);
          this.onNodeChanged.emit({ id, node: newNode });
        }
      },
      onNone: () => {
        log('new node', { id, type, data, properties });
        const newNode = this._constructNode({ id, type, data, properties });
        this._registry.set(nodeAtom, newNode);
        this.onNodeChanged.emit({ id, node: newNode });
      },
    });

    if (nodes) {
      // Atom.batch(() => {
      this.addNodes(nodes);
      const _edges = nodes.map((node) => ({ source: id, target: node.id }));
      this.addEdges(_edges);
      // });
    }

    if (edges) {
      todo();
    }
  }

  removeNodes(ids: string[], edges = false): void {
    Atom.batch(() => {
      ids.map((id) => this.removeNode(id, edges));
    });
  }

  removeNode(id: string, edges = false): void {
    const nodeAtom = this._node(id);
    // TODO(wittjosiah): Is there a way to mark these atom values for garbage collection?
    this._registry.set(nodeAtom, Option.none());
    this.onNodeChanged.emit({ id, node: Option.none() });
    // TODO(wittjosiah): Reset expanded and initialized flags?

    if (edges) {
      const { inbound, outbound } = this._registry.get(this._edges(id));
      const edges = [
        ...inbound.map((source) => ({ source, target: id })),
        ...outbound.map((target) => ({ source: id, target })),
      ];
      this.removeEdges(edges);
    }

    this._onRemoveNode?.(id);
  }

  addEdges(edges: Edge[]): void {
    Atom.batch(() => {
      edges.map((edge) => this.addEdge(edge));
    });
  }

  addEdge(edgeArg: Edge): void {
    const sourceAtom = this._edges(edgeArg.source);
    const source = this._registry.get(sourceAtom);
    if (!source.outbound.includes(edgeArg.target)) {
      log('add outbound edge', {
        source: edgeArg.source,
        target: edgeArg.target,
      });
      this._registry.set(sourceAtom, {
        inbound: source.inbound,
        outbound: [...source.outbound, edgeArg.target],
      });
    }

    const targetAtom = this._edges(edgeArg.target);
    const target = this._registry.get(targetAtom);
    if (!target.inbound.includes(edgeArg.source)) {
      log('add inbound edge', {
        source: edgeArg.source,
        target: edgeArg.target,
      });
      this._registry.set(targetAtom, {
        inbound: [...target.inbound, edgeArg.source],
        outbound: target.outbound,
      });
    }
  }

  removeEdges(edges: Edge[], removeOrphans = false): void {
    Atom.batch(() => {
      edges.map((edge) => this.removeEdge(edge, removeOrphans));
    });
  }

  removeEdge(edgeArg: Edge, removeOrphans = false): void {
    const sourceAtom = this._edges(edgeArg.source);
    const source = this._registry.get(sourceAtom);
    if (source.outbound.includes(edgeArg.target)) {
      this._registry.set(sourceAtom, {
        inbound: source.inbound,
        outbound: source.outbound.filter((id) => id !== edgeArg.target),
      });
    }

    const targetAtom = this._edges(edgeArg.target);
    const target = this._registry.get(targetAtom);
    if (target.inbound.includes(edgeArg.source)) {
      this._registry.set(targetAtom, {
        inbound: target.inbound.filter((id) => id !== edgeArg.source),
        outbound: target.outbound,
      });
    }

    if (removeOrphans) {
      const source = this._registry.get(sourceAtom);
      const target = this._registry.get(targetAtom);
      if (source.outbound.length === 0 && source.inbound.length === 0 && edgeArg.source !== ROOT_ID) {
        this.removeNodes([edgeArg.source]);
      }
      if (target.outbound.length === 0 && target.inbound.length === 0 && edgeArg.target !== ROOT_ID) {
        this.removeNodes([edgeArg.target]);
      }
    }
  }

  sortEdges(id: string, relation: Relation, order: string[]): void {
    const edgesAtom = this._edges(id);
    const edges = this._registry.get(edgesAtom);
    const unsorted = edges[relation].filter((id) => !order.includes(id)) ?? [];
    const sorted = order.filter((id) => edges[relation].includes(id)) ?? [];
    edges[relation].splice(0, edges[relation].length, ...[...sorted, ...unsorted]);
    this._registry.set(edgesAtom, edges);
  }

  traverse({ visitor, source = ROOT_ID, relation = 'outbound' }: GraphTraversalOptions, path: string[] = []): void {
    // Break cycles.
    if (path.includes(source)) {
      return;
    }

    const node = this.getNodeOrThrow(source);
    const shouldContinue = visitor(node, [...path, source]);
    if (shouldContinue === false) {
      return;
    }

    Object.values(this.getConnections(source, relation)).forEach((child) =>
      this.traverse({ source: child.id, relation, visitor }, [...path, source]),
    );
  }

  getPath({ source = 'root', target }: { source?: string; target: string }): Option.Option<string[]> {
    return Function.pipe(
      this.getNode(source),
      Option.flatMap((node) => {
        let found: Option.Option<string[]> = Option.none();
        this.traverse({
          source: node.id,
          visitor: (node, path) => {
            if (Option.isSome(found)) {
              return false;
            }

            if (node.id === target) {
              found = Option.some(path);
            }
          },
        });

        return found;
      }),
    );
  }

  async waitForPath(
    params: { source?: string; target: string },
    { timeout = 5_000, interval = 500 }: { timeout?: number; interval?: number } = {},
  ): Promise<string[]> {
    const path = this.getPath(params);
    if (Option.isSome(path)) {
      return path.value;
    }

    const trigger = new Trigger<string[]>();
    const i = setInterval(() => {
      const path = this.getPath(params);
      if (Option.isSome(path)) {
        trigger.wake(path.value);
      }
    }, interval);

    return trigger.wait({ timeout }).finally(() => clearInterval(i));
  }

  /** @internal */
  _constructNode(node: NodeArg<any>): Option.Option<Node> {
    return Option.some({
      [graphSymbol]: this,
      data: null,
      properties: {},
      ...node,
    });
  }
}

/**
 * Creates a new Graph instance.
 */
export const make = (params?: GraphParams): Graph => {
  return new GraphImpl(params);
};

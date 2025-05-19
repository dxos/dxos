//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { Option, Record } from 'effect';

import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MakeOptional } from '@dxos/util';

import { type NodeArg, type Node, type Relation, type Action, type ActionGroup } from '../node';

const graphSymbol = Symbol('graph');
type DeepWriteable<T> = { -readonly [K in keyof T]: T[K] extends object ? DeepWriteable<T[K]> : T[K] };
type NodeInternal = DeepWriteable<Node> & { [graphSymbol]: Graph };

export const getGraph = (node: Node): Graph => {
  const graph = (node as NodeInternal)[graphSymbol];
  invariant(graph, 'Node is not associated with a graph.');
  return graph;
};

export const ROOT_ID = 'root';
export const ROOT_TYPE = 'dxos.org/type/GraphRoot';
export const ACTION_TYPE = 'dxos.org/type/GraphAction';
export const ACTION_GROUP_TYPE = 'dxos.org/type/GraphActionGroup';

export type GraphParams = {
  registry?: Registry.Registry;
  nodes?: MakeOptional<Node, 'data' | 'cacheable'>[];
  edges?: Record<string, string[]>;
  onExpand?: Graph['_onExpand'];
  onInitialize?: Graph['_onInitialize'];
  onRemoveNode?: Graph['_onRemoveNode'];
};

export type Edge = { source: string; target: string };
export type Edges = { inbound: string[]; outbound: string[] };

/**
 * The Graph represents the user interface information architecture of the application constructed via plugins.
 */
export class Graph {
  private readonly _onExpand?: (id: string, relation: Relation) => void;
  private readonly _onInitialize?: (id: string) => void;
  private readonly _onRemoveNode?: (id: string) => void;

  private readonly _registry: Registry.Registry;
  private readonly _expanded = Record.empty<string, boolean>();
  private readonly _initialized = Record.empty<string, boolean>();
  private readonly _initialEdges = Record.empty<string, Edges>();
  private readonly _initialNodes = Record.fromEntries([
    [ROOT_ID, this._constructNode({ id: ROOT_ID, type: ROOT_TYPE, data: null, properties: {} })],
  ]);

  private readonly _node = Rx.family<string, Rx.Writable<Option.Option<Node>>>((id) => {
    const initial = Option.flatten(Record.get(this._initialNodes, id));
    return Rx.make<Option.Option<Node>>(initial).pipe(Rx.keepAlive, Rx.withLabel(`graph:node:${id}`));
  });

  private readonly _nodeOrThrow = Rx.family<string, Rx.Rx<Node>>((id) => {
    return Rx.readable((get) => {
      const node = get(this._node(id));
      invariant(Option.isSome(node), `Node not available: ${id}`);
      return node.value;
    });
  });

  private readonly _edges = Rx.family<string, Rx.Writable<Edges>>((id) => {
    const initial = Record.get(this._initialEdges, id).pipe(Option.getOrElse(() => ({ inbound: [], outbound: [] })));
    return Rx.make<Edges>(initial).pipe(Rx.keepAlive, Rx.withLabel(`graph:edges:${id}`));
  });

  // NOTE: Currently the argument to the family needs to be referentially stable for the rx to be referentially stable.
  // TODO(wittjosiah): Rx feature request, support for something akin to `ComplexMap` to allow for complex arguments.
  private readonly _connections = Rx.family<string, Rx.Rx<Node[]>>((key) => {
    return Rx.readable((get) => {
      const [id, relation] = key.split('+');
      const edges = get(this._edges(id));
      return edges[relation as Relation]
        .map((id) => get(this._node(id)))
        .filter(Option.isSome)
        .map((o) => o.value);
      // TODO(wittjosiah): Do derived rx values need keep alive if they depend on other values which are kept alive?
    }).pipe(Rx.keepAlive, Rx.withLabel(`graph:connections:${key}`));
  });

  private readonly _actions = Rx.family<string, Rx.Rx<(Action | ActionGroup)[]>>((id) => {
    return Rx.readable((get) => {
      return get(this._connections(`${id}+outbound`)).filter(
        (node) => node.type === ACTION_TYPE || node.type === ACTION_GROUP_TYPE,
      );
    }).pipe(Rx.keepAlive, Rx.withLabel(`graph:actions:${id}`));
  });

  constructor({ registry, nodes, edges, onExpand, onInitialize, onRemoveNode }: GraphParams = {}) {
    this._registry = registry ?? Registry.make();
    this._onExpand = onExpand;
    this._onInitialize = onInitialize;
    this._onRemoveNode = onRemoveNode;

    if (nodes) {
      todo();
    }

    if (edges) {
      todo();
    }
  }

  static from(pickle: string, options: Omit<GraphParams, 'nodes' | 'edges'> = {}) {
    const { nodes, edges } = JSON.parse(pickle);
    return new Graph({ nodes, edges, ...options });
  }

  get root() {
    return Option.getOrThrow(this.getNode(ROOT_ID));
  }

  node(id: string): Rx.Rx<Option.Option<Node>> {
    return this._node(id);
  }

  nodeOrThrow(id: string): Rx.Rx<Node> {
    return this._nodeOrThrow(id);
  }

  connections(id: string, relation: Relation = 'outbound'): Rx.Rx<Node[]> {
    return this._connections(`${id}+${relation}`);
  }

  actions(id: string) {
    return this._actions(id);
  }

  edges(id: string): Rx.Rx<Edges> {
    return this._edges(id);
  }

  getNode(id: string): Option.Option<Node> {
    return this._registry.get(this.node(id));
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

  initialize(id: string) {
    const initialized = Record.get(this._initialized, id).pipe(Option.getOrElse(() => false));
    log('initialize', { id, initialized });
    if (!initialized) {
      this._onInitialize?.(id);
      Record.set(this._initialized, id, true);
    }
  }

  expand(id: string, relation: Relation = 'outbound') {
    const key = `${id}+${relation}`;
    const expanded = Record.get(this._expanded, key).pipe(Option.getOrElse(() => false));
    log('expand', { key, expanded });
    if (!expanded) {
      this._onExpand?.(id, relation);
      Record.set(this._expanded, key, true);
    }
  }

  addNodes(nodes: NodeArg<any, Record<string, any>>[]) {
    Rx.batch(() => nodes.map((node) => this.addNode(node)));
  }

  addNode({ nodes, edges, ...nodeArg }: NodeArg<any, Record<string, any>>) {
    const { id, type, data = null, properties = {} } = nodeArg;
    const nodeRx = this._node(id);
    const node = this._registry.get(nodeRx);
    Option.match(node, {
      onSome: (node) => {
        const typeChanged = node.type !== type;
        const dataChanged = node.data !== data;
        const propertiesChanged = Object.keys(properties).some((key) => node.properties[key] !== properties[key]);
        log('existing node', { typeChanged, dataChanged, propertiesChanged });
        if (typeChanged || dataChanged || propertiesChanged) {
          log('updating node', { id, type, data, properties });
          this._registry.set(
            nodeRx,
            Option.some({ ...node, type, data, properties: { ...node.properties, ...properties } }),
          );
        }
      },
      onNone: () => {
        log('new node', { id, type, data, properties });
        this._registry.set(nodeRx, this._constructNode({ id, type, data, properties }));
      },
    });

    if (nodes) {
      Rx.batch(() => {
        this.addNodes(nodes);
        const _edges = nodes.map((node) => ({ source: id, target: node.id }));
        this.addEdges(_edges);
      });
    }

    if (edges) {
      todo();
    }
  }

  removeNodes(ids: string[], edges = false) {
    Rx.batch(() => ids.map((id) => this.removeNode(id, edges)));
  }

  removeNode(id: string, edges = false) {
    const nodeRx = this._node(id);
    // TODO(wittjosiah): Is there a way to mark these rx values for garbage collection?
    this._registry.set(nodeRx, Option.none());
    // TODO(wittjosiah): Remove the node from the cache?
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

  addEdges(edges: Edge[]) {
    Rx.batch(() => edges.map((edge) => this.addEdge(edge)));
  }

  addEdge(edgeArg: Edge) {
    const sourceRx = this._edges(edgeArg.source);
    const source = this._registry.get(sourceRx);
    if (!source.outbound.includes(edgeArg.target)) {
      log('add outbound edge', { source: edgeArg.source, target: edgeArg.target });
      this._registry.set(sourceRx, { inbound: source.inbound, outbound: [...source.outbound, edgeArg.target] });
    }

    const targetRx = this._edges(edgeArg.target);
    const target = this._registry.get(targetRx);
    if (!target.inbound.includes(edgeArg.source)) {
      log('add inbound edge', { source: edgeArg.source, target: edgeArg.target });
      this._registry.set(targetRx, { inbound: [...target.inbound, edgeArg.source], outbound: target.outbound });
    }
  }

  removeEdges(edges: Edge[], removeOrphans = false) {
    Rx.batch(() => edges.map((edge) => this.removeEdge(edge, removeOrphans)));
  }

  removeEdge(edgeArg: Edge, removeOrphans = false) {
    const sourceRx = this._edges(edgeArg.source);
    const source = this._registry.get(sourceRx);
    if (source.outbound.includes(edgeArg.target)) {
      this._registry.set(sourceRx, {
        inbound: source.inbound,
        outbound: source.outbound.filter((id) => id !== edgeArg.target),
      });
    }

    const targetRx = this._edges(edgeArg.target);
    const target = this._registry.get(targetRx);
    if (target.inbound.includes(edgeArg.source)) {
      this._registry.set(targetRx, {
        inbound: target.inbound.filter((id) => id !== edgeArg.source),
        outbound: target.outbound,
      });
    }

    if (removeOrphans) {
      const source = this._registry.get(sourceRx);
      const target = this._registry.get(targetRx);
      if (source.outbound.length === 0 && source.inbound.length === 0 && edgeArg.source !== ROOT_ID) {
        this.removeNodes([edgeArg.source]);
      }
      if (target.outbound.length === 0 && target.inbound.length === 0 && edgeArg.target !== ROOT_ID) {
        this.removeNodes([edgeArg.target]);
      }
    }
  }

  sortEdges(id: string, relation: Relation, order: string[]) {
    const edgesRx = this._edges(id);
    const edges = this._registry.get(edgesRx);
    const unsorted = edges[relation].filter((id) => !order.includes(id)) ?? [];
    const sorted = order.filter((id) => edges[relation].includes(id)) ?? [];
    edges[relation].splice(0, edges[relation].length, ...[...sorted, ...unsorted]);
    this._registry.set(edgesRx, edges);
  }

  private _constructNode(node: Node): Option.Option<Node> {
    return Option.some({ ...node, [graphSymbol]: this });
  }
}

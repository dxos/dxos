//
// Copyright 2023 DXOS.org
//

import { type Registry, Rx } from '@effect-rx/rx-react';
import { Option, pipe, Record, Schema } from 'effect';

import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MakeOptional } from '@dxos/util';

import { type NodeArg, type Node, type Relation } from '../node';

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
  nodes?: MakeOptional<Node, 'data' | 'cacheable'>[];
  edges?: Record<string, string[]>;
  onExpand?: Graph['_onExpand'];
};

type Edge = { source: string; target: string };
const Edges = Schema.Struct({
  inbound: Schema.Array(Schema.String),
  outbound: Schema.Array(Schema.String),
});
type Edges = { inbound: string[]; outbound: string[] };

/**
 * The Graph represents the user interface information architecture of the application constructed via plugins.
 */
export class Graph {
  private readonly _onExpand?: (registry: Registry.Registry, id: string, relation: Relation) => void;
  private readonly _initialized = Record.empty<string, boolean>();
  private readonly _edges = Record.empty<string, Rx.Writable<Edges>>();
  private readonly _nodes = Record.fromEntries([
    [
      ROOT_ID,
      Rx.make<Option.Option<Node>>(this._constructNode({ id: ROOT_ID, type: ROOT_TYPE, data: null, properties: {} })),
    ],
  ]);

  readonly node = Rx.family<string, Rx.Writable<Option.Option<Node>>>((id) => {
    return pipe(
      this._nodes,
      Record.get(id),
      Option.match({
        onSome: (rx) => rx,
        onNone: () => Rx.make<Option.Option<Node>>(Option.none()),
      }),
    );
  });

  readonly edge = Rx.family<string, Rx.Writable<Edges>>((id) => {
    return pipe(
      this._edges,
      Record.get(id),
      Option.match({
        onSome: (rx) => rx,
        onNone: () => Rx.make<Edges>({ inbound: [], outbound: [] }),
      }),
    );
  });

  private readonly _nodesFamily = Rx.family<string, Rx.Rx<Node[]>>((key) => {
    return Rx.readable((get) => {
      const [id, relation] = key.split('+');
      const edges = get(this.edge(id));
      return edges[relation as Relation]
        .map((id) => get(this.node(id)))
        .filter(Option.isSome)
        .map((o) => o.value);
    });
  });

  constructor({ onExpand }: GraphParams = {}) {
    this._onExpand = onExpand;
  }

  nodes(id: string, relation: Relation = 'outbound'): Rx.Rx<Node[]> {
    return this._nodesFamily(`${id}+${relation}`);
  }

  edges(id: string): Rx.Rx<Edges> {
    return this.edge(id);
  }

  expand(registry: Registry.Registry, id: string, relation: Relation = 'outbound') {
    const key = `${id}+${relation}`;
    const initialized = Record.get(this._initialized, key).pipe(Option.getOrElse(() => false));
    log('expand', { key, initialized });
    if (!initialized) {
      const success = this._onExpand?.(registry, id, relation);
      Record.set(this._initialized, key, success);
    }
  }

  addNodes(registry: Registry.Registry, nodes: NodeArg<any, Record<string, any>>[]) {
    Rx.batch(() => nodes.map((node) => this.addNode(registry, node)));
  }

  addNode(registry: Registry.Registry, { nodes, edges, ...nodeArg }: NodeArg<any, Record<string, any>>) {
    const { id, type, data = null, properties = {} } = nodeArg;
    const nodeRx = this.node(id);
    const node = registry.get(nodeRx);
    Option.match(node, {
      onSome: (node) => {
        const typeChanged = node.type !== type;
        const dataChanged = node.data !== data;
        const propertiesChanged = Object.keys(properties).some((key) => node.properties[key] !== properties[key]);
        log('existing node', { typeChanged, dataChanged, propertiesChanged });
        if (typeChanged || dataChanged || propertiesChanged) {
          log('updating node', { id, type, data, properties });
          registry.set(nodeRx, Option.some({ ...node, type, data, properties: { ...node.properties, ...properties } }));
        }
      },
      onNone: () => {
        log('new node', { id, type, data, properties });
        registry.set(nodeRx, this._constructNode({ id, type, data, properties }));
      },
    });

    if (nodes) {
      Rx.batch(() => {
        this.addNodes(registry, nodes);
        const _edges = nodes.map((node) => ({ source: id, target: node.id }));
        this.addEdges(registry, _edges);
      });
    }

    if (edges) {
      todo();
    }
  }

  removeNodes(registry: Registry.Registry, ids: string[], edges = false) {
    Rx.batch(() => ids.map((id) => this.removeNode(registry, id, edges)));
  }

  removeNode(registry: Registry.Registry, id: string, edges = false) {
    const nodeRx = this.node(id);
    // TODO(wittjosiah): Is there a way to mark these rx values for garbage collection?
    registry.set(nodeRx, Option.none());
    Record.remove(this._nodes, id);

    if (edges) {
      const { inbound, outbound } = registry.get(this.edge(id));
      const edges = [
        ...inbound.map((source) => ({ source, target: id })),
        ...outbound.map((target) => ({ source: id, target })),
      ];
      this.removeEdges(registry, edges);
    }
  }

  addEdges(registry: Registry.Registry, edges: Edge[]) {
    Rx.batch(() => edges.map((edge) => this.addEdge(registry, edge)));
  }

  addEdge(registry: Registry.Registry, edgeArg: Edge) {
    const sourceRx = this.edge(edgeArg.source);
    const source = registry.get(sourceRx);
    if (!source.outbound.includes(edgeArg.target)) {
      log('add outbound edge', { source: edgeArg.source, target: edgeArg.target });
      registry.set(sourceRx, { inbound: source.inbound, outbound: [...source.outbound, edgeArg.target] });
    }

    const targetRx = this.edge(edgeArg.target);
    const target = registry.get(targetRx);
    if (!target.inbound.includes(edgeArg.source)) {
      log('add inbound edge', { source: edgeArg.source, target: edgeArg.target });
      registry.set(targetRx, { inbound: [...target.inbound, edgeArg.source], outbound: target.outbound });
    }
  }

  removeEdges(registry: Registry.Registry, edges: Edge[]) {
    Rx.batch(() => edges.map((edge) => this.removeEdge(registry, edge)));
  }

  removeEdge(registry: Registry.Registry, edgeArg: Edge) {
    const sourceRx = this.edge(edgeArg.source);
    const source = registry.get(sourceRx);
    if (source.outbound.includes(edgeArg.target)) {
      registry.set(sourceRx, {
        inbound: source.inbound,
        outbound: source.outbound.filter((id) => id !== edgeArg.target),
      });
    }

    const targetRx = this.edge(edgeArg.target);
    const target = registry.get(targetRx);
    if (target.inbound.includes(edgeArg.source)) {
      registry.set(targetRx, {
        inbound: target.inbound.filter((id) => id !== edgeArg.source),
        outbound: target.outbound,
      });
    }
  }

  private _constructNode(node: Node): Option.Option<Node> {
    return Option.some({ ...node, [graphSymbol]: this });
  }
}

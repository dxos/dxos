//
// Copyright 2025 DXOS.org
//

import { type Registry, Rx } from '@effect-rx/rx-react';
import { Array, Option, pipe, Record } from 'effect';

import { type CleanupFn } from '@dxos/async';
import { log } from '@dxos/log';
import { byPosition, isNonNullable, type Position } from '@dxos/util';

import { Graph } from './graph';
import { type Node, type NodeArg, type Relation } from '../node';

export type ConnectorExtension<T = any> = (params: { node: Node<T> }) => Rx.Rx<NodeArg<any>[]>;

type GuardedNodeType<T> = T extends (value: any) => value is infer N ? (N extends Node<infer D> ? D : unknown) : never;

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  connector?: ConnectorExtension;
  // Only for connector.
  relation?: Relation;
  filter?: (node: Node) => boolean;
}>;

export type CreateExtensionOptions<T = any> = {
  id: string;
  relation?: Relation;
  position?: Position;
  filter?: (node: Node) => node is Node<T>;
  connector?: ConnectorExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
};

export const createExtension = <T = any>(extension: CreateExtensionOptions<T>): BuilderExtension[] => {
  const { id, position = 'static', connector, ...rest } = extension;
  const getId = (key: string) => `${id}/${key}`;
  return [connector ? { ...rest, id: getId('connector'), position, connector } : undefined].filter(isNonNullable);
};

type ExtensionArg = BuilderExtension | BuilderExtension[] | ExtensionArg[];

export const flattenExtensions = (extension: ExtensionArg, acc: BuilderExtension[] = []): BuilderExtension[] => {
  if (Array.isArray(extension)) {
    return [...acc, ...extension.flatMap((ext) => flattenExtensions(ext, acc))];
  } else {
    return [...acc, extension];
  }
};

export class GraphBuilder {
  private readonly _connectorSubscriptions = new Map<string, CleanupFn>();
  private readonly _extensions = Rx.make(Record.empty<string, BuilderExtension>());
  private readonly _graph: Graph;

  constructor() {
    this._graph = new Graph({
      onExpand: (registry, id, relation) => this._onExpand(registry, id, relation),
    });
  }

  get graph() {
    return this._graph;
  }

  addExtension(registry: Registry.Registry, extensionArg: ExtensionArg): GraphBuilder {
    flattenExtensions(extensionArg).forEach((extension) => {
      const extensions = registry.get(this._extensions);
      registry.set(this._extensions, Record.set(extensions, extension.id, extension));
    });
    return this;
  }

  removeExtension(registry: Registry.Registry, id: string): GraphBuilder {
    const extensions = registry.get(this._extensions);
    registry.set(this._extensions, Record.remove(extensions, id));
    return this;
  }

  private readonly _connections = Rx.family<string, Rx.Rx<NodeArg<any>[]>>((key) => {
    return Rx.readable((get) => {
      const [id, relation] = key.split('+');
      const nodeOption = get(this._graph.node(id));
      if (Option.isNone(nodeOption)) {
        return [];
      }

      const node = nodeOption.value;
      return pipe(
        get(this._extensions),
        Record.values,
        Array.sortBy(byPosition),
        Array.filter(({ relation: _relation = 'outbound' }) => _relation === relation),
        Array.filter(({ filter }) => (filter ? filter(node) : true)),
        Array.map(({ connector }) => connector),
        Array.filter(isNonNullable),
        Array.map((connector) => connector({ node })),
        Array.flatMap((result) => get(result)),
      );
    });
  });

  private _onExpand(registry: Registry.Registry, id: string, relation: Relation) {
    log('onExpand', { id, relation });
    const connections = this._connections(`${id}+${relation}`);

    let previous: string[] = [];
    const cancel = registry.subscribe(connections, (nodes) => {
      log('update', { id, relation, nodes });
      const ids = nodes.map((n) => n.id);
      const removed = previous.filter((id) => !ids.includes(id));
      previous = ids;

      Rx.batch(() => {
        this._graph.removeEdges(
          registry,
          removed.map((target) => ({ source: id, target })),
        );
        this._graph.addNodes(registry, nodes);
        this._graph.addEdges(
          registry,
          nodes.map((node) =>
            relation === 'outbound' ? { source: id, target: node.id } : { source: node.id, target: id },
          ),
        );
      });
    });
    // Trigger subscription.
    registry.get(connections);

    this._connectorSubscriptions.set(id, cancel);
  }
}

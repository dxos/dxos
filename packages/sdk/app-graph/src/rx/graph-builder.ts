//
// Copyright 2025 DXOS.org
//

import { type Registry, Rx } from '@effect-rx/rx-react';
import { Array, Option, pipe, Record } from 'effect';

import { type CleanupFn } from '@dxos/async';
import { log } from '@dxos/log';
import { byPosition, isNonNullable, type Position } from '@dxos/util';

import { ACTION_GROUP_TYPE, ACTION_TYPE, Graph, type GraphParams } from './graph';
import { actionGroupSymbol, type ActionData, type Node, type NodeArg, type Relation } from '../node';

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension<T = any> = (params: { node: Node<T> }) => Rx.Rx<NodeArg<any>[]>;

/**
 * Constrained case of the connector extension for more easily adding actions to the graph.
 */
export type ActionsExtension<T = any> = (params: {
  node: Node<T>;
}) => Rx.Rx<Omit<NodeArg<ActionData>, 'type' | 'nodes' | 'edges'>[]>;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension<T = any> = (params: {
  node: Node<T>;
}) => Rx.Rx<Omit<NodeArg<typeof actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[]>;

type GuardedNodeType<T> = T extends (value: any) => value is infer N ? (N extends Node<infer D> ? D : unknown) : never;

/**
 * A graph builder extension is used to add nodes to the graph.
 *
 * @param params.id The unique id of the extension.
 * @param params.relation The relation the graph is being expanded from the existing node.
 * @param params.type If provided, all nodes returned are expected to have this type.
 * @param params.disposition Affects the order the extensions are processed in.
 * @param params.filter A filter function to determine if an extension should act on a node.
 * @param params.resolver A function to add nodes to the graph based on just the node id.
 * @param params.connector A function to add nodes to the graph based on a connection to an existing node.
 * @param params.actions A function to add actions to the graph based on a connection to an existing node.
 * @param params.actionGroups A function to add action groups to the graph based on a connection to an existing node.
 */
export type CreateExtensionOptions<T = any> = {
  id: string;
  relation?: Relation;
  position?: Position;
  filter?: (node: Node) => node is Node<T>;
  // resolver?: ResolverExtension;
  connector?: ConnectorExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
  actions?: ActionsExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
  actionGroups?: ActionGroupsExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = <T = any>(extension: CreateExtensionOptions<T>): BuilderExtension[] => {
  const { id, position = 'static', connector, actions, actionGroups, ...rest } = extension;
  const getId = (key: string) => `${id}/${key}`;
  return [
    // resolver ? { id: getId('resolver'), position, resolver } : undefined,
    connector ? { ...rest, id: getId('connector'), position, connector } : undefined,
    actionGroups
      ? ({
          ...rest,
          id: getId('actionGroups'),
          position,
          relation: 'outbound',
          connector: ({ node }) =>
            Rx.readable((get) =>
              get(actionGroups({ node })).map((arg) => ({ ...arg, data: actionGroupSymbol, type: ACTION_GROUP_TYPE })),
            ),
        } satisfies BuilderExtension)
      : undefined,
    actions
      ? ({
          ...rest,
          id: getId('actions'),
          position,
          relation: 'outbound',
          connector: ({ node }) =>
            Rx.readable((get) => get(actions({ node })).map((arg) => ({ ...arg, type: ACTION_TYPE }))),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(isNonNullable);
};

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  // resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  // Only for connector.
  relation?: Relation;
  filter?: (node: Node) => boolean;
}>;

type ExtensionArg = BuilderExtension | BuilderExtension[] | ExtensionArg[];

export const flattenExtensions = (extension: ExtensionArg, acc: BuilderExtension[] = []): BuilderExtension[] => {
  if (Array.isArray(extension)) {
    return [...acc, ...extension.flatMap((ext) => flattenExtensions(ext, acc))];
  } else {
    return [...acc, extension];
  }
};

/**
 * The builder provides an extensible way to compose the construction of the graph.
 */
// TODO(wittjosiah): Add api for setting subscription set and/or radius.
//   Should unsubscribe from nodes that are not in the set/radius.
//   Should track LRU nodes that are not in the set/radius and remove them beyond a certain threshold.
export class GraphBuilder {
  private readonly _connectorSubscriptions = new Map<string, CleanupFn>();
  private readonly _extensions = Rx.make(Record.empty<string, BuilderExtension>());
  private readonly _graph: Graph;

  constructor(params: Pick<GraphParams, 'nodes' | 'edges'> = {}) {
    this._graph = new Graph({
      ...params,
      onExpand: (registry, id, relation) => this._onExpand(registry, id, relation),
      onInitialize: (registry, id) => this._onInitialize(registry, id),
      onRemoveNode: (registry, id) => this._onRemoveNode(registry, id),
    });
  }

  static from(pickle?: string) {
    if (!pickle) {
      return new GraphBuilder();
    }

    const { nodes, edges } = JSON.parse(pickle);
    return new GraphBuilder({ nodes, edges });
  }

  get graph() {
    return this._graph;
  }

  get extensions() {
    return this._extensions;
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

  destroy() {
    this._connectorSubscriptions.forEach((unsubscribe) => unsubscribe());
    this._connectorSubscriptions.clear();
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

  private _onInitialize(registry: Registry.Registry, id: string) {
    log('onInitialize', { id });
  }

  private _onRemoveNode(_: Registry.Registry, id: string) {
    this._connectorSubscriptions.get(id)?.();
    this._connectorSubscriptions.delete(id);
  }
}

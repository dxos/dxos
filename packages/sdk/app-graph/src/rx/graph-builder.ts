//
// Copyright 2025 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { effect } from '@preact/signals-core';
import { Array, Option, pipe, Record } from 'effect';

import { type MulticastObservable, type CleanupFn } from '@dxos/async';
import { type Ref, type BaseObject } from '@dxos/echo-schema';
import { getSnapshot } from '@dxos/live-object';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { byPosition, getDebugName, isNonNullable, type Position } from '@dxos/util';

import { ACTION_GROUP_TYPE, ACTION_TYPE, Graph, type GraphParams } from './graph';
import { actionGroupSymbol, type ActionData, type Node, type NodeArg, type Relation } from '../node';

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension = (params: { get: Rx.Context; node: Node }) => NodeArg<any>[];

/**
 * Constrained case of the connector extension for more easily adding actions to the graph.
 */
export type ActionsExtension = (params: {
  get: Rx.Context;
  node: Node;
}) => Omit<NodeArg<ActionData>, 'type' | 'nodes' | 'edges'>[];

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension = (params: {
  get: Rx.Context;
  node: Node;
}) => Omit<NodeArg<typeof actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[];

/**
 * A graph builder extension is used to add nodes to the graph.
 *
 * @param params.id The unique id of the extension.
 * @param params.relation The relation the graph is being expanded from the existing node.
 * @param params.position Affects the order the extensions are processed in.
 * @param params.resolver A function to add nodes to the graph based on just the node id.
 * @param params.connector A function to add nodes to the graph based on a connection to an existing node.
 * @param params.actions A function to add actions to the graph based on a connection to an existing node.
 * @param params.actionGroups A function to add action groups to the graph based on a connection to an existing node.
 */
export type CreateExtensionOptions = {
  id: string;
  relation?: Relation;
  position?: Position;
  // resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  actions?: ActionsExtension;
  actionGroups?: ActionGroupsExtension;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = (extension: CreateExtensionOptions): BuilderExtension[] => {
  const { id, position = 'static', relation = 'outbound', connector, actions, actionGroups } = extension;
  const getId = (key: string) => `${id}/${key}`;
  return [
    // resolver ? { id: getId('resolver'), position, resolver } : undefined,
    connector
      ? ({
          id: getId('connector'),
          position,
          relation,
          connector: Rx.family((key) =>
            Rx.readable((get) => {
              return pipe(
                get(key),
                Option.flatMap((node) => (connector ? Option.some(connector({ get, node })) : Option.none())),
                Option.getOrElse(() => []),
              );
            }).pipe(Rx.keepAlive),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actionGroups
      ? ({
          id: getId('actionGroups'),
          position,
          relation: 'outbound',
          connector: Rx.family((node) =>
            Rx.readable((get) => {
              return pipe(
                get(node),
                Option.flatMap((node) => (actionGroups ? Option.some(actionGroups({ get, node })) : Option.none())),
                Option.getOrElse(() => []),
                Array.map((arg) => ({
                  ...arg,
                  data: actionGroupSymbol,
                  type: ACTION_GROUP_TYPE,
                })),
              );
            }).pipe(Rx.keepAlive),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actions
      ? ({
          id: getId('actions'),
          position,
          relation: 'outbound',
          connector: Rx.family((node) =>
            Rx.readable((get) => {
              return pipe(
                get(node),
                Option.flatMap((node) => (actions ? Option.some(actions({ get, node })) : Option.none())),
                Option.getOrElse(() => []),
                Array.map((arg) => ({ ...arg, type: ACTION_TYPE })),
              );
            }).pipe(Rx.keepAlive),
          ),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(isNonNullable);
};

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  relation?: Relation; // Only for connector.
  // resolver?: ResolverExtension;
  connector?: (node: Rx.Rx<Option.Option<Node>>) => Rx.Rx<NodeArg<any>[]>;
}>;

export type BuilderExtensions = BuilderExtension | BuilderExtension[] | BuilderExtensions[];

export const flattenExtensions = (extension: BuilderExtensions, acc: BuilderExtension[] = []): BuilderExtension[] => {
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
  private readonly _registry: Registry.Registry;
  private readonly _graph: Graph;

  constructor({ registry, ...params }: Pick<GraphParams, 'registry' | 'nodes' | 'edges'> = {}) {
    this._registry = registry ?? Registry.make();
    this._graph = new Graph({
      ...params,
      registry: this._registry,
      onExpand: (id, relation) => this._onExpand(id, relation),
      onInitialize: (id) => this._onInitialize(id),
      onRemoveNode: (id) => this._onRemoveNode(id),
    });
  }

  static from(pickle?: string, registry?: Registry.Registry) {
    if (!pickle) {
      return new GraphBuilder({ registry });
    }

    const { nodes, edges } = JSON.parse(pickle);
    return new GraphBuilder({ nodes, edges, registry });
  }

  get graph() {
    return this._graph;
  }

  get extensions() {
    return this._extensions;
  }

  addExtension(extensions: BuilderExtensions): GraphBuilder {
    flattenExtensions(extensions).forEach((extension) => {
      const extensions = this._registry.get(this._extensions);
      this._registry.set(this._extensions, Record.set(extensions, extension.id, extension));
    });
    return this;
  }

  removeExtension(id: string): GraphBuilder {
    const extensions = this._registry.get(this._extensions);
    this._registry.set(this._extensions, Record.remove(extensions, id));
    return this;
  }

  explore() {}

  destroy() {
    this._connectorSubscriptions.forEach((unsubscribe) => unsubscribe());
    this._connectorSubscriptions.clear();
  }

  private readonly _connections = Rx.family<string, Rx.Rx<NodeArg<any>[]>>((key) => {
    return Rx.readable((get) => {
      const [id, relation] = key.split('+');
      const node = this._graph.node(id);

      return pipe(
        get(this._extensions),
        Record.values,
        Array.sortBy(byPosition),
        Array.filter(({ relation: _relation = 'outbound' }) => _relation === relation),
        Array.map(({ id, connector }) => {
          const result = connector?.(node);
          return result;
        }),
        Array.filter(isNonNullable),
        Array.flatMap((result) => get(result)),
      );
    }).pipe(Rx.keepAlive);
  });

  private _onExpand(id: string, relation: Relation) {
    log('onExpand', { id, relation });
    const connections = this._connections(`${id}+${relation}`);

    let previous: string[] = [];
    const cancel = this._registry.subscribe(connections, (nodes) => {
      const ids = nodes.map((n) => n.id);
      const removed = previous.filter((id) => !ids.includes(id));
      previous = ids;

      log.info('update', { id, relation, ids, removed });
      Rx.batch(() => {
        this._graph.removeEdges(
          removed.map((target) => ({ source: id, target })),
          true,
        );
        this._graph.addNodes(nodes);
        this._graph.addEdges(
          nodes.map((node) =>
            relation === 'outbound' ? { source: id, target: node.id } : { source: node.id, target: id },
          ),
        );
      });
    });
    // Trigger subscription.
    this._registry.get(connections);

    this._connectorSubscriptions.set(id, cancel);
  }

  private _onInitialize(id: string) {
    log('onInitialize', { id });
  }

  private _onRemoveNode(id: string) {
    this._connectorSubscriptions.get(id)?.();
    this._connectorSubscriptions.delete(id);
  }
}

const liveObjectFamily = Rx.family((live: Live<BaseObject>) => {
  return Rx.readable((get) => {
    const dispose = effect(() => {
      const _ = getSnapshot(live);
      get.setSelf(live);
    });

    get.addFinalizer(() => dispose());
  }).pipe(Rx.keepAlive);
});

export const rxFromLive = <T extends BaseObject>(live: Live<T>): Rx.Rx<T> => {
  return liveObjectFamily(live) as Rx.Rx<T>;
};

const refFamily = Rx.family((ref: Ref<any>) => {
  return Rx.readable((get) => {
    const dispose = effect(() => {
      get.setSelf(ref.target);
    });

    get.addFinalizer(() => dispose());
  }).pipe(Rx.keepAlive);
});

export const rxFromRef = <T>(ref: Ref<T>): Rx.Rx<T | undefined> => {
  return refFamily(ref) as Rx.Rx<T | undefined>;
};

const observableFamily = Rx.family((observable: MulticastObservable<any>) => {
  return Rx.readable((get) => {
    const subscription = observable.subscribe((value) => get.setSelf(value));

    get.addFinalizer(() => subscription.unsubscribe());

    return observable.get();
  }).pipe(Rx.keepAlive);
});

export const rxFromObservable = <T>(observable: MulticastObservable<T>): Rx.Rx<T> => {
  return observableFamily(observable) as Rx.Rx<T>;
};

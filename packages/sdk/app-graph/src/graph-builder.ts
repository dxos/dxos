//
// Copyright 2025 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { effect } from '@preact/signals-core';
import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { type CleanupFn, type MulticastObservable, type Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { type MaybePromise, type Position, byPosition, getDebugName, isNode, isNonNullable } from '@dxos/util';

import { ACTION_GROUP_TYPE, ACTION_TYPE, type ExpandableGraph, Graph, type GraphParams, ROOT_ID } from './graph';
import { type ActionData, type Node, type NodeArg, type Relation, actionGroupSymbol } from './node';

/**
 * Graph builder extension for adding nodes to the graph based on a node id.
 */
export type ResolverExtension = (id: string) => Rx.Rx<NodeArg<any> | null>;

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension = (node: Rx.Rx<Option.Option<Node>>) => Rx.Rx<NodeArg<any>[]>;

/**
 * Constrained case of the connector extension for more easily adding actions to the graph.
 */
export type ActionsExtension = (
  node: Rx.Rx<Option.Option<Node>>,
) => Rx.Rx<Omit<NodeArg<ActionData>, 'type' | 'nodes' | 'edges'>[]>;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension = (
  node: Rx.Rx<Option.Option<Node>>,
) => Rx.Rx<Omit<NodeArg<typeof actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[]>;

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
  resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  actions?: ActionsExtension;
  actionGroups?: ActionGroupsExtension;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = (extension: CreateExtensionOptions): BuilderExtension[] => {
  const {
    id,
    position = 'static',
    relation = 'outbound',
    resolver: _resolver,
    connector: _connector,
    actions: _actions,
    actionGroups: _actionGroups,
  } = extension;
  const getId = (key: string) => `${id}/${key}`;

  const resolver =
    _resolver && Rx.family((id: string) => _resolver(id).pipe(Rx.withLabel(`graph-builder:_resolver:${id}`)));

  const connector =
    _connector &&
    Rx.family((node: Rx.Rx<Option.Option<Node>>) =>
      _connector(node).pipe(Rx.withLabel(`graph-builder:_connector:${id}`)),
    );

  const actionGroups =
    _actionGroups &&
    Rx.family((node: Rx.Rx<Option.Option<Node>>) =>
      _actionGroups(node).pipe(Rx.withLabel(`graph-builder:_actionGroups:${id}`)),
    );

  const actions =
    _actions &&
    Rx.family((node: Rx.Rx<Option.Option<Node>>) => _actions(node).pipe(Rx.withLabel(`graph-builder:_actions:${id}`)));

  return [
    resolver ? { id: getId('resolver'), position, resolver } : undefined,
    connector
      ? ({
          id: getId('connector'),
          position,
          relation,
          connector: Rx.family((node) =>
            Rx.make((get) => {
              try {
                return get(connector(node));
              } catch {
                log.warn('Error in connector', { id: getId('connector'), node });
                return [];
              }
            }).pipe(Rx.withLabel(`graph-builder:connector:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actionGroups
      ? ({
          id: getId('actionGroups'),
          position,
          relation: 'outbound',
          connector: Rx.family((node) =>
            Rx.make((get) => {
              try {
                return get(actionGroups(node)).map((arg) => ({
                  ...arg,
                  data: actionGroupSymbol,
                  type: ACTION_GROUP_TYPE,
                }));
              } catch {
                log.warn('Error in actionGroups', { id: getId('actionGroups'), node });
                return [];
              }
            }).pipe(Rx.withLabel(`graph-builder:connector:actionGroups:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actions
      ? ({
          id: getId('actions'),
          position,
          relation: 'outbound',
          connector: Rx.family((node) =>
            Rx.make((get) => {
              try {
                return get(actions(node)).map((arg) => ({ ...arg, type: ACTION_TYPE }));
              } catch {
                log.warn('Error in actions', { id: getId('actions'), node });
                return [];
              }
            }).pipe(Rx.withLabel(`graph-builder:connector:actions:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(isNonNullable);
};

export type GraphBuilderTraverseOptions = {
  visitor: (node: Node, path: string[]) => MaybePromise<boolean | void>;
  registry?: Registry.Registry;
  source?: string;
  relation?: Relation;
};

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  relation?: Relation; // Only for connector.
  resolver?: ResolverExtension;
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
  // TODO(wittjosiah): Use Context.
  private readonly _subscriptions = new Map<string, CleanupFn>();
  private readonly _extensions = Rx.make(Record.empty<string, BuilderExtension>()).pipe(
    Rx.keepAlive,
    Rx.withLabel('graph-builder:extensions'),
  );
  private readonly _initialized: Record<string, Trigger> = {};
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

  static from(pickle?: string, registry?: Registry.Registry): GraphBuilder {
    if (!pickle) {
      return new GraphBuilder({ registry });
    }

    const { nodes, edges } = JSON.parse(pickle);
    return new GraphBuilder({ nodes, edges, registry });
  }

  get graph(): ExpandableGraph {
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

  async explore(
    // TODO(wittjosiah): Currently defaulting to new registry.
    //   Currently unsure about how to handle nodes which are expanded in the background.
    //   This seems like a good place to start.
    { registry = Registry.make(), source = ROOT_ID, relation = 'outbound', visitor }: GraphBuilderTraverseOptions,
    path: string[] = [],
  ): Promise<void> {
    // Break cycles.
    if (path.includes(source)) {
      return;
    }

    // TODO(wittjosiah): This is a workaround for esm not working in the test runner.
    //   Switching to vitest is blocked by having node esm versions of echo-schema & echo-signals.
    if (!isNode()) {
      const { yieldOrContinue } = await import('main-thread-scheduling');
      await yieldOrContinue('idle');
    }

    const node = registry.get(this._graph.nodeOrThrow(source));
    const shouldContinue = await visitor(node, [...path, node.id]);
    if (shouldContinue === false) {
      return;
    }

    const nodes = Object.values(this._registry.get(this._extensions))
      .filter((extension) => relation === (extension.relation ?? 'outbound'))
      .map((extension) => extension.connector)
      .filter(isNonNullable)
      .flatMap((connector) => registry.get(connector(this._graph.node(source))));

    await Promise.all(
      nodes.map((nodeArg) => {
        registry.set(this._graph._node(nodeArg.id), this._graph._constructNode(nodeArg));
        return this.explore({ registry, source: nodeArg.id, relation, visitor }, [...path, node.id]);
      }),
    );

    if (registry !== this._registry) {
      registry.reset();
      registry.dispose();
    }
  }

  destroy(): void {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }

  private readonly _resolvers = Rx.family<string, Rx.Rx<Option.Option<NodeArg<any>>>>((id) => {
    return Rx.make((get) => {
      return Function.pipe(
        get(this._extensions),
        Record.values,
        Array.sortBy(byPosition),
        Array.map(({ resolver }) => resolver),
        Array.filter(isNonNullable),
        Array.map((resolver) => get(resolver(id))),
        Array.filter(isNonNullable),
        Array.head,
      );
    });
  });

  private readonly _connectors = Rx.family<string, Rx.Rx<NodeArg<any>[]>>((key) => {
    return Rx.make((get) => {
      const [id, relation] = key.split('+');
      const node = this._graph.node(id);

      return Function.pipe(
        get(this._extensions),
        Record.values,
        // TODO(wittjosiah): Sort on write rather than read.
        Array.sortBy(byPosition),
        Array.filter(({ relation: _relation = 'outbound' }) => _relation === relation),
        Array.map(({ connector }) => connector?.(node)),
        Array.filter(isNonNullable),
        Array.flatMap((result) => get(result)),
      );
    }).pipe(Rx.withLabel(`graph-builder:connectors:${key}`));
  });

  private _onExpand(id: string, relation: Relation): void {
    log('onExpand', { id, relation, registry: getDebugName(this._registry) });
    const connectors = this._connectors(`${id}+${relation}`);

    let previous: string[] = [];
    const cancel = this._registry.subscribe(
      connectors,
      (nodes) => {
        const ids = nodes.map((n) => n.id);
        const removed = previous.filter((id) => !ids.includes(id));
        previous = ids;

        log('update', { id, relation, ids, removed });
        const update = () => {
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
            this._graph.sortEdges(
              id,
              relation,
              nodes.map(({ id }) => id),
            );
          });
        };

        // TODO(wittjosiah): Remove `requestAnimationFrame` once we have a better solution.
        //  This is a workaround to avoid a race condition where the graph is updated during React render.
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(update);
        } else {
          update();
        }
      },
      { immediate: true },
    );

    this._subscriptions.set(id, cancel);
  }

  // TODO(wittjosiah): If the same node is added by a connector, the resolver should probably cancel itself?
  private async _onInitialize(id: string) {
    log('onInitialize', { id });
    const resolver = this._resolvers(id);

    const cancel = this._registry.subscribe(
      resolver,
      (node) => {
        const trigger = this._initialized[id];
        Option.match(node, {
          onSome: (node) => {
            this._graph.addNodes([node]);
            trigger?.wake();
          },
          onNone: () => {
            trigger?.wake();
            this._graph.removeNodes([id]);
          },
        });
      },
      { immediate: true },
    );

    this._subscriptions.set(id, cancel);
  }

  private _onRemoveNode(id: string): void {
    this._subscriptions.get(id)?.();
    this._subscriptions.delete(id);
  }
}

/**
 * Creates an Rx.Rx<T> from a callback which accesses signals.
 * Will return a new rx instance each time.
 */
export const rxFromSignal = <T>(cb: () => T): Rx.Rx<T> => {
  return Rx.make((get) => {
    const dispose = effect(() => {
      get.setSelf(cb());
    });

    get.addFinalizer(() => dispose());

    return cb();
  });
};

const observableFamily = Rx.family((observable: MulticastObservable<any>) => {
  return Rx.make((get) => {
    const subscription = observable.subscribe((value) => get.setSelf(value));

    get.addFinalizer(() => subscription.unsubscribe());

    return observable.get();
  });
});

/**
 * Creates an Rx.Rx<T> from a MulticastObservable<T>
 * Will return the same rx instance for the same observable.
 */
export const rxFromObservable = <T>(observable: MulticastObservable<T>): Rx.Rx<T> => {
  return observableFamily(observable) as Rx.Rx<T>;
};

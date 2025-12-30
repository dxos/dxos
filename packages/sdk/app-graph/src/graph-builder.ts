//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Record from 'effect/Record';
import type * as Schema from 'effect/Schema';

import { type CleanupFn, type Trigger } from '@dxos/async';
import { type Entity, type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MaybePromise, type Position, byPosition, getDebugName, isNode, isNonNullable } from '@dxos/util';

import * as Graph from './graph';
import * as Node from './node';
import * as NodeMatcher from './node-matcher';

//
// Extension Types
//

/**
 * Graph builder extension for adding nodes to the graph based on a node id.
 */
export type ResolverExtension = (id: string) => Atom.Atom<Node.NodeArg<any> | null>;

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension = (node: Atom.Atom<Option.Option<Node.Node>>) => Atom.Atom<Node.NodeArg<any>[]>;

/**
 * Constrained case of the connector extension for more easily adding actions to the graph.
 */
export type ActionsExtension = (
  node: Atom.Atom<Option.Option<Node.Node>>,
) => Atom.Atom<Omit<Node.NodeArg<Node.ActionData>, 'type' | 'nodes' | 'edges'>[]>;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension = (
  node: Atom.Atom<Option.Option<Node.Node>>,
) => Atom.Atom<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[]>;

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  relation?: Node.Relation; // Only for connector.
  resolver?: ResolverExtension;
  connector?: (node: Atom.Atom<Option.Option<Node.Node>>) => Atom.Atom<Node.NodeArg<any>[]>;
}>;

export type BuilderExtensions = BuilderExtension | BuilderExtension[] | BuilderExtensions[];

//
// GraphBuilder Core
//

export type GraphBuilderTraverseOptions = {
  visitor: (node: Node.Node, path: string[]) => MaybePromise<boolean | void>;
  registry?: Registry.Registry;
  source?: string;
  relation?: Node.Relation;
};

/**
 * Identifier denoting a GraphBuilder.
 */
export const GraphBuilderTypeId: unique symbol = Symbol.for('@dxos/app-graph/GraphBuilder');
export type GraphBuilderTypeId = typeof GraphBuilderTypeId;

/**
 * GraphBuilder interface.
 */
export interface GraphBuilder extends Pipeable.Pipeable {
  readonly [GraphBuilderTypeId]: GraphBuilderTypeId;
  readonly graph: Graph.ExpandableGraph;
  readonly extensions: Atom.Atom<Record<string, BuilderExtension>>;
}

/**
 * The builder provides an extensible way to compose the construction of the graph.
 * @internal
 */
// TODO(wittjosiah): Add api for setting subscription set and/or radius.
//   Should unsubscribe from nodes that are not in the set/radius.
//   Should track LRU nodes that are not in the set/radius and remove them beyond a certain threshold.
class GraphBuilderImpl implements GraphBuilder {
  readonly [GraphBuilderTypeId]: GraphBuilderTypeId = GraphBuilderTypeId;

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
  }

  // TODO(wittjosiah): Use Context.
  readonly _subscriptions = new Map<string, CleanupFn>();
  readonly _extensions = Atom.make(Record.empty<string, BuilderExtension>()).pipe(
    Atom.keepAlive,
    Atom.withLabel('graph-builder:extensions'),
  );
  readonly _initialized: Record<string, Trigger> = {};
  readonly _registry: Registry.Registry;
  readonly _graph: Graph.Graph & {
    _node: (id: string) => Atom.Writable<Option.Option<Node.Node>>;
    _constructNode: (node: Node.NodeArg<any>) => Option.Option<Node.Node>;
  };

  constructor({ registry, ...params }: Pick<Graph.GraphProps, 'registry' | 'nodes' | 'edges'> = {}) {
    this._registry = registry ?? Registry.make();
    const graph = Graph.make({
      ...params,
      registry: this._registry,
      onExpand: (id, relation) => this._onExpand(id, relation),
      onInitialize: (id) => this._onInitialize(id),
      onRemoveNode: (id) => this._onRemoveNode(id),
    });
    // Access internal methods via type assertion since GraphBuilder needs them
    this._graph = graph as Graph.Graph & {
      _node: (id: string) => Atom.Writable<Option.Option<Node.Node>>;
      _constructNode: (node: Node.NodeArg<any>) => Option.Option<Node.Node>;
    };
  }

  get graph(): Graph.ExpandableGraph {
    return this._graph;
  }

  get extensions() {
    return this._extensions;
  }

  private readonly _resolvers = Atom.family<string, Atom.Atom<Option.Option<Node.NodeArg<any>>>>((id) => {
    return Atom.make((get) => {
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

  private readonly _connectors = Atom.family<string, Atom.Atom<Node.NodeArg<any>[]>>((key) => {
    return Atom.make((get) => {
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
    }).pipe(Atom.withLabel(`graph-builder:connectors:${key}`));
  });

  private _onExpand(id: string, relation: Node.Relation): void {
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
          Atom.batch(() => {
            Graph.removeEdges(
              this._graph,
              removed.map((target) => ({ source: id, target })),
              true,
            );
            Graph.addNodes(this._graph, nodes);
            Graph.addEdges(
              this._graph,
              nodes.map((node) =>
                relation === 'outbound' ? { source: id, target: node.id } : { source: node.id, target: id },
              ),
            );
            Graph.sortEdges(
              this._graph,
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
            Graph.addNodes(this._graph, [node]);
            trigger?.wake();
          },
          onNone: () => {
            trigger?.wake();
            Graph.removeNodes(this._graph, [id]);
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
 * Creates a new GraphBuilder instance.
 */
export const make = (params?: Pick<Graph.GraphProps, 'registry' | 'nodes' | 'edges'>): GraphBuilder => {
  return new GraphBuilderImpl(params);
};

/**
 * Creates a GraphBuilder from a serialized pickle string.
 */
export const from = (pickle?: string, registry?: Registry.Registry): GraphBuilder => {
  if (!pickle) {
    return make({ registry });
  }

  const { nodes, edges } = JSON.parse(pickle);
  return make({ nodes, edges, registry });
};

/**
 * Implementation helper for addExtension.
 */
const addExtensionImpl = (builder: GraphBuilder, extensions: BuilderExtensions): GraphBuilder => {
  const internal = builder as GraphBuilderImpl;
  flattenExtensions(extensions).forEach((extension) => {
    const extensions = internal._registry.get(internal._extensions);
    internal._registry.set(internal._extensions, Record.set(extensions, extension.id, extension));
  });
  return builder;
};

/**
 * Add extensions to the graph builder.
 */
export function addExtension(builder: GraphBuilder, extensions: BuilderExtensions): GraphBuilder;
export function addExtension(extensions: BuilderExtensions): (builder: GraphBuilder) => GraphBuilder;
export function addExtension(
  builderOrExtensions: GraphBuilder | BuilderExtensions,
  extensions?: BuilderExtensions,
): GraphBuilder | ((builder: GraphBuilder) => GraphBuilder) {
  if (extensions === undefined) {
    // Curried: addExtension(extensions)
    const extensions = builderOrExtensions as BuilderExtensions;
    return (builder: GraphBuilder) => addExtensionImpl(builder, extensions);
  } else {
    // Direct: addExtension(builder, extensions)
    const builder = builderOrExtensions as GraphBuilder;
    return addExtensionImpl(builder, extensions);
  }
}

/**
 * Implementation helper for removeExtension.
 */
const removeExtensionImpl = (builder: GraphBuilder, id: string): GraphBuilder => {
  const internal = builder as GraphBuilderImpl;
  const extensions = internal._registry.get(internal._extensions);
  internal._registry.set(internal._extensions, Record.remove(extensions, id));
  return builder;
};

/**
 * Remove an extension from the graph builder.
 */
export function removeExtension(builder: GraphBuilder, id: string): GraphBuilder;
export function removeExtension(id: string): (builder: GraphBuilder) => GraphBuilder;
export function removeExtension(
  builderOrId: GraphBuilder | string,
  id?: string,
): GraphBuilder | ((builder: GraphBuilder) => GraphBuilder) {
  if (typeof builderOrId === 'string') {
    // Curried: removeExtension(id)
    const id = builderOrId;
    return (builder: GraphBuilder) => removeExtensionImpl(builder, id);
  } else {
    // Direct: removeExtension(builder, id)
    const builder = builderOrId;
    return removeExtensionImpl(builder, id!);
  }
}

/**
 * Implementation helper for explore.
 */
const exploreImpl = async (
  builder: GraphBuilder,
  options: GraphBuilderTraverseOptions,
  path: string[] = [],
): Promise<void> => {
  const internal = builder as GraphBuilderImpl;
  const { registry = Registry.make(), source = Node.RootId, relation = 'outbound', visitor } = options;
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

  const node = registry.get(internal._graph.nodeOrThrow(source));
  const shouldContinue = await visitor(node, [...path, node.id]);
  if (shouldContinue === false) {
    return;
  }

  const nodes = Object.values(internal._registry.get(internal._extensions))
    .filter((extension) => relation === (extension.relation ?? 'outbound'))
    .map((extension) => extension.connector)
    .filter(isNonNullable)
    .flatMap((connector) => registry.get(connector(internal._graph.node(source))));

  await Promise.all(
    nodes.map((nodeArg) => {
      registry.set(internal._graph._node(nodeArg.id), internal._graph._constructNode(nodeArg));
      return exploreImpl(builder, { registry, source: nodeArg.id, relation, visitor }, [...path, node.id]);
    }),
  );

  if (registry !== internal._registry) {
    registry.reset();
    registry.dispose();
  }
};

/**
 * Explore the graph by traversing it with the given options.
 */
export function explore(builder: GraphBuilder, options: GraphBuilderTraverseOptions, path?: string[]): Promise<void>;
export function explore(
  options: GraphBuilderTraverseOptions,
  path?: string[],
): (builder: GraphBuilder) => Promise<void>;
export function explore(
  builderOrOptions: GraphBuilder | GraphBuilderTraverseOptions,
  optionsOrPath?: GraphBuilderTraverseOptions | string[],
  path?: string[],
): Promise<void> | ((builder: GraphBuilder) => Promise<void>) {
  if (typeof builderOrOptions === 'object' && 'visitor' in builderOrOptions) {
    // Curried: explore(options, path?)
    const options = builderOrOptions as GraphBuilderTraverseOptions;
    const path = Array.isArray(optionsOrPath) ? optionsOrPath : undefined;
    return (builder: GraphBuilder) => exploreImpl(builder, options, path);
  } else {
    // Direct: explore(builder, options, path?)
    const builder = builderOrOptions as GraphBuilder;
    const options = optionsOrPath as GraphBuilderTraverseOptions;
    const pathArg = path ?? (Array.isArray(optionsOrPath) ? optionsOrPath : undefined);
    return exploreImpl(builder, options, pathArg);
  }
}

/**
 * Implementation helper for destroy.
 */
const destroyImpl = (builder: GraphBuilder): void => {
  const internal = builder as GraphBuilderImpl;
  internal._subscriptions.forEach((unsubscribe) => unsubscribe());
  internal._subscriptions.clear();
};

/**
 * Destroy the graph builder and clean up resources.
 */
export function destroy(builder: GraphBuilder): void;
export function destroy(): (builder: GraphBuilder) => void;
export function destroy(builder?: GraphBuilder): void | ((builder: GraphBuilder) => void) {
  if (builder === undefined) {
    // Curried: destroy()
    return (builder: GraphBuilder) => destroyImpl(builder);
  } else {
    // Direct: destroy(builder)
    return destroyImpl(builder);
  }
}

//
// Extension Creation
//

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
export type CreateExtensionRawOptions = {
  id: string;
  relation?: Node.Relation;
  position?: Position;
  resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  actions?: ActionsExtension;
  actionGroups?: ActionGroupsExtension;
};

/**
 * Create a graph builder extension (low-level API that works directly with Atoms).
 */
export const createExtensionRaw = (extension: CreateExtensionRawOptions): BuilderExtension[] => {
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
    _resolver && Atom.family((id: string) => _resolver(id).pipe(Atom.withLabel(`graph-builder:_resolver:${id}`)));

  const connector =
    _connector &&
    Atom.family((node: Atom.Atom<Option.Option<Node.Node>>) =>
      _connector(node).pipe(Atom.withLabel(`graph-builder:_connector:${id}`)),
    );

  const actionGroups =
    _actionGroups &&
    Atom.family((node: Atom.Atom<Option.Option<Node.Node>>) =>
      _actionGroups(node).pipe(Atom.withLabel(`graph-builder:_actionGroups:${id}`)),
    );

  const actions =
    _actions &&
    Atom.family((node: Atom.Atom<Option.Option<Node.Node>>) =>
      _actions(node).pipe(Atom.withLabel(`graph-builder:_actions:${id}`)),
    );

  return [
    resolver ? { id: getId('resolver'), position, resolver } : undefined,
    connector
      ? ({
          id: getId('connector'),
          position,
          relation,
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(connector(node));
              } catch {
                log.warn('Error in connector', { id: getId('connector'), node });
                return [];
              }
            }).pipe(Atom.withLabel(`graph-builder:connector:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actionGroups
      ? ({
          id: getId('actionGroups'),
          position,
          relation: 'outbound',
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(actionGroups(node)).map((arg) => ({
                  ...arg,
                  data: Node.actionGroupSymbol,
                  type: Node.ActionGroupType,
                }));
              } catch {
                log.warn('Error in actionGroups', { id: getId('actionGroups'), node });
                return [];
              }
            }).pipe(Atom.withLabel(`graph-builder:connector:actionGroups:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
    actions
      ? ({
          id: getId('actions'),
          position,
          relation: 'outbound',
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(actions(node)).map((arg) => ({ ...arg, type: Node.ActionType }));
              } catch {
                log.warn('Error in actions', { id: getId('actions'), node });
                return [];
              }
            }).pipe(Atom.withLabel(`graph-builder:connector:actions:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(isNonNullable);
};

/**
 * Options for creating a graph builder extension with simplified API.
 */
export type CreateExtensionOptions<TMatched = Node.Node> = {
  id: string;
  match: (node: Node.Node) => Option.Option<TMatched>;
  actions?: (matched: TMatched, get: Atom.Context) => Omit<Node.NodeArg<Node.ActionData, any>, 'type'>[];
  connector?: (matched: TMatched, get: Atom.Context) => Node.NodeArg<any, any>[];
  resolver?: (id: string, get: Atom.Context) => Node.NodeArg<any, any> | null;
  relation?: Node.Relation;
  position?: Position;
};

/**
 * Create a graph builder extension with simplified API.
 */
export const createExtension = <TMatched = Node.Node>(
  options: CreateExtensionOptions<TMatched>,
): BuilderExtension[] => {
  const { id, match, actions, connector, resolver, relation, position } = options;

  const connectorExtension = connector ? createConnector(match, connector) : undefined;

  const actionsExtension = actions
    ? (node: Atom.Atom<Option.Option<Node.Node>>) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap(match),
            Option.map((matched) => actions(matched, get)),
            Option.getOrElse(() => []),
          ),
        )
    : undefined;

  const resolverExtension = resolver ? (id: string) => Atom.make((get) => resolver(id, get) ?? null) : undefined;

  return createExtensionRaw({
    id,
    relation,
    position,
    connector: connectorExtension,
    actions: actionsExtension,
    resolver: resolverExtension,
  });
};

/**
 * Create a connector extension from a matcher and factory function.
 * The factory's data type is inferred from the matcher's return type.
 */
export const createConnector = <TData>(
  matcher: (node: Node.Node) => Option.Option<TData>,
  factory: (data: TData, get: Atom.Context) => Node.NodeArg<any>[],
): ConnectorExtension => {
  return (node: Atom.Atom<Option.Option<Node.Node>>) =>
    Atom.make((get) =>
      Function.pipe(
        get(node),
        Option.flatMap(matcher),
        Option.map((data) => factory(data, get)),
        Option.getOrElse(() => []),
      ),
    );
};

/**
 * Options for creating a type-based extension.
 */
export type CreateTypeExtensionOptions<T extends Type.Entity.Any = Type.Entity.Any> = {
  id: string;
  type: T;
  actions?: (
    object: Entity.Entity<Schema.Schema.Type<T>>,
    get: Atom.Context,
  ) => Omit<Node.NodeArg<Node.ActionData>, 'type'>[];
  connector?: (object: Entity.Entity<Schema.Schema.Type<T>>, get: Atom.Context) => Node.NodeArg<any>[];
  relation?: Node.Relation;
  position?: Position;
};

/**
 * Create an extension that matches nodes by schema type.
 * The entity type is inferred from the schema type and works for both object and relation schemas.
 */
export const createTypeExtension = <T extends Type.Entity.Any>(
  options: CreateTypeExtensionOptions<T>,
): BuilderExtension[] => {
  const { id, type, actions, connector, relation, position } = options;
  return createExtension({
    id,
    match: NodeMatcher.whenType(type),
    actions,
    connector,
    relation,
    position,
  });
};

//
// Extension Utilities
//

export const flattenExtensions = (extension: BuilderExtensions, acc: BuilderExtension[] = []): BuilderExtension[] => {
  if (Array.isArray(extension)) {
    return [...acc, ...extension.flatMap((ext) => flattenExtensions(ext, acc))];
  } else {
    return [...acc, extension];
  }
};

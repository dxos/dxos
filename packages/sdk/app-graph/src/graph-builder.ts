//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Record from 'effect/Record';
import type * as Schema from 'effect/Schema';
import { scheduleTask, yieldOrContinue } from 'main-thread-scheduling';

import { type CleanupFn, type Trigger } from '@dxos/async';
import { type Entity, type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MaybePromise, type Position, byPosition, getDebugName, isNonNullable } from '@dxos/util';

import * as Graph from './graph';
import * as Node from './node';
import * as NodeMatcher from './node-matcher';

/** Shallow-compare two values: same reference, or same own-keys with === values. */
const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
};

/** Returns true if two NodeArg arrays are semantically identical (same id, type, data, properties per index). */
const nodeArgsUnchanged = (prev: Node.NodeArg<any>[], next: Node.NodeArg<any>[]): boolean => {
  if (prev.length !== next.length) return false;
  return prev.every((p, idx) => {
    const n = next[idx];
    return (
      p.id === n.id && p.type === n.type && shallowEqual(p.data, n.data) && shallowEqual(p.properties, n.properties)
    );
  });
};

export type ConnectorPrefilter = Readonly<{
  /** Restrict connector execution to specific source ids. */
  sourceIds?: readonly string[];
  /** Restrict connector execution to specific source node types. */
  nodeTypes?: readonly string[];
}>;

const intersectValues = (left?: readonly string[], right?: readonly string[]): string[] | undefined => {
  if (left == null && right == null) {
    return undefined;
  }
  if (left == null) {
    return [...right!];
  }
  if (right == null) {
    return [...left];
  }
  return left.filter((value) => right.includes(value));
};

const mergeConnectorPrefilters = (
  left?: ConnectorPrefilter,
  right?: ConnectorPrefilter,
): ConnectorPrefilter | undefined => {
  if (left == null && right == null) {
    return undefined;
  }

  const sourceIds = intersectValues(left?.sourceIds, right?.sourceIds);
  const nodeTypes = intersectValues(left?.nodeTypes, right?.nodeTypes);
  return {
    ...(sourceIds != null ? { sourceIds } : {}),
    ...(nodeTypes != null ? { nodeTypes } : {}),
  };
};

const matchesConnectorPrefilter = (prefilter: ConnectorPrefilter | undefined, node: Node.Node): boolean => {
  if (prefilter == null) {
    return true;
  }
  if (prefilter.sourceIds != null && prefilter.sourceIds.length > 0 && !prefilter.sourceIds.includes(node.id)) {
    return false;
  }
  if (prefilter.nodeTypes != null && prefilter.nodeTypes.length > 0 && !prefilter.nodeTypes.includes(node.type)) {
    return false;
  }
  return true;
};

const CONNECTOR_KEY_SEPARATOR = '\u0001';

const normalizeRelation = (relation?: Node.RelationInput): Node.Relation =>
  relation == null ? Node.childRelation() : typeof relation === 'string' ? Node.relation(relation) : relation;

const relationEquals = (left: Node.RelationInput, right: Node.RelationInput): boolean => {
  const normalizedLeft = normalizeRelation(left);
  const normalizedRight = normalizeRelation(right);
  return normalizedLeft.kind === normalizedRight.kind && normalizedLeft.direction === normalizedRight.direction;
};

const connectorKey = (id: string, relation: Node.RelationInput): string =>
  `${id}${CONNECTOR_KEY_SEPARATOR}${JSON.stringify(normalizeRelation(relation))}`;

const relationFromConnectorKey = (key: string): { id: string; relation: Node.Relation } => {
  const separatorIndex = key.indexOf(CONNECTOR_KEY_SEPARATOR);
  const id = key.slice(0, separatorIndex);
  const relation = JSON.parse(key.slice(separatorIndex + 1)) as Node.Relation;
  return { id, relation };
};

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
) => Atom.Atom<Omit<Node.NodeArg<Node.ActionData<any>>, 'type' | 'nodes' | 'edges'>[]>;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension = (
  node: Atom.Atom<Option.Option<Node.Node>>,
) => Atom.Atom<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[]>;

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  relation?: Node.RelationInput; // Only for connector.
  prefilter?: ConnectorPrefilter; // Only for connector.
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
  relation: Node.RelationInput;
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
  readonly _dirtyConnectors = new Map<
    string,
    {
      nodes: Node.NodeArg<any>[];
      previous: string[];
    }
  >();
  readonly _connectorPrevious = new Map<string, string[]>();
  readonly _connectorPreviousArgs = new Map<string, Node.NodeArg<any>[]>();
  _flushScheduled = false;
  _flushPromise: Promise<void> = Promise.resolve();
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

  /** Apply a set of node changes for a single connector key. */
  private _applyConnectorUpdate(key: string, nodes: Node.NodeArg<any>[], previous: string[]): void {
    const { id, relation } = relationFromConnectorKey(key);
    const ids = nodes.map((node) => node.id);
    const removed = previous.filter((pid) => !ids.includes(pid));
    this._connectorPrevious.set(key, ids);
    this._connectorPreviousArgs.set(key, nodes);

    Graph.removeEdges(
      this._graph,
      removed.map((target) => ({ source: id, target, relation })),
      true,
    );
    Graph.addNodes(this._graph, nodes);
    Graph.addEdges(
      this._graph,
      nodes.map((node) => ({ source: id, target: node.id, relation })),
    );
    if (ids.length > 0) {
      const sortedIds = [...nodes]
        .sort((a, b) =>
          byPosition(a.properties ?? ({} as { position?: Position }), b.properties ?? ({} as { position?: Position })),
        )
        .map((n) => n.id);
      Graph.sortEdges(this._graph, id, relation, sortedIds);
    }
  }

  private _scheduleDirtyFlush(): void {
    if (!this._flushScheduled) {
      this._flushScheduled = true;
      this._flushPromise = scheduleTask(
        () => {
          this._flushScheduled = false;
          while (this._dirtyConnectors.size > 0) {
            const entries = [...this._dirtyConnectors.entries()];
            this._dirtyConnectors.clear();

            Atom.batch(() => {
              for (const [key, { nodes, previous }] of entries) {
                this._applyConnectorUpdate(key, nodes, previous);
              }
            });
          }
        },
        { strategy: 'smooth' },
      );
    }
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
      const { id, relation } = relationFromConnectorKey(key);
      const node = this._graph.node(id);

      const sourceNode = Option.getOrElse(get(node), () => undefined);
      if (!sourceNode) {
        return [];
      }

      const extensions = Function.pipe(
        get(this._extensions),
        Record.values,
        Array.sortBy(byPosition),
        Array.filter(
          (ext): ext is BuilderExtension & { connector: NonNullable<BuilderExtension['connector']> } =>
            relationEquals(ext.relation ?? 'child', relation) &&
            ext.connector != null &&
            matchesConnectorPrefilter(ext.prefilter, sourceNode),
        ),
      );

      const nodes: Node.NodeArg<any>[] = [];
      for (const ext of extensions) {
        const result = get(ext.connector(node));
        nodes.push(...result);
      }

      return nodes;
    }).pipe(Atom.withLabel(`graph-builder:connectors:${key}`));
  });

  private _onExpand(id: string, relation: Node.Relation): void {
    log('onExpand', { id, relation, registry: getDebugName(this._registry) });
    this._expandRelation(id, relation);

    // TODO(wittjosiah): Make this declarative — extensions should declare which relations they co-expand.
    if (relation.kind === 'child' && relation.direction === 'outbound') {
      Graph.expand(this._graph, id, 'action');
    }
  }

  private _expandRelation(id: string, relation: Node.RelationInput): void {
    const key = connectorKey(id, relation);
    const connectors = this._connectors(key);

    const cancel = this._registry.subscribe(
      connectors,
      (nodes) => {
        const previous = this._connectorPrevious.get(key) ?? [];
        const ids = nodes.map((n) => n.id);

        if (ids.length === previous.length && ids.every((nodeId, idx) => nodeId === previous[idx])) {
          const prevArgs = this._connectorPreviousArgs.get(key);
          if (prevArgs && nodeArgsUnchanged(prevArgs, nodes)) {
            return;
          }
        }

        log('update', { id, relation, ids });
        this._dirtyConnectors.set(key, { nodes, previous });
        this._scheduleDirtyFlush();
      },
      { immediate: true },
    );

    this._subscriptions.set(`${id}\0expand\0${key}`, cancel);
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

    this._subscriptions.set(`${id}\0init`, cancel);
  }

  private _onRemoveNode(id: string): void {
    const prefix = `${id}\0`;
    for (const [key, cleanup] of this._subscriptions) {
      if (key.startsWith(prefix)) {
        cleanup();
        this._subscriptions.delete(key);
      }
    }
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
  const { registry = Registry.make(), source = Node.RootId, relation, visitor } = options;
  // Break cycles.
  if (path.includes(source)) {
    return;
  }

  await yieldOrContinue('idle');

  const node = registry.get(internal._graph.nodeOrThrow(source));
  const shouldContinue = await visitor(node, [...path, node.id]);
  if (shouldContinue === false) {
    return;
  }

  const nodes = Object.values(internal._registry.get(internal._extensions))
    .filter(
      (extension) =>
        relationEquals(extension.relation ?? 'child', relation) && matchesConnectorPrefilter(extension.prefilter, node),
    )
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

/**
 * Wait for all pending connector updates to be flushed.
 */
export const flush = (builder: GraphBuilder): Promise<void> => {
  return (builder as GraphBuilderImpl)._flushPromise;
};

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
  relation?: Node.RelationInput;
  position?: Position;
  prefilter?: ConnectorPrefilter;
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
    relation = 'child',
    prefilter,
    resolver: _resolver,
    connector: _connector,
    actions: _actions,
    actionGroups: _actionGroups,
  } = extension;
  const normalizedRelation = normalizeRelation(relation);
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
          relation: normalizedRelation,
          prefilter,
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(connector(node));
              } catch (error) {
                log.warn('Error in connector', { id: getId('connector'), node, error });
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
          relation: Node.actionRelation(),
          prefilter,
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(actionGroups(node)).map((arg) => ({
                  ...arg,
                  data: Node.actionGroupSymbol,
                  type: Node.ActionGroupType,
                }));
              } catch (error) {
                log.warn('Error in actionGroups', { id: getId('actionGroups'), node, error });
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
          relation: Node.actionRelation(),
          prefilter,
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(actions(node)).map((arg) => ({ ...arg, type: Node.ActionType }));
              } catch (error) {
                log.warn('Error in actions', { id: getId('actions'), node, error });
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
 * All callbacks must return Effects for dependency injection.
 * Effects may fail - errors are caught, logged, and the extension returns empty results.
 */
export type CreateExtensionOptions<TMatched = Node.Node, R = never> = {
  id: string;
  match: (node: Node.Node) => Option.Option<TMatched>;
  prefilter?: ConnectorPrefilter;
  actions?: (
    matched: TMatched,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>, any>, 'type'>[], Error, R>;
  connector?: (matched: TMatched, get: Atom.Context) => Effect.Effect<Node.NodeArg<any, any>[], Error, R>;
  resolver?: (id: string, get: Atom.Context) => Effect.Effect<Node.NodeArg<any, any> | null, Error, R>;
  relation?: Node.RelationInput;
  position?: Position;
};

/**
 * Run an Effect synchronously with the provided context.
 * If the effect fails, logs the error and returns the fallback value.
 * @internal
 */
const runEffectSyncWithFallback = <T, R>(
  effect: Effect.Effect<T, Error, R>,
  context: Context.Context<R>,
  extensionId: string,
  fallback: T,
): T => {
  return Effect.runSync(
    effect.pipe(
      Effect.provide(context),
      Effect.catchAll((error) => {
        log.warn('Extension failed', { extension: extensionId, error });
        return Effect.succeed(fallback);
      }),
    ),
  );
};

/**
 * Create a graph builder extension with simplified API.
 * Returns an Effect to allow callbacks to access services via dependency injection.
 */
export const createExtension = <TMatched = Node.Node, R = never>(
  options: CreateExtensionOptions<TMatched, R>,
): Effect.Effect<BuilderExtension[], never, R> =>
  Effect.map(Effect.context<R>(), (context) => {
    const { id, match, prefilter, actions, connector, resolver, relation, position } = options;
    const matcherPrefilter = NodeMatcher.getPrefilter(match);
    const mergedPrefilter = mergeConnectorPrefilters(matcherPrefilter, prefilter);

    const connectorExtension = connector ? createConnectorWithRuntime(id, match, connector, context) : undefined;

    const actionsExtension = actions
      ? (node: Atom.Atom<Option.Option<Node.Node>>) =>
          Atom.make((get) =>
            Function.pipe(
              get(node),
              Option.flatMap(match),
              Option.map((matched) =>
                runEffectSyncWithFallback(actions(matched, get), context, id, []).map((action) => ({
                  ...action,
                  // Attach captured context for action execution.
                  _actionContext: context,
                })),
              ),
              Option.getOrElse(() => []),
            ),
          )
      : undefined;

    const resolverExtension = resolver
      ? (nodeId: string) =>
          Atom.make((get) => runEffectSyncWithFallback(resolver(nodeId, get), context, id, null) ?? null)
      : undefined;

    return createExtensionRaw({
      id,
      relation,
      position,
      prefilter: mergedPrefilter,
      connector: connectorExtension,
      actions: actionsExtension,
      resolver: resolverExtension,
    });
  });

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
 * Create a connector extension from a matcher and factory function with Effect support.
 * The factory must return an Effect. Errors are caught and logged.
 * @internal
 */
const createConnectorWithRuntime = <TData, R>(
  extensionId: string,
  matcher: (node: Node.Node) => Option.Option<TData>,
  factory: (data: TData, get: Atom.Context) => Effect.Effect<Node.NodeArg<any>[], Error, R>,
  context: Context.Context<R>,
): ConnectorExtension => {
  return (node: Atom.Atom<Option.Option<Node.Node>>) =>
    Atom.make((get) =>
      Function.pipe(
        get(node),
        Option.flatMap(matcher),
        Option.map((data) => runEffectSyncWithFallback(factory(data, get), context, extensionId, [])),
        Option.getOrElse(() => []),
      ),
    );
};

/**
 * Options for creating a type-based extension.
 * All callbacks must return Effects for dependency injection.
 * Effects may fail - errors are caught, logged, and the extension returns empty results.
 */
export type CreateTypeExtensionOptions<T extends Type.Entity.Any = Type.Entity.Any, R = never> = {
  id: string;
  type: T;
  prefilter?: ConnectorPrefilter;
  actions?: (
    object: Entity.Entity<Schema.Schema.Type<T>>,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>>, 'type'>[], Error, R>;
  connector?: (
    object: Entity.Entity<Schema.Schema.Type<T>>,
    get: Atom.Context,
  ) => Effect.Effect<Node.NodeArg<any>[], Error, R>;
  relation?: Node.RelationInput;
  position?: Position;
};

/**
 * Create an extension that matches nodes by schema type.
 * The entity type is inferred from the schema type and works for both object and relation schemas.
 * Returns an Effect to allow callbacks to access services via dependency injection.
 */
export const createTypeExtension = <T extends Type.Entity.Any, R = never>(
  options: CreateTypeExtensionOptions<T, R>,
): Effect.Effect<BuilderExtension[], never, R> => {
  const { id, type, prefilter, actions, connector, relation, position } = options;
  return createExtension<Entity.Entity<Schema.Schema.Type<T>>, R>({
    id,
    match: NodeMatcher.whenEchoType(type),
    prefilter,
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

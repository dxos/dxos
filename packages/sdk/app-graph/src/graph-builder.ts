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

import { type CleanupFn } from '@dxos/async';
import { type Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MaybePromise, Position, getDebugName, isNonNullable } from '@dxos/util';

import { scheduleTask, yieldOrContinue } from '#scheduler';

import * as Graph from './graph';
import * as Node from './node';
import * as NodeMatcher from './node-matcher';
import { nodeArgsUnchanged, normalizeRelation, primaryKey, primaryParts, qualifyId, validateSegmentId } from './util';

//
// Extension Types
//

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
  position?: Position.Position;
  relation?: Node.RelationInput;
  /**
   * Registered URL prefix key for nodes this extension's connector produces. Defaults to the
   * plugin id at the plugin-graph layer when omitted. Global and unique; see
   * `path-resolution.ts` for how the key table is derived and used.
   */
  urlKey?: string;
  /**
   * Whether a `urlKey` pair consumes a following id segment. `true` (the default) for a
   * plank-opening key (e.g. `doc`, addressing a real object id); `false` for a companion key (e.g.
   * `comments`) or a fixed singleton node (e.g. `home`), neither of which has a variable id to
   * encode. Read by `path-resolution.ts`'s key-table derivation, consumed by `UrlPath.parse`.
   */
  urlKeyHasId?: boolean;
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
  relation: Node.RelationInput | Node.RelationInput[];
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
  /** Read the currently registered extensions synchronously (used for URL key-table derivation). */
  getExtensions(): Record<string, BuilderExtension>;
  /**
   * The id of the extension whose connector produced the given node, if known. Populated as
   * connectors materialize nodes and cleared on removal; used by `path-resolution.ts` for
   * reverse (node → URL) mapping.
   */
  getNodeExtensionId(nodeId: string): string | undefined;
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
  /** Active subscriptions keyed by composite ID, cleaned up on node removal. */
  readonly _subscriptions = new Map<string, CleanupFn>();
  /** Connector updates pending flush, keyed by connector key. */
  readonly _dirtyConnectors = new Map<
    string,
    {
      nodes: Node.NodeArg<any>[];
      previous: string[];
    }
  >();
  /** Last-flushed node IDs per connector key, used for edge removal on update. */
  readonly _connectorPrevious = new Map<string, string[]>();
  /** All inline-descendant IDs per connector key, used to remove stale inline nodes on update. */
  readonly _connectorPreviousInlineIds = new Map<string, string[]>();
  /** Last-flushed node args per connector key, used for change detection. */
  readonly _connectorPreviousArgs = new Map<string, Node.NodeArg<any>[]>();
  /** Whether a dirty-flush task is already scheduled. */
  _flushScheduled = false;
  /** Resolves when the current flush completes. */
  _flushPromise: Promise<void> = Promise.resolve();
  /** Registered builder extensions keyed by extension ID. */
  readonly _extensions = Atom.make(Record.empty<string, BuilderExtension>()).pipe(
    Atom.keepAlive,
    Atom.withLabel('graph-builder:extensions'),
  );
  /**
   * Node id -> id of the extension whose connector produced it. Non-reactive: updated directly
   * as connectors materialize/remove nodes, so reverse (node → URL) mapping in
   * `path-resolution.ts` can look up the producing extension without a reactive read.
   */
  readonly _nodeExtensions = new Map<string, string>();
  /** Shared atom registry for reactive subscriptions. */
  readonly _registry: Registry.Registry;
  /** Backing graph with internal accessors for node atoms and construction. */
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

  getExtensions(): Record<string, BuilderExtension> {
    return this._registry.get(this._extensions);
  }

  getNodeExtensionId(nodeId: string): string | undefined {
    return this._nodeExtensions.get(nodeId);
  }

  /** Apply a set of node changes for a single connector key. */
  private _applyConnectorUpdate(key: string, nodes: Node.NodeArg<any>[], previous: string[]): void {
    const { id, relation } = relationFromConnectorKey(key);
    const ids = nodes.map((node) => node.id);
    const removed = previous.filter((pid) => !ids.includes(pid));
    this._connectorPrevious.set(key, ids);
    this._connectorPreviousArgs.set(key, nodes);

    const currentInlineIds = collectAllInlineIds(nodes);
    const previousInlineIds = this._connectorPreviousInlineIds.get(key) ?? [];
    const staleInlineIds = previousInlineIds.filter((pid) => !currentInlineIds.includes(pid));
    this._connectorPreviousInlineIds.set(key, currentInlineIds);

    Graph.removeNodes(this._graph, staleInlineIds, true);
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
        .sort((a, b) => Position.compare({ position: a.properties?.position }, { position: b.properties?.position }))
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

  /** A connector-produced node, tagged with the id of the extension that produced it (provenance). */
  private readonly _connectors = Atom.family<string, Atom.Atom<{ extensionId: string; node: Node.NodeArg<any> }[]>>(
    (key) => {
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
          Array.sortBy(Position.compare),
          Array.filter(
            (ext): ext is BuilderExtension & { connector: NonNullable<BuilderExtension['connector']> } =>
              Graph.relationKey(ext.relation ?? 'child') === Graph.relationKey(relation) && ext.connector != null,
          ),
        );

        const entries: { extensionId: string; node: Node.NodeArg<any> }[] = [];
        for (const ext of extensions) {
          const result = get(ext.connector(node));
          for (const nodeArg of result) {
            entries.push({ extensionId: ext.id, node: nodeArg });
          }
        }

        return entries;
      }).pipe(Atom.withLabel(`graph-builder:connectors:${key}`));
    },
  );

  private _onExpand(id: string, relation: Node.Relation): void {
    log('onExpand', { id, relation, registry: getDebugName(this._registry) });
    this._expandRelation(id, relation);

    // TODO(wittjosiah): Remove. This is for backwards compatibility.
    if (relation.kind === 'child' && relation.direction === 'outbound') {
      Graph.expand(this._graph, id, 'action');
    }
  }

  private _expandRelation(id: string, relation: Node.RelationInput): void {
    const key = connectorKey(id, relation);
    const connectors = this._connectors(key);

    const cancel = this._registry.subscribe(
      connectors,
      (entries) => {
        const nodes = qualifyNodeArgs(id)(entries.map((entry) => entry.node));
        // Record provenance for each qualified top-level node so reverse (node → URL) mapping
        // can find the producing extension's `urlKey`.
        entries.forEach((entry, index) => {
          this._nodeExtensions.set(nodes[index].id, entry.extensionId);
        });

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

    this._subscriptions.set(subscriptionKey(id, 'expand', key), cancel);
  }

  private _onRemoveNode(id: string): void {
    this._nodeExtensions.delete(id);
    for (const [key, cleanup] of this._subscriptions) {
      if (primaryParts(key)[0] === id) {
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

  const nodes = Function.pipe(
    internal._registry.get(internal._extensions),
    Record.values,
    Array.map((extension) => extension.connector),
    Array.filter(isNonNullable),
    Array.flatMap((connector) => registry.get(connector(internal._graph.node(source)))),
    qualifyNodeArgs(source),
  );

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
 * @param params.urlKey Registered URL prefix key for nodes this extension's connector produces.
 * @param params.urlKeyHasId Whether `urlKey` consumes a following id segment (default `true`).
 * @param params.connector A function to add nodes to the graph based on a connection to an existing node.
 * @param params.actions A function to add actions to the graph based on a connection to an existing node.
 * @param params.actionGroups A function to add action groups to the graph based on a connection to an existing node.
 */
export type CreateExtensionRawOptions = {
  id: string;
  relation?: Node.RelationInput;
  position?: Position.Position;
  urlKey?: string;
  urlKeyHasId?: boolean;
  connector?: ConnectorExtension;
  actions?: ActionsExtension;
  actionGroups?: ActionGroupsExtension;
};

/**
 * Whether a graph extension local ID follows NSID conventions: the final
 * dot-separated segment must be camelCase (letters and digits only, starting
 * with a letter — no hyphens or underscores). This mirrors the rule enforced
 * when the id is appended to a plugin's NSID to form a full DXN path.
 *
 * An extension with an invalid id is dropped rather than rejected, so a single
 * malformed contribution cannot crash plugin activation.
 *
 * @example Valid:   'about', 'devtools', 'integrationsSection'
 * @example Invalid: 'integration-article', 'plugin-spec'
 */
const isValidLocalId = (id: string): boolean => /^[a-zA-Z][a-zA-Z0-9]*$/.test(id.split('.').pop() ?? '');

/**
 * Create a graph builder extension (low-level API that works directly with Atoms).
 */
export const createExtensionRaw = (extension: CreateExtensionRawOptions): BuilderExtension[] => {
  const {
    id,
    position,
    relation = 'child',
    urlKey,
    urlKeyHasId,
    connector: _connector,
    actions: _actions,
    actionGroups: _actionGroups,
  } = extension;
  if (!isValidLocalId(id)) {
    log.warn(
      'dropping graph extension with invalid id; the final segment must be camelCase (no hyphens or underscores)',
      {
        id,
      },
    );
    return [];
  }
  const normalizedRelation = normalizeRelation(relation);
  const getId = (key: string) => `${id}/${key}`;

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
    connector
      ? ({
          id: getId('connector'),
          position,
          relation: normalizedRelation,
          urlKey,
          urlKeyHasId,
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
 * Effects may defect — defects are caught, logged, and the extension returns empty results.
 * Use Effect.orDie on any failable effects inside callbacks.
 */
export type CreateExtensionOptions<TMatched = Node.Node, R = never> = {
  id: string;
  match: (node: Node.Node, get: Atom.Context) => Option.Option<TMatched>;
  actions?: (
    matched: TMatched,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>, any>, 'type'>[], never, R>;
  /** Contribute dropdown action groups (each with nested `actions`) to the matched node; the group's
   * `type`/`data` are set automatically, so returning `Node.makeActionGroup(...)` output is fine. */
  actionGroups?: (
    matched: TMatched,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data'>[], never, R>;
  connector?: (matched: TMatched, get: Atom.Context) => Effect.Effect<Node.NodeArg<any, any>[], never, R>;
  relation?: Node.RelationInput;
  position?: Position.Position;
  /** Registered URL prefix key for nodes this extension's connector produces. */
  urlKey?: string;
  /** Whether `urlKey` consumes a following id segment (default `true`); see {@link BuilderExtension.urlKeyHasId}. */
  urlKeyHasId?: boolean;
};

/**
 * Run an Effect synchronously with the provided context.
 * Defects are caught, logged, and the fallback value is returned.
 * @internal
 */
const runEffectSyncWithFallback = <T, R>(
  effect: Effect.Effect<T, never, R>,
  context: Context.Context<R>,
  extensionId: string,
  fallback: T,
): T => {
  return Effect.runSync(
    effect.pipe(
      Effect.provide(context),
      Effect.catchAllDefect((defect) => {
        log.warn('Extension failed', { extension: extensionId, defect });
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
    const { id, match, actions, actionGroups, connector, relation, position, urlKey, urlKeyHasId } = options;

    const connectorExtension = connector ? createConnectorWithRuntime(id, match, connector, context) : undefined;

    const actionsExtension = actions
      ? (node: Atom.Atom<Option.Option<Node.Node>>) =>
          Atom.make((get) =>
            Function.pipe(
              get(node),
              Option.flatMap((matchedNode) => match(matchedNode, get)),
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

    const actionGroupsExtension = actionGroups
      ? (node: Atom.Atom<Option.Option<Node.Node>>) =>
          Atom.make((get) =>
            Function.pipe(
              get(node),
              Option.flatMap((matchedNode) => match(matchedNode, get)),
              Option.map((matched) =>
                runEffectSyncWithFallback(actionGroups(matched, get), context, id, []).map((group) => ({
                  ...group,
                  // Attach captured context to the group's child actions so they execute with the
                  // extension's services (e.g. Capability.Service) even without an explicit runner.
                  actions: group.actions?.map((action) => ({ ...action, _actionContext: context })),
                })),
              ),
              Option.getOrElse(() => []),
            ),
          )
      : undefined;

    return createExtensionRaw({
      id,
      relation,
      position,
      urlKey,
      urlKeyHasId,
      connector: connectorExtension,
      actions: actionsExtension,
      actionGroups: actionGroupsExtension,
    });
  });

/**
 * Create a connector extension from a matcher and factory function.
 * The factory's data type is inferred from the matcher's return type.
 */
export const createConnector = <TData>(
  matcher: (node: Node.Node, get: Atom.Context) => Option.Option<TData>,
  factory: (data: TData, get: Atom.Context) => Node.NodeArg<any>[],
): ConnectorExtension => {
  return (node: Atom.Atom<Option.Option<Node.Node>>) =>
    Atom.make((get) =>
      Function.pipe(
        get(node),
        Option.flatMap((matchedNode) => matcher(matchedNode, get)),
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
  matcher: (node: Node.Node, get: Atom.Context) => Option.Option<TData>,
  factory: (data: TData, get: Atom.Context) => Effect.Effect<Node.NodeArg<any>[], never, R>,
  context: Context.Context<R>,
): ConnectorExtension => {
  return (node: Atom.Atom<Option.Option<Node.Node>>) =>
    Atom.make((get) =>
      Function.pipe(
        get(node),
        Option.flatMap((matchedNode) => matcher(matchedNode, get)),
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
export type CreateTypeExtensionOptions<T extends Type.AnyEntity = Type.AnyEntity, R = never> = {
  id: string;
  type: T;
  actions?: (
    object: Type.InstanceType<T>,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>>, 'type'>[], never, R>;
  actionGroups?: (
    object: Type.InstanceType<T>,
    get: Atom.Context,
  ) => Effect.Effect<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data'>[], never, R>;
  connector?: (object: Type.InstanceType<T>, get: Atom.Context) => Effect.Effect<Node.NodeArg<any>[], never, R>;
  relation?: Node.RelationInput;
  position?: Position.Position;
};

/**
 * Create an extension that matches nodes by schema type.
 * The entity type is inferred from the schema type and works for both object and relation schemas.
 * Returns an Effect to allow callbacks to access services via dependency injection.
 */
export const createTypeExtension = <T extends Type.AnyEntity, R = never>(
  options: CreateTypeExtensionOptions<T, R>,
): Effect.Effect<BuilderExtension[], never, R> => {
  const { id, type, actions, actionGroups, connector, relation, position } = options;
  return createExtension<Type.InstanceType<T>, R>({
    id,
    match: NodeMatcher.whenEchoType(type),
    actions,
    actionGroups,
    connector,
    relation,
    position,
  });
};

//
// Extension Utilities
//

/**
 * Qualify node IDs by prefixing with the parent path.
 * Validates that segment IDs do not contain the path separator.
 * Recursively qualifies inline child nodes.
 */
const qualifyNodeArgs =
  (parentId: string) =>
  (nodes: Node.NodeArg<any>[]): Node.NodeArg<any>[] =>
    nodes.map((node) => {
      validateSegmentId(node.id);
      const qualified = qualifyId(parentId, node.id);
      return {
        ...node,
        id: qualified,
        nodes: node.nodes ? qualifyNodeArgs(qualified)(node.nodes) : undefined,
        actions: node.actions ? qualifyNodeArgs(qualified)(node.actions) : undefined,
      };
    });

/**
 * Recursively collect all inline-descendant IDs (the `nodes` arrays at every level)
 * from a list of top-level NodeArgs. Top-level IDs are excluded because they are
 * already tracked via `_connectorPrevious`.
 */
const collectAllInlineIds = (nodes: Node.NodeArg<any>[]): string[] =>
  nodes.flatMap((node) => {
    const childNodes = node.nodes ?? [];
    const actionNodes = node.actions ?? [];
    const allInline = [...childNodes, ...actionNodes];
    return allInline.length > 0 ? [...allInline.map((child) => child.id), ...collectAllInlineIds(allInline)] : [];
  });

const connectorKey = (id: string, relation: Node.RelationInput): string => primaryKey(id, Graph.relationKey(relation));

const relationFromConnectorKey = (key: string): { id: string; relation: Node.Relation } => {
  const [id, encodedRelation] = primaryParts(key);
  return { id, relation: Graph.relationFromKey(encodedRelation) };
};

const subscriptionKey = (id: string, kind: string, detail?: string): string =>
  detail != null ? primaryKey(id, kind, detail) : primaryKey(id, kind);

export const flattenExtensions = (extension: BuilderExtensions, acc: BuilderExtension[] = []): BuilderExtension[] => {
  if (Array.isArray(extension)) {
    return [...acc, ...extension.flatMap((ext) => flattenExtensions(ext, acc))];
  } else {
    return [...acc, extension];
  }
};

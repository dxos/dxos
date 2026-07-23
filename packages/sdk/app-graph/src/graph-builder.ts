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
   * URL binding for the nodes this extension's connector produces: the registered prefix key plus how
   * it resolves. Omitted when the extension's nodes are not URL-addressable. See {@link UrlBinding} and
   * `path-resolution.ts` for how the key table is derived and used.
   */
  url?: UrlBinding;
  connector?: (node: Atom.Atom<Option.Option<Node.Node>>) => Atom.Atom<Node.NodeArg<any>[]>;
}>;

/**
 * How an extension's nodes map to (and from) the URL pair chain — one binding per extension, holding
 * the whole URL contract for the nodes it produces. The `kind` is the *resolution tier*: what a pair
 * with this key resolves against.
 *
 * - `'anchor'`    — Resolves at the graph root and *establishes the base* that subsequent pairs resolve
 *                   against; consumed as a workspace rebase, never opened as a plank. Carries an id (the
 *                   workspace). The workspace tier (`w/<workspace>`).
 * - `'item'`      — Resolves against the current anchor (workspace) base, addressed by a variable id.
 *                   The default addressable node; may itself have children (e.g. a mailbox). (`doc/<id>`).
 * - `'singleton'` — Resolves against the current anchor base, but is a single fixed node per anchor, so
 *                   it carries no id — its terminal node-id segment is the key itself. (`settings`).
 * - `'linked'`    — Resolves against the *immediately preceding item*, not the anchor, addressed by a
 *                   variant id. A sub-view attached to a plank — e.g. a companion (`companion/<variant>`,
 *                   whose node is the plank's `~<variant>` linked-segment child). Has no `path`:
 *                   resolution is structural (find the preceding item's `~<variant>` child), and its
 *                   `urlSegment` is stamped from the linked-segment convention, not a path.
 *
 * `path` (on the non-`linked` kinds) is how the node is located, in one of two forms:
 * - `string[]` — fixed ancestor node-id segments between the workspace base and the node (the common,
 *   deterministic case): the node is `${Node.RootId}/<workspace>/<...segments>/<id>`. Fixed-depth
 *   dynamic tails beyond the segments are `+`-encoded into the id.
 * - {@link PathResolver} — a dynamic resolver, for data-dependent shapes (e.g. nested collections at
 *   arbitrary depth) that cannot declare static segments.
 *
 * Read by `path-resolution.ts` (which derives the parse table's `hasId`/`anchor` from `kind`) and
 * consumed by `UrlPath.parse`.
 */
export type UrlBinding =
  | { key: string; kind: 'anchor' | 'item' | 'singleton'; path: string[] | PathResolver }
  | { key: string; kind: 'linked' };

/** Prefix marking a "linked segment" node id (`<parent>/~<variant>`) — a child sharing its parent's
 * identity, the structural form of a `kind: 'linked'` node. Mirrors `@dxos/react-ui-attention`'s
 * `linkedSegment`/`isLinkedSegment` (duplicated to keep app-graph free of a UI-layer dependency). */
export const LINKED_PREFIX = '~';

/** Params passed to a {@link PathResolver} for a single `(key, id)` URL pair. */
export type PathResolveParams = {
  /** The id segment from the `(key, id)` pair. */
  id: string;
  /** The workspace segment from the URL. */
  workspace: string;
  /** Qualified id of the workspace base node (`${Node.RootId}/<workspace>`). */
  workspaceBaseId: string;
};

/**
 * Dynamic forward URL resolver for an extension whose node-id shape is data-dependent and so cannot
 * declare a static {@link UrlBinding.path}. Returns the candidate qualified node id —
 * `path-resolution.ts` then materializes its ancestors and verifies it — or `null` if the id can't be
 * located. Must be self-contained (the declaring plugin closes over any services it needs), so
 * `@dxos/app-graph` stays free of service dependencies.
 */
export type PathResolver = (params: PathResolveParams) => Effect.Effect<string | null>;

export type BuilderExtensions = BuilderExtension | BuilderExtension[] | BuilderExtensions[];

/**
 * Separator joining the fixed-depth node-id segments between a key's static `path` and the object id into
 * a single URL id (e.g. a database object `…/database/<slug>/<id>` → `db/<slug>+<id>`), so a fixed-depth
 * nested shape needs no resolver. Chosen because it never appears in an entity id or a type slug.
 */
export const TAIL_SEPARATOR = '+';

/**
 * The `(key, id?)` URL representation of a node under a given {@link UrlBinding} — the reverse of forward
 * resolution, minus the workspace (always the node id's second segment). A singleton has no id; a
 * resolver-backed key keeps just the object id; a static path encodes the segments between the path and
 * the id, `+`-joined (empty when the node sits at the path — a container whose children are the items).
 */
export const urlRepresentation = (nodeId: string, url: UrlBinding): { key: string; id?: string } => {
  // Singleton (no id) and linked (id derived structurally, not from `path`) carry no path-based id here.
  if (url.kind === 'singleton' || url.kind === 'linked') {
    return { key: url.key };
  }
  const segments = nodeId.split('/');
  const id =
    typeof url.path === 'function'
      ? segments[segments.length - 1]
      : segments.slice(2 + url.path.length).join(TAIL_SEPARATOR);
  return { key: url.key, id };
};

/**
 * The single declared linked-tier key (`kind: 'linked'`, conventionally `companion`), used to stamp and
 * reverse-map `~<variant>` nodes. Returns undefined if no linked extension is registered.
 */
export const getLinkedKey = (builder: GraphBuilder): string | undefined => {
  for (const extension of Object.values(builder.getExtensions())) {
    if (extension.url?.kind === 'linked') {
      return extension.url.key;
    }
  }
  return undefined;
};

/**
 * A node's own URL pair segment — `/<key>[/<id>]`, with no workspace/anchor prefix — or `undefined` when
 * the node is not addressable in its own right (a container node sitting at the binding's `path`, whose
 * children are the addressable items). A full URL is composed by prefixing `/w/<workspace>`.
 */
export const nodeUrlSegment = (nodeId: string, url: UrlBinding): string | undefined => {
  const { key, id } = urlRepresentation(nodeId, url);
  if (id === undefined) {
    return `/${key}`; // singleton
  }
  return id === '' ? undefined : `/${key}/${id}`; // empty id: container at the path, not addressable
};

/**
 * A graph node with its computed {@link nodeUrlSegment} attached at `properties.urlSegment` when the node
 * is URL-addressable. The core {@link Node.Node} stays URL-agnostic; this is the typed view for reading
 * the segment — an open properties record with an explicit `urlSegment` field — mirroring how
 * `@dxos/react-ui-menu` wraps `Node` for menu items.
 */
export type BuilderNode<TData = any> = Node.Node<TData, { urlSegment?: string } & Record<string, any>>;

/**
 * Return a copy of `node` (and its inline descendants) with `properties.urlSegment` stamped. A linked
 * node (id ending in a `~<variant>` segment) is stamped from the `linked` tier key, independent of its
 * producing extension's binding; any other node is stamped from `url` (its producer's binding), if any.
 */
const stampUrlSegment = (
  node: Node.NodeArg<any>,
  url: UrlBinding | undefined,
  linkedKey: string | undefined,
): Node.NodeArg<any> => {
  const lastSegment = node.id.slice(node.id.lastIndexOf('/') + 1);
  const segment = lastSegment.startsWith(LINKED_PREFIX)
    ? linkedKey && `/${linkedKey}/${lastSegment.slice(LINKED_PREFIX.length)}`
    : url && nodeUrlSegment(node.id, url);
  const nodes = node.nodes?.map((child) => stampUrlSegment(child, url, linkedKey));
  if (!segment && !nodes) {
    return node;
  }
  return {
    ...node,
    ...(segment && { properties: { ...node.properties, urlSegment: segment } }),
    ...(nodes && { nodes }),
  };
};

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

  /** Record `extensionId` as the producer of a qualified node and all of its inline `nodes` descendants. */
  private _recordProvenance(node: Node.NodeArg<any>, extensionId: string): void {
    this._nodeExtensions.set(node.id, extensionId);
    for (const child of node.nodes ?? []) {
      this._recordProvenance(child, extensionId);
    }
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
        const extensions = this.getExtensions();
        const linkedKey = getLinkedKey(this);
        // Stamp `properties.urlSegment` on each produced node (and its inline descendants) so the computed
        // segment is readable off the node (see `BuilderNode`): `/<key>[/<id>]` from the producing
        // extension's binding, or `/<linkedKey>/<variant>` for a `~<variant>` linked (companion) node.
        const nodes = qualifyNodeArgs(id)(entries.map((entry) => entry.node)).map((node, index) =>
          stampUrlSegment(node, extensions[entries[index].extensionId]?.url, linkedKey),
        );
        // Record provenance for each qualified node — top-level and inline descendants alike — so
        // reverse (node → URL) mapping can find the producing extension's `url` binding. Inline children
        // (e.g. a TypeSection's objects, returned in the section node's `nodes` array) are produced by the
        // same extension, so they carry the same provenance; without this they would have no URL representation.
        entries.forEach((entry, index) => {
          this._recordProvenance(nodes[index], entry.extensionId);
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
 * @param params.url URL binding for the nodes this extension produces (key + resolution); see {@link UrlBinding}.
 * @param params.connector A function to add nodes to the graph based on a connection to an existing node.
 * @param params.actions A function to add actions to the graph based on a connection to an existing node.
 * @param params.actionGroups A function to add action groups to the graph based on a connection to an existing node.
 */
export type CreateExtensionRawOptions = {
  id: string;
  relation?: Node.RelationInput;
  position?: Position.Position;
  url?: UrlBinding;
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
    url,
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

  const extensions = [
    connector
      ? ({
          id: getId('connector'),
          position,
          relation: normalizedRelation,
          url,
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

  // A declaration-only extension: a `url` binding with no connector/actions (e.g. the workspace anchor,
  // which registers a key for the parser/serializer but produces no nodes of its own). Emit it so the
  // key table sees the binding; it has no connector so it never runs.
  if (extensions.length === 0 && url) {
    return [{ id, position, relation: normalizedRelation, url } satisfies BuilderExtension];
  }

  return extensions;
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
  /** URL binding for the nodes this extension produces (key + resolution); see {@link UrlBinding}. */
  url?: UrlBinding;
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
    const { id, match, actions, actionGroups, connector, relation, position, url } = options;

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
      url,
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

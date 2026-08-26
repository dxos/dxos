//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { Entity, type Type } from '@dxos/echo';
import * as Builder from '@dxos/graph/GraphBuilder';
import * as GraphNode from '@dxos/graph/GraphNode';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Position, isNonNullable } from '@dxos/util';

import { scheduleTask, yieldOrContinue } from '#scheduler';

import * as Graph from './AppGraph';
import * as Node from './AppGraphNode';
import { nodeArgsUnchanged, normalizeRelation, withLabel } from './util';

//
// Extension Types
//

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension = Builder.Connector<Node.Node, Node.NodeArg<any>>;

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

/**
 * A generic builder extension specialized to the app vocabulary: app nodes, app relations, and a
 * {@link UrlBinding} as the extension metadata the app layer's node decorator reads.
 */
export type BuilderExtension = Builder.Extension<Node.Node, Node.NodeArg<any>, Node.RelationInput, UrlBinding>;

export type BuilderExtensions = Builder.Extensions<BuilderExtension>;

/**
 * How an extension's nodes map to (and from) the URL pair chain — one binding per extension, holding
 * the whole URL contract for the nodes it produces. The `kind` is the *resolution tier*: what a pair
 * with this key resolves against.
 *
 * - `'item'`      — Resolves against the current anchor (workspace) base, addressed by a variable id.
 *                   The default addressable node; may itself have children (e.g. a mailbox). (`doc/<id>`).
 * - `'singleton'` — Resolves against the current anchor base, but is a single fixed node per anchor, so
 *                   it carries no id — its terminal node-id segment is the key itself. (`settings`).
 *
 * The anchor and linked tiers are not declared per extension: they are fixed keys of the URL grammar,
 * configured once on the builder as {@link UrlGrammar}.
 *
 * `path` is how the node is located, in one of two forms:
 * - `string[]` — fixed ancestor node-id segments between the workspace base and the node (the common,
 *   deterministic case): the node is `${GraphNode.RootId}/<workspace>/<...segments>/<id>`. Fixed-depth
 *   dynamic tails beyond the segments are `+`-encoded into the id.
 * - {@link PathResolver} — a dynamic resolver, for data-dependent shapes (e.g. nested collections at
 *   arbitrary depth) that cannot declare static segments.
 *
 * Read by `path-resolution.ts` (which derives the parse table's `hasId`/`anchor` from `kind`) and
 * consumed by `UrlPath.parse`.
 */
export type UrlBinding = { key: string; kind: 'item' | 'singleton'; path: string[] | PathResolver };

/**
 * The URL grammar the builder resolves and stamps against, configured once at construction.
 *
 * The two keys are fixed tiers no extension declares (no connector produces their nodes): `anchorKey`
 * establishes the base that following pairs resolve against and is consumed as a rebase
 * (`w/<workspace>`); `linkedKey` addresses the linked-segment child of the preceding item
 * (`companion/<variant>`), resolved structurally. The separators are the id-encoding conventions:
 * `linkedPrefix` marks a linked segment (`<parent>/~<variant>`), and `tailSeparator` joins the
 * fixed-depth node-id segments between a key's static `path` and the object id into one URL id
 * (`db/<slug>+<id>`) so a fixed-depth nested shape needs no resolver.
 */
export type UrlGrammar = {
  anchorKey?: string;
  linkedKey?: string;
  linkedPrefix: string;
  tailSeparator: string;
};

/** {@link UrlGrammar} as supplied at construction: the separators fall back to their defaults. */
export type UrlGrammarProps = Partial<UrlGrammar>;

/** Default linked-segment prefix; mirrors `@dxos/react-ui-attention`'s `linkedSegment`. Internal: read
 * the resolved value from `builder.urlGrammar` rather than the default. */
const DEFAULT_LINKED_PREFIX = '~';

/** Default tail separator; never appears in an entity id or a type slug. Internal, as above. */
const DEFAULT_TAIL_SEPARATOR = '+';

/** Params passed to a {@link PathResolver} for a single `(key, id)` URL pair. */
export type PathResolveParams = {
  /** The id segment from the `(key, id)` pair. */
  id: string;
  /** The workspace segment from the URL. */
  workspace: string;
  /** Qualified id of the workspace base node (`${GraphNode.RootId}/<workspace>`). */
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

/**
 * The `(key, id?)` URL representation of a node under a given {@link UrlBinding} — the reverse of forward
 * resolution, minus the workspace (always the node id's second segment). A singleton has no id; a
 * resolver-backed key keeps just the object id; a static path encodes the segments between the path and
 * the id, `+`-joined (empty when the node sits at the path — a container whose children are the items).
 */
export const urlRepresentation = (
  nodeId: string,
  url: UrlBinding,
  tailSeparator: string = DEFAULT_TAIL_SEPARATOR,
): { key: string; id?: string } => {
  // A singleton carries no path-based id: its terminal node-id segment is the key itself.
  if (url.kind === 'singleton') {
    return { key: url.key };
  }
  const segments = nodeId.split(GraphNode.PathSeparator);
  const id =
    typeof url.path === 'function'
      ? segments[segments.length - 1]
      : segments.slice(2 + url.path.length).join(tailSeparator);
  return { key: url.key, id };
};

/**
 * A node's own URL pair segment — `/<key>[/<id>]`, with no workspace/anchor prefix — or `undefined` when
 * the node is not addressable in its own right (a container node sitting at the binding's `path`, whose
 * children are the addressable items). A full URL is composed by prefixing `/w/<workspace>`.
 */
export const nodeUrlSegment = (
  nodeId: string,
  url: UrlBinding,
  tailSeparator: string = DEFAULT_TAIL_SEPARATOR,
): string | undefined => {
  const { key, id } = urlRepresentation(nodeId, url, tailSeparator);
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
  grammar: UrlGrammar,
): Node.NodeArg<any> => {
  const lastSegment = node.id.slice(node.id.lastIndexOf(GraphNode.PathSeparator) + 1);
  const segment = lastSegment.startsWith(grammar.linkedPrefix)
    ? grammar.linkedKey && `/${grammar.linkedKey}/${lastSegment.slice(grammar.linkedPrefix.length)}`
    : url && nodeUrlSegment(node.id, url, grammar.tailSeparator);
  const nodes = node.nodes?.map((child) => stampUrlSegment(child, url, grammar));
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
// Builder
//

export type GraphBuilderTraverseOptions = Builder.TraverseOptions<Node.Node, Node.RelationInput>;

/** Construction params: the backing graph's props plus the URL grammar's fixed keys. */
export type GraphBuilderProps = Pick<Graph.GraphProps, 'registry' | 'nodes' | 'edges'> & {
  urlGrammar?: UrlGrammarProps;
  /**
   * Applied to each connector-produced node before it enters the graph. Defaults to stamping the
   * URL segment implied by the producing extension's binding.
   */
  decorateNode?: (node: Node.NodeArg<any>, extension?: BuilderExtension) => Node.NodeArg<any>;
};

/**
 * The generic expansion engine specialized to the app vocabulary: app nodes and relations over an
 * {@link Graph.ExpandableGraph}, extensions carrying a {@link UrlBinding}, and connector-produced nodes
 * stamped with their URL segment as they enter the graph.
 */
export class GraphBuilder extends Builder.GraphBuilder<
  Node.Node,
  Node.NodeArg<any>,
  Node.RelationInput,
  UrlBinding,
  Graph.ExpandableGraph
> {
  /** The URL grammar (see {@link UrlGrammar}); the keys are absent when URLs are not in play. */
  readonly urlGrammar: UrlGrammar;

  constructor({ registry, urlGrammar, decorateNode, ...graphProps }: GraphBuilderProps = {}) {
    const grammar: UrlGrammar = {
      linkedPrefix: DEFAULT_LINKED_PREFIX,
      tailSeparator: DEFAULT_TAIL_SEPARATOR,
      ...urlGrammar,
    };
    super({
      registry,
      relationKey: (relation) => Graph.relationKey(relation ?? 'child'),
      inline,
      unchanged: nodeArgsUnchanged,
      decorateNode: decorateNode ?? ((node, extension) => stampUrlSegment(node, extension?.meta, grammar)),
      store: (hooks, resolvedRegistry) => makeStore(graphProps, hooks, resolvedRegistry),
    });
    this.urlGrammar = grammar;
  }

  /** Hand flushes to the scheduler so a large expansion yields to the main thread. */
  override _schedule(callback: () => void): Promise<void> {
    return scheduleTask(callback, { strategy: 'smooth' });
  }

  override _yield(): Promise<void> {
    return yieldOrContinue('idle');
  }

  override _onReleaseRelation(target: { id: string; relation: string }): void {
    super._onReleaseRelation(target);
    Graph.releaseRelation(this.graph, target.id, target.relation);
  }

  override _onExpand(id: string, relation: string): void {
    super._onExpand(id, relation);

    // TODO(wittjosiah): Remove. This is for backwards compatibility.
    const decoded = Graph.relationFromKey(relation);
    if (decoded.kind === 'child' && decoded.direction === 'outbound') {
      Graph.expandSync(this.graph, id, 'action');
    }
  }
}

/**
 * How an app node argument's inline descendants are traversed. Actions are qualified and tracked like
 * any other inline node but do not inherit provenance: they are not addressable in their own right, so
 * attributing them to the producing extension would give them a URL representation they cannot have.
 */
const inline: Builder.Inline<Node.NodeArg<any>> = {
  children: (node) => [...(node.nodes ?? []), ...(node.actions ?? [])],
  map: (node, fn) => ({ ...node, nodes: node.nodes?.map(fn), actions: node.actions?.map(fn) }),
  owned: (node) => node.nodes ?? [],
};

/** Adapt the app graph to the engine's store port, translating between relation keys and relations. */
const makeStore = (
  props: Pick<Graph.GraphProps, 'nodes' | 'edges'>,
  hooks: Builder.StoreHooks,
  registry: Registry.AtomRegistry,
): Builder.Store<Node.Node, Node.NodeArg<any>, Graph.ExpandableGraph> => {
  const decode = ({ source, target, relation }: Builder.Edge): Graph.Edge => ({
    source,
    target,
    relation: Graph.relationFromKey(relation),
  });

  const graph = Graph.make({
    ...props,
    registry,
    onExpand: (id, relation) => hooks.onExpand(id, Graph.relationKey(relation)),
    onRemoveNode: hooks.onRemoveNode,
  });

  return {
    graph,
    node: (id) => graph.node(id),
    nodeOrThrow: (id) => graph.nodeOrThrow(id),
    addNodes: (nodes) => void Graph.addNodes(graph, [...nodes]),
    removeNodes: (ids, edges) => void Graph.removeNodes(graph, [...ids], edges),
    addEdges: (edges) => void Graph.addEdges(graph, edges.map(decode)),
    removeEdges: (edges, removeOrphans) => void Graph.removeEdges(graph, edges.map(decode), removeOrphans),
    sortEdges: (id, relation, order) => void Graph.sortEdges(graph, id, Graph.relationFromKey(relation), [...order]),
    setNode: (id, node) => graph._setNode(id, node),
    batch: (fn) => Graph.batch(graph, fn),
    release: (ids) => void Graph.release(graph, ids),
    constructNode: (node) => graph._constructNode(node),
  };
};

/**
 * Creates a new GraphBuilder instance.
 */
export const make = (params?: GraphBuilderProps): GraphBuilder => new GraphBuilder(params);

/**
 * Creates a GraphBuilder from a serialized pickle string.
 */
export const from = (pickle?: string, registry?: Registry.AtomRegistry, urlGrammar?: UrlGrammarProps): GraphBuilder => {
  if (!pickle) {
    return make({ registry, urlGrammar });
  }

  const { nodes, edges } = JSON.parse(pickle);
  return make({ nodes, edges, registry, urlGrammar });
};

// The expansion lifecycle is the generic engine's; the app layer only specializes the vocabulary.
export { addExtension, destroy, explore, flush, release, removeExtension } from '@dxos/graph/GraphBuilder';

/**
 * Flatten arbitrarily nested extension groups into a single list. Pinned to the app extension type,
 * which the generic signature cannot infer from a recursively nested argument.
 */
export const flattenExtensions = (extensions: BuilderExtensions, acc: BuilderExtension[] = []): BuilderExtension[] =>
  Builder.flattenExtensions<BuilderExtension>(extensions, acc);

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
export type CreateExtensionRawOptions<Id extends string = string> = {
  id: [DXN.Path<Id>] extends [never]
    ? `Invalid id "${Id}": final segment must be camelCase — letters and digits, starting with a letter`
    : Id;
  relation?: Node.RelationInput;
  position?: Position.Position;
  url?: UrlBinding;
  connector?: ConnectorExtension;
  actions?: ActionsExtension;
  actionGroups?: ActionGroupsExtension;
};

/**
 * Create a graph builder extension (low-level API that works directly with Atoms).
 */
export const createExtensionRaw = <const Id extends string = string>(
  extension: CreateExtensionRawOptions<Id>,
): BuilderExtension[] => {
  const {
    id,
    position,
    relation = 'child',
    url,
    connector: _connector,
    actions: _actions,
    actionGroups: _actionGroups,
  } = extension;
  if (!DXN.isValidPath(id)) {
    log.warn(
      'dropping graph extension with invalid id; the final segment must be camelCase — letters and digits, starting with a letter',
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
      _connector(node).pipe(withLabel(`graph-builder:_connector:${id}`)),
    );

  const actionGroups =
    _actionGroups &&
    Atom.family((node: Atom.Atom<Option.Option<Node.Node>>) =>
      _actionGroups(node).pipe(withLabel(`graph-builder:_actionGroups:${id}`)),
    );

  const actions =
    _actions &&
    Atom.family((node: Atom.Atom<Option.Option<Node.Node>>) =>
      _actions(node).pipe(withLabel(`graph-builder:_actions:${id}`)),
    );

  const extensions = [
    connector
      ? ({
          id: getId('connector'),
          position,
          relation: normalizedRelation,
          meta: url,
          connector: Atom.family((node) =>
            Atom.make((get) => {
              try {
                return get(connector(node));
              } catch (error) {
                log.warn('Error in connector', { id: getId('connector'), node, error });
                return [];
              }
            }).pipe(withLabel(`graph-builder:connector:${id}`)),
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
            }).pipe(withLabel(`graph-builder:connector:actionGroups:${id}`)),
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
            }).pipe(withLabel(`graph-builder:connector:actions:${id}`)),
          ),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(isNonNullable);

  // A declaration-only extension: a `url` binding with no connector/actions (e.g. the workspace anchor,
  // which registers a key for the parser/serializer but produces no nodes of its own). Emit it so the
  // key table sees the binding; it has no connector so it never runs.
  if (extensions.length === 0 && url) {
    return [{ id, position, relation: normalizedRelation, meta: url } satisfies BuilderExtension];
  }

  return extensions;
};

/**
 * Options for creating a graph builder extension with simplified API.
 * All callbacks must return Effects for dependency injection.
 * Effects may defect — defects are caught, logged, and the extension returns empty results.
 * Use Effect.orDie on any failable effects inside callbacks.
 */
export type CreateExtensionOptions<TMatched = Node.Node, R = never, Id extends string = string> = {
  id: [DXN.Path<Id>] extends [never]
    ? `Invalid id "${Id}": final segment must be camelCase — letters and digits, starting with a letter`
    : Id;
  match: (node: Node.Node, get: Atom.AtomContext) => Option.Option<TMatched>;
  actions?: (
    matched: TMatched,
    get: Atom.AtomContext,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>, any>, 'type'>[], never, R>;
  /** Contribute dropdown action groups (each with nested `actions`) to the matched node; the group's
   * `type`/`data` are set automatically, so returning `Node.makeActionGroup(...)` output is fine. */
  actionGroups?: (
    matched: TMatched,
    get: Atom.AtomContext,
  ) => Effect.Effect<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data'>[], never, R>;
  connector?: (matched: TMatched, get: Atom.AtomContext) => Effect.Effect<Node.NodeArg<any, any>[], never, R>;
  relation?: Node.RelationInput;
  position?: Position.Position;
  /** URL binding for the nodes this extension produces (key + resolution); see {@link UrlBinding}. */
  url?: UrlBinding;
};

/** Marks an extension body's first run; which bodies ran is not derivable from the extension list. */
const markBodyRun = (ran: Set<string>, extensionId: string, kind: string): void => {
  if (ran.has(kind) || typeof performance === 'undefined') {
    return;
  }
  ran.add(kind);
  performance.mark(`graph-body:${kind}:${extensionId}`);
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
      Effect.catchDefect((defect) => {
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
export const createExtension = <TMatched = Node.Node, R = never, const Id extends string = string>(
  options: CreateExtensionOptions<TMatched, R, Id>,
): Effect.Effect<BuilderExtension[], never, R> =>
  Effect.map(Effect.context<R>(), (context) => {
    const { id, match, actions, actionGroups, connector, relation, position, url } = options;
    const bodiesRun = new Set<string>();

    const connectorExtension = connector
      ? createConnectorWithRuntime(id, match, connector, context, bodiesRun)
      : undefined;

    const actionsExtension = actions
      ? (node: Atom.Atom<Option.Option<Node.Node>>) =>
          Atom.make((get) =>
            Function.pipe(
              get(node),
              Option.flatMap((matchedNode) => match(matchedNode, get)),
              Option.map((matched) => {
                markBodyRun(bodiesRun, id, 'actions');
                return runEffectSyncWithFallback(actions(matched, get), context, id, []).map((action) => ({
                  ...action,
                  // Attach captured context for action execution.
                  _actionContext: context,
                }));
              }),
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
              Option.map((matched) => {
                markBodyRun(bodiesRun, id, 'actionGroups');
                return runEffectSyncWithFallback(actionGroups(matched, get), context, id, []).map((group) => ({
                  ...group,
                  // Attach captured context to the group's child actions so they execute with the
                  // extension's services (e.g. Capability.Service) even without an explicit runner.
                  actions: group.actions?.map((action) => ({ ...action, _actionContext: context })),
                }));
              }),
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
  matcher: (node: Node.Node, get: Atom.AtomContext) => Option.Option<TData>,
  factory: (data: TData, get: Atom.AtomContext) => Node.NodeArg<any>[],
): ConnectorExtension => Builder.createConnector(matcher, factory);

/**
 * Create a connector extension from a matcher and factory function with Effect support.
 * The factory must return an Effect. Errors are caught and logged.
 * @internal
 */
const createConnectorWithRuntime = <TData, R>(
  extensionId: string,
  matcher: (node: Node.Node, get: Atom.AtomContext) => Option.Option<TData>,
  factory: (data: TData, get: Atom.AtomContext) => Effect.Effect<Node.NodeArg<any>[], never, R>,
  context: Context.Context<R>,
  bodiesRun: Set<string>,
): ConnectorExtension =>
  Builder.createConnector(matcher, (data, get) => {
    markBodyRun(bodiesRun, extensionId, 'connector');
    return runEffectSyncWithFallback(factory(data, get), context, extensionId, []);
  });

/**
 * Options for creating a type-based extension.
 * All callbacks must return Effects for dependency injection.
 * Effects may fail - errors are caught, logged, and the extension returns empty results.
 */
export type CreateTypeExtensionOptions<
  T extends Type.AnyEntity = Type.AnyEntity,
  R = never,
  Id extends string = string,
> = {
  id: [DXN.Path<Id>] extends [never]
    ? `Invalid id "${Id}": final segment must be camelCase — letters and digits, starting with a letter`
    : Id;
  type: T;
  actions?: (
    object: Type.InstanceType<T>,
    get: Atom.AtomContext,
  ) => Effect.Effect<Omit<Node.NodeArg<Node.ActionData<any>>, 'type'>[], never, R>;
  actionGroups?: (
    object: Type.InstanceType<T>,
    get: Atom.AtomContext,
  ) => Effect.Effect<Omit<Node.NodeArg<typeof Node.actionGroupSymbol>, 'type' | 'data'>[], never, R>;
  connector?: (object: Type.InstanceType<T>, get: Atom.AtomContext) => Effect.Effect<Node.NodeArg<any>[], never, R>;
  relation?: Node.RelationInput;
  position?: Position.Position;
};

/**
 * Create an extension that matches nodes by schema type.
 * The entity type is inferred from the schema type and works for both object and relation schemas.
 * Returns an Effect to allow callbacks to access services via dependency injection.
 */
export const createTypeExtension = <T extends Type.AnyEntity, R = never, const Id extends string = string>(
  options: CreateTypeExtensionOptions<T, R, Id>,
): Effect.Effect<BuilderExtension[], never, R> => {
  const { id, type, actions, actionGroups, connector, relation, position } = options;
  // `string` for the id: this forwards an already-validated value, so re-checking it here would
  // reject the `Id` type parameter's error branch rather than the caller's literal.
  return createExtension<Type.InstanceType<T>, R, string>({
    id,
    match: (node) => (Entity.instanceOf(type, node.data) ? Option.some(node.data) : Option.none()),
    actions,
    actionGroups,
    connector,
    relation,
    position,
  });
};

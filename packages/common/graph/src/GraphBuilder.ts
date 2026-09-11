//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Record from 'effect/Record';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { type CleanupFn } from '@dxos/async';
import { log } from '@dxos/log';
import { type MaybePromise, Position, type Specialize, getDebugName, isNonNullable } from '@dxos/util';

import * as GraphEdge from './GraphEdge.ts';
import * as GraphModel from './GraphModel.ts';
import * as GraphNode from './GraphNode.ts';

// Separates the components of the compound keys this module builds (a node id from a relation key, a
// node id from a subscription kind). Control characters, so they cannot occur in an id or a relation.
const PRIMARY = '\u0001';

const primaryKey = (...parts: string[]): string => parts.join(PRIMARY);

const primaryParts = (key: string): string[] => key.split(PRIMARY);

/**
 * `Atom.withLabel` captures and formats a stack trace on every call, and the builder labels an atom per
 * connector key and per extension, so one expansion costs hundreds of captures on the main thread —
 * hence opt-in, and only under the dev server. Mirrors `@dxos/app-graph`'s helper, which this package
 * cannot import back across the dependency edge.
 */
const ATOM_LABELS = Boolean(import.meta.env?.DEV) && import.meta.env?.VITE_ATOM_LABELS === 'true';

/** {@link Atom.withLabel}, reduced to a pass-through wherever labels are not collected. */
const withLabel: (name: string) => <A extends Atom.Atom<any>>(self: A) => A = ATOM_LABELS
  ? Atom.withLabel
  : () => (self) => self;

//
// Contract
//

/**
 * The minimum a materialized node must expose for the builder to track it.
 */
export type NodeLike = { readonly id: string };

/**
 * The minimum a connector-produced node argument must expose: an id (qualified against the node it was
 * produced from) and the open properties record the builder reads `position` from when ordering siblings.
 */
export type NodeArgLike = { readonly id: string; readonly properties?: Record<string, any> };

/**
 * Produces the nodes to attach to `node`, reactively — the atom is re-read whenever anything it depends
 * on changes, and the resulting difference is applied to the graph.
 */
export type Connector<Node extends NodeLike, Arg extends NodeArgLike> = (
  node: Atom.Atom<Option.Option<Node>>,
) => Atom.Atom<Arg[]>;

/**
 * A registered unit of expansion: a connector plus where its nodes attach (`relation`) and in what order
 * relative to other extensions (`position`). `meta` is opaque to the builder — it is carried through to
 * {@link Props.decorateNode}, which is where a layer applies whatever its own metadata implies (the app
 * layer stamps URL segments from it).
 */
export type Extension<
  Node extends NodeLike = NodeLike,
  Arg extends NodeArgLike = NodeArgLike,
  Rel = string,
  Meta = unknown,
> = Readonly<{
  id: string;
  position?: Position.Position;
  relation?: Rel;
  meta?: Meta;
  connector?: Connector<Node, Arg>;
}>;

/**
 * Extensions in any nesting, since a contributor commonly returns several at once.
 */
export type Extensions<Extension> = Extension | Extension[] | Extensions<Extension>[];

/**
 * An edge as the builder addresses it: endpoints plus the *encoded* relation key, the form the builder
 * carries relations in internally (it never interprets them).
 */
export type Edge = { source: string; target: string; relation: string };

/**
 * The graph operations the expansion engine needs. Implemented by whatever store the builder drives —
 * the engine owns expansion, ordering and provenance, the store owns representation and reactivity.
 *
 * {@link Store.node} must cut off at the node's own value: connectors read it, so a view that notifies
 * on writes to unrelated nodes puts the builder in a flush-invalidate-flush loop.
 */
export interface Store<Node extends NodeLike, Arg extends NodeArgLike, G = unknown> {
  /** The graph being built; surfaced unchanged as {@link GraphBuilder.graph}. */
  readonly graph: G;
  node(id: string): Atom.Atom<Option.Option<Node>>;
  nodeOrThrow(id: string): Atom.Atom<Node>;
  addNodes(nodes: readonly Arg[]): void;
  removeNodes(ids: readonly string[], edges?: boolean): void;
  addEdges(edges: readonly Edge[]): void;
  removeEdges(edges: readonly Edge[], removeOrphans?: boolean): void;
  sortEdges(id: string, relation: string, order: readonly string[]): void;
  /** Upsert a node directly, bypassing expansion; used by {@link explore}. */
  setNode(id: string, node: Option.Option<Node>): void;
  /** Materialize a node argument into a node without adding it; used by {@link explore}. */
  constructNode(node: Arg): Option.Option<Node>;
  /**
   * Applies a group of writes as one observable change, if the store can. A flush touches many
   * nodes, and without this each write notifies separately.
   *
   * Deliberately the store's own mechanism rather than `Atom.batch`: an atom batch defers
   * invalidation to a rebuild pass that runs only when the outermost batch closes, and a flush
   * re-enters the registry as connectors resubscribe, which leaves nodes gathered as stale and
   * then discarded — their dependents keep a stale value and are never notified.
   */
  batch?(fn: () => void): void;
  /**
   * Drops the nodes outright, reclaiming whatever the store holds for them, if it can. Unlike
   * {@link Store.removeNodes} this is not a deletion the graph should remember — the caller is
   * unloading a subgraph it expects to rebuild from source.
   */
  release?(ids: readonly string[]): void;
}

/**
 * Callbacks the store drives the builder through: `onExpand` when a relation of a node is first read,
 * `onRemoveNode` when a node leaves the graph.
 */
export type StoreHooks = {
  onExpand: (id: string, relation: string) => void;
  onRemoveNode: (id: string) => void;
};

/**
 * How a node argument's inline descendants are read and rewritten. Connectors may return whole subtrees
 * inline, and the builder has to qualify their ids, track them for staleness and attribute them to the
 * producing extension.
 */
export type Inline<Arg extends NodeArgLike> = {
  /** Every inline descendant, in every kind of inline array the argument carries. */
  children: (node: Arg) => readonly Arg[];
  /** Rewrite every inline descendant array through `fn`, one level deep (`fn` recurses). */
  map: (node: Arg, fn: (child: Arg) => Arg) => Arg;
  /**
   * The inline descendants that inherit the producing extension's provenance; defaults to
   * {@link Inline.children}. Narrower when some inline kinds are not addressable in their own right.
   */
  owned?: (node: Arg) => readonly Arg[];
};

const defaultInline: Inline<any> = {
  children: () => [],
  map: (node) => node,
};

export type Props<
  Node extends NodeLike = NodeLike,
  Arg extends NodeArgLike = NodeArgLike,
  Rel = string,
  Meta = unknown,
  G = unknown,
> = {
  registry?: Registry.AtomRegistry;
  /**
   * Constructs the store the builder drives, wiring `hooks` into it. A factory rather than a value
   * because the store has to call back into the builder it belongs to.
   */
  store: (hooks: StoreHooks, registry: Registry.AtomRegistry) => Store<Node, Arg, G>;
  /** Encodes an extension's relation (and the absent case) into the key the builder carries. */
  relationKey: (relation: Rel | undefined) => string;
  /** How inline descendants are traversed; defaults to treating arguments as leaves. */
  inline?: Inline<Arg>;
  /**
   * Applied to each connector-produced node — already qualified — before it enters the graph. The
   * producing extension is passed so the decorator can read its {@link Extension.meta}.
   */
  decorateNode?: (node: Arg, extension?: Extension<Node, Arg, Rel, Meta>) => Arg;
  /**
   * Whether a re-read produced semantically identical nodes, in which case the flush is skipped.
   * Defaults to treating every re-read as a change, which is correct but does redundant work.
   */
  unchanged?: (prev: readonly Arg[], next: readonly Arg[]) => boolean;
};

export type TraverseOptions<Node extends NodeLike, Rel> = {
  visitor: (node: Node, path: string[]) => MaybePromise<boolean | void>;
  registry?: Registry.AtomRegistry;
  source?: string;
  relation: Rel | Rel[];
};

/**
 * Identifier denoting a GraphBuilder.
 */
export const TypeId: unique symbol = Symbol.for('@dxos/graph/GraphBuilder');
export type TypeId = typeof TypeId;

//
// Builder
//

/**
 * Composes the construction of a graph out of independently registered extensions: each expansion of a
 * node's relation subscribes to every connector declared for it, and the difference between successive
 * reads is flushed into the store as node and edge changes.
 *
 * Subclass to layer a vocabulary on top (see `@dxos/app-graph`'s `AppGraphBuilder`); the generic engine
 * is unaware of what the nodes mean.
 */
// TODO(wittjosiah): Add api for setting subscription set and/or radius.
//   Should unsubscribe from nodes that are not in the set/radius.
//   Should track LRU nodes that are not in the set/radius and remove them beyond a certain threshold.
export class GraphBuilder<
  Node extends NodeLike = NodeLike,
  Arg extends NodeArgLike = NodeArgLike,
  Rel = string,
  Meta = unknown,
  G = unknown,
>
  implements Pipeable.Pipeable
{
  readonly [TypeId]: TypeId = TypeId;

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
  }

  /**
   * Expansion subscriptions, keyed by the node they belong to and then by relation key. Nested
   * rather than flat: removal cancels a node's subscriptions, and a flat map makes that a scan of
   * every subscription in the graph per removed node.
   */
  readonly _subscriptions = new Map<string, Map<string, CleanupFn>>();
  /** Connector updates pending flush, keyed by connector key. */
  readonly _dirtyConnectors = new Map<string, { nodes: Arg[]; previous: string[] }>();
  /** Last-flushed node IDs per connector key, used for edge removal on update. */
  readonly _connectorPrevious = new Map<string, string[]>();
  /** All inline-descendant IDs per connector key, used to remove stale inline nodes on update. */
  readonly _connectorPreviousInlineIds = new Map<string, string[]>();
  /** Last-flushed node args per connector key, used for change detection. */
  readonly _connectorPreviousArgs = new Map<string, Arg[]>();
  /** Whether a dirty-flush task is already scheduled. */
  _flushScheduled = false;
  /** Resolves when the current flush completes. */
  _flushPromise: Promise<void> = Promise.resolve();
  /** Registered extensions keyed by extension ID. */
  readonly _extensions = Atom.make(Record.empty<string, Extension<Node, Arg, Rel, Meta>>()).pipe(
    Atom.keepAlive,
    withLabel('graph-builder:extensions'),
  );
  /**
   * Node id -> id of the extension whose connector produced it. Non-reactive: updated directly as
   * connectors materialize/remove nodes, so a reverse mapping from a node back to its producer does not
   * need a reactive read.
   */
  readonly _nodeExtensions = new Map<string, string>();
  readonly _registry: Registry.AtomRegistry;
  readonly _store: Store<Node, Arg, G>;
  readonly _inline: Inline<Arg>;
  readonly _relationKey: (relation: Rel | undefined) => string;
  readonly _decorateNode: (node: Arg, extension?: Extension<Node, Arg, Rel, Meta>) => Arg;
  readonly _unchanged: (prev: readonly Arg[], next: readonly Arg[]) => boolean;

  constructor({ registry, store, relationKey, inline, decorateNode, unchanged }: Props<Node, Arg, Rel, Meta, G>) {
    this._registry = registry ?? Registry.make();
    this._relationKey = relationKey;
    this._inline = inline ?? defaultInline;
    this._decorateNode = decorateNode ?? ((node) => node);
    this._unchanged = unchanged ?? (() => false);
    this._store = store(
      {
        onExpand: (id, relation) => this._onExpand(id, relation),
        onRemoveNode: (id) => this._onRemoveNode(id),
      },
      this._registry,
    );
  }

  get graph(): G {
    return this._store.graph;
  }

  get extensions(): Atom.Atom<Record<string, Extension<Node, Arg, Rel, Meta>>> {
    return this._extensions;
  }

  /** Read the currently registered extensions synchronously. */
  getExtensions(): Record<string, Extension<Node, Arg, Rel, Meta>> {
    return this._registry.get(this._extensions);
  }

  /**
   * The id of the extension whose connector produced the given node, if known. Populated as connectors
   * materialize nodes and cleared on removal.
   */
  getNodeExtensionId(nodeId: string): string | undefined {
    return this._nodeExtensions.get(nodeId);
  }

  /** Every inline descendant of `node`, at every depth. */
  _allInline(node: Arg): Arg[] {
    return this._inline.children(node).flatMap((child) => [child, ...this._allInline(child)]);
  }

  /** Qualify a node argument's id against its parent, recursively through its inline descendants. */
  _qualify(parentId: string, node: Arg): Arg {
    GraphNode.validateSegmentId(node.id);
    const id = GraphNode.qualifyId(parentId, node.id);
    return this._inline.map({ ...node, id }, (child) => this._qualify(id, child));
  }

  /** Record `extensionId` as the producer of a node and of the inline descendants that inherit it. */
  _recordProvenance(node: Arg, extensionId: string): void {
    this._nodeExtensions.set(node.id, extensionId);
    const owned = this._inline.owned ?? this._inline.children;
    for (const child of owned(node)) {
      this._recordProvenance(child, extensionId);
    }
  }

  /** Apply a set of node changes for a single connector key. */
  _applyConnectorUpdate(key: string, nodes: Arg[], previous: string[]): void {
    const { id, relation } = relationFromConnectorKey(key);
    const ids = nodes.map((node) => node.id);
    // Set membership throughout: a connector returning n nodes makes every `includes` here a scan
    // over n, and this runs on each of its updates.
    const current = new Set(ids);
    const removed = previous.filter((previousId) => !current.has(previousId));
    this._connectorPrevious.set(key, ids);
    this._connectorPreviousArgs.set(key, nodes);

    const currentInlineIds = nodes.flatMap((node) => this._allInline(node).map((child) => child.id));
    const currentInline = new Set(currentInlineIds);
    const previousInlineIds = this._connectorPreviousInlineIds.get(key) ?? [];
    const staleInlineIds = previousInlineIds.filter((previousId) => !currentInline.has(previousId));
    this._connectorPreviousInlineIds.set(key, currentInlineIds);

    this._store.removeNodes(staleInlineIds, true);
    this._store.removeEdges(
      removed.map((target) => ({ source: id, target, relation })),
      true,
    );
    this._store.addNodes(nodes);
    this._store.addEdges(nodes.map((node) => ({ source: id, target: node.id, relation })));
    if (ids.length > 0) {
      const sortedIds = [...nodes]
        .sort((a, b) => Position.compare({ position: a.properties?.position }, { position: b.properties?.position }))
        .map((node) => node.id);
      this._store.sortEdges(id, relation, sortedIds);
    }
  }

  _scheduleDirtyFlush(): void {
    if (!this._flushScheduled) {
      this._flushScheduled = true;
      this._flushPromise = this._schedule(() => {
        this._flushScheduled = false;
        while (this._dirtyConnectors.size > 0) {
          const entries = [...this._dirtyConnectors.entries()];
          this._dirtyConnectors.clear();

          const apply = () => {
            for (const [key, { nodes, previous }] of entries) {
              this._applyConnectorUpdate(key, nodes, previous);
            }
          };
          // See {@link Store.batch} for why this is the store's mechanism and not `Atom.batch`.
          this._store.batch ? this._store.batch(apply) : apply();
        }
      });
    }
  }

  /**
   * When a flush runs. Defaults to the next microtask; override to hand the work to a scheduler that can
   * yield to the main thread.
   */
  _schedule(callback: () => void): Promise<void> {
    return Promise.resolve().then(callback);
  }

  /** Where a traversal yields between nodes; overridden alongside {@link GraphBuilder._schedule}. */
  _yield(): Promise<void> {
    return Promise.resolve();
  }

  /** A connector-produced node, tagged with the id of the extension that produced it (provenance). */
  readonly _connectors = Atom.family<string, Atom.Atom<{ extensionId: string; node: Arg }[]>>((key) => {
    return Atom.make((get) => {
      const { id, relation } = relationFromConnectorKey(key);
      const node = this._store.node(id);
      if (Option.isNone(get(node))) {
        return [];
      }

      // Tracked, so registering an extension after the relation was expanded re-runs the connectors.
      const extensions = Function.pipe(
        get(this._extensions),
        Record.values,
        Array.sortBy(Position.compare),
        Array.filter(
          (extension): extension is Extension<Node, Arg, Rel, Meta> & { connector: Connector<Node, Arg> } =>
            this._relationKey(extension.relation) === relation && extension.connector != null,
        ),
      );

      const entries: { extensionId: string; node: Arg }[] = [];
      for (const extension of extensions) {
        for (const node of get(extension.connector(this._store.node(id)))) {
          entries.push({ extensionId: extension.id, node });
        }
      }

      return entries;
    }).pipe(withLabel(`graph-builder:connectors:${key}`));
  });

  /**
   * A relation of a node was read for the first time; subscribe every connector declared for it.
   * Override to expand additional relations alongside the requested one.
   */
  _onExpand(id: string, relation: string): void {
    log('onExpand', { id, relation, registry: getDebugName(this._registry) });
    this._expandRelation(id, relation);
  }

  _expandRelation(id: string, relation: string): void {
    const key = primaryKey(id, relation);
    const cancel = this._registry.subscribe(
      this._connectors(key),
      (entries) => {
        const extensions = this.getExtensions();
        // Produced nodes (and their inline descendants) pass through the decorator, which is where a
        // layer attaches whatever its extensions' metadata implies — URL segments, for instance.
        const nodes = entries.map((entry) =>
          this._decorateNode(this._qualify(id, entry.node), extensions[entry.extensionId]),
        );
        // Inline descendants are produced by the same extension, so they carry the same provenance;
        // without this they would have no reverse mapping back to their producer.
        entries.forEach((entry, index) => this._recordProvenance(nodes[index], entry.extensionId));

        const previous = this._connectorPrevious.get(key) ?? [];
        const ids = nodes.map((node) => node.id);
        if (ids.length === previous.length && ids.every((nodeId, index) => nodeId === previous[index])) {
          const previousArgs = this._connectorPreviousArgs.get(key);
          if (previousArgs && this._unchanged(previousArgs, nodes)) {
            return;
          }
        }

        log('update', { id, relation, ids });
        this._dirtyConnectors.set(key, { nodes, previous });
        this._scheduleDirtyFlush();
      },
      { immediate: true },
    );

    const forNode = this._subscriptions.get(id) ?? new Map<string, CleanupFn>();
    forNode.set(key, cancel);
    this._subscriptions.set(id, forNode);
  }

  /**
   * A relation is being torn down by {@link release}: drop its expansion subscription so the next
   * read expands it again. Override to unwind whatever expansion bookkeeping the layer keeps.
   */
  _onReleaseRelation({ id, relation }: { id: string; relation: string }): void {
    const forNode = this._subscriptions.get(id);
    const cancel = forNode?.get(primaryKey(id, relation));
    if (cancel) {
      cancel();
      forNode!.delete(primaryKey(id, relation));
      if (forNode!.size === 0) {
        this._subscriptions.delete(id);
      }
    }
  }

  _onRemoveNode(id: string): void {
    this._nodeExtensions.delete(id);
    const forNode = this._subscriptions.get(id);
    if (forNode) {
      this._subscriptions.delete(id);
      forNode.forEach((cleanup) => cleanup());
    }
  }
}

/**
 * Any builder, whatever vocabulary it was specialized with.
 */
export type Any = GraphBuilder<any, any, any, any, any>;

//
// Model-backed builder
//

/** A node the model-backed builder materializes: the graph node vocabulary plus open properties. */
export type ModelNode = Specialize<GraphNode.Any, { properties?: Record<string, any> }>;

/** What a model-backed connector returns: a node, optionally with inline descendants. */
export type ModelNodeArg = Specialize<ModelNode, { nodes?: ModelNodeArg[] }>;

/** The edge the model store writes: `type` is the relation, `data.order` the builder's sibling order. */
export type ModelEdge = GraphEdge.Of<{ order: number }>;

export type Model = GraphModel.GraphModel<ModelNode, ModelEdge>;

/** A graph shaped for {@link ModelGraphBuilder} to build into. */
export const makeModel = (options?: GraphModel.Options<ModelNode, ModelEdge>): Model =>
  GraphModel.make<ModelNode, ModelEdge>(options);

export type ModelProps<Meta = unknown> = Pick<
  Props<ModelNode, ModelNodeArg, string, Meta, Model>,
  'registry' | 'decorateNode' | 'unchanged'
> & {
  /** The graph to build into; a fresh one holding only the root by default. */
  model?: Model;
  /** The node expansion starts from, seeded when the model does not already hold it. */
  rootId?: string;
};

/**
 * The builder over `@dxos/graph`'s own {@link GraphModel} — the default specialization, and the one to
 * reach for unless a layer needs its own node vocabulary (as `@dxos/app-graph` does).
 *
 * Relations are plain strings carried in the edge `type`, and sibling order in the edge `data.order`;
 * {@link ModelGraphBuilder.children} reads them back in that order.
 */
export class ModelGraphBuilder<Meta = unknown> extends GraphBuilder<ModelNode, ModelNodeArg, string, Meta, Model> {
  /** Relations already expanded, so a repeated read does not re-subscribe the same connectors. */
  readonly #expanded = new Set<string>();

  /** Memoized {@link ModelGraphBuilder.children} views, so subscribers of a relation share one atom. */
  readonly #children = Atom.family<string, Atom.Atom<ModelNode[]>>((key) => {
    const [id, relation] = primaryParts(key);
    const model = this.graph;
    return Atom.make((get) => {
      get(model.version);
      return model
        .outgoing(id, relation)
        .toSorted((a, b) => a.data.order - b.data.order)
        .map((edge) => model.findNode(edge.target))
        .filter(isNonNullable);
    });
  });

  constructor({ model, rootId = GraphNode.RootId, ...props }: ModelProps<Meta> = {}) {
    super({
      ...props,
      relationKey: (relation) => relation ?? 'child',
      inline: {
        children: (node) => node.nodes ?? [],
        map: (node, fn) => ({ ...node, nodes: node.nodes?.map(fn) }),
      },
      // The default model retains its node atoms: builder graphs are consumed through atoms, and a
      // view dropped between reads strands its subscribers. `release` is the reclamation path.
      store: (hooks, registry) => modelStore(model ?? GraphModel.make({ registry, retainAtoms: true }), hooks),
    });
    if (!this.graph.findNode(rootId)) {
      this.graph.addNode({ id: rootId });
    }
  }

  /**
   * The nodes a relation of `node` resolves to, in sibling order, expanding it on first read — the
   * entry point that makes the graph grow.
   */
  children(id: string, relation = 'child'): Atom.Atom<ModelNode[]> {
    const key = primaryKey(id, relation);
    if (!this.#expanded.has(key)) {
      this.#expanded.add(key);
      this._onExpand(id, relation);
    }

    return this.#children(key);
  }

  override _onReleaseRelation(target: { id: string; relation: string }): void {
    super._onReleaseRelation(target);
    // Forget the expansion mark too, or the next read hits the #expanded guard and never re-subscribes.
    this.#expanded.delete(primaryKey(target.id, target.relation));
  }

  override _onRemoveNode(id: string): void {
    super._onRemoveNode(id);
    // A node that returns must expand again, so drop its expansion marks along with its subscriptions.
    for (const key of this.#expanded) {
      if (primaryParts(key)[0] === id) {
        this.#expanded.delete(key);
      }
    }
  }
}

/** Adapt a {@link GraphModel} to the store port. */
const modelStore = (model: Model, hooks: StoreHooks): Store<ModelNode, ModelNodeArg, Model> => {
  const nodes = Atom.family<string, Atom.Atom<Option.Option<ModelNode>>>((id) =>
    Atom.make((get) => {
      const node = get(model.nodeAtom(id));
      return node ? Option.some(node) : Option.none();
    }),
  );

  const addEdge = (edge: Edge): void => {
    const id = GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation });
    if (!model.findEdge(id)) {
      model.addEdge({ id, type: edge.relation, source: edge.source, target: edge.target, data: { order: 0 } });
    }
  };

  const addNode = (node: ModelNodeArg): void => {
    const { nodes: children, ...rest } = node;
    model.setNode(rest);
    children?.forEach((child) => {
      addNode(child);
      // Without this edge an inline descendant is materialized but unreachable through children().
      addEdge({ source: node.id, target: child.id, relation: 'child' });
    });
  };

  return {
    graph: model,
    node: (id) => nodes(id),
    nodeOrThrow: (id) => Atom.make((get) => Option.getOrThrowWith(get(nodes(id)), () => new Error(`No node: ${id}`))),
    addNodes: (args) => model.batch(() => args.forEach(addNode)),
    removeNodes: (ids, edges) =>
      model.batch(() => {
        model.removeNodes([...ids], { detachEdges: edges });
        ids.forEach((id) => hooks.onRemoveNode(id));
      }),
    addEdges: (edges) => model.batch(() => edges.forEach(addEdge)),
    removeEdges: (edges, removeOrphans) =>
      model.batch(() => {
        const present = edges.filter(
          (edge) =>
            model.findEdge(
              GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation }),
            ) !== undefined,
        );
        model.removeEdges(
          present.map((edge) =>
            GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation }),
          ),
        );
        if (removeOrphans) {
          // Mirrors the app store: a node a connector stopped producing leaves with its last edge.
          const orphans = [...new Set(present.flatMap(({ source, target }) => [source, target]))].filter(
            (id) => id !== GraphNode.RootId && model.findNode(id) !== undefined && !model.hasEdges(id),
          );
          if (orphans.length > 0) {
            model.removeNodes(orphans);
            orphans.forEach((id) => hooks.onRemoveNode(id));
          }
        }
      }),
    sortEdges: (id, relation, order) =>
      model.batch(() => {
        for (const edge of model.outgoing(id, relation)) {
          const index = order.indexOf(edge.target);
          if (index >= 0) {
            // The edge object is the one the model holds, so the write needs a touch to be observed.
            edge.data.order = index;
          }
        }
        model.touch();
      }),
    setNode: (id, node) =>
      Option.match(node, { onNone: () => model.removeNode(id), onSome: (value) => model.setNode(value) }),
    constructNode: ({ nodes: _, ...node }) => Option.some(node),
    batch: (fn) => model.batch(fn),
    release: (ids) => model.release(ids),
  };
};

/**
 * Creates a new GraphBuilder.
 */
export const make = <
  Node extends NodeLike = NodeLike,
  Arg extends NodeArgLike = NodeArgLike,
  Rel = string,
  Meta = unknown,
  G = unknown,
>(
  props: Props<Node, Arg, Rel, Meta, G>,
): GraphBuilder<Node, Arg, Rel, Meta, G> => new GraphBuilder(props);

/**
 * Add extensions to the builder.
 */
export const addExtension: {
  <B extends Any>(builder: B, extensions: Extensions<ExtensionOf<B>>): B;
  <B extends Any>(extensions: Extensions<ExtensionOf<B>>): (builder: B) => B;
} = Function.dual(2, <B extends Any>(builder: B, extensions: Extensions<ExtensionOf<B>>): B => {
  flattenExtensions(extensions).forEach((extension) => {
    builder._registry.set(builder._extensions, Record.set(builder.getExtensions(), extension.id, extension));
  });
  return builder;
});

/**
 * Remove an extension from the builder.
 */
export const removeExtension: {
  <B extends Any>(builder: B, id: string): B;
  (id: string): <B extends Any>(builder: B) => B;
} = Function.dual(2, <B extends Any>(builder: B, id: string): B => {
  builder._registry.set(builder._extensions, Record.remove(builder.getExtensions(), id));
  return builder;
});

/**
 * Wait for all pending connector updates to be flushed.
 */
export const flush = (builder: Any): Promise<void> => builder._flushPromise;

/**
 * Unloads the nodes and everything the builder remembers about them: expansion subscriptions, the
 * per-connector diff state, and provenance. The nodes leave the store outright rather than being
 * tombstoned, so reading a released relation again re-expands it from its connectors.
 *
 * Releasing a node does NOT release its descendants — the caller chooses the set, since what counts
 * as a releasable unit (a workspace, a collection, one node) is a policy the builder has no view of.
 * {@link explore} and the store's own traversal are how that set is collected.
 */
export const release = (builder: Any, ids: readonly string[]): void => {
  const released = new Set(ids);
  for (const [key, previous] of [...builder._connectorPrevious]) {
    // A connector rooted at a released node, or one that produced one. The second case matters:
    // its diff state still claims the node was emitted, so leaving it in place would mean the
    // connector never re-emits and the node never comes back. Both tear down to "never expanded".
    if (released.has(relationFromConnectorKey(key).id) || previous.some((id) => released.has(id))) {
      builder._connectorPrevious.delete(key);
      builder._connectorPreviousArgs.delete(key);
      builder._connectorPreviousInlineIds.delete(key);
      builder._dirtyConnectors.delete(key);
      builder._onReleaseRelation(relationFromConnectorKey(key));
    }
  }

  // A connector expanded but never flushed has no diff state yet — its first emission is still
  // sitting in the dirty queue, and left there the flush would re-materialize the released nodes.
  for (const [key, { nodes }] of [...builder._dirtyConnectors]) {
    if (released.has(relationFromConnectorKey(key).id) || nodes.some((node: NodeArgLike) => released.has(node.id))) {
      builder._dirtyConnectors.delete(key);
      builder._onReleaseRelation(relationFromConnectorKey(key));
    }
  }

  ids.forEach((id) => builder._onRemoveNode(id));
  builder._store.release?.(ids);
};

/**
 * Release every expansion subscription the builder holds.
 */
export const destroy = (builder: Any): void => {
  builder._subscriptions.forEach((forNode) => forNode.forEach((unsubscribe) => unsubscribe()));
  builder._subscriptions.clear();
};

/**
 * Traverse the graph, materializing the nodes reached along the way.
 *
 * The `registry` option scopes the connector reads, not the nodes themselves, which the store owns.
 */
export const explore = async <B extends Any>(
  builder: B,
  options: TraverseOptions<NodeOf<B>, RelationOf<B>>,
  path: string[] = [],
): Promise<void> => {
  const { registry = Registry.make(), source = GraphNode.RootId, relation, visitor } = options;
  // Break cycles.
  if (path.includes(source)) {
    return;
  }

  await builder._yield();

  const node = registry.get(builder._store.nodeOrThrow(source));
  const shouldContinue = await visitor(node, [...path, node.id]);
  if (shouldContinue === false) {
    return;
  }

  const nodes = Function.pipe(
    builder.getExtensions(),
    Record.values,
    Array.map((extension) => extension.connector),
    Array.filter(isNonNullable),
    Array.flatMap((connector) => registry.get(connector(builder._store.node(source)))),
    Array.map((node) => builder._qualify(source, node)),
  );

  await Promise.all(
    nodes.map((node) => {
      builder._store.setNode(node.id, builder._store.constructNode(node));
      return explore(builder, { registry, source: node.id, relation, visitor }, [...path, source]);
    }),
  );

  if (registry !== builder._registry) {
    registry.reset();
    registry.dispose();
  }
};

/**
 * Create a connector from a matcher and a factory: the factory runs only for nodes the matcher accepts,
 * and its data type is inferred from the matcher's.
 */
export const createConnector = <Node extends NodeLike, Arg extends NodeArgLike, TData>(
  matcher: (node: Node, get: Atom.AtomContext) => Option.Option<TData>,
  factory: (data: TData, get: Atom.AtomContext) => Arg[],
): Connector<Node, Arg> => {
  return (node) =>
    Atom.make((get) =>
      Function.pipe(
        get(node),
        Option.flatMap((matched) => matcher(matched, get)),
        Option.map((data) => factory(data, get)),
        Option.getOrElse((): Arg[] => []),
      ),
    );
};

/**
 * Flatten arbitrarily nested extension groups into a single list.
 */
export const flattenExtensions = <E>(extensions: Extensions<E>, acc: E[] = []): E[] => {
  if (Array.isArray(extensions)) {
    return [...acc, ...extensions.flatMap((extension) => flattenExtensions<E>(extension, acc))];
  } else {
    return [...acc, extensions];
  }
};

//
// Internal
//

type NodeOf<B> = B extends GraphBuilder<infer Node, any, any, any, any> ? Node : never;
type ArgOf<B> = B extends GraphBuilder<any, infer Arg, any, any, any> ? Arg : never;
type RelationOf<B> = B extends GraphBuilder<any, any, infer Rel, any, any> ? Rel : never;
type MetaOf<B> = B extends GraphBuilder<any, any, any, infer Meta, any> ? Meta : never;
type ExtensionOf<B> = Extension<NodeOf<B>, ArgOf<B>, RelationOf<B>, MetaOf<B>>;

const relationFromConnectorKey = (key: string): { id: string; relation: string } => {
  const [id, relation] = primaryParts(key);
  return { id, relation };
};

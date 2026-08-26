//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Function from 'effect/Function';
import * as EffectGraph from 'effect/Graph';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { inspectCustom } from '@dxos/debug';
import { failedInvariant, invariant } from '@dxos/invariant';
import { type MakeOptional, type Specialize } from '@dxos/util';

import * as GraphEdge from './GraphEdge';
import * as GraphNode from './GraphNode';

/**
 * Serialized graph; the shape persisted by ECHO types and returned by the model's snapshot.
 */
export const Data = Schema.Struct({
  id: Schema.optional(Schema.String),
  nodes: Schema.mutable(Schema.Array(GraphNode.GraphNode)),
  edges: Schema.mutable(Schema.Array(GraphEdge.GraphEdge)),
});

export interface AnyData extends Schema.Schema.Type<typeof Data> {}

export type Data<Node extends GraphNode.Any, Edge extends GraphEdge.Any> = Specialize<
  AnyData,
  { nodes: Node[]; edges: Edge[] }
>;

/**
 * Optional function to wrap mutations (e.g., for ECHO objects that require Obj.update).
 */
export type GraphChangeFunction = (fn: () => void) => void;

/**
 * Node slot in the working graph. `value` is none for a placeholder — a node an edge references
 * before it has been added, or one that has been removed while its edges are still being detached.
 */
type Slot<Node> = { id: string; value: Option.Option<Node> };

export type Options<Node extends GraphNode.Any, Edge extends GraphEdge.Any> = {
  registry?: Registry.AtomRegistry;
  graph?: Partial<Data<Node, Edge>>;
  /**
   * When set, structural mutations are mirrored into `graph` through this function, which owns the
   * transaction (e.g. `Obj.update` for an ECHO-backed graph).
   */
  change?: GraphChangeFunction;
  /**
   * Keep each node's atom mounted for as long as the node is in the graph, so a view of a node is
   * never dropped and re-created between reads. {@link AbstractGraphModel.release} cancels the
   * mount, which is what lets the registry drop the atom and the family's weak memoization collect
   * it. Off by default — a model consumed imperatively pays for the atoms without reading them.
   */
  retainAtoms?: boolean;
};

/**
 * Predicate selecting which edges an algorithm traverses; the default includes every edge.
 */
export type EdgeFilter<Edge extends GraphEdge.Any> = (edge: Edge) => boolean;

/**
 * Which way an adjacency view follows edges.
 */
export type Direction = 'outgoing' | 'incoming';

/**
 * One step of a cycle: a node and the outgoing edge continuing the loop.
 */
export type CycleStep<Edge extends GraphEdge.Any> = { node: string; edge: Edge };

export type Subscription<Node extends GraphNode.Any = GraphNode.Any, Edge extends GraphEdge.Any = GraphEdge.Any> = (
  model: AbstractGraphModel<Node, Edge>,
  graph: Data<Node, Edge>,
) => void;

/**
 * Reactive graph model over a long-lived Effect `MutableGraph`.
 *
 * Mutations apply directly to the working graph and bump a version atom once per batch; derived
 * views read the working graph through that atom, so immutable snapshots are produced on demand
 * rather than on every write.
 */
export abstract class AbstractGraphModel<
  Node extends GraphNode.Any = GraphNode.Any,
  Edge extends GraphEdge.Any = GraphEdge.Any,
  Model extends AbstractGraphModel<Node, Edge, Model> = any,
> {
  readonly #registry: Registry.AtomRegistry;
  readonly #version: Atom.Writable<number>;
  readonly #nodeIndex = new Map<string, EffectGraph.NodeIndex>();
  readonly #edgeIndex = new Map<string, EffectGraph.EdgeIndex>();
  // Adjacency by endpoint, maintained incrementally with the edge index rather than rebuilt per
  // version: a rebuild is O(E) and, worse, ran off the encoded snapshot, so every mutation
  // re-materialized the whole graph as arrays just to walk its edges.
  // Keyed by edge id rather than held in arrays: a Map preserves insertion order (which carries the
  // sort) while making removal O(1), and a bulk removal splices the same array once per edge.
  readonly #outgoing = new Map<string, Map<string, Edge>>();
  readonly #incoming = new Map<string, Map<string, Edge>>();
  readonly #change?: GraphChangeFunction;
  readonly #mirror?: Partial<Data<Node, Edge>>;
  readonly #id?: string;

  #graph: EffectGraph.MutableDirectedGraph<Slot<Node>, Edge>;
  #snapshot?: { version: number; graph: Data<Node, Edge> };
  #depth = 0;
  #dirty = false;

  readonly #graphAtom: Atom.Atom<Data<Node, Edge>>;
  readonly #nodeAtoms: (id: string) => Atom.Atom<Node | undefined>;
  readonly #edgeAtoms: (id: string) => Atom.Atom<Edge | undefined>;
  readonly #neighborAtoms: (key: string) => Atom.Atom<Node[]>;

  /** One mount per node while it is in the graph; `undefined` when retention is off. See {@link Options.retainAtoms}. */
  readonly #pins?: Map<string, () => void>;

  constructor({ registry, graph, change, retainAtoms }: Options<Node, Edge> = {}) {
    this.#registry = registry ?? Registry.make();
    this.#pins = retainAtoms ? new Map() : undefined;
    this.#version = Atom.make(0).pipe(Atom.keepAlive);
    // Priming before any subscriber attaches; a first read of an observed-but-uninitialized atom
    // notifies in addition to the write that follows it.
    this.#registry.get(this.#version);
    this.#graph = EffectGraph.beginMutation(EffectGraph.directed<Slot<Node>, Edge>());
    this.#change = change;
    this.#mirror = change ? graph : undefined;
    this.#id = graph?.id;

    this.#graphAtom = Atom.make((get) => {
      get(this.#version);
      return this.graph;
    });
    this.#nodeAtoms = Atom.family((id: string) =>
      Atom.make((get) => {
        get(this.#version);
        return this.findNode(id);
      }),
    );
    this.#edgeAtoms = Atom.family((id: string) =>
      Atom.make((get) => {
        get(this.#version);
        return this.findEdge(id);
      }),
    );
    this.#neighborAtoms = Atom.family((key: string) =>
      Atom.make((get) => {
        get(this.#version);
        const { id, type, direction } = parseNeighborKey(key);
        return this.neighbors(id, type, direction);
      }).pipe(Atom.withEquality((a: Node[], b: Node[]) => sameNodes(a, b))),
    );

    // Seeds the working graph without mirroring; the source already holds this state.
    this.#load(graph, false);
  }

  /**
   * New model of the same kind, optionally seeded with the given graph.
   */
  abstract copy(graph?: Partial<Data<Node, Edge>>): Model;

  /**
   * Applies operations to the model, left to right.
   */
  pipe<A>(this: A): A;
  pipe<A, B>(this: A, ab: (a: A) => B): B;
  pipe<A, B, C>(this: A, ab: (a: A) => B, bc: (b: B) => C): C;
  pipe<A, B, C, D>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
  pipe<A, B, C, D, E>(this: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;
  pipe<A, B, C, D, E, F>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
  ): F;
  pipe<A, B, C, D, E, F, G>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
  ): G;
  pipe<A, B, C, D, E, F, G, H>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
  ): H;
  pipe<A, B, C, D, E, F, G, H, I>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
  ): I;
  pipe<A, B, C, D, E, F, G, H, I, J>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
  ): J;
  pipe<A, B, C, D, E, F, G, H, I, J, K>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
  ): K;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
  ): L;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
  ): M;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
  ): N;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
  ): O;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
  ): P;
  pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    this: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
  ): Q;
  pipe(this: unknown, ...fns: readonly ((value: unknown) => unknown)[]): unknown {
    return fns.reduce<unknown>((value, fn) => fn(value), this);
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  toJSON() {
    return {
      nodes: this.nodes.length,
      edges: this.edges.length,
    };
  }

  get registry(): Registry.AtomRegistry {
    return this.#registry;
  }

  /**
   * Invalidation signal for derived views; bumped once per batch.
   */
  get version(): Atom.Atom<number> {
    return this.#version;
  }

  /**
   * Immutable snapshot in the schema shape, recomputed only when the graph has changed.
   */
  get graph(): Data<Node, Edge> {
    const version = this.#registry.get(this.#version);
    if (this.#snapshot?.version !== version) {
      this.#snapshot = { version, graph: this.#encode() };
    }

    return this.#snapshot.graph;
  }

  get graphAtom(): Atom.Atom<Data<Node, Edge>> {
    return this.#graphAtom;
  }

  get nodes(): Node[] {
    return this.graph.nodes;
  }

  get edges(): Edge[] {
    return this.graph.edges;
  }

  //
  // Reactivity
  //

  /**
   * Applies mutations as a single unit, emitting one notification.
   */
  batch<T>(fn: () => T): T {
    this.#depth++;
    try {
      return fn();
    } finally {
      this.#depth--;
      if (this.#depth === 0 && this.#dirty) {
        this.#dirty = false;
        this.#registry.set(this.#version, this.#registry.get(this.#version) + 1);
      }
    }
  }

  subscribe(cb: Subscription<Node, Edge>, fire = false): () => void {
    if (fire) {
      cb(this, this.graph);
    }

    return this.#registry.subscribe(this.#version, () => cb(this, this.graph));
  }

  /**
   * Per-node view; recomputes only when the model changes, and cuts off when the node is untouched.
   */
  nodeAtom(id: string): Atom.Atom<Node | undefined> {
    return this.#nodeAtoms(id);
  }

  edgeAtom(id: string): Atom.Atom<Edge | undefined> {
    return this.#edgeAtoms(id);
  }

  /**
   * Nodes reached from the node by edges of the given type, in edge order. Edges whose other
   * endpoint is a placeholder are skipped, so a view never sees a half-materialized neighbour.
   */
  neighbors(id: string, type?: string, direction: Direction = 'outgoing'): Node[] {
    const edges = direction === 'outgoing' ? this.outgoing(id, type) : this.incoming(id, type);
    const nodes: Node[] = [];
    for (const edge of edges) {
      const node = this.findNode(direction === 'outgoing' ? edge.target : edge.source);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Per-neighbourhood view, cut off on the resolved node list so an unrelated change is silent.
   */
  neighborsAtom(id: string, type?: string, direction: Direction = 'outgoing'): Atom.Atom<Node[]> {
    return this.#neighborAtoms(neighborKey(id, type, direction));
  }

  /**
   * Depth-first projection rooted at the node, following edges of the given type. Repeated nodes
   * terminate a branch, so a cyclic graph still yields a finite tree.
   */
  toTree<T>(id: string, project: (node: Node, children: T[]) => T, type?: string): T | undefined {
    const visit = (nodeId: string, seen: string[]): T | undefined => {
      const node = this.findNode(nodeId);
      if (!node) {
        return undefined;
      }

      const children = seen.includes(nodeId)
        ? []
        : this.neighbors(nodeId, type)
            .map((child) => visit(child.id, [...seen, nodeId]))
            .filter((child): child is T => child !== undefined);
      return project(node, children);
    };

    return visit(id, []);
  }

  //
  // Nodes
  //

  findNode(id: string): Node | undefined {
    const index = this.#nodeIndex.get(id);
    if (index === undefined) {
      return undefined;
    }

    const slot = EffectGraph.getNode(this.#graph, index);
    return Option.isSome(slot) ? Option.getOrUndefined(slot.value.value) : undefined;
  }

  getNode(id: string): Node {
    return this.findNode(id) ?? failedInvariant(`node not found: ${id}`);
  }

  filterNodes({ type }: Partial<GraphNode.Any> = {}): Node[] {
    return this.nodes.filter((node) => !type || type === node.type);
  }

  addNode(node: Node): Node {
    invariant(node.id, 'ID is required');
    invariant(!this.findNode(node.id), `node already exists: ${node.id}`);
    this.batch(() => {
      EffectGraph.updateNode(this.#graph, this.#slot(node.id), (slot) => ({ ...slot, value: Option.some(node) }));
      this.#touch();
      this.#mirrorMutate((mirror) => mirror.nodes?.push(node));
    });

    return node;
  }

  addNodes(nodes: Node[]): Node[] {
    return this.batch(() => nodes.map((node) => this.addNode(node)));
  }

  /**
   * Adds the node, or replaces the payload of an existing one, leaving its edges alone.
   */
  setNode(node: Node): Node {
    invariant(node.id, 'ID is required');
    this.batch(() => {
      const existed = this.findNode(node.id) !== undefined;
      EffectGraph.updateNode(this.#graph, this.#slot(node.id), (slot) => ({ ...slot, value: Option.some(node) }));
      this.#touch();
      this.#mirrorMutate((mirror) => {
        if (existed) {
          removeInPlace(mirror.nodes, (candidate) => candidate.id === node.id);
        }
        mirror.nodes?.push(node);
      });
    });

    return node;
  }

  /**
   * Marks the graph changed after an in-place edit the model cannot observe, so derived views
   * recompute.
   */
  touch(): void {
    this.batch(() => this.#touch());
  }

  /**
   * Removes the node, returning it and any detached edges as a separate graph. Retaining the
   * incident edges leaves them dangling, which is legal — they resolve again if the node returns.
   */
  removeNode(id: string, options?: { detachEdges?: boolean }): Model {
    return this.batch(() => this.copy(this.#detachNode(id, options)));
  }

  /**
   * Drops the nodes and their incident edges outright, reclaiming their slots.
   *
   * Distinct from {@link AbstractGraphModel.removeNode}, which tombstones: it keeps the slot so an
   * edge pointing at the id stays legal and re-resolves if the node comes back. That is the right
   * semantics for deletion, and the wrong one for unloading a subgraph the session may never look
   * at again — the slot, the id-index entry and the adjacency entries all survive, so a long
   * session retains every node it has ever materialized. Release is for the unload case: the
   * subgraph is expected to be rebuilt from its source if it is needed again.
   *
   * Edges reaching *into* the released set from outside are removed with it, since their endpoint
   * no longer exists in any form.
   */
  release(ids: readonly string[]): void {
    this.batch(() => {
      for (const id of ids) {
        const index = this.#nodeIndex.get(id);
        if (index === undefined) {
          continue;
        }

        // Unlink first, so the incident-edge maps and the edge-id bimap stay in step; the graph's
        // own `removeNode` drops its incident edges but knows nothing of those indexes.
        this.#incidentEdges(id).forEach((edge) => this.#unlinkEdge(edge));
        EffectGraph.removeNode(this.#graph, index);
        this.#nodeIndex.delete(id);
        this.#outgoing.delete(id);
        this.#incoming.delete(id);
        this.#unpin(id);
        this.#mirrorMutate((mirror) => removeInPlace(mirror.nodes, (candidate) => candidate.id === id));
      }

      this.#touch();
    });
  }

  /**
   * Ids reachable from `id` along `type` edges, excluding `id` itself — the subgraph a caller
   * unloading a branch wants to hand to {@link AbstractGraphModel.release}.
   */
  descendants(id: string, type?: string): string[] {
    const seen = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      for (const node of this.neighbors(queue.shift()!, type)) {
        if (!seen.has(node.id)) {
          seen.add(node.id);
          queue.push(node.id);
        }
      }
    }

    seen.delete(id);
    return [...seen];
  }

  removeNodes(ids: string[], options?: { detachEdges?: boolean }): Model {
    return this.batch(() => {
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      for (const id of ids) {
        const detached = this.#detachNode(id, options);
        nodes.push(...detached.nodes);
        edges.push(...detached.edges);
      }

      return this.copy({ nodes, edges });
    });
  }

  /**
   * Performs the removal and reports what left, without building a graph to hold it — constructing
   * one allocates a registry-backed model, which is most of the cost of removing a node in bulk.
   */
  #detachNode(id: string, { detachEdges = true }: { detachEdges?: boolean } = {}): { nodes: Node[]; edges: Edge[] } {
    const node = this.findNode(id);
    const edges = detachEdges ? this.#incidentEdges(id) : [];
    edges.forEach((edge) => this.#unlinkEdge(edge));

    const index = this.#nodeIndex.get(id);
    if (index !== undefined) {
      EffectGraph.updateNode(this.#graph, index, (slot) => ({ ...slot, value: Option.none() }));
      this.#touch();
      this.#mirrorMutate((mirror) => removeInPlace(mirror.nodes, (candidate) => candidate.id === id));
    }

    return { nodes: node ? [node] : [], edges };
  }

  //
  // Edges
  //

  findEdge(id: string): Edge | undefined {
    const index = this.#edgeIndex.get(id);
    if (index === undefined) {
      return undefined;
    }

    const edge = EffectGraph.getEdge(this.#graph, index);
    return Option.isSome(edge) ? edge.value.data : undefined;
  }

  getEdge(id: string): Edge {
    return this.findEdge(id) ?? failedInvariant(`edge not found: ${id}`);
  }

  filterEdges({ type, source, target }: Partial<GraphEdge.Any> = {}): Edge[] {
    // Anchoring on an endpoint reads the adjacency index instead of scanning every edge.
    const candidates = source ? this.outgoing(source) : target ? this.incoming(target) : this.edges;
    return candidates.filter(
      (edge) =>
        (!type || type === edge.type) && (!source || source === edge.source) && (!target || target === edge.target),
    );
  }

  /**
   * Whether any edge is incident on the node. Answered from the endpoint index, so it costs nothing
   * even mid-mutation — unlike reading the adjacency index, which rebuilds on every version bump.
   */
  hasEdges(id: string): boolean {
    return (this.#outgoing.get(id)?.size ?? 0) > 0 || (this.#incoming.get(id)?.size ?? 0) > 0;
  }

  /**
   * Edges leaving the node, in insertion order.
   */
  outgoing(id: string, type?: string): Edge[] {
    return collectEdges(this.#outgoing.get(id), type);
  }

  /**
   * Edges entering the node, in insertion order.
   */
  incoming(id: string, type?: string): Edge[] {
    return collectEdges(this.#incoming.get(id), type);
  }

  addEdge(edge: MakeOptional<Edge, 'id'>): Edge {
    invariant(edge.source);
    invariant(edge.target);
    // Supplying the one optional key completes the type, which TypeScript cannot narrow itself.
    const resolved = (edge.id ? edge : { id: GraphEdge.createId(edge), ...edge }) as Edge;
    invariant(!this.findEdge(resolved.id), `edge already exists: ${resolved.id}`);
    this.batch(() => {
      const index = EffectGraph.addEdge(
        this.#graph,
        this.#slot(resolved.source),
        this.#slot(resolved.target),
        resolved,
      );
      this.#edgeIndex.set(resolved.id, index);
      this.#trackIncident(resolved);
      this.#touch();
      this.#mirrorMutate((mirror) => mirror.edges?.push(resolved));
    });

    return resolved;
  }

  addEdges(edges: Edge[]): Edge[] {
    return this.batch(() => edges.map((edge) => this.addEdge(edge)));
  }

  removeEdge(id: string): Model {
    return this.batch(() => this.copy({ nodes: [], edges: this.#detachEdgeById(id) }));
  }

  removeEdges(ids: string[]): Model {
    return this.batch(() => this.copy({ nodes: [], edges: ids.flatMap((id) => this.#detachEdgeById(id)) }));
  }

  /**
   * Removes the edge, reporting whether it was there. Unlike {@link GraphModel.removeEdge} this
   * builds nothing to hold the result, which is what a caller removing edges one at a time wants:
   * the result graph is a registry-backed model, and allocating one per edge dominates the cost of
   * dropping a connector's whole output.
   */
  detachEdge(id: string): boolean {
    return this.batch(() => this.#detachEdgeById(id).length > 0);
  }

  /** See {@link GraphModel.detachEdge} for why the removal paths avoid building a graph. */
  #detachEdgeById(id: string): Edge[] {
    const edge = this.findEdge(id);
    if (edge) {
      this.#unlinkEdge(edge);
    }

    return edge ? [edge] : [];
  }

  //
  // Bulk
  //

  clear(): this {
    return this.batch(() => {
      this.#resetWorking();
      this.#mirrorMutate((mirror) => {
        mirror.nodes?.splice(0, mirror.nodes.length);
        mirror.edges?.splice(0, mirror.edges.length);
      });
      return this;
    });
  }

  /**
   * Rebuilds the working graph from the backing source for changes that did not originate here
   * (a peer edit or an undo), so the mirror is not written back.
   */
  reload(graph?: Partial<Data<Node, Edge>>): this {
    return this.batch(() => {
      this.#resetWorking();
      this.#load(graph ?? this.#mirror, false);
      return this;
    });
  }

  /**
   * Reloads only when the backing source no longer matches the working graph, so a caller can
   * drive this from every source notification. Field edits mutate the node objects the working
   * graph already holds, so only structural divergence needs a rebuild.
   */
  sync(): boolean {
    const mirror = this.#mirror;
    if (!mirror) {
      return false;
    }

    const nodes = mirror.nodes ?? [];
    const edges = mirror.edges ?? [];
    const converged =
      nodes.length === this.nodes.length &&
      edges.length === this.edges.length &&
      nodes.every((node) => this.findNode(node.id) !== undefined) &&
      edges.every((edge) => this.#edgeIndex.has(edge.id));
    if (converged) {
      return false;
    }

    this.reload();
    return true;
  }

  addGraph(graph: AbstractGraphModel<Node, Edge, any>): this {
    return this.batch(() => {
      this.addNodes(graph.nodes);
      this.addEdges(graph.edges);
      return this;
    });
  }

  addGraphs(graphs: AbstractGraphModel<Node, Edge, any>[]): this {
    return this.batch(() => {
      graphs.forEach((graph) => this.addGraph(graph));
      return this;
    });
  }

  /**
   * Replaces the entire graph, emitting one notification.
   */
  setGraph(graph: Partial<Data<Node, Edge>>): this {
    return this.batch(() => {
      this.clear();
      this.#load(graph, true);
      return this;
    });
  }

  //
  // Traversal
  //

  /**
   * Nodes reachable from the root, depth-first, including the root.
   */
  traverse(root: Node): Node[] {
    const index = this.#nodeIndex.get(root.id);
    if (index === undefined) {
      return [];
    }

    const nodes: Node[] = [];
    for (const slot of EffectGraph.values(EffectGraph.dfs(this.#graph, { start: [index] }))) {
      if (Option.isSome(slot.value)) {
        nodes.push(slot.value.value);
      }
    }

    return nodes;
  }

  /**
   * Layered topological sort (Kahn levels): level N holds the nodes whose longest incoming path
   * over included edges has length N, so a level's nodes are mutually unordered. None when cyclic.
   */
  topoLevels(includeEdge?: EdgeFilter<Edge>): Option.Option<string[][]> {
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    for (const node of this.nodes) {
      inDegree.set(node.id, 0);
    }

    for (const edge of this.edges) {
      if (includeEdge && !includeEdge(edge)) {
        continue;
      }
      if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) {
        continue;
      }

      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
      const targets = outgoing.get(edge.source) ?? [];
      targets.push(edge.target);
      outgoing.set(edge.source, targets);
    }

    const levels: string[][] = [];
    let frontier = [...inDegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
    let visited = 0;
    while (frontier.length > 0) {
      levels.push(frontier);
      visited += frontier.length;
      const next: string[] = [];
      for (const id of frontier) {
        for (const target of outgoing.get(id) ?? []) {
          const remaining = inDegree.get(target)! - 1;
          inDegree.set(target, remaining);
          if (remaining === 0) {
            next.push(target);
          }
        }
      }

      frontier = next;
    }

    return visited === inDegree.size ? Option.some(levels) : Option.none();
  }

  /**
   * One cycle over included edges, in order, each step naming the edge that continues the loop.
   * Empty when acyclic — the witness `topoLevels` cannot provide.
   */
  findCycle(includeEdge?: EdgeFilter<Edge>): CycleStep<Edge>[] {
    const outgoing = new Map<string, { target: string; edge: Edge }[]>();
    for (const edge of this.edges) {
      if (includeEdge && !includeEdge(edge)) {
        continue;
      }

      const targets = outgoing.get(edge.source) ?? [];
      targets.push({ target: edge.target, edge });
      outgoing.set(edge.source, targets);
    }

    const state = new Map<string, 'visiting' | 'done'>();
    let cycle: CycleStep<Edge>[] = [];
    const visit = (id: string, stack: CycleStep<Edge>[]): boolean => {
      state.set(id, 'visiting');
      for (const { target, edge } of outgoing.get(id) ?? []) {
        if (state.get(target) === 'done') {
          continue;
        }

        const step: CycleStep<Edge> = { node: id, edge };
        if (state.get(target) === 'visiting') {
          const start = stack.findIndex((frame) => frame.node === target);
          cycle = [...stack.slice(start === -1 ? 0 : start), step];
          return true;
        }
        if (visit(target, [...stack, step])) {
          return true;
        }
      }

      state.set(id, 'done');
      return false;
    };

    for (const node of this.nodes) {
      if (!state.has(node.id) && visit(node.id, [])) {
        break;
      }
    }

    return cycle;
  }

  //
  // Internal
  //

  /**
   * Endpoint-keyed edge index, rebuilt once per version — per-edge scans of the whole graph
   * dominate otherwise, once many views are mounted.
   */
  #encode(): Data<Node, Edge> {
    const nodes: Node[] = [];
    for (const [, slot] of EffectGraph.entries(EffectGraph.nodes(this.#graph))) {
      if (Option.isSome(slot.value)) {
        nodes.push(slot.value.value);
      }
    }

    const edges: Edge[] = [];
    for (const [, edge] of EffectGraph.entries(EffectGraph.edges(this.#graph))) {
      edges.push(edge.data);
    }

    return { id: this.#id, nodes, edges };
  }

  #load(graph: Partial<Data<Node, Edge>> | undefined, mirror: boolean): void {
    if (!graph) {
      return;
    }

    this.batch(() => {
      graph.nodes?.forEach((node) => {
        EffectGraph.updateNode(this.#graph, this.#slot(node.id), (slot) => ({ ...slot, value: Option.some(node) }));
        if (mirror) {
          this.#mirrorMutate((target) => target.nodes?.push(node));
        }
      });
      graph.edges?.forEach((edge) => {
        const index = EffectGraph.addEdge(this.#graph, this.#slot(edge.source), this.#slot(edge.target), edge);
        this.#edgeIndex.set(edge.id, index);
        this.#trackIncident(edge);
        if (mirror) {
          this.#mirrorMutate((target) => target.edges?.push(edge));
        }
      });
      this.#touch();
    });
  }

  /**
   * Edges incident to the node, read from the working graph so removal avoids a snapshot rebuild.
   */
  #incidentEdges(id: string): Edge[] {
    // Copied, since the caller detaches the edges it is handed, which mutates these maps.
    return [...collectEdges(this.#outgoing.get(id)), ...collectEdges(this.#incoming.get(id))];
  }

  #trackIncident(edge: Edge): void {
    const from = this.#outgoing.get(edge.source) ?? new Map<string, Edge>();
    from.set(edge.id, edge);
    this.#outgoing.set(edge.source, from);
    const to = this.#incoming.get(edge.target) ?? new Map<string, Edge>();
    to.set(edge.id, edge);
    this.#incoming.set(edge.target, to);
  }

  #untrackIncident(edge: Edge): void {
    this.#outgoing.get(edge.source)?.delete(edge.id);
    this.#incoming.get(edge.target)?.delete(edge.id);
  }

  /**
   * Index of the node, creating a placeholder when an edge arrives before its endpoint.
   */
  #slot(id: string): EffectGraph.NodeIndex {
    let index = this.#nodeIndex.get(id);
    if (index === undefined) {
      index = EffectGraph.addNode(this.#graph, { id, value: Option.none<Node>() });
      this.#nodeIndex.set(id, index);
      if (this.#pins && !this.#pins.has(id)) {
        this.#pins.set(id, this.#registry.mount(this.#nodeAtoms(id)));
      }
    }

    return index;
  }

  #unpin(id: string): void {
    const cancel = this.#pins?.get(id);
    if (cancel) {
      this.#pins!.delete(id);
      cancel();
    }
  }

  #unlinkEdge(edge: Edge): void {
    const index = this.#edgeIndex.get(edge.id);
    if (index === undefined) {
      return;
    }

    EffectGraph.removeEdge(this.#graph, index);
    this.#edgeIndex.delete(edge.id);
    this.#untrackIncident(edge);
    this.#touch();
    this.#mirrorMutate((mirror) => removeInPlace(mirror.edges, (candidate) => candidate.id === edge.id));
  }

  /**
   * Discards the working graph wholesale, which also drops placeholders left by removals.
   */
  #resetWorking(): void {
    this.#pins?.forEach((cancel) => cancel());
    this.#pins?.clear();
    this.#graph = EffectGraph.beginMutation(EffectGraph.directed<Slot<Node>, Edge>());
    this.#nodeIndex.clear();
    this.#edgeIndex.clear();
    this.#outgoing.clear();
    this.#incoming.clear();
    this.#touch();
  }

  #touch(): void {
    this.#dirty = true;
  }

  #mirrorMutate(fn: (mirror: Partial<Data<Node, Edge>>) => void): void {
    const mirror = this.#mirror;
    if (!mirror || !this.#change) {
      return;
    }

    this.#change(() => fn(mirror));
  }
}

const NEIGHBOR_SEPARATOR = '\u0001';

const neighborKey = (id: string, type: string | undefined, direction: Direction): string =>
  [id, type ?? '', direction].join(NEIGHBOR_SEPARATOR);

const parseNeighborKey = (key: string): { id: string; type?: string; direction: Direction } => {
  const [id, type, direction] = key.split(NEIGHBOR_SEPARATOR);
  return { id, type: type || undefined, direction: direction === 'incoming' ? 'incoming' : 'outgoing' };
};

const sameNodes = (a: readonly GraphNode.Any[], b: readonly GraphNode.Any[]): boolean =>
  a.length === b.length && a.every((node, index) => node === b[index]);

/** The endpoint's edges in insertion order, optionally narrowed to a type. */
const collectEdges = <Edge extends GraphEdge.Any>(edges: Map<string, Edge> | undefined, type?: string): Edge[] => {
  if (!edges) {
    return [];
  }

  const result: Edge[] = [];
  for (const edge of edges.values()) {
    if (type === undefined || edge.type === type) {
      result.push(edge);
    }
  }

  return result;
};

const removeInPlace = <T>(list: T[] | undefined, predicate: (value: T) => boolean): void => {
  if (!list) {
    return;
  }

  for (let index = list.length - 1; index >= 0; index--) {
    if (predicate(list[index])) {
      list.splice(index, 1);
    }
  }
};

/**
 * Basic model.
 */
export class GraphModel<
  Node extends GraphNode.Any = GraphNode.Any,
  Edge extends GraphEdge.Any = GraphEdge.Any,
> extends AbstractGraphModel<Node, Edge, GraphModel<Node, Edge>> {
  override copy(graph?: Partial<Data<Node, Edge>>): GraphModel<Node, Edge> {
    // Deliberately not this.registry: a copy is a detached snapshot, and its keepAlive version atom
    // would pin an entry in a shared registry forever — one leak per discarded removal result.
    return new GraphModel<Node, Edge>({ graph });
  }
}

export const make = <Node extends GraphNode.Any = GraphNode.Any, Edge extends GraphEdge.Any = GraphEdge.Any>(
  options?: Options<Node, Edge>,
): GraphModel<Node, Edge> => new GraphModel<Node, Edge>(options);

//
// Operations
//
// Dual: called directly with the model, or curried for `model.pipe(...)`.
//

export const addNode: {
  <Node extends GraphNode.Any, Edge extends GraphEdge.Any, Model extends AbstractGraphModel<Node, Edge, Model>>(
    model: Model,
    node: Node,
  ): Model;
  <Node extends GraphNode.Any>(node: Node): <Model extends AbstractGraphModel<Node, any, Model>>(model: Model) => Model;
} = Function.dual(2, (model: any, node: any) => {
  model.addNode(node);
  return model;
});

export const addNodes: {
  <Node extends GraphNode.Any, Edge extends GraphEdge.Any, Model extends AbstractGraphModel<Node, Edge, Model>>(
    model: Model,
    nodes: Node[],
  ): Model;
  <Node extends GraphNode.Any>(
    nodes: Node[],
  ): <Model extends AbstractGraphModel<Node, any, Model>>(model: Model) => Model;
} = Function.dual(2, (model: any, nodes: any) => {
  model.addNodes(nodes);
  return model;
});

export const addEdge: {
  <Node extends GraphNode.Any, Edge extends GraphEdge.Any, Model extends AbstractGraphModel<Node, Edge, Model>>(
    model: Model,
    edge: MakeOptional<Edge, 'id'>,
  ): Model;
  <Edge extends GraphEdge.Any>(
    edge: MakeOptional<Edge, 'id'>,
  ): <Model extends AbstractGraphModel<any, Edge, Model>>(model: Model) => Model;
} = Function.dual(2, (model: any, edge: any) => {
  model.addEdge(edge);
  return model;
});

export const addEdges: {
  <Node extends GraphNode.Any, Edge extends GraphEdge.Any, Model extends AbstractGraphModel<Node, Edge, Model>>(
    model: Model,
    edges: Edge[],
  ): Model;
  <Edge extends GraphEdge.Any>(
    edges: Edge[],
  ): <Model extends AbstractGraphModel<any, Edge, Model>>(model: Model) => Model;
} = Function.dual(2, (model: any, edges: any) => {
  model.addEdges(edges);
  return model;
});

/**
 * Applies a callback to the model without breaking a pipe.
 */
export const tap: {
  <Model extends AbstractGraphModel<any, any, Model>>(model: Model, fn: (model: Model) => void): Model;
  <Model extends AbstractGraphModel<any, any, Model>>(fn: (model: Model) => void): (model: Model) => Model;
} = Function.dual(2, (model: any, fn: any) => {
  fn(model);
  return model;
});

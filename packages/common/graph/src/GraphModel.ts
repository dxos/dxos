//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

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
  Model extends AbstractGraphModel<Node, Edge, Model, Builder> = any,
  Builder extends AbstractBuilder<Node, Edge, Model> = AbstractBuilder<Node, Edge, Model>,
> {
  readonly #registry: Registry.AtomRegistry;
  readonly #version: Atom.Writable<number>;
  readonly #nodeIndex = new Map<string, EffectGraph.NodeIndex>();
  readonly #edgeIndex = new Map<string, EffectGraph.EdgeIndex>();
  readonly #change?: GraphChangeFunction;
  readonly #mirror?: Partial<Data<Node, Edge>>;
  readonly #id?: string;

  #graph: EffectGraph.MutableDirectedGraph<Slot<Node>, Edge>;
  #snapshot?: { version: number; graph: Data<Node, Edge> };
  #adjacencyCache?: { version: number; outgoing: Map<string, Edge[]>; incoming: Map<string, Edge[]> };
  #depth = 0;
  #dirty = false;

  readonly #graphAtom: Atom.Atom<Data<Node, Edge>>;
  readonly #nodeAtoms: (id: string) => Atom.Atom<Node | undefined>;
  readonly #edgeAtoms: (id: string) => Atom.Atom<Edge | undefined>;
  readonly #neighborAtoms: (key: string) => Atom.Atom<Node[]>;

  constructor({ registry, graph, change }: Options<Node, Edge> = {}) {
    this.#registry = registry ?? Registry.make();
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
   * Allows chaining.
   */
  abstract get builder(): Builder;

  /**
   * New model of the same kind, optionally seeded with the given graph.
   */
  abstract copy(graph?: Partial<Data<Node, Edge>>): Model;

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
  removeNode(id: string, { detachEdges = true }: { detachEdges?: boolean } = {}): Model {
    return this.batch(() => {
      const node = this.findNode(id);
      const removedNodes = node ? [node] : [];
      const removedEdges = detachEdges ? this.#incidentEdges(id) : [];
      removedEdges.forEach((edge) => this.#detachEdge(edge));

      const index = this.#nodeIndex.get(id);
      if (index !== undefined) {
        EffectGraph.updateNode(this.#graph, index, (slot) => ({ ...slot, value: Option.none() }));
        this.#touch();
        this.#mirrorMutate((mirror) => removeInPlace(mirror.nodes, (node) => node.id === id));
      }

      return this.copy({ nodes: removedNodes, edges: removedEdges });
    });
  }

  removeNodes(ids: string[], options?: { detachEdges?: boolean }): Model {
    return this.batch(() => {
      const graphs = ids.map((id) => this.removeNode(id, options));
      return this.copy().addGraphs(graphs);
    });
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
   * Edges leaving the node, in insertion order.
   */
  outgoing(id: string, type?: string): Edge[] {
    const edges = this.#adjacency().outgoing.get(id) ?? [];
    return type ? edges.filter((edge) => edge.type === type) : edges;
  }

  /**
   * Edges entering the node, in insertion order.
   */
  incoming(id: string, type?: string): Edge[] {
    const edges = this.#adjacency().incoming.get(id) ?? [];
    return type ? edges.filter((edge) => edge.type === type) : edges;
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
      this.#touch();
      this.#mirrorMutate((mirror) => mirror.edges?.push(resolved));
    });

    return resolved;
  }

  addEdges(edges: Edge[]): Edge[] {
    return this.batch(() => edges.map((edge) => this.addEdge(edge)));
  }

  removeEdge(id: string): Model {
    return this.batch(() => {
      const edge = this.findEdge(id);
      if (edge) {
        this.#detachEdge(edge);
      }

      return this.copy({ nodes: [], edges: edge ? [edge] : [] });
    });
  }

  removeEdges(ids: string[]): Model {
    return this.batch(() => {
      const graphs = ids.map((id) => this.removeEdge(id));
      return this.copy().addGraphs(graphs);
    });
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

  addGraph(graph: AbstractGraphModel<Node, Edge, any, any>): this {
    return this.batch(() => {
      this.addNodes(graph.nodes);
      this.addEdges(graph.edges);
      return this;
    });
  }

  addGraphs(graphs: AbstractGraphModel<Node, Edge, any, any>[]): this {
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
  #adjacency(): { outgoing: Map<string, Edge[]>; incoming: Map<string, Edge[]> } {
    const version = this.#registry.get(this.#version);
    if (this.#adjacencyCache?.version !== version) {
      const outgoing = new Map<string, Edge[]>();
      const incoming = new Map<string, Edge[]>();
      for (const edge of this.edges) {
        const from = outgoing.get(edge.source) ?? [];
        from.push(edge);
        outgoing.set(edge.source, from);
        const to = incoming.get(edge.target) ?? [];
        to.push(edge);
        incoming.set(edge.target, to);
      }

      this.#adjacencyCache = { version, outgoing, incoming };
    }

    return this.#adjacencyCache;
  }

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
    const index = this.#nodeIndex.get(id);
    if (index === undefined) {
      return [];
    }

    const edges: Edge[] = [];
    for (const [, edge] of EffectGraph.entries(EffectGraph.edges(this.#graph))) {
      if (edge.source === index || edge.target === index) {
        edges.push(edge.data);
      }
    }

    return edges;
  }

  /**
   * Index of the node, creating a placeholder when an edge arrives before its endpoint.
   */
  #slot(id: string): EffectGraph.NodeIndex {
    let index = this.#nodeIndex.get(id);
    if (index === undefined) {
      index = EffectGraph.addNode(this.#graph, { id, value: Option.none<Node>() });
      this.#nodeIndex.set(id, index);
    }

    return index;
  }

  #detachEdge(edge: Edge): void {
    const index = this.#edgeIndex.get(edge.id);
    if (index === undefined) {
      return;
    }

    EffectGraph.removeEdge(this.#graph, index);
    this.#edgeIndex.delete(edge.id);
    this.#touch();
    this.#mirrorMutate((mirror) => removeInPlace(mirror.edges, (candidate) => candidate.id === edge.id));
  }

  /**
   * Discards the working graph wholesale, which also drops placeholders left by removals.
   */
  #resetWorking(): void {
    this.#graph = EffectGraph.beginMutation(EffectGraph.directed<Slot<Node>, Edge>());
    this.#nodeIndex.clear();
    this.#edgeIndex.clear();
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
 * Chainable builder wrapper.
 */
export abstract class AbstractBuilder<
  Node extends GraphNode.Any,
  Edge extends GraphEdge.Any,
  Model extends AbstractGraphModel<Node, Edge, any, any>,
> {
  constructor(protected readonly _model: Model) {}

  get model(): Model {
    return this._model;
  }

  call(cb: (builder: this) => void): this {
    cb(this);
    return this;
  }

  getNode(id: string): Node {
    return this._model.getNode(id);
  }

  addNode(node: Node): this {
    this._model.addNode(node);
    return this;
  }

  addNodes(nodes: Node[]): this {
    this._model.addNodes(nodes);
    return this;
  }

  addEdge(edge: MakeOptional<Edge, 'id'>): this {
    this._model.addEdge(edge);
    return this;
  }

  addEdges(edges: Edge[]): this {
    this._model.addEdges(edges);
    return this;
  }
}

/**
 * Basic model.
 */
export class GraphModel<
  Node extends GraphNode.Any = GraphNode.Any,
  Edge extends GraphEdge.Any = GraphEdge.Any,
> extends AbstractGraphModel<Node, Edge, GraphModel<Node, Edge>, Builder<Node, Edge>> {
  override get builder(): Builder<Node, Edge> {
    return new Builder<Node, Edge>(this);
  }

  override copy(graph?: Partial<Data<Node, Edge>>): GraphModel<Node, Edge> {
    return new GraphModel<Node, Edge>({ registry: this.registry, graph });
  }
}

/**
 * Basic builder.
 */
export class Builder<
  Node extends GraphNode.Any = GraphNode.Any,
  Edge extends GraphEdge.Any = GraphEdge.Any,
> extends AbstractBuilder<Node, Edge, GraphModel<Node, Edge>> {}

export const make = <Node extends GraphNode.Any = GraphNode.Any, Edge extends GraphEdge.Any = GraphEdge.Any>(
  options?: Options<Node, Edge>,
): GraphModel<Node, Edge> => new GraphModel<Node, Edge>(options);

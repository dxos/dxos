# DXOS Graph API

A reactive graph model over Effect's `Graph`, with Effect Schemas for the persisted shape.

## Imports

```ts
import * as Graph from 'effect/Graph'; // Effect's algorithms, if you need them directly
import * as GraphBuilder from '@dxos/graph/GraphBuilder'; // Lazy expansion from registered extensions
import * as GraphEdge from '@dxos/graph/GraphEdge'; // Edge schema & id helpers
import * as GraphModel from '@dxos/graph/GraphModel'; // The reactive model & serialized shape
import * as GraphNode from '@dxos/graph/GraphNode'; // Node schema & root identity
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher'; // Node predicates & combinators
```

The barrel (`@dxos/graph`) re-exports each namespace, but subpath imports are enforced by lint so a
consumer only pulls in the namespace it uses.

---

## Nodes and Edges

`GraphNode.GraphNode` and `GraphEdge.GraphEdge` are Effect Schemas — the persisted shape. `Any`
leaves the data unconstrained; `Of<Data>` pins it.

```ts
type Task = { title: string };

const node: GraphNode.Of<Task> = { id: 'task-1', type: 'task', data: { title: 'Write docs' } };
const edge: GraphEdge.Of<{ weight: number }> = {
  id: 'task-1_blocks_task-2',
  type: 'blocks',
  source: 'task-1',
  target: 'task-2',
  data: { weight: 1 },
};
```

Extend the schemas for a domain type — the model accepts the extension as its type parameter:

```ts
const ComputeNode = GraphNode.GraphNode.pipe(
  Schema.fieldsAssign(Schema.Struct({ value: Schema.optional(Schema.Any) }).fields),
);
```

`GraphNode.RootId` is the identity a traversal or expansion starts from.

### Edge ids

An edge id must be unique. `createId` derives one from the endpoints, with an optional `relation`
to distinguish parallel edges between the same pair.

```ts
GraphEdge.createId({ source: 'a', target: 'b' }); // 'a__b'
GraphEdge.createId({ source: 'a', target: 'b', relation: 'blocks' }); // 'a_blocks_b'
GraphEdge.parseId('a_blocks_b'); // { source: 'a', relation: 'blocks', target: 'b' }
```

Omitting `relation` for two edges between the same pair collides — pass one whenever a pair can
carry more than one edge.

---

## The model

`GraphModel.GraphModel` holds a long-lived Effect `MutableGraph`. Mutations apply directly and bump
a version atom; the serialized shape is encoded on demand rather than on every write.

```ts
const model = new GraphModel.GraphModel<GraphNode.Any, GraphEdge.Any>();

model.addNode({ id: 'a' });
model.addNode({ id: 'b' });
model.addEdge({ source: 'a', target: 'b' });

model.nodes; // GraphNode.Any[]  — snapshot, memoized per version
model.graph; // { id?, nodes, edges } — the persisted shape
```

Subclass `AbstractGraphModel` for a domain model, supplying the node/edge types and a `copy`:

```ts
class TaskGraphModel extends GraphModel.AbstractGraphModel<TaskNode, TaskEdge, TaskGraphModel> {
  override get builder() {
    return new GraphModel.Builder(this);
  }
  override copy(graph?: Partial<GraphModel.Data<TaskNode, TaskEdge>>) {
    return new TaskGraphModel({ graph });
  }
}
```

### Building

`model.builder` returns a chainable wrapper for assembling a graph. Each call returns the builder,
and `call` drops into a callback without breaking the chain.

```ts
model.builder
  .addNode({ id: 'a' })
  .addNode({ id: 'b' })
  .addEdge({ source: 'a', target: 'b' })
  .call((builder) => {
    for (const id of ids) {
      builder.addNode({ id });
    }
  });
```

The builder writes straight through to the model, so a chain of N calls emits N notifications and
rebuilds the derived indexes N times. Wrap it when assembling more than a couple of elements:

```ts
model.batch(() => {
  model.builder.addNodes(nodes).addEdges(edges);
});
```

Subclass `AbstractBuilder` to add domain constructors, and return it from the model's `builder`
getter — this is the seam the compute and canvas models use to expose `createNode`/`createEdge`
helpers that mint ids.

### Batching

Each mutation emits a notification and invalidates the derived indexes. Group them:

```ts
model.batch(() => {
  nodes.forEach((node) => model.addNode(node));
  edges.forEach((edge) => model.addEdge(edge));
}); // one notification
```

### Reading

```ts
model.findNode('a'); // GraphNode.Any | undefined
model.getNode('a'); // throws when absent
model.filterNodes({ type: 'task' });
model.outgoing('a', 'blocks'); // edges leaving a, by type
model.incoming('b'); // edges entering b
model.neighbors('a', 'blocks'); // nodes reached from a
```

Nodes referenced by an edge but not yet added are placeholders: the edge is legal, and the node
surfaces once added. Reads skip placeholders, so a view never sees a half-materialized node.

### Removing

```ts
model.removeNode('a'); // returns the removed node and its edges as a detached graph
model.removeNode('a', { detachEdges: false }); // tombstone: edges survive, resolve again if 'a' returns
```

---

## Reactivity

Views are Effect Atoms derived from the model's version. Each cuts off on equality, so an unrelated
change is silent.

```ts
const registry = Registry.make();

registry.get(model.nodeAtom('a')); // GraphNode.Any | undefined
registry.get(model.edgeAtom('a__b'));
registry.get(model.neighborsAtom('a', 'child')); // GraphNode.Any[]
registry.get(model.graphAtom); // the whole serialized shape

const unsubscribe = model.subscribe((_model, graph) => render(graph));
```

Pass a registry to share one with the rest of the application:

```ts
const model = new GraphModel.GraphModel({ registry });
```

**Node data is compared by reference.** Replace it rather than mutating in place, or the view will
not recompute:

```ts
model.setNode({ ...node, data: { ...node.data, title } }); // ✅ fires
node.data.title = title; // ❌ silent
```

Values that change every frame (layout positions) belong in their own atoms; the model holds
structure.

---

## Algorithms

Traversal and ordering, translated back to ids.

```ts
model.traverse(model.getNode('root')); // depth-first, including the root

// Layered topological sort: level N holds nodes whose longest incoming path is N,
// so a level's nodes are mutually unordered. None when cyclic.
const levels = model.topoLevels(); // Option<string[][]>

// One cycle, in order, each step naming the edge that continues it. Empty when acyclic.
model.findCycle(); // Array<{ node: string; edge: Edge }>

// A projection rooted at a node; repeated nodes end a branch, so cycles still terminate.
model.toTree('root', (node, children) => ({ id: node.id, children }), 'child');
```

Both `topoLevels` and `findCycle` take an edge predicate, so one graph can be evaluated over a
subset of its edges without rebuilding it:

```ts
model.topoLevels((edge) => edge.type === 'hard');
model.findCycle((edge) => edge.type === 'hard');
```

For anything beyond these, build an Effect graph and use its library directly — `dijkstra`,
`stronglyConnectedComponents`, `toMermaid`, and the rest.

---

## Building lazily

`GraphModel` holds a graph you have. `GraphBuilder` grows one you do not: independently registered
extensions contribute nodes when a relation is first read, and keep contributing as their inputs
change. `@dxos/app-graph` is one specialization of it; the engine itself knows nothing about what the
nodes mean.

An extension is a connector plus where its nodes attach:

```ts
const children: GraphBuilder.Extension<Node, Arg> = {
  id: 'children',
  position: 10, // relative to other extensions on the same relation
  connector: (node) => Atom.make((get) => (Option.isSome(get(node)) ? [{ id: 'a' }, { id: 'b' }] : [])),
};

GraphBuilder.addExtension(builder, children);
```

Connector ids are _segments_: the builder qualifies each against the node it was produced from, so the
example above yields `root/a` and `root/b`. Reading a node's relation is what triggers expansion —
nothing is materialized until something asks. Updates are coalesced, so wait for them explicitly:

```ts
await GraphBuilder.flush(builder);
```

`ModelGraphBuilder` is the default specialization, building into a `GraphModel`: relations are plain
strings in the edge `type`, sibling order lives in the edge `data.order`, and `children` reads it back.

```ts
const builder = new GraphBuilder.ModelGraphBuilder();
GraphBuilder.addExtension(builder, children);

registry.get(builder.children(GraphNode.RootId)); // expands on first read
await GraphBuilder.flush(builder);
registry.get(builder.children(GraphNode.RootId)); // [{ id: 'root/a' }, { id: 'root/b' }]
```

A layer that needs its own node vocabulary constructs the builder over a `Store` instead — the graph it
drives, and the only thing it needs (`@dxos/app-graph` does exactly this):

```ts
const builder = GraphBuilder.make({
  relationKey: (relation) => relation ?? 'child', // how a relation encodes into a key
  store: (hooks, registry) => makeStore(hooks, registry), // `hooks` drive expansion and removal
  inline: { children: (node) => node.nodes ?? [], map: (node, fn) => ({ ...node, nodes: node.nodes?.map(fn) }) },
  decorateNode: (node, extension) => stamp(node, extension?.meta), // per-layer metadata
});
```

A store's `node(id)` view must cut off at that node's own value. Connectors read it, so a view that
notifies on writes to unrelated nodes both cascades expansion across the graph and puts the builder in a
flush-invalidate-flush loop. `GraphModel`'s per-node atoms already do this.

`meta` is opaque to the builder and reaches `decorateNode` unchanged — the seam a layer uses to attach
its own vocabulary (app-graph stamps URL segments through it). `getNodeExtensionId(nodeId)` maps back
the other way, from a materialized node to the extension that produced it.

`explore` walks the graph eagerly, materializing what it reaches — useful for search indexes and
tests, not for the render path:

```ts
await GraphBuilder.explore(builder, { relation: 'child', visitor: (node) => void visited.push(node.id) });
```

Release the expansion subscriptions when done: `GraphBuilder.destroy(builder)`.

---

## Matchers

Predicates over nodes, used to decide whether a node qualifies. They return `Option`, so a matcher
both tests and narrows.

```ts
GraphNodeMatcher.whenRoot; // the root node
GraphNodeMatcher.whenId('spaces'); // an exact id
GraphNodeMatcher.whenNodeType('task'); // a node type

GraphNodeMatcher.whenAll(whenNodeType('task'), whenNot(whenRoot));
GraphNodeMatcher.whenAny(whenId('a'), whenId('b'));
```

A matcher receives the reactive context, so a decision can depend on other atoms — reading one
subscribes the matcher to it:

```ts
const matcher: GraphNodeMatcher.NodeMatcher<Task> = (node, get) =>
  get(enabledAtom) && isTask(node.data) ? Option.some(node.data) : Option.none();
```

`NodeMatcher<TData, TNode>` also takes the node type, for matchers over an extended node.

---

## Backing stores

Pass `change` alongside `graph` to mirror structural mutations into a backing object — an ECHO
document, say. The function owns the transaction:

```ts
const model = new GraphModel.GraphModel({
  graph: object.layout,
  change: (fn) => Obj.update(object, fn),
});
```

Changes that did not originate through the model reach it via `sync()`, which rebuilds only when the
source has structurally diverged:

```ts
Obj.subscribe(object, () => model.sync());
```

Field edits need no reconciliation — the model holds the same objects the store does, so ECHO's own
reactivity already covers them. Only adds and removes require a rebuild.

---

## Selection

`SelectionModel` is a reactive selection set, independent of any graph.

```ts
const selection = new SelectionModel({ mode: 'multi' });
selection.add('a');
selection.toggleSelected(['b', 'c']);
selection.getSelectedIds(); // string[]
selection.subscribe((selected) => render(selected));
```

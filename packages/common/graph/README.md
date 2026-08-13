# @dxos/graph

Low-level graph API: Effect Schemas for the persisted shape, and a reactive model over Effect's
`Graph`.

## Layers

- **Schema** (`Graph.Node` / `Graph.Edge` / `Graph.Graph`) — the storage and wire format. ECHO
  object types extend these, so the persisted shape is `{ id?, nodes, edges }`.
- **Model** (`GraphModel`) — a long-lived Effect `MutableGraph` plus id↔index maps. Mutations
  apply directly and bump a version atom; snapshots in the schema shape are encoded on demand.
- **Algorithms** — `traverse` (depth-first), `topoLevels` (layered topological sort) and
  `findCycle`, all id-translated.
- **Builder** (`GraphBuilder`) — lazy expansion: registered extensions contribute nodes when a
  relation is first read. `ModelGraphBuilder` builds into a `GraphModel`; any other store can be
  driven through the `Store` port, as `@dxos/app-graph` does.
- **Selection** (`SelectionModel`) — a reactive selection set, independent of the graph itself.

## Usage

```ts
const model = new GraphModel.GraphModel();
model.batch(() => {
  model.addNode({ id: 'a' });
  model.addNode({ id: 'b' });
  model.addEdge({ source: 'a', target: 'b' });
});

const unsubscribe = model.subscribe((_, graph) => render(graph));
const node = registry.get(model.nodeAtom('a'));
```

## Rules

- **Group mutations in `batch`.** Each batch emits one notification and rebuilds the derived
  indexes once, so a loop of bare `addNode` calls costs a rebuild per element.
- **Keep high-frequency data out of the graph.** Values that change per animation frame (layout
  positions) belong in their own atoms; the model holds structure.
- **Node indexes are session-local.** They are internal to the model and never persisted; ids are
  the only stable identity.
- **Replace node data, never mutate it in place**, when views depend on it — per-node atoms cut off
  on reference equality.

## Backing stores

Pass `change` alongside `graph` to mirror structural mutations into a backing object (an ECHO
document); the function owns the transaction. Changes that did not originate through the model
reach it via `sync()`, which rebuilds only when the source has structurally diverged. Field edits
need no reconciliation — the model holds the same objects the store does, so ECHO's own reactivity
already covers them.

## Prior art

- [Graphology](https://graphology.github.io) (TS, tree-shakable, multiple packages for extensions)
- [Graphlib](https://github.com/dagrejs/graphlib) (mature, extensive)
- [tiny-graph](https://github.com/avoidwork/tiny-graph)
- levelgraph (LevelDB)
- oxigraph (Rust WASM)
- Neo4J

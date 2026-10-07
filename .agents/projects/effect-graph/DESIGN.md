# effect-graph — Rebuild `@dxos/graph` on `effect/Graph`

## Goal

Replace the hand-rolled graph internals of `@dxos/graph` with Effect's `Graph` module as the
canonical in-memory representation, while keeping everything the package is actually valued for:

1. **ECHO schemas** — `Graph.Node` / `Graph.Edge` / `Graph.Graph` stay the storage/wire format.
2. **Granular reactivity** — per-node, per-edge, and subgraph subscriptions via Effect Atoms.
3. **`effect/Graph` core** — the algorithm library (topo, dfs/bfs, dijkstra, SCC, neighborhood,
   toMermaid, …) on the default representation instead of hand-rolled Kahn's/DFS.

Evaluated 2026-08-13 against `effect@4.0.0-rc.108`. Note `Graph` is `@since 3.18.0` — the Effect 4
migration did not gate this; it was a fit question, answered by the spikes below.

## Why not a direct swap (evaluation findings)

`effect/Graph` alone cannot replace the package because it solves a different problem:

- **Not serializable.** Opaque `TypeId`-branded class over `Map`s; `JSON.stringify` yields
  `{_id:"Graph", nodeCount, edgeCount, type}`. No Schema, no codec. `CanvasBoard.layout` and
  `ComputeGraph.graph` persist the schema shape in Automerge — a swap without a codec means a data
  migration and still no wire format.
- **Index-keyed, not id-keyed.** `NodeIndex = number`, assigned by insertion; `findNode` is an O(n)
  predicate scan returning `Option<NodeIndex>`. DXOS keys by string id everywhere. Indices are
  monotonic (never reused after removal) so they are session-stable, but must never persist.
- **Copy-on-write per mutation scope.** `beginMutation` clones both `Map`s and deep-copies every
  adjacency array — O(V+E) per scope. Per-element scopes are a ~1900× cliff vs array push.
- **No reactivity.** Inert data; the Atom layer is ours.

## Architecture

```
@dxos/graph
├─ schema layer      Graph.Node / Edge / Graph (unchanged Effect Schemas — ECHO/wire format)
├─ core              effect/Graph canonical value + id↔index bimaps (nodes AND edges) + codec
├─ reactivity        keepAlive root atom + Atom.family node/edge/subgraph views + hot-data atoms
├─ echo adapter      dual-write model for graphs living in Automerge docs
└─ algorithms        id-translated topo/dfs/dijkstra/scc/neighborhood/toMermaid pass-throughs
```

### Core (REVISED: long-lived mutable working graph)

The ECHO-analogous split — a live mutable working copy with `Obj.update`-style batches, immutable
snapshots on demand — measured strictly better than the COW-per-scope design and is the adopted
core. Key enablers, verified against `effect/Graph` source: `mutate()` clones the ENTIRE graph
**twice** (`beginMutation` and `endMutation` each full-clone both Maps + both adjacency sets), and
every read/algorithm API accepts `Graph | MutableGraph` — so the hot path never needs an
immutable value at all.

- The model owns **one long-lived `MutableGraph`** (via `beginMutation`, never ended in the hot
  path) + id↔index bimaps. Writes are direct O(1) graph ops.
- `model.batch(fn)` = mutations + **one version-atom bump** (the `Obj.update` analog). Derived
  atoms depend on the version atom and read the mutable graph directly.
- **Granular reactivity does not need root immutability** — equality cutoffs operate on derived
  _outputs_ (arrays of node-data refs), which stay correct as long as `updateNode` replaces the
  data object (model-enforced discipline). Verified: touched-collection subscribers fire,
  untouched stay silent.
- Algorithms (`dijkstra`, `dfs`, `topo`, SCC, …) run directly on the `MutableGraph`.
- `model.snapshot()` produces an immutable `Graph` **only on request** (codec, persistence,
  history), cached per version. Today that costs `endMutation` + re-`beginMutation` (two clones,
  ~11ms @7k — `endMutation` kills the handle); worth an upstream ask for a single-clone
  `Graph.snapshot` API. Serialization can also bypass it: the codec iterates the mutable directly.
- Discipline the model owns: version bump exactly once per batch; the mutable graph never escapes
  the model; graph-level `Equal` unused (by-reference on mutables); node-data replaced, never
  field-mutated, when reactive.
- **Why a version atom at all**: the mutable graph is plain data the atom registry cannot observe
  — derived views need a writable atom in their dependency chain as the invalidation signal. The
  version atom is that doorbell, not data versioning.
- **Granular-invalidation refinement (optional lever)**: the model knows which ids each batch
  touches, so it can bump a per-id version family (+ one structural tick for edge changes) inside
  a single `Atom.batch` instead of one global tick; `nodeAtom(id)` then depends on
  `versionAtom(id)` and untouched node atoms skip even the recompute. Not needed at current scale
  (recomputes ~1µs; 0.12ms for 200 mounted views) — reach for it if mounted-view counts grow into
  the thousands.
- Codec: id-keyed `encode()`/`decode()` between the Effect graph and the schema `{nodes, edges}`
  shape. Round-trip proven in spike. Persisted data is byte-identical to today — **no migration**.
- Algorithms exposed id-translated (`model.topo(): string[]`, etc.). `topo` throws `GraphError` on
  cycles — guard with `isAcyclic` where a soft failure is needed.

### Granular reactivity (the key insight)

COW clones the index Maps but **not node data values** — untouched nodes keep reference identity
across snapshots, and Atom's default equality is `Object.is`. So granularity is derived atoms with
equality cutoffs, no per-node stores to sync:

```ts
const nodeAtom = Atom.family((id: string) => Atom.make((get) => lookupNode(get(rootAtom), id))); // ref cutoff
const neighborhoodAtom = Atom.family((id: string) =>
  Atom.make((get) => neighborIds(get(rootAtom), id)).pipe(Atom.withEquality(arrayEq)),
);
```

`Atom.family` memoizes behind `WeakRef`/`FinalizationRegistry` — unsubscribed atoms are GC'd.
Subgraph subscription is the same pattern at any grain (k-hop neighborhood, filtered sets,
components) via `withEquality` on the projection.

**Hybrid for hot paths:** 60fps churn (drag positions) does not route through the graph — volatile
data lives in per-node _writable_ family atoms; the graph atom holds structure only. `Atom.batch`
coalesces multi-node frames.

**Reactivity split for ECHO-backed graphs:** node `data` is a live ECHO proxy whose reference never
changes — field edits do NOT fire node atoms; ECHO's own signal reactivity covers them (and UIs
already use it). Node atoms fire on add/remove/replace; document, don't solve.

### ECHO adapter (dual-write; replaces the `_change` hook)

ECHO/Automerge stays source of truth for persistence; the Effect graph is the canonical in-memory
index. Local structural mutations already funnel through the model API → apply each op twice: a
minimal Automerge op (never rewrite whole arrays — keeps history clean and merges sane) and the
same op into the atom. Remote/peer changes: subscribe to the ECHO object, debounce, rebuild
(12ms @ 2000 nodes). Care points: undo, concurrent edits — deserves dedicated tests.

## Measurements (effect 4.0.0-rc.108, node 22, warmed, best-of-3)

| Operation                                   | 100 nodes |     500 |   2000 |  5000 |
| ------------------------------------------- | --------: | ------: | -----: | ----: |
| structural mutation, one batched COW scope  |   0.074ms | 0.392ms | 1.71ms | 7.2ms |
| mutation + notify, 100 mounted node atoms   |         — |       — |  2.8ms |     — |
| mutation + notify, 1000 mounted node atoms  |         — |       — |  3.8ms |     — |
| full rebuild/decode (remote-sync case)      |         — |       — | 12.3ms |     — |
| `topo` whole graph                          |         — |       — |  8.6ms |     — |
| per-node writable set (hybrid hot path)     |   ~1.25µs |         |        |       |
| 5-node `Atom.batch` drag frame              |    ~8.7µs |         |        |       |
| plain array push (today's model, reference) |  ~0.001ms |         |        |       |

Real graph sizes: canvas boards 10s–100s, activation rounds ~100–300, explorer space graphs 1000s
(already rebuilt wholesale today). Bundle: tree-shaken `effect/Graph` subset ~20KB min (~5KB today).

### Perf invariants (architectural rules, wrapper-enforced)

1. One `batch()` (version bump) per user action — never per element. (Under the superseded
   COW-per-scope design this was the 1900× cliff; with the long-lived mutable it still bounds
   index rebuilds and notification churn.)
2. Hot-path data (positions) in per-node writable atoms, not graph node data.
3. Indices never persisted — codec and bimaps are id-keyed; indices stay internal.

## Footguns (both found empirically; the wrapper owns them)

1. **Unobserved atoms are disposed.** Registry sweeps nodes with no listeners/children; the value
   silently resets to initial on next read. Source-of-truth atoms get `Atom.keepAlive` inside the
   model — never left to callers.
2. **`registry.subscribe` without `{immediate: true}` never builds the node** — the derived read
   never runs, no dependency edge is created, the listener never fires. (This is the origin of the
   "prime the atom by reading before subscribing" comments in the current `GraphModel.ts`.)
   `model.subscribe`/atom accessors mount internally.
3. Notification is synchronous per `registry.set` once mounted; use `Atom.batch` to coalesce.
4. In-place node-data mutation works (data held by reference) but defeats `Graph.Equal`/ref
   cutoffs — allowed only as a documented escape hatch, never for reactive data.

## Consumer migration map (38 import sites, 8 packages)

| Consumer                                                                                      | Today                             | Plan                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| conductor `ComputeNode/Edge`, canvas `Shape`/`Connection`, `CanvasBoard.layout`, Notebook ref | schema layer                      | unchanged                                                                                                                            |
| ~22 type-only sites (d3 projectors, `GraphAdapter`, testing data)                             | `{nodes, edges}` arrays           | model exposes cached snapshot `.nodes`/`.edges` (codec encode per version)                                                           |
| `activation-graph` (app-framework)                                                            | hand-rolled Kahn's + cycle DFS    | port; waves via `topo`+`predecessors` levels; cycle path stays hand-rolled over SCC (ordered, capability-annotated — spike-verified) |
| `useRope`, `createGraph` (sdk/schema), `SpaceGraphModel`, `react-ui-graph`                    | build/rebuild + subscribe         | clean port; `traverse` → `dfs`; rebuild → one `set`                                                                                  |
| `ComputeGraphModel` (conductor), `CanvasGraphModel` (canvas-editor)                           | wrap live ECHO arrays + `_change` | ECHO adapter (Phase 3)                                                                                                               |
| `SelectionModel`                                                                              | atom-based, not graph-related     | untouched (possible later split)                                                                                                     |

`AbstractGraphModel`/`AbstractBuilder` subclass hierarchy is replaced by the new core's extension
surface; all call sites are in-repo — migrate in the same change, **no compat shims** (repo rule).

## Decisions

- D1: Keep the schema layer and persisted shape exactly as-is; codec bridges. No data migration.
- D2: Effect graph value is canonical in-memory; ECHO canonical for persistence (dual-write).
- D3: Granularity via derived atoms + equality cutoffs over one root atom — not atom-per-node as
  source of truth. Hybrid writable family atoms only for volatile hot-path data.
- D4: Model owns the registry interaction (keepAlive, immediate-mount); raw atoms exposed for
  `@effect/atom-react` as an advanced surface.
- D5: `effect/Graph` is `devDependencies`+`peerDependencies` `catalog:` in graph pkg (matches today).

## Open questions

- O1: React surface — expose atoms for `@effect/atom-react` `useAtomValue`, callback `subscribe`,
  or both (leaning both; atoms are the primitive, callbacks the compatibility path).
- O2: Where the hot-data (position) atom layer lives — in `@dxos/graph` or in the canvas editor
  (leaning consumer-side; the core stays structure-only).
- O3: `SelectionModel` split into its own package/module — orthogonal, decide at Phase 4.
- O4: effect 4 rc pin — `unstable/reactivity` API drift risk until 4.0 stable; the wrapper isolates
  the blast radius to one package.
- O5 (Phase 5): RESOLVED by spike (2026-08-13) — see §Generic evaluation algorithms.
- O6 (Phase 6): RESOLVED by spike (2026-08-13) — see §app-graph reconciliation. Verdict: share
  views + algorithms (projection), not storage.

## Generic evaluation algorithms (Phase 5 spike findings)

Both of activation-graph's hand-rolled algorithms generalize cleanly to graph-level functions in
the `dijkstra` family — validated against the real `activation-graph.test.ts` fixtures (hard-only
waves, hard+soft layering, cyclic → none, ordered annotated cycle, parallel edges):

- **`topoLevels(graph, {includeEdge?})` → `Option<NodeIndex[][]>`** — layered topological sort
  (Kahn levels; NetworkX: `topological_generations`): level N = nodes whose longest included-edge
  incoming path has length N; `Option.none` on cycle. Effect's `topo` uses the same Kahn
  machinery but flattens to a linear order and THROWS on cycles — `topoLevels` subsumes
  activation's need. ~35 lines; 4.4ms over 5000 nodes / 14.7k edges (activation rounds are
  ~100–300 modules → sub-0.1ms). Named to align with Effect's `topo` rather than the algorithm's
  inventor or activation-graph's "wave" domain term — "wave" stays app-framework vocabulary for
  what it does with a level (concurrent activation batch).
- **`findCycle(graph, {includeEdge?})` → `Array<{node, edge, edgeIndex}>`** — one cycle IN ORDER
  with edge annotations (the diagnostic `findCyclePath` needs; SCC gives only unordered
  membership, and Effect's `topo` throws `GraphError` with no witness). ~40 lines.
- **`includeEdge` predicate** solves read-time edge-kind filtering — no per-kind graph builds, no
  mutation-based `filterEdges`.

Net effect on activation-graph: `computeActivationWaves` + `findCyclePath` (~60 lines) reduce to
~10 lines of calls + module mapping; what stays app-framework-specific is only building the graph
from capability declarations. Upstream candidates, in order of strength: `findCycle` (improves
Effect's own cycle-error story — their `topo` currently throws witness-free), then `topoLevels`
(natural `topo` companion, possibly as `topo(graph, {levels: true})`); the `includeEdge` predicate
may be too opinionated for upstream — keep it in our layer if so.

## app-graph reconciliation (Phase 6 spike findings)

`@dxos/app-graph` independently converged on the granular pattern (`Atom.family` per node id,
writable per-node `_edges` family, `keepAlive`, labels; `useNavTreeModel` already derives atoms
over `node()`/`connections()`). The storage designs differ for a _semantic_ reason, not a
historical one:

|                | `@dxos/app-graph`                                                                                     | planned `@dxos/graph` core                            |
| -------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| graph is       | **virtual/lazily materialized** — connectors expand on demand, unbounded                              | **complete data** — canvas/compute docs, serializable |
| storage        | sharded writable family atoms, O(1) writes, **no global node list**                                   | one canonical COW graph value in a root atom          |
| dangling edges | legal (arrival order arbitrary; filtered at read)                                                     | `addEdge` throws on missing endpoint                  |
| removal        | tombstone (`Option.none`, atom persists, pending expands resurrect)                                   | real removal                                          |
| edges          | relation-typed (kind+direction), per-node **ordered** adjacency, inverse lists maintained, no payload | edge objects with id + data payload                   |
| algorithms     | hand-rolled `traverse` (visitor DFS), `getPath` (DFS scan), `waitForPath` (**500ms poll**), `toJSON`  | full `effect/Graph` library                           |

**Decision (REVISED, superseding the first-pass verdict): Option A — consolidate app-graph's
storage onto the canonical core.** The initial rejection over-weighted the storage deltas. The
key realization (user challenge, then spike-verified): the _virtual_ part of app-graph is the
**builder** (expansion protocol, connectors) — a layer in either design. The core app graph —
everything expanded so far — is a legitimate complete graph, and the storage deltas unify:

- **Placeholder = tombstone = `Option.none`.** With node values of `Option<NodeData>`, a dangling
  edge targets an auto-created placeholder node (`ensure` on `addEdge`, ~5 lines) — exactly
  app-graph's existing read-time-filtered representation. Soft remove sets `none` (edges survive,
  resurrection works). Both "blockers" are one concept the current code already has.
- **Relation + ordering = edge data** `{relation, order}`; `sortEdges` = edge-data updates in one
  scope. Inverse adjacency lists (a manual-consistency liability today) come free as
  `predecessors`.

Spike-verified on the canonical core (all app-graph read/write semantics): placeholder filtering
in `connections()`, fire-on-materialize, soft remove + resurrection, equality-cut on unrelated
writes — with **surgical notifications** (only the touched collection's subscribers fire).

Read-path structure matters: a naive `connections()` scanning all edges per atom costs O(E)×K
(21ms/flush at 200 mounted atoms). The layered design fixes it — one derived **adjacency-index
atom** (single O(E) pass per flush: `source|relation` → sorted edge list), `connections()` reads
it at O(deg):

Measured A/B/C vs a faithful replica of today's sharded `GraphImpl` (same tree, same 100 flush
bursts, 200 mounted connections atoms, graph growing 1.9k→6.9k nodes):

|                                  |                                                  today's sharded | canonical COW `mutate` |  **long-lived mutable (adopted)** |
| -------------------------------- | ---------------------------------------------------------------: | ---------------------: | --------------------------------: |
| write: per 50-node batched flush |                                                           3.76ms |                 8.66ms | **1.83ms (2× faster than today)** |
| read: path search @ ~6.9k nodes  | 20.2ms (DFS through atoms; `waitForPath` re-runs it every 500ms) |                  9.0ms |  **9.0ms (reactive, no polling)** |
| explicit immutable snapshot      |                                                              n/a |    free (is the value) |             5.4ms, on demand only |

COW's write cost decomposes as ~65% the double full-graph clone (`beginMutation` + `endMutation`),
~25% the O(E) adjacency-index rebuild, ~1% the actual writes — which is why dropping the clone
wins. (Naive O(E)-per-atom connections reads cost 21ms/flush — the adjacency-index layer is
mandatory in every variant; making it incremental is a further ~1.5ms lever.) Note today's writes
are not O(1) either: `addEdgeImpl` spreads the whole edges record per add — O(deg) on hot
collections, quadratic within a burst. Net for the adopted design: **writes 2× faster than today,
reads 2× faster, polling eliminated.** It buys: algorithms run
directly on the live canonical value (no projection rebuild — the interim Option B paid ~17ms per
flush _while mounted_), `getPath`→`dijkstra` (shortest path; replaces DFS scan), reactive
`pathAtom` (kills `waitForPath`'s 500ms poll), free inverse edges, a serializable/cacheable
expanded graph (`Node.cacheable` finally has a natural target), and one graph model repo-wide.

Consolidated layering:

```
@dxos/graph core     canonical Effect graph + bimaps + codec (generic over node/edge values)
├─ reactivity        granular family views + adjacency-index atom + equality cutoffs
├─ echo adapter      dual-write (Phase 3)
└─ @dxos/app-graph   expansion layer: builder/connectors/flush/URL (unchanged) over
                     N = {id, value: Option<NodeData>}, E = {relation, order}
```

Migration safety: `GraphImpl`'s public API (node/connections/actions/edges atoms, add/remove/
sort, traverse/getPath/toJSON, `onNodeChanged`) is preserved exactly while swapping internals;
graph.test.ts (837 lines) + graph-builder.test.ts (1676 lines) are the net. Builder machinery is
untouched except its two internal reaches (`_node`, `_constructNode`), which the new core exposes
equivalently. Residual risk to watch: flush cost scales O(V+E) with total expanded size — at 10k+
nodes ~15-20ms/flush during startup bursts; mitigations are existing flush batching, the
startup-latency project's tracking, and (worst case) per-workspace graph partitioning.

**C — shared view helpers** stands: family + equality cutoff patterns, keepAlive/immediate-mount
footgun ownership live in the core; app-graph consumes them.

## Spike artifacts

Session scratchpad (ephemeral, cloud sandbox): `proto/probe.mjs` (semantics), `bench3.mjs` (COW
scaling), `spike.mjs` (activation-graph port), `wrapper-spike.mjs` (id-keyed wrapper + codec),
`granular2.mjs` (granular atoms correctness+perf), `hybrid.mjs` (hot-path atoms), `mini/debug/
bisect.mjs` (footgun isolation). Re-create from DESIGN if needed — all <100 lines each.

## Implementation (landed 2026-08-13)

Phases 1-6 are implemented on `claude/replace-dxos-graph-effect-axwnr2`. Deltas from the design
above, all deliberate:

- **One model, one registry.** `ReadonlyGraphModel`/`ReactiveGraphModel` collapsed into
  `AbstractGraphModel`; every model is reactive and constructors take `{ registry, graph, change }`.
- **Node slots carry `Option`** in `@dxos/graph` itself (not only in app-graph), so an edge may
  precede its endpoints in every model. This made the app-graph consolidation a thin layer.
- **Snapshot, not `endMutation`.** `graph`/`nodes`/`edges` encode the schema shape from the
  working graph, memoized per version — the double-clone snapshot API was never needed.
- **Adjacency index** (`outgoing`/`incoming`, rebuilt per version) lives in the core rather than
  app-graph, and `filterEdges` uses it when anchored on an endpoint.
- **Backing stores** use `change` + `sync()` rather than a bespoke adapter: mutations mirror into
  the ECHO arrays with minimal ops, and `sync()` rebuilds only on structural divergence. The React
  containers own the `Obj.subscribe` lifecycle, keeping `@dxos/graph` free of an ECHO dependency.
- **app-graph** keeps its exact public API; `_node`/`_edges` became derived views over the model,
  with relation in `type` and sort position in edge `data.order`, and a per-node set of relation
  keys so an emptied relation still reports `[]` (the old writable-record behavior).
- **Latent bug fixed**: the old `addEdge` duplicate check tested the _node_ index with an _edge_
  id, so colliding parallel-edge ids went unnoticed. Conductor's generated edge ids now include
  the port pair.

Known follow-ups are tracked in TASKS.md; the notable one is `explore`, whose throwaway-registry
isolation no longer holds under a single store (no production callers).

## GraphBuilder split (Phase 7, landed 2026-08-13)

The expansion protocol — extensions contribute nodes when a relation is first read — turned out to be
entirely independent of what the nodes mean. It now lives in `@dxos/graph/GraphBuilder` (589 lines)
and `AppGraphBuilder` (663, from 1094) is a subclass that supplies the app vocabulary.

The engine keeps: the extension registry atom, the per-`(node, relation)` connector atom family, the
expansion subscriptions, id qualification, provenance, sibling ordering by `properties.position`, and
the coalesced dirty-flush. It carries relations as opaque encoded keys and never interprets them.

Five seams carry everything that is layer-specific:

| Seam                      | What plugs in                                                         | App layer supplies                            |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `store(hooks, registry)`  | the graph itself, plus `onExpand`/`onRemoveNode`                      | an adapter over app-graph's `Graph`           |
| `relationKey(rel)`        | relation encoding and the default relation                            | `Graph.relationKey(rel ?? 'child')`           |
| `inline`                  | how inline descendants are read/rewritten; `owned` narrows provenance | `nodes` + `actions`; only `nodes` are `owned` |
| `decorateNode(node, ext)` | per-layer metadata, from the extension's opaque `meta`                | stamps the URL segment from the `UrlBinding`  |
| `unchanged(prev, next)`   | flush short-circuit                                                   | `nodeArgsUnchanged`                           |

`_schedule`/`_yield`/`_onExpand` are overridable: app-graph routes flushes through its yielding
scheduler and expands the `action` relation alongside `child` (a backwards-compat behavior).

Two things fell out of the split rather than being planned:

- **`Store.node` must cut off at the node's own value.** The builder's per-`(node, relation)` wrapper
  atom always reads the source node (unchanged from the pre-refactor code — it is the "source does not
  exist, produce nothing" short-circuit), so a store whose node view notifies on writes to unrelated
  nodes both cascades expansion across the graph and makes each flush invalidate every connector,
  which re-flushes: an infinite loop. This is a property of the store, not the engine: it showed up
  only in a first-cut test store with one global version atom, and `GraphModel`'s per-node cutoffs
  make it unreachable. The test store was replaced by `ModelGraphBuilder` over a real `GraphModel`,
  and the granularity is now asserted directly.
- **`GraphNodeMatcher`'s basic matchers erased their input type** (`whenRoot: (node: GraphNode.Any) =>
Option<GraphNode.Any>`), so composing them with app-level matchers widened the match result and
  broke `createExtension`'s inference. They are node-type-preserving now.

Node-id composition moved to `GraphNode` (`PathSeparator`, `qualifyId`, `validateSegmentId`,
`parentId`, `segmentId`) — it sits with `RootId`, and both layers were otherwise duplicating `'/'`.

## Before/after benchmarks (Phase 8)

`packages/sdk/app-graph/src/bench.test.ts`, kept in-repo behind `describe.skip`. The "before" column
was taken by extracting `graph.ts`/`graph-builder.ts`/`node.ts`/`util.ts`/`node-matcher.ts` from
`4ed7683d` (the last commit before this work) into a scratch directory inside the package, so the
same benchmark file ran against both trees with only its import block rewritten.

Best-of-3, node 22, cloud sandbox.

**The first table below was taken on a loaded box** (a 56-package test sweep was running), which
inflated every absolute number and produced spurious gaps. It is kept only because it is what caught
the removal regression. The table after it is the one to read: paired before/after rounds, run
back-to-back on an idle box.

| operation (loaded box, indicative only) |      before | after split | after removal fix |
| --------------------------------------- | ----------: | ----------: | ----------------: |
| expand 1000 nodes                       |      618 ms |      682 ms |            572 ms |
| 50 connector updates @ 1000 nodes       |     1202 ms |     1385 ms |           1354 ms |
| 50 updates @ 200 mounted atoms          |     1098 ms |     1701 ms |           1457 ms |
| traverse 1000 nodes                     |     2.05 ms |     7.91 ms |           2.50 ms |
| **remove 1000 nodes**                   | **17.3 ms** |  **830 ms** |       **21.5 ms** |

### Paired result on an idle box (the number that counts)

Two alternating before/after rounds, after the optimization pass below **and** after merging
`origin/main`, which had independently landed a gate on `Atom.withLabel` (see attribution note).

| operation                         |  before |     after |              |
| --------------------------------- | ------: | --------: | ------------ |
| expand 1000 nodes                 |  513 ms | **42 ms** | 12× faster   |
| expand 100x10 tree                |  668 ms | **40 ms** | 16× faster   |
| 50 connector updates @ 1000 nodes |  895 ms |    847 ms | 1.06× faster |
| 50 updates @ 200 mounted atoms    |  946 ms |    854 ms | 1.11× faster |
| read `connections()` x1000        | 0.89 ms |   0.86 ms | parity       |
| read `node()` x1000               | 0.37 ms |   0.27 ms | parity       |
| `getNode()` x1000                 | 0.35 ms |   0.36 ms | parity       |
| traverse 1000 nodes               | 3.35 ms |   3.34 ms | parity       |
| `getPath` root → leaf             | 2.38 ms |   2.57 ms | parity       |
| remove 1000 nodes                 | 15.5 ms |    5.4 ms | 2.9× faster  |

**Attribution.** Most of the expansion win is NOT this refactor. `Atom.withLabel` captures and formats
a stack trace on every call, and both trees label an atom per node, per connection key and per
extension — so expanding 1000 nodes cost ~500 ms of stack captures. `origin/main` gated labels behind
`import.meta.env.DEV && VITE_ATOM_LABELS` (#12562); the pre-refactor baseline predates that gate and
still pays it, and would see the same win if it were applied there. Read the table as "the tree we
ship beats the tree we replaced", not as a claim about the consolidation alone. The consolidation's
own contribution is the pass below, which moved it from behind to parity-or-better before the merge:
expansion 1.5×, everything else at parity.

An intermediate paired run, pre-merge, is the honest measure of the refactor in isolation:
expand 512→341 ms, tree 675→458 ms, updates and reads at parity, removal 17.2→22.0 ms.

### Reconciling this with the Phase-6 spike

The spike measured **storage in isolation** — 50 node/edge writes against a replica of the sharded
`GraphImpl` vs the new model — and 1.83 ms vs 3.76 ms still holds for that. It is not the number a
consumer feels. End-to-end, a flush also runs the connector, qualifies 1000 ids, decorates, records
provenance, diffs against the previous args, and drives the app-graph edge encoding; storage is a
small share of it. The storage win was real and never in question — it was simply not sufficient on
its own, which is what the end-to-end benchmark exposed.

### The removal regression (found, diagnosed, fixed)

Dropping a connector's whole node set was **48× slower** after the consolidation. The path is
`_applyConnectorUpdate` → `Graph.removeEdges(..., removeOrphans: true)` → `removeEdgeImpl` per edge,
and the orphan check read `_edges(source)`/`_edges(target)` through the registry. On the old sharded
storage that was an O(1) read of a stored record. On the consolidated core `_edges` is a derived view
over `model.outgoing`/`incoming`, which materializes the adjacency index — and the index is keyed on
the version atom, which the preceding edge removal just bumped. So every iteration rebuilt the whole
O(E) index: 1000 removals × 1000 edges.

Two changes, both in the model rather than the call site:

1. **An endpoint→edge-id index** (`#incident`) maintained alongside `#edgeIndex` in `addEdge`,
   `#detachEdge` and `#load`. `#incidentEdges` was scanning every edge in the graph to find a node's
   own; it is now O(deg). (This alone did not move the benchmark — the adjacency rebuild dominated —
   but it removes the other quadratic on the same path.)
2. **`model.hasEdges(id)`**, answered from that index, and the orphan check routed through it. The
   check only ever needed a boolean; reading the full edge record to compute one was what dragged the
   adjacency index in.

Note the first fix was the one I expected to work and did not. The measurement, not the reasoning,
identified the adjacency rebuild.

### The optimization pass (CPU profiles, not reasoning)

Four findings, each from a `--cpu-prof` of the mounted-update path rather than from reading code:

1. **The adjacency index was rebuilt off the encoded snapshot** (`#encode`, 7.6% + much of the GC).
   `#adjacency()` iterated `this.edges`, which goes through the memoized schema encoder — so every
   version bump re-materialized the whole graph as node _and_ edge arrays just to walk its edges.
   Replaced the version-keyed cache with adjacency maintained incrementally in `addEdge`/
   `#detachEdge`/`#load`, keyed by edge id in insertion-ordered `Map`s (order carries the sort;
   `Map` keeps removal O(1), where arrays made a bulk removal quadratic again).
2. **`addEdgeImpl` built the source's entire edge record per edge** to test membership — quadratic on
   a wide fan-out. The check was redundant: `_setEdge` already dedupes by edge id in O(1).
3. **Two `includes` scans inside filters** — `sortEdgesImpl` and the builder's `_applyConnectorUpdate`
   — both quadratic in the sibling count. Now `Set` membership. These predate the refactor; the old
   implementation paid them too.
4. **A per-edge `log` call** on the new `addEdgeImpl` path: building the entry cost more than the
   write it described.

One change was tried and reverted: routing a whole flush through a single `model.batch` so it bumps
the version once. It measured slower, and worse, it is unsafe — `sortEdgesImpl` reads the
version-keyed `_edges` view _inside_ the flush, so deferring the bump feeds it stale state.

### Still open

Removal is ~1.12× slower than pre-refactor (15.5 ms → 17.4 ms for 1000 nodes; ~2 ms absolute). The
`Atom.withLabel` cost that profiling pointed at is now gated (merged from main), which closed most of
the earlier 1.28× gap; what remains is the structural work `EffectGraph.removeNode` does that a
tombstone write to a sharded atom did not. Tracked in TASKS.md, low priority at this magnitude.

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

### Core

- Source of truth: `Atom.Writable<G.DirectedGraph<Node, Edge>>` with **`Atom.keepAlive`** (see
  Footguns). id↔index bimaps for nodes and edges maintained by the model; all mutation goes
  through `model.mutate(fn)` — one COW scope per user action, never per element.
- Codec: id-keyed `encode()`/`decode()` between the Effect graph and the schema `{nodes, edges}`
  shape. Round-trip proven in spike. Persisted data is byte-identical to today — **no migration**.
- Algorithms exposed id-translated (`model.topo(): string[]`, etc.). `topo` throws `GraphError` on
  cycles — guard with `isAcyclic` where a soft failure is needed.

### Granular reactivity (the key insight)

COW clones the index Maps but **not node data values** — untouched nodes keep reference identity
across snapshots, and Atom's default equality is `Object.is`. So granularity is derived atoms with
equality cutoffs, no per-node stores to sync:

```ts
const nodeAtom = Atom.family((id: string) =>
  Atom.make((get) => lookupNode(get(rootAtom), id)));                      // ref cutoff
const neighborhoodAtom = Atom.family((id: string) =>
  Atom.make((get) => neighborIds(get(rootAtom), id)).pipe(Atom.withEquality(arrayEq)));
```

`Atom.family` memoizes behind `WeakRef`/`FinalizationRegistry` — unsubscribed atoms are GC'd.
Subgraph subscription is the same pattern at any grain (k-hop neighborhood, filtered sets,
components) via `withEquality` on the projection.

**Hybrid for hot paths:** 60fps churn (drag positions) does not route through the graph — volatile
data lives in per-node *writable* family atoms; the graph atom holds structure only. `Atom.batch`
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

| Operation | 100 nodes | 500 | 2000 | 5000 |
|---|---:|---:|---:|---:|
| structural mutation, one batched COW scope | 0.074ms | 0.392ms | 1.71ms | 7.2ms |
| mutation + notify, 100 mounted node atoms | — | — | 2.8ms | — |
| mutation + notify, 1000 mounted node atoms | — | — | 3.8ms | — |
| full rebuild/decode (remote-sync case) | — | — | 12.3ms | — |
| `topo` whole graph | — | — | 8.6ms | — |
| per-node writable set (hybrid hot path) | ~1.25µs | | | |
| 5-node `Atom.batch` drag frame | ~8.7µs | | | |
| plain array push (today's model, reference) | ~0.001ms | | | |

Real graph sizes: canvas boards 10s–100s, activation rounds ~100–300, explorer space graphs 1000s
(already rebuilt wholesale today). Bundle: tree-shaken `effect/Graph` subset ~20KB min (~5KB today).

### Perf invariants (architectural rules, wrapper-enforced)

1. One `mutate` scope per user action — never per element (the 1900× cliff).
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

| Consumer | Today | Plan |
|---|---|---|
| conductor `ComputeNode/Edge`, canvas `Shape`/`Connection`, `CanvasBoard.layout`, Notebook ref | schema layer | unchanged |
| ~22 type-only sites (d3 projectors, `GraphAdapter`, testing data) | `{nodes, edges}` arrays | model exposes cached snapshot `.nodes`/`.edges` (codec encode per version) |
| `activation-graph` (app-framework) | hand-rolled Kahn's + cycle DFS | port; waves via `topo`+`predecessors` levels; cycle path stays hand-rolled over SCC (ordered, capability-annotated — spike-verified) |
| `useRope`, `createGraph` (sdk/schema), `SpaceGraphModel`, `react-ui-graph` | build/rebuild + subscribe | clean port; `traverse` → `dfs`; rebuild → one `set` |
| `ComputeGraphModel` (conductor), `CanvasGraphModel` (canvas-editor) | wrap live ECHO arrays + `_change` | ECHO adapter (Phase 3) |
| `SelectionModel` | atom-based, not graph-related | untouched (possible later split) |

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
- O5 (Phase 5): does activation-graph's wave/cycle machinery generalize into algorithms that sit
  alongside Effect's — `waves` (layered/Kahn-level topo), ordered edge-annotated cycle extraction,
  and read-time edge-filtered views (Effect's `filterEdges` is a mutation)? Possibly upstreamable
  to Effect itself.
- O6 (Phase 6): RESOLVED by spike (2026-08-13) — see §app-graph reconciliation. Verdict: share
  views + algorithms (projection), not storage.

## app-graph reconciliation (Phase 6 spike findings)

`@dxos/app-graph` independently converged on the granular pattern (`Atom.family` per node id,
writable per-node `_edges` family, `keepAlive`, labels; `useNavTreeModel` already derives atoms
over `node()`/`connections()`). The storage designs differ for a *semantic* reason, not a
historical one:

| | `@dxos/app-graph` | planned `@dxos/graph` core |
|---|---|---|
| graph is | **virtual/lazily materialized** — connectors expand on demand, unbounded | **complete data** — canvas/compute docs, serializable |
| storage | sharded writable family atoms, O(1) writes, **no global node list** | one canonical COW graph value in a root atom |
| dangling edges | legal (arrival order arbitrary; filtered at read) | `addEdge` throws on missing endpoint |
| removal | tombstone (`Option.none`, atom persists, pending expands resurrect) | real removal |
| edges | relation-typed (kind+direction), per-node **ordered** adjacency, inverse lists maintained, no payload | edge objects with id + data payload |
| algorithms | hand-rolled `traverse` (visitor DFS), `getPath` (DFS scan), `waitForPath` (**500ms poll**), `toJSON` | full `effect/Graph` library |

**Decision (REVISED, superseding the first-pass verdict): Option A — consolidate app-graph's
storage onto the canonical core.** The initial rejection over-weighted the storage deltas. The
key realization (user challenge, then spike-verified): the *virtual* part of app-graph is the
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

Measured A/B vs a faithful replica of today's sharded `GraphImpl` (same tree, same 100 flush
bursts, 200 mounted connections atoms, graph growing 1.9k→6.9k nodes):

| | today's sharded | canonical + index |
|---|---:|---:|
| write: per 50-node batched flush | 3.76ms | 8.66ms (**2.3× slower**) |
| read: path search @ ~6.9k nodes | 20.2ms (DFS through atoms; `waitForPath` re-runs it every 500ms) | 9.0ms (**2.2× faster**, reactive) |

(Naive O(E)-per-atom connections reads cost 21ms/flush — the adjacency-index layer is mandatory.)
Note today's writes are not O(1) either: `addEdgeImpl` spreads the whole edges record per add —
O(deg) on hot collections, quadratic within a burst. Net: writes ~2× slower, reads ~2× faster,
polling eliminated; both single-digit ms per batched flush well past realistic navtree scale.
It buys: algorithms run
directly on the live canonical value (no projection rebuild — the interim Option B paid ~17ms per
flush *while mounted*), `getPath`→`dijkstra` (shortest path; replaces DFS scan), reactive
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

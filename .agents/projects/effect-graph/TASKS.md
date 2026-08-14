# effect-graph — Tasks

_Resume: Phases 1-6 IMPLEMENTED and green — `GraphModel` rebuilt on a long-lived Effect
`MutableGraph` + version atom, consumers migrated, `topoLevels`/`findCycle` landed and consumed by
activation-graph. graph 17/17, app-framework 231/231, schema 48/50 (2 skipped), conductor 31/31,
react-ui-graph 19/19 on the consolidated core. Phase 7 (GraphBuilder split) is DONE: the generic
engine lives in `@dxos/graph/GraphBuilder` with `ModelGraphBuilder` as its default specialization,
`AppGraphBuilder` is a subclass, and the suites are split (graph 49/49, app-graph 111/111). The
whole dependent closure is green (2113 passed / 0 failed across 52 suites).
**Phase 8 is the current gate** — repo-wide dependent test sweep + composer e2e + before/after
benchmarks kept as skipped tests — before Phase 9 (node atom release/eviction). Also remaining:
app-graph algorithm upgrades (dijkstra/pathAtom), the `explore` isolation decision, ECHO
undo/concurrency tests, and the upstream proposals._

## Phase 1: Core (`packages/common/graph`)

New model on `effect/Graph`; schema layer untouched.

- [x] **Core model** — long-lived `MutableGraph` working copy (never `endMutation`'d in the hot
      path) + `keepAlive` version atom bumped once per `batch(fn)`; id↔index bimaps for nodes and
      edges; derived atoms/algorithms read the mutable directly; `snapshot()` on demand (cached
      per version). See DESIGN §Core for the discipline list.
- [x] **Codec** — id-keyed `encode()`/`decode()` ↔ schema `{nodes, edges}` shape; round-trip tests
      against today's persisted fixtures (byte-identical, no migration).
- [x] **Granular atoms** (subgraphAtom deferred) — `nodeAtom`/`edgeAtom` via `Atom.family` + equality
      cutoffs; `subscribe` mounts internally (`immediate: true`); snapshot `.nodes`/`.edges`
      getters (cached per version) for array consumers.
- [x] **Algorithms (core set)** — `topoLevels`, `findCycle`, `traverse` on `dfs`.
- [ ] **Algorithms (remainder)** — `dijkstra`, SCC, `neighbors`/`successors`/`predecessors`,
      `toMermaid` id-translated pass-throughs; add as consumers need them.
- [x] **Tests** — port `GraphModel.test.ts`; add granularity tests (untouched-node silence,
      subgraph equality cut, keepAlive persistence, mount-on-subscribe).
- [x] **Docs** — package README covers the layers, the batching/hot-data/index rules and the
      backing-store contract (`change` mirror + `sync`).
- [x] **Adjacency index** — endpoint-keyed edge index rebuilt once per version, behind
      `outgoing`/`incoming`; `filterEdges` uses it when anchored on an endpoint.

## Phase 2: Pure consumers

- [x] **activation-graph** (app-framework) — `computeActivationWaves`/`findCyclePath` now thin
      wrappers over `model.topoLevels`/`model.findCycle`; ~60 lines of hand-rolled Kahn + cycle DFS
      deleted. Tests pass unchanged (5/5).
- [x] **useRope** (canvas-editor) — unchanged call site; `traverse` now runs on `dfs` in core.
- [x] **createGraph / SpaceGraphModel** (sdk/schema) — migrated to the options-bag constructor;
      `SpaceGraphModel` extends `AbstractGraphModel` (ReactiveGraphModel merged into the base).
- [x] **react-ui-graph** — model prop, stories, `TestGraphModel` migrated (19/19).
- [ ] **Standalone topo sorts** — `app-framework/src/helpers.ts` and
      `plugin-script/src/notebook/compute-graph.ts` onto `topo`+`isAcyclic`.
- [x] **Explorer/projector type-only sites** — `graphAtom` preserved on the new core; only
      constructor call sites changed.

## Phase 3: ECHO adapter

- [x] **Dual-write model** — `change` + backing `graph` are kept as a mirror: every structural
      mutation applies to the working graph and, inside the caller's transaction, to the ECHO
      arrays (minimal push/splice ops — never a whole-array rewrite).
- [x] **`reload()`** — rebuilds the working graph from the backing source without mirroring back,
      the entry point for changes that did not originate locally.
- [ ] **Wire remote changes** — `Obj.subscribe` on the ECHO root in `ComputeGraphModel` /
      `CanvasGraphModel` → `reload()`, with a guard so local writes do not re-enter; note node
      _field_ edits need no reload (the working graph stores the live ECHO proxies).
- [ ] **Remote changes** — ECHO subscription → debounced rebuild; tests for peer edits.
- [ ] **ComputeGraphModel** (conductor) — port incl. `createNode`/`createEdge`/subgraph refs.
- [ ] **CanvasGraphModel** (canvas-editor) — port; decide hot-data (position) atom placement (O2).

## Phase 4: Cleanup

- [x] **Retire legacy classes** — `ReadonlyGraphModel` and `ReactiveGraphModel` are gone, along
      with the array-scan internals. `AbstractGraphModel`/`AbstractBuilder` stay as the real base
      classes (subclassed by Compute/Canvas/SpaceGraphModel), not as shims.
- [x] **SelectionModel decision** (O3) — keep in `@dxos/graph`. It is an independent reactive
      selection set with no graph coupling; moving it is churn without a consumer asking for it.
- [x] **Changeset** + `pnpm format`, knip (clean), build/lint/test sweep across every dependent.

## Phase 5: Generalize evaluation algorithms

Whether activation-graph's wave/cycle machinery simplifies into general algorithms that sit
alongside the ones Effect ships (and stops being app-framework-specific code).

- [x] **Spike all three** (2026-08-13, validated against real activation-graph test fixtures —
      see DESIGN §Generic evaluation algorithms): `topoLevels(graph, {includeEdge?})` (Kahn levels,
      `Option.none` on cycle, ~35 lines, 4.4ms @5k nodes); `findCycle(graph, {includeEdge?})`
      (ordered edge-annotated cycle witness, ~40 lines); `includeEdge` predicate replaces
      per-kind graph builds. Activation-graph's algorithm code reduces to ~10 lines of calls.
- [x] **Implemented in `@dxos/graph`** as `model.topoLevels(includeEdge?)` /
      `model.findCycle(includeEdge?)`; activation-graph ported, its tests pass unchanged.
- [ ] **Upstream check** — propose `findCycle` first (Effect's `topo` throws witness-free — this
      improves their error story), then `topoLevels` (natural `topo` companion / `{levels: true}`);
      keep `includeEdge` in our layer if upstream declines the predicate.

## Phase 7: split a generic GraphBuilder from AppGraphBuilder

Measured 2026-08-13: of `AppGraphBuilder.ts`'s 1172 lines, 72 mention URL concepts, 30 the app
node vocabulary and 8 ECHO — the rest is generic expansion machinery.

- [x] **Probe the coupling** — `extension.url` is read in exactly ONE place (the connector flush),
      and `urlGrammar` exists only to feed it. The contract coupling was a single call site.
- [x] **Sever it** — the flush now applies an injected `decorateNode(node, extension)` whose
      default stamps the URL segment. The generic path no longer reads URL data.
- [x] **Moved the machinery down** to `@dxos/graph/GraphBuilder` (503 lines): the `GraphBuilder`
      class (extension registry, connector atom family, expansion subscriptions, provenance, id
      qualification, ordering, dirty-flush) plus `Extension`/`Extensions`/`Connector`/`Props`/
      `TraverseOptions`, `make`/`addExtension`/`removeExtension`/`explore`/`destroy`/`flush`,
      `createConnector`, `flattenExtensions`. `url` generalized to an opaque `meta`.
- [x] **Defined the seams the app layer plugs into**: a `Store` port (node views + node/edge
      writes + `setNode`/`constructNode`, constructed from a factory so it can call back into the
      builder), `relationKey` for relation encoding, an `Inline` accessor for inline descendants
      (`owned` narrows which of them inherit provenance — actions do not), `decorateNode`, and
      `unchanged` for flush short-circuiting. `_schedule`/`_yield`/`_onExpand` are overridable.
- [x] **Kept in `AppGraphBuilder`** (655 lines, down from 1094): `UrlBinding`/`UrlGrammar`/
      `PathResolver`/`urlRepresentation`/`nodeUrlSegment`/`stampUrlSegment`, `BuilderNode`,
      `ActionsExtension`/`ActionGroupsExtension`, `createExtensionRaw`, `createExtension`,
      `createTypeExtension` — a `GraphBuilder` subclass supplying the app store and URL decorator.
- [x] **Node-id path vocabulary** moved to `GraphNode` (`PathSeparator`, `qualifyId`,
      `validateSegmentId`, `parentId`, `segmentId`); app-graph's duplicates deleted and call sites
      updated. `GraphNodeMatcher`'s basic matchers made node-type-preserving (they erased app nodes
      to `GraphNode.Any`, which broke composition with app-level matchers).
- [x] **Ship a default specialization** — `ModelGraphBuilder` builds into `@dxos/graph`'s own
      `GraphModel`: relations are strings in the edge `type`, sibling order in edge `data.order`,
      `children(id, relation)` expands on first read and reads back in order. Replaces the
      hand-rolled test store, so the generic suite exercises a real store on real per-node atoms.
- [x] **Generic tests at the low level** — `GraphBuilder.test.ts` (20 cases) on
      `ModelGraphBuilder`: expansion, qualification (incl. deep inline), extension order, sibling
      position, relation filtering, updates, granularity (an unrelated node must not re-run a
      connector), `unchanged` short-circuit, late registration, removal, inline staleness,
      provenance, decoration, `destroy`, `explore`, `createConnector`, supplied model.
- [x] **Thinned app-graph's suite** — pruned the 9 cases the low-level suite now owns (`updates`,
      `removes`, the whole `path-based ID qualification` block, `explore`, `createConnector`);
      app-graph keeps the URL/action/ECHO/notification-count cases. 111 tests, from 120.

Note on the flush-loop footgun recorded earlier: it was an artifact of the fake store's single global
version atom, not of the engine. `GraphModel`'s per-node cutoffs mean it does not arise for any real
store; the requirement stays documented on `Store.node` and is now covered by a granularity test.

## Phase 8: verification sweep + before/after benchmarks

Gate before Phase 9. Requested 2026-08-13.

- [ ] **Repo-wide dependent test sweep** — every package in the `@dxos/graph` / `@dxos/app-graph`
      dependent closure (41 direct dependents, plus the transitive app/plugin set) must be green,
      not just the packages touched by the refactor.
- [ ] **Composer e2e — 4 `collections.spec.ts` failures, UNATTRIBUTED.** Bisect so far (each cycle =
      rebuild `composer-app:bundle-e2e` + run the spec, ~8 min): - Failure mode: `deleteObject(0)` completes without error — the trace shows the actions menu
      opening, `spacePlugin.deleteObject` found, focused, Enter pressed — and nothing happens. No
      console error. The object count stays where it was. - The one passing spec (`create collection`) is the only one that never opens an item actions
      menu; all four failures do. - CLEARED: the orphan-check change; the incremental adjacency maps; `addEdgeImpl` + the
      `sortEdges` Set membership (reverted together). The whole perf pass is exonerated. - CLEARED: the `origin/main` merge — the pre-merge tip `fd8084de` fails identically. - NOT ESTABLISHED: whether the baseline `4ed7683d` passes _in this sandbox_. `git checkout
    <sha> -- .` leaves renamed/added files behind so the tree does not build, and a worktree is
      forbidden by the repo non-negotiables. Until that runs, "this is our regression" rests on
      the report that e2e is green on main in CI, not on a local A/B. - Next: get a baseline run on a checkout where worktrees are available, then bisect the split
      (`a973a66f`) and the consolidation (`23198521`), which are the only untested regions left. - Graph-level repros written for the cascade, action expansion, position ordering and
      re-order all pass (`expansion.test.ts`) — the bug is not visible at that layer.
- [ ] **Composer e2e** — run the Composer e2e suite; the builder/expansion path is only exercised
      end-to-end there (navtree expansion, URL resolution, deck routing).
- [x] **Benchmarks as skipped tests** — `packages/sdk/app-graph/src/bench.test.ts`, 10 timings
      behind `describe.skip`: wide expansion, two-level tree expansion, repeated connector updates
      (bare and with 200 mounted atoms), `connections`/`node`/`getNode` reads, `traverse`,
      `getPath`, bulk removal. Public API only, so the same file runs against a pre-refactor tree.
- [x] **Before/after numbers** — table in DESIGN.md §Before/after benchmarks, measured against
      `4ed7683d`. Found and fixed a **48× removal regression** (830 ms → 21.5 ms for 1000 nodes):
      the orphan check read `_edges`, whose adjacency read rebuilds an O(E) index per version bump.
      Fixed by an endpoint→edge index in the model plus `hasEdges(id)`.
- [x] **Beat the pre-refactor bar** — paired before/after rounds on an idle box (the earlier table
      was taken while a test sweep saturated the box and is not trustworthy). Expansion is 1.5×
      faster, updates/reads/traverse/`getPath` are at parity, removal is 1.28× slower. Four
      quadratics/allocations removed, all found by CPU profile: the adjacency index rebuilt off the
      schema encoder; `addEdgeImpl` building the source's whole edge record per edge; `includes`
      scans inside filters in `sortEdgesImpl` and `_applyConnectorUpdate` (both predate the
      refactor); a per-edge `log`. See DESIGN §Before/after benchmarks.
- [x] **Merged `origin/main`** (8 commits), taking its `Atom.withLabel` gate and its
      `expand` (Effect, idle-scheduled) / `expandSync` split. The label gate is what the removal
      profile had pointed at, and it turned out to dominate expansion too: 513 ms → 42 ms for 1000
      nodes. `@dxos/graph/GraphBuilder` carries its own copy of the gate, since it cannot import
      app-graph's back across the dependency edge.
- [ ] **Residual removal gap** — 15.5 ms → 17.4 ms for 1000 nodes, ~2 ms. What is left is
      `EffectGraph.removeNode`'s structural work versus a tombstone write. Low priority.
- [ ] **Revisit flush-level batching** — one `model.batch` per flush measured slower AND is unsafe
      today (`sortEdgesImpl` reads the version-keyed `_edges` view mid-flush, so a deferred bump
      feeds it stale state). Would need the flush-internal reads off the version-keyed views first.

## Phase 9: node atom release / eviction

The atom set grows monotonically: `Atom.family` memoizes a node atom per id and `keepAlive` roots
never drop. Nothing releases a subgraph once it has been materialized, so a long session accumulates
every node ever visited. Investigate a release model that is **generic at the `GraphModel` level**
but motivated by, and validated against, the app-graph usage.

- [ ] **Characterize the growth** — measure atom/node/edge counts and retained bytes over a session
      that visits N workspaces; confirm `Atom.family`'s `WeakRef`/`FinalizationRegistry` memoization
      is (or is not) already reclaiming unmounted atoms, and what pins them (keepAlive roots, the
      builder's `_subscriptions`, `_connectorPrevious*` maps, `_nodeExtensions`).
- [ ] **Decide the unit of release** — whole subgraph (a workspace's descendants) vs individual
      nodes. Subgraph release is what the workspace-switch case wants; per-node is what an LRU
      wants. They likely compose: LRU over subgraph roots.
- [ ] **Evaluate the policies**: - _Explicit unload_ — the app tells the graph "workspace X is no longer active"; deterministic,
      but every caller must remember to do it and a switch-back pays full re-expansion. - _LRU over subgraph roots_ — keep the K most recently active workspaces materialized so
      switching back and forth stays instant, evict beyond that. Needs a size/cost metric. - _Reference/mount-driven_ — release what has had no mounted subscriber for T; closest to how
      Atom already thinks, but expansion state (`_expanded`, connector subscriptions) is not
      mount-scoped today.
- [ ] **Design the core API** — something like `model.release(ids)` / `model.evict(policy)` plus a
      retention hook, with the invariants spelled out: what happens to dangling edges, whether a
      released node's atom identity survives (so a re-materialized node does not invalidate holders),
      and how the builder's expansion bookkeeping is unwound in step.
- [ ] **Wire the app-graph layer** — released subgraph ⇒ drop connector subscriptions, expansion
      marks, provenance entries; re-expand lazily on next read.
- [ ] **Tests** — release-then-reread rehydrates identically; no subscriber of a retained node is
      notified by an eviction elsewhere; memory reclaimed (count-based assertions, not bytes).

## Phase 6: app-graph reconciliation

Investigated 2026-08-13 (spike-verified) — full findings in DESIGN.md §app-graph reconciliation.

- [x] **Map the deltas** — virtual/lazily-materialized graph vs complete data; sharded writable
      atoms with no global node list; dangling edges legal; tombstone removal; relation-typed
      ordered adjacency with inverse lists. Delta table in DESIGN.md.
- [x] **Feasibility call (REVISED)** — consolidate: app-graph storage moves onto the canonical
      core (Option A). The virtual part is the _builder_, not the storage; placeholder/tombstone
      unify as `Option<NodeData>` node values; relation+order live in edge data. Spike-verified:
      all read/write semantics (placeholder filter, fire-on-materialize, soft remove/resurrect,
      surgical notifications) + perf 3.1ms per 50-write flush @2k nodes / 11.2ms @7k with 200
      mounted connections atoms, via the layered adjacency-index atom (naive per-atom O(E) reads
      cost 21ms — the index layer is mandatory). Supersedes the earlier projection-only verdict.
- [x] **Rebuild `GraphImpl` on the core** — storage is now one `GraphModel`; `_node`/`_edges`
      became derived views (edges grouped by relation with `order` from edge data, equality-cut on
      the record), and add/remove/sort route through the model. Public API unchanged; all 151
      app-graph tests pass. Core gained `setNode` (upsert), `touch()`, and
      `removeNode(id, {detachEdges})` for the tombstone semantics.
- [ ] **Follow-up: `explore` isolation** — it used a throwaway registry so speculative traversal
      did not pollute the graph; with a single store the nodes it reaches are now materialized.
      No production callers (tests only) — decide whether to restore isolation or drop the option.
- [ ] **Algorithm upgrades in app-graph** — now unblocked (the core model is in place):
      `getPath` → `dijkstra`; `waitForPath` poll → reactive `pathAtom` + equality cutoff;
      `traverse`/`toJSON` → `dfs` walkers.
- [ ] **Watch flush scaling** — with the long-lived-mutable core, per-flush cost is the O(E)
      adjacency-index rebuild (~1.5ms @7k; writes now beat today's sharded design). Lever if it
      pinches: incremental index maintenance; fallback: per-workspace partitioning.
- [ ] **Upstream ask** — propose a single-clone `Graph.snapshot(mutable)` (today: `endMutation`
      kills the handle, so snapshot+continue costs two clones).
- [ ] **Adopt shared view helpers (C)** — swap app-graph's local family/equality patterns onto
      the Phase-1 primitives.

# effect-graph — Tasks

_Resume: Phases 1-10 IMPLEMENTED. PR #12594 is open, out of draft, CI green and mergeable/CLEAN
at `bb555a1b09`. `graph.ts` is dissolved into a single `AppGraph.ts`; the public namespaces are
renamed (`@dxos/app-graph/{Graph,GraphBuilder,Node}` -> `/{AppGraph,AppGraphBuilder,AppGraphNode}`)
and `NodeMatcher` is split by dependency across `@dxos/graph/GraphNodeMatcher` and
`@dxos/app-toolkit/AppNodeMatcher`, with node-id path helpers on `@dxos/graph/GraphNode`. 147
consumer files swept. 1,507 tests pass across the dependent closure, plus conductor 31, schema 51,
react-ui-graph 19. Perf beats the pre-refactor bar across expansion, updates and removal.
**Release policy is an explicit follow-up** (jdw, 2026-08-25): the mechanism lands dormant with no
production caller. Remaining, none of it blocking: the Phase 3 ECHO adapter ports, algorithm
upgrades (dijkstra/pathAtom), the `explore` isolation decision, and the two upstream Effect
proposals._

_Merge hazard, expect it on every update from main: main adds code against the retired app-graph API
in files that merge WITHOUT conflict and fail only at compile time. Three merges in a row hit it.
After any merge, grep for retired subpaths, for `qualifyId` imported by NAME (invisible to a
namespace-shaped sweep, bit twice), and for packages importing `@dxos/graph` without declaring it —
then run `moon run :lint`, not just build and test._

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
- [x] **Composer e2e — RESOLVED. 5/5 `collections.spec.ts`, full suite green (18 passed, 1 flaky
      collaboration retry, 0 failed).** Baseline `4ed7683d` passed 5/5, so the failures were ours;
      bisect landed on `99ac23f1` (neighbourhood/tree consolidation). Three root causes, each pinned
      by a unit test and A/B-verified (`batch.test.ts`); full narrative in the PR body and commits
      `218ea37d`/`d90b0164`/`830cd6f9`. First, a stale read on the write path: a flush batches its
      writes, so reading a node back through its atom mid-flush returned the pre-flush value and
      `addNodeImpl` merged onto it — a second producer of the same node in one flush undid the
      first (the rename bug); write paths now read the model directly. Second, `Atom.batch` strands
      invalidations: nodes invalidated after its rebuild pass are discarded un-rebuilt, leaving
      derived views stale with no notification; the flush now coalesces via `Store.batch` into
      `GraphModel.batch` and every `Atom.batch` left the write path. Third, a subscribed-but-unread
      atom is inert (no parents, so nothing can invalidate it); first patched with a read-after-write
      touch, superseded by Phase 9's per-node pinning. Removal was also profiled: `removeNode` and
      `removeEdge` built a registry-backed model per removed element that every caller discarded, and
      `_onRemoveNode` scanned all subscriptions per node — fixed in `830cd6f9`, with `detachEdge` as
      the no-result form.
- [x] **e2e dead ends, measured — do NOT retry:** removing the flush `Atom.batch` while graph.ts
      still used `Atom.batch` internally (worse, 5/5 fail); dropping the `_edges`/`_connections`
      equality cutoffs (no change); `Atom.setLazy(false)` (fixes nothing pinning does not, 36x
      regression on updates at 200 mounted); `edges: true` in the orphan branch; restoring
      `sortByOrder`; blaming the resolver removal `8ff86d48` (verified dead code).
- [x] **e2e method notes:** `ab.sh <sha>` in this folder A/Bs a historical commit (delete the
      file-set difference before overlaying, or the tree does not build); `@dxos/graph` resolves to
      built `dist` in vitest, so instrumentation there needs `moon run graph:build` first, and
      counters read zero otherwise; `globalThis.composer.graph` is readable from `page.evaluate`
      for live-app measurement, including `registry.getNodes()` states. NEVER write a
      multi-paragraph `- [ ]` entry in this file: oxfmt indents each follow-on paragraph four more
      spaces per format pass (minimal repro verified), so the file never reaches a fixed point and
      CI's format-check fails on it — one paragraph per entry.
- [x] **Composer e2e** — green across all three browsers and both shards on `ce8d3a67c` via
      `gh workflow run check.yml --ref <branch> -f e2e=true`; e2e never runs on a PR, so a dispatch
      is the only way to exercise it. Judge any failure against a SECOND run of the same SHA first:
      one dispatch showed composer 43% slower with six red shards and an identical-SHA rerun came
      back at +2% fully green, so the first was a slow runner, not a regression.
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

**The premise was half wrong, and measuring it changed the design.** `retention.test.ts` records
the characterization as executable assertions.

`Atom.family` memoizes **weakly** (`WeakRef` + `FinalizationRegistry`), and `AtomRegistry` drops a
node once it has no listener and no dependents (`canBeRemoved`), cascading to its parents. So the
atom set does **not** grow with every node visited. Visiting 20 workspaces of 50 items each:

```
registryNodes=128  modelNodes=1021  modelEdges=1020
subs=21  connectorState=42  provenance=1020  expanded=42  relations=1021
```

Atom count tracks **expanded relations** (which the builder subscribes to, and which therefore pin
their node and connector atoms), not nodes. What grows monotonically is the **graph and the
builder's bookkeeping**: every node ever materialized stays in the model, keeps its provenance
entry, and its relation set is remembered. That is what release had to address.

**REVISED (user direction): graph atoms are pinned deliberately, not left to weak reclamation.**
The original app-graph piped `_node`/`_edges` through `Atom.keepAlive` — they were _writable_
storage there, so a dropped atom lost data. The new atoms are views, so a dropped atom loses no
data, but it does lose its registry wiring: a family re-creates the atom on the next call,
subscribers of the old identity are stranded, and a subscribed-but-unread atom has no parents so
nothing can invalidate it (the exact bug class behind the e2e regressions). The intent stands:
every node in the graph keeps its atom alive for as long as the node is in the graph.

`keepAlive` itself cannot express this — the registry has **no per-atom disposal**; `reset()` and
`dispose()` are registry-wide, so a keepAlive atom is unreclaimable and release could never work.
The revocable equivalent is a **mount**: `registry.mount(atom)` pins exactly like keepAlive, and
cancelling it lets the registry drop the atom's node and the family's weak memoization collect the
atom itself. So:

- app-graph `_setNode` pins `_node(id)` per materialized id (`_pin`/`_unpin`, one mount per node);
  `release` cancels the pin. The `_touch` hack this replaces is deleted — a mounted atom is always
  wired, so the subscribed-before-existing case is covered structurally.
- `GraphModel` gains `retainAtoms` (opt-in; a model consumed imperatively should not pay for atoms
  it never reads); `ModelGraphBuilder`'s default model turns it on. Model `release` cancels pins.

**Cost, measured (bench, best of 3).** Pinning `_node` only: expand 27 ms, 50 updates @1000 nodes
375 ms, remove 7-8 ms — all still ahead of the pre-refactor bar. Pinning `_edges` as well doubles
flush costs (expand 67 ms, updates 766 ms): `_edges` reads `version` directly, so every mounted
`_edges` recomputes on every flush, O(nodes) per bump — where `_node` sits behind the model's
per-node equality cutoff and stays quiet. `_edges` is therefore NOT pinned: it is derived, its
recreation is lossless, and consumers reach edges through `_connections`, which retains `_edges`
transitively while mounted. Lever if the hazard ever materializes: per-node edge versioning so
`_edges` stops depending on the global version, then pin it too.

- [x] **Characterize the growth** — numbers above; asserted in `retention.test.ts`.
- [x] **Decide the unit of release** — a caller-chosen id set. The core cannot know what a
      releasable unit is, so it takes ids and `GraphModel.descendants(id, relation)` collects a
      subtree. LRU-over-roots composes on top rather than being baked in.
- [x] **Design the core API** — `GraphModel.release(ids)`, distinct from `removeNode`, which
      _tombstones_: it keeps the slot so a returning node re-resolves dangling edges, which is right
      for deletion and wrong for unloading. Release drops the slot, the id-index entry and the
      adjacency entries, and takes edges reaching into the set with it.
- [x] **Wire the app-graph layer** — `GraphBuilder.release(builder, ids)` tears down expansion
      subscriptions, per-connector diff state and provenance; `Graph.release` additionally forgets
      the expansion marks and relation sets. `Store.release` is the port between them.
- [x] **Tests** — release-then-reread rehydrates identically; a retained subgraph's subscriber is
      not notified by an eviction elsewhere; counts return to their pre-visit baseline.

**The non-obvious correctness requirement, found by test rather than inspection.** Releasing a node
that a _live_ connector still lists leaves that connector's diff state claiming it was already
emitted, so it never re-emits and the node never comes back. `release` therefore tears down any
connector whose previous output intersects the released set — not just connectors rooted at released
ids — via the new `_onReleaseRelation` hook, so the relation re-expands on next read.

- [x] **Scope call — policy is a FOLLOW-UP, not part of #12594** (jdw, 2026-08-25). The mechanism
      lands dormant: `GraphModel.release` / `GraphBuilder.release` / the `Store.release` port are in
      and tested, wired at `GraphBuilder.ts:677`, with no production caller. That is deliberate.
- [ ] **Follow-up: evaluate the policies** — explicit unload, LRU over subgraph roots, and
      mount-driven release are all still open, and the choice is a product decision about
      workspace-switch behaviour rather than a graph one. Note that mount-driven is already
      half-served for _view_ atoms above the graph; with pinning, the graph's own atoms now stay
      until an explicit release, so a policy has real memory to manage.
- [ ] **Follow-up: decide where the policy lives** — `@dxos/graph` (generic, e.g. `evict(policy)`),
      app-graph, or the app/plugin layer that knows what a workspace is. Recommendation on record:
      LRU over workspace roots, in plugin-space, since only that layer knows what a workspace is.

## Phase 10: dissolve the Graph wrapper

Requested 2026-08-14. Done — `graph.ts` no longer exists.

- [x] **Stage 1 — de-boilerplate `graph.ts`** (1490 -> 1013 lines). Every operation lost its curried
      overload and its `*Impl` indirection: seventeen dual-signature dispatch blocks, the parallel
      impl layer, and six atom-accessor mirrors are gone; each op is one direct function taking the
      graph first, and the class methods read their own state. Call-site sweeps (13 sites in
      `graph.test.ts`; `plugin-onboarding`, `plugin-assistant` ConnectorAuthMenu, `react-ui-menu`
      hooks + test generator) rewrote `graph.pipe(Graph.op(...), ...)` chains as sequential direct
      calls. Suites 180 passed, collections e2e 5/5, repo build clean.
- [x] **Stage 2 — retire `graph.ts`.** Split three ways (types / store / ops) to break the ops↔class
      import cycle, then merged back into one `AppGraph.ts`: a single module has no cycle to break,
      and the split cost three files to buy nothing a section divider does not. The subpath and the
      barrel namespace moved with it — `@dxos/app-graph/Graph` → `/AppGraph`, `export * as Graph` →
      `* as AppGraph` — swept across 44 consumer files. `GraphTypeId`'s `Symbol.for` key keeps its
      old string: it is a uniqueness token, and changing it would break cross-version brand checks.
      Repo build clean, 180 app-graph/graph tests, react-ui-menu 29 browser tests, collections e2e
      5/5, knip and lint clean.

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
- [x] **`@dxos/graph` in the boot graph is BY DESIGN** — traced 2026-08-26:
      `main.tsx` → `app-framework` → `plugin-manager` → `activation-scheduler` →
      `activation-graph.ts` → `GraphModel` → `effect/Graph`. The plugin activation scheduler builds
      its ordering graph on `GraphModel`, so the model (and Effect's `Graph` under it) is
      boot-critical and not a leak.
      Only the untree-shaken remainder is waste — see the upstream ask below.
- [ ] **Upstream ask: split `effect/Graph` by subpath** — `Graph.js` is one 131 KB module holding
      the algorithms (`dijkstra`, `astar`, `bellmanFord`, `floydWarshall`, `stronglyConnectedComponents`)
      and the exporters (`toGraphViz`, `toMermaid`) alongside the data structure, so whatever keeps
      the module live keeps all of it. Composer does exactly that: `effect` is an import-map shared
      package and `importMapPlugin` emits its wrapper with `preserveSignature: 'strict'`, which pins
      every export. Measured 2026-08-26 by A/B bundling #12594 against its parent — the boot graph
      pays 23.5 KB where the API `GraphModel` actually calls shakes to 6.7 KB. Standalone rolldown
      1.2.4 and a plain `vite build` 8.2.1 both shake it clean (groups configured or not), so this
      is our packaging and not a rolldown bug; subpaths would cap what a strict wrapper can pin.
- [x] **Cut the app-graph boot edge** — DONE 2026-08-27. ~26 KB of `@dxos/app-graph` (18.5 KB) plus
      the `@dxos/graph/GraphBuilder` (7.6 KB) behind it shipped eagerly. Two edges, not one — the
      trace reports SHORTEST paths only, so the second only appeared after the first was cut.
      (1) `plugin-registry/src/meta.ts` imported `GraphPath` for `pinnedWorkspaceId`, a pure string
      helper. A plugin's `meta.ts` is loaded eagerly at boot for EVERY plugin, so it must stay
      import-light; the helpers moved to `src/paths.ts` + `src/constants.ts`, the shape every other
      plugin uses. (2) The real leak: `app-toolkit/operations/LayoutOperation.ts` reached
      `Translations` through the `../app` BARREL, whose siblings `NotFound`/`GraphPath`/
      `UrlResolution` pull `AppGraph`, `@dxos/echo` and `GraphNode` — while `Translations` itself
      imports nothing but `effect/Schema`. Narrowing that ONE import to `../app/Translations` cut it
      for all 205 `LayoutOperation` consumers at once. Result: app-graph left the static closure and
      the budget went 4.22 → 4.19 MB. Tree-shaking could never have saved it — `@dxos/app-graph` is an
      import-map shared package whose wrapper carries `preserveSignature: 'strict'`, pinning every
      export, while `computeBootPartition` groups it into boot off the parse graph. Next time:
      re-trace after every cut, and fix the barrel import rather than making one consumer lazy.
- [ ] **Adopt shared view helpers (C)** — swap app-graph's local family/equality patterns onto
      the Phase-1 primitives.

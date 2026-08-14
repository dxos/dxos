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
- [ ] **Composer e2e — 4 `collections.spec.ts` failures, localized to TWO separate regressions.**
      Baseline `4ed7683d` passes 5/5 here, so these are ours. Harness: `ab.sh <sha>` in this folder —
      overlaying an old commit without first deleting the file-set difference does not build, which is
      what blocked the baseline run for several cycles.

      A/B at `23198521` (the consolidation) splits the failure: 2 failed, 3 passed.

          1. **Drag / re-order broke at the consolidation** (`re-order collections`, `drag object into
             collection`). Sibling order in app-graph is carried by *edge insertion order* —
             `sortEdgesImpl` removes and re-adds a relation's edges — and `_connections` reads it back
             through `model.neighborsAtom`. **Ordering is verified CORRECT at HEAD** — a direct
             `Graph.sortEdges` round-trip over four siblings returns the requested order twice running —
             so the incremental adjacency (`Map`-keyed, order-preserving) landed later already fixed that
             era's bug, and the drag specs now fail for the same cause as deletion. Treat this as one
             remaining regression, not two.
          **Narrowed to `23198521` … `8ff86d48`.** A/B at `8ff86d48` (resolver removal) fails 4/5, so
          the GraphBuilder split `a86d7718` is EXONERATED. A/B at `23198521` fails only the drag pair, so
          deletion broke in between. Both intermediate commits need build patches to A/B: remove the
          `Graph.initialize` call in `plugin-space/spaces-ready.ts`, and make `GraphNodeMatcher`'s
          `whenRoot`/`whenId`/`whenNodeType` generic in `TNode`.

          **`8ff86d48` is NOT the cause** — checked rather than assumed: `initializeImpl` only added the
          id to `_initialized` and awaited `_onInitialize`, which fired resolver extensions. Nothing
          declared a `resolver:`, so both the function and its call site were genuinely dead. Removing
          them cannot be the behaviour change.

          **CULPRIT: `99ac23f1`** ("generalize neighbourhood and tree views into the core") — A/B fails
          4/5 there, against 2/5 at its parent `23198521`. It is the commit that turns the drag-only
          failure into the full four.

          The visible semantic change in its diff, and the place to start:

          ```diff
          -      for (const edge of sortByOrder(this._model.outgoing(id))) {
          +      for (const edge of this._model.outgoing(id)) {
          -      for (const edge of sortByOrder(this._model.incoming(id))) {
          +      for (const edge of this._model.incoming(id)) {
          ```

          `_edges` stopped ordering by the edge's `data.order`, and `_connections` moved from
          `get(this._edges(id))` + `get(this._node(childId))` per child onto `model.neighborsAtom`, which
          returns raw adjacency order and reads `.data` non-reactively. Two candidate consequences, both
          worth checking directly: (a) `data.order` is now vestigial — sort survives only because
          `sortEdgesImpl` re-inserts edges, verified working at HEAD, so any path that sets `order`
          without re-inserting silently loses its ordering; (b) the per-child `get(this._node(id))`
          dependency is gone, so a child whose app-level `data` changes without a model version bump no
          longer invalidates the parent's connections.

          **Fix attempt 1, reverted — but it narrowed the mechanism.** Restoring `sortByOrder` is
          meaningless at HEAD: `GraphEdge` no longer carries `data` at all, since ordering moved to pure
          insertion order (verified working). So candidate (a) is dead. Restoring the per-child
          `get(this._node(childId))` dependency in `_connections` builds and leaves 119/120 green but
          **fails `graph.test.ts > Graph > connections updates`** — so the two forms genuinely differ in
          notification behaviour, which is direct evidence for candidate (b). The fix is therefore not a
          straight revert: keep the `neighborsAtom` read (it is what makes the view cheap) and work out
          whether the missing per-child dependency, or the notification count that test pins, is the
          correct semantics. Start by reading that test's expectation against both forms.

          **Candidate (b) is now weak too.** `graph.test.ts > Graph > connections updates` asserts that
          updating an existing child fires exactly one update and a no-op re-add fires none. HEAD's
          `neighborsAtom` form passes it; the restored per-child form fails it by *over*-firing (each
          recompute builds a fresh `Option`, so there is no equality cutoff). So HEAD's reactivity is the
          stricter and more correct of the two — the missing dependency is not obviously the bug.

          **What is left, and it is concrete:** at `99ac23f1` the edge type still had `data.order`, so
          dropping `sortByOrder` there genuinely broke ordering at that commit. Ordering was only made
          correct again later, by accident, when the incremental adjacency made insertion order
          authoritative. That accounts for the drag pair. It does NOT yet account for the two deletion
          specs, which is the piece still unexplained — and the next thing to isolate is what else in
          `99ac23f1` reaches the delete path, most likely the `_json`/`toTree` move or the `_edges`
          ordering feeding `removeNodeImpl`'s edge enumeration.

          **FIXED: `delete a collection`** — `_connections` reads each child's own atom again, with an
      equality cutoff on the resolved list. Perf unaffected.

      **`deletion undo` fails at the DELETE step (line 93), not the undo.** Expects 0, gets 3 on a
      three-level nest where the two-level case now passes: the orphan cascade stops at depth 1.
      `removeEdgeImpl`'s orphan branch calls `removeNodesImpl(graph, [endpoint])` with `edges`
      defaulting to **false**. Passing `true` there was TRIED and made no difference (unit tests stay
      green, e2e unchanged), so it is not the cause and was reverted — do not retry it. The depth-1
      cascade observation still stands; the mechanism is elsewhere.

      **ROOT CAUSE OF THE REMAINING THREE (probed 2026-08-14).** A throwaway spec that creates two
      collections and prints the navtree rows shows:

      ```
      BEFORE: ["Click to open\nNew collection"]                      <- two created, one rendered
      AFTER : ["...New collection\nMore actions", "...New collection"]  <- second appears only later
      ```

      **A newly created sibling does not appear in the navtree until a later, unrelated interaction
      forces a refresh.** That is the whole remaining bug, and it explains all three specs without
      needing separate causes: `re-order` and `drag` rename by row index, so with only one row
      rendered the rename lands on the wrong object and `Collection 1` never exists (the drag then
      times out in `boundingBox`, which is the error you see); `deletion undo` counts three nested
      rows that were never all present.

      It is an *addition* notification gap — the mirror of the removal gap already fixed in
      `_connections`. Ruled out at the graph level, each with a direct script (all pass, so do not
      re-test these): emission-order reordering, `properties.label` updates on an existing node,
      inbound `getConnections` (what `getParent` uses), and `sortEdges` round-trips.

      **The graph layer is now fully exonerated.** A mounted-subscriber script (the render path's
      actual usage, `registry.subscribe(graph.connections(root, 'child'))`) is notified correctly when
      a sibling is added: `["root/a"] -> ["root/a","root/b"]`, notifications 1 -> 2. Together with the
      four scripts above, add/remove/reorder/rename all behave correctly at the graph level.
      `NavTreeContainer.tsx` also matches `origin/main` modulo the namespace renames, so the merge
      resolution there is faithful.

      That leaves the layer between the graph and the rendered rows as the only place still changed by
      this branch: `@dxos/app-toolkit`'s `TypeSection` (which builds the collections section and
      returns its objects as inline `nodes`) and `AppNodeMatcher`, both touched by the matcher split
      and the `url` -> `meta` rename. Start there, not in `@dxos/graph`.

      Superseded note: the flush clearly happens (the row shows up eventually), so look at *when
      subscribers are notified* rather than at whether the write lands — the `Atom.batch` wrapping in
      `_scheduleDirtyFlush`, and the equality cutoff added to `_connections`, are the two places a
      notification can be swallowed.

      **THE REMAINING BUG IS RENAME, AND IT IS NOW A 25-SECOND PROBE.** `probe-rename.spec.ts` in this
      folder creates one collection, renames it and prints the row labels. Copy it to
      `packages/apps/composer-app/src/playwright/` and run it — no need for the full spec:

      - baseline `4ed7683d`: `["Click to open\nRenamed A\nMore actions"]`  ✅
      - this branch:          `["Click to open\nNew collection\nMore actions"]`  ❌

      That single failure explains all three remaining specs: `re-order` and `drag` rename two
      collections and then locate them *by name*, so the drag times out in `boundingBox` looking for
      "Collection 1"; `deletion undo` is the one that still needs its own look.

      Established about rename by instrumentation, so do not re-derive: the menu opens, exactly one
      `spacePlugin.renameObject` item is found and focused, Enter opens the popover, the input fills
      (value confirmed `Renamed A`), Enter closes the popover — and **no console output or page error
      is produced at any point**. So the interaction completes end to end and the label never changes.
      Row-render latency is 200-500 ms and is NOT the cause (measured separately).

      **INSTRUMENTED RESULT (do not re-derive).** Logging `AppNode.makeObject`'s label read and the
      builder's flush guard shows, in order, after the rename:

      ```
      DXPROBE makeObject <id> "Renamed A"          <- ECHO write landed, labelAtom fired, connector re-ran
      DXPROBE flush .../collections|childoutbound  <- flush NOT skipped; renamed node reaches the store
      PROBE labels: ["...New collection..."]        <- row still shows the old label
      ```

      So everything above the store is correct: write, subscription, connector re-run, change
      detection, flush. The break is at or below `Graph.addNodes` -> `addNodeImpl` -> `_setNode` ->
      notification, or in the navtree's render. `addNodeImpl` computes `propertiesChanged` as
      `Object.keys(properties).some((key) => existing.properties[key] !== properties[key])` — check
      that first: if the label is compared by reference and the two values are an array vs a string
      it should differ, but if `properties` arrives already merged the check can see no change and
      skip building a new node, leaving `_node(id)` unfired and every downstream cutoff satisfied.

      Read by inspection since then, and both look correct: `addNodeImpl` compares
      `existing.properties[key] !== properties[key]` (old label is an array, new is a string, so it
      differs), builds a fresh node and calls `_setNode` + `onNodeChanged`; `_setNode` calls
      `model.setNode({ id, data })`, a new wrapper every time, so `nodeAtom` -> `_node` ->
      `_connections` should each fire. A standalone script confirms a label change DOES propagate
      through `graph.connections`. So the store path is not obviously at fault either, and the
      render layer (`useNavTreeModel` / `react-ui-list` item memoization) is the last unexamined
      link. Instrument there next: log the label the row component actually receives.

      Superseded: determine whether the write reaches ECHO. Either the popover's submit writes to a stale
      object captured in the action closure, or it writes correctly and the connector's
      `get(Obj.labelAtom(object))` subscription no longer re-runs. Instrumenting
      `AppNode.makeObject`'s label read is the fastest way to tell those apart.

      2. **Deletion broke later** — `delete a collection` and `deletion undo` still pass at the
             consolidation. Bisect region: `99ac23f1` … `a86d7718`. Failure mode: the actions menu opens,
             `spacePlugin.deleteObject` is found, focused and receives Enter, and nothing happens, with no
             console error. NOTE `8ff86d48` does not build in isolation — it removed `Graph.initialize`
             while `plugin-space/spaces-ready.ts` still called it, and that call site was only fixed
             during the main merge; patch that line to A/B across it. `6e3e2cd3` does not build in
             isolation either (the `GraphNodeMatcher` type-erasure defect fixed during the merge), so
             expect to patch one or two files per step when bisecting this region.

          CLEARED, each by revert + rebuild + rerun: the orphan check; the incremental adjacency maps;
          `addEdgeImpl` + the `sortEdges` Set membership; and the `origin/main` merge (the pre-merge tip
          `fd8084de` fails identically). Graph-level repros for the cascade, action expansion, position
          ordering and re-order all pass (`expansion.test.ts`) — neither bug is visible at that layer.

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

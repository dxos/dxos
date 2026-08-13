# effect-graph — Tasks

_Resume: evaluation done (see DESIGN.md — spikes verified codec round-trip, granular atoms, perf
envelope, two Atom footguns). No repo code yet; Phase 1 is next. Branch:
`claude/replace-dxos-graph-effect-axwnr2`._

## Phase 1: Core (`packages/common/graph`)

New model on `effect/Graph`; schema layer untouched.

- [ ] **Core model** — long-lived `MutableGraph` working copy (never `endMutation`'d in the hot
      path) + `keepAlive` version atom bumped once per `batch(fn)`; id↔index bimaps for nodes and
      edges; derived atoms/algorithms read the mutable directly; `snapshot()` on demand (cached
      per version). See DESIGN §Core for the discipline list.
- [ ] **Codec** — id-keyed `encode()`/`decode()` ↔ schema `{nodes, edges}` shape; round-trip tests
      against today's persisted fixtures (byte-identical, no migration).
- [ ] **Granular atoms** — `nodeAtom`/`edgeAtom`/`subgraphAtom` via `Atom.family` + equality
      cutoffs; `subscribe` mounts internally (`immediate: true`); snapshot `.nodes`/`.edges`
      getters (cached per version) for array consumers.
- [ ] **Algorithms** — id-translated pass-throughs: `topo` (+`isAcyclic` guard), `dfs`/`bfs`,
      `neighbors`/`successors`/`predecessors`, SCC, `toMermaid`.
- [ ] **Tests** — port `GraphModel.test.ts`; add granularity tests (untouched-node silence,
      subgraph equality cut, keepAlive persistence, mount-on-subscribe).
- [ ] **Docs** — perf invariants (batch scopes; hot data outside the graph; indices never persist)
      and the ECHO field-edit reactivity split, in package README.

## Phase 2: Pure consumers

- [ ] **activation-graph** (app-framework) — port to core; waves via `topo`+`predecessors` levels;
      keep ordered capability-annotated cycle path (over SCC). Tests must pass unchanged.
- [ ] **useRope** (canvas-editor) — `traverse` → `dfs`.
- [ ] **createGraph / SpaceGraphModel** (sdk/schema) — rebuild → single `set`; subscribe via core.
- [ ] **react-ui-graph** — `Graph.tsx` model prop + stories/testing models.
- [ ] **Standalone topo sorts** — `app-framework/src/helpers.ts` and
      `plugin-script/src/notebook/compute-graph.ts` onto `topo`+`isAcyclic`.
- [ ] **Explorer/projector type-only sites** — switch to snapshot getters where needed.

## Phase 3: ECHO adapter

- [ ] **Dual-write model** — minimal Automerge ops + mirrored graph ops; replaces `_change` hook.
- [ ] **Remote changes** — ECHO subscription → debounced rebuild; tests for peer edits.
- [ ] **ComputeGraphModel** (conductor) — port incl. `createNode`/`createEdge`/subgraph refs.
- [ ] **CanvasGraphModel** (canvas-editor) — port; decide hot-data (position) atom placement (O2).
- [ ] **Semantics tests** — undo, concurrent edits, history-bloat check (no whole-array rewrites).

## Phase 4: Cleanup

- [ ] **Retire** `AbstractGraphModel`/`AbstractBuilder`/array-scan model; no compat shims.
- [ ] **SelectionModel decision** (O3) — keep, move, or split.
- [ ] **Changeset** + final `pnpm format`, knip, full build/test sweep.

## Phase 5: Generalize evaluation algorithms

Whether activation-graph's wave/cycle machinery simplifies into general algorithms that sit
alongside the ones Effect ships (and stops being app-framework-specific code).

- [x] **Spike all three** (2026-08-13, validated against real activation-graph test fixtures —
      see DESIGN §Generic evaluation algorithms): `waves(graph, {includeEdge?})` (Kahn levels,
      `Option.none` on cycle, ~35 lines, 4.4ms @5k nodes); `findCycle(graph, {includeEdge?})`
      (ordered edge-annotated cycle witness, ~40 lines); `includeEdge` predicate replaces
      per-kind graph builds. Activation-graph's algorithm code reduces to ~10 lines of calls.
- [ ] **Implement in `@dxos/graph` algorithms layer** (Phase 1/2 work item) and port
      activation-graph onto them; tests must pass unchanged.
- [ ] **Upstream check** — propose `findCycle` first (Effect's `topo` throws witness-free — this
      improves their error story), then `waves` (natural `topo` companion / `{levels: true}`);
      keep `includeEdge` in our layer if upstream declines the predicate.

## Phase 6: app-graph reconciliation

Investigated 2026-08-13 (spike-verified) — full findings in DESIGN.md §app-graph reconciliation.

- [x] **Map the deltas** — virtual/lazily-materialized graph vs complete data; sharded writable
      atoms with no global node list; dangling edges legal; tombstone removal; relation-typed
      ordered adjacency with inverse lists. Delta table in DESIGN.md.
- [x] **Feasibility call (REVISED)** — consolidate: app-graph storage moves onto the canonical
      core (Option A). The virtual part is the *builder*, not the storage; placeholder/tombstone
      unify as `Option<NodeData>` node values; relation+order live in edge data. Spike-verified:
      all read/write semantics (placeholder filter, fire-on-materialize, soft remove/resurrect,
      surgical notifications) + perf 3.1ms per 50-write flush @2k nodes / 11.2ms @7k with 200
      mounted connections atoms, via the layered adjacency-index atom (naive per-atom O(E) reads
      cost 21ms — the index layer is mandatory). Supersedes the earlier projection-only verdict.
- [ ] **Rebuild `GraphImpl` on the core** — same public API (node/connections/actions/edges
      atoms, add/remove/sort, traverse/getPath/toJSON, `onNodeChanged`); internals: canonical
      graph + `Option<NodeData>` values + `{relation, order}` edge data + adjacency-index atom.
      Existing graph.test.ts + graph-builder.test.ts must pass unchanged. Depends on Phase 1;
      lands separately — app-graph is load-bearing for all plugin UI.
- [ ] **Algorithm upgrades in app-graph** — `getPath` → `dijkstra`; `waitForPath` poll →
      reactive `pathAtom` + equality cutoff; `traverse`/`toJSON` → `dfs` walkers.
- [ ] **Watch flush scaling** — with the long-lived-mutable core, per-flush cost is the O(E)
      adjacency-index rebuild (~1.5ms @7k; writes now beat today's sharded design). Lever if it
      pinches: incremental index maintenance; fallback: per-workspace partitioning.
- [ ] **Upstream ask** — propose a single-clone `Graph.snapshot(mutable)` (today: `endMutation`
      kills the handle, so snapshot+continue costs two clones).
- [ ] **Adopt shared view helpers (C)** — swap app-graph's local family/equality patterns onto
      the Phase-1 primitives.

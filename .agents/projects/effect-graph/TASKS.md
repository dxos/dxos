# effect-graph — Tasks

_Resume: evaluation done (see DESIGN.md — spikes verified codec round-trip, granular atoms, perf
envelope, two Atom footguns). No repo code yet; Phase 1 is next. Branch:
`claude/replace-dxos-graph-effect-axwnr2`._

## Phase 1: Core (`packages/common/graph`)

New model on `effect/Graph`; schema layer untouched.

- [ ] **Core model** — `keepAlive` root atom holding `G.DirectedGraph<Node, Edge>`; id↔index
      bimaps for nodes and edges; all mutation via `mutate(fn)` (one COW scope per action).
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

- [ ] **`waves` (layered topo)** — generic `waves(graph): NodeIndex[][]` (Kahn levels); evaluate
      as a core `@dxos/graph` algorithm; activation-graph consumes it with edge-kind filtering.
- [ ] **Annotated cycle extraction** — generic ordered cycle path with edge data (what
      `findCyclePath` needs, what SCC alone loses); same home.
- [ ] **Edge-kind-filtered views** — evaluate a read-time filtered-graph view (Effect's
      `filterEdges` is a mutation; activation builds per-kind graphs today).
- [ ] **Upstream check** — are `waves`/annotated-cycle worth proposing to Effect itself? If yes,
      file the issue/PR and keep ours as the interim.

## Phase 6: app-graph reconciliation

Investigated 2026-08-13 (spike-verified) — full findings in DESIGN.md §app-graph reconciliation.

- [x] **Map the deltas** — virtual/lazily-materialized graph vs complete data; sharded writable
      atoms with no global node list; dangling edges legal; tombstone removal; relation-typed
      ordered adjacency with inverse lists. Delta table in DESIGN.md.
- [x] **Feasibility call** — share views + algorithms, NOT storage. Option A (canonical-graph
      storage under app-graph) rejected; Option B (derived Effect-Graph projection) + C (shared
      granular-atom view helpers) adopted. Projection spike verified: lazy when unmounted, one
      ~17ms rebuild per batched flush at ~2k nodes, dangling-edge skip + late-materialization,
      reactive `pathAtom` replacing the `waitForPath` 500ms poll.
- [ ] **Implement projection in app-graph** — `idsAtom` in `GraphImpl` (`addNode`/`removeNode`),
      non-keepAlive `snapshotAtom` (`{graph, byId}`), port `traverse`/`getPath`/`toJSON` onto
      `dfs`/`dijkstra` walkers, replace `waitForPath` poll with `pathAtom` + equality cutoff.
      Depends on Phase 1 (shared helpers); lands separately — app-graph is load-bearing for all
      plugin UI.
- [ ] **Adopt shared view helpers (C)** — once Phase 1 extracts them, swap app-graph's local
      family/equality patterns onto the shared primitives where they fit.

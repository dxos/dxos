# ECHO-DB Refactor — Execution Plan

Executes `GOAL.md` (G1–G12, D1). Every stage is one PR, executed by one autonomous agent.

Package names below use the **new** names (`@dxos/echo-client`, `@dxos/echo-host`) from
Stage 2 onward. Moon project ids follow the directory names, so test targets are
`echo-client:test` / `echo-host:test` after the renames (`echo-db:test` /
`echo-pipeline:test` before).

## Agent execution protocol

You are expected to complete your stage **autonomously** — do not ask the user questions;
the only user-blocking decision in this plan is S0, which is resolved before agents start.
If you hit something genuinely undecidable, make the conservative choice, note it in the
PR description, and continue.

1. **Read first**: `GOAL.md` in full, then your stage below, including its dependencies
   and the risk table entries that name your stage. Do not start a stage whose
   dependencies have not merged.
2. **Tests are the spec.** Existing tests may not be modified except where your stage
   explicitly says so (S9 adds tests; S11 deletes the synthetic rebind test; S16/S19/S20
   add tests). If an existing test fails, your change is wrong — fix the change, not the
   test.
3. **Verify continuously, not just at the end.** After each coherent batch of edits, run
   the targeted tests for the files you touched
   (`moon run <project>:test -- path/to/file.test.ts`). Do not accumulate an hour of
   unverified edits.
4. **Verification ladder before opening the PR** (in order):
   1. Your stage's **Verify** block (below) — every command, treated as executable exit
      criteria. Greps included: run them literally.
   2. Package tests: `moon run echo-client:test` and/or `moon run echo-host:test`.
   3. Whole-repo build: `moon exec --on-failure continue --quiet :build`.
   4. Full suite: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`.
   5. Lint + format: `moon run :lint -- --fix` and `pnpm format`.
   6. Cast audit of the diff:
      `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'` —
      justify or remove every new hit (`as const` exempt).
5. **No compat shims.** Every rename/move updates all call sites in the same PR. No
   re-export aliases, no deprecated wrappers (except where a stage explicitly creates a
   designed internal entrypoint).
6. **After push**: check CI with `gh run list --branch <branch> --limit 5 --workflow "Check"`,
   re-check every ~5 minutes, and fix any failure at root cause — including failures that
   look unrelated. `Auth token DEPOT_TOKEN does not exist` is expected noise; ignore it.
7. **PR hygiene**: conventional-commit title (e.g. `refactor(echo-client): …`), PR body
   explains what moved and why, links this plan + stage id, lists any parked questions.
   `git status` must be clean after the final push.

## Topological map

```
Phase 0 — API frontload          Phase 1 — parallel cleanups        Phase 2 — spine (sequential)

S1 rename echo-pipeline→echo-host ──→ S7 unify filter matchers ─────────────────┐
S2 rename echo-db→echo-client ─┬──→ S5 deprecate getObjectById                  │
       (S1 before S2)          ├──→ S6 queue/feed dir cleanup ──→ S19 (feeds)   │
                               ├──→ S8 split echo-handler ───────────┐          │
                               ├──→ S9 characterization tests ──┐    │          │
                               ├──→ S3 DatabaseImpl + kill      │    │          │
                               │     coreDatabase reach-ins ─┬──┤    │          │
                               └──→ S4 hide ObjectCore ──────┤  │    │          │
                                                             │  ▼    ▼          │
                                                             │ S10 merge doc-loader
                                                             │  │   into CoreDatabase
                                                             └──┼───┐
                                                                ▼   ▼
                                                               S11 entity-core merge (1:1 proxy)
                                                                │
                                                               S12 explicit states + shell cores
                                                                │
                                                               S13 direct dep refs + event bus
                                                                │        │
                                          S14 protocol logic → entity-core (G9)
                                                                │        │
                                                               S15 entity-manager finalization
                                                                │        │
Phase 3 — query        S16 two-case aggregation + dedup ◄───────┘        │
(needs S7, S13)         │                                                │
                       S17 shared planner client-side                    │
                        │                                                │
                       S18 shared executor skeleton (stretch)            │
                                                                         ▼
Phase 4 — parallel     S19 feed-manager + database anchor (after S3+S6; merge after S13)
tracks                 S20 proxy prototypes (after S14)
```

**Parallelizable groups:**

- After S2: { S3, S4, S5, S6, S8, S9 } are mutually independent (S3/S4 both touch the
  echo-client barrel — coordinate or land back-to-back). S7 only needs S1.
- The spine S10→S15 is strictly sequential; it is the critical path.
- While the spine runs: S5, S6, S7 results are consumed later; S19 can be developed in
  parallel but should merge after S13 (both touch `hypergraph.ts` and `database.ts`).
- S16→S17→S18 sequential; S20 independent after S14.

---

## Phase 0 — API frontload

All sanctioned surface changes (GOAL.md prime-directive exceptions) land here. After
Phase 0, every remaining stage is invisible outside the two packages.

### S0 — Publishing prerequisite (ops, not a PR)

`@dxos/echo-db` and `@dxos/echo-pipeline` are published (v0.8.x). Repo policy requires
new package names to start `"private": true` until a trusted publisher is configured.
**Decision needed from the user before S1/S2 merge** (single batched ask):

1. Configure trusted publishers for `@dxos/echo-client` and `@dxos/echo-host` so the
   renamed packages publish from day one, or
2. Land the renames `"private": true` and accept a publishing gap for these two names
   (old names simply stop receiving versions).

### S1 — Rename `@dxos/echo-pipeline` → `@dxos/echo-host`

The smaller rename (9 dependent packages) goes first to shake out the mechanics.

- Move `packages/core/echo/echo-pipeline/` → `packages/core/echo/echo-host/`
  (moon project id follows the directory).
- `package.json` `name`, README/docs references, all importer `package.json` deps
  (`workspace:*` entries) and import statements.
- Preserve all export subpaths under the new name (`/filter`, etc. — e.g.
  `@dxos/echo-pipeline/filter` is imported by echo-db's queue code).
- Grep sweep for the literal string `echo-pipeline` repo-wide (configs, docs, CI globs,
  `pnpm-workspace.yaml` — preserve its comments).

**Verify:**

```sh
moon run echo-host:build && moon run echo-host:test
grep -rn "echo-pipeline" packages/ tools/ .github/ .moon/ --include='*' \
  | grep -v node_modules | grep -v dist          # expect: no hits
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S2 — Rename `@dxos/echo-db` → `@dxos/echo-client`

Same mechanics, 58 dependent packages. Depends on S1 only to avoid overlapping
package.json conflicts; content-wise independent.

- Note: the package already exports a class named `EchoClient` — no conflict, the name
  finally matches its home.

**Verify:**

```sh
moon run echo-client:build && moon run echo-client:test
grep -rn "echo-db" packages/ tools/ .github/ .moon/ --include='*' \
  | grep -v node_modules | grep -v dist | grep -v plans/   # expect: no hits
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S3 — `DatabaseImpl` rename + kill `coreDatabase` reach-ins (G1 surface part)

- Rename `EchoDatabaseImpl` → `DatabaseImpl` (and the `EchoDatabase` interface alias if
  still present — callers use `Database.Database` from `@dxos/echo`).
- Add named API methods on `DatabaseImpl` covering every external reach-in:
  - `getSyncState()` / `subscribeToSyncState()` (devtools `SyncStateInfo`, `useStats`,
    cli-util `space-format`)
  - `getAllObjectIds()` (cli-util, observability, serializer)
  - `getNumberOfInlineObjects()` (sdk/client `space-proxy`)
  - `rootChanged` event (e2e proto-guard)
  - migration-scoped repo accessor for `coreDatabase._repo` (sdk/migrations) — or move
    migrations onto the internal entrypoint in S4; pick one home, not both.
- Migrate all consumers (devtools, cli-util, observability,
  functions-runtime-cloudflare, sdk/migrations, sdk/client) in this PR; delete the
  public `coreDatabase` getter. Internal echo-client code keeps using the field
  directly until the spine collapses it.

**Verify:**

```sh
moon run echo-client:test
grep -rn "\.coreDatabase" packages/ --include='*.ts' --include='*.tsx' \
  | grep -v node_modules | grep -v dist \
  | grep -v "packages/core/echo/echo-client/src"   # expect: no hits
grep -rn "EchoDatabaseImpl" packages/ --include='*.ts' | grep -v node_modules | grep -v dist
                                                    # expect: no hits
moon run client:test && moon run migrations:test
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S4 — Hide `ObjectCore` / `getObjectCore` (G12)

- **sheet/sketch serializers** (`plugin-sheet/src/serializer.ts`,
  `plugin-sketch/src/util/serializer.ts`): both only do `getObjectCore(obj).id = id` on
  a freshly created detached object. Replace with id-at-creation: if `Obj.make` doesn't
  already accept an explicit id, add that capability in `@dxos/echo` (small, additive,
  with a unit test in `@dxos/echo`).
- **sdk/migrations `migration-builder.ts`** (imports `ObjectCore`, `DocHandleProxy`,
  `RepoProxy`, `migrateDocument`): create a deliberate internal entrypoint
  `@dxos/echo-client/internal` exporting exactly what migrations need; migrate it.
  This is a designed internal surface, not a compat shim.
- In-repo tests using `getObjectCore` move to the internal/testing entrypoint.
- Remove `ObjectCore`/`getObjectCore` from the public barrel.

**Verify:**

```sh
moon run echo:test && moon run echo-client:test
moon run plugin-sheet:test && moon run plugin-sketch:test && moon run migrations:test
grep -rn "getObjectCore\|ObjectCore" packages/ --include='*.ts' --include='*.tsx' \
  | grep -v node_modules | grep -v dist \
  | grep -v "packages/core/echo/echo-client" \
  | grep -v "echo-client/internal"   # expect: only the sanctioned internal-entrypoint imports
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S5 — Deprecate `getObjectById` (G8)

- `@deprecated` JSDoc on `Database.Database.getObjectById` (`@dxos/echo`) and
  `DatabaseImpl`, pointing at `Query.select(Filter.ids(...))` / Ref resolution.
- Migrate in-repo callers (~28 files — plugins, `Obj.ts`/`ObjAtoms.ts`/`Json.ts`
  internals stay on the internal lookup, external callers move to the query path) where
  mechanical; leave non-mechanical sites on the deprecated method with a TODO.
- Behavior of migrated call sites must be equivalent (sync availability assumptions —
  `getObjectById` returns loaded-only; verify each migrated site tolerates the query
  path's semantics, otherwise leave it with the TODO).

**Verify:**

```sh
moon run echo:test && moon run echo-client:test
# every remaining getObjectById caller outside @dxos/echo internals is either migrated
# or carries a TODO comment:
grep -rn "getObjectById" packages/ --include='*.ts' --include='*.tsx' \
  | grep -v node_modules | grep -v dist
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

---

## Phase 1 — Independent cleanups (parallel)

### S6 — Queue directory cleanup (G4)

- Delete the throwing `MemoryQueue.query` stub (complete it only if a test needs it).
- Internal naming: `feedDXN`-style inconsistencies, file organization; replace the
  `declare query` + static-block prototype assignment in `queue.ts` with a normal
  method.
- Demote API-shaped internals: `QueueImpl` stops looking like a public API class
  (JSDoc cleanup); keep `QueueFactory`/`Queue` exports untouched (public via
  `Space.queues`).
- Do **not** touch: `Space.queues`, `FeedProtocol.QueueService`, `Feed.getQueueUri`
  naming (queue-to-feed phases 5/6).

**Verify:**

```sh
moon run echo-client:test -- src/queue
moon run echo-client:test                       # includes feed.test.ts, testing/queue.test.ts
moon run schema:test                            # sdk/schema uses createFeedServiceLayer
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S7 — Unify filter matching (G6.1)

In `@dxos/echo-host` `src/filter/filter-match.ts`:

- Introduce one normalized record view (id, typename, properties, meta, tags) with two
  cheap adapters: from `EntityStructure` and from `Obj.JSON`.
- Collapse `filterMatchObject` / `filterMatchObjectJSON` into one matcher over the
  normalized view; keep both exported signatures delegating to it (they are the public
  seam used by echo-client and the host executor).
- Add matcher unit tests covering both adapters over the same fixture set (same filter,
  same logical object, both representations → same verdict).

**Verify:**

```sh
moon run echo-host:test
moon run echo-client:test -- src/query/query.test.ts   # the 3k-line spec
moon run echo-client:test
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S8 — Mechanical echo-handler split (G3, file moves only)

Split `echo-handler.ts` (1535 lines) into modules with zero semantic change:
traps (`echo-handler.ts`, shrunk), `array-methods.ts`, `schema-resolution.ts`,
`ref-resolution.ts`, `value-adapter.ts` (validate/encode/wrap), `lifecycle.ts`
(`createObject`, `initEchoReactiveObjectRootProxy`, `destroyObject`),
`devtools.ts` (inspect/formatter/toJSON). Exported names and signatures unchanged.

**Verify:**

```sh
moon run echo-client:test -- src/echo-handler   # all four proxy suites
moon run echo-client:test
wc -l packages/core/echo/echo-client/src/echo-handler/*.ts   # no non-test file > ~500
git diff --stat                                  # moves + imports only; no logic hunks
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S9 — Characterization tests (test-only PR)

Lock in behavior the spine will rewrite, **before** rewriting it. Extend existing suites
(`core-database.test.ts`, `strong-deps-stall.test.ts`, `database.test.ts`,
`load-object.test.ts`) rather than creating new files:

- Loading state transitions: pending → disk probe → unavailable → late network arrival,
  asserted at the `CoreDatabase`/`DatabaseImpl` seam (not the loader's internals — those
  are about to be deleted).
- Strong-dep cycles: two objects strongly depending on each other resolve without
  hanging.
- Doc rebinding: object migrating between automerge docs keeps identity, proxy, and
  subscriptions (document fragmentation path).
- Core:proxy identity: repeated `getObjectById`/query returns the same proxy instance.
- Queue item identity: repeated feed queries return cached instances
  (`_objectCache` semantics).
- Update batching: `_updateEvent` throttling semantics observable via query `changed`
  events.
- Use events/TestClock, no sleeps/polling (repo testing rules).

**Verify:**

```sh
moon run echo-client:test          # all new tests green on CURRENT code
git diff --stat                    # only *.test.ts files changed
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

---

## Phase 2 — The spine (sequential, critical path)

Every spine stage: the S9 characterization tests are the gate — run them after each
batch of edits, not only at the end. They may not be modified.

### S10 — Merge `AutomergeDocumentLoader` into `CoreDatabase` (G1, step 1)

- Inline `AutomergeDocumentLoaderImpl` into `CoreDatabase`; delete the interface.
- `onObjectDocumentLoaded`/`onObjectUnavailable` events become direct private method
  calls; the loader's maps (`_objectDocumentHandles`, `_objectsPendingDocumentLoad`,
  `_currentlyLoadingObjects`) move over verbatim — **no state-machine redesign yet**.
- The one cross-class access (`echo-client.ts`
  `_automergeDocLoader.getObjectDocumentId`) becomes a `CoreDatabase` method.
- Fold `automerge-doc-loader.test.ts` scenarios into `core-database.test.ts`
  (re-expressed at the CoreDatabase seam; this is the sanctioned test change).

**Verify:**

```sh
moon run echo-client:test -- src/core-db/core-database.test.ts src/core-db/strong-deps-stall.test.ts
moon run echo-client:test
test ! -f packages/core/echo/echo-client/src/core-db/automerge-doc-loader.ts  # deleted
moon run client:test
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S11 — Entity-core: merge `ObjectCore` + `ObjectInternals` (G2, step 1)

- New `entity-core.ts`: `ObjectCore` fields/methods + `ObjectInternals` fields
  (`targetsMap`, `linkCache`, `subscriptions`, `rootSchema`, schema-slot cache).
  `symbolInternals` on proxy targets now points at the entity-core.
- Core : root-proxy becomes 1:1, held on the entity-core; delete
  `DatabaseImpl._rootProxies`. Assert single bind of a proxy per core.
- Delete the synthetic `rebind` test (echo-handler.test.ts) — it exercises
  proxy-aliasing we now explicitly forbid (signed off in GOAL.md; the only sanctioned
  test deletion). Document rebinding (`_rebindObjects`) keeps working: handle swap on
  an attached core — covered by the S9 rebinding test.
- Internal name only; the internal entrypoint (S4) keeps exporting the
  `ObjectCore`-shaped surface migrations use.

**Verify:**

```sh
moon run echo-client:test -- src/echo-handler src/core-db
moon run echo-client:test
moon run migrations:test            # internal entrypoint still satisfies migration-builder
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S12 — Explicit lifecycle states + shell cores (G2, step 2)

- Discriminated state on entity-core: `detached | loading | requesting | unavailable |
  attached` (GOAL.md G2), each state carrying exactly its own data (`detached` holds
  the local doc + link refs; `attached` holds docHandle + mountPath).
- Shell cores: `loadObjectCoreById`/doc-link discovery creates the core immediately in
  `loading`; the loader maps from S10 (`_objectsPendingDocumentLoad`,
  `_currentlyLoadingObjects`, `_unavailableObjects`) dissolve into core states.
- Working-set consumers (`allObjectCores`, query working-set scan, `getObjectById`)
  filter on `attached` so observable semantics ("not loaded ⇒ undefined / not in
  results") are unchanged — this is the highest-risk behavioral seam; S9 tests gate it.

**Verify:**

```sh
moon run echo-client:test -- src/core-db src/proxy-db/load-object.test.ts
moon run echo-client:test -- src/query/query.test.ts   # working-set visibility unchanged
moon run echo-client:test
moon run client:test                                    # sdk-level loading semantics
grep -n "_objectsPendingDocumentLoad\|_currentlyLoadingObjects\|_unavailableObjects" \
  -r packages/core/echo/echo-client/src                 # expect: no hits
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S13 — Direct strong-dep references + state-change event bus (G2, step 3)

- Strong deps become direct entity-core → entity-core references (minted as shell
  cores on first reference); delete `_strongDepsIndex` and the recursive
  `_areDepsSatisfied`/`_areDepsResolved` walks; resolution = "referenced cores in a
  resolved state", cycle-safe via visited-set (S9 cycle test gates).
- Event bus on the manager: `coreAdded`, `stateChanged`, batched per the existing
  throttling semantics (S9 batching test gates). `loadObjectCoreById` waiters, dep
  propagation, `hypergraph`, and `GraphQueryContext` move from `_updateEvent`
  predicate-polling to bus subscriptions; `_updateEvent` is deleted.
- Keep `prohibitSignalActions` guards at the source-update boundaries.
- The stall-fix logic (`_scheduleStrongDepDiskLoads`, unavailable wake-ups) re-lands as
  state transitions; `strong-deps-stall.test.ts` must pass **unmodified**.

**Verify:**

```sh
moon run echo-client:test -- src/core-db/strong-deps-stall.test.ts   # unmodified, green
moon run echo-client:test -- src/query src/hypergraph.test.ts
moon run echo-client:test
grep -n "_strongDepsIndex\|_updateEvent" -r packages/core/echo/echo-client/src
                                          # expect: no hits
moon run client:test
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S14 — Protocol logic moves to entity-core (G9)

- Move from `EchoReactiveHandler` (per S8 modules) onto entity-core methods:
  `getSchema`, `getTypeEntity`, `getTypeURI`, static-schema slot caching, `createRef` /
  `lookupRef` / `saveRefs`, relation source/target and parent resolution.
- `linkCache` dissolves: refs created while `detached` are held as direct core
  references (same mechanism as S13 deps), flushed on attach.
- Handler modules shrink to trap → entity-core translation; exported helper signatures
  unchanged (delegate).

**Verify:**

```sh
moon run echo-client:test -- src/echo-handler
moon run echo-client:test
grep -n "linkCache" -r packages/core/echo/echo-client/src    # expect: no hits
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S15 — Entity-manager finalization (G1, step 2)

- Rename/reshape the merged `CoreDatabase` into `entity-manager.ts`: object collection,
  loading, dep coordination, event bus, root-doc/space state. `DatabaseImpl` keeps only
  the user-facing API, schema registration, and migrations, delegating to the manager.
- Hypergraph/query/serializer internal touch-points move to the manager's named
  surface; nothing outside the package changes (S3 already cut external reach-ins).

**Verify:**

```sh
moon run echo-client:test
moon run client:test && moon run migrations:test
wc -l packages/core/echo/echo-client/src/**/*.ts | sort -rn | head   # no non-test file > ~800
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

---

## Phase 3 — Query convergence (after S7 + S13)

### S16 — Two-case aggregation with real dedup (G5)

- Replace `GraphQueryContext`'s generic source list with the two explicit cases:
  registry-scoped routing, and working-set ∪ index union for space queries with
  implemented by-id dedup (working-set wins; resolves the long-standing TODO in
  `graph-query-context.ts`).
- Sources consume the S13 event bus; `QueryResult`/`QueryContext` seam unchanged.
- Add dedup tests: the same object present in working set and index results appears
  exactly once; registry-scoped queries never mix with space results.

**Verify:**

```sh
moon run echo-client:test -- src/query
moon run echo-client:test -- src/client/index-query-source-provider.test.ts
moon run echo-client:test
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S17 — Shared planner client-side (G6.2)

- Make `QueryPlanner` (echo-host) target-configurable: index-backed plans (host) vs
  scan-backed plans (client: working-set scan + unified filter step; no FTS/traversal
  steps — those queries keep routing to the host as today).
- Client working-set path executes the scan-shaped plan; behavior identical
  (`isSimpleSelectionQuery` gating preserved).
- Add planner tests asserting that for the same query AST the two targets produce
  semantically equivalent plans over a shared in-memory fixture.

**Verify:**

```sh
moon run echo-host:test
moon run echo-client:test -- src/query/query.test.ts
moon run echo-client:test
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S18 — Shared executor skeleton (G6.3, stretch — optional)

- Extract a step-interpreter abstracted over a store interface (index/doc-loader in
  host; working set in client). Only if S17 leaves a clean seam; drop without guilt
  otherwise.

**Verify:** same ladder as S17, plus `moon run echo-host:test -- src/query`.

---

## Phase 4 — Parallel tracks

### S19 — Feed-manager + single database anchor (G11, D1)

Branch after S3 + S6; merge after S13 (shared files: `hypergraph.ts`, `database.ts`).

- **Test first**: add a characterization test for the construction-order contract —
  `SpaceProxy` constructs its queue factory before the database opens; `Space.queues`
  must be usable for wiring on a not-yet-opened database.
- Restructure `QueueFactory` → feed-manager (feed lifecycle) and `QueueImpl` → feed
  (item window: paging, append, identity cache, query context) with explicit item
  states (fetched / hydrated / failed-to-decode). Exported names/types that
  `Space.queues` pins (`QueueFactory`) keep their exact surface.
- `DatabaseImpl` owns the feed-manager; introduce the shared per-space identity/ref
  resolution service (D1 seam 1) on the database, routing DXNs to entity-manager or
  feed-manager. Wire the resolver **before** removing the old paths, with a ref
  round-trip test (doc object ↔ feed item) in place.
- Then delete: `EchoClient._queues` map + `constructQueueFactory` wiring,
  hypergraph `_registerQueueFactory`/`_unregisterQueueFactory` registry.
  `SpaceProxy.queues` delegates to the database's feed-manager.

**Verify:**

```sh
moon run echo-client:test -- src/queue src/testing/queue.test.ts
moon run echo-client:test
moon run client:test                       # SpaceProxy/queues construction order
moon run schema:test                       # createFeedServiceLayer consumers
grep -n "_registerQueueFactory\|constructQueueFactory" -r packages/ --include='*.ts' \
  | grep -v node_modules | grep -v dist    # expect: no hits
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

### S20 — Proxy prototypes (G10)

After S14 (handler is thin; entity-core owns domain logic).

- **Behavior-equivalence test first**: enumeration (`Object.keys`, spread, `for…in`),
  property descriptors, `instanceof`, `JSON.stringify`, devtools formatter output for a
  representative object set (typed, untyped, with relations, with arrays/nested
  records) — committed and green **before** any prototype change.
- Move fixed-shape members (methods, `toJSON`, inspect/devtools symbols, `id`) onto a
  prototype chain for proxy targets; traps remain for document-data properties.
  Schema-known accessors via per-schema prototypes only if the equivalence suite stays
  green — otherwise stop at the fixed-member prototype.
- Scope note: this touches the shared `ProxyHandlerSlot` in `@dxos/echo`
  (`internal/common/proxy/proxy-utils.ts`); changes there must not alter
  `typed-handler` behavior.

**Verify:**

```sh
moon run echo:test                          # typed-handler suites gate proxy-utils changes
moon run echo-client:test -- src/echo-handler
moon run echo-client:test
moon exec --on-failure continue --quiet :build
MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism
```

---

## Risks & watchpoints

| Risk | Stage | Mitigation |
| --- | --- | --- |
| Rename fallout in configs/CI/docs not caught by TS | S1/S2 | repo-wide literal grep is an exit criterion |
| Publishing gap for renamed packages | S0–S2 | user decision frontloaded (S0) |
| Shell cores leak into working-set semantics | S12 | S9 characterization tests; `attached`-state filtering |
| Dep cycles hang resolution | S13 | S9 cycle test; visited-set resolution |
| Event-bus batching differs from `_updateEvent` throttling | S13 | S9 batching test; reuse existing throttle implementation |
| `prohibitSignalActions` reentrancy in query updates | S13/S16 | keep the guard at source-update boundaries; query suite gates |
| Feed construction-order contract (`SpaceProxy` builds queues pre-open) | S19 | characterization test before rewiring |
| `@dxos/echo` proxy-utils shared with typed-handler | S20 | typed-handler suites gate; stop at fixed-member prototype if needed |

## Stage → goal coverage

| Stage | Goals |
| --- | --- |
| S1–S2 | G12 (renames) |
| S3 | G1 (surface), DatabaseImpl rename |
| S4 | G12 (ObjectCore hidden) |
| S5 | G8 |
| S6 | G4 |
| S7 | G6.1 |
| S8 | G3 (mechanical) |
| S9 | enables G2/G7 safely |
| S10 | G1 (loader merge) |
| S11–S13 | G2, G7 |
| S14 | G9, G3 (semantic) |
| S15 | G1 (entity-manager), G7 |
| S16 | G5 |
| S17–S18 | G6.2 / G6.3 |
| S19 | G11, D1 seams |
| S20 | G10 |

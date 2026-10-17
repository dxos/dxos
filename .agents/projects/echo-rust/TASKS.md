# echo-rust: tasks

Plan to reimplement ECHO in Rust as one wasm binary (automerge + subduction + ECHO) with TypeScript
bindings, behind the current API. Why and how: DESIGN.md. Spec structure: SPEC-PLAN.md.

## Phase 0: Decisions and TypeScript groundwork

No Rust yet. Settle the open questions, then remove what a Rust core cannot support.

### Tasks

- [x] **Survey ECHO and the Rust ecosystem.** DESIGN.md "ECHO today" and "Sync".
- [x] **Single-binary spike.** See spike/README.md: automerge 0.12, samod-core 0.15 and subduction's
      wasm bindings in one module, 2.88 MB (915 KB gzipped) before wasm-opt, runs in Node.
- [ ] **Answer DESIGN.md open questions 1 to 4**
  - One Automerge change per `Obj.update`, fate of the TS implementation, dropping samod, classic
    sync in the recovery boot.
- [ ] **ECHO text and history module**
  - Splice, update, edits, marks, cursors, heads, changes since heads, text at heads, history, patch
    subscription. Implemented over today's `ObjectCore` accessor.
  - Migrate the 25 packages outside ECHO that use `DocAccessor.handle` or import
    `@automerge/automerge` (start with `ui-editor/src/extensions/collab/automerge`, then
    plugin-markdown, plugin-review, plugin-script).
  - Add a lint rule that bans `@automerge/*` imports outside `packages/core/echo/**`.
- [ ] **One Automerge change per commit** (only if open question 1 says yes)
  - Batch every property set inside one `Obj.update` into one `A.change` per document.
  - Update `getChanges` expectations; re-measure `BUDGETS.md` write rows.
- [ ] **Conformance harness**
  - Make the public-API suites in `echo-client-e2e` and `reactive-proxy.blueprint-test.ts` take an
    implementation factory instead of `EchoTestBuilder`.
  - Rewrite tests that reach `getObjectCore`, `getSpaceRootDocHandle` or `peer.host.automergeHost`
    against public API, or tag them implementation-specific.
  - Run the `database`-level subset against `echo-sqlite` as a second implementation.

## Phase 1: Spec

Write the spec from the TypeScript code, with vectors that pass against it in CI. Chapter list and
sources: SPEC-PLAN.md.

### Tasks

- [ ] **Scaffold `packages/core/echo/spec/`.** `ECHO.mdl` index, conformance levels, vector format,
      TS vector runner wired into moon and CI.
- [ ] **Chapters 1 to 4 and 6** (identifiers, data model, document layout, schema, query) with vectors.
- [ ] **Chapters 5 and 7** (database operations, reactivity) against the shared suite.
- [ ] **Chapter 8** (text and history) alongside the phase 0 module.
- [ ] **Chapters 9, 10 and 12** (replication, persisted format, services) with recorded transcripts
      and a reference profile database.
- [ ] **Chapters 11 and 13** (feeds, blobs and limits).
- [ ] **Reconcile drift** in `echo/SPEC.mdl`, `echo/API.md`, `keys/docs/SPEC.md`,
      `echo-client/docs/VERSIONING.md`, `echo-host/docs/SQL_QUERY_EXECUTION.md` (lists in SPEC-PLAN.md).

## Phase 2: Rust foundations

The workspace, the pure model crate, the bindings package, and the two risky spikes.

### Tasks

- [ ] **Cargo workspace at `packages/core/echo/echo-rs/`**
  - moon tasks for build, test, clippy, fmt; `wasm32-unknown-unknown`, `wasm-bindgen-cli` 0.2.121 and
    `wasm-opt` in the Depot setup action.
  - A size budget check on the release artifact (raw and gzipped).
- [ ] **`echo-model` crate.** Identifiers, document layout encode and decode, JSON form, QueryAST
      serde, planner, filter matching, characteristics. Passes every phase 1 vector.
- [ ] **`@dxos/echo-wasm` package.** `bundler`, `web`, `node`, `workerd` and `base64` entries, slim
      with explicit init, `isLoaded`/`reinit`/generation. Proven in Composer's worker, Node, a
      `*.workerd.test.ts`, and `bun --compile`.
- [ ] **Spike: subduction in a synchronous core.** Drive `subduction_core` on a local executor
      polled inside each entry call, transports as queues, no `spawn_local`. Measure a 2,000-document
      sync against EDGE. Decide before phase 3 depends on it.
- [ ] **Spike: synchronous SQL from Rust.** Cost of a batched `exec` callback on wa-sqlite OPFS,
      `node:sqlite` and DO `ctx.storage.sql`.
- [ ] **Upstream.** Send the automerge 0.12 bump to subduction; ask automerge maintainers about the
      stability of `fragments`/`bundle_fragments`.

## Phase 3: Rust host

Replace `echo-host` internals behind the same `DataService`, `QueryService` and `FeedService`. The TS
client does not change. About 25,000 lines of TypeScript map here (`echo-host`, `index-core`, `feed`).

### Tasks

- [ ] **Doc manager.** Hub plus document actors, leases with idle eviction, load blocking,
      quarantine, load-failure and peer-bound events, the DXOS patch requirements in DESIGN.md "Sync".
- [ ] **Storage.** `automerge_chunks` (classic and subduction key families, group commit) and
      `automerge_heads` through the SQL driver. Same schema and migrations as the TS host.
- [ ] **Subduction.** Signer, policy hooks wired to `shouldAdvertise`, sedimentree storage, EDGE
      framing and mesh transport through JS drivers, collection sync.
- [ ] **Space state.** `echo_spaces`, space root and directory handling, GC, retirement,
      convergence-key merge.
- [ ] **Index engine.** Heads-driven data sources, `objectMeta`, `objectSnapshot`, `reverseRef`,
      FTS, activity, cursors; bounded write transactions.
- [ ] **Query.** SQL plan compiler, the declined cases closed in SQL, invalidation hints, debounce,
      reactive streams.
- [ ] **Feeds.** `FeedStore`, `EchoFeedCodec`, push and pull sync.
- [ ] **TS shell.** The three RPC services call the core; IO drivers for SQL, WebSocket, teleport,
      timers.
- [ ] **Differential and swap tests.** Replay recorded sessions against both hosts; open a
      TS-written profile in the Rust host and back.
- [ ] **Rollout behind a flag.** Tests and CLI first, then Composer's worker. Compare
      `BUDGETS.md` and `pnpm perf` numbers before changing the default.

## Phase 4: EDGE

The same binary in EDGE's replicator and indexer.

### Tasks

- [ ] **`relay` role in the replicator DO.** Replaces `automerge-subduction.wasm`; a test asserts
      relay paths never construct an Automerge document (`replicator-no-automerge-wasm`).
- [ ] **`indexer` role in the indexer DO.** Replaces `loadBlobSet` plus `index-core`.
- [ ] **Startup and memory on EDGE.** Measure operation-service against error 10021 and the 1 s
      startup limit; build a slim artifact by cargo feature only if needed.

## Phase 5: Rust client core

The tab's working set, write path and live queries move to Rust. JS keeps live objects.

### Tasks

- [ ] **Write path.** One `applyCommit(ops)` per `Obj.update`/`db.add`/`db.remove`; changed records
      pushed to JS.
- [ ] **Live queries.** Register by AST, id and order diffs, working-set executor, merge with host
      results, completeness.
- [ ] **Document mirror.** `DataService` protocol (`saveSince` both ways, passive handles, acks).
- [ ] **Remove `@automerge/automerge` from the tab** and run the full conformance matrix.

## Phase 6: Cleanup

### Tasks

- [ ] **Retire or freeze the TS implementation** per open question 2.
- [ ] **Drop the automerge-repo fork patch** and the `@automerge/*` dependencies.
- [ ] **Revisit the client to host protocol.** Snapshots plus Rust-to-Rust sync, so the tab stops
      holding full documents.

## References

- DESIGN.md, SPEC-PLAN.md, spike/README.md in this directory.
- `.agents/projects/echo-plain-objects/DESIGN.md` (materialized records).
- `.agents/projects/memory-usage/ALLOCATION.md` (wasm memory).
- `.agents/skills/subduction/` (policy and sync reliability).
- edge `packages/services/db-service/RULES.mdl`, `docs/audits/cross-request-promise-resolution.md`.
- automerge-repo `repo-3-0-experimental` branch; https://github.com/inkandswitch/subduction;
  https://github.com/alexjg/samod.

# ECHO in Rust and WASM: design

_Resume: see TASKS.md. Spec plan: SPEC-PLAN.md. Spike: spike/README.md._

## Goal

Rewrite ECHO in Rust and compile it, together with automerge and subduction, into one wasm binary
with TypeScript bindings. The public API (`@dxos/echo`, `Database`, `Obj`, `Query`, the React hooks)
and the architecture (client and host, spaces, linked documents, subduction to EDGE) stay as they
are. Implementation details may change. A language-neutral spec, with today's TypeScript as the
reference implementation, defines what "the same" means.

## The plan in brief

1. **Write the spec before any Rust.** Extract it from the TypeScript code, not from the existing
   `SPEC.mdl` and `API.md`, which have drifted (see SPEC-PLAN.md). Back every chapter with test
   vectors and one shared conformance suite that runs against any implementation.
2. **Close the holes in the API first, in TypeScript.** 25 packages outside ECHO reach raw Automerge
   through `DocAccessor.handle` or import it directly (the editor, markdown, review, script, tldraw,
   sheet and more). A Rust core cannot support that. A small ECHO text and history API replaces it
   while TypeScript is still the only implementation.
3. **Port the host first.** The host sits behind byte-level RPC contracts (`DataService`,
   `QueryService`, `FeedService`), so the TypeScript client runs unchanged against a Rust host and
   the two hosts can be compared on the same inputs. The host also holds the biggest wins: storage,
   sync, indexing and the out-of-memory failures.
4. **Then EDGE, then the client core.** EDGE's replicator and indexer move to the same binary. Last,
   the tab's working set and write path move to Rust while JS keeps the live objects.
5. **One binary, chosen role at init.** `host`, `client`, `relay` (EDGE replicator, never
   materializes a document) and `indexer`. A slim relay build stays possible through cargo features
   if EDGE startup numbers demand it.
6. **Subduction, not samod.** The document manager is DXOS code over automerge and subduction. The
   samod crates have no subduction support, and upstream automerge-repo 3.0 is replacing the sync
   protocol they implement with a sedimentree backend. The doc manager borrows samod's actor design
   instead.

The spike (spike/README.md) shows the binary is feasible today: automerge 0.12, samod-core 0.15 and
the full subduction wasm bindings link into one module of 2.88 MB (915 KB gzipped) before wasm-opt,
against 5.38 MB (1.75 MB gzipped) for the two binaries shipped now. It loads and runs in Node from
one glue file. The spike includes samod because the request named it. Point 6 explains why the plan
drops it.

## ECHO today

### Packages

Lines of TypeScript, excluding tests and `testing/` helpers.

| Package            | Source | Tests  | Moves to Rust                                                   |
| ------------------ | ------ | ------ | --------------------------------------------------------------- |
| `echo`             | 20,682 | 9,093  | Filter matching, identifiers, JSON form. The API stays in TS    |
| `echo-client`      | 19,290 | 12,447 | `core-db`, `automerge`, `query` (9,711 lines). Proxies stay     |
| `echo-host`        | 20,566 | 17,929 | All of it, behind the same RPC services                         |
| `index-core`       | 3,851  | 4,192  | All of it                                                       |
| `feed`             | 2,441  | 2,506  | Store, codec and sync logic                                     |
| `echo-protocol`    | 2,125  | 82     | Document structure, QueryAST, feed codec                        |
| `keys` (common)    | 1,249  | 626    | DXN, EID, EntityId, SpaceId                                     |
| `blob`             | 1,309  | 587    | Contract only; bytes stay with the JS store                     |
| `echo-sqlite`      | 2,253  | 1,365  | No. It is a second `Database` implementation, useful as a check |
| `echo-react/solid` | 1,263  | 0      | No                                                              |
| `echo-client-e2e`  | 2,388  | 11,043 | No. Its public-API suites become the conformance suite          |

About 40,000 lines of TypeScript logic would be reimplemented: `echo-host`, the core of
`echo-client`, `index-core`, `feed`, `echo-protocol`, `keys` and the filter matcher from `echo`.

### Where ECHO runs

| Runtime                        | Host                              | Storage                          | Notes                                                         |
| ------------------------------ | --------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Composer web (default)         | Dedicated worker, leader-elected  | wa-sqlite, OPFS access handles   | The tab also holds a full Automerge replica per open document |
| Composer `DX_HOST`, CLI, tests | In process                        | OPFS, node/bun SQLite, memory    | `bun --compile` needs base64-inlined wasm                     |
| Tauri                          | Same as web inside the webview    | OPFS (memory on Linux WebKitGTK) | No Rust touches ECHO data                                     |
| EDGE replicator DO             | Subduction only, per space        | DO SQLite sedimentree tables     | Rule `replicator-no-automerge-wasm`; 128 MB isolate           |
| EDGE indexer DO                | `index-core` plus Automerge loads | DO SQLite                        | Shares `QueryPlanner` with dxos                               |
| EDGE thin clients              | `EchoClient` over Workers RPC     | none                             | operation-service is near the startup CPU limit               |

### Data path

```text
tab (echo-client)                     worker (echo-host)                         EDGE
Obj proxies, materialized records     AutomergeHost: automerge-repo fork         replicator DO: subduction
EntityManager, ObjectCore             + SubductionSource (68 DXOS patch sites)   indexer DO: index-core
RepoProxy: full A.Doc per handle ---> DocumentsSynchronizer (saveSince bytes)    feed DOs
working-set query executor            IndexEngine + SQL plan compiler
        |   effect-rpc over MessagePort    |  one SQLite DB: chunks, heads,
        +-- DataService / QueryService ----+  objectMeta, objectSnapshot, reverseRef, fts
            FeedService / BlobStoreService       |
                                                 +-- subduction frames over EdgeConnection
                                                 +-- teleport mesh (subduction or classic sync)
```

The document format: a space root document points at a directory document. The directory maps each
object id to an Automerge URL in `links`, or holds the object inline in `objects`. With the default
`linked-doc` placement every object has its own document holding `objects[id] = { system, meta,
data }`. Strings become Automerge text, references are `{ "/": "<EID or DXN>" }`. SPEC-PLAN.md lists
the full rules and their sources.

### What argues for Rust, with evidence

- **Three Automerge heaps, and a JS hop between Automerge and subduction.** In one measured Composer
  session, 146.6 MB of committed linear memory belonged to three Automerge instances. The bundle
  ships two distinct Automerge
  binaries, and the tab runs its own replica beside the worker's
  (`.agents/projects/memory-usage/ALLOCATION.md`). `automerge-subduction.wasm` contains no Automerge
  code, so every commit goes from the Automerge instance through JS (`getFragmentMetadata`,
  `bundleFragmentMetadata`) into the subduction instance. Composer precaches about 30 MB of wasm
  across 10 files.
- **Out-of-memory loads.** One cursor document with 45.7M ops ran the wasm heap out of memory and
  stalled every start on every peer. The fix (commit `4007fa27`) quarantines and retires such
  documents. Wasm memory never shrinks.
- **A write costs a commit per property.** Each property set inside `Obj.update` is its own
  `A.change`, at 160 to 400 µs per set (`echo-client-e2e/BUDGETS.md`). Reads are already 25 to
  113 ns because they come from JS-side materialized records (`echo-plain-objects`).
- **The sync layer is a fork.** `@automerge/automerge-repo@2.6.0-subduction.48` carries a DXOS patch
  with 68 sites: load blocking, quarantine events, heal retries, in-flight gates, detached-data
  events. EDGE syncs the same patch.
- **EDGE works around wasm lifecycles.** Isolate-wide mutexes, reset on trap, a generation counter
  for dead handles, reinit patches to both glue files, and a cross-request promise hazard inside the
  subduction recv loop (`edge/docs/audits/cross-request-promise-resolution.md`).
- **Automerge-repo 2.x is on its way out.** edge `docs/design/sync/sync-server.md:7` already says it
  "is approaching EOL". Upstream, `automerge-repo` 3.0.0-experimental (2026-10-05) removes the
  network and storage adapters and the share policy; its `Repo` takes a `SedimentreeBackend` over
  subduction.

A Rust core does not fix everything here. History bloat still needs retirement, and wasm32 still
caps a heap at 4 GB. The gains are one Automerge instance per thread instead of three heaps,
Automerge-to-sedimentree translation inside one module, one glue layer, a write path that batches
per commit, and sync and storage code DXOS owns instead of patches on a fork.

## Target architecture

### Layers

```text
            @dxos/echo (TS, unchanged API: Obj, Type, Ref, Query, Filter, Database, Effect services)
                 |  live objects, Effect Schema validation, reactivity fan-out, hooks
            @dxos/echo-client (TS shell) ---- @dxos/echo-host (TS shell: RPC handlers, IO drivers)
                 |                                  |
            =========== @dxos/echo-wasm: wasm-bindgen glue + generated .d.ts ===========
                 |                                  |
  crates:   echo-client-core                 echo-host-core            echo-relay (EDGE)
            working set, write batches,      doc manager, storage,     subduction only,
            live queries, doc mirror         index, query, GC, feeds   no Automerge
                 \                 |                 /
                  echo-model: identifiers, document layout, encode/decode, QueryAST,
                              planner, filter matching, JSON form (no IO, no async)
                                   |
                  automerge 0.12 · sedimentree_core · subduction_core
```

`echo-model` is pure functions and data. It is the first crate written, it runs the spec's test
vectors, and every other crate depends on it.

### Where the wasm boundary sits

The boundary is coarse. Each rule below keeps calls per user action constant, not per property.

1. **Reads never cross.** JS keeps a materialized record per live object, as `echo-plain-objects`
   built. Rust pushes a changed object's record (or a patch to it) after a commit or a host
   delivery. Proxy reads stay at today's 25 to 113 ns.
2. **One write call per commit.** `Obj.update`, `db.add` and `db.remove` collect their mutations in
   JS and send one `applyCommit(ops)` call. Rust writes one Automerge change per document touched and
   returns the changed object ids.
3. **Queries are registered, not run per call.** JS registers an AST once and receives id and order
   diffs. JS maps ids to live objects through its weak identity map.
4. **Bytes pass through untouched.** Sync frames, `saveSince` batches and storage blobs move between
   Rust and the JS drivers as `Uint8Array` without decoding in JS.
5. **Synchronous calls.** Read-your-writes before the writing call returns (`SYNC_QUERIES.md` §3.6)
   requires the client core to run in the same thread as the proxies. The binary loads in the tab
   for that role.

JS keeps the parts that are JS by nature: the `Proxy` and accessor objects, `Obj.update` change
contexts, `Event`/`Atom` fan-out, `WeakRef` identity maps, Effect Schema validation of writes, the
Effect services and layers, and the React and Solid hooks.

### One binary, four roles

The binary exposes `init(role, options)`. Each role constructs only its own state.

| Role      | Runs in                     | Owns                                                           |
| --------- | --------------------------- | -------------------------------------------------------------- |
| `host`    | Composer worker, CLI, tests | Documents, subduction, storage, indexes, queries, feeds, GC    |
| `client`  | Tab, EDGE thin clients      | Working set, write path, live queries, document mirror         |
| `relay`   | EDGE replicator DO          | Subduction sessions and sedimentree storage; no Automerge docs |
| `indexer` | EDGE indexer DO             | Index engine fed from sedimentree blobs                        |

EDGE keeps its isolation by deployment, not by binary: the replicator and the indexer are separate
DOs, so each gets its own instance. Inside the relay role, the rule `replicator-no-automerge-wasm`
becomes a Rust-side guarantee: relay code paths never construct an `automerge::Automerge`, and a test
asserts it. The cost is code size, not heap: the relay isolate loads about 1 MB of Automerge code it
never runs. If operation-service or the replicator miss their startup CPU budget, a cargo feature
builds a `relay`-only artifact from the same crates.

### IO: the core does none

The core follows samod-core's sans-IO shape. Each call takes events (a frame arrived, a storage read
finished, a timer fired) and returns effects (send these bytes, run these statements, wake me in
200 ms). JS drivers do the IO: OPFS, `node:sqlite`, DO `ctx.storage.sql`, WebSocket and the EDGE
router framing, MessagePort, timers.

This shape matters most on workerd. A Rust core that never parks a promise across calls cannot hit
the cross-request promise hazard that the subduction recv loop has today, and a call that returns
leaves no hidden state for a dead request context.

One gap: `subduction_core` is async (futures over `future_form`), not sans-IO. The plan drives it on
a single-threaded local executor that each entry call polls until it stalls, with transports as
in-memory queues. TASKS.md phase 2 spikes this before anything depends on it.

### Storage

Rust runs SQL through a synchronous executor that JS provides: `exec(statements) -> rows`, batched.
It does not compile SQLite into the binary.

- EDGE must use `ctx.storage.sql`, which an embedded SQLite cannot reach.
- The OPFS access-handle VFS and the single-writer leadership across tabs already work in JS.
- The schema stays the same: `automerge_chunks`, `automerge_heads`, `echo_spaces`, the `index-core`
  tables and the feed tables. A profile written by the TypeScript host opens in the Rust host and
  back. That makes rollback a config flag, not a migration.
- The SQL the plan compiler emits today needs SQLite 3.45 or later with JSONB and FTS5 trigram. Every
  backend above meets that.

### Sync: build on subduction, not samod

The document manager is DXOS code over `automerge`, `sedimentree_core` and `subduction_core`. It does
not depend on samod. This differs from the starting assumption, for these reasons:

- **No subduction in samod.** Nothing in the samod repository mentions subduction or sedimentree.
  It speaks the automerge-repo 2.x sync protocol.
- **Upstream is leaving that protocol.** automerge-repo 3.0.0-experimental drops network adapters,
  storage adapters and share policies, and builds its `Repo` on a `SedimentreeBackend` over
  subduction. samod's compatibility target is what 3.0 removes.
- **DXOS already runs subduction everywhere it matters.** Production presets set
  `edgeFeatures.subductionReplicator: true`. The EDGE replicator runs subduction with no
  automerge-repo at all. Classic sync remains only with that flag off, for example the recovery boot
  (`composer-app/src/recovery/boot-client.ts:48`).
- **The published samod-core may not run on wasm32.** It calls `std::time::Instant::now()` in the
  document sync path (`actors/document/peer_doc_connection.rs`), which panics on
  `wasm32-unknown-unknown`. Not run, inferred from source.

What the plan takes from samod is its shape: a hub plus one actor per document, events in and effects
out. That is the design the doc manager follows. If samod gains subduction support later, the doc
manager can adopt `samod-core` behind the same interface.

The Rust doc manager replaces the automerge-repo fork, so the fork's DXOS patch sites become its
requirements: load blocking and quarantine, a load-failure event, a peer-bound event, detached-data
events, the in-flight round gate, disconnect on loss, heal retries through the same gate,
`containsSedimentreeId`, a pending-sync query, and loading stored blobs before the first round.
DXOS's own layers on top port as they are: the collection-sync protocol (heads per document every
10 s, overlap diff), document leases with idle eviction, and the policy hooks wired to
`shouldAdvertise`.

Automerge-to-sedimentree translation moves inside the binary. automerge 0.12 has `fragments` and
`bundle_fragments` (experimental, doc-hidden), and subduction's `automerge_subduction_ingest` is a
thin adapter over them. Today the same step runs in JS between two wasm instances.

### Query and indexing

Port `QueryPlanner`, the filter matcher (`filterMatchDoc`, `internal/Filter/match.ts`), query
characteristics and the SQL plan compiler to Rust. The planner and matcher are already shared by
client and host, and EDGE imports them too, so one Rust copy serves all three.

Two executors remain, as today. The client runs a working-set executor over loaded objects. The host
compiles plans to one SQL statement. The host's in-memory fallback exists only for plans the
compiler declines (`@meta` filters, `metaVersion` semver ranges, day grouping in a named time zone).
The Rust port closes those cases in SQL or with registered SQLite functions, and drops the fallback.

Index maintenance stays heads-driven: compare each document's heads with the index cursor, diff the
changed `objects/<id>` paths with `automerge::diff`, update rows in bounded transactions.

### Text and history

Today a consumer calls `Doc.createAccessor(obj, path)` and then works on `accessor.handle` with
`A.splice`, `A.getCursor`, `A.getHeads`, `A.diff` and friends. Across the repo the most-called
Automerge functions are `getHeads` (82), `RawString` (36), `change` (29), `save` (25), `splice` (22),
`diff` (12), `getCursor`/`getCursorPosition` (9) and `getHistory` (5).

The replacement is an ECHO module over a `(object, path)` text target:

- edits: `splice`, `updateText`, `applyEdits`, marks;
- positions: `cursor`, `cursorPosition`;
- versions: `heads`, `changesSince(heads)` as patches, `textAt(heads)`, `history`;
- subscription: patches since the last notification, for the CodeMirror binding.

It lands in TypeScript first, implemented over today's `DocAccessor`, and every consumer migrates.
After that no package outside ECHO imports `@automerge/automerge`, and the Rust core can implement
the same module.

### Schema and validation

Effect Schema stays in JS and keeps validating writes before they reach Rust. Rust treats schemas as
data: the JSON Schema dialect ECHO already persists (draft-07 plus `entityKind`, `typename`,
`version`, `relationSource`/`relationTarget`, `propertyOrder`, the `reference` form, `annotations`).
It reads them for type identity, reference fields and labels. Validation in Rust is out of scope for
this plan. It would matter only for EDGE-side writes, and its semantics would need their own spec
because Effect refinements and `assertExactProperties` differ from draft-07.

### Memory

- One Automerge instance per thread, shared with subduction. Today Composer runs three Automerge
  heaps plus a separate subduction heap.
- The document lease registry, idle eviction, quarantine and retirement port to Rust as they are. They
  are policy, and Rust does not remove the need for them.
- Each role gets a heap budget. The core refuses to materialize a document whose stored size times
  the observed load factor (500 to 900x compressed bytes on EDGE) would exceed it, and reports it as
  quarantined instead of trapping.
- Panics start as `panic = "abort"` on stable Rust, the same as subduction. A panic becomes a trap
  that EDGE's existing reset path handles, and wasm-bindgen's abort detection (`set_on_abort`,
  `schedule_reinit`) reinitializes in the browser. The bindings expose `isLoaded`, `reinit` and a
  generation number, matching what EDGE patches into both glue files today. `panic = "unwind"`
  turns panics into catchable JS errors and keeps the instance alive (Automerge JS builds this way,
  and Cloudflare recommends it for Rust Workers), but it needs nightly `-Zbuild-std` today. Revisit
  when that reaches stable; the cost is one instance shared by automerge, subduction and ECHO going
  down together on any panic.

### Packaging

- Cargo workspace at `packages/core/echo/echo-rs/`, crates under `crates/`. moon tasks build it.
- TS package `@dxos/echo-wasm` wraps the artifact with the entry points subduction's package already
  has: `bundler`, `web`, `node`, `workerd` (module import, `initSync`) and `base64` for
  `bun --compile`. Every entry is a slim entry with explicit init, no top-level await.
- `wasm-bindgen` at subduction's exact pin (0.2.121 today), with generated `.d.ts` and `tsify` for
  types that cross as values. The ECHO crate links the `automerge` crate directly, not
  `automerge-wasm`, so automerge-wasm's own pin (0.2.127) does not apply. Not the component model: no
  browser, Node or workerd runs components natively, and `jco` adds a transpile step.
- Cloudflare limits as of 2026-10: 128 MB per isolate including wasm, 64 MiB uncompressed worker
  size on Free and Paid, 1 s startup, wasm precompiled at deploy (no compiling from bytes), one
  thread.
- CI adds the `wasm32-unknown-unknown` target, `wasm-bindgen-cli` and `wasm-opt` to the Depot setup
  action, which already installs Rust for `code-index-native`.

## Decisions

### D1. The spec comes from the code, and is executable

The spec is `.mdl` (the repo's spec format) under `packages/core/echo/spec/`, extracted from the
TypeScript implementation. The existing `echo/SPEC.mdl` and `API.md` disagree with the code in more
than ten places (`Database.runQuery`, `Feed.cursor`, `dxn:type:` examples, `Relation.getSourceDXN`),
so they are inputs to reconcile, not sources. A chapter counts as done only when its test vectors pass
against the TypeScript implementation in CI.

### D2. The host is ported before the client

The host is behind byte-level contracts. The TypeScript client can run against it unchanged, the two
hosts can replay the same inputs, and a profile can switch hosts with a flag because storage is
shared. The client port needs the text API and the change-granularity decision settled first, and
both land in TypeScript.

### D3. One binary, roles chosen at init

Explained above. The request asked for one binary, and one binary also removes the second wasm
module, its glue, and the JS hop between Automerge and subduction. The cargo-feature escape hatch
costs nothing until it is used.

### D4. Sans-IO core with synchronous entry points

Every backend DXOS runs on has synchronous SQL (wa-sqlite sync build, DO `ctx.storage.sql`,
`node:sqlite`, `bun:sqlite`). Synchronous entry points keep reads-your-writes in the tab and avoid
workerd's dead-context rules.

### D5. SQL stays in JS drivers; the schema stays the same

See Storage. Same tables means rollback by flag and a differential test on real profiles.

### D6. The client to host wire protocol stays during the port

`DataService`, `QueryService` and `FeedService` keep their shapes until both sides are Rust. A later
phase may replace `saveSince` mirroring with snapshots plus Rust-to-Rust sync, which would also let
the tab stop holding full documents (the open `memory-usage` task).

### D7. Subduction directly; samod only as a design reference

See Sync. The decision reverses if samod gains subduction support and upstream keeps samod as the
Rust repo, in which case the doc manager swaps its internals for `samod-core` behind the same
interface.

### D8. Abort on panic until unwinding is on stable

See Memory. Stable toolchain and parity with subduction outweigh keeping the instance alive after a
panic, because both EDGE and the browser already recover by reinitializing.

## Risks

| Risk                               | Why it matters                                                                                 | Mitigation                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Upstream churn                     | subduction is 0.x, says "do not use for production", tags nightlies, pins wasm-bindgen exactly | Pin revisions, vendor small patches, send the automerge 0.12 bump upstream, track automerge-repo 3.0 |
| Experimental automerge APIs        | `fragments` and `bundle_fragments` are doc-hidden in automerge 0.12                            | Wrap them in one module; ask upstream before depending on them widely                                |
| Async subduction in a sans-IO core | Polling a local executor inside sync calls may stall or reorder                                | Phase 2 spike before the host depends on it                                                          |
| Two implementations at once        | Every ECHO change lands twice during the port                                                  | The conformance suite gates both; host feature freeze while it is ported                             |
| History bloat still exists         | Rust loads still materialize whole documents                                                   | Port retirement and quarantine; add per-role heap budgets                                            |
| EDGE startup CPU                   | operation-service is near error 10021 already                                                  | Thin clients use the `client` role without Automerge state, or no binary; slim builds by feature     |
| Debugging                          | Traps lose JS stack context                                                                    | `tracing` bridged to `@dxos/log`, debug builds with DWARF, panic hook with message capture           |
| Review capacity                    | The team reviews TypeScript every day, Rust rarely                                             | Keep crates small, keep the spec the contract, port module by module                                 |

## Open questions

1. **One Automerge change per `Obj.update`?** Today each property set is its own change. Batching
   changes edit history granularity (`getChanges`, `getVersion`) and makes writes cheaper. The spec
   needs one answer before the client port.
2. **What happens to the TypeScript implementation afterwards?** Keep it as the executable reference
   (tests only), or delete it once Rust passes the conformance suite.
3. **Drop samod?** The plan builds on subduction directly (D7). The request named samod, so this
   needs confirmation.
4. **Does the recovery boot need classic sync?** It runs with subduction off today. If it can use
   subduction, the Rust host never needs the automerge-repo 2.x protocol at all.

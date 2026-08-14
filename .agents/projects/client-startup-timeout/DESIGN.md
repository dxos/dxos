# Client Startup Timeout — Design

## Problem

On a profile with a synced inbox (~1,700 subduction documents), the Composer
client fails to start: the worker boots fine, then blocks its own thread for
~18 s doing local subduction hydration, misses the client's flat 15 s connect
deadline, and the two sides then deadlock so no retry can ever succeed. The
user sees the System Error dialog on every load.

Distinct from `startup-latency`, which is about demand-driven module activation
in app-framework. This is the worker/storage thread.

## Evidence

Captured from a user NDJSON log (24,494 lines; worker `om1i9a`, tab `c6bhej`,
2026-08-13T13:07–13:08). Analysis scripts were ad hoc; the numbers below are
what to reproduce against.

### Timeline

| t (13:08)   | event                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| 02.355      | tab `worker-connection: opening` — **15 s deadline starts → 17.355**       |
| 02.357      | leader lock acquired; `leader-session: creating worker`                    |
| 04.799      | worker `lock acquired` (2.4 s to load the worker bundle)                   |
| 05.501      | worker `runtime ready, posting ready`                                      |
| 05.573      | worker posts session ports, `creating session (waiting for handshake)`     |
| 05.580      | tab `connected to worker` — **second 15 s deadline → 20.580**              |
| 05.649      | tab services proxy opened; issues `WorkerService.start` RPC                |
| 05.58–23.71 | **worker thread saturated** — nothing else runs                            |
| **17.357**  | tab `client initialization failed` → System Error dialog                   |
| 20.582      | tab `opening worker connection handle` timeout                             |
| 23.707      | worker `worker-session opening...` — finally reaches the handshake         |
| 24.227      | worker `worker-session opened` — 3.6 s too late                            |
| 24.231      | first subduction peer connects (`echo-network-adapter: connection opened`) |
| 24.04–56.36 | worker: 39 × `ignoring duplicate client` — permanently wedged              |

### Storage work in the 18.1 s stall window

2,702 queries, 7.35 s of measured SQL; the remaining ~11 s is automerge /
subduction WASM and JS. wa-sqlite runs in-process via `AccessHandlePoolVFS`, so
**every query blocks the worker thread**.

Split at the 24.231 peer-connect boundary:

| operation                     | during stall (0 peers) | after peer connect |
| ----------------------------- | ---------------------- | ------------------ |
| `automerge_chunks` GLOB reads | 2,650                  | 3,312              |
| `automerge_chunks` inserts    | 478                    | 7,314              |

The stall is **read-dominated and entirely local** — the edge WebSocket had not
connected yet (`deferring subduction connection until edge ws is ready` for both
spaces at 05.511). The edge connect at 24.231, immediately after the thread
frees at 23.707, means the WebSocket handshake was itself starved by the same
blocked thread.

### Read amplification: source identified

`SubductionSource#addEntry` fires `listCommitIds(sid)` + `listFragmentIds(sid)`
per entry to seed `persistedCommitHashes` / `persistedFragmentHashes`, and
`#scheduleCompaction` re-lists. Each is a `loadRange` →
`SELECT key, data FROM automerge_chunks WHERE key = ? OR key GLOB ? ORDER BY key ASC`
([sqlite-storage-adapter.ts:175](../../../packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts)).

Observed key histogram confirms the shape: **3,406 distinct keys** (1,703 docs ×
`subduction-commits-*` + `subduction-fragments-*`), read 1× (1,702), 2× (852),
3× (852) — 5,962 calls total.

## Root causes

### 1. Worker thread starvation (the trigger)

Local subduction hydration is O(documents) synchronous SQLite round-trips on the
single worker thread, with no yielding and no batching. Scales linearly with
document count — matches "the delay grows with the size of the space". A synced
inbox inflates doc count far past the user's ~100 visible objects.

### 2. Unrecoverable connect failure (why it is fatal rather than slow)

`waitWithLockOrRpcTimeout(this.#onConnect(...))`
([Client.ts:360](../../../packages/sdk/worker-framework/src/Client.ts)) abandons
`onConnect` on timeout but never cancels it. It runs to completion in the
background: opens the services proxy, acquires the tab liveness lock, and
delivers `WorkerService.start` at 24.227.

Consequences:

- Worker side: session is open and healthy; `tabsProcessed` retains the
  clientId; the tab lock it watches for teardown is still held by the orphaned
  closure, so the `Effect.ensuring` cleanup
  ([Worker.ts:199](../../../packages/sdk/worker-framework/src/Worker.ts)) never
  fires.
- Client side: `#connectionHandle` was never assigned, so nothing calls
  `close()`; it retries with the same `#clientId` (a readonly field, set once
  per Connection).

Every retry gets `ignoring duplicate client`. A reload spawns a fresh worker and
replays the whole 18 s hydration, so it reproduces identically — hence "always".

### 3. Log amplification (dev only, but it lands in the critical window)

`recordSqliteQueryMetrics`
([opfs-client.ts:100](../../../packages/common/sql-sqlite/src/internal/opfs-client.ts))
logs every query with full params and calls `performance.measure` with a
structured-cloned `detail`, unconditionally. **42.3 MB of the 44.1 MB log** is
these lines; **22.3 MB** is blob params serialized as `{"0":133,"1":111,…}`.
Prod filters the log line but not the `performance.measure`.

## Open question — the "existing subduction patch"

User reports a patch already mitigates unnecessary startup writes. Not found:

- `patches/@automerge__automerge-subduction@0.16.0.patch` — 22 lines, browser
  export condition + one re-export file. Nothing on the write path.
- `patches/@automerge__automerge-repo@2.6.0-subduction.40.patch` — 556 lines,
  32 hunks, all read fully: `MAX_IN_FLIGHT_DOC_SYNCS` sync gate,
  disconnect-abort race in `#doSync`, `Repo.getHandle()` O(1), `onPeerBound`,
  `all-failed` re-drive. All sync/connection path.
- `git log --all` for write/unnecessary/redundant/no-op — nothing matching.
- `SqliteStorageAdapter.save()` — unconditional `INSERT OR REPLACE`, no dedupe.

What write-avoidance **does** exist is upstream and cold-start-blind: `#save`
fast-paths on `entry.lastSavedHeads`, and `#saveNewCommits` filters against
`entry.knownHashes`. Both start empty per entry per process; `knownHashes` is
populated only by `commit-saved` echoes and post-save, and the `commit-saved`
handler returns early while `syncState === "initializing"`, so disk hydration
does not seed it. Meanwhile `persistedCommitHashes` / `persistedFragmentHashes`
**are** seeded from disk, with a comment saying exactly why — that seeding was
added for compaction and never extended to the save path. Still
`lastSavedHeads: new Set()` in upstream `2.6.0-subduction.47`.

Leads: we are pinned at `2.6.0-subduction.40` while the channel dist-tag is
`.47` (held back deliberately — commit `f6d40d6099` explains the 556-line
dist-level patch would need rebasing); and the `automerge-subduction` 0.16.1
bump lives only on `origin/claude/sweet-goldberg-twtikd`, never merged.
`storeBuiltBatch` persists on the Rust/WASM side, so a dedupe there would not
appear in any JS diff.

## Direction

1. Make the connect failure recoverable — fresh clientId per attempt, cleanup on
   failure, worker replaces rather than ignores a known clientId. Turns a fatal
   startup into a slow one.
2. Collapse per-doc hydration reads into one prefix scan per space and yield
   between batches.
3. Defer subduction hydration until after the first session handshake, so the
   worker answers the tab immediately and syncs behind it.
4. Gate the SQLite query log and `performance.measure` behind a flag
   (independent, land separately).

Also worth separating: `LOCK_OR_RPC_WAIT_TIMEOUT` is one flat 15 s covering both
"acquire a Web Lock" and "the worker answers an RPC"
([locks.ts:8](../../../packages/sdk/worker-framework/src/internal/locks.ts)).
Those want different budgets.

## Update 2026-08-14 — redundant-write cause found and fixed

The Phase 0 "existing subduction patch" is **not found because it never
existed**. Searched every historical `patches/@automerge__automerge-repo@*` back
to the Subduction introduction (PR #10752, 2026-05-10) through `.17`, `.20`,
`.23`, `.34`, `.40`: the `knownHashes` / `lastSavedHeads` dedupe appears only as
unmodified _context_ in those diffs — DXOS never patched the save path. The
false lead is PR #12064 ("Automerge writes test"), which asserts
`storage.writeOps === 0` on repo restart but constructs a plain `Repo` with no
`initSubduction`, so it exercises classical automerge-repo storage — not
`SubductionSource`, where the bug lives.

Upstream `automerge/automerge-repo#712` (dmaretskyi, open against
`subductionjs`) is the real fix: mirror the disk hash scan into `knownHashes`.
Ported to our pinned `.40` dist patch and verified.

**Measured effect** (`app.log`, worker instance isolated via the `i` field —
see below): commit/fragment re-persist on boot is **eliminated**. Across three
classified boots, `subduction-commits-*` and `subduction-fragments-*` inserts
went from the dominant write class to exactly zero.

### Two caches, one defect pattern

The remaining boot writes are a _second_ instance of the same bug in a
different cache. Classifying every `INSERT OR REPLACE INTO automerge_chunks` by
key family (the table is a generic blob store; the family lives in the key
prefix, `encodeKey` escaping the literal hyphen so `remote-heads` renders as
`remote%2Dheads` — [sqlite-storage-adapter.ts:241](../../../packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts)):

| boot     | docs attached | commits/fragments written | remote-heads written |
| -------- | ------------- | ------------------------- | -------------------- |
| `wkwe96` | 36            | 0                         | 561                  |
| `oo7c99` | 37            | 0                         | 515                  |

`#surfaceRemoteHeads` dedupes against `#lastRemoteHeads`, an in-memory `Map`
that starts empty every process, and **never consults disk** — `oo7c99` shows
515 writes to the `remote-heads` family against **0 reads** of it. So a boot
re-persists a record per document the peer advertises even when the bytes are
unchanged. The attach-time replay path cannot fix this: only ~37 documents
attach while ~515 are advertised, so ~93% of the writes belong to documents
that never attach and therefore never get a per-attach seed.

Fix: bulk-seed `#lastRemoteHeads` from one `remote-heads` prefix scan at source
construction, covering all documents rather than per-attach.

### Method note: isolating a session

`app.log` interleaves the tab, the shared worker, and the dedicated worker, and
survives across reloads. The `i` (instance id) field added by the shared NDJSON
serializer separates them — e.g. `dedicated-worker:dxos-client-worker:oo7c99`.
Counting without filtering on `i` merges multiple boots and produces numbers
that look like a regression. A fresh cold boot is identifiable by its
once-only messages (`worker init with config`, `echo-host: opening automerge
host...`).

Also note `recordSqliteQueryMetrics` truncates its context at 500 chars, which
silently dropped the `time` field for large-param queries — the two highest-count
statements were invisible in every earlier analysis. Params are now summarized
(`<Uint8Array N bytes>`) so the field survives.

## Idle index churn — 79% of boot SQL time is no-op work

Separate from replication, and the dominant remaining cost. In `oo7c99`
(24.5 s, 2462 queries, ~475 ms SQL):

| count | avg      | total    | statement                                                                 |
| ----- | -------- | -------- | ------------------------------------------------------------------------- |
| 272   | 0.901 ms | 245.0 ms | `SELECT * FROM indexCursor WHERE indexName = ? AND ...`                   |
| 136   | 0.965 ms | 131.2 ms | `SELECT document_id, heads FROM automerge_heads ORDER BY document_id ASC` |

Both belong to the index engine, in a fixed ratio: **68 passes, each doing
exactly 4 `indexCursor` reads and 2 full-table `automerge_heads` scans**
(272 = 68 × 4, 136 = 68 × 2). The `automerge_heads` statement has no `WHERE`
clause, so its cost grows linearly with document count — on the ~1,700-document
reporting profile this is far worse than measured here.

**All 68 passes did zero work**: every one reports
`{"updated":0,"done":true,"spaces":0,"queues":0,"documents":0,"types":0,"objects":0}`.
Passes run at ~4/s (bimodal gaps: pairs ~100 ms apart, ~450 ms between pairs)
and continue at an undiminished rate through the last 10 s of the session, long
after network activity stops (`received subduction batch` ends at boot+13 s).
The driver appears to be a self-sustaining query-invalidation loop —
`executed queries` fires 42 times with `dirty:1` in 39 of them against
`active:15-16`, i.e. one query is re-marked dirty every cycle.

Likely the same phenomenon the `memory-usage` project recorded as "Phase 4 idle
churn (~51 SQL/s from four loops)"; worth reconciling the two before fixing
either.

### Call paths

- `indexCursor` — `IndexTracker.queryCursors`
  ([index-tracker.ts:59](../../../packages/core/echo/index-core/src/index-tracker.ts))
  ← `IndexEngine.#update` ([index-engine.ts:328](../../../packages/core/echo/index-core/src/index-engine.ts)),
  once per index per data source. `IndexEngine.update` runs it for `fts5` (:272)
  and `reverseRef` (:288); `EchoHost._runUpdateIndexes`
  ([echo-host.ts:862](../../../packages/core/echo/echo-host/src/db-host/echo-host.ts))
  calls `update` for both the automerge source (:875) and the feed source (:900)
  — hence 2 × 2 = 4 reads per pass. `spaceId` is passed `null`, so the query is
  deliberately unscoped and returns every cursor row each time.
- `automerge_heads` — `SqliteHeadsStore.iterateAll`
  ([sqlite-heads-store.ts:125](../../../packages/core/echo/echo-host/src/automerge/sqlite-heads-store.ts))
  ← `AutomergeHost.listDocumentHeads` ← `AutomergeDataSource.getChangedObjects`
  ([automerge-data-source.ts:71](../../../packages/core/echo/echo-host/src/db-host/automerge-data-source.ts)),
  which full-scans and diffs each doc's heads against the in-memory cursor map,
  `break`ing after `limit` changed docs. The `break` saves nothing: the SQL has
  no `LIMIT`, so every row is materialized first. Two indexes × automerge source
  only = 2 scans per pass.

### Open question: what schedules the passes

Not the batch loop. `_updateIndexes` re-schedules itself while `done === false`
([echo-host.ts:929](../../../packages/core/echo/echo-host/src/db-host/echo-host.ts)),
but every observed pass reports `done: true`, so that path is not firing. Nor is
it replication: the rate is flat at ~4/s through seconds where
`received subduction batch` **and** all `feed sync *` messages are zero. The
remaining registered triggers are `documentsSaved` (:342) and
`feedStore.onNewBlocks` (:312). Identify the actual driver before fixing —
the cheap wins below are worth having regardless, but they reduce the constant,
not the frequency.

### Reductions (independent of the driver)

1. Hoist the source read out of the per-index loop — `fts5` and `reverseRef`
   each call `getChangedObjects` against the same source
   ([index-engine.ts:264-298](../../../packages/core/echo/index-core/src/index-engine.ts)).
   Cursor sets differ per index, but one scan per `update()` can serve both:
   272 → 136 and 136 → 68.
2. Cache the heads table. `AutomergeHost` already learns heads via
   `documentsSaved`; hold a `Map<DocumentId, Heads>` invalidated on save rather
   than re-reading every row. Even a per-`update()` memo halves the remaining
   scans.
3. Push the diff into SQL — anti-join against `indexCursor` with a real
   `LIMIT`, replacing an O(N) scan plus O(N) JS diff with an indexed lookup.
4. `automerge_heads` has only the `document_id` primary key
   (`migrations/heads/0001_init.sql`) and no space column, so per-space
   incremental indexing needs a `space_id` column first.

## Spec: begin network activity only after boot

**Goal.** No replication traffic — subduction connect, edge WebSocket, feed
sync — is initiated until the worker has answered the tab's session handshake
and the client has reached ready. Turns the startup ordering from "sync and
boot contend for one thread" into "boot, then sync".

**Why it matters here.** The original capture shows the failure is an ordering
problem, not only a volume one: the worker saturates its thread from +5.58 s to
+23.71 s, misses the 15 s connect deadline at +17.36 s, and the edge WebSocket
only lands at +24.23 s — _immediately_ after the thread frees, i.e. the
handshake was itself starved by the work queued ahead of it. Deferring that work
past the handshake removes the contention regardless of how long hydration
takes.

**Definition of "booted".** The worker has served the tab's `start-session`
handshake and `WorkerService.start` has returned. This is the earliest point at
which a missed deadline can no longer be fatal, and it is already an explicit
event in `Worker.ts` — no new lifecycle concept is needed.

**Mechanism.** A single boot barrier owned by the worker runtime, awaited by
every outbound-connection initiator:

- Introduce one `Trigger`/promise (`bootGate`) resolved immediately after the
  session handshake completes.
- `SubductionSource` connection managers (`SubductionConnections.manageConnection`,
  `AdapterConnections.addAdapter`) await it before dialing. There is already a
  narrower precedent — the log line
  `deferring subduction connection until edge ws is ready` — so the deferral
  point exists; this generalizes its predicate.
- The edge client's WebSocket connect awaits it.
- Feed sync's first pull awaits it.

Local hydration (disk reads, index open) stays where it is — this change is
purely about _outbound_ work; Phase 2 covers the local cost.

**Bounding the deferral.** The gate must not become a new way to hang. Resolve
it on the earlier of (a) handshake complete, or (b) a ceiling (~5 s), and
resolve it unconditionally on handshake _failure_ so a broken tab cannot leave
the worker permanently offline. Log which arm fired.

**Acceptance.**

1. In a fresh-boot `app.log`, filtered to one `i`, the first
   `received subduction batch` / edge-connect line has a timestamp strictly
   after `worker-session opened`.
2. Time-to-handshake on the ~1,700-document reporting profile drops below the
   connect deadline with margin.
3. No regression in time-to-first-sync once booted (measure the delta from
   handshake to first batch, not from process start).

**Risks.** Sync latency grows by the boot duration, so the boot path itself must
stay fast — this composes with, and does not replace, Phase 2. A user opening a
second tab against a warm worker must not be gated again: bind the gate to the
worker runtime's lifetime, not per-connection.

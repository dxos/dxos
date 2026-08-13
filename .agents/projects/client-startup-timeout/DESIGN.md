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

# Mail sync performance — exploration & findings

Date: 2026-07-04
Status: exploration (no architectural changes committed yet)
Context: follow-up to the batched-commit + windowed-read work
(`2026-07-03-agentic-inbox-slices-1-2` era; Phase A/B of the mail-sync perf plan).

## Observed behavior (live run, real Gmail "all mail")

- Marginally more responsive during sync; data appears more incrementally; **no mid-sync crash**.
- Still sluggish — noticeably slower than expected.
- After all messages have visibly landed, the **sync indicator stays on** ("running and running"),
  then the tab **crashes: "Aw, Snap!" Error code 5** (Chrome renderer OOM / process kill).

So Phase A/B removed the *during-sync* crash and cut the per-second churn, but did **not** remove the
underlying unbounded main-thread growth or the long non-terminating tail.

## Instrumentation added this pass (to get real numbers next run)

All under `#region DEBUG`, so they strip with the rest in the plan's Phase C.

- **`[DEBUG SYNC] commit page`** — now carries a `totals` object with running grand totals and
  per-message averages: `{ pages, messages, wallMs, commitMs, upstreamMs, totalAppendMs,
  totalTagsMs, totalContactsMs, totalThreadMs, totalFlushMs, perMessageAppendMs, perMessageThreadMs,
  perMessageContactsMs, perMessageFlushMs, perMessageWallMs }`. `upstreamMs = wallMs − commitMs`
  isolates time spent *outside* commit (Gmail fetch + decode + HTML→markdown + map + extract).
- **`[DEBUG SYNC] summary`** (at Gmail completion) — `{ newMessages, totalThreads,
  totalThreadMembers, avgMessagesPerThread, timing, heapMB }`. Answers the requested totals:
  total messages, total threads, avg messages/thread, and the wall/commit/upstream split.
  `heapMB` uses `performance.memory` (main-thread only) — **if it logs non-zero, the sync pipeline
  is running on the main thread**; if zero/absent, it's in a worker.
- **`[DEBUG FEED] refresh`** (already present, kept) — `mode: full|delta|skip`, `objects`
  (the full retained `_objects.length`) vs the windowed rendered count. Watch `objects` climb to the
  total while the rendered window stays ≈100 — this is the memory smoking gun.
- **`[DEBUG READ] MailboxArticle render`** — rendered `messages` (≤ window) and `heapMB`.

How to read: `node scripts/query-logs.mjs` / grep `app.log` for `[DEBUG SYNC]` / `[DEBUG FEED]` /
`[DEBUG READ]`. The last `commit page` line and the `summary` line hold the grand totals.

## Root-cause analysis

### 1. Main-thread retains the ENTIRE decoded feed → the OOM (highest severity)

`FeedHandle._objects` (and `_objectCache`) hold **every** decoded message for the feed:
- optimistic `append()` pushes each committed page into `_objects` during sync, and
- a full refresh decodes the whole feed into `_objects`.

Phase B2 windowed **rendering** (`getResults().slice(-limit)`) and the derived maps, but the handle
still materializes and retains all N message objects (each with body text). For an all-mail sync
(tens of thousands of messages) this is the heap that OOMs the renderer. The window bounds the DOM
and per-render maps — **not** the retained object graph.

Confirm with: `[DEBUG FEED] objects` → N (total), `[DEBUG READ] messages` → ≈window, `heapMB`
tracking `objects`.

### 2. The sync pipeline appears to run on the main thread

Only `db.appendToFeed` / `db.flush` cross to the worker; the pipeline stages — Gmail fetch, base64
decode, **HTML→markdown (turndown)**, `mapToMessage`, `extractContacts`, `recordThreads` — run in the
invoking (React/main) context. turndown + extraction per message are CPU-heavy and block the UI,
and their working set lives on the main-thread heap. (The new `summary.heapMB` will confirm the
execution context; the `OperationInvoker` capability can be in-process or `ProcessOperationInvoker`.)

### 3. "Syncing forever" after visible completion

`syncing` is bound to the operation promise (`useTargetConnection.sync`). The Gmail source
(`gmailSource` → `generateDateRanges`) walks **every 7-day window from the cursor start up to today**
(`endDate = addDays(now, 1)`). After the real messages have landed, it keeps marching through the
remaining/covered windows, issuing Gmail `listMessages` round-trips that `dedupStage` then drops —
a long redundant tail during which memory keeps climbing, so the tab OOMs *before* the promise
resolves. Contributing factors to verify:
- The source doesn't stop at the last message actually returned; empty windows still cost a fetch.
- The timer trigger fires every 5 min (`useSyncTrigger` → `specTimer('*/5 * * * *')`); a re-trigger
  overlapping the tail would compound load. There is no per-binding "already running" guard.

### 4. O(n) per-tick derivations during sync

`buildThreadCounts` (O(threads)) and `buildMessageTagsIndex` (O(tags×messages)) rebuild on each
(debounced) index change. Across a full sync that's ≈ O(N² / pageSize) main-thread work. B4's
memoize+debounce bounds the *frequency*, but each rebuild still scales with the **total**, not the
window.

### 5. Thread index is one growing Automerge object

`ThreadIndex.index: Record<threadId, Ref<Message>[]>` grows to N refs across all threads in a single
object, mutated + `flush({ indexes: true })` every page. This is the core `flushMs` the plan flagged
as the next dominant cost after Phase A, and it grows with the whole mailbox.

## Recommendations (prioritized by impact / effort)

**P0 — Stop retaining the whole feed on the main thread (removes the OOM).**
Two complementary options:
- **(a) Bound `_objects`/`_objectCache` to an LRU window (+ pinned actively-resolved refs).** The
  reactive query only needs the window; `getObjectsById` (ref resolution) already lazy-loads and can
  cache with eviction. Smallest change that should stop the crash. Effort: M (echo-client; the handle
  is shared across query contexts — evict carefully). Impact: HIGH.
- **(b) Windowed reads at the source (worker).** Have the reactive feed query fetch only the newest-N
  from the queue (`limit` + `reverse`, already supported end-to-end and used by `readLatest`) instead
  of decoding the full feed into `_objects`. This is the "true" B2 — bound the data where it's read,
  not by slicing a fully-materialized array. Effort: M–L. Impact: HIGH. Pairs with (a).

**P0 — Don't optimistically append into an unbounded main-thread array during sync.** Sync writes go
to the worker and the reactive query re-reads; the optimistic full-array append is a growth vector.
With (b), drop or cap optimistic retention.

**P1 — Run the sync pipeline in the worker.** Execute the Gmail operation (or at least
decode/markdown/extract) off the main thread so the UI stays responsive and the sync's working set
isn't on the renderer heap. Effort: L (operation execution context / process invoker). Impact: HIGH
for responsiveness, MED for the OOM.

**P1 — Bound the "syncing forever" tail.** Stop the date walk at the last message actually returned
(don't march empty windows to today), and/or skip windows already covered by the cursor; add a
per-binding single-flight guard so the 5-min timer can't overlap a running sync. Effort: S–M.
Impact: MED (removes the perceived hang + wasted Gmail API calls).

**P2 — Thread index growth.** Maintain a counts-only summary (`threadId → count`) separate from the
ref lists, or shard the index; avoid `flush({ indexes: true })` per page where not required. Effort:
M. Impact: MED (attacks core `flushMs`).

**P2 — Incremental derivations.** Update thread counts / tag map incrementally from the
`recordThreads` side-effect instead of full O(n) rebuilds per tick. Effort: M. Impact: LOW–MED.

## Implemented (this pass)

Direction chosen: optimize main-thread execution (no worker-side pipeline), bound memory, bound the
sync tail, reduce flushes, keep the thread-index structure as-is.

- **Bounded main-thread feed retention (P0a) + source-side windowed reads (P0b).** `FeedHandle` now
  keeps at most `_retention` newest items (`_objects`/`_objectIds`/`_objectCache`), computed from the
  active queries' window limits (`registerWindow`), always finite and capped at `HARD_CAP_RETENTION`
  (2500) — an unbounded query contributes the cap rather than removing it. Full refreshes read only
  the newest `_retention` (reverse tail read), so the whole feed is never decoded on the main thread;
  the cursor is derived from the injected queue-position meta so delta polling still works. Optimistic
  append and delta merge trim to the window; trims are logged (`[DEBUG FEED] trim`), never silent.
- **Windowed the always-active navtree count query.** `app-graph-builder` computed the new-message
  badge by loading the *entire* mailbox feed reactively (defeating the retention bound and doing an
  O(feed) read on every render); it now queries a bounded newest-N window (`NEW_MESSAGE_COUNT_WINDOW`)
  and the badge saturates at that.
- **Bounded the syncing-forever tail.** Added a per-binding single-flight guard to the Gmail sync op
  so the 5-minute timer trigger can't start a second concurrent sync over the same feed while one is
  running (a likely cause of "running and running" + accelerated OOM). The source already resumes
  from the cursor's `internalDate`, so re-runs only walk from the last synced message forward.
- **Reduced per-page flush cost.** `SyncBinding.commit` now flushes durably per page without waiting
  for the indexer (the O(doc)-per-page, O(n²)-per-run cost); each mail/calendar sync op flushes
  indexes once at the end of the run for cross-run freshness. Crash-safety is unchanged (the cursor
  still persists per page; a crash re-runs the un-flushed page idempotently).

Known risk — position dependency of the windowed read:
- The windowed full read orders by queue position (`reverse + limit`, `NULLS LAST`). Locally-appended
  blocks are unpositioned until pushed to and pulled back from EDGE (the client feed store runs with
  `assignQueuePositions: false`), so on a *fresh load while a push backlog exists* the newest
  unpositioned messages can be excluded from the tail window until they are positioned. The live view
  is unaffected (optimistic append + delta cover the current session). This dependency is pre-existing
  (the shipped `readLatest` / dedup-seed reverse read relies on it); if it proves a problem, the
  windowed read can additionally fetch `unpositionedOnly` blocks and merge.

Deferred (documented, not done):
- **Truly incremental tag/thread derivations.** The tag index is keyed tag→messages, so building the
  message→tags view is O(total associations) however it's sliced, and safe thread-count reads need an
  O(threads) key snapshot. A real incremental win needs a `message→tags` reverse index (a structural
  change); for now the derivations stay memoized + debounced (bounding recompute *frequency*).
- **ThreadArticle** still loads all messages of the feed (bounded now only by `HARD_CAP_RETENTION`);
  it should resolve membership via `ThreadIndex` refs.

## Measured (from `app.log`, 2026-07-05 run) — why "no improvement"

Instrumentation confirmed live (`full-window` reads, retention `trim`, `delta` polls all present).
Findings from the run:

- **Sync never completes** (0 `gmail sync complete`; 2 fresh `cursorKey:0` runs) — still the long tail.
- **Main-thread heap sawtooths 273 → 1314 MB** (was 295 → 1391). Essentially unchanged → OOM risk
  remains. `messages` rendered is correctly bounded to 100, and `_objects` is bounded — so the feed
  data is NOT the heap driver.
- **`_objects` pinned at exactly 2500** (`HARD_CAP_RETENTION`): an unbounded reactive query on the
  mailbox feed (the app-graph `Filter.id` companion lookups / `ThreadArticle`) forces retention to the
  hard cap, not the intended ~100 window. So we retain 2500 decoded messages, not 100.
- **Per-page timing split (per message): flush ≈ 22 ms (45% of wall), upstream ≈ 22 ms (45%),**
  append/thread/tags ≈ 2 ms each (Phase A worked). Flush stayed expensive even after skipping the
  index wait — the cost is persisting the growing space doc, not indexing.
- **Render storm:** ~2268 `MailboxArticle` renders — it re-renders 6–12×/s during sync (every
  optimistic append + every feed poll), each allocating transient arrays → GC sawtooth.
- **The Gmail sync is an in-process `Operation`** (manual `invokePromise` path), so the entire
  pipeline — Gmail fetch, base64 decode, **turndown HTML→markdown**, mapping, extraction, commit —
  runs on the **renderer main thread**. This is the fundamental cause of both the UI lag and the
  renderer OOM. (The 5-min timer path runs a deployed function, i.e. off-thread, but the button the
  user clicks does not.)

Conclusion: the earlier work shrank the *rendered/retained data*, but the main thread is saturated by
(a) the sync pipeline's own CPU (turndown/extract, ~45%), (b) flush waits (~45%), and (c) a render
storm. Only (b) and (c) are addressable without moving the pipeline off-thread.

## Main-thread-safe fixes (this pass)

- **Batch flushes** in `SyncBinding.commit`: flush every `FLUSH_INTERVAL_PAGES` pages instead of every
  page (end-of-run indexed flush already persists the tail). Cuts the 45%-of-wall flush cost ~5×.
- **Coalesce feed `updated` → query recompute** in `FeedQueryContext`: throttle so a burst of appends
  + polls during a sync produces at most one recompute per window, collapsing the render storm.
- **Lower the retention hard cap** so the mailbox feed retains a few hundred, not 2500, decoded
  messages even when an unbounded companion query is active.

The remaining ~45% (turndown/extract on the main thread) cannot be removed without either moving the
pipeline to a worker/deployed-function or making the per-message CPU cheaper (e.g. defer HTML→markdown
until a message is actually opened, storing raw HTML in the feed). Flagged for a decision.

## Measured (2026-07-05, turndown-disabled run, 2010 messages)

With turndown off the sync got faster but still spun the fans + dropped frames. The logs show **the
whole sync is O(n²)** — per-message cost climbs as the mailbox grows:

| cumulative msgs | wall/msg | commit/msg | upstream/msg |
| --------------- | -------- | ---------- | ------------ |
| 250             | 63 ms    | 15 ms      | 48 ms        |
| 1000            | 82 ms    | 28 ms      | 55 ms        |
| 1500            | 104 ms   | 36 ms      | 68 ms        |
| 2000            | 154 ms   | 63 ms      | 91 ms        |
| 2250            | 167 ms   | 68 ms      | 99 ms        |

Marginal (per-page) upstream rose 47 → 200 ms/msg; marginal commit 17 → 180 ms/msg. Roots:

1. **Contact extraction (dominant, upstream):** `buildContactFromActor` ran
   `db.query(Filter.type(Person)).run()` **and** `Filter.type(Organization)` **per message** to dedup
   the sender — O(#contacts + #orgs) per message → O(n²). (The `resolve()` path already caches; this
   one didn't.)
2. **Thread-index write (commit):** `ThreadIndex.bind().addBatch` re-snapshotted `Object.keys(index)`
   over the growing record **every page** → O(#threads × pages) = O(n²).
3. **Flush** grows with the doc, **append** grew because raw HTML bodies (turndown disabled) are
   bigger than markdown. Both secondary.

## Fixed (this pass)

- **Contact lookup cached per run:** added `ContactLookup` / `buildContactLookup` (query Person + Org
  once); `buildContactFromActor` takes it and maintains it as it creates contacts.
  `EmailStage.extractContacts` is now a stage factory that seeds the lookup once per run → O(1) per
  message. `extractContact` without a lookup keeps the old (queried) behavior for one-off callers.
- **Thread-id set cached per run:** `ThreadIndex.bind` snapshots `Object.keys` lazily once and
  maintains the set in place; `recordThreads` reuses one accessor for the whole run → O(#threads) once
  instead of per page. (Sound because sync runs are single-flight and readers don't share the accessor.)

Both convert O(n²) → O(n). Post-fix run (2842 msgs) confirmed: upstream 91→5 ms/msg (flat), thread
22→0.65 ms/msg (flat). Bottleneck then moved to **append (55%, raw-HTML bodies)** and **flush (36%)**.

- **Dropped the mid-run flush entirely** (`SyncBinding.commit` no longer flushes; each op flushes once
  with indexes at run end). Rationale: with the contact lookup cached, nothing within a run needs
  persisted/indexed space-db state — the feed append is separately durable per page, dedup uses the
  feed-seeded + in-memory set, and the UI observes tag/thread mutations via in-memory reactivity.
  Re-serializing the growing doc every few pages (36%, O(n²)) is pure waste now. Trade-off: a crash
  mid-run loses that run's cursor advance + space mutations; the feed messages persist, so the next
  run re-fetches from the last persisted cursor and re-applies side effects idempotently.

## Measured (2026-07-05, post-fixes) — remaining lock-up

Two more root causes found and fixed via the console/`app.log` timeline:

- **Empty-state logic bug (the "30s to first message").** `MailboxArticle`'s `isEmpty` effect keyed on
  `[messages]` (identity changes every update) with an always-1s-delayed setter, so during a sync the
  timeout was cleared before it fired — latching `isEmpty=true` (showing `InitializeMailbox`) while
  messages streamed in. Fixed: key on `messages.length`, set `isEmpty=false` immediately when any
  messages are present, only debounce the *empty* state. Messages now appear ~1–2s into a sync.
- **Per-commit change storm** (tags: ~20 `Obj.update`s/page → 1 via `TagIndex.setBatch`; plus a
  post-append macrotask yield) — cut the reactive fan-out during commit.

**Remaining bottleneck (NOT yet fixed — benchmark first):** the sync still degrades to a crawl and
"locks up" around ~2,500 messages, but it is **not memory** (heap ~400MB) and **not the plugin's
commit work** — with the batching/cache fixes, `tags`/`thread`/`contacts`/`upstream` are all **flat**.
The one component that goes **O(n²) is `db.appendToFeed`**: ~58ms/page early → **~18,000ms/page** by
msg ~2,600. `appendToFeed` awaits the worker over RPC, and the worker is progressively saturated
processing + EDGE-replicating the ever-growing space (tag/thread/contact indices + the feed) — the
final minute shows the RPC channel flooded (~550 `sending`/`received`) and a `DatabaseImpl` context
leak (301+ `derive` callbacks, growing). So the feed-append RPC starves behind replication traffic.
This is core (echo-host worker/replication), not the plugin.

## Benchmarking TODO (confirm before changing core)

1. **[TOP] Confirm the `appendToFeed` O(n²) is worker-RPC-wait / replication saturation.** Instrument
   `appendToFeed` to split client-side time vs worker-RPC wait, and log the worker RPC-queue depth +
   the `DatabaseImpl` dispose-callback count over the run. Benchmark a full sync and confirm the
   18s/page is RPC-wait growing with space size (not client-side). Only then decide between: defer
   index-building out of the hot path, throttle feed→EDGE replication during bulk sync, or fix the
   context/derive leak. (Owner finding: 2026-07-05 run — commit O(n²) localized to `append`.)

## Suggested next step

The OOM is the blocking issue. Recommend prototyping **P0(a)** first (bound `_objects`/`_objectCache`)
as the smallest change that should stop the crash, then re-measure with the new `[DEBUG SYNC] summary`
+ `[DEBUG FEED] objects` numbers to decide whether **P0(b)** (source-side windowing) and **P1**
(worker-side sync) are still needed. The `summary.heapMB` / `timing.upstreamMs` from the next run will
tell us how much of the cost is main-thread pipeline vs commit vs Gmail latency, and confirm the
execution context.

## Benchmark harness results (2026-07-05, Stages 1–6)

We built a repeatable, account-free benchmark (plan `zazzy-humming-blum`):
- `GoogleMailApi` Context.Tag service (Live = real HTTP; `mock` = in-memory dataset honouring the
  `after:`/`before:` window + pagination) — `services/google-mail-api.ts`.
- `generateGmailDataset({ count, seed, start, end, ... })` deterministic generator — `testing/gmail-fixtures.ts`.
- Real-ECHO-db unit test driving `runGmailSync` against the mock — `operations/google/gmail/sync.mock.test.ts`.
- OTEL spans across the stack (`gmail-sync` root, `.labels`, `.fetch.list/.message`, and per-commit-phase
  `sync.commit.{appendToFeed,paintYield,tags,contacts,sideEffects,advanceCursor}` + `seedDedupSet`),
  captured by an in-memory harness — `testing/otel-harness.ts`.
- Gated benchmark (`DX_BENCH=1 … sync.bench.test.ts`) that aggregates per-stage / per-message durations.

**Confirmed LOCAL bottleneck (in-process harness).** Per-message ms by stage, n = 1000 / 3000 / 6000:

| stage                       | n=1000 | n=3000 | n=6000 |
|-----------------------------|-------:|-------:|-------:|
| gmail-sync (root)           |   8.51 |  15.23 |  47.87 |
| sync.commit                 |   8.09 |  14.99 |  47.57 |
| **sync.commit.paintYield**  | **5.26** | **11.0** | **41.2** |
| sync.commit.appendToFeed    |   1.12 |   1.46 |   2.32 |
| sync.commit.tags            |   0.75 |   1.38 |   2.41 |
| sync.commit.sideEffects     |   0.47 |   0.72 |   1.17 |
| sync.commit.contacts        |   0.41 |   0.36 |   0.39 |
| map-to-message / dedup / decode / fetch / extract-contacts | flat | flat | flat |

The post-append macrotask yield (`paintYield`) dominates and is clearly **O(n²)** (~8× per-message for
6× data). It absorbs the reactive/automerge cascade scheduled by the previous page's space-db
mutations — re-serializing the growing space document, whose growth is driven by the **single**
`TagIndex` and `ThreadIndex` objects that accumulate one entry per message and are `Obj.update`-d
**every page** (≈ `2 × pages × O(doc)` = `O(n²/pageSize)`). The synchronous `tags`/`sideEffects`
spans grow the same way but are an order of magnitude smaller than the async fallout in `paintYield`.
Everything the earlier stages fixed (contacts cache, tag/thread batching, dedup, decode, fetch) is flat.

**Fidelity caveat (unchanged).** This in-process harness does NOT reproduce the client→worker RPC /
EDGE-replication contention that caused the real-app 18s `appendToFeed` — that needs the real app or a
harness with a replication target. The local `appendToFeed` growth here (1.1→2.3 ms/msg) is mild; the
real production stall lives in the replication channel and remains tracked as the TOP item above.

**Stage 6 optimization — decision point.** The measured local fix targets the growing-single-doc index
updates (reduce `O(n²/pageSize)`): options are (a) batch `TagIndex`/`ThreadIndex` writes across K pages
(decouple index writes from the per-page feed append; feed stays incremental, indices re-apply
idempotently on re-sync), (b) larger commit pages (bounded by the ≤15 atomic-queue-insert invariant),
or (c) an ECHO-level change so per-message index data isn't a single re-serialized doc. Each carries a
UX/crash-consistency trade-off, and none addresses the production worker/EDGE cost — so the direction
is a checkpoint rather than an autopilot change.

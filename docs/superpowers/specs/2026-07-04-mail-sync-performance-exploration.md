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

## Write-path root cause + open items (2026-07-05, isolation probes)

Isolation micro-benchmarks (gated `DX_PROBE`, in `plugin-inbox` + `echo-client`) pinned the growing
factor to **index writes**, not the feed:

- **`db.appendToFeed` is O(1) in isolation** (flat ~1ms/page to 4800+ items). Queue append does not
  rewrite the tail. So the real-app 18s append is *purely* cross-thread worker/EDGE contention.
- **`Tagging.setBatch` grows with index size**: single shared tag (growing array) is linear/page →
  O(n²); distinct keys (growing record) is far worse (7→97→446ms at 600→1200 keys).

**Root cause (confirmed by sub-step breakdown, `echo-client/src/echo-write-breakdown.test.ts`):** an
ECHO array `.push(x)` is not a plain mutation — the reactive proxy turns *each* call into its own
automerge change (`arrayPush → core.change → A.change`), and each change re-accesses the growing array
(O(N)). A loop of K single-element pushes into an N-array is **O(K·N)**; a single `push(...K items)` is
one change (O(N) once). Measured at N=3600: 10× single pushes = 16.6ms vs one batched push = 2.0ms
(≈ raw automerge). Empty change is flat (~0.06ms) and raw automerge push is near-flat, so it's neither
the change machinery nor automerge — it's one-change-per-element × array re-access. `TagIndex.setBatch`
compounds this with an `index[tagId].includes(objectId)` membership scan (O(array)) per entry.

**Fix (schema-level, targeted):** in `TagIndex.setBatch` / `ThreadIndex.addBatch`, group entries by
key, dedup against an in-memory `Set` (not `.includes` on the proxy), and append with one
`index[key].push(...newIds)` per key per page. Keeps in-place append (no DX-984 history blow-up — still
K ops, not a spread-replace), turns K changes into 1 and K O(array) scans into O(1) lookups.

**ECHO-level follow-up (LATER — bigger scope, not yet scheduled):** coalesce consecutive array-proxy
mutations within a single change context (`executeChange`/`batchEvents`) into one `core.change` instead
of one change per `.push()`. Today `batchEvents` only batches reactive *notifications*, not the
underlying automerge changes. Fixing this at the proxy layer would remove this O(K·N) class everywhere
(every `for … push` loop inside an `Obj.update`), not just in the two index types. Candidate ECHO
issue; measure the `core.change` open/finalize overhead as part of scoping.

**Still open / not fully attributed (close by re-measuring after the schema fix):**
1. **`paintYield`'s full-sync magnitude** — in isolation the async drain was flat, so the full-sync
   growth (5→41 ms/msg) is only *plausibly* the async tail of the same index writes. Not directly
   isolated; could include reactive-subscriber fan-out.
2. **`appendToFeed`'s mild full-sync growth** (1.1→2.3 ms/msg) contradicts the flat isolation result —
   unexplained; likely secondary (heap/GC pressure, or larger real Message objects), not a dominant term.
3. **`DatabaseImpl` dispose-callback accumulation** — the "Context has a large number of dispose
   callbacks (this might be a memory leak)" warning fires even in the isolated probe. Callbacks that
   accumulate over the run and fire per change would be a genuine growing factor; unexplored suspect,
   matches the real-app forensics ("derive callbacks growing").

**Next step:** apply the schema-level batched-append fix and re-run the primitives + full-sync
benchmarks. If `tags`/`sideEffects`/`paintYield` all flatten, the index writes explained them; whatever
growth survives isolates items (1)/(3) above for separate work.

## `appendToFeed` growth — resolved: not a real growing factor (2026-07-05)

Chased the one contradiction (isolation flat, full-sync span grew ~1.1→2.3 ms/msg). Built three
isolation variants (`plugin-inbox/.../sync-primitives-bench.test.ts`): appendToFeed with (a) minimal
messages, (b) realistic 800-char bodies, (c) interleaved with the real heavy `Tagging.setBatch` churn
(per-element pushes on a growing array + the growing space doc). **All three stay flat (~1–2 ms/page,
no upward trend) to 5400+ items.** Confirmed by reading `FeedHandle.append`: the working set is bounded
(`[...this._objects, ...items]` + `_trimToRetention()` cap at 500) and `insertIntoQueue` is O(1).

Conclusion: **`appendToFeed` is O(1) per page — not a growing factor.** The apparent growth in the
full-sync OTEL bench is a **measurement artifact**: the span wraps `Effect.promise(() =>
appendToFeed(...))`, an async await point, so it absorbs the growing *event-loop backlog* (the deferred
automerge persistence + reactive callbacks from the O(N²) index writes) that piles up as the run
progresses — the same backlog that dominates `paintYield`, just a smaller share landing here. It is a
*symptom* of the index-write O(N²), not an independent bottleneck. (The ~10× constant gap vs isolation
is richer real messages — sender Refs, foreign-key meta — plus Effect overhead; constant, not growing.)

Updated open-items status:
1. `paintYield` magnitude — still the async tail of the index writes (now corroborated: append's growth
   is the same backlog-absorption effect). Confirm it collapses once the index-write fix lands.
2. `appendToFeed` growth — **RESOLVED** (measurement artifact; append is O(1)).
3. `DatabaseImpl`/`QueryServiceImpl` dispose-callback accumulation (301-cap warning) — fires even in the
   isolated probes, yet append stayed flat there, so it is NOT inflating append. Remains an unexplored
   suspect for `paintYield`; a genuine leak worth its own look, but not on the append path.

Net: the ONLY confirmed super-linear factor in local sync is the index writes (`TagIndex`/`ThreadIndex`
one-change-per-`.push()` × O(array), + O(array) `.includes` dedup). Everything else is flat or a
downstream measurement of that backlog.

## CPU profile — the REAL dominant factor: `Repo.handles` O(N) lookups (2026-07-05)

OTEL spans only cover instrumented + `@trace` calls; they cannot see GC, deferred automerge
persistence, or host-side storage work (it runs between spans). A CPU sampling profile of a full sync
(`sync-cpu-profile.test.ts`, `node:inspector` Profiler, self-time by function) shows what actually
holds the thread, n=4000 → 2670 synced, 52s wall:

| self-time | function |
|--:|---|
| **30%** | **`get handles` — `@automerge/automerge-repo/Repo.js:383`** |
| 13% | `run` (Effect fiber loop / wasm) |
| 4%  | `(garbage collector)` |
| ~8% | automerge wasm (BTreeMap insert, string build, malloc, assign) |
| 2%  | `SchemaClass` / `Schema.make` |
| ~1% each | base-x encode, sha256, `echo-handler` get/decode, `TagIndex.ts:108` (~390ms) |

**`Repo.handles` is a getter that rebuilds a fresh object over ALL cached handles (`for … of
Object.entries(this.#queries)`) — O(handles) per access.** echo-host indexes into it for *single*
lookups: `this._repo.handles[documentId]`. Confirmed callers, attributed from the profile's call tree
(self-time inside `get handles`): **`getHeads` (`automerge-host.ts:757`) — 5.5s (dominant)**,
`_afterSave` (`:669`, fires after every SQLite chunk commit) — 1.5s, and `getHandleState`
(`handle-state.ts:47`) — 0.16s. Each call is O(total handles); handles grow one-per-document as the
sync writes objects → **O(N²)**, and together they are the 30%.

**This supersedes the earlier "index writes dominate" conclusion.** The `TagIndex`/`ThreadIndex`
per-`.push()` cost is real but minor (~390ms / <1%); the dominant local O(N²) is `Repo.handles`.

**This also unifies the local harness with the real-app forensics.** In-process (test) the O(N²)
`repo.handles[id]` work runs on the main thread → shows as `get handles` 30% self-time and inflates the
`appendToFeed`/`paintYield` await points (they sit behind the growing per-save storage work — exactly
"something else is slowing them down"). In the real app echo-host runs in a **worker**, so the same
O(N²) runs there: the client's `appendToFeed` RPC waits on the saturated worker → the observed 18s
stalls, and unbounded handle accumulation → the OOM. Same bug, two vantage points.

**Fix direction (core, high-impact):** give automerge-repo `Repo` an O(1) handle accessor (direct
`#queries[id]?.handle` / `getHandle(id)`) and migrate the echo-host call sites (`_afterSave`,
`getHandleState`, `flush`, `getHeads`) off `repo.handles[id]` / `Object.keys(repo.handles)`. This
targets the actual production bottleneck, unlike the plugin-level index-write fix (still worth doing,
but secondary). Also investigate whether handles should be bounded/evicted (the OOM + "301 dispose
callbacks" warning suggest unbounded growth).

## After the getHandle fix — the NEXT (now dominant) O(n²): subduction storage reads (2026-07-05)

The `getHandle` O(1) fix removed the `repo.handles` factor: full-sync root per-message dropped 47.9 →
27.5 ms/msg at n=6000 (−43%), `paintYield` 41 → 21 (−48%). But it's still super-linear (`paintYield`
4.3→7.4→21.3; `tags` 0.69→2.42), so more remained.

Ranked functions by **per-message self-time growth** (CPU profile at n=1500 vs n=6000; a linear function
is flat per-message, a super-linear one rises) — the entire top of the list is the storage/compaction
path:

| growth (per-msg) | function |
|--:|---|
| 198× | `wasm-function[806]` (automerge-subduction wasm — compaction) |
| 103× | `sqlite-storage-adapter.ts:174` (`loadRange` row map) |
| 96× | `interpretAsDocumentId` (automerge-repo) |
| 95× | `CommitWithBlob` (automerge-subduction wasm) |
| 66× | `loadAllCommits` (automerge-repo `subduction/storage.js`) |
| 43× | `toUint8Array` (`sqlite-storage-adapter.ts:165`) |

**Quantified with a `loadRange` counter (env-gated, then reverted), 4× the messages:**

| metric | n=1500 (1003 synced) | n=6000 (4013 synced) | growth |
|---|--:|--:|--:|
| `loadRange` calls | 2,344 | 258,792 | **110×** |
| rows loaded | 1,245 | 1,376,449 | **1,105×** |
| rows / synced msg | 1.24 | 343 | 277× |

So 4× the data → **110× the SQLite reads, 1,100× the rows**. `loadAllCommits` (called only by the
subduction **wasm** compaction — no JS caller) re-reads a document's entire persisted commit+blob set
(`loadRange` → SQL over all chunks + `toUint8Array` per row) via `CommitWithBlob`, and the wasm invokes
it a super-linearly growing number of times as the sync progresses. `#saveNewCommits` (the JS save
path) is already incremental (O(new), with an explicit anti-O(n) comment), so the non-linearity is the
**compaction reloading the growing persisted commit set repeatedly**, not the doc-side save.

**Root cause (remaining):** subduction/sedimentree compaction re-reads all persisted commits of the
growing feed/space documents from SQLite on a super-linear schedule → O(n²)+ storage work. This is the
dominant driver of "sync gets slower the more it syncs" after the handle fix.

**Fix direction:** the real fix is in the **automerge-subduction Rust/wasm fork** — make compaction
incremental (don't reload the full commit set per pass) / cache the sedimentree state in memory. The
wasm's Rust source is not in this repo (it ships as a prebuilt wasm dependency), so it is out of reach
of a JS/TS patch here. A JS-side *mitigation* worth measuring: a read-through cache in
`sqlite-storage-adapter.loadRange` (keep chunks in memory keyed by prefix) — that removes the SQLite +
`toUint8Array` cost (the `sqlite-storage-adapter` frames, ~77 µs/msg) but not the wasm compaction's own
O(n²) work or the JS↔wasm call overhead from 258k calls. Full linear scaling needs the fork change.

## Measurement: storage read-through cache (temporary, reverted) — a dead end (2026-07-05)

To attribute the residual O(n²) between SQLite I/O and the subduction wasm, added a temporary
read-through cache to `SqliteStorageAdapter.loadRange` (incrementally maintained on save/remove;
single-writer adapter → authoritative). Result:

- **SQL reads collapsed**: rows loaded from SQLite 1,376,449 → 3,193 (430×↓), 98.1% cache hit rate,
  ~0.8 SQL rows/msg (flat/linear). So the cache works exactly as designed and the SQLite layer is no
  longer doing super-linear work.
- **But top-level sync got slightly WORSE**, not better — root per-message n=6000: 27.5 → 36.6 ms.
  The cache traded SQLite I/O for resident memory + per-save maintenance, and the actual bottleneck was
  never the SQL.
- **The re-profile proves it**: with SQLite eliminated, the entire top of the per-message-growth ranking
  is now the **automerge-subduction wasm** (`wasm-function[806]` 444×, `CommitWithBlob`,
  `getArrayU8FromWasm0`, `_assertClass`, `makeMutClosure`, `__wrap`…) plus `loadAllCommits` (104× — the
  JS that re-constructs a `CommitWithBlob` for every chunk on each call). `loadRange` was still *called*
  380k times (98% served from cache) — the wasm's O(n²) call frequency is unchanged.

**Conclusion:** a storage-layer cache is NOT the fix — the SQL was a symptom. The fundamental O(n²) is
the subduction/sedimentree **compaction reprocessing the growing commit set** (wasm, reached via
`loadAllCommits` re-reading all commits, called a super-linearly growing number of times). The only
real lever is the **automerge-subduction wasm compaction** (make it incremental / stop reprocessing the
full set per pass) — whose Rust source is not in this repo. Cache reverted.

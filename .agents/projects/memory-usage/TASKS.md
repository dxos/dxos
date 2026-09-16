# Composer Memory Usage — Tasks

_Resume: Phase 4 idle-churn sites S1-S4 fixed/investigated (see below). S1 landed in #12561 (trigger-list subscription); S3 upgraded from backoff to a real streaming RPC in #12580; S2 likewise upgraded from backoff to a real streaming RPC in this pass. Sequencing still open — verify decommit with `scripts/memory/soak.mjs` once this lands. Phase 3 continues opportunistically. Uncommitted: none._

**Target: 300–400 MB resting footprint for an idle tab, 500 MB ceiling.**
Composition model and measurement rules: DESIGN.md. Industry comparison:
RESEARCH.md.

## Phase 1: Measurement — complete

- [x] CDP harness: per-context heap with forced GC, per-process RSS,
      `memory-infra` dumps, heap-snapshot aggregation and constructor diffs,
      retainer paths, boot census with coverage + sourcemap attribution,
      persistent-profile mode for returning-tab runs.
- [x] Baselines per serving mode: dev ~330 MB total heap, production ~122 MB
      at fresh boot; both flat over idle soaks.
- [x] Plugin-tier curve: barebones / minimal / full differ by ~150 MB RSS —
      the floor is core, not plugin count.
- [x] Ledgers for the reported tab, from user-captured traces and snapshots:
      1,444 MB (DevTools open), 1,887 MB (mailbox open), fully attributed.
- [x] Harness landed at `packages/apps/composer-app/scripts/memory/` with a
      README covering which quantity each tool measures and what must be held
      constant between runs.
- [x] Native app: `native-soak.mjs` samples the installed macOS app's
      WebContent/GPU/Networking footprints and dirty-memory categories, and
      the Tauri host logs the same series once a minute to
      `~/Library/Logs/org.dxos.composer.<channel>/memory.ndjson`. WKWebView
      exposes no JS heap, so process footprint is the only trajectory.

## Phase 2: Data-proportional retention

Memory should scale with what a user has open, not with a multiple of it.

- [ ] Feed/query payload retention (Linear DX-1148): `FeedObjectCore` keeps
      canonical JSON per live feed object; `IndexQuerySource` keeps
      `documentJson` per reactive result; the host keeps its own result set.
      Each large message is resident 4–5 times with a mailbox open.
- [ ] Automerge doc handles are never evicted; a large space loads every doc.

## Phase 3: Code residency

Nothing should be resident because of how it was imported. See DESIGN.md
finding 2 — barrels and module-scope imports of lazily-used values.

- [x] Onboarding hero image: 424 KB base64 module → `?url` asset.
- [x] emoji-mart + database (483 KB): lazy panel behind the picker.
- [x] Mermaid grammar (164 KB): language and highlight style load on the first
      mermaid fence.
- [x] bip39 (185 KB): loads with identity creation/recovery.
- [x] AI session runtime (MCP SDK, ajv, zod, Anthropic client — 286 KB): schema
      modules import the runtime lazily; consumers use per-namespace subpaths.
- [x] ML runtime (transformers + onnxruntime, 738 KB): loads with the NER
      model.
- [x] EVM client (viem, ox, abitype, x402 — 498 KB): loads on first payment.
- [x] Welcome screen (~25 KB on a returning tab): surface keys and overlay
      style split out; screen loads when its dialog renders.
- [x] `chart.js` (146 KB): the devtools TimeSeries panel is re-exported from
      the panels barrel but never rendered; it now loads lazily.
- [ ] `fast-check` (94 KB) — a property-testing library with no identified
      legitimate importer in the boot path.
- [x] `@dxos/assistant-toolkit` participates in the `dxos-subpath-imports`
      lint rule, with per-namespace exports rather than aggregate barrels.
- [ ] Extend the subpath lint across the remaining `@dxos` packages (the
      rule's own TODO); each addition needs its exports map split per
      namespace first.

## Phase 4: Idle churn

An idle tab issues ~51 SQLite statements per second. The churn keeps allocator
pages committed, which is the largest single slice of the composition model
(~380 MB per GB including V8 headroom). The win appears in footprint (RSS), not
in heap-used, so measure with `scripts/memory/soak.mjs` rather than a snapshot.

### Sites — what actually ticks

Four independent loops. Each needs its own decision; they do not have to be
fixed the same way.

- [x] **S1. `TriggerDispatcher` fires at 1 Hz with no triggers defined.**
      `compute-runtime/src/triggers/trigger-dispatcher.ts`: `livePollInterval`
      defaults to 1 s (~line 300), `_startNaturalTimeProcessing` repeats
      `invokeScheduledTriggers` on `Schedule.fixed` (~line 921), and each tick
      also runs an ECHO `Filter.type(Trigger)` query. Started by plugin-routine,
      a core plugin, so every tab pays it. **Partially fixed, toward R1:**
      `start()` now subscribes once to a live `Filter.type(Trigger)` query
      (`#subscribeToTriggers`); `refreshTriggers`/`_fetchTriggers` read the
      subscription's cached `results` instead of re-querying the database, so
      the trigger-list lookup no longer issues SQL when the trigger set hasn't
      changed. This is only the "subscription" half of R1 — the tick itself
      still fires every second (`TriggerDispatcher.invokeScheduledTriggers`
      still queries feed and subscription trigger data on each tick, and cron
      due-time checks still run on the fixed schedule). The full R1 — no timer
      while the working set is empty, sleep to the next due time otherwise —
      would additionally need to skip firing altogether when idle, a larger,
      riskier change to feed/subscription trigger semantics, left as a
      follow-up if further gains are wanted.
- [x] **S2. Every subscribed feed polls at 1 Hz.**
      `echo-client/src/feed/feed-handle.ts` (`beginPolling`): one timer and one
      refresh RPC per feed handle, so cost scales with feeds open (a mailbox
      is the common case). **Superseded by a real streaming RPC (R1, not
      R2):** the initial no-change-backoff polling (landed in #12561) has been
      replaced by `FeedService.subscribeFeed`, a genuine `stream: true` RPC —
      `LocalFeedServiceImpl` (`echo-host`) pushes a fresh query snapshot on
      subscribe and again whenever `FeedStore.onNewBlocks` fires and the
      recomputed snapshot actually differs (string-compared against the last
      one sent, since this payload is real object content rather than
      `subscribeSyncState`'s small aggregate count — suppressing unchanged
      snapshots server-side matters more here); `FeedHandle.beginPolling`
      consumes it via `subscribeStream` instead of any client-side timer, and
      shares the same decode/upsert/diff logic as the still-present one-shot
      `refresh()` path. The two `subscribeX` RPCs' identical
      recompute-on-`onNewBlocks`-and-coalesce logic is factored into
      `LocalFeedServiceImpl#recomputeOnNewBlocks`, parameterized by a compute
      function and a change comparator. Verified end-to-end in
      `echo-host/src/db-host/feed-service.test.ts` (initial snapshot + a
      second push after a local write). R4 (visibility gating) was considered
      but deferred — orthogonal, applies to all four sites, better done as one
      pass. Same `onNewBlocks`-is-unscoped caveat as S3 applies here too (see
      the S3 entry's note) — this subscription also recomputes on any space's
      write, not just its own.
- [x] **S3. Each open space polls sync state at 2 s.**
      `echo-client/src/proxy-db/database.ts` (`FEED_SYNC_POLL_INTERVAL`):
      aggregates block backlog across namespaces via a real per-namespace
      `FeedService.getSyncState` RPC (SQLite `COUNT(*)` server-side); started
      unconditionally per open space by `plugin-client`'s
      `space-replication-progress.ts`. **Superseded by a real streaming RPC
      (R1, not R2):** initial no-change-backoff polling (landed in #12561) has
      been replaced by `FeedService.subscribeSyncState`, a genuine
      `stream: true` RPC — `LocalFeedServiceImpl` (`echo-host`) pushes a fresh
      snapshot on subscribe and again whenever `FeedStore.onNewBlocks` fires
      and the recomputed state actually differs; `DatabaseImpl.subscribeToSyncState`
      consumes it via `subscribeStream` instead of any client-side timer.
      `onNewBlocks` fires on local writes too (`appendLocal` delegates to
      `append`, which emits it), so this covers both push and pull backlog
      changes (local writes and completed sync pulls); the freshness ceiling
      is `FeedSyncer`'s own internal poll cadence against EDGE (5-10 s,
      unrelated/pre-existing — the remote-availability leg genuinely can't be
      push-based without a further sync-protocol change, out of scope here).
      Verified end-to-end in `echo-host/src/db-host/feed-service.test.ts`
      (initial snapshot + a second push after a local write, direct against
      `LocalFeedServiceImpl` — the higher-level `EchoTestBuilder` topology
      stubs `getSyncState` to always-empty when no `FeedSyncer` is wired, so a
      client-level test can't observe real backlog values). Noted but not
      fixed here: `space-replication-progress.ts` re-subscribes per space on
      every `client.spaces` emission with no de-dupe, which can spawn
      duplicate subscriptions per space over a session — worth its own
      follow-up. Also noted: `FeedStore.onNewBlocks` is unscoped (fires for
      any space's write), so every active `subscribeSyncState` subscription
      recomputes its own namespace counts on each signal regardless of
      relevance — still cheaper than the fixed-interval poll it replaced
      (which recomputed unconditionally every 2 s), but a per-space-scoped
      event would cut it further; needs a `FeedStore` change, not just this
      RPC, so left as a follow-up alongside the de-dupe note above. Separate
      PR from the initial S1-S4 pass (#12561).
- [x] **S4. Query re-execution amplifies every tick.** `echo-host`'s
      `QueryService._executeQueries` re-runs each dirty reactive query per
      invalidation hint; the loops above generate hints, which is what turns
      three timers into the observed SQL fan-out. **Investigated, no code
      change:** `matchesHint`/`extractScopes` (`query-executor.ts`) already do
      real per-dimension filtering, not a broad type/space-only match, and are
      covered by extensive regression tests (DX-966 canonicalization, id-rooted
      relation traversal) — tightening further is a speculative change to the
      invalidation core for unclear benefit. More importantly, S1's
      `_fetchTriggers().run` was a one-shot query (`ActiveQuery.firstResult`),
      unconditionally dirty regardless of any hint — `matchesHint` was never
      in the amplification path for it, so R5 targets the wrong layer. With
      S1-S3 no longer generating spurious ticks/RPCs on an idle tab, S4's
      observed fan-out should fall away as a consequence rather than needing
      its own fix. Separately noted (not actioned): `query-service.ts` has a
      standing TODO that an idle Composer registers ~80 queries with only ~10
      unique — a dedup opportunity independent of this phase.

### Remedies — options to evaluate per site

Independent of each other; some sites may want none, one, or several.

- [~] **R1. Event-driven scheduling.** Replace a fixed tick with "wake when
  there is something to do": no timer while the working set is empty, and
  sleep to the next due time otherwise. Fits S1 directly. Needs a
  subscription so work arriving while idle still starts, and care around
  clock changes. Partially done for S1: the trigger-list subscription
  landed (no more per-tick DB query), but the tick itself still fires at a
  fixed 1 Hz — "no timer while idle" is not yet implemented.
- [x] **R2. No-change backoff.** Widen the interval while a poll keeps
      returning nothing (e.g. 1 s → 5 s → 30 s), reset on change or local
      write. Interim fix for S2 and S3 while a real streaming RPC was out of
      scope; both have since been upgraded past it (see below), so this
      remedy is fully superseded — kept `[x]` as a record of what shipped
      first, not as an open remedy.
      **Superseded for S2 and S3**: both were upgraded from backoff to a real
      streaming RPC (`FeedService.subscribeFeed`, `FeedService.subscribeSyncState`)
      — see their entries above; R2 no longer applies to either.
- [x] **R3. Coordinated scheduling.** One scheduler batching all due work into
      a single round-trip instead of N independent timers. Moot for S2 and
      S3 now that both push independently instead of polling on any
      schedule — there's no timer left to coordinate.
- [ ] **R4. Visibility gating.** Pause or stretch while `document.hidden`,
      resume on `visibilitychange`. Applies to every site, and is the cheapest
      change, but only helps background tabs. Note the client worker keeps
      running, so the gate belongs where each loop is owned.
- [ ] **R5. Narrower invalidation.** Tighten `matchesHint` for common query
      shapes so a tick re-runs fewer queries. Addresses S4 without changing any
      timer.
- [ ] **R6. Push over poll.** A persistent connection where EDGE notifies on
      change, so an idle tab does no work at all. Still open: what S2 and S3
      shipped is push from the local `echo-host` to the client
      (`FeedStore.onNewBlocks` → a streaming RPC), which eliminates client-side
      polling entirely, but the _pull_ leg — EDGE notifying `echo-host` of
      remote changes, rather than `FeedSyncer`'s own poll cadence against it —
      is the larger, still-unimplemented half of this remedy. Lands with
      feed-live-objects stage 4 rather than here.

### Sequencing

- [ ] **Measure first.** Attribute allocation rate per site (disable each in
      turn, sample) so remedies are chosen against data, not code size.
- [ ] **Then decide per site**, recording the choice and its cost here.
- [ ] **Verify decommit after each change**: renderer RSS should trend toward
      live size at idle rather than plateauing at the high-water mark. Chrome
      decommits lazily, so allow minutes.

## Phase 5: Wasm and native

- [ ] Inventory the 10 wasm instances (8 worker, 2 main thread) and why each
      context instantiates them.
- [ ] Remove the main-thread automerge instance, or justify and bound it.
- [ ] Instantiate occasional-use wasm on demand in a terminable worker; wasm
      linear memory never shrinks.

## Phase 6: Execution cost of core code

The open architectural question. ~13 MB of executed JS costs ~150 MB of V8
state, much of it built at module-init time (Effect contexts, schema classes).

- [ ] Measure what schema/layer construction contributes at boot.
- [ ] Assess whether that construction can be deferred to first use.

## Fleet-wide memory metrics (contract with `sdk-metrics`)

Added by the [`sdk-metrics`](../sdk-metrics/TASKS.md) project, which exports these to
SigNoz from every client. This project measures memory on one machine; those series make
the same numbers observable across the fleet, so the 300-400MB resting target becomes
verifiable in production rather than locally. Recorded here so both projects read the
same series — agree any change before a dashboard or alert is built on them.

| Series                                                           | Unit | Notes                                                            |
| ---------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `dxos.client.runtime.heapUsed` / `.heapTotal` / `.heapSizeLimit` | `By` | `performance.memory`; main-thread and Chromium only              |
| `dxos.client.services.runtime.heapUsed` / `.heapTotal` / `.rss`  | `By` | whichever realm hosts client-services, sampled over RPC          |
| `dxos.client.runtime.memory.bytes`                               | `By` | `scope` ∈ `window \| shared-worker \| dedicated-worker \| other` |

- **The resting-target panel reads `dxos.client.runtime.heapUsed`**, not
  `memory.bytes`. The latter needs `measureUserAgentSpecificMemory`, which requires
  cross-origin isolation and is feature-detected, so its series is simply absent for
  clients without it — a target panel built on it would silently under-report.
- `memory.bytes` is nonetheless the only view of the shared and dedicated workers, which
  Phase 3 identified as major consumers and which `performance.memory` cannot see: it
  reports the calling realm alone.
- Unattributed cost buckets to `scope=other` rather than being dropped, so the scopes sum
  to the total the browser reported.
- Heap pressure is `heapUsed / heapSizeLimit`, computed at query time rather than
  exported as its own series; above ~0.9 the client is close to an OOM kill.

## Deferred

- Perf-timeline gating and a CI regression guard (2026-08-06). The findings
  behind both are recorded in DESIGN.md; verification stays manual.

## References

- DESIGN.md — composition model, findings, measurement rules.
- RESEARCH.md — industry norms, postmortems, strategy playbook.
- Linear DX-1148 — feed/query payload retention.
- `.agents/projects/feed-live-objects/DESIGN.md` — push-over-poll roadmap.
- `.agents/projects/startup-latency/DESIGN.md` — demand-driven activation.
- `.agents/projects/sdk-metrics/DESIGN.md` — the OTel metrics pipeline these series ship
  through, and the cardinality budget they count against.

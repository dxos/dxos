# Composer Memory Usage — Tasks

_Resume: Phase 4 idle-churn sites S1-S4 fixed/investigated (see below), opened as a separate PR from #12505. Remedies section (R1-R6) and Sequencing still open — verify decommit with `scripts/memory/soak.mjs` once the PR lands. Phase 3 continues opportunistically. Uncommitted: none._

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
      `echo-client/src/feed/feed-handle.ts` (`POLLING_INTERVAL`,
      `beginPolling`): one timer and one refresh RPC per feed handle, so cost
      scales with feeds open (a mailbox is the common case). No server push
      exists (`FeedService` has no subscribe/watch RPC — confirmed via
      `packages/core/protocols/src/FeedService.ts`), so R1 doesn't apply; R6
      (real push) stays deferred to `feed-live-objects`. **Fixed (R2, no-change
      backoff):** `beginPolling` now doubles the poll delay (capped at 30 s)
      each tick that finds no object-set change, and resets to
      `POLLING_INTERVAL` the moment a poll observes one. R4 (visibility
      gating) was considered but deferred — orthogonal, applies to all four
      sites, better done as one pass.
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
      follow-up. Separate PR from the initial S1-S4 pass (#12561).
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
- [~] **R2. No-change backoff.** Widen the interval while a poll keeps
  returning nothing (e.g. 1 s → 5 s → 30 s), reset on change or local
  write. Fits S2 and S3. Costs staleness after a quiet period, so pair it
  with an explicit refresh on user action. Done for `FeedHandle` polling
  (capped 30 s), resetting to the fast interval on a real change or a
  failed read (a failure can't tell us the feed is actually quiet).
  **Superseded for S3**: space sync-state polling was upgraded from
  backoff to a real streaming RPC (`FeedService.subscribeSyncState`) —
  see the S3 entry above; R2 no longer applies there.
- [ ] **R3. Coordinated scheduling.** One scheduler batching all due work into
      a single round-trip instead of N independent timers. Fits S2 and S3
      together; the win is fewer wakeups and fewer payloads, not a longer
      interval.
- [ ] **R4. Visibility gating.** Pause or stretch while `document.hidden`,
      resume on `visibilitychange`. Applies to every site, and is the cheapest
      change, but only helps background tabs. Note the client worker keeps
      running, so the gate belongs where each loop is owned.
- [ ] **R5. Narrower invalidation.** Tighten `matchesHint` for common query
      shapes so a tick re-runs fewer queries. Addresses S4 without changing any
      timer.
- [ ] **R6. Push over poll.** A persistent connection where EDGE notifies on
      change, so an idle tab does no work at all. Supersedes R1–R3 for S2 and
      S3. Lands with feed-live-objects stage 4 rather than here.

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

## Deferred

- Perf-timeline gating and a CI regression guard (2026-08-06). The findings
  behind both are recorded in DESIGN.md; verification stays manual.

## References

- DESIGN.md — composition model, findings, measurement rules.
- RESEARCH.md — industry norms, postmortems, strategy playbook.
- Linear DX-1148 — feed/query payload retention.
- `.agents/projects/feed-live-objects/DESIGN.md` — push-over-poll roadmap.
- `.agents/projects/startup-latency/DESIGN.md` — demand-driven activation.

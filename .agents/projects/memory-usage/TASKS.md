# Composer Memory Usage — Tasks

_Resume: Phase 4 (idle churn) is the largest remaining pool; Phase 3 continues opportunistically. Uncommitted: none._

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

- [ ] **S1. `TriggerDispatcher` fires at 1 Hz with no triggers defined.**
      `compute-runtime/src/triggers/trigger-dispatcher.ts`: `livePollInterval`
      defaults to 1 s (~line 300), `_startNaturalTimeProcessing` repeats
      `invokeScheduledTriggers` on `Schedule.fixed` (~line 921), and each tick
      also runs an ECHO `Filter.type(Trigger)` query. Started by plugin-routine,
      a core plugin, so every tab pays it.
- [ ] **S2. Every subscribed feed polls at 1 Hz.**
      `echo-client/src/feed/feed-handle.ts` (`POLLING_INTERVAL`,
      `beginPolling`): one timer and one refresh RPC per feed handle, so cost
      scales with feeds open (a mailbox is the common case).
- [ ] **S3. Each open space polls sync state at 2 s.**
      `echo-client/src/proxy-db/database.ts` (`FEED_SYNC_POLL_INTERVAL`):
      aggregates block backlog across namespaces.
- [ ] **S4. Query re-execution amplifies every tick.** `echo-host`'s
      `QueryService._executeQueries` re-runs each dirty reactive query per
      invalidation hint; the loops above generate hints, which is what turns
      three timers into the observed SQL fan-out.

### Remedies — options to evaluate per site

Independent of each other; some sites may want none, one, or several.

- [ ] **R1. Event-driven scheduling.** Replace a fixed tick with "wake when
      there is something to do": no timer while the working set is empty, and
      sleep to the next due time otherwise. Fits S1 directly. Needs a
      subscription so work arriving while idle still starts, and care around
      clock changes.
- [ ] **R2. No-change backoff.** Widen the interval while a poll keeps
      returning nothing (e.g. 1 s → 5 s → 30 s), reset on change or local
      write. Fits S2 and S3. Costs staleness after a quiet period, so pair it
      with an explicit refresh on user action.
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

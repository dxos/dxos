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
- [ ] Harness into the repo as a maintained tool with a README (currently
      session-scoped, copy at /tmp/composer-memory-harness).

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

An idle tab issues ~51 SQLite statements per second across four loops
(DESIGN.md inventory). The churn keeps allocator pages committed, which is the
largest single slice of the composition model (~380 MB per GB including V8
headroom). Sequence the work so each step can be measured on its own.

### Background for whoever picks this up

Each tick allocates request/response objects, serialized payloads and SQL row
buffers across three threads, then frees them milliseconds later. The objects
die; the pages they lived in stay committed because the allocator expects the
next tick. Reducing tick _frequency_ matters as much as reducing per-tick
work, and the win only shows in footprint (RSS), not in heap-used — so measure
with the soak harness, not a heap snapshot.

### Tasks

- [ ] **`TriggerDispatcher` (largest, clearly wrong when empty)** —
      `compute-runtime/src/triggers/trigger-dispatcher.ts`: `livePollInterval`
      defaults to 1 s (line ~300) and `_startNaturalTimeProcessing` repeats
      `invokeScheduledTriggers` on `Schedule.fixed` (line ~921), which also
      runs an ECHO `Filter.type(Trigger)` query every tick. It is started by
      plugin-routine, a _core_ plugin, so every tab pays it even with zero
      triggers. Make it event-driven: no timer when the trigger set is empty,
      and sleep to the next due time when triggers exist rather than waking at
      1 Hz. Watch for triggers added while idle (subscribe to the query) and
      for clock changes.
- [ ] **Visibility gating** — pause or stretch every poll when
      `document.hidden`, and resume on `visibilitychange`. Chrome already
      freezes hidden CPU-heavy tabs (RESEARCH.md), so the app should degrade
      predictably rather than being frozen mid-tick. Applies to all four
      loops; the client worker keeps running, so the gate belongs where the
      loop is owned, not only in the page.
- [ ] **Coordinate feed polls** — `echo-client/src/feed/feed-handle.ts`
      (`POLLING_INTERVAL` 1 s, `beginPolling`): every subscribed feed runs its
      own timer and its own refresh RPC. Multiplex into one scheduler that
      batches all due feeds into a single round-trip, with per-feed backoff
      when a refresh returns no change (1 s → 5 s → 30 s, reset on change or
      on local write). `DatabaseImpl`'s 2 s feed-sync-state poll
      (`proxy-db/database.ts`, `FEED_SYNC_POLL_INTERVAL`) should ride the same
      scheduler.
- [ ] **Verify query invalidation narrows** — `echo-host`'s
      `QueryService._executeQueries` re-runs every _dirty_ query per
      invalidation hint, and `matchesHint` is deliberately conservative
      (returns true for traversals, text search, unions, and any unconstrained
      dimension). Measure how many reactive queries re-execute per tick in a
      real profile; if most are conservative matches, tighten the hint for the
      common shapes before optimizing anything else.
- [ ] **Attribute allocation rate per loop** — disable each loop in turn and
      sample with the harness (`sample-allocs`), so the ordering above is
      confirmed by data rather than by size of code.
- [ ] **Push over poll (the real fix)** — the client asks EDGE "anything new?"
      once per second per feed and is almost always told no. Invert it: one
      persistent connection, EDGE notifies on change (or pushes the delta), an
      idle tab does no work at all. This is feed-live-objects stage 4; the
      memory win rides that roadmap item rather than being duplicated here.
- [ ] **Verify decommit** — after each step, soak an idle tab and confirm
      renderer RSS trends toward live size instead of plateauing at the
      high-water mark. Chrome decommits lazily, so expect the change to appear
      over minutes, not immediately.

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

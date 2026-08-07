# Composer Memory Usage — Tasks

_Resume: Phase 5 idle-churn elimination (census → interim batching/throttle → decommit verification), then Phase 6 code trims, Phase 7 wasm. Reordered per user: churn first — slack+headroom (~380 MB/GB pool) is the top lever._

**Target (agreed with user 2026-08-06): 300–500 MB resting footprint for an
idle tab, aiming 300–400 (Figma range). Baseline today: ~615 MB harness-measured
floor (barebones), ~470–860 MB observed on real machines depending on slack.**

## Phase 1: Measure — DONE

Get trustworthy per-context numbers before touching anything. Deliverable: a
Findings section in DESIGN.md with heap per execution context at defined
checkpoints, and the top dominators from a snapshot.

### Tasks

- [x] **Boot a dev Composer and record baseline heap** — page 247MB / worker
      71MB / coordinator 9MB; flat over 60s idle. Table in DESIGN.md Findings.
- [x] **Build a CDP profiling harness** — `measure.mjs` + `analyze.mjs` +
      soak/memory-dump/snapshot-diff/retainers/parse-trace-stream (scratchpad
      `memory-harness/`, copy at /tmp/composer-memory-harness).
- [ ] **Checkpoint measurements** — space open → N documents open still
      pending (app-ready + idle done).
- [x] **Snapshot attribution** — dev page heap is ~80% module sources + inline
      base64 sourcemaps + 45MB code; worker adds 25MB automerge wasm buffers.
- [x] **Production comparison** — prod preview: page 96.7MB / worker 24.2MB /
      coordinator 0.6MB ≈ 122MB live at fresh boot.
- [x] **Verify tracing buffer behavior in-browser** — unbounded without
      `DX_OTEL_ENDPOINT`, negligible at fresh baseline (9 spans).

## Phase 2: Attribute the real tab — DONE

User evidence: Chrome tab "High memory usage" 1.5–3 GB on composer.space.
Chrome's number is renderer process footprint, not JS heap.

### Tasks

- [x] **Reproduce + attribution chain** — memory-infra dumps (±perf stub),
      constructor heap diffs, chunk-plateau watch, bare-chromium control.
- [x] **Loaded-profile ledgers from user captures** — 1,444 MB (DevTools
      open) / 1,887 MB (mail open) fully attributed; both message-JSON
      retainers named (`FeedObjectCore.#state`,
      `_lastRemoteResults[].documentJson`); DevTools-attach ≈ 260 MB;
      135,976 retained PerformanceMeasures found in the worker.
- [x] **Plugin-tier curve** — barebones 615 / minimal ~650 / full ~720–780 MB
      RSS at ready; all content plugins together ≈ 150 MB. The floor is CORE
      code execution + committed slack, not plugin count. DESIGN.md.

## Phase 3: Leak fixes (quick wins)

### Tasks

- [x] **Feed/mail data double-retention (client side)** — DX-1148 items 1+2,
      commit e9871910d0 + changeset; verified in user capture (zero retained
      message strings on Main).
- [ ] **Worker-side result retention (DX-1148 item 3)** — `_lastResultSet`
      reuses `item.doc` across runs for diff/serialization; dropping it
      forces re-reads. Needs a design pass.
- [ ] **Docs** — user-facing note: DevTools attached to a Composer tab adds
      ~250 MB+ and grows; Chrome's tab flag reports process footprint.
- [ ] **Harness into repo** — promote memory-harness scripts into a tools
      package with a README.

> Cut by user decision (2026-08-06): no perf-timeline gating and no CI
> regression guard for now. The findings behind both remain in DESIGN.md
> (unbounded performance.measure accumulation; guard design sketch in git
> history) if either is ever revisited.

## Phase 5 (NEXT): Idle-churn elimination (settles committed slack, ~-100–300 MB)

~51 SQLite statements/second at idle (1 s polling fan-out) keeps allocator
high-water marks pinned — pages stay committed to serve the churn, so the tab
never settles toward its live size.

### Tasks

- [x] **Census the idle loops (code-level)** — four sources: 1. `TriggerDispatcher` (compute-runtime, started by CORE plugin-routine):
      `Schedule.fixed(1s)` runs `invokeScheduledTriggers` + ECHO
      `Filter.type(Trigger)` query EVERY SECOND even with zero triggers
      (trigger-dispatcher.ts:300,921). 2. `FeedHandle.beginPolling`: 1 s `refresh` per subscribed feed
      (feed-handle.ts:38,557) — the mail-open amplifier. 3. `DatabaseImpl` feed-sync-state poll: 2 s per open space
      (database.ts:214,797). 4. `QueryService._executeQueries`: re-runs dirty reactive queries per
      invalidation hint — the above ticks generate hints → the ~51 SQL/s
      fan-out in the worker.
- [ ] **Interim fixes (client-only)** — (a) TriggerDispatcher: idle the loop
      when no local triggers exist; schedule to next-due-time instead of 1 Hz.
      (b) Visibility gating: pause/stretch all polls when `document.hidden`.
      (c) Coordinated tick: multiplex per-feed polls into one batched refresh
      with no-change backoff (1s → 5s → 30s). (d) Verify `matchesHint`
      actually narrows query re-execution.
- [ ] **Allocation-rate measurement per source** — sample-allocs with each
      loop disabled in turn to attribute the churn.
- [ ] **Push over poll (full fix)** — feed-live-objects stage 4: EDGE holds a
      persistent connection and notifies on change; idle tab does zero
      requests/SQL. Memory win rides that roadmap item.
- [ ] **Verify decommit** — soak after each step: renderer RSS should trend
      toward live size at idle instead of plateauing at the high-water mark.

## Phase 6: Core code reduction — REFRAMED by census (2026-08-06)

Boot census (`boot-census.mjs`: precise coverage + sourcemap attribution +
module-activation marks, full prod build, ready+150 s): **465 chunks /
10.0 MB JS loaded; every loaded chunk executes its top level (zero
fetched-but-never-run chunks); 111 module activations across only 17
plugins** (core + markdown) — enabled-but-unvisited content plugins activate
nothing. Startup-latency's demand gating is working as designed; there is no
dead-code load to remove at chunk granularity.

Consequence: the floor is the _cost of executing_ a legitimate 10 MB
(V8 compile artifacts, Effect/Schema object graphs — 120k Contexts, 43k
SchemaClass closures — plus wasm + DOM), not stray loading. Remaining angles:

### Tasks

- [x] **Boot census tool + first run** — results above; boot-census.json
      saved; tool in memory-harness.
- [ ] **Audit oddball boot deps** (small but questionable at ready):
      fast-check 94 KB (property-testing lib in prod boot!), emoji-mart
      data+lib ~483 KB, @effect/ai-anthropic 48 KB + @modelcontextprotocol/sdk
      71 KB (assistant not activated), ajv 97 KB, react-syntax-highlighter
      79 KB, bip39 185 KB, protobufjs 99 KB. Trace importers; defer where
      wrong.
- [ ] **Function-level dead-code pass** — rerun census with detailed
      coverage (root-range excluded) to see unexecuted bytes _within_ loaded
      chunks; today's % is only meaningful at was-evaluated granularity.
- [ ] **Per-KB execution cost** — the deep question: 10 MB source →
      ~200 MB+ heap/code; measure what Effect schema/layer construction
      contributes at boot and whether it can lazify (jdw's call — core
      architecture).
- [ ] **Re-measure the tier curve** after any change; ratchet a budget once
      the number settles.

## Phase 7: Wasm consolidation (~-30–50 MB now; bounds future growth)

8 instantiated wasm modules in the worker + 2 on the main thread even in
barebones; wasm linear memory never shrinks — the only reclaim is terminating
the owning worker (industry pattern per RESEARCH.md).

### Tasks

- [ ] **Inventory instances** — name all 10 wasm modules (automerge, sqlite,
      …) and why each context instantiates them.
- [ ] **Drop main-thread automerge** — route through the worker; if the page
      truly needs local doc ops, justify and bound it.
- [ ] **Terminable-worker pattern** for growable wasm memories; instantiate
      occasional-use wasm on demand, tear down after.

### References

- DESIGN.md (this project) — methodology, findings, ledgers, fix ranking.
- RESEARCH.md (this project) — industry norms, postmortems, strategy playbook.
- Linear DX-1148 — feed/mail payload retention (items 1+2 fixed, 3 open).
- `.agents/projects/feed-live-objects/DESIGN.md` — push-over-poll roadmap
  (Phase 6 dependency).
- `.agents/projects/startup-latency/DESIGN.md` — demand-driven activation
  (Phase 5 foundation).
- composer-forensics skill — live debug-port inspection.

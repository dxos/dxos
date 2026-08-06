# Composer Memory Usage — Tasks

_Resume: Phase 1 — baseline heap measurements on a fresh dev instance, then heap-snapshot attribution._

## Phase 1: Measure

Get trustworthy per-context numbers before touching anything. Deliverable: a
Findings section in DESIGN.md with heap per execution context at defined
checkpoints, and the top dominators from a snapshot.

### Tasks

- [x] **Boot a dev Composer and record baseline heap** — page 247MB / worker
      71MB / coordinator 9MB; flat over 60s idle. Table in DESIGN.md Findings.
- [x] **Build a CDP profiling harness** — `measure.mjs` + `analyze.mjs`
      (scratchpad `memory-harness/`; per-target CDP websockets over
      `--remote-debugging-port`, GC-before-read, snapshot capture). TODO: move
      into the repo once shape settles.
- [ ] **Checkpoint measurements** — space open → N documents open still
      pending (app-ready + idle done).
- [x] **Snapshot attribution** — dev page heap is ~80% module sources + inline
      base64 sourcemaps (`ExternalStringData` 250MB + strings 126MB) + 45MB code;
      worker adds 25MB automerge wasm ArrayBuffers.
- [x] **Production comparison** — `vite preview` of `composer-app:bundle`
      (PWA off): page 96.7MB / worker 24.2MB / coordinator 0.6MB ≈ 122MB total.
      Dev is ~2.5× prod on the main thread; delta is module sources + inline
      sourcemaps + unminified code. (serve-min is still dev-serving — 170MB.)
- [x] **Verify tracing buffer behavior in-browser** — confirmed unbounded by
      design when no `DX_OTEL_ENDPOINT` (extension.ts returns `stubExtension`,
      backend never set, every `@trace.span()` buffers forever; coordinator
      worker never initializes observability at all). Magnitude at fresh
      baseline is negligible (9 BufferedSpans on the page); needs an
      activity soak to quantify the growth rate before it's worth fixing.

## Phase 2: Reproduce the report

User evidence (2026-08-06): Chrome tab "High memory usage: 3.0 GB" on
composer.space, small profile, fast onset; DevTools JS heap 941 MB total.
Chrome's number is renderer process footprint, not JS heap.

### Tasks

- [x] **Reproduce** — fresh identity, production preview, idle: renderer RSS
      climbs ~30 MB/min (630 → 994 MB over 10 min) while JS heap stays flat.
      Non-JS (native) growth; no data needed. DESIGN.md Findings.
- [x] **Allocation sampling** — idle churn is modest (~3.4 MB/min page); top
      allocators include 3 Cloudflare Stream video iframes on the home surface.
- [x] **Video-block control soak** — videos exonerated; growth persisted
      (faster, even).
- [x] **Attribution chain complete** — memory-infra dumps (±perf stub),
      constructor heap diff, chunk-plateau watch, bare-chromium control.
      Verdict in DESIGN.md "FINAL ATTRIBUTION": ~0.7–1.0 GB structural
      baseline (971 chunks + wasm + overhead, plateaus t≈3 min);
      perf-timeline entries the only true in-app unbounded leak
      (~0.5–1 MB/min idle, recalibrated); the fast linear climb was
      DevTools/CDP-attach retention, which the user's DevTools-open tab
      shares.
- [x] **Loaded-profile pass** — DONE with the user's real captures: heap
      snapshot + two memory-infra traces (DevTools open: 1,444 MB attributed;
      closed + mail open: 1,887 MB — v8 main 852). Retainer analysis named
      both message-JSON copies: `FeedObjectCore.#state` and
      `IndexQuerySourceProvider._lastRemoteResults[].documentJson`.
      DESIGN.md "MAIL-OPEN LEDGER".

## Phase 3: Fix

Ranked by measured impact — see DESIGN.md "Fix ranking".

### Tasks

- [x] **Feed/mail data double-retention (client side)** — DONE, commit
      e9871910d0 + changeset; Linear DX-1148. (a) `FeedObjectCore.#state` →
      128-bit cyrb128 digest; (b) `_lastRemoteResults` drops `documentJson`
      after hydration into an identity-tracked core (re-resolves via
      `getCachedObjectById`; degraded no-handle path keeps its JSON).
      echo-client 523 tests green. VERIFIED in the user's capture
      (2026-08-06): Main snapshot from the fixed dev server has ZERO
      serialized message strings (either variant) and no strings >100 KB;
      dev-tab footprint stays ~1.4 GB because vite-dev serving is
      ~400–500 MB and item 3 + poll churn remain — production is where the
      delta shows.
- [ ] **Worker-side result retention (DX-1148 item 3)** — `_lastResultSet`
      reuses `item.doc` across runs for diff/serialization; dropping it
      forces re-reads. Needs a design pass.
- [ ] **Shrink structural baseline** — audit the Idle activation wave: which
      of the 63 `ActivationEvents.Idle` registrations pull how much closure,
      and why do disabled/Labs plugins load at all; evaluate dropping the
      main-thread automerge wasm instance.
- [ ] **Gate performance.mark/measure emitters** behind a default-off debug
      flag — sql-sqlite ×2, echo-host ×3, query-executor, effect
      Performance.ts, tracing api.ts; plus bounded entry names (no SQL text).
      (User tab carried 135,976 accumulated worker measures.)
- [ ] **Reduce idle chatter** — 51 SQL/s at idle (1 s polling fan-out);
      coordinate with feed-live-objects push roadmap.
- [ ] **Harness into repo** — promote scratchpad memory-harness scripts
      (measure/soak/memory-dump/snapshot-diff/count-entries/retainers/
      parse-trace-stream) into a tools package with a README; copy also at
      /tmp/composer-memory-harness.
- [ ] **Docs** — user-facing note: DevTools attached to a Composer tab adds
      ~250 MB+ and grows; Chrome's tab flag reports process footprint.

## Phase 4: Regression guard (CI)

Template: `check-boot-budget` / `check-startup-budget` — gate on COUNTS,
bytes trend-only (runner spread is 1.9× in-container). Scope note: the copy
amplification is generic query machinery but only heavy where `documentJson`
is populated (feed path today); automerge doc-handle eviction is a separate
unmeasured scaling story.

### Tasks

- [ ] **Copy-census check** — seeded space, K messages with unique sentinel
      strings; CDP heap snapshot per context; assert sentinel copies ≤ 2.
      Deterministic → can hard-gate. Catches payload-hoarding generically.
- [ ] **No-unbounded-accumulators idle check** — boot + idle N min +
      constructor-level heap diff; assert no constructor grows > X/min and
      perf-timeline entry counts stay bounded.
- [ ] **Per-context heap budgets** — used-after-GC on a seeded profile,
      median over repeats, non-required workflow first (model-fixture.yml
      precedent), promote once stable.
- [ ] **Per-fix unit locks** — FeedObjectCore O(1) retention after the hash
      fix; `_lastRemoteResults` no large strings post-hydration.

### References

- DESIGN.md (this project) — methodology + suspects.
- `.agents/projects/feed-live-objects/DESIGN.md` — partial replication roadmap.
- `.agents/projects/email-sync-stability/DESIGN.md` — DX-1140 postmortem,
  tracing-buffer backlog item.
- composer-forensics skill — live debug-port inspection.

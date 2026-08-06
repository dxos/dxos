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

The dev baseline may be far from the user's experience. Reproduce "incredibly
high" with real or synthetic data.

### Tasks

- [ ] **Decide data source** — live profile via /recovery.html debug port
      (composer-forensics DOCTOR.md flow) vs synthetic large profile.
- [ ] **Profile the loaded instance** — same checkpoint table + snapshots.

## Phase 3: Fix

Ranked by measured impact — seeded from Phase 1/2 findings.

### Tasks

- [ ] (seeded from findings)

### References

- DESIGN.md (this project) — methodology + suspects.
- `.agents/projects/feed-live-objects/DESIGN.md` — partial replication roadmap.
- `.agents/projects/email-sync-stability/DESIGN.md` — DX-1140 postmortem,
  tracing-buffer backlog item.
- composer-forensics skill — live debug-port inspection.

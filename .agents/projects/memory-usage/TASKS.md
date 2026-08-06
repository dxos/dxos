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
- [ ] **Video-block control soak** — same soak with `*cloudflarestream*`
      blocked; if flat, media pipeline is the driver. RUNNING.
- [ ] **Attribute the ~480 MB baseline RSS gap** (762 MB RSS at ready vs
      ~280 MB heap+backing) — wasm reservations, media, canvas, code pages.
- [ ] **Loaded-profile pass** — real (/recovery.html debug port) or synthetic
      data to explain Main=816 MB JS heap on the user's instance.

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

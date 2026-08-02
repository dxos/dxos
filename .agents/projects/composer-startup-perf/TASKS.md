# Composer Startup Performance — Tasks

_Resume: verify run+measure loop, then fresh baselines + CPU-profile attribution. Uncommitted: project docs. Last: project created 2026-08-02._

## Phase 0: verify tooling (no code changes)

Prove the measure loop works in this worktree before touching anything.

### Tasks

- [ ] **Start `composer-app:serve` (full plugin set) and load it** — capture
  `window.composer.profiler.snapshot()` from a real load.
- [ ] **Start `serve-min` and compare** — same snapshot, minimal set.
- [ ] **Storybook starts** — own port (never 9009), smoke only.
- [ ] **Run the dev-startup harness** (`composer-app:e2e-dev`) once to confirm it still works.

## Phase A: diagnosis (attribution, not aggregate measures)

See DESIGN.md §4A. The AppGraphBuilder "cluster" is likely one contended window counted 8×.

### Tasks

- [ ] **A3. Fresh baseline rows** — cold / warm-cold / dev-cold, full + minimal sets;
  append to BENCHMARKS.md (stale since 2026-06-16).
- [ ] **A1. CPU-profile capture** — Playwright CDP `Profiler.start/stop` over startup; aggregate
  self-time by script URL → per-plugin/package attribution table (committed as a report).
- [ ] **A2. Long-task observer** in the profiler snapshot (`longtask` / `long-animation-frame`).
- [ ] **A4. Dev-transform attribution** — rank plugin subtrees by vite transform cost.

## Phase C1: close instrumentation gaps (small, land-able)

### Tasks

- [ ] **Write `boot:html-parsed`** from the boot-loader injected config script (currently read at
  `main.tsx:265` + harness but never written).
- [ ] **`startup:pre-main` measure** (navigationStart → main:start) into snapshot + telemetry.
- [ ] **Fold orphan marks into the snapshot** — `client.initialize`, `worker-connection:*`,
  `dedicated-worker:session-ready` — to decompose the ~1.8s Client module.
- [ ] **Per-plugin lazy-resolve measures** in `_resolveLazyPlugin` (`lazy:<id>`).

## Phase B: deferral prototype (flag-gated)

See DESIGN.md §4B. Two-wave activation: core+critical before ready; the rest post-first-paint via
the supported dynamic `enable()` path. NOT yields inside the cascade (phase-4 revert lesson).

### Tasks

- [ ] **B1. Prototype behind flag** (query param / env) — wave-2 enable after ready.
- [ ] **B1. Measure** cold / warm-cold / dev-cold, full set, flag on vs off.
- [ ] **B2. Repeated warm reloads** (≥10) to check the System Error race.
- [ ] **B2. Deep-link into a wave-2 plugin** — verify promote-on-demand or document the gap.

## Phase C2/C3: boot-loader feedback (as time allows)

- [ ] **C2. Real fraction for `services` phase** from its sub-marks; wave-2 status lines.
- [ ] **C3. Startup report consumer** — pretty report from the BroadcastChannel/snapshot.

### References

- `packages/apps/composer-app/AUDIT.md` — prior 10-phase effort; §9 phase log; phase-4 revert.
- `packages/apps/composer-app/BENCHMARKS.md` — ledger.
- `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md` — minimal set design.

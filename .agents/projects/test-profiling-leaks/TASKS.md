# Test profiling & leak detection — Tasks

_Resume: Design agreed (see DESIGN.md). Nothing implemented yet. Next: decide config placement, then wire DX_PROFILE_TESTS. Uncommitted: registry.yml, DESIGN.md, TASKS.md._

## Phase 1: CPU profiling (`DX_PROFILE_TESTS`)

Env-gated `--cpu-prof` emit, reusing the existing `moon :test` job.

### Tasks

- [ ] **Decide config placement** — env-gated block in shared `vite.base.config.ts` node builder vs. per-package helper (DESIGN §"Config placement").
- [ ] **Wire `DX_PROFILE_TESTS`** — when set: `pool: 'forks'`, `singleFork: true`, `execArgv: ['--cpu-prof', '--cpu-prof-dir=…']`; unset → config unchanged.
- [ ] **Declare env var in moon** — add to `moon.yml` inputs/env so cache busts on change (or document `--force`).
- [ ] **Verify** — run one suite, confirm a `.cpuprofile` opens in DevTools/speedscope; confirm normal runs are byte-identical when unset.

## Phase 2: Leak detection (`DX_DEBUG_LEAKS`)

Heap-snapshot before/after on an existing single suite, no test-file edits.

### Tasks

- [ ] **Author `leak-setup.ts`** — `settle()` (gc ×3), `afterEach` first-run baseline snapshot, `afterAll` final snapshot.
- [ ] **Env-gate injection** — add `leak-setup.ts` to `setupFiles` only when `DX_DEBUG_LEAKS` set.
- [ ] **Env-gate run mode** — `isolate: false`, `singleFork: true`, `--expose-gc` in `execArgv`, `test.repeats` from env.
- [ ] **Verify on a known suite** — snapshots emit, DevTools Comparison shows deltas; confirm warmup separates lazy-init from per-repeat residual.
- [ ] **Decide snapshot output dir** — where `before/after.heapsnapshot` land (gitignored scratch dir).

## Phase 3: Docs

- [ ] **Document usage** — short note (where? testing skill / REPOSITORY_GUIDE) on both env vars, one-suite assumption, and reading profiles/snapshots.

### References

- DESIGN.md — decisions, config snippets, caveats.
- `vite.base.config.ts` (node test builder ~L554), `tools/vitest/setup.ts`.
- Related but distinct: `memory-usage` project (jdw) — profiles the running Composer app, not the test harness.

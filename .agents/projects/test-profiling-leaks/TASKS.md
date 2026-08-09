# Test profiling & leak detection — Tasks

_Resume: IMPLEMENTED + verified across all six layers. Wired into `createNodeProject`
(`vite.base.config.ts`) + `tools/vitest/leak-setup.ts`, gated via `.moon/tasks/tag-ts-test.yml`
inputs. vitest-4 adaptations recorded in DESIGN.md §Implementation. PR #12523 OPEN — monitoring
CI to green, then merge; addressed CodeRabbit review (samples-file truncation, --force caching note)._

## Phase 1: CPU profiling (`DX_PROFILE_TESTS`)

Env-gated `--cpu-prof` emit, reusing the existing `moon :test` job.

### Tasks

- [x] **Decide config placement** — Option 1: env-gated block in shared `createNodeProject`.
- [x] **Wire `DX_PROFILE_TESTS`** — when set: `pool: 'forks'`, `isolate:false`, `fileParallelism:false`, `maxWorkers:1`, `execArgv: ['--cpu-prof', '--cpu-prof-dir=…']`; unset → config unchanged. (vitest-4: top-level, no `poolOptions.forks` / `singleFork`.)
- [x] **Declare env var in moon** — added `$DX_PROFILE_TESTS`/`$DX_DEBUG_LEAKS`/`$DX_DEBUG_LEAKS_DIR` to `tag-ts-test.yml` inputs so cache busts on change.
- [x] **Verify** — one `.cpuprofile` per run confirmed across echo/halo/mesh/sdk/composer/compute; unset run is unchanged.
- [x] **Fix moon passthrough** — `bash -c '… "$@"' --` so `moon run <pkg>:test -- <file>` actually filters to one file (was silently running all).

## Phase 2: Leak detection (`DX_DEBUG_LEAKS`)

Heap-snapshot before/after on an existing single suite, no test-file edits.

### Tasks

- [x] **Author `leak-setup.ts`** — `settle()` (gc ×3), `afterEach` first-run baseline snapshot + one `heapUsed` sample written per test to `heap-samples.ndjson` (truncated at run start; the slope is derived from those samples), `afterAll` final snapshot.
- [x] **Env-gate injection** — `leak-setup.ts` added to `setupFiles` only when `DX_DEBUG_LEAKS` set.
- [x] **Env-gate run mode** — `isolate:false`, single non-parallel fork, `--expose-gc` in `execArgv`.
- [x] **Amplification** — config `repeats` unavailable in vitest 4; replaced with per-test `heapUsed` slope written to `profiles/heap-samples.ndjson`.
- [x] **Verify on a known suite** — `echo:Type.test.ts`: before/after snapshots (32 MB each) + 27-point growth curve; warmup baseline separates lazy-init from residual.
- [x] **Decide snapshot output dir** — per-package `profiles/` (fork cwd); `*.heapsnapshot` + `profiles/` gitignored; `DX_DEBUG_LEAKS_DIR` overrides.

## Phase 3: Docs

- [x] **Document usage** — DESIGN.md §Implementation (both vars, one-suite assumption, output location, layer verification). PR body carries the quickstart.

## Phase 4: Apply the tooling — leaks + CPU hotspots per layer

Now that the harness works, actually run it against representative suites and act on what it finds.
This is investigation/remediation, not tooling — one finding-set per layer, then fixes.

### Tasks

- [ ] **Pick + run representative suites per layer** with both `DX_PROFILE_TESTS` and `DX_DEBUG_LEAKS` (`--force`): echo, halo, mesh, app-sdk, composer, compute, **and assistant + agentService** (`assistant`, `assistant-toolkit`/`assistant-evals`, and the agent/`agent-runtime` service suites) as an explicit layer — these are heavy, long-lived-service tests where leaks/hotspots are most likely.
- [ ] **Leaks** — for each suite, diff before/after snapshots in DevTools Comparison + check the `heap-samples.ndjson` slope; record per-constructor deltas and retainer chains for any monotonic grower.
- [ ] **CPU hotspots** — open each `.cpuprofile` (DevTools/speedscope); note the dominant self-time frames (transform/runner overhead vs. real product code) per layer.
- [ ] **Triage + file** — separate real leaks/hotspots from test-fixture accumulation and first-run lazy init; open issues or fixes for the real ones, starting with assistant/agentService if they dominate.
- [ ] **Record findings** — a short RESULTS.md (or DESIGN.md §Findings) with per-layer leak/hotspot summary and links to any follow-up PRs/issues.

## Follow-ups

- [ ] Apply the same `"$@"` passthrough fix to `test-browser` / `test-workerd` moon commands (node-only tooling left them untouched).
- [ ] `keyring:migrations.test.ts` has a pre-existing failure (unrelated to this tooling) — file/track separately if not already known.

### References

- DESIGN.md — decisions, config snippets, vitest-4 deltas, caveats.
- `vite.base.config.ts` (`createNodeProject`), `tools/vitest/leak-setup.ts`, `.moon/tasks/tag-ts-test.yml`.
- Related but distinct: `memory-usage` project (jdw) — profiles the running Composer app, not the test harness.

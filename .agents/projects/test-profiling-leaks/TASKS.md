# Test profiling & leak detection — Tasks

_Resume: Tooling MERGED (PR #12523 → main f1c67714) — createNodeProject + tools/vitest/leak-setup.ts,
gated via .moon/tasks/tag-ts-test.yml; `test-perf-leaks` skill added. Phase 4 sweep DONE: leak check
across all eight layers (no leaks); clean CPU profiles on the two heavy layers (assistant,
agent-runtime — no product hotspot). Full table + methodology in RESULTS.md. This follow-up branch
was restarted from main after the merge._

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

Result: **no leaks** across all eight representative layers, and **no product CPU hotspot** in the
two heavy layers that got clean profiles (assistant, agent-runtime) — full table and methodology in
`RESULTS.md`. Nothing to fix at this scale.

### Tasks

- [x] **Pick + run representative suites per layer** — echo, halo, mesh, app-sdk, composer, compute, assistant, and agentService (`agent-runtime` agent-process). See RESULTS.md.
- [x] **Leaks** — `heap-samples.ndjson` slope per suite: every layer settles at/below its warmed baseline (net Δ −0.3 to −1.9 MB). No monotonic grower.
- [x] **CPU hotspots** — clean profiles (leak-mode off) of the two heavy layers: ~62% idle + module-load/transform + import-time Effect `Schema` construction; no product self-time hotspot.
- [x] **Triage** — high assistant/agent baselines are one-time module-graph lazy init (post-warmup), not leaks; nothing to file.
- [x] **Record findings** — `RESULTS.md`.
- [ ] **(Optional next)** Point the tooling at long-lived integration suites (`echo-host` spaces/replication, `client-services` sessions) when leak-hunting a specific subsystem — they exercise longer-lived object lifetimes than the unit suites swept here.

## Follow-ups

- [ ] Apply the same `"$@"` passthrough fix to `test-browser` / `test-workerd` moon commands (node-only tooling left them untouched).
- [ ] `keyring:migrations.test.ts` has a pre-existing failure (unrelated to this tooling) — file/track separately if not already known.

### References

- DESIGN.md — decisions, config snippets, vitest-4 deltas, caveats.
- `vite.base.config.ts` (`createNodeProject`), `tools/vitest/leak-setup.ts`, `.moon/tasks/tag-ts-test.yml`.
- Related but distinct: `memory-usage` project (jdw) — profiles the running Composer app, not the test harness.

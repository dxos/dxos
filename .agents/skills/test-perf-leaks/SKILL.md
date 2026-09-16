---
name: test-perf-leaks
description: CPU-profile or leak-detect an existing vitest suite via env-gated instrumentation — DX_PROFILE_TESTS emits a V8 .cpuprofile, DX_DEBUG_LEAKS writes before/after heap snapshots plus a per-test heapUsed slope, with zero edits to the test file. Use when a suite is slow, memory grows across a run, or you need to find a hotspot/leak in node tests (echo/halo/mesh/sdk/composer/compute, incl. assistant + agentService).
---

# Test CPU profiling & leak detection

Two opt-in env vars instrument the shared **node** vitest project (`createNodeProject`
in `vite.base.config.ts`). Unset → the config is byte-identical to a normal run, so
CI and everyday runs are unaffected. You point them at an **existing** suite; nothing
in the test file changes.

- `DX_PROFILE_TESTS[=dir]` — emit a V8 `.cpuprofile` via Node `--cpu-prof` (dir default `./profiles`).
- `DX_DEBUG_LEAKS` — inject `tools/vitest/leak-setup.ts`: `before`/`after` heap snapshots (warmed baseline, forced GC) + a per-test `heapUsed` sample in `heap-samples.ndjson`.
- `DX_DEBUG_LEAKS_DIR` — override the leak output dir (default `./profiles`).

Both force a single non-isolated fork (`pool: 'forks'`, `isolate:false`,
`fileParallelism:false`, `maxWorkers:1`) so `--cpu-prof` / `--expose-gc` apply to the
thread the tests run on — under the default worker-per-file isolation they would not.

This works because vitest evaluates a `setupFiles` entry in the **same isolate/heap** as
the test file it precedes: the `afterEach`/`afterAll` that `leak-setup.ts` registers wrap
the real tests in the same realm and process, so `process.memoryUsage()` and
`writeHeapSnapshot()` observe exactly the heap the tests allocated in. (Verified: the
sampler sees the tests' `globalThis` mutations and their heap growth under one shared pid.)

## Run it

Always pass `--force`. The env vars are declared as moon task inputs, so _toggling_
one busts the cache — but a _repeat_ run with identical inputs would hydrate the cached
result and skip vitest, producing no fresh profile. `--force` re-executes unconditionally.

```bash
# CPU profile one suite → packages/<…>/<pkg>/profiles/CPU.*.cpuprofile
DX_PROFILE_TESTS=1 moon run <pkg>:test --force -- src/foo.test.ts

# Leak-check one suite → profiles/{before,after}.heapsnapshot + heap-samples.ndjson
DX_DEBUG_LEAKS=1 moon run <pkg>:test --force -- src/foo.test.ts
```

- **Point at ONE `.test.ts` file.** The leak model assumes a single suite in one
  process — one clean before/after, no "which file ran last?" ambiguity. The
  `-- <file>` filter works because the node test task forwards passthrough args to
  vitest (`bash -c '… "$@"' --`).
- `<pkg>` is the package **directory name** (moon project id), e.g. `echo`, `credentials`,
  `messaging`, `app-graph`, `plugin-markdown`, `compute-runtime`, `assistant`, `agent-runtime`.
- Artifacts land relative to the **fork cwd = the package dir**, i.e.
  `packages/<…>/<pkg>/profiles/`. They are gitignored (`*.cpuprofile`, `*.heapsnapshot`,
  `heap-samples.ndjson`, `profiles/`).
- Pick a suite first with `--logHeapUsage` (cheap) to see which one grows.

## Read the CPU profile

Open the `.cpuprofile` in **Chrome DevTools → Performance → load profile**, or
[speedscope](https://www.speedscope.app/). Look at **self time**: separate real product
hotspots from vitest runner/transform overhead (this approach profiles the whole process,
so the runner is in the trace — that's the tradeoff for needing zero code).

## Read the leak snapshots

1. **Slope first.** `heap-samples.ndjson` has one `{test, heapUsed}` line per test, taken
   after `settle()` (GC ×3). The baseline is recorded **after the first test**, not at
   process start — first-run lazy init (module singletons, V8 code compilation, string
   interning) otherwise looks identical to a leak. A real leak is a **monotonic rise**
   across the suite; a flat/noisy line after test 1 is not a leak.
2. **Then the diff.** Load `before.heapsnapshot` and `after.heapsnapshot` in **DevTools →
   Memory → load**, select the `after` snapshot, and switch the dropdown to **Comparison**
   against `before`. Read per-constructor deltas (`# New`, `# Deleted`, `Size Delta`) and
   the **retainer chains** of the growers to find what holds them.
3. Amplification comes from the suite's own test count (vitest 4 dropped config `repeats`),
   so a many-test file gives a longer slope. `heap-samples.ndjson` is truncated at the
   start of each run, so slopes never mix captures.

## Triage

- **Not a leak:** growth confined to test 1 (lazy init), or fixtures/mocks the suite
  intentionally accumulates and never tears down. Note it and move on.
- **A leak:** a constructor whose count/size climbs with the slope and whose retainer
  chain points at product code (a registry, cache, listener set, `FinalizationRegistry`
  that never fires, un-disposed `Context`). Fix at the source or file an issue with the
  retainer chain attached.

## When NOT to use this

- Browser/storybook/workerd suites — this is node-only (`createNodeProject`). The same
  moon-passthrough gap exists on `test-browser`/`test-workerd` but the instrumentation is
  not wired there.
- Profiling the running Composer **app** (not tests) — that is the `memory-usage` project's
  domain; use the app-side heap tooling instead.

## Reference

- `vite.base.config.ts` (`createNodeProject`) — the env-gated block.
- `tools/vitest/leak-setup.ts` — the injected snapshot/sampling harness.
- `.moon/tasks/tag-ts-test.yml` — env-var inputs + the `"$@"` passthrough.
- `.agents/projects/test-profiling-leaks/DESIGN.md` — decisions, vitest-4 deltas, caveats.

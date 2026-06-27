---
name: vitest-profiling
description: >-
  Profile vitest test performance in the DXOS monorepo — find slow packages,
  slow test files, and slow individual tests, then capture CPU/heap profiles to
  locate hotspots. Use when the user asks to "profile tests", "why are tests
  slow", "speed up the test suite", "find slow tests", measure per-package test
  time, capture a .cpuprofile, or analyze import/transform/setup overhead.
---

# Vitest Profiling (DXOS)

Tests run on **vitest 4.x**, default **forks** pool, wrapped by **moon**. The base
config is `vitest.base.config.ts` at the repo root; each package has a thin
`vitest.config.ts` calling `createConfig({ dirname, node: true })`. The default
project is `node` (there are also `browser-*` and `storybook` projects).

Profile **top → bottom**: whole-suite → package → file → single test → CPU profile.
Prefer optimizations that touch many tests at once (shared setup, import graph,
pool config) over per-test tweaks.

## 0. Setup

```bash
export PROTO_HOME="$HOME/.proto" && export PATH="$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"
```

Tests depend on `^:compile`, so the dependency graph must be built first. Warm it
once at full concurrency, then profile serially:

```bash
MOON_CONCURRENCY=4 moon exec --on-failure continue --quiet :compile
```

## 1. Whole suite — which packages are slow

Run all node tests **serially** so per-package timings aren't contended. moon
prints a per-task duration for each `:test`:

```bash
MOON_CONCURRENCY=1 moon run :test -- --no-file-parallelism 2>&1 | tee suite.log
```

Each package also writes `test-results/<package>/node/results.json` (the `json`
reporter, configured in the base). Aggregate `startTime`/`endTime` and per-test
`duration` across those files for a precise breakdown without re-running — far
cheaper than re-reading moon's stdout. Sort packages by total time to pick targets.

`VITEST_TAGS_FILTER` controls which tagged suites run (default skips
`flaky/llm/sync/e2e/manual`); keep it at the default so you measure what CI runs.

## 2. Package — run vitest directly from the package cwd

Once you have a target package, drop into its directory and call vitest directly
(skips moon's caching/orchestration; you see raw vitest timing):

```bash
cd packages/core/echo/echo
pnpm exec vitest run --project=node --no-file-parallelism --reporter=verbose
```

The summary line breaks time into **Transform / Setup / Import / Tests /
Environment / Prepare** — note which dominates:
- **Transform/Import** high → import-graph / barrel-file problem (see §6).
- **Setup** high → `setupFiles` or `globalSetup` cost (shared across every file).
- **Tests** high → real test work; drill into specific files/tests.

## 3. Test file — run one file

```bash
pnpm exec vitest run --project=node path/to/module.test.ts --reporter=verbose
```

`--reporter=verbose` prints each test name with its duration. To compare files,
sort by the per-file time in the summary.

## 4. Single test — run one test

```bash
pnpm exec vitest run --project=node path/to/module.test.ts -t "test name substring"
```

`-t` filters by test-name substring. Use `--repeat=N` to expose variance and
warmup effects (first run pays cold import/compile cost).

## 5. Import-duration analysis (cheap, high-signal)

Surfaces the slowest module imports — usually the biggest lever because import
cost is paid by every file that touches the module:

```bash
pnpm exec vitest run --project=node --experimental.importDurations.print path/to/file.test.ts
```

## 6. CPU / heap profiles

### Forks pool (test execution itself)

Add Node profiling flags to the forked workers via `execArgv`. Do **not** commit
this — make a throwaway override file in the package and run it:

```ts
// vitest.profile.config.ts (temporary, delete after)
import base from './vitest.config';
export default {
  ...base,
  test: {
    ...base.test,
    fileParallelism: false,
    execArgv: [
      '--cpu-prof', '--cpu-prof-dir=test-runner-profile',
      '--heap-prof', '--heap-prof-dir=test-runner-profile',
    ],
  },
};
```

```bash
pnpm exec vitest run --config vitest.profile.config.ts --project=node path/to/file.test.ts
# → test-runner-profile/*.cpuprofile  (one per fork)
```

Note: `--prof` does **not** work with `pool: 'threads'`; this repo uses forks, so
`--cpu-prof` is fine.

### Main thread (Vite transform, globalSetup, collection)

```bash
node --cpu-prof --cpu-prof-dir=main-profile \
  ./node_modules/vitest/vitest.mjs run --project=node --no-file-parallelism path/to/file.test.ts
# → main-profile/*.cpuprofile
```

### Coverage cost

```bash
DEBUG=vitest:coverage VITEST_COVERAGE=1 pnpm exec vitest run --project=node --coverage path/to/file.test.ts
```

### Viewing profiles

Open `*.cpuprofile` / `*.heapprofile` in **speedscope** (https://www.speedscope.app),
Chrome DevTools → Performance, or VS Code's Performance tab. For headless triage,
parse the `.cpuprofile` JSON and sum `selfTime` by `node.callFrame.functionName`.

## High-impact levers (verify with profiles before applying)

- **Shared setup files** run once per test *file* (or once globally for
  `globalSetup`). Anything expensive there is multiplied by file count.
- **`Error.stackTraceLimit = Infinity`** in `tools/vitest/setup.ts` makes every
  thrown error capture an unbounded stack — costly in suites that construct many
  errors (Effect, assertion-heavy). Measure before changing; it aids debugging.
- **Barrel imports** (`@dxos/*` index re-exports) pull large module graphs into
  every test file. Use `--experimental.importDurations.print` to find them; import
  specific entrypoints where it pays off.
- **Pool / isolation**: `isolate: false` and `maxWorkers` tuning amortize the
  module graph across files (the browser/storybook projects already do this for
  the WASM-backed ECHO graph).
- **WASM init** (Automerge / wa-sqlite) is a fixed per-context cost — sharing a
  context across files avoids re-instantiation.

Always tie a proposed optimization back to a profile/measurement and estimate how
many tests it affects.

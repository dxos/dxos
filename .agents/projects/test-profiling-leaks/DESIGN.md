# Test profiling & leak detection — Design

Env-gated tooling to (a) CPU-profile and (b) leak-detect **existing** vitest
suites, triggered by an environment variable, reusing the current `moon :test`
job, with **zero edits to the test files** themselves.

## Status — IMPLEMENTED (see "Implementation" below)

Shipped in `vite.base.config.ts` (`createNodeProject`) + `tools/vitest/leak-setup.ts`,
gated by `.moon/tasks/tag-ts-test.yml` inputs. Verified across all six layers.
Two design snippets below (the `poolOptions.forks` nesting and config `repeats`)
are **superseded** — vitest 4 flattened the pool model and removed config-level
`repeats`. The prose that references them is kept for the reasoning; the actual
API used is in "Implementation".

## Triggers

- `DX_PROFILE_TESTS` — emit V8 CPU profiles (approach "b": Node `--cpu-prof`).
- `DX_DEBUG_LEAKS` — heap-snapshot the suite before/after with forced GC.

Both are read in the (per-package) vitest config at load time. When unset, the
config is byte-identical to today, so normal runs and CI are unaffected.

## Why env vars, not argv

Vitest's config is plain JS evaluated at load, so `process.env` is directly
readable. Unknown CLI flags do not cleanly reach the config object, so an env var
is the reliable trigger. moon inherits the shell env, so the **same `<pkg>:test`
job** serves both normal and instrumented runs — no separate task required.

Caveat: moon caches task results by declared inputs. An env-only change may hit a
cached result. Declare the vars in the package `moon.yml` (`env` / task inputs)
so they bust the cache, or use `moon run <pkg>:test --force`.

## 1. CPU profiling — `DX_PROFILE_TESTS`

Approach (b): Node writes a `.cpuprofile` per process on exit via `--cpu-prof`.

Key constraint: `--cpu-prof` only profiles a process's **main thread**, so it
captures nothing under `pool: 'threads'` (tests run in worker_threads). Must use
`pool: 'forks'` + `singleFork: true` so all tests run on the fork's main thread
and produce one coherent profile.

```ts
const cpuProf = process.env.DX_PROFILE_TESTS;
test: {
  ...(cpuProf ? { pool: 'forks', poolOptions: { forks: {
    singleFork: true,
    execArgv: ['--cpu-prof', `--cpu-prof-dir=${cpuProf === '1' ? './profiles' : cpuProf}`],
  }}} : {}),
}
```

Run: `DX_PROFILE_TESTS=./profiles moon run <pkg>:test -- some.test.ts`. Open the
`.cpuprofile` in Chrome DevTools (Performance → load) or speedscope.

Tradeoff vs. the programmatic `inspector.Session` approach (rejected for the
default path): (b) includes vitest runner + transform overhead in the profile,
but needs zero code and works on existing tests. Programmatic profiling stays
available for hot-path work but is out of scope here.

## 2. Leak detection — `DX_DEBUG_LEAKS`

Heap-snapshot residual: snapshot after a warmed baseline, run the suite, force
GC, snapshot again, diff in Chrome DevTools **Comparison** view (per-constructor
deltas + retainer chains).

### Assumptions

- **Single suite** (ideally a single `.test.ts` file) per run. This removes the
  "which file is last?" problem — one file = one clean before/after in one
  process.
- No edits to the existing test file. All machinery comes from config + an
  injected setup file.

### Mechanics (all config-side, no test edits)

1. **One process:** `isolate: false` + `pool: 'forks'` + `singleFork: true`, and
   `--expose-gc` in `execArgv`.
2. **Snapshots via an injected `setupFiles` entry** (runs in the fork, same
   process as the tests). Top-level `beforeAll`/`afterAll` in the setup file
   register on the **root suite of the test file**, wrapping it without the test
   knowing. Gated: `setupFiles: [...(process.env.DX_DEBUG_LEAKS ? [leakSetup] : [])]`.
3. **Amplification via config `repeats`** (not a hand-written loop). `test.repeats`
   reruns every test N times in the same isolate, including each test's own
   `beforeEach`/`afterEach` — the existing tests _are_ the workload:
   `test: { repeats: process.env.DX_DEBUG_LEAKS ? 100 : 0 }`.
4. **Forced GC — `settle()`:** call `global.gc()` 2–3 times with a macrotask turn
   (`setImmediate`) between passes, so FinalizationRegistry callbacks, WeakRef
   clears, and pending microtasks flush before the final snapshot.
5. **Warmup without editing the test:** take the baseline snapshot **after the
   first test completes**, not at process start — first-run lazy init (module
   singletons, V8 code compilation, string interning) otherwise looks identical
   to a leak. Use an `afterEach` with a module-level counter in the setup file:

```ts
// leak-setup.ts — injected via setupFiles, never imported by the test
import { writeHeapSnapshot } from 'node:v8';

const settle = async () => {
  for (let i = 0; i < 3; i++) {
    global.gc();
    await new Promise((r) => setImmediate(r));
  }
};

let seen = 0;
afterEach(async () => {
  if (++seen === 1) {
    await settle();
    writeHeapSnapshot('./before.heapsnapshot');
  }
});
afterAll(async () => {
  await settle();
  writeHeapSnapshot('./after.heapsnapshot');
});
```

Run: `DX_DEBUG_LEAKS=1 moon run <pkg>:test -- the-existing.test.ts`.

### Signal quality

> Superseded — see "Implementation". vitest 4 has no config `repeats`; the slope
> is sampled across the suite's own tests (one `heapUsed` reading per test) rather
> than across repeats of a single test.

- A real leak is monotonic in `repeats`. The two-point before/after diff is the
  investigation view; if variance is high, sample `process.memoryUsage().heapUsed`
  (after `settle()`) across repeats and check for a positive slope.
- `--logHeapUsage` is a cheap first-pass to pick which suite to point this at.

### Known caveats

- `repeats` counts each repeat as a separate test result → noisy console + slower
  (200 tests × 100 = 20k results). Prefer pointing at a single `.test.ts`.
- `--expose-gc` / `global.gc()` requires the flag be present on the fork
  (`execArgv`), otherwise `global.gc` is undefined.
- `isolate: false` shares globals across the file's tests — a real behavior change
  vs. the default run, hence env-gated.

## Config placement — RESOLVED (Option 1)

Shipped as Option 1: an env-gated block inside the shared node-config builder
(`createNodeProject`), so any package inherits the behavior only when
`DX_PROFILE_TESTS`/`DX_DEBUG_LEAKS` is set. Unset → the node project is unchanged,
so nothing is serialized on normal runs. (Option 2, a per-package helper, was not
needed.) Details in "Implementation".

## Rejected / out of scope

- Programmatic `inspector.Session` CPU profiling (precise but needs code).
- FinalizationRegistry assertion as a CI leak _regression gate_ (deterministic,
  but requires per-object test code) — noted as a future option, not this pass.
- memlab auto-retainer analysis — external tool; can consume the emitted
  `.heapsnapshot` files later without changing this design.

## Implementation (as built)

Config placement: **Option 1** — one env-gated block in the shared
`createNodeProject` (`vite.base.config.ts`). Any package inherits the behavior
only when a var is set; unset → the node project is byte-identical to today.

### vitest 4 API deltas from the snippets above

Verified against `vitest@4.1.10`:

- **Pool model flattened.** The v3 `poolOptions.forks.{singleFork,execArgv}`
  nesting is gone. `pool`, `execArgv`, `isolate`, `fileParallelism`, `maxWorkers`
  are now **top-level** `test` options. A single coherent process is
  `pool: 'forks'` + `isolate: false` + `fileParallelism: false` + `maxWorkers: 1`
  (there is no `singleFork` flag). `pool` now defaults to `'forks'`.
- **No config-level `repeats`.** `repeats` survives only as a per-`test()` option
  inheriting from its suite; there is no config key and no `--repeats` CLI flag.
  Amplification therefore comes from the suite's own test count, not a rerun loop:
  `leak-setup.ts` records `heapUsed` after every test (post-`settle()`) to
  `profiles/heap-samples.ndjson`. A monotonic slope across the suite is the leak
  signal; the two-point before/after snapshot pair is the DevTools investigation view.

### Actual wiring

```ts
// vite.base.config.ts (module scope)
const CPU_PROFILE_DIR = process.env.DX_PROFILE_TESTS
  ? (process.env.DX_PROFILE_TESTS === '1' ? './profiles' : process.env.DX_PROFILE_TESTS)
  : undefined;
const DEBUG_LEAKS = !!process.env.DX_DEBUG_LEAKS;
const TEST_INSTRUMENTED = Boolean(CPU_PROFILE_DIR) || DEBUG_LEAKS;
const TEST_INSTRUMENT_EXEC_ARGV = [
  ...(CPU_PROFILE_DIR ? ['--cpu-prof', `--cpu-prof-dir=${CPU_PROFILE_DIR}`] : []),
  ...(DEBUG_LEAKS ? ['--expose-gc'] : []),
];

// inside createNodeProject → test:
...(TEST_INSTRUMENTED
  ? { pool: 'forks', isolate: false, fileParallelism: false, maxWorkers: 1, execArgv: TEST_INSTRUMENT_EXEC_ARGV }
  : {}),
setupFiles: [ ...setupFiles, setup, VITEST_LOG_SETUP, ...(DEBUG_LEAKS ? [VITEST_LEAK_SETUP] : []) ],
```

### moon passthrough fix (prerequisite)

`moon run <pkg>:test -- <file>` did **not** filter to one file: the task command
is `bash -c '<script>'`, and moon appends passthrough args after the whole argv,
so the file became the script's `$0` and never reached vitest. Fixed by mirroring
the proven `tag-ts-build.yml` idiom — end the script with `"$@"` and add a trailing
`--` as the `$0` placeholder:
`bash -c 'pnpm exec dx-killorphans vitest run … "$@"' --`. Single-suite targeting
(required by `DX_DEBUG_LEAKS`) now works, and the previously-broken documented
one-file usage does too.

### Output location

`--cpu-prof-dir` and the snapshot writer are relative to the **fork cwd** = the
package dir, so artifacts land in `packages/<…>/<pkg>/profiles/` (per-package,
gitignored via `*.heapsnapshot` + `heap-samples.ndjson` + `profiles/`).
`DX_DEBUG_LEAKS_DIR` overrides the leak output dir. `leak-setup.ts` truncates
`heap-samples.ndjson` at the start of each run so a slope never mixes captures.

### Always pass `--force` for instrumented runs

The env vars are declared as task inputs, so _toggling_ one busts the moon cache.
But moon archives/hydrates only the declared outputs (`coverage/`, `test-results/`)
— it does not treat the profiles as outputs (they are large diagnostic artifacts,
not build products worth caching). So a _repeat_ instrumented run with identical
inputs would hydrate the cached result and skip vitest, producing no fresh profile.
Always run with `--force` so vitest actually re-executes:

```bash
DX_PROFILE_TESTS=1 moon run <pkg>:test --force -- src/foo.test.ts
DX_DEBUG_LEAKS=1  moon run <pkg>:test --force -- src/foo.test.ts
```

### Verified layers (2026-08-09)

CPU profile (`.cpuprofile` emitted, one coherent file):
`echo` (Type.test.ts), `credentials`/halo (verifier.test.ts), `messaging`/mesh
(edge-signal-manager.test.ts), `app-graph`/sdk (util.test.ts), `plugin-markdown`/
composer (Versioning.test.ts), `compute-runtime`/compute (SwarmTraceSink.test.ts).
Leak path (before/after snapshots + 27-point heap-samples slope) verified on
`echo:Type.test.ts`. `keyring:migrations.test.ts` has a _pre-existing_ failure
(fails identically with instrumentation off); the profile still emits.

## Follow-ups (not done)

- `test-browser` / `test-workerd` moon commands have the same missing-`"$@"`
  passthrough gap; left untouched (this tooling is node-only). Worth the same fix.
- `--logHeapUsage` first-pass note and a memlab consumption recipe.

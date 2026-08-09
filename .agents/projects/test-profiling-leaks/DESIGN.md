# Test profiling & leak detection — Design

Env-gated tooling to (a) CPU-profile and (b) leak-detect **existing** vitest
suites, triggered by an environment variable, reusing the current `moon :test`
job, with **zero edits to the test files** themselves.

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
   `beforeEach`/`afterEach` — the existing tests *are* the workload:
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
  for (let i = 0; i < 3; i++) { global.gc(); await new Promise((r) => setImmediate(r)); }
};

let seen = 0;
afterEach(async () => { if (++seen === 1) { await settle(); writeHeapSnapshot('./before.heapsnapshot'); } });
afterAll(async () => { await settle(); writeHeapSnapshot('./after.heapsnapshot'); });
```

Run: `DX_DEBUG_LEAKS=1 moon run <pkg>:test -- the-existing.test.ts`.

### Signal quality

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

## Config placement — OPEN

Do **not** bake `singleFork`/`isolate:false`/`execArgv` into the shared
`vite.base.config.ts` unconditionally — it would serialize every package's test
run. Options to decide:

1. Env-gated block inside the shared `createConfig`/node-config builder, so any
   package inherits the behavior only when `DX_PROFILE_TESTS`/`DX_DEBUG_LEAKS` is
   set. (Preferred — one place, opt-in by env.)
2. Per-package opt-in helper for packages that want it.

## Rejected / out of scope

- Programmatic `inspector.Session` CPU profiling (precise but needs code).
- FinalizationRegistry assertion as a CI leak *regression gate* (deterministic,
  but requires per-object test code) — noted as a future option, not this pass.
- memlab auto-retainer analysis — external tool; can consume the emitted
  `.heapsnapshot` files later without changing this design.

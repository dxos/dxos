# Stryker mutation testing — evaluation for `echo-client` and `compute-runtime`

Status: evaluation only (2026-08). Nothing is wired into CI.

## Summary

StrykerJS 10 with `@stryker-mutator/vitest-runner` **works** against this repo's
vitest 4.1.10 node projects, with three caveats (below). Measured mutation scores are
low enough to be informative: the surviving mutants point at real assertion gaps rather
than at tool noise.

| Package           | Scope measured                                            | Mutants | Score                        | Wall clock (4 cores)            |
| ----------------- | --------------------------------------------------------- | ------- | ---------------------------- | ------------------------------- |
| `compute-runtime` | whole `src` minus tests/`testing`/`LayerStack.ts`         | 2759    | **42.5%** (59.0% of covered) | 43m11s                          |
| `echo-client`     | `util/migrate-document.ts`, `query/query-result-cache.ts` | 63      | **71.0%**                    | 2m45s (2m23s of it the dry run) |
| `compute-runtime` | `object-template.ts`, `protocol.ts`                       | 262     | 24.4%                        | 1m04s                           |

Baselines for comparison: `moon run compute-runtime:test` = 21s of vitest; `echo-client:test` = 65s.

## What the numbers say

`compute-runtime`, whole package: 2837 mutants were instrumented and 2759 scored — 1165 killed,
814 survived, 773 never covered by any test, 7 timeouts, 0 runtime errors; the remaining 78 are
static mutants that `ignoreStatic` excluded from the run. Notable per-file results:

- Fully unexercised: `url.ts`, `functions-trace.ts`, `services/s3-host.ts`, `services/credentials.ts` (0%).
- Barely exercised: `trace-buffer.ts` 2.9%, `protocol.ts` 18.2%, `services/credentials.ts` 0%.
- Load-bearing but weakly asserted: `ProcessManager.ts` 45%, `ProcessHandle.ts` 39.6%,
  `triggers/trigger-dispatcher.ts` 56.6% — these have tests, and roughly half their behaviour
  can be broken without a test noticing.
- Genuinely well tested: `SwarmTraceSink.ts` and `RemoteTraceMonitor.ts` at 100%,
  `TriggerMonitor.ts` 85%, `triggers/trigger-state-store.ts` 82%, `process-store.ts` 77%.

`echo-client`'s `migrate-document.ts` at 70% is the pattern to expect from a well-tested pure
module: most survivors are mutations of `log(...)` arguments and of conditions inside
`invariant(...)` — code whose removal is invisible by design. That is signal about which
mutants to exclude, not about test quality.

## Caveats found by actually running it

1. **Instrumenter crash on `x!++`.** `LayerStack.ts:706` (`inDegree[i]!++`) and `:730` aborts
   the whole run with a `@babel/types` validation error (`UpdateExpression` argument may not be
   a `TSNonNullExpression`). Upstream bug in `@stryker-mutator/instrumenter@10`. Workaround:
   exclude the file, or drop the non-null assertions (which the repo's no-cast rule discourages anyway).
2. **`inPlace: true` is required, and it edits your working tree.** Per-package sandboxing does
   not work: the vitest config imports `../../../../vite.base.config.ts` and `tools/` from the repo
   root, and pnpm workspace symlinks do not survive the copy. In-place mode also prepends
   `// @ts-nocheck` to every file in the package (`disableTypeChecks`). Stryker restores from
   `.stryker-tmp/backup-*` on exit — but a hard kill mid-run leaves the tree dirty, so never run it
   on uncommitted work.
3. **Plugin resolution under pnpm.** With the runner installed at the workspace root, Stryker run
   from a package directory reports `Cannot find TestRunner plugin "vitest"`. Fixed by an explicit
   absolute `plugins` entry in `stryker.conf.json`.

Non-issues, contrary to expectation: vitest 4.1.10 is supported (the runner branches on `>=4.1.0`);
the forced `pool: 'threads', maxWorkers: 1` did not break `node:sqlite` or automerge WASM;
`@effect/vitest` tests are killed normally; `perTest` coverage works and cut the average to
1–9 tests per mutant.

## Measured effect of acting on the survivors

The survivor list was then used to strengthen three existing `compute-runtime` suites (tests only,
no source changes): 164 → 178 passing tests. Re-running Stryker over just those four source files
gives the before/after, both runs with `ignoreStatic`:

| File                    | Before | After      | Delta |
| ----------------------- | ------ | ---------- | ----- |
| `process-store.ts`      | 77.27% | **93.18%** | +15.9 |
| `ProcessManager.ts`     | 45.00% | **53.48%** | +8.5  |
| `ProcessHandle.ts`      | 39.64% | **45.33%** | +5.7  |
| `trigger-dispatcher.ts` | 56.62% | **58.05%** | +1.4  |

Scores are as Stryker reports them; deltas are rounded to one decimal. 1641 mutants, 45m56s on 4 cores. The spread is the useful part: a small, self-contained store
moves a long way on a handful of assertions, while `trigger-dispatcher.ts` barely moves because
most of its remaining survivors are `log()`/`invariant()` arguments and private helpers with no
public seam — exactly the mutants worth NOT chasing. Reading the score without that distinction
would mislead.

## Cost model

The dry run pays the full suite once (echo-client: 2m23s — 2× its normal 65s because Stryker
serialises it). After that each mutant costs roughly one test file. Extrapolating from
`compute-runtime` (2837 mutants / 43min on 4 cores), `echo-client` — 15.6k lines of source and
720 mutants in just 4 files — is plausibly **several hours** for a whole-package run and should
never be run un-scoped.

## Recommendation

1. **Do not add it to CI as a gate.** Run cost is 100× the test suite and the score is dominated
   by uncovered files, which existing line coverage already tells you about more cheaply.
2. **Use it as an on-demand audit tool for a specific module** you are about to change or harden
   — that is where the 43%-on-`ProcessManager` type of result pays for itself.
3. If adopted, configure `ignoreStatic: true`, `mutate` scoped to a handful of files, and
   `mutator.excludedMutations` for `StringLiteral`/`ObjectLiteral` to suppress the `log()`/`invariant()`
   survivors that dominate otherwise-good files.
4. Report the `x!++` crash upstream.

## Reproducing

The Stryker packages are deliberately NOT in the workspace's `package.json`: adding them at the
root made pnpm rewrite peer-dependency keys across the whole lockfile (~1600 lines), which CI's
frozen install rejects with `ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY`. For an on-demand audit tool
that is not worth a permanent lockfile change — install it for the session, then revert what the
command wrote to BOTH the workspace-root `package.json` and the shared `pnpm-lock.yaml` when the
audit is done (keeping any unrelated edits of your own):

```sh
pnpm add -Dw --ignore-workspace-root-check @stryker-mutator/core@10 @stryker-mutator/vitest-runner@10
```

Per-package `stryker.conf.json` files are checked in. Build the package's deps first
(`moon run <pkg>:test` once), then from the package directory:

```sh
pnpm exec stryker run
```

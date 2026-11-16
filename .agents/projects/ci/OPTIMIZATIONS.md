# CI optimizations

Ways to make CI cheaper and faster without changing which tests gate a merge. Test selection
(blocking, nightly, flaky, advisory) is in `TESTING.md` (dxos/dxos#14537); this document is about the
cost of running whatever is selected.

Measurements come from the GitHub Actions data collected for `TESTING.md` (dxos Check runs of 2026-11-07 to
11-14, edge Check runs of 2026-10-31 to 11-14) and from local timings where stated.

## Summary

| #   | Change                                                    | Where the time goes today                                                 | Estimated saving                                                                             | Effort     | Status       |
| :-- | :-------------------------------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------- | :--------- | :----------- |
| 1   | Call workspace binaries directly, not through `pnpm exec` | ~1 s per moon task in wrapper start-up                                    | ~1 s per package build, ~6 min of 40 cold build task-minutes; similar per lint and test task | Small      | **Done**     |
| 2   | Lean config for library builds                            | ~1.5 s per package loading `vite.base.config.ts`                          | ~1 s per package, ~6 min of build                                                            | Medium     | Proposed     |
| 3   | Native vite config loading                                | Config bundled with esbuild before every build                            | None measured                                                                                | Small      | **Rejected** |
| 4   | One `tsc -b` for all declarations                         | One `tsc` process per package                                             | Unmeasured; most of the per-package declaration start-up                                     | Medium     | Proposed     |
| 5   | One repo-wide lint run, lint decoupled from builds        | 368 lint tasks, median 5.5 s, 36 min                                      | Most of 36 min; lets lint run in its own job                                                 | Medium     | Proposed     |
| 6   | Force the nightly rebuild once, not per stage             | ~80 min of repeated builds per nightly `check`                            | ~80 min per nightly; ends the 75-min timeouts                                                | Small      | Proposed     |
| 7   | Cut per-file module loading in node tests                 | Import 85 min vs tests 75 min per full run                                | Plausibly ~40% of `test-node`                                                                | Medium     | Proposed     |
| 8   | Fix the heaviest importers                                | e.g. `react-ui-canvas`: 199 s import for 6 s of tests                     | Several minutes per full run                                                                 | Small each | Proposed     |
| 9   | Run edge `test-packages` tasks in parallel                | 23 min job for ~3 min of tests (`--concurrency=1`)                        | ~15 min wall per edge PR                                                                     | Small      | Proposed     |
| 10  | Bake tool installs into the snapshot or image             | `Install sandbox tools` ~3 runner-min per PR run; edge Setup 87 s per job | ~3 min per dxos PR run, ~10 per edge run                                                     | Small      | Proposed     |
| 11  | Affected scoping in edge                                  | Every edge PR runs every package                                          | Most of a leaf-package edge PR                                                               | Medium     | Proposed     |
| 12  | Stop plugin changes re-triggering all Composer e2e        | Any plugin change runs all 8 Composer e2e cells (~90 runner-min)          | Moot once e2e is nightly                                                                     | —          | Superseded   |
| 13  | knip off PRs                                              | ~3.5 min on every PR run, never cached                                    | 3.5 min per PR                                                                               | Small      | **Done**     |
| 14  | Investigate warm peer-deps check                          | 66 s on a warm PR vs 20 s cold                                            | ~45 s per PR                                                                                 | Small      | Proposed     |

## 1. Call binaries directly (done)

Every shared moon task ran its tool through `pnpm exec` (`pnpm exec vite build`, `pnpm exec tsc`,
`pnpm exec oxlint`, `pnpm exec dx-killorphans vitest …`), and the declaration step of every vite
library build started a second `pnpm exec tsc`. moon already puts the workspace's
`node_modules/.bin` on `PATH`, so the wrapper only adds start-up time.

Measured on `packages/common/keys` (20 source files): `pnpm exec vite build` takes 2.9–3.0 s,
calling the binary directly takes ~2.0 s. With ~370 library builds per cold run that is ~6 min of
the ~40 build task-minutes, and lint and test tasks drop by a similar amount each.

Changed: the commands in `.moon/tasks/*.yml` and `runDeclarationBuild` in `vite.base.config.ts`.
Left on `pnpm exec`: `evalite` and `tauri`, whose binaries are installed only in their own packages,
and the per-package `moon.yml` overrides.

## 2. A lean config for library builds

Loading `vite.base.config.ts` takes ~1.5 s of every package build (measured on `keys`). The file is
~1,400 lines and also defines the vitest projects, so a plain library build imports the test
tooling it never uses:

| Import                                  | Time        |
| :-------------------------------------- | :---------- |
| `@storybook/addon-vitest/vitest-plugin` | 360 ms      |
| `vite-plugin-solid`                     | 170 ms      |
| `vite`                                  | 136 ms      |
| `@vitest/browser-playwright`            | 83 ms       |
| the rest                                | <20 ms each |

Splitting the build configuration from the test configuration, or importing the test plugins only
when a test project is created, should save ~1 s per package build.

## 3. Native config loading (rejected)

Vite warns that the config cannot use its native loader (`configLoader: 'native'`) because
`vite.base.config.ts` and `vitest.tags.ts` use ESM syntax without `"type": "module"`. Measured on
`keys`, 8 builds each: the default loader and `--configLoader native` both take ~2.0 s median, with
or without `"type": "module"` in the root `package.json`. The config load time is the imports
(#2), not the bundling, so this is not worth the change (`"type": "module"` would also break the
CommonJS `.ncurc.js` and `tools/tree-sitter-mdl/grammar.js`).

## 4. One `tsc -b` for declarations

Each vite library build runs its own `tsc` for declarations. `tsconfig.base.json` already sets
`composite`, so a single `tsc -b` over the project graph could emit every package's declarations
in one process, reading each dependency's types once. TypeScript 7 (native) is already in use, so
the remaining cost is mostly per-process start-up; this is unmeasured.

## 5. Lint: one run, and no dependency on builds

The 368 lint tasks have a median of 5.5 s and add up to 36 min per cold run, about as much as the
builds. Lint is type-aware (`typeAware: true` in `.oxlintrc.json`) and reads each dependency's
built types, so the `lint` task depends on `^:build` and its own build.

- **One run:** oxlint is built to lint a whole repository in one process. A single run (or one per
  shard) instead of one per package removes most of the per-task start-up.
- **Splitting `check` into lint and build jobs only helps if lint stops needing the builds.** Today
  a separate lint job would have to rebuild or wait for the build job, which doubles the build work
  for little wall-time gain. If the type-aware rules could resolve types from source (or ran in a
  separate, smaller task), lint could run in its own job in parallel with the build.

## 6. Force the nightly rebuild once

The nightly sets `MOON_FORCE`, so every later stage of `check` rebuilds what the compile gate just
built: module structure (~30 min of build tasks), edge release (~18 min) and plugin set plus docs
(~31 min), on top of the compile gate's ~38 min. That is ~80 min of duplicate work per nightly and
the reason 3 of the last 5 nightly `check` jobs hit the 75-min timeout. PRs and the merge queue are
not affected, because the later stages hit the cache. Forcing only the first stage removes it.

## 7. Per-file module loading in node tests

From vitest's own summary lines in two nightlies (304 node test tasks, 223 min of task time):

| Where the time goes                                             | Minutes |
| :-------------------------------------------------------------- | :------ |
| Test bodies                                                     | 75      |
| Importing each test file's modules (incl. ~52 min of transform) | 85      |
| Setup files                                                     | 22      |
| Other inside vitest (environment, teardown, coverage)           | ~22     |
| Outside vitest (process start, config load)                     | 19      |

Each test file loads its module graph again (vitest's default per-file isolation), and CI passes
`--no-file-parallelism`, so files run one after another. Half the tasks (157 of 304) run less than
2 s of tests; the median task takes 20 s for 1.4 s of tests. Options:

- `isolate: false` for pure-unit packages, so files in a package share loaded modules.
- File parallelism where tests share no global state.
- Fewer, larger vitest processes (vitest `projects` across packages), so start-up and transform are
  paid once rather than per package.
- Measure coverage cost with one nightly at `VITEST_COVERAGE=false`.

Storybook shows the same pattern: 91 min of task time for 29 min of story tests.

## 8. The heaviest importers

| Package                  | Import | Tests |
| :----------------------- | :----- | :---- |
| `react-ui-canvas`        | 199 s  | 6 s   |
| `plugin-assistant`       | 170 s  | 77 s  |
| `plugin-space`           | 148 s  | 141 s |
| `plugin-canvas`          | 130 s  | 145 s |
| `react-ui-canvas-editor` | 129 s  | 10 s  |
| `stories-brain`          | 111 s  | 0 s   |

Something in these packages loads a large module graph per test file; a lazy import or a mock
should fix each one.

## 9. Edge `test-packages` in parallel

Edge's `test-packages` job runs every non-edge package with `moon exec … --concurrency=1`. Its test
step takes 19.6 min; the JUnit time of those tests is ~3 min. Running the tasks in parallel (as
dxos does with `MOON_CONCURRENCY=4`) should bring the job close to its build plus test time.

## 10. Per-job setup

- dxos `test-node` cells spend ~3 runner-min per PR run installing bubblewrap, socat and ripgrep
  (`Install sandbox tools`). Baking them into the workspace snapshot or runner image removes the
  step.
- Every edge job pays a composite Setup of 87 s median; Check runs it in 7 jobs, ~10 runner-min per
  run before any work starts. dxos PR jobs mount a workspace snapshot instead (29 s).
- Fewer, larger cells pay setup fewer times.

## 11. Affected scoping in edge

Edge Check runs every package on every PR, whatever changed (no JUnit replays were found in 37
sampled runs). dxos scopes PR runs to the packages a change affects; doing the same in edge would
shrink a leaf-package PR to that package and its dependents.

## 12. Composer e2e on plugin changes (superseded)

Every Composer plugin is bundled into `composer-app`, so any plugin change re-runs all 8 Composer e2e
cells (~90 runner-min). With e2e moving to nightly in `TESTING.md` this no longer costs PRs.

## 13. knip off PRs (done)

knip is never cached and took ~3.5 min of every PR's `check`. It now runs nightly and on dispatch
only (`check.yml`), together with the boot budget (~4 min per PR).

## 14. Warm peer-deps check

The peer-dependency step (`pnpm install --resolution-only`) takes 66 s on a warm PR run but 20 s on
the cold nightly. Worth a look: something in the warm path (the mounted snapshot, or the lockfile
restore) makes it three times slower.

# Affected scoping

Works out what `moon` should run in this job, once, and exports it as environment variables. Every `moon` step in the job is then unconditional, with no `--affected` flag and no `if:`.

Call it after `setup`, which is what puts node on PATH:

```yaml
- name: Setup
  uses: ./.github/actions/setup

- name: Resolve affected scope
  uses: ./.github/actions/affected
```

It exports `MOON_AFFECTED=remote` and `MOON_BASE=<sha>`, or nothing for a full run, except `MOON_FORCE=true` on the scheduled run. `moon run` and `moon exec` both read all three (2.5.2), including through the Trunk uploader's `run:` input, which is why a scoped command can stay a plain string.

## Base per trigger

The base comes from the event payload rather than from moon's own `vcs.defaultBranch` resolution, which is right only for a topic-branch PR.

| Trigger | Scope | Base |
| :-- | :-- | :-- |
| `pull_request` / `pull_request_target` | affected | `pull_request.base.sha` |
| `merge_group` | affected | `merge_group.base_sha` |
| `push` to `main` | all | none |
| `push` to any other branch, `workflow_dispatch` | affected | merge-base with `origin/main` |
| `schedule` | all, bypassing the cache unless the job passes `force: 'false'` | none |
| no event payload | affected | merge-base with `origin/main` |
| `all: true` on the action | all | none |
| a scoped trigger above, when the change touches `pnpm-lock.yaml` or `tools/moon-dependency-closure/dependency-closure.wasm`, or the diff cannot be read | all | none |

`e2e` passes `all: true` on a `workflow_dispatch`, because a dispatch exists to run the whole suite.

**A base that will not resolve means a full run, never an empty one.** `moon` exits 0 having run nothing when the affected set comes back empty, so a base that quietly fails to resolve would turn every gate in the workflow green. Same silent-degradation class as a dropped remote cache, which the CI project's [`DESIGN.md`](../../../.agents/projects/ci/DESIGN.md) covers.

## Dependency changes

Only tasks that load other projects' code outside the dependency graph list `pnpm-lock.yaml`: the `check-module-structure` import checks and `storybook-react:bundle`, which finds every package's stories by glob. Every other task carries the `dependency-closure` toolchain, a moon plugin built from [`tools/moon-dependency-closure`](../../../tools/moon-dependency-closure) that adds a hash of the project's dependency closure to the task's hash. The closure is every third-party package the project can load, through its own dependencies, its workspace links, and the toolchain projects (the workspace root and the Storybook configs), each with what it resolves its own dependencies to. moon adds the toolchain to every task that uses `javascript`, `node` or `typescript`. A dependency change reruns the projects whose closure it changes. Of the 173 lockfile changes on `main` from 2026-09-15 to 2026-10-15, the average one changed 29% of closures, and 92 changed none.

Touched-file detection cannot see a closure: scoped to the files a PR touched, a lockfile-only change would select no build or test. A change to `pnpm-lock.yaml` or to the committed plugin therefore runs everything, and the cache decides what executes. `moon run <target> --log debug` prints what each project's closure hashes.

On the scheduled run on weekday mornings this action sets `MOON_FORCE`, which bypasses the cache, so in every job that calls it an input missing from a task's key fails by the next weekday run instead of passing from the cache. The jobs that run tests (`test-node` and both e2e jobs) pass `force: 'false'`, because `check` already forces the builds and a forced test job rebuilds every dependency on the same 4 vCPU its tests run on. Their test tasks list a per-run input instead (`DX_TEST_RUN_ID`, `DX_E2E_RUN_ID`), so the scheduled run still executes them rather than replaying the cache.

## Opting a step out

The scope is job-level, so a `moon` step that must run whatever changed has to say so. One does, `check`'s `check-plugin-set` and `docs:bundle`:

```yaml
run: >-
  env -u MOON_AFFECTED -u MOON_BASE -u MOON_HEAD
  moon exec composer-app:check-plugin-set docs:bundle --on-failure continue
```

Both catch a property of an import edge, where the offending commit lands in a package neither project's inputs name. Scoped, they no-op on exactly the PRs they exist to catch.

**Unset the variables. Do not set `MOON_AFFECTED` to an empty string.** Empty is not "off", because moon reads it as an empty base and still filters, so the step reports "No tasks affected" and passes having checked nothing.

`moon query` is unaffected either way. Its subcommands do not read `MOON_AFFECTED`, so the `e2e` job's `Select shard targets` step returns the same list with or without it.

## Running it by hand

`resolve-affected.mjs` needs no arguments and no CI environment. With no `GITHUB_*` set it falls back to the merge-base, so it tells you what CI would decide for the checkout you are in.

```bash
A=.github/actions/affected/resolve-affected.mjs
node $A                       # what CI would decide here
node $A --event merge_group   # emulate another trigger
node $A --help                # every flag
eval "$(node $A --shell)" && moon run :build
```

# Depot CI

The build/test pipeline lives here. [`workflows/`](./workflows) holds the workflow files, [`actions/`](./actions) the composite actions they share. What remains on GitHub's own runner, and why, is in [`.github/workflows/README.md`](../.github/workflows/README.md).

## Why Depot CI

- **GitHub Actions goes down.** Outages took the whole pipeline with them, on someone else's schedule.
- **It is faster.** Depot's runners also sit closest to the moon remote cache. That was measured, and it is why Depot stayed when Blacksmith was evaluated as an alternative (CI project [`REPORT.md`](../.agents/projects/ci/REPORT.md), "Runners").
- **The workflow syntax is GitHub's.** Migrating a workflow means moving the file. `uses:`, `needs:`, matrices, `if:` expressions and the `github` context all behave as before. Depot then adds things Actions has no syntax for, such as the `parallel:` blocks below.
- **A workflow can go straight from the CLI.** `depot ci run` takes the file and your uncommitted changes, so you can iterate on a workflow edit without committing or pushing it.

Compatibility ends where a third party checks GitHub's own run identity rather than the workflow's behaviour. Artifact handoff across `workflow_run`, npm OIDC and pkg.pr.new all do that. Four workflows stayed behind because of it, and each names its symptom in the GitHub README's table.

## Running a workflow without pushing

`depot ci run` submits a workflow file to Depot and injects a step that applies your uncommitted changes as a patch after checkout. The run happens on Depot, not on your machine, so this is not a local runner. What it buys is iterating on a workflow edit without committing it:

```bash
depot ci run --workflow .depot/workflows/check.yml --job check
depot ci run --workflow .depot/workflows/check.yml --job check --ssh-after-step 3   # drop into the sandbox
```

## Affected scoping

Every `moon` step in Check is unconditional. [`actions/affected`](./actions/affected) decides what runs, once per job, by exporting `MOON_AFFECTED` and `MOON_BASE`. Both `moon run` and `moon exec` read those (2.5.2), including through the Trunk uploader's `run:` input, so no `moon` step carries an `--affected` flag or an `if:`.

| Trigger | Scope | Base |
| :-- | :-- | :-- |
| `pull_request` / `pull_request_target` | affected | `pull_request.base.sha` |
| `merge_group` | affected | `merge_group.base_sha` |
| `push` to `main` | all | none |
| `push` to any other branch, `workflow_dispatch` | affected | merge-base with `origin/main` |
| `schedule` | all | none |
| no event payload | affected | merge-base with `origin/main` |
| any trigger, with `all: true` on the action | all | none |

That second-to-last row covers any invocation with no event payload, including running the resolver by hand in a checkout. Without it such a run would fall back to rebuilding the world.

`e2e-bundle` and `e2e` set `all: true` on an explicit `e2e` dispatch, which exists to run the whole suite. The two jobs must agree, or a cell runs suites whose bundle was never warmed.

The resolver is [`resolve-affected.mjs`](./actions/affected/resolve-affected.mjs), beside the action that calls it, and it runs anywhere:

```bash
A=.depot/actions/affected/resolve-affected.mjs
node $A                       # what CI would decide for this checkout
node $A --event merge_group   # emulate another trigger
node $A --help                # every flag
eval "$(node $A --shell)" && moon run :build
```

**It falls back to a full run whenever a base cannot be resolved.** That matters more than it sounds. `moon` exits 0 having run nothing when the affected set comes back empty, so a base that quietly fails to resolve turns every gate in the workflow green. Same silent-degradation class as a dropped remote cache, which the CI project's [`DESIGN.md`](../.agents/projects/ci/DESIGN.md) covers.

### Opting a step out of the scope

The scope is job-level, so a `moon` step that must run unconditionally has to say so. Exactly one does, `check`'s `check-plugin-set` and `docs:bundle`, which catch import-edge regressions whose offending commit lands in a package neither project's inputs name:

```yaml
run: >-
  env -u MOON_AFFECTED -u MOON_BASE -u MOON_HEAD
  moon exec composer-app:check-plugin-set docs:bundle --on-failure continue
```

**Unset the variables. Do not set `MOON_AFFECTED` to an empty string.** Empty is not "off", because moon reads it as an empty base and still filters, so the step reports "No tasks affected" and passes having checked nothing.

`moon query` is unaffected either way. Its subcommands do not read `MOON_AFFECTED`, so the `e2e` job's `Select shard targets` step returns the same list with or without it.

## Parallel steps

Depot CI runs [steps concurrently](https://depot.dev/docs/ci/how-to-guides/parallel-steps) inside one job with a `parallel:` block, and `sequential:` groups ordered steps inside that. GitHub's syntax has no equivalent. Used where steps are independent and the job is otherwise paying their sum:

| Job | Block | Why |
| :-- | :-- | :-- |
| `check` | the nine no-build gates | Independent node scripts, 1 to 6 s each. `fail-fast: false`, so a PR with two problems learns both in one run instead of one per cycle. |
| `check` | knip alongside `check-plugin-set` + `docs:bundle` | About 2m30s against 1m and 1m. The two moon checks share one invocation because they overlap in `^:build`, so moon schedules that graph once instead of two processes contending for the same task locks. `fail-fast: false` replaces the old `continue-on-error` and gate-step pair. |
| `test`, `e2e` | per-cell preparation | The browser download dominates, and the `find` and the `moon query` ride along with it. Step `id`s and outputs survive the block, since Depot merges each unit's state back when they join. |

Two things a `parallel:` block must not contain: a step that mutates a moon task input, `pnpm-lock.yaml` above all, whose restoring `trap` does not survive a hard cancellation; and a second concurrent `moon` process in the same workspace. The peer-dependency check in `check` is sequential for the first reason.

Depot snapshots step outputs, env and `$GITHUB_PATH` per unit and merges them back on join. The filesystem is shared across the whole block.

## Trunk

[Trunk](https://trunk.io) ingests JUnit from the Check workflow ([`check.yml`](./workflows/check.yml)) for flaky-test detection and quarantine. The `test` and `e2e` jobs wrap their `moon` steps with `trunk-io/analytics-uploader@v1` (`org-slug: dxos`, `quarantine: true`, `TRUNK_TOKEN`). Uploaded XML feeds Trunk for flaky labeling and quarantine decisions.

### Jobs and artifacts

| Job | What runs | JUnit paths Trunk reads |
| :-- | :-- | :-- |
| `test` | Every vitest flavour: unit, browser, storybook and workerd (`:test`, `:test-browser`, `:test-storybook`, `:test-workerd` via uploader; same workflow triggers as the rest of Check), sharded over 4 runners with `moon exec --job <0-3> --job-total 4` so cells are sized by work rather than by flavour. | `test-results/**/results.xml` |
| `boot-budget` | `composer-app:check-boot-budget`, the static boot-graph budget over the production bundle, on its own runner because it builds `bundle` and nothing else in the workflow does. On a same-repo PR it also measures the base commit, restoring its report from the remote cache since the task declares it as an output. A separate `boot-budget-comment` job posts the sticky `<!-- boot-budget -->` comment, holds the only `pull-requests: write` grant, and runs no PR-controlled code. Advisory, so only the budget itself gates. | none |
| `boot-budget-comment` | Posts, updates or deletes the boot-graph sticky comment from `boot-budget`'s outputs. No checkout and no build. It exists so the write token is never in a job that runs branch code. | none |
| `e2e` | Playwright e2e via uploader, 6 matrix cells: browser (`chromium` / `firefox` / `webkit` via `PLAYWRIGHT_BROWSER`) x shard (`composer` runs `composer-app:e2e` in a dedicated cell; `rest` runs an explicit target list computed by `moon query tasks "task=e2e && project!=composer-app"`, so a new suite joins the pool with no hand-maintained list). DESIGN.md explains why a glob or `moon exec --query` cannot express that list. The job runs only for `main` and `changeset-release/*` refs, or `workflow_dispatch` with `e2e` (see [`check.yml`](./workflows/check.yml)). | `test-results/playwright/report/*.xml` |

The vitest flavours go through Trunk on typical PRs. e2e only does when the `e2e` job runs, which is not on ordinary topic-branch PRs. Exact `moon` commands and `env` are in [`check.yml`](./workflows/check.yml).

Why the matrix is shaped this way, what it intermittently fails on, how to attribute a red cell, and which fixes are already refuted are in the CI project's [`DESIGN.md`](../.agents/projects/ci/DESIGN.md). Two other sharding strategies were measured against this one and rejected; that is recorded there too.

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| Flaky in Trunk | Trunk UI, or automatically via Trunk's pass-on-rerun detection | None. Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| Quarantine in Trunk | Trunk UI | None | Test still runs; its failure does not fail the job |
| Vitest `tags: ['flaky']` | Code (per-suite/test option, declared in [`vitest.tags.ts`](../vitest.tags.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites skip on your machine | The `test` job sets `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e && !manual'`, so `flaky` tests run and Trunk keeps signal |

Trunk marks a test flaky when it sees a fail-then-pass-on-retry pattern within one CI job, a failing attempt followed by a passing retry. That is distinct from marking a test flaky by hand in the Trunk UI.

Playwright e2e runs with `retries: 0` (`e2ePreset`), so pass-on-rerun cannot fire for those suites. There is no retry for Trunk to observe. One temporary exception: three two-peer describes retry twice, composer's halo and collaboration plus todomvc's `Basic test`. That is scoped to the tracked production-edge defect DX-1152 and comes out when it lands, and pass-on-rerun can fire there, which is the visibility we want.

We removed retries because they hid flakes behind a 3x time cost and made shard timings useless for sizing the suite. Three `inbox.spec.ts` tests alone burned about 9 minutes of a shard, failing three times each. A flaky e2e test should therefore fail loudly once and then get `test.fixme` with a TODO until someone fixes it. Trunk still detects flakiness across runs, and quarantine still masks a known-bad test. This applies to Playwright only. The vitest jobs are unaffected.

The other tags (`sync`, `sync-e2e`, `functions-e2e`, `manual`) are declared in [`vitest.tags.ts`](../vitest.tags.ts), and you opt in by overriding `VITEST_TAGS_FILTER` or passing `--tagsFilter=<expr>` directly. They are not tied to Trunk.

## Resources

- https://depot.dev/docs/ci/overview
- https://depot.dev/docs/cli/reference/depot-ci
- https://depot.dev/docs/ci/how-to-guides/parallel-steps
- https://docs.trunk.io

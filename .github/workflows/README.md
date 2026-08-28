# CI

**Check** and the other portable workflows run on [Depot CI](https://depot.dev/docs/ci/overview) and live in [`.depot/workflows/`](../../.depot/workflows); `.github/workflows/` keeps what still needs GitHub's own runner (deploys, publishing, the Claude bots). The composite actions the portable workflows share — setup, affected — are in [`.depot/actions/`](../../.depot/actions).

## Running a workflow locally

`depot ci run` submits a workflow file to Depot with your uncommitted changes applied as a patch, so a workflow edit can be exercised without pushing it:

```bash
depot ci run --workflow .depot/workflows/check.yml --job check
depot ci run --workflow .depot/workflows/check.yml --job check --ssh-after-step 3   # drop into the sandbox
```

`act` (the previous local runner) targets `.github/workflows` and no longer sees **Check**.

## Affected scoping

Every `moon` step in **Check** is unconditional. What it runs is decided once per job by [`.depot/actions/affected`](../../.depot/actions/affected), which exports `MOON_AFFECTED` / `MOON_BASE` — both read by `moon run` and `moon exec` (2.5.2), including through the Trunk uploader's `run:` input. `moon` steps therefore carry no `--affected` flag and no `if:`; the previous shape was an Affected and an All variant of every step, gated on `branch != 'main'`.

| Trigger | Scope | Base |
| :-- | :-- | :-- |
| `pull_request` / `pull_request_target` | affected | `pull_request.base.sha` |
| `merge_group` | affected | `merge_group.base_sha` |
| `push` to `main` | **all** | — |
| `push` to any other branch, `workflow_dispatch` | affected | merge-base with `origin/main` |
| `schedule` | **all** | — |
| local run, no event payload | affected | merge-base with `origin/main` |
| any trigger, with `all: true` on the action | **all** | — |

`all: true` is set by `e2e-bundle` and `e2e` on an explicit `e2e` dispatch — that dispatch exists to run the whole suite, and the two jobs must agree or a cell runs suites whose bundle was never warmed.

The resolver is [`resolve-affected.mjs`](../../.depot/actions/affected/resolve-affected.mjs), beside the action that calls it, and it runs anywhere:

```bash
A=.depot/actions/affected/resolve-affected.mjs
node $A                       # what CI would decide for this checkout
node $A --event merge_group   # emulate another trigger
eval "$(node $A --shell)" && moon run :build
```

**It falls back to a full run whenever a base cannot be resolved**, which is not a nicety: `moon` exits 0 having run nothing when the affected set comes back empty, so a base that silently fails to resolve turns every gate in the workflow green. Same silent-degradation class as a dropped remote cache — see the CI project's [`DESIGN.md`](../../.agents/projects/ci/DESIGN.md).

## Parallel steps

Depot CI runs [steps concurrently](https://depot.dev/docs/ci/how-to-guides/parallel-steps) inside one job via a `parallel:` block (with `sequential:` for ordered groups inside it). Used where steps are independent and the job is otherwise paying their sum:

| Job | Block | Why |
| :-- | :-- | :-- |
| `check` | the nine no-build gates | Independent node scripts, 1–6 s each. `fail-fast: false`, so a PR with two problems learns both in one run instead of one per cycle. |
| `check` | knip ∥ (`check-plugin-set` + `docs:bundle`) | ~2m30s against ~1m and ~1m. The two moon checks share one invocation: they overlap in `^:build`, and moon schedules that graph once instead of two processes contending for the same task locks. `fail-fast: false` replaces the old `continue-on-error` + gate-step pair. |
| `test`, `e2e` | per-cell preparation | The browser download dominates; the `find` and the `moon query` ride along with it. Step `id`s and outputs survive the block — Depot merges each unit's state back when they join. |

Two things a `parallel:` block must not contain: a step that mutates a moon task **input** (`pnpm-lock.yaml` above all — its restoring `trap` does not survive a hard cancellation), and a second concurrent `moon` process in the same workspace. The peer-dependency check in `check` is sequential for the first reason.

### Opting a step out of the scope

Because the scope is job-level, a `moon` step that must run unconditionally has to say so. Exactly one does — `check`'s `check-plugin-set` + `docs:bundle`, which catch import-edge regressions whose offending edit lands in a package neither project's inputs name:

```yaml
run: >-
  env -u MOON_AFFECTED -u MOON_BASE -u MOON_HEAD
  moon exec composer-app:check-plugin-set docs:bundle --on-failure continue
```

**Unset the variables — do not set `MOON_AFFECTED` to an empty string.** Empty is not "off": moon reads it as an empty base and still filters, so the step reports "No tasks affected" and passes having checked nothing.

`moon query` is unaffected either way — its subcommands do not read `MOON_AFFECTED`, so the `e2e` job's `Select shard targets` step returns the same list with or without it.

## Trunk

[Trunk](https://trunk.io) ingests JUnit from the **Check** workflow ([`check.yml`](../../.depot/workflows/check.yml)) for flaky-test detection and quarantine. The **`test`** and **`e2e`** jobs wrap their `moon` steps with `trunk-io/analytics-uploader@v1` (`org-slug: dxos`, `quarantine: true`, `TRUNK_TOKEN`). Uploaded XML feeds Trunk for flaky labeling and quarantine decisions.

### Jobs and artifacts

| Job | What runs | JUnit paths Trunk reads |
| :-- | :-- | :-- |
| `test` | Every vitest flavour — unit, browser, storybook and workerd (`:test`, `:test-browser`, `:test-storybook`, `:test-workerd` via uploader; same workflow triggers as the rest of **Check**), sharded over 4 runners with `moon exec --job <0-3> --job-total 4` so cells are sized by work rather than by flavour. | `test-results/**/results.xml` |
| `boot-budget` | `composer-app:check-boot-budget` — the static boot-graph budget over the production bundle, on its own runner (it builds `bundle`, which nothing else in the workflow does). On a same-repo PR it also measures the base commit, restoring its report from the remote cache since the task declares it as an output. The sticky `<!-- boot-budget -->` comment is posted by a separate `boot-budget-comment` job, which holds the only `pull-requests: write` grant and runs no PR-controlled code. Advisory, so only the budget itself gates. | — |
| `boot-budget-comment` | Posts/updates/deletes the boot-graph sticky comment from `boot-budget`'s outputs. No checkout and no build — it exists so the write token is never in a job that runs branch code. | — |
| `e2e` | Playwright e2e via uploader, 6 matrix cells: browser (`chromium` / `firefox` / `webkit` via `PLAYWRIGHT_BROWSER`) x shard (`composer` runs `composer-app:e2e` in a dedicated cell; `rest` runs an explicit target list computed by `moon query tasks "task=e2e && project!=composer-app"`, so a new suite joins the pool with no hand-maintained list — see DESIGN.md for why a glob or `moon exec --query` cannot express this). Job runs only for `main` / `changeset-release/*` refs, or `workflow_dispatch` with `e2e` (see [`check.yml`](../../.depot/workflows/check.yml)). | `test-results/playwright/report/*.xml` |

**unit/browser/storybook/workerd** go through Trunk on typical PRs; **e2e** only when the `e2e` job runs (not on ordinary topic-branch PRs). Exact `moon` commands and `env` are in [`check.yml`](../../.depot/workflows/check.yml).

Why the matrix is shaped this way (two other sharding strategies were measured against it and rejected), what it intermittently fails on, how to attribute a red cell, and which fixes are already refuted are in the CI project's [`DESIGN.md`](../../.agents/projects/ci/DESIGN.md).

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| **Flaky** in Trunk | Trunk UI, or **automatically** via Trunk’s **pass-on-rerun** detection | None—Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| **Quarantine** in Trunk | Trunk UI | None | Test still **runs**; its failure does **not** fail the job |
| **Vitest `tags: ['flaky']`** | Code (per-suite/test option, declared in [`vitest.tags.ts`](../../vitest.tags.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites **skip** locally | the **`test`** job sets `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e && !manual'`, so `flaky` tests **run** and Trunk keeps signal |

**Pass-on-rerun:** Trunk marks a test as flaky when it observes a **fail then pass on retry** pattern (same CI job: a failing attempt followed by a passing retry). That is distinct from manually marking a test flaky in the Trunk UI.

**Playwright e2e runs with `retries: 0`** (`e2ePreset`), so pass-on-rerun cannot fire for those suites — there is no retry for Trunk to observe. (Temporary exception: the three two-peer describes — composer's halo and collaboration, todomvc's `Basic test` — retry 2x, scoped to the tracked production-edge defect DX-1152 and removed when it lands; pass-on-rerun CAN fire there, which is desired visibility.) Retries were removed because they hid flakes behind a 3× time cost and made shard timings useless for sizing the suite (three `inbox.spec.ts` tests alone burned ~9 minutes of a shard failing three times each). A flaky e2e test is therefore expected to fail loudly once and then be marked `test.fixme` with a TODO until it is fixed; Trunk still detects flakiness across runs and quarantine still masks a known-bad test. This applies to Playwright only — the vitest jobs are unaffected.

Other tags (`sync`, `sync-e2e`, `functions-e2e`, `manual`) are declared in [`vitest.tags.ts`](../../vitest.tags.ts) and opted in by overriding `VITEST_TAGS_FILTER` (or passing `--tagsFilter=<expr>` directly). They are not tied to Trunk.

## Resources

- https://depot.dev/docs/ci/overview
- https://depot.dev/docs/ci/how-to-guides/parallel-steps
- https://docs.trunk.io

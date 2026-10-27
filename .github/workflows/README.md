# GitHub Actions

Every workflow runs here, on GitHub's free standard runners: `ubuntu-24.04` (4 vCPU / 16 GB for a
public repository) and `macos-26` for the desktop and iOS builds. Images are pinned by version, never
`-latest`, so an OS upgrade is a commit rather than GitHub moving the label. Larger runners are billed
even on a public repository, so no workflow asks for one. Composite actions live in [`../actions/`](../actions).

## Check

[`check.yml`](check.yml) is the build/test pipeline. A draft PR runs `check` (lint, build, types), the
node tests and `boot-budget`. A ready PR adds the browser and storybook tests, which gate the merge, and
e2e on Chromium, Firefox and WebKit, which reports without gating.

The merge queue runs only what can block a merge: `check` and the cells behind `test`. A push to main
runs only e2e. Main moves to the commit the queue tested, so the queue's `check` and `test` results are
the ones shown on it. Push runs never cancel each other: GitHub keeps one pending run and replaces it with
each newer push, so a burst of merges gets one e2e run on its newest commit, and a red run names a range
of commits rather than one.

Each suite reports through one check whatever its shard count: `test` gates the node, browser and `native` cells,
`e2e` the e2e cells. A gate fails if any of its cells failed or was cancelled, or `plan` failed; a skipped
cell passes. Branch protection requires `check` and `test`; `e2e` reports without gating. Changing the
shard count never changes the required checks.

### Sizing for 4 vCPU / 16 GB

| Job | Cells | Why |
| :-- | :-- | :-- |
| `test node` | 2 shards, 4 targets at a time | Peaks under 10 GB with no browser. |
| `native` | 1 job: every `:test-native` | The Rust addon compiles RocksDB from source, about 25 minutes when forced; in a node cell it starved the tests. |
| `test browser` | Up to 8 cells of affected targets from `plan`: build the cell's closure at concurrency 4, then test 1 target at a time | Each target drives its own Chromium; sharing 4 vCPU with another target or a build made timing-sensitive stories fail. |
| `e2e composer` | Chromium and Firefox 2 shards × 2 workers, WebKit 4 shards × 1 worker | One WebKit page holds ~6 GB and two-peer specs open two, so WebKit cannot run two tests at once. The cell table is in [`plan.mjs`](../actions/plan/plan.mjs). |
| `e2e rest` | 2 target halves per browser, 1 worker | Storybook's cold start lost module loads with two workers. |

`moon exec --job N --job-total` splits targets by count and Playwright's `--shard` splits tests by count,
so shard times vary with which heavy targets land together.

### Affected scoping

`moon` steps in Check carry no `--affected` flag. [`actions/affected`](../actions/affected) works out the
scope once per job from the trigger and exports it, and every `moon` step in that job inherits it. Its
[README](../actions/affected/README.md) has the base per trigger, how to opt a step out, and how to run
the resolver by hand. [`actions/plan`](../actions/plan/plan.mjs) uses the same scope to start only the
test and e2e cells a change affects.

### Retries

Nothing retries. A story or test that fails intermittently is skipped (`tags: ['!test']` on a story,
`test.fixme` in Playwright) with a `TODO(owner)` until it is fixed, or quarantined in Trunk.

## Trunk

[Trunk](https://trunk.io) ingests JUnit from Check for flaky-test detection and quarantine. The cell
jobs (`test-node`, `test-browser`, `e2e-composer`, `e2e-rest`) wrap their `moon` steps with `trunk-io/analytics-uploader@v1` (`org-slug: dxos`,
`quarantine: true`, `TRUNK_TOKEN`).

| Job | JUnit paths Trunk reads |
| :-- | :-- |
| `test-node`, `test-browser` | `test-results/**/results.xml` |
| `e2e-composer`, `e2e-rest` | `test-results/playwright/report/*.xml` |

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| Flaky in Trunk | Trunk UI, or automatically via Trunk's pass-on-rerun detection | None. Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| Quarantine in Trunk | Trunk UI | None | Test still runs; its failure does not fail the job |
| Vitest `tags: ['flaky']` | Code (per-suite/test option, declared in [`vitest.tags.ts`](../../vitest.tags.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites skip on your machine | The `test-node` and `test-browser` jobs set `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e && !manual'`, so `flaky` tests run and Trunk keeps signal |

The other tags (`sync`, `sync-e2e`, `functions-e2e`, `manual`) are declared in
[`vitest.tags.ts`](../../vitest.tags.ts), and you opt in by overriding `VITEST_TAGS_FILTER` or passing
`--tagsFilter=<expr>` directly. They are not tied to Trunk.

## Reading a red run

```bash
gh run list --branch <branch> --workflow Check
gh run view <run-id> --log-failed
gh run rerun <run-id> --failed
```

`gh workflow run check.yml --ref <branch>` runs every suite on a branch once.

## Other workflows

| Workflow | Trigger | What it does |
| :-- | :-- | :-- |
| [`assistant-evals.yml`](assistant-evals.yml) | nightly, dispatch | Every `@dxos/assistant-evals` scenario against the live model, traced to PostHog. Reads the org's `ANTHROPIC_API_KEY` as `DX_ANTHROPIC_API_KEY`. |
| [`perf-nightly.yml`](perf-nightly.yml), [`boot-trend.yml`](boot-trend.yml), [`edge-nightly.yml`](edge-nightly.yml) | schedule or push to main, dispatch | Perf, boot-graph and EDGE trends. |
| [`pr-build.yml`](pr-build.yml) → [`pr-deploy.yml`](pr-deploy.yml) | `preview` label, `workflow_run` | Per-PR Worker preview; the build runs with no secrets, the deploy from the base branch. |
| [`publish-all.yml`](publish-all.yml) | push to main, dispatch | npm releases. npm's trusted publisher is configured against this file name. |
| [`pkg-pr-new.yml`](pkg-pr-new.yml) | push to main, dispatch, `workflow_call` | pkg.pr.new previews of every `main` commit. |
| [`deploy-apps.yml`](deploy-apps.yml), [`deploy-tauri.yaml`](deploy-tauri.yaml), [`deploy-docs-daily.yml`](deploy-docs-daily.yml) | schedule, dispatch | App, desktop and docs deploys. |
| [`docker-image.yml`](docker-image.yml) | push to main touching the image | `ghcr.io/dxos/gh-actions`, the container the release workflows run in. |
| [`draft-on-open.yml`](draft-on-open.yml) | `pull_request` | Opens agent PRs as drafts so they skip the browser and e2e suites until ready. |
| [`claude-*.yml`](.), [`opencode.yml`](opencode.yml) | issue and review events | Bots. |

`.github/actions/` also holds the Cloudflare release helpers (`cn-channel`, `cn-config`, `cn-release`).

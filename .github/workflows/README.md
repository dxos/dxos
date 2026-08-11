# GH Actions CI

## Tools

- Use `act` with local Docker Desktop to run GH Actions locally.

```bash
brew install docker-desktop
brew install act
```

To run check or test jobs:

```bash
act -j check
act -j test
```

To run e2e job:

```bash
./.github/workflows/scripts/test-act.sh check.yml e2e
```

## Trunk

[Trunk](https://trunk.io) ingests JUnit from the **Check** workflow ([`check.yml`](check.yml)) for flaky-test detection and quarantine. The **`test`**, **`storybook`**, and **`e2e`** jobs wrap their `moon` steps with `trunk-io/analytics-uploader@v1` (`org-slug: dxos`, `quarantine: true`, `TRUNK_TOKEN`). Uploaded XML feeds Trunk for flaky labeling and quarantine decisions.

### Jobs and artifacts

| Job | What runs | JUnit paths Trunk reads |
| :-- | :-- | :-- |
| `test` | Vitest + browser Vitest (`:test`, `:test-browser` via uploader; same workflow triggers as the rest of **Check**). | `test-results/**/results.xml` |
| `storybook` | Storybook tests (`:test-storybook` via uploader). Runs on its own runner in parallel with `test`. | `test-results/**/results.xml` |
| `e2e` | Playwright e2e via uploader, 6 matrix cells: browser (`chromium` / `firefox` / `webkit` via `PLAYWRIGHT_BROWSER`) x shard (`composer` runs `composer-app:e2e` in a dedicated cell; `rest` runs `':e2e-ci' plugin-script:e2e`). composer-app excludes the inherited `e2e-ci` so the pool glob never matches it; `moon exec --query` is not a substitute (it is ignored when a target is given — see DESIGN.md). Quarantine is off — a masked failure makes a green cell unfalsifiable, so unstable tests get `test.fixme` in the spec. Job runs only for `main` / `changeset-release/*` refs, or `workflow_dispatch` with `e2e` (see [`check.yml`](check.yml)). | `test-results/playwright/report/*.xml` |

**unit/browser/storybook** go through Trunk on typical PRs; **e2e** only when the `e2e` job runs (not on ordinary topic-branch PRs). Exact `moon` commands and `env` are in [`check.yml`](check.yml).

Why the matrix is shaped this way (two other sharding strategies were measured against it and rejected), what it intermittently fails on, how to attribute a red cell, and which fixes are already refuted are in the CI project's [`DESIGN.md`](../../.agents/projects/ci/DESIGN.md).

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| **Flaky** in Trunk | Trunk UI, or **automatically** via Trunk’s **pass-on-rerun** detection | None—Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| **Quarantine** in Trunk | Trunk UI | None | Test still **runs**; its failure does **not** fail the job |
| **Vitest `tags: ['flaky']`** | Code (per-suite/test option, declared in [`vitest.tags.ts`](../../vitest.tags.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites **skip** locally | **`test`** and **`storybook`** jobs set the same `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e && !manual'`, so `flaky` tests **run** and Trunk keeps signal |

**Pass-on-rerun:** Trunk marks a test as flaky when it observes a **fail then pass on retry** pattern (same CI job: a failing attempt followed by a passing retry). That is distinct from manually marking a test flaky in the Trunk UI.

**Playwright e2e runs with `retries: 0`** (`e2ePreset`), so pass-on-rerun cannot fire for those suites — there is no retry for Trunk to observe. (Temporary exception: the three two-peer describes — composer's halo and collaboration, todomvc's `Basic test` — retry 2x, scoped to the tracked production-edge defect DX-1152 and removed when it lands; pass-on-rerun CAN fire there, which is desired visibility.) Retries were removed because they hid flakes behind a 3× time cost and made shard timings useless for sizing the suite (three `inbox.spec.ts` tests alone burned ~9 minutes of a shard failing three times each). A flaky e2e test is therefore expected to fail loudly once and then be marked `test.fixme` with a TODO until it is fixed; Trunk still detects flakiness across runs and quarantine still masks a known-bad test. This applies to Playwright only — the vitest jobs are unaffected.

Other tags (`sync`, `sync-e2e`, `functions-e2e`, `manual`) are declared in [`vitest.tags.ts`](../../vitest.tags.ts) and opted in by overriding `VITEST_TAGS_FILTER` (or passing `--tagsFilter=<expr>` directly). They are not tied to Trunk.

## Resources

- https://nektosact.com/introduction.html
- https://docs.trunk.io

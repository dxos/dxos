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
| `e2e` | Playwright e2e (`:e2e-ci` plus `plugin-script:e2e`, via uploader), sharded on two axes into 9 matrix cells: browser (`chromium` / `firefox` / `webkit` via `PLAYWRIGHT_BROWSER`) x `moon exec --job N --job-total 3`. moon packs whichever targets each cell gets, so no target list is hand-maintained. composer-app is too big for one cell, so it opts out of the inherited `e2e-ci` and supplies `e2e-ci-1of2` / `e2e-ci-2of2` (Playwright `--shard`) instead. Quarantine is off — a masked failure makes a green cell unfalsifiable, so unstable tests get `test.fixme` in the spec. Job runs only for `main` / `changeset-release/*` refs, or `workflow_dispatch` with `e2e` (see [`check.yml`](check.yml)). | `test-results/playwright/report/*.xml` |

**unit/browser/storybook** go through Trunk on typical PRs; **e2e** only when the `e2e` job runs (not on ordinary topic-branch PRs). Exact `moon` commands and `env` are in [`check.yml`](check.yml).

### E2E sharding — alternatives measured and rejected

Two other sharding strategies were built out and run head-to-head against the shipped one in a single 27-cell run (9 cells each, same commit). Neither survives in the diff; recorded so the choice is not re-litigated from scratch.

| | critical path | runner-time | targets covered | test failures |
| :-- | --: | --: | --: | --: |
| Knapsack Pro queue mode + per-browser split | 297s | 1618s | 27/27 | 5 (only 2 surfaced) |
| Per-browser moon task variants, 9 cells | ~335s corrected | ~1470s | 23/25 | 2 |
| **Browser × `--job`, 9 cells (shipped)** | 364s | 1500s | 27/27 | 6 |

All three landed within ~10% on runner cost and 297–364s on critical path, so speed did not decide it:

1. **Knapsack Pro** ([`@knapsack-pro/playwright`](https://knapsackpro.com), file-level queue ordered by recorded duration) needs an external service and a token, and its measured advantage came entirely from offloading composer — the part `--shard` now handles in-repo. Two of its cells also reported success while a test failed, masked by quarantine.
2. **Per-browser moon task variants** (`e2e-chromium`/`-firefox`/`-webkit`) put all 24 browser targets in one flat pool, which can lend work across browsers — a real advantage, since chromium's pool is ~30% heavier than the others. But the browser then multiplies with the shard dimension in the task namespace, and splitting composer fixes the same imbalance more directly. Its numbers above are corrected because moon's default bail silently dropped `composer-app:e2e-chromium` and `plugin-sheet:e2e-chromium` from a failing cell, making the arm look cheapest when it had simply skipped the two most expensive targets — which is what motivated `--on-failure continue`.

What the matrix intermittently fails on, and how to attribute a red cell, is in [`E2E-FLAKE-ROOT-CAUSES.md`](../../.agents/projects/ci/E2E-FLAKE-ROOT-CAUSES.md).

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| **Flaky** in Trunk | Trunk UI, or **automatically** via Trunk’s **pass-on-rerun** detection | None—Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| **Quarantine** in Trunk | Trunk UI | None | Test still **runs**; its failure does **not** fail the job |
| **Vitest `tags: ['flaky']`** | Code (per-suite/test option, declared in [`vitest.tags.ts`](../../vitest.tags.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites **skip** locally | **`test`** and **`storybook`** jobs set the same `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e && !manual'`, so `flaky` tests **run** and Trunk keeps signal |

**Pass-on-rerun:** Trunk marks a test as flaky when it observes a **fail then pass on retry** pattern (same CI job: a failing attempt followed by a passing retry). That is distinct from manually marking a test flaky in the Trunk UI.

**Playwright e2e runs with `retries: 0`** (`e2ePreset`), so pass-on-rerun cannot fire for those suites — there is no retry for Trunk to observe. Retries were removed because they hid flakes behind a 3× time cost and made shard timings useless for sizing the suite (three `inbox.spec.ts` tests alone burned ~9 minutes of a shard failing three times each). A flaky e2e test is therefore expected to fail loudly once and then be marked `test.fixme` with a TODO until it is fixed; Trunk still detects flakiness across runs and quarantine still masks a known-bad test. This applies to Playwright only — the vitest jobs are unaffected.

Other tags (`sync`, `sync-e2e`, `functions-e2e`, `manual`) are declared in [`vitest.tags.ts`](../../vitest.tags.ts) and opted in by overriding `VITEST_TAGS_FILTER` (or passing `--tagsFilter=<expr>` directly). They are not tied to Trunk.

## Resources

- https://nektosact.com/introduction.html
- https://docs.trunk.io

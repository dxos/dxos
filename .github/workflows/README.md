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

[Trunk](https://trunk.io) ingests JUnit from the **Check** workflow ([`check.yml`](check.yml)) for flaky-test detection and quarantine. The **`test`** and **`e2e`** jobs wrap their `moon` steps with `trunk-io/analytics-uploader@v1` (`org-slug: dxos`, `quarantine: true`, `TRUNK_TOKEN`). Uploaded XML feeds Trunk for flaky labeling and quarantine decisions.

### Jobs and artifacts

| Job | What runs | JUnit paths Trunk reads |
| :-- | :-- | :-- |
| `test` | Vitest, browser Vitest, Storybook (`:test`, `:test-browser`, `:test-storybook` via uploader; same workflow triggers as the rest of **Check**). | `test-results/**/results.xml` |
| `e2e` | Playwright e2e (`:e2e` via uploader). Job runs only for `main` / `rc-*` / `hotfix-*` / `release-please-*` refs, or `workflow_dispatch` with `e2e` (see [`check.yml`](check.yml)). | `test-results/playwright/report/*.xml` |

**unit/browser/storybook** go through Trunk on typical PRs; **e2e** only when the `e2e` job runs (not on ordinary topic-branch PRs). Exact `moon` commands and `env` are in [`check.yml`](check.yml).

### Flaky label vs quarantine vs code tags

| | Where it is set | Effect on git / local default | Effect in CI |
| :-- | :-- | :-- | :-- |
| **Flaky** in Trunk | Trunk UI, or **automatically** via Trunk’s **pass-on-rerun** detection | None—Trunk metadata only | Tests still run; failures still fail the job unless quarantined |
| **Quarantine** in Trunk | Trunk UI | None | Test still **runs**; its failure does **not** fail the job |
| **Vitest `tags: ['flaky']`** | Code (per-suite/test option, declared in [`vitest.base.config.ts`](../../vitest.base.config.ts)) | Default `:test` task sets `VITEST_TAGS_FILTER='!flaky && …'` so gated suites **skip** locally | **`test`** job sets `VITEST_TAGS_FILTER='!llm && !sync && !sync-e2e && !functions-e2e && !tracing-e2e'`, so `flaky` tests **run** and Trunk keeps signal |

**Pass-on-rerun:** Trunk marks a test as flaky when it observes a **fail then pass on retry** pattern (same CI job: a failing attempt followed by a passing retry). That is distinct from manually marking a test flaky in the Trunk UI.

Other tags (`llm`, `sync`, `sync-e2e`, `functions-e2e`, `tracing-e2e`) are declared in [`vitest.base.config.ts`](../../vitest.base.config.ts) and opted in by overriding `VITEST_TAGS_FILTER` (or passing `--tagsFilter=<expr>` directly). They are not tied to Trunk.

## Resources

- https://nektosact.com/introduction.html
- https://docs.trunk.io

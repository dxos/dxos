# GitHub Actions

The build/test pipeline is not here. Check and the rest of it run on [Depot CI](https://depot.dev/docs/ci/overview) from [`.depot/`](../../.depot). GitHub Actions outages took the whole pipeline down with them, Depot is faster, and it reads the same workflow syntax, so migrating a workflow meant moving the file. Depot also takes a workflow straight from the CLI with your uncommitted changes patched in, so you can iterate on one without pushing. [`.depot/README.md`](../../.depot/README.md) covers the details.

What is left in this directory is everything that could not follow.

## What stayed, and why

Each of these carries the same explanation as a comment at the top of its own file. They are collected here so nobody retries a migration that has already been tried and reverted.

| Workflow | Trigger | Why it is still on Actions |
| :-- | :-- | :-- |
| [`pr-build.yml`](pr-build.yml) | `pull_request` | Builds the composer-app bundle with no secrets and uploads it as an artifact. Paired with `pr-deploy.yml` and stuck for the same reason. |
| [`pr-deploy.yml`](pr-deploy.yml) | `workflow_run` | Downloads `pr-build`'s artifact by `workflow_run.id` and deploys it as a Cloudflare Worker preview. Once `pr-build` ran on Depot, every attempt failed with `Unable to download artifact(s): Not Found`. A Depot-executed run's synthesized `workflow_run.id` does not resolve through GitHub's real artifact API. |
| [`pkg-pr-new.yml`](pkg-pr-new.yml) | `push` to main, dispatch | pkg.pr.new's publish CLI verifies the calling run against GitHub's Actions run tracking. On Depot it answered `Check failed (404): There is no workflow defined for <id>` every time. |
| [`publish-all.yml`](publish-all.yml) | `push` to main, dispatch | npm's OIDC trusted publisher accepts a fixed set of CI identities, and Depot's is not among them, so `id-token: write` provenance cannot be minted there. The filename is load-bearing, because OIDC is configured against `publish-all.yml`. |
| [`deploy-apps.yml`](deploy-apps.yml) | `schedule`, dispatch | Calls `deploy-tauri.yaml`, whose builds need `depot-macos-latest`. Depot CI's own orchestrator has no macOS sandboxes yet. |
| [`deploy-tauri.yaml`](deploy-tauri.yaml) | `workflow_call` | Same macOS constraint. Code signing and notarization run on `depot-macos-latest`. |
| [`claude-mention.yml`](claude-mention.yml), [`claude-composer-triage.yml`](claude-composer-triage.yml), [`claude-composer-implement.yml`](claude-composer-implement.yml), [`opencode.yml`](opencode.yml) | `issues`, `issue_comment`, review events | Bots reacting to GitHub events, on `ubuntu-latest`. No step calls the shared setup action and none is part of the build/test pipeline, so the migration never applied to them. |

The first four share one root cause. A third party checks GitHub's own run identity rather than the workflow's behaviour, and that is where Depot CI's compatibility ends. Check a workflow against that before proposing a migration.

## Depot runners are not Depot CI

Several workflows in this directory say `runs-on: depot-ubuntu-24.04-4` or `depot-macos-latest`. Those are [Depot's runner product](https://depot.dev/docs/github-actions/overview). Faster machines, still orchestrated by GitHub Actions, still a real Actions run with a real run id. Depot CI is the orchestrator, and that is what `.depot/workflows/` uses. A workflow can use the runners without the orchestrator, which is how the four blocked workflows above keep most of the speed.

## Composite actions

Two composite actions, `setup` and `affected`, live in [`.depot/actions/`](../../.depot/actions), and workflows in both directories call them by path. `.github/actions/` holds only the Cloudflare release helpers (`cn-channel`, `cn-config`, `cn-release`).

---
'@dxos/plugin-github': minor
'@dxos/types': minor
---

GitHub sync now binds each repository as a `Repo` and polls it every 3 minutes on EDGE: one conditional request when nothing changed, and one GraphQL batch for changed pull requests, which are stored as `PullRequest` objects (with repository, head commit, checks, review decision and closed issues) instead of Tasks. `PullRequest` gains the optional `repository`, `headSha`, `checks`, `reviewDecision` and `closes` fields. `SyncGitHubRepositories` now reports `{ bindings, notModified, requests, pulled, pushed }`.

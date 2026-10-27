---
'@dxos/plugin-github': minor
---

GitHub sync can now sync repository files with objects both ways: `EnableGitHubFileSync` adds a file binding to a synced repository, and a plugin contributes `GitHubCapabilities.FileMapping` to say which files become which objects. plugin-code maps `.mdl` files to `Spec`s, so remote edits merge into a spec as of its last sync and Composer edits are committed to a `composer/<spaceId>` branch with one pull request. `TextMerge` (`@dxos/plugin-github/TextMerge`) is the shared merge helper for Text-backed mappings.

# @dxos/plugin-versioning

Generic version/review layer for DXOS Composer. Extracted from `@dxos/plugin-space`.

Contributes the history companion (a git-graph timeline of an object's checkpoints, branch forks,
and merges), the in-memory version-selection / review-mode state, and the default review-render
policy. Object types opt in by contributing a `VersioningCapabilities.HistoryProvider`.

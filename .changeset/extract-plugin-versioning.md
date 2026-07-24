---
'@dxos/plugin-versioning': minor
---

Extract the generic version/review layer out of `@dxos/plugin-space` into a new `@dxos/plugin-versioning` system (core) plugin. The history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model now live in `@dxos/plugin-versioning` under the `VersioningCapabilities` namespace (previously `SpaceCapabilities`). Consumers import these symbols from `@dxos/plugin-versioning`; `plugin-space` no longer depends on `@dxos/versioning`. `VersioningPlugin` is a core plugin, auto-included by composer-app. (Sibling `@dxos/plugin-space` / `@dxos/plugin-markdown` / `@dxos/plugin-comments` bump via the fixed release group.)

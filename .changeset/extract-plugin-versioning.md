---
'@dxos/plugin-markdown': minor
---

Consolidate document review into `@dxos/plugin-review`. The comment threads (previously `@dxos/plugin-comments`) and the generic version/review layer (previously in `@dxos/plugin-space`) now live in one plugin under the `ReviewCapabilities` namespace: the history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model. `plugin-space` no longer depends on `@dxos/versioning`, and `plugin-markdown` carries no review vocabulary — it exposes a neutral `EditorBindingHook` capability that `plugin-review` contributes to.

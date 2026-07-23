---
'@dxos/react-ui-editor': minor
'@dxos/react-ui-menu': minor
'@dxos/ui-editor': minor
'@dxos/plugin-markdown': minor
'@dxos/plugin-comments': minor
---

Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). `@dxos/react-ui-menu` dropdowns now render a check next to the current value of a single-select group. Also: a hover restore control on tracked-deletion phantoms (re-instate a specific deletion), a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).

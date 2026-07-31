---
'@dxos/ui-editor': minor
---

Render editor comment highlights as a selection-style layer that fills wrapped lines to the edge (straight left/right edges, rounded only when single-line, 1px padding) and colours the comment text. `comments()` now folds in external synchronisation via `subscribe`/`getComments` options (replacing `createExternalCommentSync`) and requires an `id`; `linkTooltip` now takes an options bag (`{ render }`).

---
'@dxos/ui-editor': minor
'@dxos/plugin-markdown': minor
---

Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.

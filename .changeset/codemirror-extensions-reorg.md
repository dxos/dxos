---
'@dxos/ui-editor': patch
'@dxos/ui': patch
'@dxos/plugin-assistant': patch
---

Reorganize CodeMirror extensions into themed folders (`core`, `state`, `behavior`, `decoration`, `language`, `collab`, `completion`, `streaming`, `structure`, `demo`, `debug`) with per-folder barrels; the package's public export set is preserved. Fixes the misspelled exported type `CompoetionContext` → `CompletionContext`, de-duplicates `escapeRegExpSource` into `util` (closing a latent tag-escaping bug in `extendedMarkdown`'s mixed parser), and adds an `xmlTags` characterization test suite. `xmlTags` block widgets now keep their portal alive across viewport culls (removing the blank/flicker on scroll-back for known-height embeds). `@dxos/ui`: adds a `string` overload to `Domino.of` for custom-element tags (e.g. `dx-icon`); `@dxos/plugin-assistant` drops the now-unneeded `Domino.of(... as any)` casts.

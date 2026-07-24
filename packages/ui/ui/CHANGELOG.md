# @dxos/ui

## 0.11.0

### Patch Changes

- a256a87: Reorganize CodeMirror extensions into themed folders (`core`, `state`, `behavior`, `decoration`, `language`, `collab`, `completion`, `streaming`, `structure`, `demo`, `debug`) with per-folder barrels; the package's public export set is preserved. Fixes the misspelled exported type `CompoetionContext` → `CompletionContext`, de-duplicates `escapeRegExpSource` into `util` (closing a latent tag-escaping bug in `extendedMarkdown`'s mixed parser), and adds an `xmlTags` characterization test suite. `xmlTags` block widgets now keep their portal alive across viewport culls (removing the blank/flicker on scroll-back for known-height embeds). `@dxos/ui`: adds a `string` overload to `Domino.of` for custom-element tags (e.g. `dx-icon`); `@dxos/plugin-assistant` drops the now-unneeded `Domino.of(... as any)` casts.
- Updated dependencies [4df6cf3]
  - @dxos/ui-theme@0.11.0
  - @dxos/ui-types@0.11.0

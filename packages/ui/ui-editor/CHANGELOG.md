# @dxos/ui-editor

## 0.11.0

### Minor Changes

- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- a31ef40: Render editor comment highlights as a selection-style layer that fills wrapped lines to the edge (straight left/right edges, rounded only when single-line, 1px padding) and colours the comment text. `comments()` now folds in external synchronisation via `subscribe`/`getComments` options (replacing `createExternalCommentSync`) and requires an `id`; `linkTooltip` now takes an options bag (`{ render }`).
- 77fff35: Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.
- 6e624bd: Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). Single-select dropdowns now render a check on the current value (with radio semantics). Also: an author-coloured change-bar gutter on lines containing suggestions, a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).
- 392c700: Split the `blocks` editor extension into `blockOutline` (the below-text border boxes — usable on its own), `blockSelection` (whole-block selection state, highlight, and clipboard), and `blockDrag` (the gutter grip that drives selection and drag-to-reorder). `blocks()` composes all three; `blockOutline` stands alone, while `blockSelection` and `blockDrag` are a pair (the grip lives in `blockDrag`). The drag core (`createBlockDrag`) and selection core (`createBlockSelection`) are generalized over a document-agnostic `BlockOps` contract, shared by markdown blocks and the outliner.

  Add document-agnostic whole-block selection: the gutter shows a grip on the caret's block and each selected block; clicking a grip selects the block (shift-click toggles it in a multi-selection). Dragging a grip reorders the block, or the whole selection when it is part of it, and `Cut`/`Copy`/`Paste` operate on the selected blocks. Wire the same selection, drag, and clipboard into the outliner (`outlinerDnd`).

  The drag experience lifts the source block(s) out of the document (collapsing them and their trailing blank line), opens a block-sized placeholder at the drop slot, centers each grip on its line's first row, and matches the floating preview's wrapping to the source. Drags abort on a concurrent edit and start on the primary button only.

### Patch Changes

- a256a87: Reorganize CodeMirror extensions into themed folders (`core`, `state`, `behavior`, `decoration`, `language`, `collab`, `completion`, `streaming`, `structure`, `demo`, `debug`) with per-folder barrels; the package's public export set is preserved. Fixes the misspelled exported type `CompoetionContext` → `CompletionContext`, de-duplicates `escapeRegExpSource` into `util` (closing a latent tag-escaping bug in `extendedMarkdown`'s mixed parser), and adds an `xmlTags` characterization test suite. `xmlTags` block widgets now keep their portal alive across viewport culls (removing the blank/flicker on scroll-back for known-height embeds). `@dxos/ui`: adds a `string` overload to `Domino.of` for custom-element tags (e.g. `dx-icon`); `@dxos/plugin-assistant` drops the now-unneeded `Domino.of(... as any)` casts.
- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-comments**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- 717edc0: Compact editor slots use a small horizontal margin (`mx-2`) instead of none.
- 20153c0: Fix markdown list formatting: toggling between bullet/task/ordered list styles now converts markers in place instead of nesting them, list markers align with the hanging indent, and the outliner block drag shows a full-width preview with a stable empty drop placeholder (no flicker when dragging items with children).
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [a256a87]
- Updated dependencies [eec72c5]
- Updated dependencies [68e61ca]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [410a019]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [1a989ed]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [4df6cf3]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/log@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/display-name@0.11.0
  - @dxos/nlp@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/ui-types@0.11.0

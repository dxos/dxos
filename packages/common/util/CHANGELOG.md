# @dxos/util

## 0.12.0

### Patch Changes

- e8088ea: Fix logs and file exports in the native app, where both halves failed silently: downloads went through `<a download>`, which the Tauri webview drops, and are now saved via the native save dialog, falling back to the anchor where the dialog is unreachable; feedback log uploads posted to a relative path that does not exist on the app's own origin, and now take a configurable absolute endpoint.
- @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0

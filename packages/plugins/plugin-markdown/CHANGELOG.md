# @dxos/plugin-markdown

## 0.11.0

### Minor Changes

- 4e64123: Add an `order` option to `Aggregate.items({ limit, order })`: an explicit, per-group member ordering independent of any `orderBy` elsewhere in the query. Previously a preceding `orderBy` did double duty — establishing group order and silently determining which members (and in what order) landed in a following `Aggregate.items({ limit })` — so moving that `orderBy` relative to `aggregate` could silently change which items appeared. The mailbox list now uses `order` to keep each thread's preview newest-first, independent of the query's own group ordering.
- c035062: Ambient (Google-Docs-style) document review. The default document view now overlays every author's suggestions plus comments on main, with a per-user Editing/Viewing mode governed by a product-level `ReviewRenderPolicy`; the explicit branch switcher / diff selector remains as the advanced path. Also fixes a crash when adding a comment while viewing a branch (comment anchors now resolve against the editor-bound document) and prohibits inline comments on suggestion branches. `@dxos/ui-editor` gains `suggestionsOverlay` and a `readonly` option on `comments()`.
- 31fe0b8: Add an opt-in branch review workflow: comment threads are tagged with the branch under review and scoped to it, and a reviewer can accept an individual change from a branch (per-hunk cherry-pick via the `AcceptChange` collaboration operation) without merging the whole branch. Instant CRDT merge remains the default.
- 3f6ac61: Make the published `@dxos/cli` runnable, and keep React out of node and bun builds.

  `@dxos/cli@0.10.0` could not execute at all once installed from npm. Nothing marked `external` in
  the compiled binary can resolve at runtime (Bun's embedded filesystem has no `node_modules`), so the
  externals are gone and `esbuild-wasm`'s WASM is inlined; the `@dxos/node-std` shims resolve to node
  builtins, since Bun miscompiles `export * from 'node:<mod>'`; `@automerge/automerge-subduction` uses
  its self-contained `web` entry rather than the `node` one that reads a sibling file; the platform
  binary keeps its executable bit through publishing; and the pinned bun no longer leaks `--smol` into
  `process.argv`. Persistent SQLite on bun also now creates its parent directory, which any `dx`
  command needed on a machine with a stored profile but no data root.

  The binary also contained React, react-dom and the whole `react-ui` graph. `Capability.lazy`,
  `OperationHandlerSet.lazy` and `React.lazy` defer evaluation but not bundling, so plugin barrels that
  merely listed a React surface pulled it into every non-browser consumer: the plugins with a node
  variant now have node-conditioned `#capabilities`, and `plugin-sheet` a node-conditioned
  `#operations`. Headless code no longer reaches for React packages — `@effect-atom/atom` instead of
  `@effect-atom/atom-react` wherever only `Atom`/`Registry`/`Result` are used, and `@dxos/client/*`
  instead of `@dxos/react-client/*`. `@dxos/ui-editor/headless` is a new UI-free entrypoint for the
  editor helpers operation handlers need.

  Breaking:
  - `formatForDisplay` and `formatForEditing` move from `@dxos/react-ui-form` to `@dxos/schema`.
  - `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
    `@dxos/plugin-transcription`.
  - The icon list moves from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is
    removed; `hues` moves from `@dxos/ui-theme` to `@dxos/ui-types` beside `ChromaticPalette`.
  - `@dxos/plugin-graph` no longer exports its React hooks from the package root — import them from
    `@dxos/plugin-graph/hooks`.
  - `@dxos/plugin-deck` and `@dxos/plugin-navtree` are browser-only: `#plugin` no longer resolves a
    `node` or `workerd` condition.

- 091ebe4: The `dx` binary no longer depends on the machine that built it: `@dxos/kv-store`'s `createLevel` moves to `@dxos/kv-store/level` so importing the package for its types no longer binds LevelDB's native addon, and Automerge's WASM is inlined rather than read from disk. `LevelDB`, `SublevelDB` and `BatchLevel` are unchanged on the main entry. Each `@dxos/cli-<platform>-<arch>` package also exposes `dx` directly, so one platform can be installed without pulling the rest.
- dd190a0: Add `@dxos/versioning` (checkpoints, draft branches, and 3-way merge for automerge-backed ECHO objects) and document revisions and branches in Markdown: named checkpoints with read-only time travel and restore, draft branches (separate Text objects anchored to a parent revision) with 3-way merge-back, a History companion panel, a Versions section in object properties, an editor banner with a branch switcher, agent operations (create-checkpoint, create-branch, merge-branch, get-history), and a `diffView` setting selecting inline, side-by-side, or gutter diff rendering.
- 4e64123: Add an uncorrelated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (`col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
- 2e10525: The editor's object picker is now a combobox: the query is typed into a search input in the popover instead of into the document, opted into per trigger via `searchTriggers`. In markdown, the picker sorts objects by name and leads with a generic "Add object" that opens the create-object dialog and inserts a link to whatever it creates. Links to internal objects no longer show a raw-URI hover tooltip.
- 77fff35: Consolidate document review into `@dxos/plugin-review`. The comment threads (previously `@dxos/plugin-comments`) and the generic version/review layer (previously in `@dxos/plugin-space`) now live in one plugin under the `ReviewCapabilities` namespace: the history companion (checkpoint/branch/merge timeline), the in-memory version-selection and review-mode state, the default review-render policy, the `HistoryProvider` opt-in, and the timeline model. `plugin-space` no longer depends on `@dxos/versioning`, and `plugin-markdown` carries no review vocabulary — it exposes a neutral `EditorBindingHook` capability that `plugin-review` contributes to.
- cec59a4: plugin-comments and plugin-versioning merge into plugin-review (one review domain: threads,
  suggestions, branches, history), and plugin-markdown becomes review-agnostic: versioning/review
  behavior reaches the editor through the new `MarkdownCapabilities.EditorBindingHook` socket, and
  the `SuggestionSourcesProvider` slot is removed. Consumers referencing the old plugin packages or
  keys (`org.dxos.plugin.comments`, `org.dxos.plugin.versioning`) migrate to `@dxos/plugin-review`
  (`org.dxos.plugin.review`).
- 77fff35: Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.
- 6e624bd: Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). Single-select dropdowns now render a check on the current value (with radio semantics). Also: an author-coloured change-bar gutter on lines containing suggestions, a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).
- 31fe0b8: Document branches now use ECHO-core branching: new branches fork the content's automerge history (same object, CRDT merge-back — no conflict markers), the editor binds branches per surface, and checkpoint viewing pins the live document to historical heads instead of swapping in a snapshot. Legacy content-copy branches remain readable and merge textually.
- 499dde4: Move the `WithProperties` test helper from `@dxos/plugin-markdown/testing` to a new `@dxos/app-toolkit/testing` subpath export.

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

- b8c0825: Import ECHO data-access hooks (`useQuery`, `useObject`, `useType`, `usePagination`, …) directly from `@dxos/echo-react` in Composer plugins and UI packages instead of through the `@dxos/react-client/echo` re-export, decoupling pure ECHO data access from `@dxos/react-client`.
- c58ebb7: Fix "Cannot assign to read only property" when playing a game — game variants now receive the live state object instead of a frozen snapshot, so chess moves and New Game work again. Tic-Tac-Toe now ships from the community plugins repo and is no longer built here.
- b602d44: Resolve an object's database via `Obj.getDatabase(obj)` (and its space id via `db.spaceId`) instead of `getSpace(obj).db`/`.id` in plugin data-access sites, dropping the `@dxos/client`/`@dxos/react-client` dependency where the full space handle was not needed.
- 85893fe: Fix the mailbox silently dropping a compose draft, which has no thread. A draft with no `threadId` is now created as a thread of one — keyed on a fresh id — so the mailbox list's whole-thread semi-join and conversation grouping keep it. Also align the JMAP `Email` schema with RFC 8621, where `threadId` is a required, server-set property.
- 37874ce: Move contexts, hooks, constants and helpers out of React component modules into sibling modules so each component module is a react-refresh boundary. Public package APIs are unchanged; the previously exported names are re-exported from each directory barrel.
- 4bb7e3b: Chats no longer spend a `query-skills` call before every `enable-skills` — the available-skills list is already rendered into the system prompt — and project chats pre-bind the artifact-type skills, so creating the artifact you asked for costs fewer tool calls. Deleting an object now also closes planks for the objects it cascade-deletes (e.g. a project's chats), which previously stayed open pointing at removed objects.
- ac51564: Documents created from the editor's slash/link menu are now filed in the same collection as the document they were created from, instead of the space root.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/versioning@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/plugin-preview@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/invariant@0.11.0

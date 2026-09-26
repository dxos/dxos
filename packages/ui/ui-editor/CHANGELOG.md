# @dxos/ui-editor

## 0.12.0

### Minor Changes

- ec4f4ca: The outliner shares a document with prose: each top-level list is its own island in the outline tree, headings and paragraphs between lists belong to no item, the caret may rest in them, and Enter on an empty item ends the list with a blank line before the caret (Backspace still deletes the item). Empty rows hint at what they want: an empty item shows an "Enter task" placeholder and a blank line shows an add-task button in the grip gutter; an empty item shows no drag grip. Gutter controls are a control-sized box around a 24px button, and `createBlockDrag` takes a `canDrag` predicate. `Form.FieldSet` accepts `descriptionPlacement='tooltip'`, which replaces the helper text with a question-mark button after the label that carries the description; `FormFieldHeader` gains a `labelEnd` slot. Task status glyphs live on `Task.StatusOptions` beside title and colour, and `@dxos/react-ui-task` exports `statusIcon` in place of the `STATUS_ICONS` record. The Project article's Notes section uses the tooltip placement, and the outliner's first-item seeding is opt-in.
- b2a44d6: Cards and dialogs each sit one level lower on the surface ladder: a card takes the canvas's `base` level and a dialog (with sheets and drawers) the `raised` level, so both read darker in the dark theme and closer to the canvas in the light one. The `elevation` prop's explicit levels are unchanged, and `Select`'s list moves to the popup level with menus rather than following dialogs down.

  The editor's widget machinery is split from what it matches. `widgets` owns the decoration field, the portal lifecycle (`widgetHost({ setWidgets, bookmarks })`), the `widgetContextEffect`/`widgetResetEffect`/`widgetUpdateEffect` effects and bookmark navigation; `xmlTags({ registry })` is the XML element matcher and `linkWidgets({ match, link, image })` the markdown link matcher, with `matchSchemes`, `matchHosts` and `matchPattern` to build a `(url) => boolean`. `objectLinks()` is the `dxn:`/`echo:` case with the anchor chip as its default inline widget and an optional block `image` widget; the `urlSchemes` field on a registry entry and the shared `xmlWidgetRegistry` are gone, and `XmlWidgetProps`/`XmlWidgetState`/`xmlTag*Effect` are `WidgetProps`/`WidgetState`/`widget*Effect`. A host composes `[widgetHost(…), xmlTags(…), objectLinks(…)]` instead of passing `setWidgets` to `xmlTags`. A plugin contributes its own matcher the same way: plugin-github's `githubLinks({ trigger, link })` turns repository, pull-request and issue URLs into anchor chips, contributed through `MarkdownCapabilities.ExtensionProvider`. The popover's lookup is now an extension point too: plugin-preview's `PreviewCapabilities.LinkResolver` is a multi capability each plugin answers for its own kind of link (the ECHO entity resolver is plugin-preview's own contribution), and plugin-github resolves a GitHub URL to an in-memory `Repo`, `PullRequest` or `Issue` — the latter two new host-agnostic types in `@dxos/types` beside `Repo` — fetched from the GitHub API with the space's connection token (anonymously without one) unless a host contributes a `GitHubCapabilities.LinkSource`. `GitHubCard` is the `CardContent` surface for all three, so the deck popover shows the PR or issue with no further wiring. The anchor chain names what it carries: `<dx-anchor eid>` (was `dxn`), `DxAnchorActivate.eid`, `PreviewLinkRef.eid` and `ObjectLinkProps.eid` hold an ECHO entity URI (`echo:///<id>`), and the legacy single-slash `echo:/<id>` spelling is retired from stories, tests and comments in favour of the canonical triple-slash form. A task's description takes the same contributions: `MarkdownEditable` and `TaskList.Edit` accept host extensions, and the task-set article passes what `MarkdownCapabilities.ExtensionProvider` contributes, so a GitHub URL in a description is a chip while editing. plugin-github's provider no longer needs a document for the URL matcher; only the bare `#123` decoration does.

- 78433b0: Walkthroughs: a pull request narrated as ONE markdown document, whose prose, headings and ```diff
  fences read as a single narrative.

  `diffBlocks()` claims a fence whose info line starts with `diff` and renders it as a diff chunk. The
  info line carries the review metadata: ` ```diff file=src/index.ts lines=66-99 lang=typescript `.
  Layout is `split`, `inline`, or `auto` (the default), which measures the block and falls back to a
  unified column in a narrow pane; code is syntax-highlighted by loading the language lazily.
  `walkthroughSidebar()` is a separate extension over the same reading of the document: a rail of
  sections with the files each touches and their change counts, with `walkthroughOutline()` exposing
  the same data to a host that would rather render its own panel.

  This is not `@codemirror/merge`: both of its views take the whole document as one side of one diff,
  which cannot express a document that is mostly prose with diffs embedded in it.

  `GenerateWalkthrough` produces such a document from a pull request. It fetches the pull request and
  its diff, has the model narrate the change in reading order, and stores a `Walkthrough` object
  holding the body as a plain string, the commit it was generated against, and a ref to the
  `PullRequest`. It is idempotent by commit unless `force` is set, and reports progress under a key
  derived from the pull request.

  The model never writes diff content: it emits empty fences naming a path and a line range, and a
  postprocess splices the real hunks in from the patch, then appends every hunk the prose did not
  claim. The artefact therefore always accounts for the whole change even when the model's reading of
  it is partial.

### Patch Changes

- cff33b7: Operations that let an agent drive Composer end to end through the debug port, and two fixes found by doing so.

  - `review.create` accepts `range: { from, to }` (character offsets, converted to the editor's cursor anchor), and `text` + `sender` to submit the thread with a first message; it now returns `{ threadId, anchorId }`.
  - `assistant.runPromptInChat` accepts `companionTo` in place of `chat`, resolving and persisting the object's companion chat the way the companion's own submit does. `ensureCompanionChat` and `runPromptInChat` activate the assistant plugin themselves, so they work before the assistant UI has been opened.
  - `debug.snapshot` reports spaces, toasts, errors since a timestamp, comment threads per plank and a markdown document's text; `debug.revertLast` undoes the last undoable operation as the undo toast does; `composer.invoke` forwards a `spaceId`.
  - The editor's comments extension no longer throws from a state update when a thread's anchor is not a valid cursor pair (`Cursor.getRangeFromCursor` returns `undefined`).

- 4800a6f: Restore a markdown document's scroll position when navigating back to it: the position is now recorded as you scroll (not only when the caret moves), read back on mount, and re-anchored to the exact pixel rather than the enclosing line.
- 1b62726: Keep the editor scrollbar thumb inset from the edge while hovered or scrolling. The `background`
  shorthand reset `background-clip` to `border-box`, painting over the transparent border that forms
  the inset exactly when the thumb became visible.
- 5b99c47: An inline object embed whose target was deleted now shows an "Object not found" chip inline after its source, which stays editable, instead of an empty box at the label's reserved height; card embeds no longer reserve a section's height. A block embed is atomic to the caret: one arrow press steps over it instead of two invisible stops. Link widgets can report `unresolved`/`intrinsic` to the editor via `setLinkWidgetState`, block widgets can opt into `keepAlive`, and the placeholder no longer inherits a replaced widget's element or reserved height.
- 41e2750: Render bare URLs and `<url>` autolinks as clickable links in markdown (previously only `[label](url)` was decorated), so links in assistant chat messages can be followed instead of copy-pasted. `@dxos/observability` now reaches `SpaceState`/`DeviceKind` through `@dxos/protocols` rather than the `@dxos/client` barrels, keeping echo-client out of a consuming app's eager boot graph.
- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- d1a69fb: Fix `RangeError: Field is not present in this state` thrown from the editor's pending-text (streaming) extension when the editor is reconfigured while a pending session is open. The deferred busy-flag update is now bound to the extension's lifetime and is cancelled on teardown.
- e3d7a8c: Reading a task now works the way reading a message does: a row in a project's ledger opens the task beside the list rather than navigating over it.

  `useDetailNavigation` in `@dxos/app-toolkit/ui` is that gesture, stated once — it publishes the row as the list's selection, then shows the detail in a companion where the host contributes one and the viewport has room, as a plank at the host's deck level otherwise, and always in a plank of its own for a meta-click. The project ledger, the mailbox and the calendar share it; the project and the mailbox each gain a companion for it to fill, and `Calendar` declares the `calendar → event` chain its plank form needs. A `Task` article renders the detail, built from the list's own editor so a task reads and edits the same way wherever it is opened, and it shows the task's activity log under its description.

  Task lists also filter from a query editor in their toolbar — free text over title and description, `#tag` over the task's tags, and typed terms like `status:started` — in the standalone article and in the section a project embeds, which had no filter at all. A query that does not parse matches nothing rather than everything.

  Smaller fixes that travelled with it: a tree row keyboard focus lands on is painted with the current-item background rather than ringed; focus-following no longer selects on a meta-click, which opened a second plank; and restoring an editor's recorded scroll position is skipped for an editor that does not scroll itself, which was pulling its host form down by the editor's offset on every mount.

- 8048e42: Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `useWindow` from `@dxos/react-ui-virtual`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. The trace panel opens at the top rather than pinned to its tail, behind a fade of one row: `ScrollContainer.Fade` takes `classNames` to size its gradient, and `Accordion.Root` takes `border` (on by default) so a host can drop the frame around its items.
- 77976e4: Position the walkthrough navigation rail on the trailing edge of the editor.
- e0a9adb: The walkthrough navigation rail scrolls with the app's thin scrollbar instead of the browser's default one.
- f99a6e9: Give the walkthrough navigation rail two levels: each file a section touches is its own row beneath it, with its own change counts, scrolling to that file's first diff. Counts are stated once — a section with a single file leaves them to the file row.
- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [6388838]
- Updated dependencies [f82c78f]
- Updated dependencies [3b78bb6]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [2d58ea5]
- Updated dependencies [0fe00c5]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [881f900]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [915db6a]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [75d9c7c]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [608a172]
- Updated dependencies [b600f72]
- Updated dependencies [32468c3]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ce194c0]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [08cddf6]
- Updated dependencies [3214dcf]
- Updated dependencies [df22dec]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [2bb84d8]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [139a3b0]
- Updated dependencies [987f7e1]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [a5dfa5e]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [690dcaa]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [c4188a6]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [9996125]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [dd039d2]
- Updated dependencies [adcad97]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [56276cd]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [520c34f]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/client@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/util@0.12.0
  - @dxos/nlp@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/context@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/display-name@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-graph@0.11.1
- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/display-name@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/nlp@0.11.1
- @dxos/protocols@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- a31ef40: Render editor comment highlights as a selection-style layer that fills wrapped lines to the edge (straight left/right edges, rounded only when single-line, 1px padding) and colours the comment text. `comments()` now folds in external synchronisation via `subscribe`/`getComments` options (replacing `createExternalCommentSync`) and requires an `id`; `linkTooltip` now takes an options bag (`{ render }`).
- 6e4ac74: Highlight fenced `mermaid` code blocks in the markdown editor, and add `createMermaidExtensions` for documents that are entirely mermaid.
- 59a65a8: Convert outline items into Task objects: a "Convert to task" action replaces the item with a link to a new Task parented to a project created lazily on first use, and the link navigates to the task in place. Adds the `getItemText`, `replaceItemWithLink`, and `syncLinkLabels` editor commands. Fixes the outliner content column not being centered, which pushed the drag grip outside the document and the line menu inside it.
- 77fff35: Suggesting mode (Google-Docs-style authoring). In the ambient review view, switching to Suggesting binds the editor to the current user's own suggestion branch: their typing accrues there and renders as character-level tracked changes over main (`trackChanges`), while other authors' suggestions overlay against main via `suggestions({ base })` + `rebaseHunks` (so a foreign author no longer strikes your own new text). Accept/reject controls moved into a non-clipped hover popover. `@dxos/ui-editor` gains `trackChanges`, `rebaseHunks`, `computeCharHunks`, and a `base` option on `suggestions()`.
- 6e624bd: Fold the review "Suggesting" mode into the editor view-mode dropdown. `addViewMode` now accepts an optional `ViewModeItem[]` (default the three built-in modes), threaded through `EditorToolbarFeatureFlags.viewModes`; plugin-markdown establishes a `ViewModeExtension` capability that plugin-comments implements to contribute the "Suggesting" entry, and the separate toolbar branch-selector / review-mode dropdowns are removed (the History companion covers branch switching). Single-select dropdowns now render a check on the current value (with radio semantics). Also: an author-coloured change-bar gutter on lines containing suggestions, a fix for comments flashing out of the companion on submit, and a suggestion-overlay perf improvement (compute the base/document character diff once across all authors).
- 392c700: Split the `blocks` editor extension into `blockOutline` (the below-text border boxes — usable on its own), `blockSelection` (whole-block selection state, highlight, and clipboard), and `blockDrag` (the gutter grip that drives selection and drag-to-reorder). `blocks()` composes all three; `blockOutline` stands alone, while `blockSelection` and `blockDrag` are a pair (the grip lives in `blockDrag`). The drag core (`createBlockDrag`) and selection core (`createBlockSelection`) are generalized over a document-agnostic `BlockOps` contract, shared by markdown blocks and the outliner.

  Add document-agnostic whole-block selection: the gutter shows a grip on the caret's block and each selected block; clicking a grip selects the block (shift-click toggles it in a multi-selection). Dragging a grip reorders the block, or the whole selection when it is part of it, and `Cut`/`Copy`/`Paste` operate on the selected blocks. Wire the same selection, drag, and clipboard into the outliner (`outlinerDnd`).

  The drag experience lifts the source block(s) out of the document (collapsing them and their trailing blank line), opens a block-sized placeholder at the drop slot, centers each grip on its line's first row, and matches the floating preview's wrapping to the source. Drags abort on a concurrent edit and start on the primary button only.

### Patch Changes

- a256a87: Reorganize CodeMirror extensions into themed folders (`core`, `state`, `behavior`, `decoration`, `language`, `collab`, `completion`, `streaming`, `structure`, `demo`, `debug`) with per-folder barrels; the package's public export set is preserved. Fixes the misspelled exported type `CompoetionContext` → `CompletionContext`, de-duplicates `escapeRegExpSource` into `util` (closing a latent tag-escaping bug in `extendedMarkdown`'s mixed parser), and adds an `xmlTags` characterization test suite. `xmlTags` block widgets now keep their portal alive across viewport culls (removing the blank/flicker on scroll-back for known-height embeds). `@dxos/ui`: adds a `string` overload to `Domino.of` for custom-element tags (e.g. `dx-icon`); `@dxos/plugin-assistant` drops the now-unneeded `Domino.of(... as any)` casts.
- bce1dbc: Only a deliberate click on a comment thread reveals and highlights its anchor in the document. A thread taking focus (a new draft autofocusing, a re-render restoring focus) no longer moves the editor caret, which previously discarded a live text selection and retargeted the next comment onto the wrong word. Clicking a thread now always syncs the editor highlight, instead of skipping it when the app already considered that thread current.
- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- 717edc0: Compact editor slots use a small horizontal margin (`mx-2`) instead of none.
- 20153c0: Fix markdown list formatting: toggling between bullet/task/ordered list styles now converts markers in place instead of nesting them, list markers align with the hanging indent, and the outliner block drag shows a full-width preview with a stable empty drop placeholder (no flicker when dragging items with children).
- a1c89fa: Fix XML tag widgets rendering blank after the document is replaced — widget state applied around the reset (for example tool call rows when returning to a chat) now reaches the mounted widget.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a256a87]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [a83d98a]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [856c4f0]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [410a019]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [c58ebb7]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/context@0.11.0
  - @dxos/display-name@0.11.0
  - @dxos/nlp@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0

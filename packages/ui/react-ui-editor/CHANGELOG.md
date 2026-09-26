# @dxos/react-ui-editor

## 0.12.0

### Patch Changes

- 2e4c299: A markdown field held open no longer paints an empty box before its editor arrives: the CodeMirror view is built in a layout effect, so a pane that switches subjects — a task's description beside its history — renders in one frame instead of dropping everything below the field by the editor's height a frame later.

  Five hand-rolled empty states (no task selected, no task set, no sessions, no message selected, no result selected) now use `Banner.Empty` from `@dxos/react-ui`, so an empty pane reads the same everywhere and announces itself as a status.

  `Empty` moves from `@dxos/react-ui-list` to `@dxos/react-ui` as `Banner.Empty`: it is the same statement a banner makes — a message in place of content — for the one case that carries no valence and paints no surface, and most of its callers are panes rather than lists. Every call site moves with it, and a package that depended on `react-ui-list` only to say "nothing selected" no longer does.

  A task's history records what happened to the work — status, priority, estimate, assignment — and no longer narrates edits to its text. A title or description is edited by typing and commits on every blur, so logging those filled the history with "Description updated." and buried the entries a reader opens it for. The text is still written; it is simply not narrated, and a caller with something to say about such an edit still says it through `options.description`.

  `Column.Section` joins `Column` in `@dxos/react-ui`: a labelled run of content that spans the column's three tracks and re-exposes them, so a heading and plain content sit in the content track while a `Column.Row` inside still reaches the gutters. It is what a detail pane is made of — headings, prose, and rows with a leading control.

  A task's detail pane is now one column rather than four blocks each choosing its own left edge, and the pieces it is made of are components a host can mount on its own. `TaskEditor` is a task's title and markdown description with nothing around them — no create case, no selection, and no list context — which is what `TaskArticle` now renders instead of the list's editing strip. `TaskProperties` renders status, assignee, priority and estimate as a labelled list, each a menu whose trigger shows the value beside its glyph; the assignee's picker offers the space's people. `TaskTags` is the row's chip set, wrapped into a flow beside `TaskMnemonic`, the chip that copies a task's `@mnemonic`. The three sections share one geometry — a fixed 24px glyph column — so a glyph sits on the same axis in each.

  A GitHub link pasted into a description is now a chip in the editor as well as at rest: `linkWidgets` claims the bare `URL` node a GFM autolink produces, not only `[label](url)`, and `plugin-github` names the chip from the URL — `#123`, or `owner/repo`. The same description used to read two ways depending on which surface showed it.

  **Breaking.** `TaskList.Edit` is `TaskList.Editor`, and it renders the fields only: a task's questions and its history belong to the surface with room to answer and to read, so `showQuestions` and `onQuestionAnswer` are gone from `TaskList.Root`, and rows no longer replay the log under their title. `TaskHistory` and `TaskQuestion` place themselves and no longer take `subgrid` or `cells` (a host previously threaded its own column names into each child). A host that answered questions through the list — plugin-assistant's chat — renders them itself now.

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- 8048e42: Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `useWindow` from `@dxos/react-ui-virtual`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. The trace panel opens at the top rather than pinned to its tail, behind a fade of one row: `ScrollContainer.Fade` takes `classNames` to size its gradient, and `Accordion.Root` takes `border` (on by default) so a host can drop the frame around its items.
- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [3c7b013]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [cff33b7]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [b02fe16]
- Updated dependencies [5b99c47]
- Updated dependencies [813069c]
- Updated dependencies [967b130]
- Updated dependencies [098a0bb]
- Updated dependencies [bf4f1e6]
- Updated dependencies [ce194c0]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [3214dcf]
- Updated dependencies [d4b4919]
- Updated dependencies [ec4f4ca]
- Updated dependencies [d1a69fb]
- Updated dependencies [987f7e1]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [b2a44d6]
- Updated dependencies [77d0026]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-graph@0.11.1
- @dxos/async@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 2e10525: The editor's object picker is now a combobox: the query is typed into a search input in the popover instead of into the document, opted into per trigger via `searchTriggers`. In markdown, the picker sorts objects by name and leads with a generic "Add object" that opens the create-object dialog and inserts a link to whatever it creates. Links to internal objects no longer show a raw-URI hover tooltip.

### Patch Changes

- 53fde97: Bump CodeMirror packages (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`) to their latest patch releases.
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [ed992c2]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [717edc0]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [717edc0]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [1a989ed]
- Updated dependencies [59a65a8]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a1c89fa]
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/invariant@0.11.0

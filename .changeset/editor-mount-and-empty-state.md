---
'@dxos/react-ui-editor': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
'@dxos/types': minor
'@dxos/react-ui': minor
---

A markdown field held open no longer paints an empty box before its editor arrives: the CodeMirror view is built in a layout effect, so a pane that switches subjects — a task's description beside its history — renders in one frame instead of dropping everything below the field by the editor's height a frame later.

Five hand-rolled empty states (no task selected, no task set, no sessions, no message selected, no result selected) now use `Banner.Empty` from `@dxos/react-ui`, so an empty pane reads the same everywhere and announces itself as a status.

`Empty` moves from `@dxos/react-ui-list` to `@dxos/react-ui` as `Banner.Empty`: it is the same statement a banner makes — a message in place of content — for the one case that carries no valence and paints no surface, and most of its callers are panes rather than lists. Every call site moves with it, and a package that depended on `react-ui-list` only to say "nothing selected" no longer does.

A task's history records what happened to the work — status, priority, estimate, assignment — and no longer narrates edits to its text. A title or description is edited by typing and commits on every blur, so logging those filled the history with "Description updated." and buried the entries a reader opens it for. The text is still written; it is simply not narrated, and a caller with something to say about such an edit still says it through `options.description`.

`Column.Section` joins `Column` in `@dxos/react-ui`: a labelled run of content that spans the column's three tracks and re-exposes them, so a heading and plain content sit in the content track while a `Column.Row` inside still reaches the gutters. It is what a detail pane is made of — headings, prose, and rows with a leading control.

A task's detail pane is now one column rather than four blocks each choosing its own left edge. `TaskHistory` and `TaskQuestion` place themselves through `Column` and no longer take `subgrid` or `cells` (a host previously threaded its own column names into each child); their glyphs read with the text, since the gutter is for what acts on the task rather than for prose about it. `TaskList.Edit` gained `showControls` and `showSections` for a host that carries the task's chrome itself, and its Save and Cancel buttons are create-time only — a task being edited commits its own fields. `TaskProperties` renders status, priority and estimate as a labelled list, each a menu whose trigger shows the value beside its glyph, which is what a pane has the room to say and a list row does not.

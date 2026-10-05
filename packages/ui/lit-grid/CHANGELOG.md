# @dxos/lit-grid

## 0.12.0

### Patch Changes

- 631df48: A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it reads the space from the live task rather than the row's snapshot.

  The terminal prints JSON — an object, or a string holding a JSON object or array — indented and highlighted, with keys, strings, numbers, booleans and null colored through the theme's ANSI palette.

  The terminal leaves a blank line after a command's output, and selected text is readable: the selection took a color token that does not exist, which resolved to the text color.

  The task list's filter button is filled and accented whenever anything narrows the list — a typed query as well as hidden statuses — so a filtered list is recognisable at a glance.

  In the task list a task's tags and artifacts sit on a line of their own under the title and above the description, instead of sharing the title line; the assignee stays right-aligned on the title line. `TaskTags` takes `assignee={false}` for a host that places the assignee itself.

  A task row's menu offers **Add sub-task**, which files an untitled task under that row, expands the row if it was collapsed, and opens the new task. A task editor focuses its title when the task has none, so the new task is named where it opens; an untitled row shows an "Untitled" placeholder.

  An answered question appears in the task's activity as one entry, the question with its answer, dated when it was answered; open questions stay in the article's Questions section, where each option is an item of its own. `TaskHistory` no longer takes `onAnswer`, and `TaskQuestion` no longer takes `date`.

  The task list's create pane takes files dropped or pasted on it (`TaskList.Editor` `acceptFiles`), holding them as chips until the task is created and then handing them to `onTaskCreate` with the draft. `onTaskCreate` may report a `TaskCreateResult`: `error` keeps the whole draft (a refused create no longer clears what was typed), `rejectedFiles` stay on the pane to retry, and a create that lands late clears only fields still holding what was sent; the task set article offers it only where a plugin can store files, and attaches them to the new task.

  In a hierarchical task list `Tab` indents the focused task under its previous sibling and `Shift+Tab` outdents it to follow its parent, alongside the existing `Shift+Arrow` moves; `Tab` is left to move focus when there is nothing to indent under or focus is on a control inside the row.

  The task set's filter — the query text and the statuses shown — is kept per device and per set (`TaskSetView.aspect`, the view-state `local` backend), so it survives navigating away and reloading.

  A tree row keeps focus after a key the consumer handles on it (e.g. a restructuring `Shift+Arrow` or `Tab` in the task list), so consecutive moves work without refocusing the row.

  `.dx-tag` no longer carries a margin, so chips are spaced only by their container's `gap` and tags and tag-styled buttons line up evenly; containers that relied on the margin (select cells in the grid, chat references, plugin list tags, devtools tree, card rows) now own a gap, and tags inline in CodeMirror text and the transcript gutter keep a local `mx-0.5`.

  Which branches of a task set's list are open is kept per device and per set, as a task id → open map on `TaskSetView.aspect`, so a collapsed branch stays collapsed across navigation; a task absent from the map is open, as before.

## 0.11.1

## 0.11.0

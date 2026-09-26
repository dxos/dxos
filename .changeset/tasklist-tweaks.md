---
'@dxos/react-ui-task': patch
'@dxos/react-ui-terminal': patch
'@dxos/plugin-tasks': patch
---

A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it reads the space from the live task rather than the row's snapshot.

The terminal prints JSON — an object, or a string holding a JSON object or array — indented and highlighted, with keys, strings, numbers, booleans and null colored through the theme's ANSI palette.

The terminal leaves a blank line after a command's output, and selected text is readable: the selection took a color token that does not exist, which resolved to the text color.

The task list's filter button is filled and accented whenever anything narrows the list — a typed query as well as hidden statuses — so a filtered list is recognisable at a glance.

In the task list a task's chips — its tags, artifacts and assignee — sit on a line of their own under the title and above the description, instead of sharing the title line.

A task row's menu offers **Add sub-task**, which files a new task named "New task" under that row and opens it so it can be titled.

A task's questions appear in its activity log where they were asked, with their answers, and an open one is answered there; the article's separate Questions section is gone. Each option of a question is an item of its own in a list.

The task list's create pane takes files dropped or pasted on it (`TaskList.Editor` `acceptFiles`), holding them as chips until the task is created and then handing them to `onTaskCreate` with the draft; the task set article offers it only where a plugin can store files, and attaches them to the new task.

In a hierarchical task list `Tab` indents the focused task under its previous sibling and `Shift+Tab` outdents it to follow its parent, alongside the existing `Shift+Arrow` moves; `Tab` is left to move focus when there is nothing to indent under or focus is on a control inside the row.

The task set's filter — the query text and the statuses shown — is kept per device and per set (`TaskSetView.aspect`, the view-state `local` backend), so it survives navigating away and reloading.

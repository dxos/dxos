---
'@dxos/app-toolkit': minor
'@dxos/plugin-inbox': minor
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/react-ui-task': minor
'@dxos/react-ui-list': patch
'@dxos/plugin-assistant': patch
'@dxos/ui-editor': patch
---

Reading a task now works the way reading a message does: a row in a project's ledger opens the task beside the list rather than navigating over it.

`useDetailNavigation` in `@dxos/app-toolkit/ui` is that gesture, stated once — it publishes the row as the list's selection, then shows the detail in a companion where the host contributes one and the viewport has room, as a plank at the host's deck level otherwise, and always in a plank of its own for a meta-click. The project ledger, the mailbox and the calendar share it; the project and the mailbox each gain a companion for it to fill, and `Calendar` declares the `calendar → event` chain its plank form needs. A `Task` article renders the detail, built from the list's own editor so a task reads and edits the same way wherever it is opened, and it shows the task's activity log under its description.

Task lists also filter from a query editor in their toolbar — free text over title and description, `#tag` over the task's tags, and typed terms like `status:started` — in the standalone article and in the section a project embeds, which had no filter at all. A query that does not parse matches nothing rather than everything.

In a task list the arrows now travel without selecting and `Enter` opens the focused row, so reading down a list no longer opens the detail of every row passed on the way.

Smaller fixes that travelled with it: a tree row keyboard focus lands on is painted with the current-item background rather than ringed; focus-following no longer selects on a meta-click, which opened a second plank; and restoring an editor's recorded scroll position is skipped for an editor that does not scroll itself, which was pulling its host form down by the editor's offset on every mount.

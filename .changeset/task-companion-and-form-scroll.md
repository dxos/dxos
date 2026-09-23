---
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/ui-editor': patch
---

A task opened from a project's ledger now fills the project's new **Task** companion on a wide viewport, so reading a task no longer navigates over the project; below the `md` breakpoint, and on a meta-click, it still opens as a plank of its own. The add row at the foot of a task list spans the full width.

Restoring an editor's recorded scroll position is skipped when the editor does not scroll itself (auto-height, embedded in a form): CodeMirror would satisfy the request by scrolling an ancestor, which pulled the host form down by the editor's offset on every mount — the project's Overview tab opened part-scrolled, its first field label cut off.

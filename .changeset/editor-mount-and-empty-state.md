---
'@dxos/react-ui-editor': patch
'@dxos/plugin-projects': patch
---

A markdown field held open no longer paints an empty box before its editor arrives: the CodeMirror view is built in a layout effect, so a pane that switches subjects — a task's description beside its history — renders in one frame instead of dropping everything below the field by the editor's height a frame later.

Five hand-rolled empty states (no task selected, no task set, no sessions, no message selected, no result selected) now use `Empty` from `@dxos/react-ui-list`, so an empty pane reads the same everywhere and announces itself as a status.

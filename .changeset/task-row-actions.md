---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

A plugin can now put a menu item on another plugin's object: `ObjectAction<T>` in `@dxos/app-toolkit` is the shared shape, and a host declares a capability over it. plugin-tasks declares `TaskAction`, so a task row shows contributed actions — plugin-projects contributes `Discuss in chat`, which opens a chat carrying the task in its checklist.

**Breaking:** `TaskList.Root`'s `onTaskDelete` is replaced by `getTaskActions`, which returns the row's menu items; delete is now an ordinary action the container supplies. One item renders as a button, several as an overflow menu.

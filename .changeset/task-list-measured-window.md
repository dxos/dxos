---
'@dxos/react-ui': patch
---

Long lists of rows with differing heights can now be windowed: `useVirtualRows`, `Listbox` and `Tree` accept `virtual='measured'`, which mounts only the rows in view and measures each as it mounts. The task list uses it, so a project with hundreds of tasks no longer renders every row, and checking a task re-renders only the rows in view.

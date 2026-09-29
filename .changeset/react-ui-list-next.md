---
'@dxos/react-ui': minor
'@dxos/react-ui-list': minor
'@dxos/plugin-registry': patch
---

`@dxos/react-ui/next` gains `Next.Panel` (a sized plank host with toolbar, scrolling content and statusbar),
`Next.Listbox`, and drag-and-drop parts (`DragHandle` with keyboard moves, `DropIndicator`, `DragPreview`). Popups
(Menu, Select, Combobox, Popover, Tooltip, Dialog, the date calendar) now open at the size of their trigger's nearest
sized ancestor unless given a `size`. Fixes: buttons keep their label on one line; `AlertDialog` and popups resolve
elements in their own root node (shadow roots, other documents); calendar navigation is labelled per view; a
horizontal `ScrollArea` no longer reserves a vertical gutter. A `./next/testing` entry exports the Next story helpers.

`@dxos/react-ui-list/next` is a new entry with `Listbox` and `OrderedList` built on those parts: Container or
Collapsible master-detail rows that reorder by pointer (pragmatic-drag-and-drop via `useReorderList`) or keyboard.
`useReorderList`'s `dragPreview` renderer also receives the dragged row, and reorder drags declare a move so the
browser's copy cursor no longer flickers. The package now emits its declared `./util` entry.

The plugin registry's list is the first surface on Next: rows in a `Next.Panel` under a filter toolbar.

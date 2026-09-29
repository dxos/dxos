---
'@dxos/react-ui-list': minor
'@dxos/react-ui': minor
'@dxos/plugin-registry': patch
---

`@dxos/react-ui-list/next` is a new entry with `Listbox` and `OrderedList` built on `@dxos/react-ui/next`. Listbox keeps
the current opt-in, single, id-keyed selection over `Next.Listbox`. OrderedList rows are Container rows or Collapsible
master-detail rows; `DragHandle` drags with the pointer (pragmatic-drag-and-drop, via `useReorderList`) and moves its
row from the keyboard, with `Next.DropIndicator` and a `Next.DragPreview` chip at the row's size. `useReorderList`'s
`dragPreview` renderer now also receives the dragged row element, and its rows declare the drag a move (`effectAllowed`), so the browser no longer flickers its copy cursor over the source row. The package also builds its `./util` entry, which it
declared but never emitted. `@dxos/react-ui` adds a `./next/testing` entry (`withSizes`, `SIZE_ARG_TYPES`) for Next
stories in other packages, and its Next theme positions a row showing a drop indicator and dims a dragged row. The plugin registry's list is the first surface on it: rows in a `Next.Panel` under a filter toolbar.

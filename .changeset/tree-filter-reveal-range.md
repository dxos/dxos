---
'@dxos/react-ui-list': minor
---

`Tree` can filter, reveal and range-select. `filterTreeModel(model, predicate)` gives a view of a model holding only the matching rows and their ancestors, with those ancestors open. `Tree.Root` takes a `ref` whose `reveal(path)` opens the row's ancestors and scrolls to it, focusing it unless `{ focus: false }`. In `selectionMode='multiple'` a shift-click reports `range` on `TreeSelectEvent`: every selectable row from the last plain-clicked row to this one, in row order. ⌘↑ and ⌘↓ move focus to the parent row and to the parent's next sibling.

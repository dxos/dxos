---
# multiple-changesets: the Tree's filter, reveal and range selection are react-ui-list API that its users look up apart from the canvas changes
'@dxos/react-ui-list': minor
---

`Tree` can filter, reveal and range-select. `filterTreeModel(model, predicate)` gives a view of a model holding only the matching rows and their ancestors, with those ancestors open. `Tree.Root` takes a `ref` whose `reveal(path)` opens the row's ancestors and scrolls to it, focusing it unless `{ focus: false }`. In `selectionMode='multiple'` a shift-click reports `range` on `TreeSelectEvent`: every selectable row from the last plain-clicked row to this one, in row order. ⌘↑ and ⌘↓ move focus to the parent row and to the parent's next sibling. A Tree in multiple-selection mode opens its branches from the disclosure again, and `Tree.Content` takes `scroll={false}` to leave scrolling to an outer container.

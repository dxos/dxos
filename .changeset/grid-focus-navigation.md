---
'@dxos/react-ui': minor
'@dxos/plugin-projects': patch
---

Collections share one model for the current item, selection and arrow movement.

- **Current** is the item with keyboard focus, drawn only by the focus ring, whether it was reached by a click or the arrow keys. `Focus.Item` no longer writes `aria-current` on focus; `aria-current` is the caller's "you are here" (`current` prop).
- **Selected** is `aria-selected`, drawn by one shared edge in `--dx-selected-color` (`.dx-focus-item[aria-selected='true']`, and `Card` `selected`). `Focus.Item` takes `selected`. When an item is both, the focus ring is drawn.
- **Masonry** tiles are `Focus.Item`s: an `option` in a `listbox` when selectable, with no ring of their own. `Masonry.Viewport` takes `itemProps` (e.g. `useListSelection`'s `bind(id).rowProps`), so a single-select grid's selection follows the arrow keys.
- **Mosaic** tiles in a selection are `option`s in a `listbox`, so `aria-selected` is valid.
- **Arrow movement by position**, as tabster's grid mode: `useFocusGroup`'s `grid` axis moves to the item on screen in the arrow's direction (`grid-linear` for up and down); both previously stepped in DOM order. A new `itemSelector` names targets at any depth, and `findNearest` is exported. `Focus.Group` takes `orientation='grid' | 'grid-linear'` and `itemSelector`. `Board.Root` takes `navigation='grid'` to move between cards across columns. Masonry moves by position.
- A toolbar that starts or ends with a `Layout.Block` no longer adds edge padding, so a Board column without a drag handle aligns its title as one with a handle does.
- Feature maps: kanban and masonry cards show the focus ring on click and follow the arrow keys by position; the masonry board's selection follows them, and Escape clears it. Removing a feature from a project now takes its card off the project's views.

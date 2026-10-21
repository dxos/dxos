---
'@dxos/react-ui': minor
'@dxos/plugin-projects': patch
---

Card grids move focus by position, as tabster's grid mode does.

- `useFocusGroup`'s `grid` axis moves to the item on screen in the arrow's direction, and `grid-linear` does so for up and down; both previously stepped in DOM order. A new `itemSelector` option names the arrow targets at any depth, and `findNearest` is exported.
- `Focus.Group` takes `orientation='grid' | 'grid-linear'` and `itemSelector`.
- `Board.Root` takes `navigation='grid'`: the arrow keys move between cards across columns, and columns stop being focus stops.
- Masonry moves between tiles by position instead of DOM order.
- A toolbar that starts or ends with a `Layout.Block` no longer adds edge padding, so a Board column without a drag handle aligns its title as one with a handle does.
- Feature maps: kanban and masonry cards show the focus ring when clicked and are walked by the arrow keys by position, and removing a feature from a project now takes its card off the project's views.

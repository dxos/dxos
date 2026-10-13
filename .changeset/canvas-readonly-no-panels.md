---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-registry': patch
---

A read-only `SceneView` shows no floating panels: `SceneView.About` renders only as a dock section and takes no props. The view's background now sits on the element `SceneView.Root`'s `classNames` styles, so a host can replace it (e.g. `bg-transparent` for a card preview). A lattice scene no longer draws the snap grid while its lattice is on, since shapes land on its cells rather than the grid lines, and the cells are drawn fainter. The plugin registry's detail scrolls when it is longer than its panel, including in the deck's detail companion.

---
'@dxos/react-ui-canvas': patch
---

A read-only `SceneView` shows no floating panels: `SceneView.About` now renders only as a dock section, so it no longer floats over a read-only canvas, and takes no props. The view's background now sits on the element `SceneView.Root`'s `classNames` styles, so a host can replace it (e.g. `bg-transparent` for a card preview).

---
'@dxos/plugin-canvas': patch
'@dxos/react-ui-canvas': patch
---

`@dxos/plugin-canvas` moves from the `labs` to the `beta` tier, so the plugin registry lists it under Recommended now that Composer enables it by default. The drawing menu's Read only and Dock panels items now appear: they carried no `list-item` disposition, so the menu never listed them. A canvas's view is the viewer's own and kept in one view-state object per canvas: read-only, floating panels, grid and guides (and the camera), so each survives a reload; `SceneView.Root` takes `initialDisplay` / `onDisplayChange` for the snap and guides toggles, and the plugin's `dockPanels` setting is gone. The DXOS Architecture space template also seeds three documents, Composer, DXOS and EDGE: each embeds its architecture drawing, and Composer links the other two.
